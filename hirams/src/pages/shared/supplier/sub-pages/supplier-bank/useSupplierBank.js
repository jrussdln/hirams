import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import SupplierBankAPI from "../../../../../api/endpoints/supplier-bank.api.js";
import { withSpinner, showSwal } from "../../../../../utils/helpers/swal.jsx";
import { getItem, setItem, hasItem } from "../../../../../utils/storage/localStorage";

export default function useSupplierBank() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const supplierId = searchParams.get("id");

  const [supplier, setSupplier] = useState(location.state?.supplier || null);
  const banksCacheKey = supplierId ? `supplier_banks_${supplierId}` : null;
  const [banks, setBanks] = useState(() =>
    banksCacheKey ? getItem(banksCacheKey, []) : [],
  );
  const [loading, setLoading] = useState(() =>
    banksCacheKey ? !hasItem(banksCacheKey) : false,
  );
  const [isFetched, setIsFetched] = useState(() =>
    banksCacheKey ? hasItem(banksCacheKey) : false,
  );

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);

  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const handleCloseToast = () =>
    setToast({ open: false, message: "", severity: "success" });

  const fetchBanks = useCallback(
    async (force = false, silent = false) => {
      if (!supplierId) return;
      if (!force && !silent && isFetched) return;
      if (silent) {
        try {
          const res = await SupplierBankAPI.getBySupplier(supplierId);
          const list = Array.isArray(res) ? res : res?.banks || res?.data || [];
          setBanks(list);
          setItem(`supplier_banks_${supplierId}`, list);
          setIsFetched(true);
        } catch {
          showToast("Failed to load banks.", "error");
        }
        return;
      }
      if (force && isFetched) setBanks([]);
      setLoading(true);
      try {
        const res = await SupplierBankAPI.getBySupplier(supplierId);
        const list = Array.isArray(res) ? res : res?.banks || res?.data || [];
        setBanks(list);
        setItem(`supplier_banks_${supplierId}`, list);
        setIsFetched(true);
      } catch {
        showToast("Failed to load banks.", "error");
      } finally {
        setLoading(false);
      }
    },
    [supplierId, isFetched],
  );

  const loadedForRef = useRef(null);
  useEffect(() => {
    if (!supplierId || loadedForRef.current === supplierId) return;
    loadedForRef.current = supplierId;
    if (hasItem(`supplier_banks_${supplierId}`)) {
      fetchBanks(true, true); // cache hit — silent refresh, no skeleton
    } else {
      fetchBanks();
    }
  }, [supplierId, fetchBanks]);

  useEffect(() => {
    if (!supplierId) return;
    if (supplier) return;
    import("../../../../../api/endpoints/supplier.api.js").then(({ default: SupplierAPI }) => {
      SupplierAPI.getSuppliers().then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.suppliers || [];
        const found = list.find((s) => String(s.nSupplierId) === String(supplierId));
        if (found) setSupplier(found);
      }).catch(() => {});
    });
  }, [supplierId, supplier]);

  const handleAdd = useCallback(() => {
    setSelectedBank(null);
    setBankModalOpen(true);
  }, []);

  const handleEdit = useCallback((bank) => {
    setSelectedBank(bank);
    setBankModalOpen(true);
  }, []);

  const handleDelete = useCallback((bank) => {
    setEntityToDelete({ type: "supplier-bank", data: { ...bank, id: bank.nSupplierBankId } });
    setDeleteModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setBankModalOpen(false);
    setSelectedBank(null);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setEntityToDelete(null);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    const removedId = entityToDelete?.data?.nSupplierBankId;
    if (!removedId) return;
    setBanks((prev) => {
      const next = prev.filter((b) => b.nSupplierBankId !== removedId);
      if (supplierId) setItem(`supplier_banks_${supplierId}`, next);
      return next;
    });
    handleCloseDelete();
  }, [entityToDelete, supplierId]);

  const handleBack = useCallback(() => navigate("/supplier"), [navigate]);

  return {
    supplierId,
    banks,
    loading,
    bankModalOpen,
    selectedBank,
    deleteModalOpen,
    entityToDelete,
    toast,
    handleAdd,
    handleEdit,
    handleDelete,
    handleCloseModal,
    handleCloseDelete,
    handleDeleteSuccess,
    handleBack,
    handleCloseToast,
    fetchBanks,
  };
}
