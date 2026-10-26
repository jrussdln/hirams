/**
 * The EWT of a purchase option — the FRONTEND twin of
 * App\Helpers\FormulaHelper::calculateEWT (apiHirams).
 *
 * The EWT is DERIVED — it is never typed in and never stored. Every table
 * that shows an EWT column must read it from here, so a line shows the same
 * amount everywhere (the cart, the PO, the voucher, the previews).
 *
 *   #  Supplier           Item      Formula             Result
 *   1  EWT, NON-VAT       Goods     Q x 1%              Q x 0.01
 *   2  EWT, NON-VAT       Service   Q x 2%              Q x 0.02
 *   3  NON-EWT, VAT       Goods     -                   0.00
 *   4  NON-EWT, VAT       Service   -                   0.00
 *   5  EWT, VAT           Goods     (Q / 1.12) x 1%     Q x 0.008928...
 *   6  EWT, VAT           Service   (Q / 1.12) x 2%     Q x 0.017857...
 *   7  NON-EWT, NON-VAT   Goods     -                   0.00
 *   8  NON-EWT, NON-VAT   Service   -                   0.00
 *
 * Q = quantity x unit price.
 *
 * The EWT TYPE is the per-line bypass of that matrix — it wins over the
 * supplier's flags:
 *
 *   "" (default) → the matrix above
 *   "A"          → 0% of Q
 *   "B"          → 1% of Q
 *   "C"          → 2% of Q
 *   "D"          → 1% of Q / 1.12 (VAT net)
 */

// ── The EWT types ────────────────────────────────────────────────────
export const EWT_TYPE_DEFAULT = "";
export const EWT_TYPE_BYPASS_0 = "A";
export const EWT_TYPE_BYPASS_1 = "B";
export const EWT_TYPE_BYPASS_2 = "C";
export const EWT_TYPE_BYPASS_VAT = "D";

export const EWT_TYPE_OPTIONS = [
  EWT_TYPE_DEFAULT,
  EWT_TYPE_BYPASS_0,
  EWT_TYPE_BYPASS_1,
  EWT_TYPE_BYPASS_2,
  EWT_TYPE_BYPASS_VAT,
];

// ── The rates ────────────────────────────────────────────────────────
export const EWT_RATE_GOODS = 0.01; // cItemType 'G'
export const EWT_RATE_SERVICE = 0.02; // cItemType 'S'
export const EWT_VAT_FACTOR = 1.12;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The EWT of ONE line.
 *
 * @param quantity   the line's quantity
 * @param unitPrice  the line's unit price
 * @param cEWTType   the line's EWT type ("" / null = Default, A, B, C, D)
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
