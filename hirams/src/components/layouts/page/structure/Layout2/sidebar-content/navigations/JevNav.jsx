import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DescriptionIcon from "@mui/icons-material/Description";
import SidebarItem from "../../sidebar/SidebarItem";
import SidebarSubmenu from "../../sidebar/SidebarSubmenu";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels";
import JevAPI from "../../../../../../../api/endpoints/jev.api";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedJevTypeCode";

// "Journal Entry Voucher" section — one sub-item per entry of the `jev_types`
// mapping (Disbursement Voucher, Received Purchases, Delivered Items,
// Collection …), so the list always follows what is picked here.
//
// Contract shared with the page (src/pages/shared/journal-entry-voucher/useJournalEntryVoucher.js):
//   • the code is persisted under SESSION_KEY
//   • every pick is broadcast as a "jev_type_changed" CustomEvent, so the
//     list can switch type even when the sidebar and the page are already
//     mounted at the same time.
const JevNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ SINGLE SOURCE OF TRUTH — from unified hook
  const { jev_types, loading: mappingLoading } = useKeysLabels();
  const entries = Object.entries(jev_types || {});
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );
  const isOnPage = location.pathname === "/journal-entry-voucher" || location.pathname === "/jev-update";

  // ── Counts ────────────────────────────────────────────────────────────
  // One grouped COUNT per type (JevController@counts) — a few hundred bytes,
  // unlike the full JEV payload (entries + voucher relations) the list page
  // loads. The first call shows the per-row spinners, later navigations
  // re-sync silently so the badges never go stale.
  const [counts, setCounts] = useState({});
  const [countLoading, setCountLoading] = useState(true);
  const countsReadyRef = useRef(false);

  const fetchCounts = useCallback(async (silent = false) => {
    if (!silent) setCountLoading(true);
    try {
      const res = await JevAPI.getCounts();
      setCounts(
        res && typeof res === "object" && !Array.isArray(res) ? res : {},
      );
      countsReadyRef.current = true;
    } catch (err) {
      // Endpoint unreachable → the sub-items simply render without badges.
      console.error("Sidebar JEV counts error:", err);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mappingLoading) return;
    fetchCounts(countsReadyRef.current);
  }, [mappingLoading, location.key, fetchCounts]);

  // Sync state with localStorage on navigation, and seed the first type the
  // very first time (nothing picked yet).
  useEffect(() => {
    if (mappingLoading) return;
    const saved = getItem(SESSION_KEY, "");
    if (saved) {
      setSelectedCode(saved);
      return;
    }
    if (firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedCode(firstCode);
    }
  }, [location.key, mappingLoading, firstCode]);

  // Listen for cross-component changes
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("jev_type_changed", handler);
    return () => window.removeEventListener("jev_type_changed", handler);
  }, []);

  // A JEV created, retyped or deleted — here or on another tab/user, via
  // the "jevs" broadcast — moves a badge, so recount straight away instead
  // of waiting for the next navigation.
  useEffect(() => {
    const handler = () => fetchCounts(true);
    window.addEventListener("jev_data_deleted", handler);
    window.addEventListener("jev_data_updated", handler);
    return () => {
      window.removeEventListener("jev_data_deleted", handler);
      window.removeEventListener("jev_data_updated", handler);
    };
  }, [fetchCounts]);

  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/journal-entry-voucher");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("jev_type_changed", { detail: { code } }),
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
        icon={<DescriptionIcon fontSize="small" />}
        label="Journal Entry Voucher"
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          entries.map(([code, label]) => (
            <SidebarSubmenu
              key={code}
              label={label}
              active={isOnPage && selectedCode === String(code)}
              count={Number(counts[code] ?? 0)}
              countLoading={countLoading}
              onClick={() => handleSelect(String(code))}
            />
          ))
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No JEV types found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default JevNavSection;
