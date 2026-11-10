import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import SidebarItem from "../../sidebar/SidebarItem";
import StatusSubItems from "../StatusSubItems";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import AssigneeAPI from "../../../../../../../api/endpoints/assignee.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedAssigneeStatusCode";

const AssigneeNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source — statuses + loading from useKeysLabels
  const { statuses, loading: mappingLoading } = useKeysLabels();

  const safeStatuses = statuses || {};
  const entries = Object.entries(safeStatuses);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY);
    return saved || firstCode;
  });
  const [assignees, setAssignees] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage = location.pathname === "/assignee";
  const isInitialLoadRef = useRef(true);

  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY);
    if (saved && saved !== selectedCode) setSelectedCode(saved);
    if (!saved && firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedCode(firstCode);
    }
  }, [location.key, firstCode, selectedCode]);

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code || code === selectedCode) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("assignee_status_changed", handler);
    return () => window.removeEventListener("assignee_status_changed", handler);
  }, [selectedCode]);

  // ── Fetch counts ──
  const fetchAssignees = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
      try {
        const res = await AssigneeAPI.getAssignees();
        setAssignees(res.assignees || []);
      } catch (err) {
        console.error("Sidebar assignee fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading],
  );

  const fetchRef = useRef(fetchAssignees);
  useEffect(() => {
    fetchRef.current = fetchAssignees;
  }, [fetchAssignees]);

  // ── Initial load ONLY ──
  useEffect(() => {
    if (!mappingLoading && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchAssignees(false);
    }
  }, [mappingLoading, fetchAssignees]);

  // ── Realtime updates — SILENT refresh ──
  useEffect(() => {
    const onUpdated = () => fetchRef.current(true);
    const onDeleted = (e) => {
      const id = e.detail?.assigneeId;
      if (id) setAssignees((prev) => prev.filter((a) => a.nAssigneeId !== id));
    };
    window.addEventListener("assignee_data_updated", onUpdated);
    window.addEventListener("assignee_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("assignee_data_updated", onUpdated);
      window.removeEventListener("assignee_data_deleted", onDeleted);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/assignee");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("assignee_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);
  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<AssignmentIndIcon fontSize="small" />}
        label="Assignees"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          <StatusSubItems
            statusMap={safeStatuses}
            items={assignees.map((a) => ({ statusCode: a.cStatus }))}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            isOnPage={isOnPage}
            countLoading={countLoading}
          />
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default AssigneeNavSection;
