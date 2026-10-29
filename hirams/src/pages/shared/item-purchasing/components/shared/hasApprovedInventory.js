/**
 * Does this line already carry an APPROVED ("A") inventory row?
 *
 * The backend attaches the approved / pending counts to every purchase
 * option (PurchaseOrderService::attachInventoryStats). The two directions
 * lock INDEPENDENTLY:
 *
 *   • receive — the record is closed when either side was approved: the
 *     received qty itself, or the delivered outflow that drew on it.
 *   • deliver — only the NEGATIVE inventory's own JEV closes the line
 *     (approvedDeliveredJevs: approved negative rows that carry an
 *     nJEVId). A received-side JEV says nothing about the outflow, so it
 *     must not lock the delivered form — delivered rows that are approved
 *     but not yet journaled (nJEVId null) stay editable.
 */
export const hasApprovedInventory = (option, mode = "receive") =>
  mode === "deliver"
    ? Array.isArray(option?.approvedDeliveredJevs) &&
      option.approvedDeliveredJevs.length > 0
    : Number(option?.nApprovedReceivedQty) > 0 ||
      Number(option?.nApprovedDeliveredQty) > 0;

/**
 * The journal(s) that closed this line.
 *
 * Every APPROVED inventory row carries the id of the JEV it was booked on,
 * and the backend sends that id together with the JEV's number along with
 * the option (approvedReceivedJevs / approvedDeliveredJevs) — one list per
 * direction: the receive form names the Received Purchases JEV, the deliver
 * form the Delivered Items one.
 *
 * The other side is the fallback: the line is locked either way, so when the
 * side in question has no journal of its own the other side's is named
 * rather than none at all.
 */
export const approvedJevs = (option, mode = "receive") => {
  const clean = (list) =>
    Array.isArray(list)
      ? list.filter((j) => j?.id != null && String(j?.number ?? "").trim())
      : [];

  const own =
    mode === "deliver" ? option?.approvedDeliveredJevs : option?.approvedReceivedJevs;
  const ownList = clean(own);
  if (ownList.length) return ownList;

  const other =
    mode === "deliver" ? option?.approvedReceivedJevs : option?.approvedDeliveredJevs;
  return clean(other);
};

export default hasApprovedInventory;
