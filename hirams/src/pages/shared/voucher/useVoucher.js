import { useCallback, useEffect, useState, useMemo, useRef } from "react";import { useNavigate } from "react-router-dom";
import PurchaseOrderAPI from "../../../api/endpoints/purchase-order.api.js";
import VoucherAPI from "../../../api/endpoints/voucher.api.js";
import { totalEWT } from "../../../utils/helpers/calculateEWT.js";
import { fmtDateTime } from "../../../utils/helpers/timeZone";
import {
  getItem,
  setItem,
  removeItem,
  hasItem,
} from "../../../utils/storage/localStorage.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

export default function useVoucher() {
  const navigate = useNavigate();
  // Seeded from cache — instant render on revisit, silent refresh follows.
  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;
  const storageKey = `voucher_list_${currentUserId}`;
  const optionStatusesKey = `voucher_option_statuses_${currentUserId}`;

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
  const {
    voucherStatus,
    userTypes,
    paymentTerms,
    loading: mappingLoading,

    jevDisbursementVoucherKey,
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
    receivedKey,
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
      addToCartKey,
      purchaseOrderKey,
    ],
  );

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
    receivedKey,
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
  };
}
