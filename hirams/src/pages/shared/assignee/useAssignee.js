import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AssigneeAPI from "../../../api/endpoints/assignee.api.js";
import { getItem, setItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
const SESSION_KEY = "selectedAssigneeStatusCode";
const DEBOUNCE_MS = 300;

/* ── Helper ─────────────────────────────────────────────────────────── */
function formatAssignee(a) {
  return {
    id: a.nAssigneeId,
    name: a.strAssigneeName,
    nickname: a.strAssigneeNickName || "",
    address: a.strAddress || "",
    tin: a.strTIN || "",
    statusCode: a.cStatus,
    // How many vouchers still name this assignee — an assignee that is on
    // any cannot be deleted, it has to be transferred instead.
    vouchersCount: Number(a.vouchers_count ?? 0),
    dtCreatedAt: a.dtCreatedAt,
    dtUpdatedAt: a.dtUpdatedAt,
  };
}

/* ── Hook ────────────────────────────────────────────────────────────── */
export default function useAssignee() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [openAEModal, setOpenAEModal] = useState(false);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);

  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetched, setIsFetched] = useState(false);
  const {
    statuses,
    loading: mappingLoading,
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
  } = useKeysLabels();

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );

  useEffect(() => {
    if (!mappingLoading && activeStatusKey && !getItem(SESSION_KEY)) {
      setSelectedStatusCode(activeStatusKey);
      setItem(SESSION_KEY, activeStatusKey);
    }
  }, [mappingLoading, activeStatusKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setSelectedStatusCode(code);
      setItem(SESSION_KEY, code);
      setPage(0);
    };
    window.addEventListener("assignee_status_changed", handler);
    return () => window.removeEventListener("assignee_status_changed", handler);
  }, []);

  useEffect(() => {
    // A new search (or a new status) starts on the first page — otherwise
    // the table can sit on a page the result set no longer has.
    setPage(0);
  }, [selectedStatusCode, debouncedSearch]);

  const fetchAssignees = useCallback(
    async (force = false, silent = false) => {
      // The list is fetched ONCE — the API hands back every assignee — and
      // the search runs over it here, the same way the supplier / client
      // lists work. That way the box never needs a round trip, and
      // CLEARING it always brings the whole list back.
      if (!force && isFetched) return;
      if (mappingLoading) return;
      if (!silent) setLoading(true);
      try {
        const response = await AssigneeAPI.getAssignees();
        const raw = response.assignees ?? [];
        setAssignees(raw.map(formatAssignee));
        setIsFetched(true);
      } catch (err) {
        console.error("Error fetching assignees:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [mappingLoading, isFetched],
  );

  const fetchAssigneesRef = useRef(fetchAssignees);
  useEffect(() => {
    fetchAssigneesRef.current = fetchAssignees;
  }, [fetchAssignees]);

  useEffect(() => {
    if (!mappingLoading) {
      fetchAssignees();
    }
  }, [mappingLoading, fetchAssignees]);

  // Always bypasses the isFetched guard — the Sync button and a live
  // refresh both mean "get it again".
  const refreshAssignees = useCallback(
    () => fetchAssigneesRef.current?.(true, true),
    [],
  );

  useEffect(() => {
    const onUpdated = () => fetchAssigneesRef.current?.(true, true);
    const onDeleted = (e) =>
      setAssignees((prev) => prev.filter((a) => a.id !== e.detail?.assigneeId));

    window.addEventListener("assignee_data_updated", onUpdated);
    window.addEventListener("assignee_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("assignee_data_updated", onUpdated);
      window.removeEventListener("assignee_data_deleted", onDeleted);
    };
  }, []);

  // The list on screen: the status tab, then the search. The search runs
  // over the whole record — name, nickname, address and TIN — so anything
  // printed in the table can be looked up.
  const filteredAssignees = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return assignees.filter((a) => {
      if (selectedStatusCode && a.statusCode !== selectedStatusCode)
        return false;
      if (!q) return true;
      return (
        a.name?.toLowerCase().includes(q) ||
        a.nickname?.toLowerCase().includes(q) ||
        a.address?.toLowerCase().includes(q) ||
        a.tin?.toLowerCase().includes(q)
      );
    });
  }, [assignees, selectedStatusCode, debouncedSearch]);

  const notifySidebar = useCallback((code) => {
    setItem(SESSION_KEY, code);
    setSelectedStatusCode(code);
    window.dispatchEvent(
      new CustomEvent("assignee_status_changed", { detail: { code } }),
    );
  }, []);

  const updateAssigneeStatus = useCallback(
    async (status) => {
      if (!selectedAssignee) return;
      await AssigneeAPI.updateStatus(selectedAssignee.id, { cStatus: status });
      await fetchAssigneesRef.current?.(true, true);
    },
    [selectedAssignee],
  );

  const handleAddClick = useCallback(() => {
    setSelectedAssignee(null);
    setOpenAEModal(true);
  }, []);
  const handleEditClick = useCallback((a) => {
    setSelectedAssignee(a);
    setOpenAEModal(true);
  }, []);
  const handleInfoClick = useCallback((a) => {
    setSelectedAssignee(a);
    setOpenInfoModal(true);
  }, []);
  const handleDeleteClick = useCallback((a) => {
    setEntityToDelete({ type: "assignee", data: { id: a.id, name: a.name } });
    setOpenDeleteModal(true);
  }, []);
  const handleCloseAEModal = useCallback(() => {
    setOpenAEModal(false);
    setSelectedAssignee(null);
  }, []);
  // Transfer — the stand-in for Delete on an assignee that still carries
  // vouchers: the modal moves them to another active assignee.
  const handleTransferClick = useCallback((a) => {
    setSelectedAssignee(a);
    setOpenTransferModal(true);
  }, []);
  const handleCloseTransferModal = useCallback(() => {
    setOpenTransferModal(false);
    setSelectedAssignee(null);
  }, []);
  // The move itself — the modal only picks the destination and the
  // vouchers. The source id travels WITH the call, so the modal can close
  // itself (and drop the selection) before the request is sent.
  const handleTransferVouchers = useCallback(
    async (sourceAssigneeId, targetAssigneeId, voucherIds) => {
      if (!sourceAssigneeId) return;
      await AssigneeAPI.transferVouchers(sourceAssigneeId, {
        nTargetAssigneeId: targetAssigneeId,
        voucherIds,
      });
      await fetchAssigneesRef.current?.(true, true); // ✅ Silent refresh
    },
    [],
  );
  const handleCloseInfoModal = useCallback(() => setOpenInfoModal(false), []);
  const handleCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setEntityToDelete(null);
  }, []);

  const handlePageChange = useCallback((_, p) => setPage(p), []);
  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      row.statusCode === activeStatusKey
        ? handleEditClick(row)
        : handleInfoClick(row);
    },
    [activeStatusKey, handleEditClick, handleInfoClick],
  );

  const handleSetActive = useCallback(async () => {
    await updateAssigneeStatus(activeStatusKey);
  }, [updateAssigneeStatus, activeStatusKey]);

  const handleSetInactive = useCallback(async () => {
    await updateAssigneeStatus(inactiveStatusKey);
  }, [updateAssigneeStatus, inactiveStatusKey]);

  const handleApprove = useCallback(async () => {
    await updateAssigneeStatus(activeStatusKey);
  }, [updateAssigneeStatus, activeStatusKey]);

  return {
    search,
    setSearch,
    page,
    rowsPerPage,
    openAEModal,
    openInfoModal,
    openDeleteModal,
    openTransferModal,
    selectedAssignee,
    entityToDelete,
    assignees: filteredAssignees,
    loading,
    selectedStatusCode,
    statuses,
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    fetchAssignees,
    refreshAssignees,
    handleAddClick,
    handleEditClick,
    handleInfoClick,
    handleDeleteClick,
    handleCloseAEModal,
    handleCloseInfoModal,
    handleCloseDeleteModal,
    handleTransferClick,
    handleCloseTransferModal,
    handleTransferVouchers,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleSetActive,
    handleSetInactive,
    handleApprove,
  };
}
