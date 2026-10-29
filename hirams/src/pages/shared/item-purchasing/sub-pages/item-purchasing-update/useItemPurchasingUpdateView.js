import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PurchaseCartAPI from "../../../../../api/endpoints/purchase-cart.api.js";
import PurchaseOrderAPI from "../../../../../api/endpoints/purchase-order.api.js";
import PricingAPI from "../../../../../api/endpoints/pricing.api.js";
import TransactionAPI from "../../../../../api/endpoints/transaction.api.js";
import VoucherAPI from "../../../../../api/endpoints/voucher.api.js";
import UserAPI from "../../../../../api/endpoints/user.api.js";
import useKeysLabels from "../../../../../hooks/useKeysLabels.js";
import { buildRoleGroups } from "../../../../../hooks/useRoleBuilder.js";
import { getItem, setItem } from "../../../../../utils/storage/localStorage.js";
import { showSwal, withSpinner } from "../../../../../utils/helpers/swal.jsx";
import { printRoute } from "../../../../../utils/helpers/printRoute.js";
import InventoryAPI from "../../../../../api/endpoints/inventory.api.js"; // adjust name/path
import SerialNumberAPI from "../../../../../api/endpoints/serial-number.api.js";
import {
  getToDeliver,
  getToReceive,
  getDelivered,
} from "../../../../../utils/helpers/purchaseProgress.js";
import { splitDeliveryAcrossItems } from "../../../../../utils/helpers/deliverySplit.js";
import { poLatestStatus } from "../../../../../utils/helpers/poLatestStatus.js";
import { totalEWT } from "../../../../../utils/helpers/calculateEWT.js";
import { DEFAULT_SHIPPING_DETAILS } from "../../modal/PODetailsUpdateModal.jsx";

