import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import SupplierAPI from "../../../api/endpoints/supplier.api.js";
import { getItem, setItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
const SESSION_KEY = "selectedSupplierStatusCode";
const DEBOUNCE_MS = 300;

function formatSupplier(supplier, { vat, ewt }) {
  return {
    nSupplierId: supplier.nSupplierId,
    supplierName: supplier.strSupplierName,
    supplierNickName: supplier.strSupplierNickName,
    supplierTIN: supplier.strTIN,
    address: supplier.strAddress,
    vat: vat?.[supplier.bVAT],
    vatActive: Number(supplier.bVAT) === 1,
    ewt: ewt?.[supplier.bEWT],
    ewtActive: Number(supplier.bEWT) === 1,
    statusCode: supplier.cStatus,
    // How many purchase options still name this supplier — a supplier that
    // carries any cannot be deleted, it has to be transferred instead.
    optionsCount: Number(supplier.purchase_options_count ?? 0),
  };
}
export default function useSupplier() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [openModal, setOpenModal] = useState(false);
  const [openContactModal, setOpenContactModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetched, setIsFetched] = useState(false); // ✅ Track if already loaded

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );

  const {
    //Mappings
    vat,
    ewt,
    clientstatus,
    userTypes,
    loading: mappingLoading,
    //Keys
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    //Labels
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    vatLabel,
    ewtLabel,
    isManagement,
    isFinanceOfficer,
    isAccountOfficer,
  } = useKeysLabels();
  const location = useLocation();

  // Derive status keys
  const statusKeys = useMemo(() => {
    const keys = Object.keys(clientstatus || {});
    return {
      activeStatusKey: keys[0] ?? "",
      inactiveStatusKey: keys[1] ?? "",
      forApprovalStatusKey: keys[2] ?? "",
      activeStatusLabel: clientstatus[keys[0]] ?? "",
      inactiveStatusLabel: clientstatus[keys[1]] ?? "",
      forApprovalStatusLabel: clientstatus[keys[2]] ?? "",
      vatLabel: vat[Object.keys(vat)[1]] || "",
      ewtLabel: ewt[Object.keys(ewt)[1]] || "",
    };
  }, [clientstatus, vat, ewt]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Init status
  useEffect(() => {
    if (!mappingLoading && activeStatusKey && !getItem(SESSION_KEY)) {
      setSelectedStatusCode(activeStatusKey);
      setItem(SESSION_KEY, activeStatusKey);
    }
  }, [mappingLoading, activeStatusKey]);

  // Sync status from sidebar
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setSelectedStatusCode(code);
      setItem(SESSION_KEY, code);
      setPage(0);
    };
    window.addEventListener("supplier_status_changed", handler);
    return () => window.removeEventListener("supplier_status_changed", handler);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [selectedStatusCode]);

  // Query param ?add=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("add") === "true") setOpenModal(true);
  }, [location.search]);

  /**
   * Fetch suppliers — ONCE on load, silent refresh afterward
   * @param {boolean} force - bypass isFetched check
   * @param {boolean} silent - skip loading indicator flash
   */
  const fetchSuppliers = useCallback(
    async (force = false, silent = false) => {
      if (!force && isFetched) return; // ✅ Skip if already loaded
      if (mappingLoading) return;

      if (!silent) setLoading(true); // ✅ Only show loading on FIRST load

      try {
        const response = await SupplierAPI.getSuppliers();
        const raw = response.suppliers ?? [];
        sessionStorage.removeItem("suppliers_cache"); // key used by the canvas & purchase hooks
        setSuppliers(raw.map((s) => formatSupplier(s, { vat, ewt })));
        setIsFetched(true); // ✅ Mark as loaded
      } catch (err) {
        console.error("Error fetching suppliers:", err);
      } finally {
        if (!silent) setLoading(false); // ✅ Keep table visible during sync
      }
    },
    [mappingLoading, vat, ewt, isFetched],
  );

  const fetchSuppliersRef = useRef(fetchSuppliers);
  useEffect(() => {
    fetchSuppliersRef.current = fetchSuppliers;
  }, [fetchSuppliers]);

  // Always bypasses the isFetched guard
  const refreshSuppliers = useCallback(
    () => fetchSuppliersRef.current?.(true, true),
    [],
  );
  // Initial fetch — runs ONLY once when mappings are ready
  useEffect(() => {
    if (!isFetched && !mappingLoading) {
      fetchSuppliers();
    }
  }, [fetchSuppliers, isFetched, mappingLoading]);

  // ✅ Real-time sync — SILENT refresh (no loading flash)
  useEffect(() => {
    const onUpdated = () => {
      fetchSuppliersRef.current?.(true, true); // force=true, silent=true
    };
    const onDeleted = (e) =>
      setSuppliers((prev) =>
        prev.filter((s) => s.nSupplierId !== e.detail?.supplierId),
      );
    window.addEventListener("supplier_data_updated", onUpdated);
    window.addEventListener("supplier_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("supplier_data_updated", onUpdated);
      window.removeEventListener("supplier_data_deleted", onDeleted);
    };
  }, []);

  // ✅ Client-side search + filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (selectedStatusCode && supplier.statusCode !== selectedStatusCode)
        return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        supplier.supplierName?.toLowerCase().includes(q) ||
        supplier.supplierNickName?.toLowerCase().includes(q) ||
        supplier.supplierTIN?.toLowerCase().includes(q) ||
        supplier.address?.toLowerCase().includes(q)
      );
    });
  }, [suppliers, selectedStatusCode, debouncedSearch]);

  // Notify sidebar
  const notifySidebar = useCallback((code) => {
    setItem(SESSION_KEY, code);
    setSelectedStatusCode(code);
    window.dispatchEvent(
      new CustomEvent("supplier_status_changed", { detail: { code } }),
    );
  }, []);

  // Update status + SILENT refresh after save
  const updateSupplierStatus = useCallback(
    async (status) => {
      if (!selectedSupplier) return;
      await SupplierAPI.updateStatus(selectedSupplier.nSupplierId, {
        statusCode: status,
      });
      await fetchSuppliersRef.current?.(true, true); // ✅ Silent refresh
    },
    [selectedSupplier],
  );

  // Modal handlers
  const handleAddClick = useCallback(() => {
    setSelectedSupplier(null);
    setOpenModal(true);
  }, []);
  const handleEditClick = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setOpenModal(true);
  }, []);
  const handleInfoClick = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setOpenInfoModal(true);
  }, []);
  const handleDeleteClick = useCallback((supplier) => {
    setEntityToDelete({
      type: "supplier",
      data: { id: supplier.nSupplierId, supplierName: supplier.supplierName },
    });
    setOpenDeleteModal(true);
  }, []);
  const handleContactsClick = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setOpenContactModal(true);
  }, []);
  const handleBankClick = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setOpenBankModal(true);
  }, []);
  // Transfer — the stand-in for Delete on a supplier that still carries
  // purchase options: the modal moves them to another active supplier.
  const handleTransferClick = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setOpenTransferModal(true);
  }, []);
  const handleCloseTransferModal = useCallback(() => {
    setOpenTransferModal(false);
    setSelectedSupplier(null);
  }, []);
  // The move itself — the modal only picks the destination and the options.
  // The source id travels WITH the call, so the modal can close itself
  // (and drop the selection) before the request is even sent.
  const handleTransferOptions = useCallback(
    async (sourceSupplierId, targetSupplierId, optionIds) => {
      if (!sourceSupplierId) return;
      await SupplierAPI.transferOptions(sourceSupplierId, {
        nTargetSupplierId: targetSupplierId,
        optionIds,
      });
      await fetchSuppliersRef.current?.(true, true); // ✅ Silent refresh
    },
    [],
  );
  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setSelectedSupplier(null);
  }, []);
  const handleCloseContactModal = useCallback(
    () => setOpenContactModal(false),
    [],
  );
  const handleCloseBankModal = useCallback(() => setOpenBankModal(false), []);
  const handleCloseInfoModal = useCallback(() => setOpenInfoModal(false), []);
  const handleCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setEntityToDelete(null);
  }, []);

  // Pagination
  const handlePageChange = useCallback((_, p) => setPage(p), []);
  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  // Info modal actions
  const handleApprove = useCallback(async () => {
    await updateSupplierStatus(activeStatusKey);
    notifySidebar(activeStatusKey);
  }, [updateSupplierStatus, activeStatusKey, notifySidebar]);
  const handleActivate = useCallback(async () => {
    await updateSupplierStatus(activeStatusKey);
    notifySidebar(activeStatusKey);
  }, [updateSupplierStatus, activeStatusKey, notifySidebar]);
  const handleDeactivate = useCallback(async () => {
    await updateSupplierStatus(inactiveStatusKey);
    notifySidebar(inactiveStatusKey);
  }, [updateSupplierStatus, inactiveStatusKey, notifySidebar]);
  const handleRedirect = useCallback(
    (label) => {
      const code = Object.keys(clientstatus).find(
        (k) => clientstatus[k] === label,
      );
      if (code) notifySidebar(code);
    },
    [clientstatus, notifySidebar],
  );

  // Delete success
  const handleDeleteSuccess = useCallback(() => {
    if (!entityToDelete?.data) return;
    setSuppliers((prev) =>
      prev.filter((s) => s.nSupplierId !== entityToDelete.data.id),
    );
  }, [entityToDelete]);

  // Row click
  const handleRowClick = useCallback(
    (supplier) => {
      supplier.statusCode === activeStatusKey
        ? handleEditClick(supplier)
        : handleInfoClick(supplier);
    },
    [activeStatusKey, handleEditClick, handleInfoClick],
  );

  return {
    // State
    search,
    setSearch,
    page,
    rowsPerPage,
    openModal,
    openContactModal,
    openBankModal,
    openInfoModal,
    openDeleteModal,
    openTransferModal,
    selectedSupplier,
    entityToDelete,
    suppliers: filteredSuppliers,
    loading,
    selectedStatusCode,
    clientstatus,
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    vatLabel,
    ewtLabel,
    isManagement,
    isFinanceOfficer,
    isAccountOfficer,

    // Actions
    fetchSuppliers: refreshSuppliers,
    handleAddClick,
    handleEditClick,
    handleInfoClick,
    handleDeleteClick,
    handleContactsClick,
    handleBankClick,
    handleTransferClick,
    handleCloseModal,
    handleCloseContactModal,
    handleCloseBankModal,
    handleCloseInfoModal,
    handleCloseDeleteModal,
    handleCloseTransferModal,
    handleTransferOptions,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleApprove,
    handleActivate,
    handleDeactivate,
    handleRedirect,
    handleDeleteSuccess,
  };
}
