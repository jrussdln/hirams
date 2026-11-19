import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SidebarItem from "../../sidebar/SidebarItem";
import SidebarSubmenu from "../../sidebar/SidebarSubmenu";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import InventoryAPI from "../../../../../../../api/endpoints/inventory.api.js";
import { countPendingJevGroups } from "../../../../../../../utils/helpers/pendingJevGroups.js";
import {
  getItem,
  setItem,
} from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedInventoryStatusCode";

const InventoryNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source from useKeysLabels
  const {
    // The AO / Procurement list — the same statuses without the Pending
    // JEV stage, so AO, AOTL and Procurement never see that entry.
    inventoryStatusAoProc,
    isAccountOfficer, // AO and AOTL alike
    isProcurement, // Procurement Officer and TL alike
    isAO,
    isAOTL,
    isManagement,
    isFinanceOfficer,
    inventoryStatus,
    inventoryPendingKey,
    loading: mappingLoading,
  } = useKeysLabels();

  // Pending JEV needs a decision — MANAGEMENT, FINANCE, and the
  // ACCOUNT OFFICERS (a plain AO counts only the groups of transactions
  // assigned to them; the team lead sees all). Other roles never see
  // the alarm on the row.
  const canActOnPendingJev =
    isManagement || isFinanceOfficer || isAO || isAOTL;

  // Account Officers use the full inventory status (including Pending JEV).
  // Procurement uses the procurement list (without Pending JEV).
  const effectiveInventoryStatus = isAccountOfficer
    ? inventoryStatus
    : isProcurement
    ? inventoryStatusAoProc
    : inventoryStatus;

  const safeInventoryStatus = effectiveInventoryStatus || {};
  const entries = Object.entries(safeInventoryStatus);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY);
    return saved || firstCode;
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage = location.pathname === "/inventory";

  const currentUser = useMemo(() => getItem("user", {}), []);
  const currentUserId = currentUser?.nUserId;

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
    window.addEventListener("inventory_status_changed", handler);
    return () =>
      window.removeEventListener("inventory_status_changed", handler);
  }, [selectedCode]);

  // ── Fetch inventory ──
  const fetchInventory = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
      try {
        const res = await InventoryAPI.getInventory();
        setInventoryItems(res.inventories || []);
      } catch (err) {
        console.error("Sidebar inventory fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading],
  );

  const fetchRef = useRef(fetchInventory);
  useEffect(() => {
    fetchRef.current = fetchInventory;
  }, [fetchInventory]);
  useEffect(() => {
    if (!mappingLoading) fetchInventory(false);
  }, [mappingLoading, fetchInventory]);

  // ── Realtime updates ──
  useEffect(() => {
    const onUpdated = () => fetchRef.current(true);
    window.addEventListener("inventory_data_updated", onUpdated);
    window.addEventListener("inventory_data_deleted", onUpdated);
    window.addEventListener("cart_data_updated", onUpdated);

    return () => {
      window.removeEventListener("inventory_data_updated", onUpdated);
      window.removeEventListener("inventory_data_deleted", onUpdated);
      window.removeEventListener("cart_data_updated", onUpdated);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/inventory");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("inventory_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);
  // The Pending entry: matched by key first, then by its label, so the
  // badge can't silently fall back to the raw item count.
  const pendingEntryCode = String(
    (entries.find(
      ([code]) => String(code) === String(inventoryPendingKey ?? ""),
    ) ?? entries.find(([, label]) => /pending/i.test(String(label))))?.[0] ??
      "",
  );

  // ── Pending JEV badge — counts GROUPS, not items ───────────────────
  // Mirrors the Pending screen: per supplier (qty > 0) / client (qty < 0)
  // WITHIN a company — the shared counter in pendingJevGroups.js. A
  // plain AO (not the team lead) only counts the groups of transactions
  // ASSIGNED to them — same rule as the page.
  const pendingGroupCount = useMemo(() => {
    if (!pendingEntryCode) return 0;
    const aoScoped = isAO && !isAOTL && currentUserId != null;
    return countPendingJevGroups(
      inventoryItems.filter((i) => String(i.cStatus) === pendingEntryCode),
      { aoUserId: aoScoped ? currentUserId : undefined },
    );
  }, [inventoryItems, pendingEntryCode, isAO, isAOTL, currentUserId]);

  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<Inventory2Icon fontSize="small" />}
        label="Inventory"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
        // While the status list is folded away, the parent row itself
        // carries the alarm — a blinking triangle before the chevron
        // (management and finance only). Open the section and the row
        // calms — the Pending JEV sub-row takes over.
        attentionWhenCollapsed={canActOnPendingJev && pendingGroupCount > 0}
      >
        {entries.length > 0 ? (
          entries.map(([code, label]) => (
            <SidebarSubmenu
              key={code}
              label={label}
              active={isOnPage && selectedCode === String(code)}
              count={
                String(code) === pendingEntryCode
                  ? pendingGroupCount
                  : inventoryItems.filter(
                      (i) => String(i.cStatus) === String(code),
                    ).length
              }
              countLoading={countLoading}
              // Inventory rows waiting for their JEV keep the blinking
              // triangle on the row until one of the approvers acts —
              // management and finance only.
              attention={
                canActOnPendingJev &&
                String(code) === String(pendingEntryCode) &&
                pendingGroupCount > 0
              }
              onClick={() => handleSelect(String(code))}
            />
          ))
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No inventory statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default InventoryNavSection;