const num = (v) => Number(v) || 0;
// The shipping field is a Quill editor, so it stores HTML. "Has content"
// must be judged on the TEXT, not the markup (`<p><br></p>` is blank).
const hasShippingText = (html) =>
  Boolean(
    (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(),
  );
const bustPOCache = () => {
  setItem("cart_cache_purchaseOrders", null);
  setItem("cart_cache_vouchersByPO", null);
};

// ── Line corrections ─────────────────────────────────────────────────
// A receipt or delivery can be typed wrong (everything checked in when only
// half should have been). The API only ever ADDS inventory, so a correction
// downward works on the rows themselves: they are walked newest-first and
// lowered until the item adds up to the quantity that was entered.
const COUNTED_STATUSES = ["A", "P"]; // the only rows that count toward totals

const loadItemRows = async (nPurchaseItemId) => {
  const res = await InventoryAPI.getHistoryBulk([nPurchaseItemId]);
  const rows = res?.rows ?? res?.data?.rows ?? {};
  const list =
    rows?.[String(nPurchaseItemId)] ?? rows?.[nPurchaseItemId] ?? [];
  return Array.isArray(list) ? list : [];
};

// Drop the S/N a row no longer has room for. `keepFirst` is a priority list:
// the codes earliest in it survive the cut (a serial that has already gone
// out should stay on the received row, then whatever the user kept).
const trimRowSerials = async (inventoryId, keep, keepFirst = []) => {
  const res = await SerialNumberAPI.getByInventory(inventoryId);
  const rows = res?.serial_numbers ?? res?.data?.serial_numbers ?? [];
  if (!Array.isArray(rows) || rows.length <= keep) return;

  const rank = new Map(uniq(keepFirst).map((sn, i) => [sn, i]));
  const rankOf = (r) => {
    const sn = String(r?.strSerialNumber);
    return rank.has(sn) ? rank.get(sn) : rank.size;
  };
  const drop = [...rows].sort((a, b) => rankOf(a) - rankOf(b)).slice(keep);
  for (const s of drop) {
    if (s?.nSNId != null) await SerialNumberAPI.deleteSerialNumber(s.nSNId);
  }
};

/**
 * Take `take` units back out of ONE item's recorded total.
 * @param sign  1 = received rows, -1 = delivered rows
 */
const shrinkItemRows = async ({
  nPurchaseItemId,
  take,
  sign,
  keepFirst = [],
}) => {
  const rows = (await loadItemRows(nPurchaseItemId)).filter(
    (r) =>
      Math.sign(Number(r?.nQuantity) || 0) === sign &&
      COUNTED_STATUSES.includes(String(r?.cStatus || "").trim()),
  );

  let left = Math.max(Math.round(take), 0);
  for (const r of rows) {
    // The API hands the rows back newest first — undo the latest entries.
    if (left <= 0) break;
    const qty = Math.abs(Number(r?.nQuantity) || 0);
    if (qty <= 0) continue;

    const dropQty = Math.min(left, qty);
    const keepQty = qty - dropQty;
    await InventoryAPI.updateInventory(r.nInventoryId, {
      nQuantity: sign * keepQty,
      cStatus: String(r?.cStatus || "").trim(),
    });
    left -= dropQty;

    const serials = Array.isArray(r?.serialNumbers)
      ? r.serialNumbers.filter(Boolean)
      : [];
    if (serials.length > keepQty)
      await trimRowSerials(r.nInventoryId, keepQty, keepFirst);
  }

  if (left > 0)
    throw new Error(
      `Could only take back ${take - left} of ${take} unit(s) — the record was refreshed.`,
    );
};

const uniq = (list) => [...new Set((list || []).filter(Boolean).map(String))];

// The rows that count toward a line's total for one sign (1 = received,
// -1 = delivered) — newest first.
const countedRowsFor = (rows, sign) =>
  (rows || []).filter(
    (r) =>
      Math.sign(Number(r?.nQuantity) || 0) === sign &&
      COUNTED_STATUSES.includes(String(r?.cStatus || "").trim()),
  );

// The S/N those rows hold right now (plain strings — their ids live on the
// serial-numbers endpoint).
const serialSetFor = (rows, sign) => {
  const set = new Set();
  for (const r of countedRowsFor(rows, sign))
    for (const sn of Array.isArray(r?.serialNumbers) ? r.serialNumbers : [])
      if (sn) set.add(String(sn));
  return set;
};

// The receipt number the newest counted row was written under.
const lastRowReceipt = (rows, sign) =>
  countedRowsFor(rows, sign)[0]?.strReceiptNumber || "";

// Take the listed S/N back off a line's rows — the user crossed them out of
// the edit form.
const dropSerials = async ({ nPurchaseItemId, codes, sign }) => {
  const drop = new Set((codes || []).filter(Boolean).map(String));
  if (!drop.size) return;

  const rows = countedRowsFor(await loadItemRows(nPurchaseItemId), sign);
  for (const r of rows) {
    const have = uniq(
      Array.isArray(r?.serialNumbers) ? r.serialNumbers : [],
    );
    if (!have.some((sn) => drop.has(sn))) continue;

    const res = await SerialNumberAPI.getByInventory(r.nInventoryId);
    const list = res?.serial_numbers ?? res?.data?.serial_numbers ?? [];
    for (const s of Array.isArray(list) ? list : []) {
      if (drop.has(String(s?.strSerialNumber)) && s?.nSNId != null)
        await SerialNumberAPI.deleteSerialNumber(s.nSNId);
    }
  }
};
export default function useItemPurchasingUpdateView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get("id");
  const initialOptionId = searchParams.get("optionId")
    ? Number(searchParams.get("optionId"))
    : null;
  // ── User / mapping ───────────────────────────────────────────────────
  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;

  const {
    // Mappings
    itemPurchasingStatus,
    shippingMethod,
    paymentTerms,
    userTypes,
    ao_status,
    transacstatus,
    archiveStatus,
    statusTransaction,
    itemType,
    procMode,
    procSource,
    loading: mappingLoading,
    // Keys
    draftKey,
    finalizeKey,
    transactionVerificationKey,
    forAssignmentKey,
    itemsManagementKey,
    itemsVerificationKey,
    itemsFinalizeKey,
    forCanvasKey,
    canvasVerificationKey,
    canvasFinalizeKey,
    forPricingKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    priceVerificationKey,
    finalizeVerificationKey,
    priceApprovalKey,
    priceFinalizeKey,
    priceApprovedKey,
    forPurchaseKey,
    forCollectionKey,

    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,

    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,
    cashKey,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,

    isGeneralManager,
    isAccountOfficer,
    isFinanceOfficer,
    isManagement,
    isProcurement,
    isAOTL,
  } = useKeysLabels();

  // ── PO data ───────────────────────────────────────────────────────────
  const [po, setPo] = useState(null);
  // Every PO the user can see — needed to rebuild an item's transaction-wide
  // qty (the card merges one item across all of its POs).
  const [allPOs, setAllPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poVoucherStatus, setPoVoucherStatus] = useState(null);
  // ?status= carries the tab the card was opened from — a partially received
  // PO is listed under For Delivery while its own status is still Pending
  // Receipt.
  //
  // Without it (a PO opened from elsewhere — the inventory's PO code, the
  // voucher's PO list) the PO opens on the tab it has LATEST reached: the
  // stage the Item Purchasing list files it under, not the tab the link
  // happened to be clicked from.
  const requestedStatus = searchParams.get("status");

  // ── Deep-link ?status= is only a REQUEST ───────────────────────────────
  // The eye on the purchase page carries the OPTION's status, and an option
  // can lag the PO's real progress (it still reads Pending Receipt after
  // every unit was received). A tab that would render an empty panel must
  // fall through to the stage the PO has actually reached — the same remap
  // the Item Purchasing list applies before filing a card (poLatestStatus).
  const refineRequestedTab = (requested) => {
    const status = String(requested);
    const opts = po?.purchase_order_options ?? [];
    if (!opts.length) return status;
    const optOf = (o) => o?.purchase_option ?? o;
    const toReceive = opts.some(
      (o) =>
        num(optOf(o)?.nQuantity) - num(optOf(o)?.nInventoryQty) > 0,
    );
    const toDeliver = opts.some(
      (o) =>
        num(optOf(o)?.nInventoryQty) - num(optOf(o)?.nDeliveredQty) > 0,
    );
    const delivered = opts.some((o) => num(optOf(o)?.nDeliveredQty) > 0);

    // Nothing left to receive → the receive panel would show no rows: the
    // goods are on their way out, so open For Delivery instead.
    if (status === String(pendingReceiptKey) && !toReceive)
      return String(forDeliveryKey);
    // Nothing left to hand over → Delivered when something went out, back
    // to Pending Receipt when nothing ever arrived.
    if (status === String(forDeliveryKey) && !toDeliver)
      return delivered ? String(deliveredKey) : String(pendingReceiptKey);
    return status;
  };

  const selectedStatusCode =
    po?.nStatus != null
      ? String(
          requestedStatus != null
            ? refineRequestedTab(requestedStatus)
            : poLatestStatus(po, {
                pendingReceiptKey,
                forDeliveryKey,
                deliveredKey,
              }),
        )
      : "";
  const fetchPO = useCallback(async () => {
    if (!poId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let found = null;
      let list = [];
      if (typeof PurchaseOrderAPI.getPurchaseOrder === "function") {
        const res = await PurchaseOrderAPI.getPurchaseOrder(poId);
        found = res?.data || res;
        list = found ? [found] : [];
      } else {
        const res = await PurchaseCartAPI.getAllPurchaseOrders();
        list = res?.purchaseOrders || [];
        found = list.find((p) => String(p.nPurchaseOrderId) === String(poId));
      }
      setAllPOs(list);
      setPo(found || null);
    } catch (err) {
      console.error("Failed to fetch purchase order:", err);
      setPo(null);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  // ── Transaction-wide item totals ───────────────────────────────────────
  // The card row in For Delivery / Delivered combines one item across every
  // PO of the transaction (5 from supplier A + 7 from supplier B = 12), but
  // the VIEW only loads this PO. Rebuild the same totals from the full list
  // so the panel row shows the matching number.
  const inActiveTab = useCallback(
    (p) => {
      const status = String(selectedStatusCode || "");
      if (!status) return false;

      // Same membership rule as the list, so the total matches the card.
      const s = String(p?.nStatus);
      const opts = p?.purchase_order_options || [];
      if (status === String(forDeliveryKey)) {
        return (
          s === String(forDeliveryKey) ||
          (s === String(pendingReceiptKey) &&
            opts.some((o) => getToDeliver(o.purchase_option) > 0))
        );
      }
      if (status === String(deliveredKey)) {
        return (
          s !== String(cancelledPOKey) &&
          opts.some((o) => getDelivered(o.purchase_option) > 0)
        );
      }
      return s === status;
    },
    [
      selectedStatusCode,
      forDeliveryKey,
      pendingReceiptKey,
      deliveredKey,
      cancelledPOKey,
    ],
  );

  const txnItemTotals = useMemo(() => {
    if (!allPOs.length) return {};

    const map = {};
    for (const p of allPOs) {
      if (!inActiveTab(p)) continue;
      for (const o of p.purchase_order_options || []) {
        const q = o?.purchase_option;
        const tiId = q?.transaction_item?.nTransactionItemId;
        if (tiId == null) continue;
        const t = (map[tiId] ??= { qty: 0, rcvd: 0, dlvd: 0, byPo: {} });
        const ordered = num(q?.nQuantity ?? o?.nQuantity);
        t.qty += ordered;
        t.rcvd += num(q?.nInventoryQty);
        t.dlvd += num(q?.nDeliveredQty);
        const poIdKey = String(p?.nPurchaseOrderId);
        t.byPo[poIdKey] = (t.byPo[poIdKey] ?? 0) + ordered;
      }
    }
    return map;
  }, [allPOs, inActiveTab]);

  // ── Shared stock pool, per purchase item ──────────────────────────────
  // A row in For Delivery is combined across every PO of the transaction, so
  // the qty typed can reach past this PO's own share. On submit we need to
  // know what each supplier entry still holds to split the delivery over them.
  const deliveryPool = useMemo(() => {
    const out = [];
    for (const p of allPOs) {
      const poId = p?.nPurchaseOrderId;
      for (const o of p.purchase_order_options || []) {
        const q = o?.purchase_option;
        if (q?.nPurchaseItemId == null) continue;
        out.push({
          nPurchaseItemId: q.nPurchaseItemId,
          nTransactionItemId:
            q.nTransactionItemId ?? q.transaction_item?.nTransactionItemId,
          nPurchaseOrderId: poId,
          free: getToDeliver(q),
        });
      }
    }
    return out;
  }, [allPOs]);

  // ── Suppliers behind a shared row ─────────────────────────────────────
  // One item can be bought from several suppliers (one PO each) — the row
  // adds their quantities together, but every supplier keeps its own line.
  // Maps a transaction item id to every purchase option behind it, so the
  // edit area can open ONE FORM PER SUPPLIER instead of folding them into a
  // single number.
  const txnItemOptions = useMemo(() => {
    const out = {};
    for (const p of allPOs) {
      if (String(p?.nStatus) === String(cancelledPOKey)) continue;
      for (const o of p.purchase_order_options || []) {
        const q = o?.purchase_option;
        if (q?.nPurchaseItemId == null) continue;
        const tiId =
          q?.nTransactionItemId ?? q?.transaction_item?.nTransactionItemId;
        if (tiId == null) continue;
        (out[tiId] ??= []).push({
          purchase_option: q,
          nPurchaseOrderId: p?.nPurchaseOrderId,
        });
      }
    }
    return out;
  }, [allPOs, cancelledPOKey]);

  const fetchTransactionForPurchase = useCallback(
    async (nTransactionId) => {
      try {
        let list = [];
        if (isManagement)
          list = (await TransactionAPI.getAll()).transactions || [];
        else if (isProcurement)
          list =
            (await TransactionAPI.getProcurement(`nUserId=${currentUserId}`))
              .transactions || [];
        else
          list =
            (
              await TransactionAPI.getAccountOfficer(
                `nUserId=${currentUserId}&isAOTL=${isAOTL ? 1 : 0}&fetchAll=${isAOTL ? 1 : 0}`,
              )
            ).transactions || [];

        const found = list.find(
          (t) => String(t.nTransactionId) === String(nTransactionId),
        );
        if (!found) return null;

        return {
          ...found,
          transactionId: found.strCode || "--",
          transactionName: found.strTitle || "--",
          companyName: found.company?.strCompanyNickName || "",
          clientName: found.client?.strClientNickName || "",
        };
      } catch (err) {
        console.error("Failed to fetch transaction for purchase view:", err);
        return null;
      }
    },
    [isManagement, isProcurement, isAOTL, currentUserId],
  );
  const fetchVoucherStatus = useCallback(async () => {
    if (!poId) return;
    try {
      const res = await VoucherAPI.getVouchers();
      const vouchers = Array.isArray(res) ? res : (res?.data ?? []);
      let status = null;
      vouchers.forEach((v) => {
        (v.voucher_suppliers ?? []).forEach((vs) => {
          if (String(vs.nPurchaseOrderId) === String(poId)) status = v.cStatus;
        });
      });
      setPoVoucherStatus(status);
    } catch (err) {
      console.error("Failed to fetch voucher status:", err);
    }
  }, [poId]);

  useEffect(() => {
    fetchPO();
    fetchVoucherStatus();
  }, [fetchPO, fetchVoucherStatus]);

  const notifyUpdated = useCallback((detail) => {
    window.dispatchEvent(
      new CustomEvent("purchase_order_data_updated", { detail }),
    );
  }, []);

  const handleBack = useCallback(
    () => navigate("/item-purchasing"),
    [navigate],
  );

  // ── Leaving the PO view for good ──────────────────────────────────────
  // One history step back when there IS one (the list the card was opened
  // from — react-router stamps idx on every entry it pushes), the list
  // itself when the page was opened directly: idx 0 has no "back".
  const leavePO = useCallback(() => {
    if (Number(window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/item-purchasing");
  }, [navigate]);

  // ── Local UI state ───────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showManageVoucher, setShowManageVoucher] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    strShippingDetails: "",
    cPaymentTerms: "",
    dFreight: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});
  const [isArrivedView, setIsArrivedView] = useState(false);
  const [arrivedFooterActions, setArrivedFooterActions] = useState(null);
  const [liveOptions, setLiveOptions] = useState([]);
  const [sellingPrices, setSellingPrices] = useState({});
  const [lineItemSaving, setLineItemSaving] = useState(false);
  const [receiveForms, setReceiveForms] = useState({});
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [deliverForms, setDeliverForms] = useState({});
  const [deliverSaving, setDeliverSaving] = useState(false);
  // Receipt no. pre-filled on every row of the deliver form — one number per
  // card (see fetchSuggestedReceipt below).
  const [suggestedReceiptNo, setSuggestedReceiptNo] = useState("");
  // Reset local UI state whenever we switch to a different PO
  useEffect(() => {
    setConfirmAction(null);
    setActionLoading(false);
    setShowPaymentForm(false);
    setPaymentForm({ strShippingDetails: "", cPaymentTerms: "", dFreight: "" });
    setPaymentLoading(false);
    setPaymentErrors({});
    setIsArrivedView(false);
    setArrivedFooterActions(null);
    setReceiveForms({});
    setDeliverForms({});
  }, [poId]);

  useEffect(() => {
    setLiveOptions(po?.purchase_order_options || []);
  }, [po]);
  useEffect(() => {
    const txnIds = [
      ...new Set(
        (po?.purchase_order_options || [])
          .map(
            (o) =>
              o.purchase_option?.transaction_item?.transaction?.nTransactionId,
          )
          .filter(Boolean),
      ),
    ];
    if (!txnIds.length) {
      setSellingPrices({});
      return;
    }
    let active = true;
    (async () => {
      try {
        const map = {};
        for (const txnId of txnIds) {
          const setsRes = await PricingAPI.getPricingSets(txnId);
          const chosen = (setsRes.data ?? []).find(
            (s) => s.bChosen === 1 || s.bChosen === true,
          );
          if (!chosen) continue;
          const res = await PricingAPI.getItemPricings(chosen.nPricingSetId);
          (res.itemPricings || []).forEach((p) => {
            map[p.nTransactionItemId] = Number(p.dUnitSellingPrice || 0);
          });
        }
        if (active) setSellingPrices(map);
      } catch (err) {
        console.error("Failed to fetch unit selling prices:", err);
        if (active) setSellingPrices({});
      }
    })();
    return () => {
      active = false;
    };
  }, [po]);

  // liveOptions + dUnitSellingPrice merged into each purchase_option
  const liveOptionsWithSelling = useMemo(
    () =>
      liveOptions.map((opt) => {
        const po_ = opt.purchase_option;
        if (!po_) return opt;
        const itemId =
          po_.nTransactionItemId ?? po_.transaction_item?.nTransactionItemId;
        return {
          ...opt,
          purchase_option: {
            ...po_,
            dUnitSellingPrice: sellingPrices[itemId] ?? 0,
          },
        };
      }),
    [liveOptions, sellingPrices],
  );
  useEffect(() => {
    if (selectedStatusCode) {
      // Highlight the sidebar entry for the view we actually opened
      window.dispatchEvent(
        new CustomEvent("viewing_po_status", {
          detail: { code: String(selectedStatusCode) },
        }),
      );
    }
  }, [selectedStatusCode]);
  const options = po?.purchase_order_options || [];
  const firstOption = options[0];

  // ── Transaction-wide panel rows (For Delivery / Delivered) ────────────
  // The LIST shows one card per transaction: every item of every PO sharing
  // the transaction code merged into ONE row per item. This view opens on a
  // single PO, so feeding the panel only this PO's options would hide the
  // rest of the card's items (card 10 rows → view 3). Rebuild the card's
  // exact rows here — same membership rule, same merge — so the panel always
  // shows what the card shows.
  const groupPanelOptions = useMemo(() => {
    const status = String(selectedStatusCode || "");
    if (status !== String(forDeliveryKey) && status !== String(deliveredKey))
      return liveOptions;

    // The transaction this card belongs to — the same group key the list
    // groups by (code, then transaction id).
    const txOf = (opt) => opt?.purchase_option?.transaction_item?.transaction;
    const groupKeyOf = (opt) => {
      const tx = txOf(opt) ?? {};
      return String(tx?.strCode || tx?.nTransactionId || "");
    };
    const anchor = liveOptions[0] ?? po?.purchase_order_options?.[0];
    const myKey = groupKeyOf(anchor);
    if (!myKey) return liveOptions;

    // Every option of every in-tab PO sharing the transaction code, in the
    // order splitDeliveryAcrossItems consumes them: this PO's own share
    // first, then the rest by PO id — so the merged S/N list lines up with
    // the split on submit.
    const originPoId = String(po?.nPurchaseOrderId ?? "");
    const parts = [];
    for (const p of allPOs) {
      if (!inActiveTab(p)) continue;
      const poId = String(p?.nPurchaseOrderId ?? "");
      const poNo = p?.strPurchaseOrderNo ?? "";
      for (const opt of p.purchase_order_options || []) {
        if (groupKeyOf(opt) !== myKey) continue;
        parts.push({ opt, poId, poNo });
      }
    }
    if (!parts.length) return liveOptions;

    parts.sort((a, b) => {
      const oa = a.poId === originPoId ? 0 : 1;
      const ob = b.poId === originPoId ? 0 : 1;
      if (oa !== ob) return oa - ob;
      if (a.poId !== b.poId) return Number(a.poId) - Number(b.poId);
      return (
        Number(a.opt?.purchase_option?.nPurchaseItemId) -
        Number(b.opt?.purchase_option?.nPurchaseItemId)
      );
    });

    // ONE ROW PER REQUESTED ITEM — the lead keeps the relations (transaction
    // item, supplier, brand · model, UOM), the quantities add up, and the
    // S/N lists concat so Sync Received SN works across the whole group.
    const byKey = new Map();
    for (const { opt, poNo } of parts) {
      const p = opt?.purchase_option;
      // The transaction item behind the option — NOT a column that may be
      // missing on the payload. Every requested line is its own row, even
      // when the transaction lists the same product twice.
      const tiId =
        p?.transaction_item?.nTransactionItemId ?? p?.nTransactionItemId;
      const key =
        tiId != null
          ? `ti-${tiId}`
          : `oi-${opt?.nPurchaseOrder_ItemId ?? p?.nPurchaseItemId}`;
      let row = byKey.get(key);
      if (!row) {
        row = { opt, poNos: [], parts: [] };
        byKey.set(key, row);
      }
      row.parts.push(opt);
      if (poNo && !row.poNos.includes(poNo)) row.poNos.push(poNo);
    }

    return [...byKey.values()].map(({ opt, poNos, parts: ps }) => {
      const lead = ps[0]?.purchase_option ?? {};
      const mergeQty = (field) =>
        ps.reduce((s, o) => s + num(o?.purchase_option?.[field]), 0);
      const mergeSN = (field) => {
        const seen = new Set();
        const out = [];
        for (const o of ps)
          for (const sn of o?.purchase_option?.[field] || []) {
            const s = String(sn || "");
            if (!s || seen.has(s)) continue;
            seen.add(s);
            out.push(s);
          }
        return out;
      };
      return {
        ...opt,
        // The panel prints the order(s) this row belongs to from this.
        __poNos: poNos,
        // The RAW supplier lines behind this row, each with its OWN
        // quantities and serials. The merged lead carries SUMMED figures,
        // so per-supplier contributor forms must read from these instead.
        __parts: ps.map((o) => o?.purchase_option),
        purchase_option: {
          ...lead,
          nQuantity: mergeQty("nQuantity"),
          nInventoryQty: mergeQty("nInventoryQty"),
          nDeliveredQty: mergeQty("nDeliveredQty"),
          receivedSerialNumbers: mergeSN("receivedSerialNumbers"),
          deliveredSerialNumbers: mergeSN("deliveredSerialNumbers"),
        },
      };
    });
  }, [
    selectedStatusCode,
    forDeliveryKey,
    deliveredKey,
    allPOs,
    liveOptions,
    po,
    inActiveTab,
  ]);

  // ── Deliver form: the card's next receipt number ──────────────────────
  // ONE number for the whole card (one transaction): it is reused while this
  // card already delivered with that number today, otherwise it is the latest
  // delivered receipt + 1. Rules live in InventoryController
  // ::suggestedDeliveredReceipt().
  const fetchSuggestedReceipt = useCallback(async () => {
    const tx = firstOption?.purchase_option?.transaction_item?.transaction;
    const params = {};
    if (tx?.nTransactionId != null) params.nTransactionId = tx.nTransactionId;
    else if (firstOption?.purchase_option?.nPurchaseItemId != null)
      params.nPurchaseItemId = firstOption.purchase_option.nPurchaseItemId;
    if (!Object.keys(params).length) return;

    try {
      const res = await InventoryAPI.getSuggestedDeliveredReceipt(params);
      setSuggestedReceiptNo(
        res?.strReceiptNumber ?? res?.data?.strReceiptNumber ?? "",
      );
    } catch (err) {
      console.error("Failed to fetch suggested receipt number:", err);
    }
  }, [firstOption]);

  const isDeliverForm =
    String(selectedStatusCode) === String(forDeliveryKey) ||
    // The Delivered rows carry the same form through their Edit button, so
    // that tab needs the card's next receipt number too.
    String(selectedStatusCode) === String(deliveredKey);

  useEffect(() => {
    if (!isDeliverForm) return;
    fetchSuggestedReceipt();
    // The number has to stay live: another user may deliver meanwhile (window
    // regains focus) and a page left open past midnight has to re-apply the
    // "one day passed → next number" rule (calendar day rolls over).
    const onFocus = () => fetchSuggestedReceipt();
    const dayRef = { current: new Date().toDateString() };
    const timer = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== dayRef.current) {
        dayRef.current = today;
        fetchSuggestedReceipt();
      }
    }, 60_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [isDeliverForm, fetchSuggestedReceipt]);

  // Rows still showing the auto value follow it when it advances (new day, or
  // another delivery moved the sequence on). Anything typed by hand stays.
  const prevSuggestionRef = useRef("");
  useEffect(() => {
    const prev = prevSuggestionRef.current;
    prevSuggestionRef.current = suggestedReceiptNo;
    if (!suggestedReceiptNo || prev === suggestedReceiptNo) return;

    setDeliverForms((prevForms) => {
      let changed = false;
      const next = {};
      for (const [key, f] of Object.entries(prevForms)) {
        const current = String(f?.receiptNo ?? "").trim();
        // Still on the previous auto value → follow the new one. On the very
        // first load, backfill the rows that were opened before it arrived.
        const follows = current === prev || (!prev && !current);
        if (follows) {
          next[key] = { ...f, receiptNo: suggestedReceiptNo };
          changed = true;
        } else {
          next[key] = f;
        }
      }
      return changed ? next : prevForms;
    });
  }, [suggestedReceiptNo]);

  const assignedAONickName = (() => {
    const u = firstOption?.purchase_option?.transaction_item?.transaction?.user;
    if (!u) return "—";
    return u.strNickName?.trim() || "—";
  })();

  const assignedAOUserId =
    firstOption?.purchase_option?.transaction_item?.transaction?.user?.nUserId;

  const assignedAOName = (() => {
    const u = firstOption?.purchase_option?.transaction_item?.transaction?.user;
    if (!u) return "—";
    const first = u.strFName ?? "";
    const middle = u.strMName ? u.strMName.charAt(0).toUpperCase() + "." : "";
    const last = u.strLName ?? "";
    return [first, middle, last].filter(Boolean).join(" ").trim();
  })();

  // ── AO / GM directory ────────────────────────────────────────────────
  const [aoGmDirectory, setAoGmDirectory] = useState({
    checkByOtherAOName: "—",
    generalManagerName: "—",
    aotlName: "—",
  });
  const aoGmFetchedRef = useRef(false);

  useEffect(() => {
    if (
      mappingLoading ||
      !userTypes ||
      Object.keys(userTypes).length === 0 ||
      aoGmFetchedRef.current
    )
      return;
    aoGmFetchedRef.current = true;
    UserAPI.getAllUsers()
      .then((res) => {
        const users = res.users ?? [];
        const { accountOfficerKey, generalManagerKey, aotlKey } =
          buildRoleGroups(userTypes);
        const buildName = (u) =>
          [
            u?.strFName,
            u?.strMName ? u.strMName[0].toUpperCase() + "." : "",
            u?.strLName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        const gm = users.find((u) =>
          generalManagerKey.includes(String(u.cUserType)),
        );
        // The Account Officer Team Leader — the one who signs off above the
        // Account Officer. Shown on the PO so the chain is visible.
        const aotl = users.find(
          (u) => String(u.cUserType) === String(aotlKey),
        );
        setAoGmDirectory({
          _users: users,
          _accountOfficerKey: accountOfficerKey,
          checkByOtherAOName: "—",
          generalManagerName: gm ? buildName(gm) || "—" : "—",
          aotlName: aotl ? buildName(aotl) || "—" : "—",
        });
      })
      .catch((err) =>
        console.error("Failed to fetch users for PO names:", err),
      );
  }, [mappingLoading, userTypes]);

  const checkByOtherAOName = useMemo(() => {
    const users = aoGmDirectory?._users;
    const accountOfficerKey = aoGmDirectory?._accountOfficerKey;
    if (!users || !accountOfficerKey) {
      return aoGmDirectory?.checkByOtherAOName ?? "—";
    }
    const ao = users.find(
      (u) =>
        accountOfficerKey.includes(String(u.cUserType)) &&
        Number(u.nUserId) !== Number(assignedAOUserId),
    );
    if (!ao) return aoGmDirectory?.checkByOtherAOName ?? "—";
    const first = ao.strFName ?? "";
    const middle = ao.strMName ? ao.strMName.charAt(0).toUpperCase() + "." : "";
    const last = ao.strLName ?? "";
    return [first, middle, last].filter(Boolean).join(" ").trim() || "—";
  }, [aoGmDirectory, assignedAOUserId]);

  const generalManagerName = aoGmDirectory?.generalManagerName ?? "—";
  const aotlName = aoGmDirectory?.aotlName ?? "—";
  const isLoadingPage = loading || mappingLoading || !po;

  const total = options.reduce(
    (sum, o) =>
      sum +
      (o.purchase_option?.nQuantity || 0) *
        (o.purchase_option?.dUnitPrice || 0),
    0,
  );
  // The preview/print sheet takes ONE PO-level EWT, but it is derived per line
  // (see utils/helpers/calculateEWT.js) — total it up here. Derived from the
  // same array the preview receives so locally-edited lines stay in sync.
  const previewOptions = liveOptions?.length ? liveOptions : options;
  const ewtAmount = totalEWT(previewOptions);
  const allOptionsAtPO = !!po && String(po.nStatus) === String(forApprovalKey);
  const allOptionsAtPayment =
    !!po && String(po.nStatus) === String(forPaymentKey);

  // The goods are on their way once they have been RECEIVED (or gone out) —
  // the Order Total row hides from then on, because the amounts live on the
  // JEV / voucher side. While the PO is only being PAID FOR the goods are
  // still on the supplier's side, so the total stays on screen.
  const anyOptionArrived =
    !!po &&
    [pendingReceiptKey, forDeliveryKey, deliveredKey]
      .map(String)
      .includes(String(po.nStatus));

  // ── Line-item patch (optimistic local update) ───────────────────────
  const onPatchOption = useCallback((nPurchaseItemId, patch) => {
    setLiveOptions((prev) =>
      prev.map((opt) =>
        opt.purchase_option?.nPurchaseItemId !== nPurchaseItemId
          ? opt
          : {
              ...opt,
              purchase_option: { ...opt.purchase_option, ...patch },
            },
      ),
    );
  }, []);

  const handleConfirm = async () => {
    if (!confirmAction || !po) return;

    // Close modal first
    const action = confirmAction;
    setConfirmAction(null);

    try {
      if (action === "print_po") {
        sessionStorage.setItem(
          "printPO_data",
          JSON.stringify({
            po,
            options,
            assignedAOName,
            firstOption,
            total,
            checkByOtherAOName,
            generalManagerName,
            ewtAmount,
          }),
        );
        printRoute("/print-po");
        return;
      }

      const nStatusToSend =
        action === "undo_approval" ? forApprovalKey : action;

      // A PO can be cancelled at any stage - the API takes down the
      // voucher, the JEV and the stock that go with it.

      await withSpinner("Purchase Order", async () => {
        await PurchaseOrderAPI.updateCartStatus({
          nPurchaseOrderId: po?.nPurchaseOrderId,
          nStatus: nStatusToSend,
          nUserId: currentUserId,
        });
      });
      bustPOCache(); // ← add here
      // Notify refresh
      notifyUpdated({
        purchaseOrderId: po?.nPurchaseOrderId,
        newStatus: nStatusToSend,
      });
      window.dispatchEvent(
        new CustomEvent("cart_status_updated", {
          detail: {
            purchaseOrderId: po?.nPurchaseOrderId,
            newStatus: nStatusToSend,
          },
        }),
      );

      // Cancelling also cancels the PO's inventory rows — refresh every open
      // inventory / card view, not only the ones listening to websockets.
      if (String(nStatusToSend) === String(cancelledPOKey)) {
        window.dispatchEvent(new CustomEvent("inventory_data_updated"));
      }

      // Success message
      await showSwal(
        "SUCCESS",
        {},
        { entity: "Purchase Order", action: "updated" },
      );
      navigate("/item-purchasing");
    } catch (err) {
      console.error("Failed to update cart status:", err);
      // The API explains WHY it refused (items already arrived, …) — show
      // that instead of a bare "something went wrong".
      await showSwal(
        "ERROR",
        err?.message ? { text: err.message } : {},
        { entity: "Purchase Order" },
      );
    }
  };
  const handleConfirmReceived = async () => {
    const items = Object.entries(receiveForms)
      .map(([id, f]) => ({
        nPurchaseItemId: Number(id),
        nQuantity: Number(f.qty) || 0,
        strReceiptNumber: (f.receiptNo || "").trim() || null,
        serials: f.serials || [],
      }))
      .filter((i) => i.nQuantity > 0);

    // Receipt no. is optional — only the quantity is required
    if (!items.length) {
      await showSwal("ERROR", {}, { entity: "Receipt (quantity required)" });
      return;
    }

    // A serial number can never outnumber the units on its line. The panel
    // caps the S/N box at the entered qty — this catches anything edited
    // after the fact before it reaches the backend.
    if (items.some((i) => (i.serials?.length || 0) > i.nQuantity)) {
      await showSwal(
        "ERROR",
        {
          text: "A line has more serial numbers than the quantity being received. Raise the quantity or remove the extra S/N.",
        },
        { entity: "Receipt (S/N limit)" },
      );
      return;
    }

    setReceiveSaving(true);
    try {
      await withSpinner("Receipt", async () => {
        await InventoryAPI.bulkReceiveDeliver({
          mode: "receive",
          nPurchaseOrderId: po?.nPurchaseOrderId,
          nReceivedStatus: forDeliveryKey, // 150: every item fully received
          nDeliveredStatus: deliveredKey, // 160: every item fully delivered
          nPaidStatus: pendingReceiptKey, // 140: default, stays in Pending Receipt
          items,
        });
      });
      bustPOCache();
      notifyUpdated({ purchaseOrderId: po?.nPurchaseOrderId });

      // ── Was that the last of it? ───────────────────────────────────
      // Read off the PO as it stood BEFORE this call — the qty each option
      // still owed — minus exactly what was just submitted. The Receive
      // panel only lists options with qty owing, so when nothing is left
      // it would come back EMPTY (same panel, no items): leave instead.
      const submittedByItem = new Map(
        items.map((i) => [String(i.nPurchaseItemId), i.nQuantity]),
      );
      const leftToReceive = (po?.purchase_order_options ?? []).reduce(
        (sum, opt) => {
          const p = opt?.purchase_option;
          const submitted =
            submittedByItem.get(String(p?.nPurchaseItemId)) ?? 0;
          return sum + Math.max(getToReceive(p) - submitted, 0);
        },
        0,
      );

      await showSwal("SUCCESS", {}, { entity: "Receipt", action: "recorded" });
      setReceiveForms({});
      if (leftToReceive <= 0) {
        leavePO();
        return;
      }
      await fetchPO();
    } catch (err) {
      console.error("Failed to confirm received:", err);
      await showSwal("ERROR", {}, { entity: "Receipt" });
    } finally {
      setReceiveSaving(false);
    }
  };
  const handleConfirmDelivered = async () => {
    const lines = Object.entries(deliverForms)
      .map(([id, f]) => ({
        nPurchaseItemId: Number(id),
        nQuantity: Number(f.qty) || 0,
        strReceiptNumber: (f.receiptNo || "").trim() || null,
        serials: f.serials || [],
      }))
      .filter((i) => i.nQuantity > 0);

    // Receipt no. is REQUIRED for a delivery — every row comes pre-filled with
    // the card's number, so this only trips when one was cleared by hand.
    if (!lines.length) {
      await showSwal("ERROR", {}, { entity: "Delivery (quantity required)" });
      return;
    }

    if (lines.some((i) => !i.strReceiptNumber)) {
      await showSwal(
        "ERROR",
        { text: "Every delivery line needs a receipt number." },
        { entity: "Delivery (receipt no. required)" },
      );
      return;
    }

    // A serial number can never outnumber the units on its line. The panel
    // caps the S/N box at the entered qty — this catches anything edited
    // after the fact before it reaches the backend.
    if (lines.some((i) => (i.serials?.length || 0) > i.nQuantity)) {
      await showSwal(
        "ERROR",
        {
          text: "A line has more serial numbers than the quantity being delivered. Lower the quantity or remove the extra S/N.",
        },
        { entity: "Delivery (S/N limit)" },
      );
      return;
    }

    // One row on screen can be shared by several purchase items (5 from
    // supplier A + 5 from supplier B = 10). Expand each line over the entries
    // it is drawn from → one inventory row each, this PO's share first.
    const items = [];
    let short = 0;
    for (const line of lines) {
      const split = splitDeliveryAcrossItems(line, deliveryPool);
      if (split.short > 0) {
        short += split.short;
        continue;
      }
      items.push(...split.items);
    }

    if (short > 0) {
      await showSwal(
        "ERROR",
        {
          text: `You are ${short} unit(s) over what is still deliverable across this item's purchase orders. Lower the quantity and try again.`,
        },
        { entity: "Delivery" },
      );
      return;
    }

    setDeliverSaving(true);
    try {
      await withSpinner("Delivery", async () => {
        await InventoryAPI.bulkReceiveDeliver({
          mode: "deliver",
          nPurchaseOrderId: po?.nPurchaseOrderId,
          nReceivedStatus: forDeliveryKey, // 150
          nDeliveredStatus: deliveredKey, // 160: every item fully delivered
          nPaidStatus: pendingReceiptKey, // 140
          items,
        });
      });
      bustPOCache();
      notifyUpdated({ purchaseOrderId: po?.nPurchaseOrderId });
      await showSwal("SUCCESS", {}, { entity: "Delivery", action: "recorded" });
      setDeliverForms({});
      await fetchPO();
      // The batch just took a number — hand out the next one for the rest.
      fetchSuggestedReceipt();
    } catch (err) {
      console.error("Failed to confirm delivered:", err);
      await showSwal("ERROR", {}, { entity: "Delivery" });
    } finally {
      setDeliverSaving(false);
    }
  };
  // ── Row-level Save Changes (For Delivery / Delivered edit forms) ─────
  // The form holds a corrected TOTAL for one line, not a delta:
  //   • above what is recorded → the extra units go in through the same
  //     inventory/bulk call the footer buttons use,
  //   • below it → the newest inventory rows are lowered to match.
  // The S/N list works the same way: what the user leaves in the form is
  // what the line should hold — additions ride with the new units, ones
  // crossed off come back off the rows.
  // Returns true once the record has been corrected.

  // The receipt number the line's newest row was written under — the edit
  // form opens with it, so a correction never writes a blank one.
  const getLineReceiptNo = useCallback(async (nPurchaseItemId, sign = 1) => {
    try {
      return lastRowReceipt(await loadItemRows(Number(nPurchaseItemId)), sign);
    } catch (err) {
      console.error("Failed to read the line's receipt no.:", err);
      return "";
    }
  }, []);

  const saveReceiveRow = useCallback(
    async (line) => {
      const nPurchaseItemId = Number(line?.nPurchaseItemId);
      const target = Number(line?.target);
      const receiptNo = (line?.strReceiptNumber || "").trim();
      const want = uniq(line?.serials);

      // Same cross-PO resolution as the delivery save: a contributor line can
      // belong to an order other than the open one.
      let ownerPo = po;
      let opt = (ownerPo?.purchase_order_options ?? []).find(
        (o) => Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
      )?.purchase_option;
      if (!opt) {
        ownerPo = allPOs.find((p) =>
          (p?.purchase_order_options ?? []).some(
            (o) =>
              Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
          ),
        );
        opt = (ownerPo?.purchase_order_options ?? []).find(
          (o) =>
            Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
        )?.purchase_option;
      }
      if (!ownerPo || !opt) {
        await showSwal("ERROR", {}, { entity: "Receipt (line not found)" });
        return false;
      }
      const ordered = num(opt?.nQuantity);
      const received = num(opt?.nInventoryQty);
      const alreadyOut = num(opt?.nDeliveredQty);

      if (!Number.isInteger(target)) {
        await showSwal("ERROR", {}, { entity: "Receipt (quantity required)" });
        return false;
      }
      // Whatever already went out can never be taken back from the received
      // side — the delivered line has to be corrected first.
      if (target < alreadyOut) {
        await showSwal(
          "ERROR",
          {
            text: `Received (${target}) can't be less than what already went out (${alreadyOut}). Correct the delivery first.`,
          },
          { entity: "Receipt (quantity)" },
        );
        return false;
      }
      if (target > ordered) {
        await showSwal(
          "ERROR",
          {
            text: `Received can't be more than the ordered quantity (${ordered}).`,
          },
          { entity: "Receipt (quantity)" },
        );
        return false;
      }
      if (want.length > target) {
        await showSwal(
          "ERROR",
          {
            text: `This line can't hold more serial numbers (${want.length}) than its quantity (${target}).`,
          },
          { entity: "Receipt (S/N limit)" },
        );
        return false;
      }

      // What the rows hold right now — the form may have been open a while.
      // Only the S/N the user ADDED are new; the rest are already recorded.
      const rowsBefore = await loadItemRows(nPurchaseItemId);
      const have = serialSetFor(rowsBefore, 1);
      const wantSet = new Set(want);
      const toAdd = want.filter((sn) => !have.has(sn));
      const toRemove = [...have].filter((sn) => !wantSet.has(sn));
      // Carry on under the receipt the line already has when none is typed.
      const recordedReceipt = lastRowReceipt(rowsBefore, 1);
      const receipt = receiptNo || recordedReceipt;

      const delta = target - received;
      // New S/N only ride along with units that come IN.
      if (toAdd.length > Math.max(delta, 0)) {
        await showSwal(
          "ERROR",
          {
            text: `You can only add serial numbers for the ${Math.max(delta, 0)} extra unit(s) — remove the extra S/N.`,
          },
          { entity: "Receipt (S/N limit)" },
        );
        return false;
      }
      if (delta === 0 && !toAdd.length && !toRemove.length) {
        // Same quantity, same S/N — the only change left is the receipt
        // number, which still counts (the corrected number rewrites onto the
        // existing received rows). Truly nothing to save stops here
        // without a popup, so no empty history/receipt row is written.
        if (!(receiptNo && receiptNo !== (recordedReceipt || "").trim())) {
          return false;
        }
      }

      setReceiveSaving(true);
      try {
        await withSpinner("Receipt", async () => {
          // RECEIPT-ONLY save: same quantity, same S/N — rewrite the record's
          // receipt number onto the received rows instead of writing a new
          // history row.
          if (delta === 0 && !toAdd.length && !toRemove.length) {
            await Promise.all(
              (rowsBefore || [])
                .filter((r) => Number(r?.nQuantity) > 0)
                .map((r) =>
                  InventoryAPI.updateInventory(Number(r?.nInventoryId), {
                    strReceiptNumber: receipt,
                    // The endpoint requires cStatus — keep each row's own so
                    // only the receipt number moves.
                    cStatus: r?.cStatus,
                  }),
                ),
            );
            return;
          }
          if (delta > 0) {
            await InventoryAPI.bulkReceiveDeliver({
              mode: "receive",
              nPurchaseOrderId: ownerPo?.nPurchaseOrderId,
              nReceivedStatus: forDeliveryKey, // 150: every item fully received
              nDeliveredStatus: deliveredKey, // 160: every item fully delivered
              nPaidStatus: pendingReceiptKey, // 140: default, stays in Pending Receipt
              items: [
                {
                  nPurchaseItemId,
                  nQuantity: delta,
                  strReceiptNumber: receipt || null,
                  // Only the S/N typed in — the ones on record stay put.
                  serials: toAdd,
                },
              ],
            });
          } else if (delta < 0) {
            // The extra units come back off the newest rows in. The S/N the
            // user kept are the ones that survive the trim.
            await shrinkItemRows({
              nPurchaseItemId,
              take: -delta,
              sign: 1,
              keepFirst: [...(opt?.deliveredSerialNumbers || []), ...want],
            });
            await PurchaseOrderAPI.syncStatus({
              nPurchaseOrderId: ownerPo?.nPurchaseOrderId,
              nPurchaseItemId,
              nUserId: currentUserId,
              nReceivedStatus: forDeliveryKey,
              nDeliveredStatus: deliveredKey,
              nPaidStatus: pendingReceiptKey,
            });
          }
          // S/N crossed off the list come back off whatever rows hold them.
          await dropSerials({ nPurchaseItemId, codes: toRemove, sign: 1 });
        });
        bustPOCache();
        notifyUpdated({ purchaseOrderId: ownerPo?.nPurchaseOrderId });
        window.dispatchEvent(new CustomEvent("inventory_data_updated"));
        await showSwal(
          "SUCCESS",
          {},
          { entity: "Receipt", action: delta > 0 ? "recorded" : "updated" },
        );
        await fetchPO();
        return true;
      } catch (err) {
        console.error("Failed to save receipt line:", err);
        const msg = err?.response?.data?.message || err?.message;
        await showSwal("ERROR", msg ? { text: msg } : {}, { entity: "Receipt" });
        // A correction may have gone through halfway — show the real totals.
        await fetchPO();
        return false;
      } finally {
        setReceiveSaving(false);
      }
    },
    [
      po,
      allPOs,
      currentUserId,
      forDeliveryKey,
      deliveredKey,
      pendingReceiptKey,
      notifyUpdated,
      fetchPO,
    ],
  );

  const saveDeliverRow = useCallback(
    async (line) => {
      const nPurchaseItemId = Number(line?.nPurchaseItemId);
      const target = Number(line?.target);
      const receiptNo = (line?.strReceiptNumber || "").trim();
      const want = uniq(line?.serials);

      // The contributor line may live on a DIFFERENT PO than the one open in
      // the view — multi-supplier rows stretch across orders. Resolve it
      // across every PO of the transaction and remember the order it
      // actually belongs to: the batch write and the status sync have to run
      // against THAT order, not the one that happens to be open.
      let ownerPo = po;
      let opt = (ownerPo?.purchase_order_options ?? []).find(
        (o) => Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
      )?.purchase_option;
      if (!opt) {
        ownerPo = allPOs.find((p) =>
          (p?.purchase_order_options ?? []).some(
            (o) =>
              Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
          ),
        );
        opt = (ownerPo?.purchase_order_options ?? []).find(
          (o) =>
            Number(o?.purchase_option?.nPurchaseItemId) === nPurchaseItemId,
        )?.purchase_option;
      }
      if (!ownerPo || !opt) {
        await showSwal("ERROR", {}, { entity: "Delivery (line not found)" });
        return false;
      }
      const received = num(opt?.nInventoryQty);
      const deliveredNow = num(opt?.nDeliveredQty);

      if (!Number.isInteger(target)) {
        await showSwal(
          "ERROR",
          {},
          { entity: "Delivery (quantity required)" },
        );
        return false;
      }
      if (target < 0) {
        await showSwal(
          "ERROR",
          { text: "Delivered quantity can't be negative." },
          { entity: "Delivery (quantity)" },
        );
        return false;
      }
      if (target > received) {
        await showSwal(
          "ERROR",
          {
            text: `Delivered can't be more than what was received (${received}). Correct the receipt first.`,
          },
          { entity: "Delivery (quantity)" },
        );
        return false;
      }
      if (want.length > target) {
        await showSwal(
          "ERROR",
          {
            text: `This line can't hold more serial numbers (${want.length}) than its quantity (${target}).`,
          },
          { entity: "Delivery (S/N limit)" },
        );
        return false;
      }

      // What the rows hold right now — the form may have been open a while.
      // Only the S/N the user ADDED are new; the rest are already recorded.
      const rowsBefore = await loadItemRows(nPurchaseItemId);
      const have = serialSetFor(rowsBefore, -1);
      const wantSet = new Set(want);
      const toAdd = want.filter((sn) => !have.has(sn));
      const toRemove = [...have].filter((sn) => !wantSet.has(sn));
      // Carry on under the receipt the line already has when none is typed.
      const recordedReceipt = lastRowReceipt(rowsBefore, -1);
      const receipt = receiptNo || recordedReceipt;

      const delta = target - deliveredNow;
      // New S/N only ride along with units that go OUT.
      if (toAdd.length > Math.max(delta, 0)) {
        await showSwal(
          "ERROR",
          {
            text: `You can only add serial numbers for the ${Math.max(delta, 0)} extra unit(s) — remove the extra S/N.`,
          },
          { entity: "Delivery (S/N limit)" },
        );
        return false;
      }
      if (delta === 0 && !toAdd.length && !toRemove.length) {
        // Same quantity, same S/N — the only change left is the receipt
        // number, which still counts (the corrected number rewrites onto the
        // existing delivered rows). Truly nothing to save stops here
        // without a popup, so no empty history/receipt row is written.
        if (!(receiptNo && receiptNo !== (recordedReceipt || "").trim())) {
          return false;
        }
      }
      // Only a delivery that adds units needs its receipt number — correcting
      // the count down leaves the existing rows (and their receipt) alone.
      if (delta > 0 && !receipt) {
        await showSwal(
          "ERROR",
          { text: "Every delivery line needs a receipt number." },
          { entity: "Delivery (receipt no. required)" },
        );
        return false;
      }

      setDeliverSaving(true);
      try {
        await withSpinner("Delivery", async () => {
          // RECEIPT-ONLY save: same quantity, same S/N — rewrite the record's
          // receipt number onto the delivered rows instead of writing a new
          // history row.
          if (delta === 0 && !toAdd.length && !toRemove.length) {
            await Promise.all(
              (rowsBefore || [])
                .filter((r) => Number(r?.nQuantity) < 0)
                .map((r) =>
                  InventoryAPI.updateInventory(Number(r?.nInventoryId), {
                    strReceiptNumber: receipt,
                    // The endpoint requires cStatus — keep each row's own so
                    // only the receipt number moves.
                    cStatus: r?.cStatus,
                  }),
                ),
            );
            return;
          }
          if (delta > 0) {
            await InventoryAPI.bulkReceiveDeliver({
              mode: "deliver",
              nPurchaseOrderId: ownerPo?.nPurchaseOrderId,
              nReceivedStatus: forDeliveryKey, // 150
              nDeliveredStatus: deliveredKey, // 160: every item fully delivered
              nPaidStatus: pendingReceiptKey, // 140
              items: [
                {
                  nPurchaseItemId,
                  nQuantity: delta,
                  strReceiptNumber: receipt || null,
                  // Only the S/N typed in — the ones on record stay put.
                  serials: toAdd,
                },
              ],
            });
          } else if (delta < 0) {
            // Too much went out — the extra units come back off the newest
            // delivery rows in, keeping the S/N the user left in the form.
            await shrinkItemRows({
              nPurchaseItemId,
              take: -delta,
              sign: -1,
              keepFirst: want,
            });
            await PurchaseOrderAPI.syncStatus({
              nPurchaseOrderId: ownerPo?.nPurchaseOrderId,
              nPurchaseItemId,
              nUserId: currentUserId,
              nReceivedStatus: forDeliveryKey,
              nDeliveredStatus: deliveredKey,
              nPaidStatus: pendingReceiptKey,
            });
          }
          // S/N crossed off the list come back off whatever rows hold them.
          await dropSerials({ nPurchaseItemId, codes: toRemove, sign: -1 });
        });
        bustPOCache();
        notifyUpdated({ purchaseOrderId: ownerPo?.nPurchaseOrderId });
        window.dispatchEvent(new CustomEvent("inventory_data_updated"));
        await showSwal(
          "SUCCESS",
          {},
          { entity: "Delivery", action: delta > 0 ? "recorded" : "updated" },
        );
        await fetchPO();
        // The batch's number may have changed — hand out the next one.
        fetchSuggestedReceipt();
        return true;
      } catch (err) {
        console.error("Failed to save delivery line:", err);
        const msg = err?.response?.data?.message || err?.message;
        await showSwal(
          "ERROR",
          msg ? { text: msg } : {},
          { entity: "Delivery" },
        );
        // A correction may have gone through halfway — show the real totals.
        await fetchPO();
        fetchSuggestedReceipt();
        return false;
      } finally {
        setDeliverSaving(false);
      }
    },
    [
      po,
      allPOs,
      currentUserId,
      forDeliveryKey,
      deliveredKey,
      pendingReceiptKey,
      notifyUpdated,
      fetchPO,
      fetchSuggestedReceipt,
    ],
  );

  const handlePreviewPO = () => {
    navigate("/preview-po", {
      state: {
        po,
        options: previewOptions,
        assignedAOName,
        firstOption,
        total,
        checkByOtherAOName,
        generalManagerName,

        // Not every line carries EWT, so the sheet must be told the total —
        // otherwise usePreviewPO falls back to 0 and the payable is wrong.
        ewtAmount,

        // The freight on the PO — the sheet prints it under the subtotal
        // and adds it into the total.
        freightAmount: po?.dFreight ?? 0,

        cashKey,
        creditCardKey,
        chequeKey,
        otherPaymentTermKey,
        cashLabel,
        creditCardLabel,
        chequeLabel,
        otherPaymentTermLabel,
      },
    });
  };
  // ── PO details (shipping / payment terms) submit ────────────────────
  const validatePayment = () => {
    const errors = {};
    // The field is a Quill editor (HTML), so compare against its TEXT: a
    // cleared/blank document counts as empty, while real content — the
    // seeded default or previously saved details — passes.
    if (!hasShippingText(paymentForm.strShippingDetails))
      errors.strShippingDetails = "Shipping details is required.";
    if (!paymentForm.cPaymentTerms)
      errors.cPaymentTerms = "Payment terms is required.";
    return errors;
  };
  const handleProceedToPODetails = async () => {
    const errors = validatePayment();
    if (Object.keys(errors).length) {
      setPaymentErrors(errors);
      return;
    }

    setShowPaymentForm(false);
    setPaymentErrors({});

    try {
      await withSpinner("Purchase Order", async () => {
        await PurchaseOrderAPI.proceedToPODetails({
          nPurchaseOrderId: po?.nPurchaseOrderId,
          strShippingDetails: paymentForm.strShippingDetails,
          cPaymentTerms: paymentForm.cPaymentTerms,
          // The freight charge — an empty field means "none on this PO".
          dFreight:
            paymentForm.dFreight === "" || paymentForm.dFreight == null
              ? null
              : Number(paymentForm.dFreight),
        });
      });
      bustPOCache();
      // Generic update: no status change happened.
      window.dispatchEvent(
        new CustomEvent("purchase_order_data_updated", {
          detail: { purchaseOrderId: po?.nPurchaseOrderId },
        }),
      );

      await showSwal(
        "SUCCESS",
        {},
        { entity: "Purchase Order", action: "submitted" },
      );
      await fetchPO();
    } catch (err) {
      console.error("Failed to submit PO details:", err);
      await showSwal("ERROR", {}, { entity: "Purchase Order" });
    }
  };
  const openPaymentForm = () => {
    const savedShipping = po?.strShippingDetails ?? "";
    setPaymentForm({
      // Seed the default template whenever the PO has no usable shipping
      // text yet, so what the editor SHOWS is exactly what gets validated
      // and submitted — no more "required" on a prefilled field.
      strShippingDetails: hasShippingText(savedShipping)
        ? savedShipping
        : DEFAULT_SHIPPING_DETAILS,
      cPaymentTerms: po?.cPaymentTerms ?? "",
      // The freight charge — the PO's own, empty when it has none.
      dFreight:
        po?.dFreight != null && po?.dFreight !== ""
          ? String(po.dFreight)
          : "",
    });
    // Drop any stale error left over from a previous failed submit.
    setPaymentErrors({});
    setShowPaymentForm(true);
  };

  return {
    // data
    po,
    poId,
    initialOptionId,
    isLoadingPage,
    poVoucherStatus,
    // keys / roles
    cartKey: cartKey ?? "",
    forApprovalKey: forApprovalKey ?? "",
    forPaymentKey: forPaymentKey ?? "",
    pendingReceiptKey: pendingReceiptKey ?? "",
    forDeliveryKey: forDeliveryKey ?? "",
    deliveredKey: deliveredKey ?? "",
    cancelledPOKey: cancelledPOKey ?? "",
    removedFromCartKey,
    voucherActiveKey: voucherActiveKey ?? "",
    voucherClosedKey: voucherClosedKey ?? "",
    voucherPaidKey: voucherPaidKey ?? "",
    voucherSupplierTypeKey,
    currentUserId,
    isAccountOfficer,
    isGeneralManager,
    userTypes,
    shippingMethod,
    paymentTerms,
    // derived
    options,
    txnItemTotals,
    txnItemOptions,
    liveOptions: liveOptionsWithSelling,
    // For Delivery / Delivered: the transaction's merged rows (same rows the
    // list card shows) — falls back to liveOptions outside those tabs.
    groupPanelOptions,
    firstOption,
    total,
    allOptionsAtPO,
    allOptionsAtPayment,
    anyOptionArrived,
    assignedAONickName,
    assignedAOName,
    checkByOtherAOName,
    generalManagerName,
    aotlName,
    aoGmDirectory,
    // ui state
    confirmAction,
    setConfirmAction,
    actionLoading,
    showPaymentForm,
    setShowPaymentForm,
    showManageVoucher,
    setShowManageVoucher,
    paymentForm,
    setPaymentForm,
    paymentLoading,
    paymentErrors,
    isArrivedView,
    setIsArrivedView,
    arrivedFooterActions,
    setArrivedFooterActions,
    lineItemSaving,
    setLineItemSaving,
    // handlers
    receiveForms,
    setReceiveForms,
    receiveSaving,
    handleConfirmReceived,
    deliverForms,
    setDeliverForms,
    deliverSaving,
    suggestedReceiptNo,
    handleConfirmDelivered,
    // row-level Save Changes (Edit button on the For Delivery / Delivered rows)
    saveReceiveRow,
    saveDeliverRow,
    getLineReceiptNo,
    handleBack,
    handleConfirm,
    handleProceedToPODetails,
    openPaymentForm,
    onPatchOption,
    fetchPO,
    fetchTransactionForPurchase,
    // extra data for View For Purchase navigation
    isManagement,
    isAccountOfficer,
    isAOTL,
    isProcurement,
    itemType,
    procMode,
    procSource,
    statusTransaction,
    archiveStatus,
    forCanvasKey,
    canvasFinalizeKey,
    canvasVerificationKey,
    itemsManagementKey,
    forCollectionKey,
    forPurchaseKey,
    ao_status,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    transacstatus,
    itemPurchasingStatus,
    selectedStatusCode,
    handlePreviewPO,
    isFinanceOfficer,
  };
}
