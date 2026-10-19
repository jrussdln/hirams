import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ClientAPI from "../../../api/endpoints/client.api.js";
import { getItem, setItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

const SESSION_KEY = "selectedClientStatusCode";

function formatClient(c) {
  return {
    id: c.nClientId,
    name: c.strClientName,
    nickname: c.strClientNickName,
    tin: c.strTIN,
    address: c.strAddress,
    businessStyle: c.strBusinessStyle,
    contactPerson: c.strContactPerson,
    contactNumber: c.strContactNumber,
    statusCode: c.cStatus,
  };
}

export default function useClient() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetched, setIsFetched] = useState(false); // ✅ Track if already loaded
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [selectedClient, setSelectedClient] = useState(null);
  const [openAEModal, setOpenAEModal] = useState(false);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );
  const {
    //Mappings
    userTypes,
    clientstatus,
    loading: mappingLoading,
    //Keys
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    //Labels
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,

    isManagement,
  } = useKeysLabels();

  // Init default status
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
    window.addEventListener("client_status_changed", handler);
    return () => window.removeEventListener("client_status_changed", handler);
  }, []);

  // Query param ?add=true + cleanup
  useEffect(() => {
    if (searchParams.get("add") !== "true") return;
    setSelectedClient(null);
    setOpenAEModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const fetchClients = useCallback(
    async (force = false, silent = false) => {
      if (!force && isFetched) return; // ✅ Skip if already loaded
      if (mappingLoading) return;

      if (!silent) setLoading(true); // ✅ Only show loading on FIRST load

      try {
        const result = await ClientAPI.getClients();
        setAllClients((result.clients ?? []).map(formatClient));
        setIsFetched(true); // ✅ Mark as loaded
      } catch (err) {
        console.error("Error fetching clients:", err);
      } finally {
        if (!silent) setLoading(false); // ✅ Keep table visible during sync
      }
    },
    [mappingLoading, isFetched],
  );

  // Keep stable reference for event listeners
  const fetchClientsRef = useRef(fetchClients);
  useEffect(() => {
    fetchClientsRef.current = fetchClients;
  }, [fetchClients]);

  // Initial fetch — runs ONLY once when mappings ready
  useEffect(() => {
    if (!isFetched && !mappingLoading) {
      fetchClients();
    }
  }, [fetchClients, isFetched, mappingLoading]);

  // ✅ Real-time sync — SILENT refresh (no loading flash)
  useEffect(() => {
    const onUpdated = () => {
      fetchClientsRef.current?.(true, true); // force=true, silent=true
    };

    const onDeleted = (e) => {
      const clientId = e.detail?.clientId;
      if (!clientId) return;
      setAllClients((prev) => prev.filter((c) => c.id !== clientId));
    };

    window.addEventListener("client_data_updated", onUpdated);
    window.addEventListener("client_data_deleted", onDeleted);

    return () => {
      window.removeEventListener("client_data_updated", onUpdated);
      window.removeEventListener("client_data_deleted", onDeleted);
    };
  }, []);

  // ✅ Client-side search + filtering
  const filteredClients = useMemo(() => {
    let result = selectedStatusCode
      ? allClients.filter((c) => c.statusCode === selectedStatusCode)
      : allClients;
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.nickname?.toLowerCase().includes(q) ||
        c.tin?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.businessStyle?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.contactNumber?.toLowerCase().includes(q),
    );
  }, [allClients, selectedStatusCode, search]);

  // Update status + SILENT refresh after save
  const updateClientStatus = useCallback(
    async (status) => {
      if (!selectedClient) return;
      await ClientAPI.updateStatus(selectedClient.id, { cStatus: status });
      await fetchClientsRef.current?.(true, true); // ✅ Silent refresh
    },
    [selectedClient],
  );

  // Notify sidebar
  const notifySidebar = useCallback((code) => {
    setItem(SESSION_KEY, code);
    setSelectedStatusCode(code);
    window.dispatchEvent(
      new CustomEvent("client_status_changed", { detail: { code } }),
    );
  }, []);

  // Modal handlers
  const handleAddClick = useCallback(() => {
    setSelectedClient(null);
    setOpenAEModal(true);
  }, []);
  const handleEditClick = useCallback((client) => {
    setSelectedClient(client);
    setOpenAEModal(true);
  }, []);
  const handleInfoClick = useCallback((client) => {
    setSelectedClient(client);
    setOpenInfoModal(true);
  }, []);
  const handleDeleteClick = useCallback((client) => {
    setEntityToDelete({
      type: "client",
      data: {
        id: client.id,
        name: client.nickname || client.name,
        nickname: client.nickname,
      },
    });
    setOpenDeleteModal(true);
  }, []);
  const handleCloseAEModal = useCallback(() => {
    setOpenAEModal(false);
    setSelectedClient(null);
  }, []);
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
  const handleApproveOrActivate = useCallback(async () => {
    await updateClientStatus(activeStatusKey);
    notifySidebar(activeStatusKey);
  }, [updateClientStatus, activeStatusKey, notifySidebar]);
  const handleDeactivate = useCallback(async () => {
    await updateClientStatus(inactiveStatusKey);
    notifySidebar(inactiveStatusKey);
  }, [updateClientStatus, inactiveStatusKey, notifySidebar]);
  const handleRedirect = useCallback(
    (label) => {
      const code = Object.keys(clientstatus).find(
        (k) => clientstatus[k] === label,
      );
      if (code) notifySidebar(code);
    },
    [clientstatus, notifySidebar],
  );

  // Row click
  const handleRowClick = useCallback(
    (client) => {
      client.statusCode === activeStatusKey
        ? handleEditClick(client)
        : handleInfoClick(client);
    },
    [activeStatusKey, handleEditClick, handleInfoClick],
  );

  // Reset page on status change
  useEffect(() => {
    setPage(0);
  }, [selectedStatusCode]);

  return {
    // State
    search,
    setSearch,
    page,
    rowsPerPage,
    selectedClient,
    openAEModal,
    openInfoModal,
    openDeleteModal,
    entityToDelete,
    clients: filteredClients,
    loading,
    selectedStatusCode,
    clientstatus,
    isManagement,

    // Status keys
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,

    // Actions
    fetchClients,
    handleAddClick,
    handleEditClick,
    handleInfoClick,
    handleDeleteClick,
    handleCloseAEModal,
    handleCloseInfoModal,
    handleCloseDeleteModal,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleApproveOrActivate,
    handleDeactivate,
    handleRedirect,
  };
}
