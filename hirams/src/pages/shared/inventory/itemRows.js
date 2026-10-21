import { fmtDateTime } from "../../../utils/helpers/timeZone.js";

// ─────────────────────────────────────────────────────────────────────
// INVENTORY ROW SHAPE — one mapper, every consumer.
//
// Raw getInventory() entries → the row the shared Items table paints
// (brand/model, ABS quantity, formatted date). Used by the inventory page
// and by the shared JEV viewer, so the two can never drift apart.
//
//   qty > 0 → received batch,  qty < 0 → delivered batch.
//   Status 'A' rows arrive already aggregated by the API (one entry per
//   purchase item per direction, carrying that group's nJEVId).
// ─────────────────────────────────────────────────────────────────────
// The TRANSACTION ITEM a batch was bought/sold as. Laravel serialises the
// relation under its snake_case name ("transaction_item"), so both
// spellings are read — the mapper and the helpers below share this one
// lookup.
const txnItemOf = (r) => {
  const opt = (r?._raw ?? r)?.purchaseOption;
  return opt?.transactionItem ?? opt?.transaction_item ?? null;
};

export const mapInventoryItems = (items = []) =>
  (items ?? []).map((i) => ({
    _raw: i,
    id: i.nInventoryId,
    nInventoryId: i.nInventoryId,
    // "·" (U+00B7 middle dot) sits on the x-height, so it reads as a centred
    // separator between brand and model where a "|" looked like a table edge.
    strBrandModel:
      [i.purchaseOption?.strBrand, i.purchaseOption?.strModel]
        .map((v) => v?.trim())
        .filter(Boolean)
        .join(" · ") || "—",
    strUOM: i.purchaseOption?.strUOM ?? "—",
    dUnitPrice: Number(i.purchaseOption?.dUnitPrice ?? 0).toLocaleString(
      "en-PH",
      { minimumFractionDigits: 2 },
    ),
    nQuantity: Math.abs(i.nQuantity),
    cStatus: i.cStatus,
    dtLog: fmtDateTime(i.dtLog),
    strSupplierNickName: i.strSupplierNickName ?? "—",
    strClientNickName: i.strClientNickName ?? "—",
    strCompanyNickName: i.strCompanyNickName ?? "—",
    // The PO the batch was bought on — the items header card prints it
    // (received side) and every row prints it above its brand · model.
    strPurchaseOrderNo: i.strPurchaseOrderNo ?? "—",
    // …and its id — the PO code is a link to the PO in Item Purchasing.
    nPurchaseOrderId: i.nPurchaseOrderId ?? null,
    // The TRANSACTION the batch was sold on — what the items header card
    // prints on the delivered (client) side.
    strTransactionCode: txnItemOf(i)?.transaction?.strCode ?? "—",
  }));

// Worth of ONE row = |qty| × unit price. Shared by the group total, the
// per-JEV expected total (the cap an entry form may reach) and the Grand
// Total the Items table prints.
export const itemTotal = (r) =>
  Math.abs(Number(r?._raw?.nQuantity ?? 0)) *
  Number(r?._raw?.purchaseOption?.dUnitPrice ?? 0);

// ─────────────────────────────────────────────────────────────────────
// DELIVERED SIDE — where the two SELLING price columns belong. A selling
// price is what a client was charged, so it only means anything once the
// batch has gone OUT; a received batch only ever has its cost.
//
// Two shapes reach the table: a pending delivery (raw nQuantity < 0) and
// the API's aggregated entry after finalizing (cStatus 'D', quantity
// already turned positive) — so the status is checked first.
// ─────────────────────────────────────────────────────────────────────
export const isDeliveredRow = (r) => {
  const raw = r?._raw ?? r;
  if (String(raw?.cStatus ?? "").toUpperCase() === "D") return true;
  return Number(raw?.nQuantity ?? 0) < 0;
};

export const hasDeliveredRows = (rows = []) =>
  (rows ?? []).some(isDeliveredRow);

// ─────────────────────────────────────────────────────────────────────
// THE HOOKUP TO THE SELLING PRICE — tblitempricings is keyed by the
// TRANSACTION ITEM a batch was bought as, and the price itself sits on
// the CHOSEN pricing set of that item's TRANSACTION (see
// useSellingPrices.js, which mirrors how item-purchasing's ArrivePanel
// reads it).
// ─────────────────────────────────────────────────────────────────────
export const rowTransactionId = (r) => {
  const opt = (r?._raw ?? r)?.purchaseOption;
  const ti = txnItemOf(r);
  return (
    ti?.transaction?.nTransactionId ??
    ti?.nTransactionId ??
    opt?.nTransactionId ??
    null
  );
};

export const rowTransactionItemId = (r) => {
  const opt = (r?._raw ?? r)?.purchaseOption;
  return txnItemOf(r)?.nTransactionItemId ?? opt?.nTransactionItemId ?? null;
};
