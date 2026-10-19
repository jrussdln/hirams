import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import { fmtDateTime, fmtDate } from "../../../utils/helpers/timeZone.js";
import { getItem } from "../../../utils/storage/localStorage.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";

export default function useArchive() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [archiveModalTransaction, setArchiveModalTransaction] = useState(null);
  const [archiveModalMode, setArchiveModalMode] = useState("unarchive");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const {
    //Mappings
    archiveStatus,
    userTypes,
    statusTransaction,
    itemType,
    procMode,
    procSource,
    loading: mappingLoading,
    //Keys
    archivedKey,
    lostKey,
    completedKey,
    //Labels
    isManagement,
    isProcurement,
    isAccountOfficer,
    isAOTL,
    isProcurementTL,
  } = useKeysLabels();

  const user = useMemo(() => getItem("user"), []);
  const userId = user?.nUserId;

  // ── Selected Status: from Sidebar / session / default ─────────────────────
  const SESSION_KEY = "selectedArchiveStatusCode";
  const firstCode = Object.keys(archiveStatus || {})[0] ?? "";

  const [selectedArchiveStatusCode, setSelectedArchiveStatusCode] = useState(
    () => location.state?.selectedCode || getItem(SESSION_KEY) || firstCode,
  );

  useEffect(() => {
    const saved = getItem(SESSION_KEY);
    if (saved) setSelectedArchiveStatusCode(saved);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (code) setSelectedArchiveStatusCode(code);
    };
    window.addEventListener("archive_status_changed", handler);
    return () => window.removeEventListener("archive_status_changed", handler);
  }, []);

  useEffect(() => setPage(0), [selectedArchiveStatusCode]);

  // ── Debounce Search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        let list = [];
        if (isManagement) {
          const res = await TransactionAPI.getArchived();
          list = res.transactions || [];
        } else if (isProcurement) {
          const res = await TransactionAPI.getArchivedProcurement(
            `nUserId=${userId}&isProcTL=${isProcurementTL ? 1 : 0}`,
          );
          list = res.transactions || [];
        } else {
          const res = await TransactionAPI.getArchivedAccountOfficer(
            `nUserId=${userId}&isAOTL=${isAOTL ? 1 : 0}`,
          );
          list = res.transactions || [];
        }

        const formatted = list.map((txn, idx) => {
          const statusCode = txn.current_status ?? txn.latest_history?.nStatus;
          const prevCode = txn.previous_status ?? null;
          return {
            ...txn,
            id: txn.nTransactionId ?? `txn-archive-${idx}`,
            transactionId: txn.strCode || "--",
            transactionName: txn.strTitle || "--",
            date: txn.dtDocSubmission ? fmtDateTime(txn.dtDocSubmission) : "—",
            status: (archiveStatus || {})[statusCode],
            status_code: statusCode,
            previous_status_code: prevCode,
            previous_status_label: (statusTransaction || {})[prevCode] ?? "--",
            companyName: txn.company?.strCompanyNickName || "",
            clientName: txn.client?.strClientNickName || "",
            createdBy: txn.created_by || "--",
            creator_id: txn.creator_id ?? null,
            aoName: txn.user ? `${txn.user.strNickName}`.trim() : "",
            aoUserId: txn.nAssignedAO || txn.user?.nUserId,
            archivedAt: txn.dtArchivedAt ? fmtDate(txn.dtArchivedAt) : "—",
          };
        });

        setTransactions(formatted);
      } catch (err) {
        console.error("Error fetching archived transactions:", err);
      } finally {
        if (!silent) setLoading(false);
        setInitialLoading(false);
      }
    },
    [
      isManagement,
      isProcurement,
      isAOTL,
      userId,
      isProcurementTL,
      archiveStatus,
    ],
  );

  const fetchRef = useRef(fetchTransactions);
  useEffect(() => {
    fetchRef.current = fetchTransactions;
  }, [fetchTransactions]);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!mappingLoading && !hasFetched.current) {
      hasFetched.current = true;
      fetchTransactions();
    }
  }, [mappingLoading, fetchTransactions]);

  // ── Realtime Updates ─────────────────────────────────────────────────────
  useEffect(() => {
    const onUpdated = () => fetchRef.current({ silent: true });
    const onDeleted = (e) => {
      const id = e.detail?.transactionId;
      if (id)
        setTransactions((prev) =>
          prev.filter((t) => String(t.id) !== String(id)),
        );
      else fetchRef.current({ silent: true });
    };
    window.addEventListener("txn_data_updated", onUpdated);
    window.addEventListener("txn_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("txn_data_updated", onUpdated);
      window.removeEventListener("txn_data_deleted", onDeleted);
    };
  }, []);

  // ── Filter Logic ────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        !searchLower ||
        t.transactionId?.toLowerCase().includes(searchLower) ||
        t.transactionName?.toLowerCase().includes(searchLower) ||
        t.clientName?.toLowerCase().includes(searchLower) ||
        t.companyName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      const txnCode = String(t.status_code ?? "");
      return txnCode === String(selectedArchiveStatusCode);
    });
  }, [transactions, debouncedSearch, selectedArchiveStatusCode]);

  // ── Row Click ────────────────────────────────────────────────────────────
  const handleRowClick = useCallback(
    (row) => {
      const statusCode = String(row.status_code ?? "");
      navigate("/transaction-canvas", {
        state: {
          transactionId: row.id,
          transactionCode: row.transactionId,
          transaction: row,
          currentUserId: userId,
          isArchiveView: true,
          selectedStatusCode: statusCode,
          statusTransaction,
          itemType,
          procMode,
          procSource,
        },
      });
    },
    [navigate, userId, statusTransaction, itemType, procMode, procSource],
  );

  return {
    navigate,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    transactions,
    filteredTransactions,
    loading,
    initialLoading,
    selectedArchiveStatusCode,
    setSelectedArchiveStatusCode,
    selectedTransaction,
    setSelectedTransaction,
    archiveModalTransaction,
    setArchiveModalTransaction,
    archiveModalMode,
    setArchiveModalMode,
    isArchiveModalOpen,
    setIsArchiveModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    archiveStatus,

    isManagement,
    userId,
    archivedKey,
    lostKey,
    completedKey,
    fetchTransactions,
    handleRowClick,
  };
}
