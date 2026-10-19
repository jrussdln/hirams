import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import PricingAPI from "../../../api/endpoints/pricing.api.js";
import DirectCostOptionAPI from "../../../api/endpoints/direct-cost-option.api.js";
import DirectCostAPI from "../../../api/endpoints/direct-cost.api.js";
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
  // { [transactionId]: { collectible, ewt, tax, retention } }
  const [collectibleMap, setCollectibleMap] = useState({});
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
    //Labels
    isManagement,
    isProcurement,
    isAccountOfficer,
    isAOTL,
    isProcurementTL,
  } = useKeysLabels();

  // ── Archive Status Keys ────────────────────────────────────────────────
  // Order of `archiveStatus`: [0] Archived, [1] Lost, [2] Transaction Completed
  // (same convention StatusModal.jsx uses to pick the Lost code).
  const archiveStatusKeys = Object.keys(archiveStatus || {});
  const archivedKey = archiveStatusKeys[0] ?? "";
  const lostKey = archiveStatusKeys[1] ?? "";
  const completedKey = archiveStatusKeys[2] ?? "";

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

  // ── Collection Amount ───────────────────────────────────────────────────
  // The Completed tab mirrors the transactions page's For Collection layout,
  // so it needs the same figures: collectible less EWT, TAX and retention.
  // Mirrors fetchTxnCollectible in useTransaction.js.
  const fetchCollectible = useCallback(
    async (txnList) => {
      if (!txnList?.length) return;

      const collectionTxns = txnList.filter(
        (t) => String(t.status_code) === String(completedKey),
      );
      if (!collectionTxns.length) return;

      try {
        // Direct-cost option names are shared by every row — fetched (and
        // cached) once rather than per transaction.
        let options;
        const cached = sessionStorage.getItem("direct_cost_options_cache");
        if (cached) {
          options = JSON.parse(cached);
        } else {
          const r = await DirectCostOptionAPI.getDirectCostOptions();
          options = r.data || r || [];
          sessionStorage.setItem(
            "direct_cost_options_cache",
            JSON.stringify(options),
          );
        }

        const nameOf = (id) => {
          const f = options.find((o) => (o.nDirectCostOptionID || o.id) === id);
          return (f?.strName || f?.name || "").toLowerCase();
        };

        const map = {};
        await Promise.all(
          collectionTxns.map(async (t) => {
            try {
              const setsRes = await PricingAPI.getPricingSets(t.id);
              const chosen = (setsRes.data ?? []).find(
                (s) => s.bChosen === 1 || s.bChosen === true,
              );
              const collectible = Number(chosen?.totalSellingPrice ?? 0);

              // TAX — sum of the chosen set's item pricings.
              let tax = 0;
              const pricingSetId = chosen?.nPricingSetId ?? chosen?.id;
              if (pricingSetId) {
                const pricingsRes = await PricingAPI.getItemPricings(
                  pricingSetId,
                );
                (pricingsRes.itemPricings || []).forEach((p) => {
                  tax += Number(p.tax || 0);
                });
              }

              // EWT + Retention — from the transaction's direct costs.
              let ewt = 0;
              let ewtFound = false;
              let retention = 0;
              const costsRes = await DirectCostAPI.getDirectCosts({
                nTransactionID: t.id,
                withEWT: 1,
              });
              const costs =
                costsRes.directCosts || costsRes.data || costsRes || [];
              const totalEWT = Number(costsRes.totalEWT) || 0;
              costs.forEach((c) => {
                const name = nameOf(c.nDirectCostOptionID);
                const amt = Number(c.dAmount || 0);
                if (name === "ewt") {
                  ewt += amt;
                  ewtFound = true;
                } else if (name.startsWith("ret")) retention += amt;
              });

              map[t.id] = {
                collectible,
                ewt: ewtFound && ewt > 0 ? ewt : totalEWT,
                tax,
                retention,
              };
            } catch {
              map[t.id] = { collectible: 0, ewt: 0, tax: 0, retention: 0 };
            }
          }),
        );
        setCollectibleMap(map);
      } catch (err) {
        console.error("fetchCollectible error:", err);
      }
    },
    [completedKey],
  );

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
        fetchCollectible(formatted);
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
      fetchCollectible,
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
    collectibleMap,
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
