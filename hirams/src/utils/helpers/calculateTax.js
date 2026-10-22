/**
 * The TAX of a transaction item — the FRONTEND twin of
 * App\Helpers\FormulaHelper::calculateTax (apiHirams).
 *
 *   tax = (unit selling price x qty - total purchase price) / 1.12 x (0.12 + 0.3)
 *
 * The purchase price is the sum of the INCLUDED purchase options
 * (nQuantity x dUnitPrice) — the same rows the server sums.
 *
 * Working it out here (instead of asking the server) keeps the Tax column
 * in sync with the unit selling price WHILE it is being typed — the totals
 * row already worked it out this way, so the rows and the total agree.
 *
 * NOTE: the server keeps its own copy (the saved tax of a pricing row).
 * This is the live one.
 */

export const TAX_VAT_FACTOR = 1.12;
export const TAX_VAT_RATE = 0.12;
export const TAX_OTHER_RATE = 0.3;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The total purchase price of a transaction item — the included options.
 */
export const purchaseTotalOf = (options = []) =>
  (options || [])
    .filter((o) => o.bIncluded)
    .reduce((sum, o) => sum + num(o.nQuantity) * num(o.dUnitPrice), 0);

/**
 * The tax of ONE transaction item.
 *
 * @param unitSellingPrice  the unit selling price (the one on screen)
 * @param qty               the transaction item's quantity
 * @param purchaseTotal     the included options' total purchase price
 */
export const calculateItemTax = ({
  unitSellingPrice = 0,
  qty = 0,
  purchaseTotal = 0,
} = {}) => {
  const totalSelling = num(unitSellingPrice) * num(qty);
  const tax =
    ((totalSelling - num(purchaseTotal)) / TAX_VAT_FACTOR) *
    (TAX_VAT_RATE + TAX_OTHER_RATE);

  return round2(tax);
};
