import {
  calculateCollectionEWTExact,
  phpRoundHalfUp,
} from "./calculateEWT.js";
import { calculateCollectionTaxExact } from "./calculateTax.js";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The net of a collection: gross - EWT - tax - retention.
 *
 * The deductions stay at FULL precision and only the final result is
 * rounded — the same thing Excel does. Rounding EWT and tax to centavos
 * first and subtracting those drifts one centavo (497,500 gave 470,848.22
 * instead of .21; 29,552 gave 27,968.85 instead of .86).
 *
 * Use this for every per-journal net. Section/grand totals over several
 * journals should sum the exact components and round once at the end.
 */
export const calculateCollectionNet = (amount, cItemType, retention = 0) =>
  phpRoundHalfUp(
    num(amount) -
      calculateCollectionEWTExact(amount, cItemType) -
      calculateCollectionTaxExact(amount) -
      num(retention),
  );
