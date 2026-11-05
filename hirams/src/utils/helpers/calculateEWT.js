/**
 * The EWT of a purchase option — the FRONTEND twin of
 * App\Helpers\FormulaHelper::calculateEWT (apiHirams).
 *
 * The EWT is DERIVED — it is never typed in and never stored. Every table
 * that shows an EWT column must read it from here, so a line shows the same
 * amount everywhere (the cart, the PO, the voucher, the previews).
 *
 *   #  Supplier           Item      Formula             Result
 *   1  EWT, NON-VAT       Goods     TC x 1%             TC x 0.01
 *   2  EWT, NON-VAT       Service   TC x 2%             TC x 0.02
 *   3  NON-EWT, VAT       Goods     -                   0.00
 *   4  NON-EWT, VAT       Service   -                   0.00
 *   5  EWT, VAT           Goods     (TC / 1.12) x 1%    TC x 0.008928...
 *   6  EWT, VAT           Service   (TC / 1.12) x 2%    TC x 0.017857...
 *   7  NON-EWT, NON-VAT   Goods     -                   0.00
 *   8  NON-EWT, NON-VAT   Service   -                   0.00
 *
 * TC = Total Cost (quantity x unit price).
 *
 * The EWT TYPE is the per-line bypass of that matrix — it wins over the
 * supplier's flags:
 *
 *   "" (default) → the matrix above
 *   "A"          → 0% of TC
 *   "B"          → 1% of TC
 *   "C"          → 2% of TC
 *   "D"          → 1% of TC / 1.12 (VAT net)
 *   "E"          → 2% of TC / 1.12 (VAT net)
 */

// ── The EWT types ────────────────────────────────────────────────────
export const EWT_TYPE_DEFAULT = "";
export const EWT_TYPE_BYPASS_0 = "A";
export const EWT_TYPE_BYPASS_1 = "B";
export const EWT_TYPE_BYPASS_2 = "C";
export const EWT_TYPE_BYPASS_VAT = "D";
export const EWT_TYPE_BYPASS_VAT_2 = "E";

export const EWT_TYPE_OPTIONS = [
  EWT_TYPE_DEFAULT,
  EWT_TYPE_BYPASS_0,
  EWT_TYPE_BYPASS_1,
  EWT_TYPE_BYPASS_2,
  EWT_TYPE_BYPASS_VAT,
  EWT_TYPE_BYPASS_VAT_2,
];

// ── The rates ────────────────────────────────────────────────────────
export const EWT_RATE_GOODS = 0.01; // cItemType 'G'
export const EWT_RATE_SERVICE = 0.02; // cItemType 'S'
export const EWT_VAT_FACTOR = 1.12;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── A faithful twin of PHP's round($x, 2) ─────────────────────────────
// The EWT is DERIVED on the backend too (FormulaHelper::calculateEWT
// appends dEWT on every option) through PHP's round(). That is NOT a
// plain binary round: PHP pre-rounds the value to 14–15 significant
// decimal digits and then rounds the pre-rounded result —
// round(3150 / 1.12 * 0.01, 2) = 28.13 even though the binary double
// is 28.124999999999996 — so TC / 1.12 * 0.01 can split the PO view
// (which recomputes with the supplier's flags) from the voucher view
// (which falls back to the appended dEWT) on exactly one cent.
// Ported from php_math_round (ext/standard/math.c, PHP 8.2), default
// mode PHP_ROUND_HALF_UP (half away from zero).
const phpIntLog10Abs = (value) => {
  const val = Math.abs(value);
  if (val < 1e-8 || val > 1e22) return Math.floor(Math.log10(val));
  // Same binary search PHP uses: index 15 is 1e7, each step halves the gap.
  const values = [
    1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1,
    1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7,
    1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15,
    1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
  ];
  let result = 15;
  if (val < values[result]) result -= 8; else result += 8;
  if (val < values[result]) result -= 4; else result += 4;
  if (val < values[result]) result -= 2; else result += 2;
  if (val < values[result]) result -= 1; else result += 1;
  if (val < values[result]) result -= 1;
  return result - 8;
};

const pow10Exact = (p) => {
  // PHP keeps exact doubles for 10^0 .. 10^22 — the lookup table beats pow()
  // on last-bit drift.
  if (p >= 0 && p <= 22) {
    switch (p) {
      case 0: return 1e0; case 1: return 1e1; case 2: return 1e2;
      case 3: return 1e3; case 4: return 1e4; case 5: return 1e5;
      case 6: return 1e6; case 7: return 1e7; case 8: return 1e8;
      case 9: return 1e9; case 10: return 1e10; case 11: return 1e11;
      case 12: return 1e12; case 13: return 1e13; case 14: return 1e14;
      case 15: return 1e15; case 16: return 1e16; case 17: return 1e17;
      case 18: return 1e18; case 19: return 1e19; case 20: return 1e20;
      case 21: return 1e21; case 22: return 1e22;
      default: break;
    }
  }
  return Math.pow(10, p);
};

const phpRoundHelper = (value) =>
  value >= 0.0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);

