import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ArchiveIcon from "@mui/icons-material/Archive";
import SidebarItem from "../../sidebar/SidebarItem.jsx";
import SidebarSubmenu from "../../sidebar/SidebarSubmenu";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";
import TransactionAPI from "../../../../../../../api/endpoints/transaction.api.js";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";

const SESSION_KEY = "selectedArchiveStatusCode";

const ArchiveNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ALL from one hook
  const {
    archiveStatus,
    loading: mappingLoading,
    isManagement,
    isProcurement,
    isAOTL,
    isProcurementTL,
  } = useKeysLabels();

  const safeArchiveStatus = archiveStatus || {};
  const entries = Object.entries(safeArchiveStatus);
   const isOnPage = location.pathname === "/transaction-archive";
  // Archived transaction opened from Look Up / Archive page (canvas route).
  const isArchiveView = location.state?.isArchiveView === true;

  const user = getItem("user");
  const userId = user?.nUserId;

  const firstCode = entries[0]?.[0] ?? "";
  const [selectedCode, setSelectedCode] = useState(
    () => getItem(SESSION_KEY) || firstCode,
  );
  const [transactions, setTransactions] = useState([]);
  const [countLoading, setCountLoading] = useState(true);

  // ── Fetch archived transactions ──────────────────────────────────────
  const fetchTransactions = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
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
        setTransactions(list);
      } catch (err) {
        console.error("Sidebar archive fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading, isManagement, isProcurement, isAOTL, userId, isProcurementTL],
  );

  const fetchRef = useRef(fetchTransactions);
  useEffect(() => {
    fetchRef.current = fetchTransactions;
  }, [fetchTransactions]);

  useEffect(() => {
    if (!mappingLoading) fetchTransactions(false);
  }, [mappingLoading, fetchTransactions]);

  // ── Real-time updates ────────────────────────────────────────────────
  useEffect(() => {
    const onUpdated = () => fetchRef.current(true);
    const onDeleted = () => fetchRef.current(true);
    window.addEventListener("txn_data_updated", onUpdated);
    window.addEventListener("txn_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("txn_data_updated", onUpdated);
      window.removeEventListener("txn_data_deleted", onDeleted);
    };
  }, []);

  // ── Selection handlers ───────────────────────────────────────────────
  useEffect(() => {
    const saved = getItem(SESSION_KEY);
    if (saved && saved !== selectedCode) setSelectedCode(saved);
    if (!saved && firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedCode(firstCode);
    }
  }, [location.key, firstCode, selectedCode]);

  // Follow the archived row that was opened (also survives a page refresh).
  // Completed archives open the collection workspace, where selectedStatusCode
  // carries the LIVE stage the transaction completed from — the archive
  // code is parked beside it as archiveStatusCode.
  useEffect(() => {
    const code =
      location.state?.archiveStatusCode ??
      location.state?.selectedStatusCode;
    if (location.state?.isArchiveView === true && code) {
      setItem(SESSION_KEY, String(code));
      setSelectedCode(String(code));
    }
  }, [location.key, location.state]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code || code === selectedCode) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("archive_status_changed", handler);
    return () => window.removeEventListener("archive_status_changed", handler);
  }, [selectedCode]);

  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/transaction-archive", { state: { selectedCode: code } });
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("archive_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);

  // ── Count per status ─────────────────────────────────────────────────
  const getCountForStatus = (code) => {
    return transactions.filter((txn) => {
      const statusCode = String(txn.current_status ?? txn.latest_history?.nStatus ?? "");
      return statusCode === String(code);
    }).length;
  };

  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<ArchiveIcon fontSize="small" />}
        label="Archives"
        autoOpen={isOnPage || isArchiveView}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? entries.map(([code, label]) => (
          <SidebarSubmenu
            key={code}
            label={label}
                     active={(isOnPage || isArchiveView) && selectedCode === String(code)}
            count={getCountForStatus(code)}
            countLoading={countLoading}
            onClick={() => handleSelect(String(code))}
          />
        )) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No archive statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default ArchiveNavSection;