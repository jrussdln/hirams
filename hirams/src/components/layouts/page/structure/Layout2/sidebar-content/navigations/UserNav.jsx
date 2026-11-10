import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PeopleIcon from "@mui/icons-material/People";
import SidebarItem from "../../sidebar/SidebarItem";
import StatusSubItems from "../StatusSubItems";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import UserAPI from "../../../../../../../api/endpoints/user.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedUserStatusCode";

const UserNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source from useKeysLabels
  const { statuses, loading: mappingLoading } = useKeysLabels();

  const safeStatuses = statuses || {};
  const entries = Object.entries(safeStatuses);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    return getItem(SESSION_KEY, null) || firstCode;
  });
  const [users, setUsers] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage = location.pathname === "/user";

  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY, null);
    if (saved) setSelectedCode(saved);
  }, [location.key]);

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (code) {
        setItem(SESSION_KEY, code);
        setSelectedCode(code);
      }
    };
    window.addEventListener("user_status_changed", handler);
    return () => window.removeEventListener("user_status_changed", handler);
  }, []);

  // ── Fetch users ──
  const fetchUsers = useCallback(async (silent = false) => {
    if (mappingLoading) return;
    if (!silent) setCountLoading(true);
    try {
      const res = await UserAPI.getAllUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error("Sidebar user fetch error:", err);
    } finally {
      if (!silent) setCountLoading(false);
    }
  }, [mappingLoading]);

  const fetchRef = useRef(fetchUsers);
  useEffect(() => {
    fetchRef.current = fetchUsers;
  }, [fetchUsers]);

  useEffect(() => {
    if (!mappingLoading) fetchUsers(false);
  }, [mappingLoading, fetchUsers]);

  // ── Realtime updates ──
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.action === "deleted" || e.type === "user_data_deleted") {
        setUsers((prev) => prev.filter((u) => u.nUserId !== e.detail?.userId));
      } else {
        fetchRef.current(true);
      }
    };
    window.addEventListener("user_data_updated", handler);
    window.addEventListener("user_data_deleted", handler);
    return () => {
      window.removeEventListener("user_data_updated", handler);
      window.removeEventListener("user_data_deleted", handler);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/user");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("user_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);

  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full">
      <SidebarItem
        icon={<PeopleIcon fontSize="small" />}
        label="Users"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          <StatusSubItems
            statusMap={safeStatuses}
            items={users.map((u) => ({ statusCode: u.cStatus }))}
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

export default UserNavSection;