export const phpRoundHalfUp = (value, places = 2) => {
  if (!Number.isFinite(value) || value === 0.0) return value;
  places = Math.trunc(places);
  const precisionPlaces = 14 - phpIntLog10Abs(value);
  const f1 = pow10Exact(Math.abs(places));

  let tmp;
  if (precisionPlaces > places && precisionPlaces - 15 < places) {
    // Pre-round to the 14–15 significant decimal digits (the digits FP
    // arithmetic can actually carry), then move the decimal point.
    const usePrecision = precisionPlaces;
    const f2 = pow10Exact(Math.abs(usePrecision));
    tmp = usePrecision >= 0 ? value * f2 : value / f2;
    tmp = phpRoundHelper(tmp);
    const back = places - precisionPlaces;
    const f2b = pow10Exact(Math.abs(back));
    tmp = tmp / f2b;
  } else {
    tmp = places >= 0 ? value * f1 : value / f1;
    if (Math.abs(tmp) >= 1e15) return value;
  }

  tmp = phpRoundHelper(tmp);

  if (Math.abs(places) < 23) {
    tmp = places > 0 ? tmp / f1 : tmp * f1;
  }
  return tmp;
};

const round2 = (n) => phpRoundHalfUp(Number(n), 2);

/**
 * The EWT of ONE line.
 *
 * @param quantity   the line's quantity
 * @param unitPrice  the line's unit price
 * @param cEWTType   the line's EWT type ("" / null = Default, A, B, C, D, E)
 * @param bEWT       the supplier's EWT flag (1 = EWT supplier)
 * @param bVAT       the supplier's VAT flag (1 = vattable)
 * @param cItemType  the transaction's item type ('G' goods, 'S' service)
 */
export const calculateEWT = ({
  quantity = 0,
  unitPrice = 0,
  cEWTType = null,
  bEWT = null,
  bVAT = null,
  cItemType = null,
} = {}) => {
  const totalCost = num(quantity) * num(unitPrice);

  // ── The EWT TYPE wins over the supplier's flags ────────────────────
  switch (cEWTType) {
    case EWT_TYPE_BYPASS_0:
      return 0;
    case EWT_TYPE_BYPASS_1:
      return round2(totalCost * EWT_RATE_GOODS);
    case EWT_TYPE_BYPASS_VAT:
      return round2((totalCost / EWT_VAT_FACTOR) * EWT_RATE_GOODS);
    case EWT_TYPE_BYPASS_VAT_2:
      return round2((totalCost / EWT_VAT_FACTOR) * EWT_RATE_SERVICE);
    case EWT_TYPE_BYPASS_2:
      return round2(totalCost * EWT_RATE_SERVICE);
    default:
      break;
  }

  // ── DEFAULT — the supplier's own flags decide ──────────────────────
  // No supplier (or an unknown flag) → nothing to withhold.
  if (bEWT === null || bEWT === undefined || Number(bEWT) !== 1) return 0;

  const rate = cItemType === "S" ? EWT_RATE_SERVICE : EWT_RATE_GOODS;
  const base = Number(bVAT) === 1 ? totalCost / EWT_VAT_FACTOR : totalCost;

  return round2(base * rate);
};

/**
 * Pull the EWT inputs out of an option, whatever shape it comes in.
 *
 * The app carries a purchase option in a few shapes:
 *   - the PO lines:  { purchase_option: { ... } }
 *   - the canvas:    { nQuantity, dUnitPrice, cEWTType, ... }
 *   - the suggestions: { quantity, unitPrice, ... }
 *
 * The supplier's flags and the transaction's item type are read from
 * wherever they are carried; when they are missing the amount the API
 * already derived is used instead (see ewtOfOption).
 */
export const ewtInputsOf = (option) => {
  const p = option?.purchase_option ?? option ?? {};
  const supplier = p.supplier ?? p.purchase_option?.supplier ?? {};
  const transaction =
    p.transaction_item?.transaction ?? p.transaction ?? p.purchase_option?.transaction_item?.transaction ?? {};

  return {
    quantity: p.nQuantity ?? p.quantity ?? 0,
    unitPrice: p.dUnitPrice ?? p.unitPrice ?? 0,
    cEWTType: p.cEWTType ?? null,
    bEWT: supplier.bEWT ?? p.bEWT ?? null,
    bVAT: supplier.bVAT ?? p.bVAT ?? null,
    cItemType: transaction.cItemType ?? p.cItemType ?? null,
  };
};

/**
 * The EWT of one option — the amount every EWT column shows.
 *
 * When the supplier's flags are not carried along (the canvas list, for
 * one) the value the API derived is used, so the two never disagree.
 */
export const ewtOfOption = (option) => {
  const p = option?.purchase_option ?? option ?? {};
  const inputs = ewtInputsOf(option);

  // The flags are unknown → the default formula cannot be worked out here.
  if (inputs.bEWT === null || inputs.bEWT === undefined) {
    return num(p.dEWT ?? p.ewt ?? 0);
  }

  return calculateEWT(inputs);
};

/**
 * The EWT total of a list of options.
 */
export const totalEWT = (options = []) =>
  round2(
    (options || []).reduce(
      (sum, option) => sum + num(ewtOfOption(option)),
      0,
    ),
  );

/**
 * The EWT of the options of ONE line (the PO lines of a purchase item).
 */
export const ewtOfLine = (line) => {
  const options = line?.purchase_options ?? line?.purchaseOptions ?? [];
  return totalEWT(options);
};
