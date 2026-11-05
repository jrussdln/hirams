import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import SupplierContactAPI from "../../../../../api/endpoints/supplier-contact.api.js";
import { withSpinner, showSwal } from "../../../../../utils/helpers/swal.jsx";
import uiMessages from "../../../../../utils/helpers/uiMessages";
import { getItem, setItem, hasItem } from "../../../../../utils/storage/localStorage";

export default function useSupplierContact() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const supplierId = searchParams.get("id");

  const [supplier, setSupplier] = useState(location.state?.supplier || null);
  const contactsCacheKey = supplierId
    ? `supplier_contacts_${supplierId}`
    : null;
  const [contacts, setContacts] = useState(() =>
    contactsCacheKey ? getItem(contactsCacheKey, []) : [],
  );
  const [loading, setLoading] = useState(() =>
    contactsCacheKey ? !hasItem(contactsCacheKey) : false,
  );
  const [isFetched, setIsFetched] = useState(() =>
    contactsCacheKey ? hasItem(contactsCacheKey) : false,
  );

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);

  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const handleCloseToast = () =>
    setToast({ open: false, message: "", severity: "success" });

  const fetchContacts = useCallback(
    async (force = false, silent = false) => {
      if (!supplierId) return;
      if (!force && !silent && isFetched) return;
      if (silent) {
        try {
          const res = await SupplierContactAPI.getBySupplier(supplierId);
          const list = Array.isArray(res) ? res : res?.contacts || res?.data || [];
          setContacts(list);
          setItem(`supplier_contacts_${supplierId}`, list);
          setIsFetched(true);
          if (list.length && list[0]?.supplier) setSupplier(list[0].supplier);
        } catch {
          showToast("Failed to load contacts.", "error");
        }
        return;
      }
      if (force && isFetched) setContacts([]);
      setLoading(true);
      try {
        const res = await SupplierContactAPI.getBySupplier(supplierId);
        const list = Array.isArray(res) ? res : res?.contacts || res?.data || [];
        setContacts(list);
        setItem(`supplier_contacts_${supplierId}`, list);
        setIsFetched(true);
        if (list.length && list[0]?.supplier) setSupplier(list[0].supplier);
      } catch {
        showToast("Failed to load contacts.", "error");
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
    if (hasItem(`supplier_contacts_${supplierId}`)) {
      fetchContacts(true, true); // cache hit — silent refresh, no skeleton
    } else {
      fetchContacts();
    }
  }, [supplierId, fetchContacts]);

  useEffect(() => {
    if (!supplierId) return;
    if (supplier) return;
    // Fallback when opened directly (no navigation state): resolve the
    // supplier's nickname from the full list.
    import("../../../../../api/endpoints/supplier.api.js").then(({ default: SupplierAPI }) => {
      SupplierAPI.getSuppliers().then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.suppliers || [];
        const found = list.find((s) => String(s.nSupplierId) === String(supplierId));
        if (found) setSupplier(found);
      }).catch(() => {});
    });
  }, [supplierId, supplier]);

  const handleAdd = useCallback(() => {
    setSelectedContact(null);
    setContactModalOpen(true);
  }, []);

  const handleEdit = useCallback((contact) => {
    setSelectedContact(contact);
    setContactModalOpen(true);
  }, []);

  const handleDelete = useCallback((contact) => {
    setEntityToDelete({ type: "supplier-contact", data: { ...contact, id: contact.nSupplierContactId } });
    setDeleteModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setContactModalOpen(false);
    setSelectedContact(null);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setEntityToDelete(null);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    const removedId = entityToDelete?.data?.nSupplierContactId;
    if (!removedId) return;
    setContacts((prev) => {
      const next = prev.filter((c) => c.nSupplierContactId !== removedId);
      if (supplierId) setItem(`supplier_contacts_${supplierId}`, next);
      return next;
    });
    handleCloseDelete();
  }, [entityToDelete, supplierId]);

  const handleBack = useCallback(() => navigate("/supplier"), [navigate]);

  return {
    supplierId,
    supplier,
    contacts,
    loading,
    contactModalOpen,
    selectedContact,
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
    fetchContacts,
  };
}
