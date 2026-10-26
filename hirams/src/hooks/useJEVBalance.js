import { useState, useEffect } from "react";
import JevEntriesAPI from "../api/endpoints/jev-entries.api.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * One balance verdict for one JEV — shared by the single-JEV hook below
 * and by screens that check several JEVs at once (the Pending JEV screen
 * finalizes every pending JEV of the open group).
 *
 * Balanced means BOTH sides are non-empty AND equal.
 *
 * On top of that, `grandTotal` is the figure the entries are supposed to
 * cover, and a screen reconciling against one keeps the strict rule
 * (the default): the JEV must also ADD UP to that figure. Pass
 * `{ requireTotalMatch: false }` to judge a JEV on its two sides alone —
 * which is what the inventory screen does, because its expected total is
 * the batch's PURCHASE value (qty × dUnitPrice) while a delivered JEV is
 * booked at the SELLING price. From and To square with each other there
 * but never with that number, so insisting on it made a perfectly
 * balanced delivered JEV impossible to finalize.
 *
 * @param {Array} list this JEV's own entries
 * @param {number} grandTotal the figure the entries should add up to
 * @param {{ requireTotalMatch?: boolean }} [opts]
 * @returns {{ balanced: boolean, loading: boolean, message: string }}
 */
export function computeJevBalance(list, grandTotal, opts = {}) {
  const { requireTotalMatch = true } = opts;
  // Round each side to cents BEFORE comparing (avoids float drift)
  const from = round2(
    (list ?? [])
      .filter((e) => Number(e.dAmount) < 0)
      .reduce((s, e) => s + Math.abs(Number(e.dAmount || 0)), 0),
  );
  const to = round2(
    (list ?? [])
      .filter((e) => Number(e.dAmount) >= 0)
      .reduce((s, e) => s + Math.abs(Number(e.dAmount || 0)), 0),
  );
  const expected = round2(grandTotal || 0);

  const balanced = from > 0 && to > 0 && from === to;
  // Not asked to reconcile → the sides alone decide, and the "does not
  // match the total" verdict (and its message) can never come up.
  const matches = !requireTotalMatch || from === expected;

  let message = "";
  if (from === 0 && to === 0) message = "JEV Entries not yet added";
  else if (!balanced) message = "JEV entries not balanced yet";
  else if (!matches) message = "JEV entries balanced but do not match the total";

  return { balanced: balanced && matches, loading: false, message };
}

/**
 * Live balance verdict for ONE JEV: re-fetches its entries whenever they
 * are added, edited or deleted (JevViewPanel fires those events) so a
 * banner bound to it clears itself the moment the JEV squares up.
 *
 * `requireTotalMatch` is forwarded to computeJevBalance — pass false to
 * judge the JEV on its two sides alone (screens without a reliable figure
 * to reconcile against: a delivered JEV is booked at selling price, and a
 * voucher / No Type JEV carries no Items total at all).
 *
 * @param {string|number} jevId empty/falsy → no fetch, no verdict
 * @param {number} grandTotal the figure the entries should add up to
 * @param {boolean} [requireTotalMatch=true]
 */
function useJEVBalance(jevId, grandTotal, requireTotalMatch = true) {
  const [state, setState] = useState({
    balanced: false,
    loading: false,
    message: "",
  });
  const [tick, setTick] = useState(0);

  // re-check when entries are added/edited/deleted (fired by JevViewPanel)
  useEffect(() => {
    if (!jevId) return;
    const h = (e) => {
      if (String(e.detail?.jevId) === String(jevId)) setTick((k) => k + 1);
    };
    window.addEventListener("jev_entry_data_updated", h);
    window.addEventListener("jev_entry_data_deleted", h);
    return () => {
      window.removeEventListener("jev_entry_data_updated", h);
      window.removeEventListener("jev_entry_data_deleted", h);
    };
  }, [jevId]);

  useEffect(() => {
    // Nothing to check (modal closed, or still creating the JEV) — drop
    // the previous verdict so a stale banner can never greet the next one.
    if (!jevId) {
      setState({ balanced: false, loading: false, message: "" });
      return;
    }
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    JevEntriesAPI.getByJevId(jevId)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setState(computeJevBalance(list, grandTotal, { requireTotalMatch }));
      })
      .catch((err) => {
        console.error("JEV balance check failed:", err);
        if (active)
          setState({
            balanced: false,
            loading: false,
            message: "JEV entries not balanced yet",
          });
      });
    return () => {
      active = false;
    };
  }, [jevId, grandTotal, requireTotalMatch, tick]);

  return state;
}

export default useJEVBalance;
