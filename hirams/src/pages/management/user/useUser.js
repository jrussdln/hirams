import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import UserAPI from "../../../api/endpoints/user.api.js";
import { getItem, setItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

const SESSION_KEY = "selectedUserStatusCode";
const DEBOUNCE_MS = 300;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatUser(user, { userTypes, defaultUserType, sex, statuses }) {
  return {
    id: user.nUserId,
    firstName: user.strFName,
    middleName: user.strMName,
    lastName: user.strLName,
    nickname: user.strNickName,
    type: userTypes[user.cUserType] ?? defaultUserType[user.cUserType],
    sex: sex[user.cSex] || user.cSex,
    email: user.strEmail,
    phoneNumber: user.strPhoneNo || "",
    username: user.strUserName,
    status: user.cStatus,
    statusText: statuses[user.cStatus] || user.cStatus,
    fullName: `${user.strFName} ${user.strMName || ""} ${user.strLName}`.trim(),
    statusCode: user.cStatus,
    strProfileImage: user.strProfileImage,
    cSex: user.cSex,
    bIsActive: user.bIsActive,
    dtCreatedAt: user.dtCreatedAt,
    dtLoggedIn: user.dtLoggedIn,
  };
}

function timeAgoDisplay(dtLoggedIn) {
  const lastSeen = dtLoggedIn ? new Date(dtLoggedIn) : null;

  if (!lastSeen || isNaN(lastSeen)) {
    return { text: "Offline", className: "bg-slate-100 text-slate-500" };
  }

  const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (hours < 1)
    return {
      text: `Active ${mins}m ago`,
      className: "bg-sky-100 text-sky-600",
    };
  if (hours < 24)
    return {
      text: `Active ${hours}h ago`,
      className: "bg-violet-100 text-violet-600",
    };
  return {
    text: `Active ${days}d ago`,
    className: "bg-orange-100 text-orange-600",
  };
}

function deriveStatusDisplay(
  row,
  { activeStatusKey, forApprovalStatusKey, statuses },
) {
  if (row.statusCode !== activeStatusKey) {
    return {
      text: statuses[row.statusCode] || row.statusText,
      className:
        row.statusCode === forApprovalStatusKey
          ? "bg-amber-100 text-amber-700"
          : "bg-rose-100 text-rose-600",
    };
  }

  // bIsActive === 0 → currently online → no time
  if (Number(row.bIsActive) === 0) {
    return { text: "Online", className: "bg-emerald-100 text-emerald-600" };
  }

  // bIsActive === 1 → show last seen
  return timeAgoDisplay(row.dtLoggedIn);
}

/* ── Hook ────────────────────────────────────────────────────────────── */
export default function useUser() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [openUserModal, setOpenUserModal] = useState(false);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);

  // Full dataset — loaded ONCE, refreshed silently in background
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetched, setIsFetched] = useState(false);

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );

  const {
    //Mappings
    userTypes,
    defaultUserType,
    sex,
    statuses,
    loading: mappingLoading,
    //Keys
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    //Labels
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    maleKey,
    femaleKey,
  } = useKeysLabels();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Initialize default status from mappings
  useEffect(() => {
    if (!mappingLoading && activeStatusKey && !getItem(SESSION_KEY)) {
      setSelectedStatusCode(activeStatusKey);
      setItem(SESSION_KEY, activeStatusKey);
    }
  }, [mappingLoading, activeStatusKey]);

  // Listen for sidebar status changes
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setSelectedStatusCode(code);
      setItem(SESSION_KEY, code);
      setPage(0);
    };
    window.addEventListener("user_status_changed", handler);
    return () => window.removeEventListener("user_status_changed", handler);
  }, []);

  // Reset page when status filter changes
  useEffect(() => {
    setPage(0);
  }, [selectedStatusCode]);

  const fetchUsers = useCallback(
    async (force = false, silent = false) => {
      if (!force && isFetched) return;
      if (mappingLoading) return;

      if (!silent) setLoading(true);

      try {
        // Always fetch FULL list — search & filter done client-side
        const response = await UserAPI.getUsers("");
        const raw = response.users ?? [];
        const mappings = { userTypes, defaultUserType, sex, statuses };
        setUsers(raw.map((u) => formatUser(u, mappings)));
        setIsFetched(true);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [mappingLoading, userTypes, defaultUserType, sex, statuses, isFetched],
  );

  // Keep stable reference for event listeners
  const fetchUsersRef = useRef(fetchUsers);
  useEffect(() => {
    fetchUsersRef.current = fetchUsers;
  }, [fetchUsers]);

  // Initial load — runs ONLY once when mappings are ready
  useEffect(() => {
    if (!isFetched && !mappingLoading) {
      fetchUsers();
    }
  }, [fetchUsers, isFetched, mappingLoading]);

  // Real-time sync — SILENT refresh (no loading flash)
  useEffect(() => {
    const onUpdated = () => {
      fetchUsersRef.current(true, true); // force=true, silent=true
    };
    const onDeleted = (e) => {
      setUsers((prev) => prev.filter((u) => u.id !== e.detail?.userId));
    };

    window.addEventListener("user_data_updated", onUpdated);
    window.addEventListener("user_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("user_data_updated", onUpdated);
      window.removeEventListener("user_data_deleted", onDeleted);
    };
  }, []);

  // ✅ 100% Client-side search + status filtering
  const filteredUsers = useMemo(() => {
    let result = users;

    // Search across multiple fields
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q),
      );
    }

    // Apply status tab filter
    if (selectedStatusCode) {
      result = result.filter((u) => u.statusCode === selectedStatusCode);
    }

    return result;
  }, [users, selectedStatusCode, debouncedSearch]);

  const getStatusDisplay = useCallback(
    (row) =>
      deriveStatusDisplay(row, {
        activeStatusKey,
        forApprovalStatusKey,
        statuses,
      }),
    [activeStatusKey, forApprovalStatusKey, statuses],
  );

  const notifySidebar = useCallback((code) => {
    setItem(SESSION_KEY, code);
    setSelectedStatusCode(code);
    window.dispatchEvent(
      new CustomEvent("user_status_changed", { detail: { code } }),
    );
  }, []);

  const updateUserStatus = useCallback(
    async (status, userType = null) => {
      if (!selectedUser?.id) return;
      const payload = { cStatus: status };
      if (userType) payload.cUserType = userType;
      await UserAPI.updateStatus(selectedUser.id, payload);
      await fetchUsersRef.current(true, true);
    },
    [selectedUser],
  );
  // Modal handlers
  const handleAddClick = useCallback(() => {
    setSelectedUser(null);
    setOpenUserModal(true);
  }, []);

  const handleEditClick = useCallback((user) => {
    setSelectedUser(user);
    setOpenUserModal(true);
  }, []);

  const handleInfoClick = useCallback((user) => {
    setSelectedUser(user);
    setOpenInfoModal(true);
  }, []);

  const handleDeleteClick = useCallback((user) => {
    setEntityToDelete({
      type: "user",
      data: { id: user.id, name: user.fullName },
    });
    setOpenDeleteModal(true);
  }, []);

  const handleCloseUserModal = useCallback(() => {
    setOpenUserModal(false);
    setSelectedUser(null);
  }, []);

  const handleCloseInfoModal = useCallback(() => setOpenInfoModal(false), []);
  const handleCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setEntityToDelete(null);
  }, []);

  // Table pagination
  const handlePageChange = useCallback((_, newPage) => setPage(newPage), []);
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

  // Info modal actions
  const handleApprove = useCallback(
    (userType) =>
      updateUserStatus(activeStatusKey, userType).then(() =>
        notifySidebar(activeStatusKey),
      ),
    [updateUserStatus, activeStatusKey, notifySidebar],
  );

  const handleSetActive = useCallback(
    () =>
      updateUserStatus(activeStatusKey).then(() =>
        notifySidebar(activeStatusKey),
      ),
    [updateUserStatus, activeStatusKey, notifySidebar],
  );

  const handleSetInactive = useCallback(
    () =>
      updateUserStatus(inactiveStatusKey).then(() =>
        notifySidebar(inactiveStatusKey),
      ),
    [updateUserStatus, inactiveStatusKey, notifySidebar],
  );

  const handleRedirect = useCallback(
    (label) => {
      const code = Object.keys(statuses).find((k) => statuses[k] === label);
      if (code) notifySidebar(code);
    },
    [statuses, notifySidebar],
  );

  return {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    openUserModal,
    setOpenUserModal,
    openInfoModal,
    setOpenInfoModal,
    openDeleteModal,
    setOpenDeleteModal,
    selectedUser,
    setSelectedUser,
    entityToDelete,
    setEntityToDelete,
    users,
    loading,
    selectedStatusCode,

    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,
    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    maleKey,
    femaleKey,
    userTypes,
    statuses,
    filteredUsers,
    getStatusDisplay,
    fetchUsers,
    handleAddClick,
    handleEditClick,
    handleInfoClick,
    handleDeleteClick,
    handleCloseUserModal,
    handleCloseInfoModal,
    handleCloseDeleteModal,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleApprove,
    handleSetActive,
    handleSetInactive,
    handleRedirect,
  };
}
