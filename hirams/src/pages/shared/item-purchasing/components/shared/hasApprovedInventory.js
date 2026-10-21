/**
 * Does this line already carry an APPROVED ("A") inventory row?
 *
 * The backend attaches the approved / pending counts to every purchase
 * option (PurchaseOrderService::attachInventoryStats). An approved row means
 * a JEV was already raised for the item, so its record is closed — the edit
 * form must not touch it.
 */
export const hasApprovedInventory = (option) =>
  Number(option?.nApprovedReceivedQty) > 0 ||
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
