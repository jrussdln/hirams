import { useCallback, useEffect, useState, useMemo, useRef } from "react";import { useNavigate } from "react-router-dom";
import PurchaseOrderAPI from "../../../api/endpoints/purchase-order.api.js";
import VoucherAPI from "../../../api/endpoints/voucher.api.js";
import InventoryAPI from "../../../api/endpoints/inventory.api.js";
import UserAPI from "../../../api/endpoints/user.api.js";
import { totalEWT } from "../../../utils/helpers/calculateEWT.js";
import { fmtDateTime } from "../../../utils/helpers/timeZone";
import {
  getItem,
  setItem,
  removeItem,
  hasItem,
} from "../../../utils/storage/localStorage.js";
import { withSpinner } from "../../../utils/helpers/swal.jsx";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

export default function useVoucher() {
  const navigate = useNavigate();
  // Seeded from cache — instant render on revisit, silent refresh follows.
  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;
  const storageKey = `voucher_list_${currentUserId}`;
  const optionStatusesKey = `voucher_option_statuses_${currentUserId}`;
  // The arrived-item ids cache the Paid rows' Unpaid gate — seeded so the
  // pay icon paints disabled on a revisit instead of flashing ENABLED for
  // the whole getHistoryBulk round-trip ("cannot unpay" is the safe state).
  const arrivedItemsKey = `voucher_arrived_items_${currentUserId}`;

  const [itemsLoading, setItemsLoading] = useState(() => !hasItem(storageKey));
  const [vouchers, setVouchers] = useState(() => getItem(storageKey, []));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [optionStatuses, setOptionStatuses] = useState(() =>
    getItem(optionStatusesKey, {}),
  );
  // AO nickname lookup — nAssignedUserId → strNickName, built once on mount so
  // the AO column can show the account officer's name.
  const [aoNicknameMap, setAoNicknameMap] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await UserAPI.getAllUsers();
        const users = Array.isArray(res?.users) ? res.users : [];
        const map = {};
        users.forEach((u) => {
          if (u?.nUserId) map[u.nUserId] = u?.strNickName || "";
        });
        setAoNicknameMap(map);
      } catch (err) {
        console.error("Failed to fetch users for AO column:", err);
      }
    })();
  }, []);
  const {
    voucherStatus,
    userTypes,
    paymentTerms,
    loading: mappingLoading,

    jevDisbursementVoucherKey,
    jevPendingKey,
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherCancelledKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,
    closeCartKey,
    cancelCartKey,
    cancelledPOKey,
    addToCartKey,
    purchaseOrderKey,
    forPurchaseKey,
    paidKey,
    forDeliveryKey,
    pendingReceiptKey,
    forPaymentKey,
    deliveredKey,
    chequeKey,
    isAOTL,
    isManagement,
    isFinanceOfficer,
  } = useKeysLabels();

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem("selectedVoucherStatusCode", ""),
  );

  const handleViewClick = useCallback(
    (voucher) => {
      navigate(`/voucher-update?id=${voucher.nVoucherId}`);
    },
    [navigate],
  );
  const handlePageChange = useCallback((_, p) => setPage(p), []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  const handleRowClick = useCallback(
    (row) => handleViewClick(row._raw),
    [handleViewClick],
  );

  const handleTypeFilterChange = useCallback((e) => {
    setTypeFilter(e.target.value);
    setPage(0);
  }, []);

  const fetchOptionStatuses = useCallback(async (voucherList) => {
    const ids = (voucherList || [])
      .flatMap((v) => v.voucher_suppliers ?? [])
      .flatMap((vs) => vs.purchase_order?.purchase_order_options ?? [])
      .map((o) => o.purchase_option?.nPurchaseItemId)
      .filter(Boolean);

    if (!ids.length) return;
    try {
      const res = await PurchaseOrderAPI.getLatestHistory({
        nPurchaseItemId: ids,
      });
      const map = {};
      (res?.histories || []).forEach((h) => {
        map[Number(h.nPurchaseItemId)] = h?.nStatus ?? null;
      });
      setOptionStatuses(map);
      setItem(optionStatusesKey, map);
    } catch (err) {
      console.error("fetchOptionStatuses error:", err);
    }
  }, [optionStatusesKey]);

  // ── Arrival rule — the SAME source the update page and the API's own
  //    guard use (InventoryAPI.getHistoryBulk): any linked purchase item
  //    with a posted receipt (non-zero qty, status A/P) has already
  //    arrived, so its Paid voucher cannot be unpaid anymore — the
  //    receipts and the journal behind them are already posted.
  const allLinkedItemIds = useMemo(
    () => [
      ...new Set(
        (vouchers || [])
          .flatMap((v) => v.voucher_suppliers ?? [])
          .flatMap((vs) => vs.purchase_order?.purchase_order_options ?? [])
          .map((o) => o.purchase_option?.nPurchaseItemId)
          .filter(Boolean)
          .map(String),
      ),
    ],
    [vouchers],
  );
  // Seeded from cache — like the vouchers, so a revisit does not flash the
  // Unpaid icon ENABLED while getHistoryBulk is still in flight.
  const [arrivedItemIds, setArrivedItemIds] = useState(() =>
    new Set(getItem(arrivedItemsKey, [])),
  );
  // Receipts are posted from other screens — a fresh history fetch keeps
  // the Unpaid gate honest without a reload.
  const [arrivalRefreshKey, setArrivalRefreshKey] = useState(0);
  useEffect(() => {
    const bump = () => setArrivalRefreshKey((k) => k + 1);
    window.addEventListener("inventory_data_updated", bump);
    window.addEventListener("inventory_data_deleted", bump);
    return () => {
      window.removeEventListener("inventory_data_updated", bump);
      window.removeEventListener("inventory_data_deleted", bump);
    };
  }, []);
  useEffect(() => {
    if (!allLinkedItemIds.length) {
      // An empty voucher list cannot have arrived items — drop to an empty
      // set but keep the cache: rewriting it here (mid-load) would wipe a
      // good snapshot for nothing.
      setArrivedItemIds(new Set());
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await InventoryAPI.getHistoryBulk(allLinkedItemIds);
        const rows = res?.rows ?? res?.data?.rows ?? {};
        const arrived = new Set();
        for (const id of allLinkedItemIds) {
          const list = rows?.[id] ?? [];
          const received = (Array.isArray(list) ? list : []).some(
            (r) =>
              Number(r?.nQuantity) !== 0 &&
              ["A", "P"].includes(String(r?.cStatus || "").trim()),
          );
          if (received) arrived.add(id);
        }
        if (active) {
          setArrivedItemIds(arrived);
          // Persist so the NEXT visit's first paint already gates the Unpaid
          // icon — same seed-then-refresh trick the voucher list cache uses.
          setItem(arrivedItemsKey, [...arrived]);
        }
      } catch (err) {
        console.error("Failed to load the received items:", err);
        // On failure keep whatever we have (cache seed or previous result) —
        // wiping to empty would ENABLE the Unpaid icon as the safe state.
      }
    })();
    return () => {
      active = false;
    };
  }, [allLinkedItemIds, arrivalRefreshKey]);

  const fetchVouchers = useCallback(
    async ({ silent = false, bustCache = false } = {}) => {
      if (bustCache) removeItem(storageKey);

      if (!silent) setItemsLoading(true);
      try {
        const res = await VoucherAPI.getVouchers();
        const data = Array.isArray(res) ? res : res.data || [];
        setVouchers(data);
        setItem(storageKey, data);
        fetchOptionStatuses(data);
      } catch (err) {
        console.error("Failed to fetch vouchers:", err);
      } finally {
        if (!silent) setItemsLoading(false);
      }
    },
    [storageKey, fetchOptionStatuses],
  );

  const fetchRef = useRef(fetchVouchers);
  useEffect(() => {
    fetchRef.current = fetchVouchers;
  }, [fetchVouchers]);

  // Initial load — cache hit → silent refresh (no skeleton);
  // miss → visible load. Runs exactly once per visit.
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (mappingLoading || initialLoadRef.current) return;
    initialLoadRef.current = true;
    if (hasItem(storageKey)) {
      fetchRef.current({ silent: true });
    } else {
      fetchVouchers();
    }
  }, [mappingLoading, fetchVouchers, storageKey]);

  useEffect(() => {
    const onUpdated = () => fetchRef.current({ silent: true });
    const onDeleted = (e) => {
      const id = e.detail?.voucherId;
      if (id)
        setVouchers((prev) => {
          const next = prev.filter((v) => v.nVoucherId !== id);
          setItem(storageKey, next);
          return next;
        });
      else fetchRef.current({ silent: true });
    };
    window.addEventListener("voucher_data_updated", onUpdated);
    window.addEventListener("voucher_data_deleted", onDeleted);
    // A purchase-option change lands from the other screens too — an APPROVED
    // price change (Transactions' price-change modal) re-prices the lines the
    // voucher list totals, so the snapshot cannot keep the old price.
    window.addEventListener("purchase_option_data_updated", onUpdated);
    return () => {
      window.removeEventListener("voucher_data_updated", onUpdated);
      window.removeEventListener("voucher_data_deleted", onDeleted);
      window.removeEventListener("purchase_option_data_updated", onUpdated);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (code) {
        setSelectedStatusCode(code);
        setPage(0);
      }
    };
    window.addEventListener("voucher_status_changed", handler);
    return () => window.removeEventListener("voucher_status_changed", handler);
  }, []);

  const filteredVouchers = useMemo(() => {
    let result = selectedStatusCode
      ? vouchers.filter((v) => String(v.cStatus) === String(selectedStatusCode))
      : vouchers;

    const isAssignedToUser = (v) =>
      String(v.nAssignedUserId) === String(currentUserId);

    if (isManagement || isFinanceOfficer) {
      if (typeFilter === "assignee") {
        result = result.filter(
          (v) => String(v.cType) === String(voucherAssigneeTypeKey),
        );
      } else if (typeFilter === "supplier") {
        result = result.filter(
          (v) => String(v.cType) !== String(voucherAssigneeTypeKey),
        );
      }
    } else {
      result = result.filter(isAssignedToUser);
      if (isAOTL) {
        result = result.filter(
          (v) => String(v.cType) !== String(voucherAssigneeTypeKey),
        );
      }
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;

    return result.filter((v) => {
      const poNos = (v.voucher_suppliers || [])
        .map((s) => s.purchase_order?.strPurchaseOrderNo ?? "")
        .join(" ")
        .toLowerCase();
      return (
        v.strNumber?.toLowerCase().includes(q) ||
        v.supplier?.strSupplierNickName?.toLowerCase().includes(q) ||
        v.assignee?.strNickName?.toLowerCase().includes(q) ||
        poNos.includes(q)
      );
    });
  }, [
    vouchers,
    selectedStatusCode,
    search,
    typeFilter,
    voucherAssigneeTypeKey,
    isAOTL,
    isManagement,
    isFinanceOfficer,
    currentUserId,
  ]);

  const tableRows = useMemo(
    () =>
      filteredVouchers.map((v) => {
        const isAssigneeType =
          String(v.cType) === String(voucherAssigneeTypeKey);
        const firstAssignee = v.voucher_assignees?.[0];

        // ✅ Empty strings (not "—") so the table can detect missing values
        //    and render the shared fallback placeholders
        const displayName = isAssigneeType
          ? (firstAssignee?.assignee?.strAssigneeNickName ?? "")
          : (v.supplier?.strSupplierNickName ?? "");

        const displayTIN = isAssigneeType
          ? (firstAssignee?.assignee?.strTIN ?? "")
          : (v.supplier?.strTIN ?? "");

        const displayAddress = isAssigneeType
          ? (firstAssignee?.assignee?.strAddress ?? "")
          : (v.supplier?.strAddress ?? "");

        const supplierLinks = v.voucher_suppliers ?? [];
        const voucherTypeLabel = isAssigneeType ? "Assignee" : "Supplier";
        // The AO (account officer) of the linked PO's transaction — used by
        // the AO column in the voucher list.
        const aoNickname = v.nAssignedUserId
          ? aoNicknameMap[v.nAssignedUserId] || ""
          : "";
        // Some linked item already arrived and was received — the receipts
        // and the journal behind them are posted, so a Paid voucher cannot
        // be unpaid anymore. Read from the bulk inventory history (the same
        // check the update page and the API's guard run), not the PO's
        // current status letter.
        const isReceived = isAssigneeType
          ? false
          : supplierLinks.some((link) =>
              (link.purchase_order?.purchase_order_options ?? []).some(
                (opt) => {
                  const id = opt?.purchase_option?.nPurchaseItemId;
                  return id ? arrivedItemIds.has(String(id)) : false;
                },
              ),
            );
        // The voucher's TOTAL amount (the gross) — the same figure the update
        // page shows as the particulars grand total. NOT the net of EWT.
        // Supplier vouchers: Σ QTY × dUnitPrice over the linked POs' lines;
        // assignee vouchers: Σ particular amount × qty.
        const amount = isAssigneeType
          ? (v.voucher_assignees ?? []).reduce(
              (sum, a) =>
                sum + Number(a.dAmount || 0) * Number(a.nQuantity || 1),
              0,
            )
          : supplierLinks.reduce((sum, link) => {
              const opts = link.purchase_order?.purchase_order_options ?? [];
              return opts.reduce((s, opt) => {
                const p = opt?.purchase_option;
                return s + Number(p?.nQuantity || 0) * Number(p?.dUnitPrice || 0);
              }, sum);
            }, 0);
        // The EWT on the same lines — supplier vouchers derive it per line
        // (see utils/helpers/calculateEWT.js), assignee vouchers sum their
        // particulars' own dEWT.
        const ewt = isAssigneeType
          ? (v.voucher_assignees ?? []).reduce(
              (sum, a) => sum + (Number(a.dEWT) || 0),
              0,
            )
          : supplierLinks.reduce((sum, link) => {
              const opts = link.purchase_order?.purchase_order_options ?? [];
              return sum + totalEWT(opts);
            }, 0);
        // The freight rides on the POs themselves — assignee vouchers carry
        // no POs and so no freight.
        const freight = supplierLinks.reduce(
          (sum, link) => sum + Number(link.purchase_order?.dFreight || 0),
          0,
        );

        // ✅ REPLACED: Use cStatus instead of bIsPaid
        let isPaid;
        if (isAssigneeType) {
          isPaid = String(v.cStatus) === String(voucherPaidKey);
        } else {
          const linkedOptionIds = supplierLinks
            .flatMap((vs) => vs.purchase_order?.purchase_order_options ?? [])
            .map((o) => o.purchase_option?.nPurchaseItemId)
            .filter(Boolean);

          const isUnpaid = linkedOptionIds.some((id) => {
            const status = String(optionStatuses[Number(id)] ?? "");
            return (
              status === String(addToCartKey) ||
              status === String(purchaseOrderKey)
            );
          });
          isPaid = linkedOptionIds.length > 0 && !isUnpaid;
        }

        // Payment gates — replicated from the update page's footer buttons
        // (VoucherUpdateView's showMarkPaid / showMarkUnpaid) so the list's
        // pay icon enables/disables on exactly the same vouchers:
        //   Mark as Paid   → Closed + a JEV exists + it is finalized
        //                     (cStatus ≠ pending) + Finance Officer / Mgmt
        //   Mark as Unpaid → Paid + a JEV exists + finalized + nothing
        //                     received/delivered yet
        const isClosedVoucher = String(v.cStatus) === String(voucherClosedKey);
        const isPaidVoucher = String(v.cStatus) === String(voucherPaidKey);
        const hasFinalizedJev =
          Boolean(v.nJEVId) &&
          String(v.jev?.cStatus ?? "") !== String(jevPendingKey);
        const canMarkPaid =
          isClosedVoucher &&
          hasFinalizedJev &&
          (isManagement || isFinanceOfficer);
        const canMarkUnpaid =
          isPaidVoucher && hasFinalizedJev && !isReceived;
        // Why the pay icon is off — printed in the icon's tooltip.
        const payBlockedReason =
          canMarkPaid || canMarkUnpaid
            ? null
            : isClosedVoucher
              ? hasFinalizedJev
                ? "for Finance Officers / Management only"
                : "needs a finalized JEV"
              : hasFinalizedJev
                ? "items already received or delivered"
                : "needs a finalized JEV";

        return {
          _raw: v,
          id: v.nVoucherId,
          strNumber: v.strNumber ?? "",
          displayName,
          displayTIN,
          displayAddress,
          dtCreated: fmtDateTime(v.dtCreated),
          // Who created the voucher — "BY: <nickname>" over the date in the
          // Created column (tblvouchers.nUserId → tblusers.strNickName,
          // shipped by the API as strCreatedBy). A dash from the API (or a
          // null for a pre-column row) means "no creator" — blank so the
          // view can print the NO_CREATOR placeholder.
          strCreatedByName:
            v.strCreatedBy && v.strCreatedBy !== "—" ? v.strCreatedBy : "",
          poCount: supplierLinks.length,
          isAssigneeType,
          voucherTypeLabel,
          isPaid,
          isReceived,
          canMarkPaid,
          canMarkUnpaid,
          payBlockedReason,
          aoNickname,
          amount,
          ewt,
          freight,
          // The voucher's own status letter — the JEV-progress hint under
          // the payee name only prints on Closed vouchers.
          cStatus: v.cStatus ?? "",
          // Where the voucher stands in the JEV pipeline, computed by the
          // API (strJevStage): no-jev | no-entries | unbalanced |
          // pending-finalize | pending-paid.
          jevStage: v.strJevStage ?? null,
        };
      }),
    [
      filteredVouchers,
      voucherAssigneeTypeKey,
      voucherPaidKey, // ✅ ADDED to deps
      optionStatuses,
      arrivedItemIds,
      addToCartKey,
      purchaseOrderKey,
      aoNicknameMap,
      jevPendingKey,
      voucherClosedKey,
      isManagement,
      isFinanceOfficer,
    ],
  );

  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const accountPath = (account) => {
    const names = [];
    let cur = account;
    let guard = 0;
    while (cur && guard < 10) {
      names.unshift(cur.display_name || cur.strAccountName || "");
      cur = cur.parent ?? null;
      guard++;
    }
    return names.join(" / ");
  };

  const jevToIsInventory = (v) => {
    const entries = v?.jev?.jev_entries ?? [];
    return entries
      .filter((e) => Number(e.dAmount) >= 0)
      .some((e) =>
        accountPath(e.journal_account)
          .trim()
          .toLowerCase()
          .startsWith("inventories"),
      );
  };

  const handleConfirmMark = async () => {
    if (!confirmRow || !confirmAction) return;
    const row = confirmRow;
    const action = confirmAction;
    setConfirmAction(null);
    setConfirmRow(null);
    setConfirmLoading(true);
    try {
      await withSpinner("Voucher", async () => {
        const v = row._raw;
        const isAssigneeType = Number(v?.nTypeId) === Number(voucherAssigneeTypeKey);
        const supplierLinks = v?.voucher_suppliers ?? [];

        if (action === "paid") {
          const insertInventory = !isAssigneeType && jevToIsInventory(v);
          if (isAssigneeType) {
            await VoucherAPI.updateVoucherStatus(row.id, voucherPaidKey);
          } else {
            await Promise.all([
              PurchaseOrderAPI.updateCartStatusBulk({
                nPurchaseOrderIds: supplierLinks.map((vs) => vs.nPurchaseOrderId),
                nStatus: insertInventory ? forDeliveryKey : pendingReceiptKey,
                nUserId: currentUserId,
              }),
              VoucherAPI.updateVoucherStatus(row.id, voucherPaidKey, {
                insertInventory,
              }),
            ]);
          }
        } else if (action === "unpaid") {
          if (isAssigneeType) {
            await VoucherAPI.updateVoucherStatus(row.id, voucherClosedKey);
          } else {
            await VoucherAPI.updateVoucherStatus(row.id, voucherClosedKey, {
              removeInventory: true,
            });
            await PurchaseOrderAPI.updateCartStatusBulk({
              nPurchaseOrderIds: supplierLinks.map((vs) => vs.nPurchaseOrderId),
              nStatus: forPaymentKey,
              nUserId: currentUserId,
            });
          }
        }
      });

      await fetchVouchers({ silent: true });
      window.dispatchEvent(new CustomEvent("voucher_data_updated"));
    } catch (err) {
      console.error(`Failed to update voucher status to ${action}:`, err);
    } finally {
      setConfirmLoading(false);
    }
  };

  return {
    itemsLoading,
    search,
    setSearch,
    typeFilter,

    voucherModalOpen,
    page,
    rowsPerPage,
    selectedStatusCode,

    isAOTL,
    isManagement,
    isFinanceOfficer,
    currentUserId,
    voucherStatus,
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey, // ✅ ADDED to return
    voucherCancelledKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,
    closeCartKey,
    cancelCartKey,
    cancelledPOKey,
    forPurchaseKey,
    paidKey,
    forDeliveryKey,
    pendingReceiptKey,
    forPaymentKey,
    deliveredKey,
    chequeKey,
    jevDisbursementVoucherKey,
    tableRows,
    handleViewClick,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleTypeFilterChange,
    fetchVouchers,
    setVoucherModalOpen,
    paymentTerms,
    confirmAction,
    setConfirmAction,
    confirmRow,
    setConfirmRow,
    confirmLoading,
    handleConfirmMark,
  };
}
