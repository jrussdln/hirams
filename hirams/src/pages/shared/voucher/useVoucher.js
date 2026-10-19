import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PurchaseOrderAPI from "../../../api/endpoints/purchase-order.api.js";
import VoucherAPI from "../../../api/endpoints/voucher.api.js";
import { fmtDateTime } from "../../../utils/helpers/timeZone";
import {
  getItem,
  setItem,
  removeItem,
} from "../../../utils/storage/localStorage.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

export default function useVoucher() {
  const navigate = useNavigate();
  const [itemsLoading, setItemsLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [optionStatuses, setOptionStatuses] = useState({});

  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;
  const storageKey = `voucher_list_${currentUserId}`;
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
    } catch (err) {
      console.error("fetchOptionStatuses error:", err);
    }
  }, []);

  const fetchVouchers = useCallback(
    async ({ silent = false, bustCache = false } = {}) => {
      if (bustCache) removeItem(storageKey);

      if (!silent && !bustCache) {
        const stored = getItem(storageKey);
        if (stored) {
          setVouchers(stored);
          fetchVouchers({ silent: true });
          return;
        }
      }

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

  useEffect(() => {
    if (!mappingLoading) fetchVouchers();
  }, [mappingLoading, fetchVouchers]);

  useEffect(() => {
    const onUpdated = () => fetchRef.current({ silent: true });
    const onDeleted = (e) => {
      const id = e.detail?.voucherId;
      if (id) setVouchers((prev) => prev.filter((v) => v.nVoucherId !== id));
      else fetchRef.current({ silent: true });
    };
    window.addEventListener("voucher_data_updated", onUpdated);
    window.addEventListener("voucher_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("voucher_data_updated", onUpdated);
      window.removeEventListener("voucher_data_deleted", onDeleted);
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
          poCount: supplierLinks.length,
          isAssigneeType,
          voucherTypeLabel,
          isPaid,
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
