import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import SidebarItem from "../../sidebar/SidebarItem";
import StatusSubItems from "../StatusSubItems";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import ClientAPI from "../../../../../../../api/endpoints/client.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedClientStatusCode";

const ClientNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source from useKeysLabels
  const { clientstatus, loading: mappingLoading } = useKeysLabels();

  const safeClientStatus = clientstatus || {};
  const entries = Object.entries(safeClientStatus);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY, null);
    return saved || firstCode;
  });
  const [clients, setClients] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage = location.pathname === "/client";

  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY, null);
    if (saved) setSelectedCode(saved);
  }, [location.key]);

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("client_status_changed", handler);
    return () => window.removeEventListener("client_status_changed", handler);
  }, []);

  // ── Fetch clients ──
  const fetchClients = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
      try {
        const res = await ClientAPI.getClients();
        setClients(res.clients || []);
      } catch (err) {
        console.error("Sidebar client fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading],
  );

  const fetchRef = useRef(fetchClients);
  useEffect(() => {
    fetchRef.current = fetchClients;
  }, [fetchClients]);

  useEffect(() => {
    if (!mappingLoading) fetchClients(false);
  }, [mappingLoading, fetchClients]);

  // ── Realtime updates ──
  useEffect(() => {
    const handler = () => fetchRef.current(true);
    window.addEventListener("client_data_updated", handler);
    window.addEventListener("client_data_deleted", handler);
    return () => {
      window.removeEventListener("client_data_updated", handler);
      window.removeEventListener("client_data_deleted", handler);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/client");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("client_status_changed", { detail: { code } }),
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
        icon={<PersonIcon fontSize="small" />}
        label="Clients"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          <StatusSubItems
            statusMap={safeClientStatus}
            items={clients.map((c) => ({ statusCode: c.cStatus }))}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            isOnPage={isOnPage}
            countLoading={countLoading}
          />
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No client statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default ClientNavSection;
