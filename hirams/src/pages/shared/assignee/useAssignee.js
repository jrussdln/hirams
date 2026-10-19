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
    setPage(0);
  }, [selectedStatusCode]);

  const fetchAssignees = useCallback(
    async (force = false, silent = false) => {
      if (!force && isFetched && !debouncedSearch) return;
      if (mappingLoading) return;
      if (!silent) setLoading(true);
      try {
        const response = await AssigneeAPI.getAssignees(
          `search=${encodeURIComponent(debouncedSearch)}`,
        );
        const raw = response.assignees ?? [];
        setAssignees(raw.map(formatAssignee));
        setIsFetched(true);
      } catch (err) {
        console.error("Error fetching assignees:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [debouncedSearch, mappingLoading, isFetched],
  );

  const fetchAssigneesRef = useRef(fetchAssignees);
  useEffect(() => {
    fetchAssigneesRef.current = fetchAssignees;
  }, [fetchAssignees]);

  useEffect(() => {
    if (!mappingLoading) {
      fetchAssignees();
    }
  }, [mappingLoading, debouncedSearch, fetchAssignees]);

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

  const filteredAssignees = useMemo(
    () =>
      selectedStatusCode
        ? assignees.filter((a) => a.statusCode === selectedStatusCode)
        : assignees,
    [assignees, selectedStatusCode],
  );

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
    handleSetActive,
    handleSetInactive,
    handleApprove,
  };
}
