import { getToDeliver, getDelivered } from "./purchaseProgress.js";

/**
 * The tab a PO belongs to LATEST — the one the Item Purchasing list files it
 * under.
 *
 * A PO's own status (po.nStatus) is not always that stage:
 *   • a PARTIALLY RECEIVED PO is still "Pending Receipt" while the part
 *     already received waits to go out → the list files it under For
 *     Delivery, so that is where it has to open;
 *   • a PO whose goods have ALL gone out is still "For Delivery" until the
 *     delivery is approved → the list files it under Delivered.
 *
 * So a PO opened from anywhere — the inventory's PO code, the voucher's PO
 * list — lands on the stage it has actually reached, no matter where the
 * link was clicked.
 *
 * @param po    the purchase order (purchase_order_options included)
 * @param keys  { pendingReceiptKey, forDeliveryKey, deliveredKey }
 * @returns the status code as a string
 */
export const poLatestStatus = (po, keys = {}) => {
  const { pendingReceiptKey, forDeliveryKey, deliveredKey } = keys;
  const status = String(po?.nStatus ?? "");
  const opts = po?.purchase_order_options ?? [];
  const optOf = (o) => o?.purchase_option ?? o;

  // The delivered/delivery remaps below read the option quantities. Without
  // the options there is nothing to remap on — a deep link that loaded the
  // bare PO must not bump a Pending Receipt order all the way to Delivered.
  if (!opts.length) return status;

  const anythingDelivered = opts.some((o) => getDelivered(optOf(o)) > 0);
  // Received but not yet handed over — what still waits to go out.
  const anythingLeft = opts.some((o) => getToDeliver(optOf(o)) > 0);

  if (status === String(forDeliveryKey)) {
    // Everything has gone out and nothing is left → the delivery waits to be
    // approved, so the PO is filed under Delivered.
    return anythingDelivered && !anythingLeft
      ? String(deliveredKey)
      : String(forDeliveryKey);
  }

  if (status === String(pendingReceiptKey)) {
    // Something is still waiting to go out → For Delivery. Nothing left →
    // the goods are already out → Delivered.
    return anythingLeft ? String(forDeliveryKey) : String(deliveredKey);
  }

  return status;
};
