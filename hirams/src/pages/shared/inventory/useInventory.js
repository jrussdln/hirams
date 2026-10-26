import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InventoryAPI from "../../../api/endpoints/inventory.api.js";
import CompanyAPI from "../../../api/endpoints/company.api.js";
import JevAPI from "../../../api/endpoints/jev.api.js";
import JevEntriesAPI from "../../../api/endpoints/jev-entries.api.js";
import { computeJevBalance } from "../../../hooks/useJEVBalance.js";
import { showSwal, withSpinner } from "../../../utils/helpers/swal.jsx";

import { getItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
export default function useInventory() {
  const [itemsLoading, setItemsLoading] = useState(false);
  const {
    inventoryStatus,
    loading: mappingLoading, //Keys
    inventoryReceivedKey,
    inventoryDeliveredKey,
    inventoryPendingKey,
    inventoryCancelledKey,
    inventoryReceivedLabel,
    inventoryDeliveredLabel,
    inventoryPendingLabel,
    inventoryCancelledLabel,
    jev_types,
    jev_status,
    jevPendingKey,
    isManagement,
    isFinanceOfficer,
  } = useKeysLabels();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Pending-only split: "all" | "received" (grouped by supplier) |
  // "delivered" (grouped by client)
  const [directionFilter, setDirectionFilter] = useState("all");
  // { scope: "supplier" | "client", name } while a group's item list is open
  const [groupView, setGroupView] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  // Paging is separate for a group's item list so the group table
  // keeps its own position while you drill in and back out.
  const [groupListPage, setGroupListPage] = useState(0);
  // Create JEV button (Pending JEV screen) — in-flight flag
  const [creatingJev, setCreatingJev] = useState(false);
  // Finalize button (Pending JEV screen) — in-flight flag
  const [finalizingJev, setFinalizingJev] = useState(false);
  // "create_jev" | "finalize_jev" while its confirmation dialog is open
  const [confirmAction, setConfirmAction] = useState(null);

  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem("selectedInventoryStatusCode", ""),
  );

  useEffect(() => {
    const handler = (e) => {
      setSelectedStatusCode(e.detail?.code ?? "");
      setPage(0);
      // Picking a status = back to the list, so drop the open details panel
      // and the Pending-only Received/Delivered grouping
      setDetailsOpen(false);
      setSelectedItemId(null);
      setDirectionFilter("all");
      setGroupView(null);
      setConfirmAction(null);
    };
    window.addEventListener("inventory_status_changed", handler);
    return () =>
      window.removeEventListener("inventory_status_changed", handler);
  }, []);

  const fetchItems = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setItemsLoading(true);
    try {
      // ✅ Use getInventory instead of getAll
      const response = await InventoryAPI.getInventory();
      const data = response.inventories || [];
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    } finally {
      if (!silent) setItemsLoading(false);
    }
  }, []);

  const fetchRef = useRef(fetchItems);
  useEffect(() => {
    fetchRef.current = fetchItems;
  }, [fetchItems]);

  useEffect(() => {
    if (!mappingLoading) fetchItems();
  }, [mappingLoading, fetchItems]);

  useEffect(() => {
    CompanyAPI.search("")
      .then((res) => setCompanies(res.companies || []))
      .catch((err) => console.error("Failed to fetch companies:", err));
  }, []);

  useEffect(() => {
    const handlerUpdated = () => {
      console.log("🔄 inventory_data_updated received → Refreshing...");
      fetchRef.current({ silent: true });
    };

    const handlerDeleted = () => {
      console.log("🔄 inventory_data_deleted received → Refreshing...");
      fetchRef.current({ silent: true });
    };

    window.addEventListener("inventory_data_updated", handlerUpdated);
    window.addEventListener("inventory_data_deleted", handlerDeleted); // ← WAS MISSING!
    window.addEventListener("cart_data_updated", handlerUpdated);

    return () => {
      window.removeEventListener("inventory_data_updated", handlerUpdated);
      window.removeEventListener("inventory_data_deleted", handlerDeleted);
      window.removeEventListener("cart_data_updated", handlerUpdated);
    };
  }, []);
  const filteredItems = useMemo(() => {
    let result = selectedStatusCode
      ? items.filter((i) => String(i.cStatus) === String(selectedStatusCode))
      : items;
    // Pending status only — split batches by direction of movement:
    // received batches are stored positive, delivered batches negative.
    // It is grouped per supplier/client AND company, so the
    // "All Companies" filter does not apply there.
    const isPendingStatus =
      inventoryPendingKey &&
      String(selectedStatusCode) === String(inventoryPendingKey);

    if (companyFilter !== "all" && !isPendingStatus)
      result = result.filter((i) => i.strCompanyNickName === companyFilter);

    const q = search.trim().toLowerCase();
    if (q)
      result = result.filter((i) =>
        // Pending is grouped by supplier / client, so search those only
        isPendingStatus
          ? i.strSupplierNickName?.toLowerCase().includes(q) ||
            i.strClientNickName?.toLowerCase().includes(q)
          : i.purchaseOption?.strBrand?.toLowerCase().includes(q) ||
            i.purchaseOption?.strModel?.toLowerCase().includes(q) ||
            i.strSupplierNickName?.toLowerCase().includes(q) ||
            i.strClientNickName?.toLowerCase().includes(q) ||
            i.strCompanyNickName?.toLowerCase().includes(q),
      );

    if (isPendingStatus && directionFilter !== "all") {
      const wantReceived = directionFilter === "received";
      result = result.filter((i) => Number(i.nQuantity) > 0 === wantReceived);
    }

    return result;
  }, [
    items,
    selectedStatusCode,
    companyFilter,
    search,
    inventoryPendingKey,
    directionFilter,
  ]);

  // ── Create JEV (Pending JEV screen) ───────────────────────────────
  // The rows the button acts on: whatever is on screen right now — the
  // open group's items while drilling in, otherwise the whole list.
  // A group also carries its DIRECTION: supplier groups hold the received
  // batches (nQuantity > 0), client groups the delivered ones (< 0), so a
  // delivered group never creates a JEV for a not-yet-delivered batch
  // that merely shares the same client nickname + company.
  const jevScopeRows = useMemo(() => {
    if (!groupView) return filteredItems;
    const field =
      groupView.scope === "supplier"
        ? "strSupplierNickName"
        : "strClientNickName";
    const company = groupView.company ?? "—";
    return filteredItems.filter((r) => {
      const qty = Number(r.nQuantity ?? 0);
      const inDirection = groupView.scope === "supplier" ? qty > 0 : qty < 0;
      return (
        inDirection &&
        (r[field] || "—") === groupView.name &&
        (r.strCompanyNickName || "—") === company
      );
    });
  }, [filteredItems, groupView]);

  // Visible batches that still need a JEV (nJEVId is null on the row).
  const jevPendingCount = useMemo(
    () =>
      jevScopeRows.filter((i) => i.nJEVId == null && Number(i.nQuantity) !== 0)
        .length,
    [jevScopeRows],
  );

  // Already has a JEV? Then there is nothing left to create — the button
  // is hidden outright instead of sitting there disabled.
  const groupHasJev = useMemo(
    () => jevScopeRows.some((i) => i.nJEVId != null),
    [jevScopeRows],
  );

  // ── JEV(s) linked to the open group ──────────────────────────────────
  // nJEVId lives on the rows. Fetched only while a group is open — that
  // is the only place the JEV section and the Finalize button appear.
  const groupJevIdsKey = useMemo(() => {
    if (!groupView) return "";
    return [
      ...new Set(jevScopeRows.map((r) => r.nJEVId).filter((id) => id != null)),
    ].join(",");
  }, [groupView, jevScopeRows]);

  const [groupJevs, setGroupJevs] = useState([]);
  // Bumped after Finalize so the list re-reads the new statuses
  const [jevRefreshKey, setJevRefreshKey] = useState(0);

  useEffect(() => {
    const ids = groupJevIdsKey ? groupJevIdsKey.split(",") : [];
    if (ids.length === 0) {
      setGroupJevs([]);
      return;
    }
    let alive = true;
    Promise.all(
      ids.map((id) =>
        JevAPI.getById(id).catch((err) => {
          console.error(`Failed to fetch JEV ${id}:`, err);
          return null;
        }),
      ),
    ).then((list) => {
      if (alive) setGroupJevs(list.filter(Boolean));
    });
    return () => {
      alive = false;
    };
  }, [groupJevIdsKey, jevRefreshKey]);

  // The group's journal records go stale the moment something edits one —
  // the JEV Info card saving a title is the important case: a once-untitled
  // journal must re-enable Finalize the moment it is named. jev_data_updated
  // / jev_data_deleted are what the JEV write paths and delete modal
  // dispatch after every server-side change.
  useEffect(() => {
    const bump = () => setJevRefreshKey((k) => k + 1);
    window.addEventListener("jev_data_updated", bump);
    window.addEventListener("jev_data_deleted", bump);
    return () => {
      window.removeEventListener("jev_data_updated", bump);
      window.removeEventListener("jev_data_deleted", bump);
    };
  }, []);

  // ── PENDING ONLY ─────────────────────────────────────────────────────
  // This is the Pending JEV screen: only JEVs still at cStatus 'P' belong
  // here. Active / Cancelled ones stay linked to the rows but are dropped
  // from the list (JevViewPanel gates every action on the pending status
  // anyway, so they would render as dead panels).
  const pendingJevs = useMemo(() => {
    const pendingCode = String(jevPendingKey || "P");
    return groupJevs.filter((j) => String(j.cStatus) === pendingCode);
  }, [groupJevs, jevPendingKey]);

  // Expected total of each JEV = the group rows stamped with that nJEVId.
  // bulkCreateJev books the WHOLE group on ONE JEV per direction, so this
  // is normally a single entry — but it stays keyed by nJEVId so a group
  // with rows in both directions (or legacy per-item JEVs) still validates
  // each JEV against ITS OWN rows.
  const jevExpectedTotals = useMemo(() => {
    const totals = {};
    jevScopeRows.forEach((r) => {
      const id = r.nJEVId;
      if (id == null) return;
      const amount =
        Math.abs(Number(r.nQuantity ?? 0)) *
        Number(r.purchaseOption?.dUnitPrice ?? 0);
      totals[id] = (totals[id] ?? 0) + amount;
    });
    return totals;
  }, [jevScopeRows]);

  // ── Balance of every pending JEV of the open group ───────────────────
  const [jevBalances, setJevBalances] = useState({});
  const [balanceTick, setBalanceTick] = useState(0);
  const pendingJevIdsKey = pendingJevs.map((j) => j.nJEVId).join(",");

  // Entries added / edited / deleted in the JEV panel re-run the check so
  // the Finalize button unlocks as soon as the JEV squares up.
  useEffect(() => {
    const ids = pendingJevIdsKey ? pendingJevIdsKey.split(",") : [];
    if (!ids.length) return;
    const handler = (e) => {
      const changed = String(e.detail?.jevId);
      if (ids.some((id) => String(id) === changed))
        setBalanceTick((k) => k + 1);
    };
    window.addEventListener("jev_entry_data_updated", handler);
    window.addEventListener("jev_entry_data_deleted", handler);
    return () => {
      window.removeEventListener("jev_entry_data_updated", handler);
      window.removeEventListener("jev_entry_data_deleted", handler);
    };
  }, [pendingJevIdsKey]);

  useEffect(() => {
    const ids = pendingJevIdsKey ? pendingJevIdsKey.split(",") : [];
    if (!ids.length) {
      setJevBalances({});
      return;
    }
    let alive = true;
    // Every id in flight reads as loading — never trust a stale verdict
    // to keep Finalize enabled while a fresh one is on its way.
    setJevBalances(
      Object.fromEntries(
        ids.map((id) => [id, { balanced: false, loading: true, message: "" }]),
      ),
    );

    Promise.all(
      ids.map((id) =>
        JevEntriesAPI.getByJevId(id)
          .then((res) => {
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            // From = To is the WHOLE rule on this screen. The expected total
            // below is qty × PURCHASE price, but a delivered JEV is booked at
            // the SELLING price, so a perfectly square delivered JEV can never
            // equal it — reconciling here would keep Finalize disabled on a
            // JEV whose two sides already agree.
            return [
              id,
              computeJevBalance(list, jevExpectedTotals[id] ?? 0, {
                requireTotalMatch: false,
              }),
            ];
          })
          .catch((err) => {
            console.error("JEV balance check failed:", err);
            return [
              id,
              {
                balanced: false,
                loading: false,
                message: "JEV entries not balanced yet",
              },
            ];
          }),
      ),
    ).then((pairs) => {
      if (alive) setJevBalances(Object.fromEntries(pairs));
    });

    return () => {
      alive = false;
    };
  }, [pendingJevIdsKey, jevExpectedTotals, balanceTick]);

  const pendingJevCount = pendingJevs.length;
  const jevBalanceLoading = pendingJevs.some(
    (j) => !jevBalances[j.nJEVId] || jevBalances[j.nJEVId].loading,
  );
  const unbalancedJev = pendingJevs.find(
    (j) => !jevBalances[j.nJEVId]?.balanced,
  );
  // TITLE gate — a journal that was never named cannot be finalized (the
  // same rule the voucher's Finalize button enforces). A group holds the
  // first offender; the tooltip names it by number.
  const untitledJev = pendingJevs.find(
    (j) => !String(j.strTitle ?? "").trim(),
  );
  // Tooltip / banner explaining WHY Finalize is disabled — names the
  // offending JEV when the group holds more than one.
  const jevBalanceMessage = !pendingJevCount
    ? ""
    : jevBalanceLoading
      ? "Checking JEV balance…"
      : untitledJev
        ? `${
            pendingJevCount > 1
              ? `${untitledJev.strJEVNumber || "JEV"}: `
              : ""
          }Title is not yet added.`
        : unbalancedJev
          ? `${
              pendingJevCount > 1
                ? `${unbalancedJev.strJEVNumber || "JEV"}: `
                : ""
            }${
              jevBalances[unbalancedJev.nJEVId]?.message ||
              "JEV totals must be equal before finalizing"
            }`
          : "";
  // Finalize is enabled ONLY while every pending JEV of the group balances
  // AND carries a title.
  const canFinalizeJevs =
    pendingJevCount > 0 &&
    !jevBalanceLoading &&
    !untitledJev &&
    !unbalancedJev;

  /**
   * Creates the JEV(s) for the visible pending batches and links them:
   *   For Delivery (received, qty > 0) → cJEVLinkType 'R'
   *   Delivered      (delivered, qty < 0) → cJEVLinkType 'D'
   * One JEV per DIRECTION, covering every batch of that direction in the
   * group — the API books the whole group on a single JEV (cStatus 'P')
   * and stamps nJEVId on each row. A group with rows in both directions
   * therefore gets at most two JEVs (one R, one D).
   */
  const handleCreateJev = useCallback(async () => {
    if (creatingJev) return;

    const unlinked = jevScopeRows.filter((i) => i.nJEVId == null);
    const receivedItemIds = [
      ...new Set(
        unlinked
          .filter((i) => Number(i.nQuantity) > 0)
          .map((i) => i.nPurchaseItemId)
          .filter((id) => id != null),
      ),
    ];
    const deliveredItemIds = [
      ...new Set(
        unlinked
          .filter((i) => Number(i.nQuantity) < 0)
          .map((i) => i.nPurchaseItemId)
          .filter((id) => id != null),
      ),
    ];

    if (!receivedItemIds.length && !deliveredItemIds.length) return;

    setCreatingJev(true);
    try {
      await withSpinner("JEV", async () => {
        if (receivedItemIds.length)
          await InventoryAPI.bulkCreateJev("received", receivedItemIds);
        if (deliveredItemIds.length)
          await InventoryAPI.bulkCreateJev("delivered", deliveredItemIds);
        // Reload so the rows carry their new nJEVId (JEV section included)
        await fetchItems();
        setJevRefreshKey((k) => k + 1);
      });
      await showSwal("SUCCESS", {}, { entity: "JEV", action: "created" });
    } catch (err) {
      console.error("Failed to create JEV:", err);
      await showSwal("ERROR", {}, { entity: "JEV" });
    } finally {
      setCreatingJev(false);
    }
  }, [creatingJev, jevScopeRows, fetchItems]);

  /**
   * Finalizes every pending JEV of the open group (cStatus 'P' → 'A'),
   * then flips the inventory rows those JEVs are stamped on to 'A'
   * (Active) — getInventory then rolls them out of Pending and into the
   * stock / delivered totals. Reached only through the confirmation
   * dialog, and only while each one balances AND carries a title — the
   * Finalize button's disabled state mirrors this.
   */
  const handleFinalizeJevs = useCallback(async () => {
    if (finalizingJev) return;
    // Same rule the button enforces — an untitled journal can never be
    // finalized. Belt-and-braces against a stale row slipping past the
    // disabled state.
    const untitled = pendingJevs.find(
      (j) => !String(j.strTitle ?? "").trim(),
    );
    if (untitled) {
      console.error(
        "Refusing to finalize an untitled JEV:",
        untitled.strJEVNumber || untitled.nJEVId,
      );
      return;
    }
    const ids = pendingJevs.map((j) => j.nJEVId);
    if (!ids.length) return;

    const pendingCode = String(inventoryPendingKey || "P");
    const jevIdSet = new Set(ids.map(String));
    // Only rows still Pending and stamped with one of these JEVs — a
    // Cancelled row that happens to carry the id must stay Cancelled.
    const inventoryIds = items
      .filter(
        (i) =>
          i.nJEVId != null &&
          String(i.cStatus) === pendingCode &&
          jevIdSet.has(String(i.nJEVId)),
      )
      .map((i) => i.nInventoryId);
    // Unlinked batches in this group would still be pending afterwards
    const groupKeepsPending = jevScopeRows.some((i) => i.nJEVId == null);

    setFinalizingJev(true);
    try {
      await withSpinner("JEV", async () => {
        for (const id of ids) {
          await JevAPI.update(id, { cStatus: "toggle" });
        }
        // The JEV is Active now, so its batches are Active too
        if (inventoryIds.length)
          await InventoryAPI.bulkUpdateStatus(inventoryIds, "A");
        await fetchItems();
        setJevRefreshKey((k) => k + 1);
        // Nothing pending left in here — those batches are on the
        // Active side now, so staying would just show an empty table.
        if (!groupKeepsPending) setGroupView(null);
      });
      await showSwal("SUCCESS", {}, { entity: "JEV", action: "finalized" });
    } catch (err) {
      console.error("Failed to finalize JEV:", err);
      await showSwal("ERROR", {}, { entity: "JEV" });
    } finally {
      setFinalizingJev(false);
    }
  }, [
    finalizingJev,
    pendingJevs,
    items,
    inventoryPendingKey,
    jevScopeRows,
    fetchItems,
  ]);

  // ── Confirmations ───────────────────────────────────────────────────
  // The footer buttons only open the dialog; this runs the action it was
  // opened for (same contract as the voucher page's handleConfirmAction).
  const handleConfirmAction = useCallback(async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "create_jev") await handleCreateJev();
    else if (action === "finalize_jev") await handleFinalizeJevs();
  }, [confirmAction, handleCreateJev, handleFinalizeJevs]);

  const handlePageChange = useCallback((_, p) => setPage(p), []);
  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);
  const handleRowClick = useCallback((row) => {
    setSelectedItemId(row._raw.nInventoryId);
    setDetailsOpen(true);
  }, []);
  const handleCompanyFilterChange = useCallback((e) => {
    setCompanyFilter(e.target.value);
    setPage(0);
    setGroupListPage(0);
  }, []);

  // Received / Delivered split (Pending status only)
  const handleDirectionFilterChange = useCallback((e) => {
    setDirectionFilter(e.target.value);
    setGroupView(null);
    setConfirmAction(null);
    setPage(0);
  }, []);

  // Open the item list of one supplier / client group (within its company)
  const openGroupView = useCallback((scope, name, company) => {
    setDetailsOpen(false);
    setSelectedItemId(null);
    setGroupListPage(0);
    setGroupView({ scope, name, company: company ?? "—" });
  }, []);
  const closeGroupView = useCallback(() => {
    setGroupView(null);
    setConfirmAction(null);
  }, []);
  const handleGroupListPageChange = useCallback(
    (_, p) => setGroupListPage(p),
    [],
  );
  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedItemId(null);
  }, []);

  return {
    itemsLoading,
    items,
    companies,
    search,
    setSearch,
    companyFilter,
    directionFilter,
    handleDirectionFilterChange,
    // Create / Finalize JEV (Pending JEV screen)
    creatingJev,
    finalizingJev,
    jevPendingCount,
    groupHasJev,
    pendingJevs,
    canFinalizeJevs,
    jevBalanceMessage,
    jevBalanceLoading,
    // Per-JEV verdicts — PendingInventory renders the voucher-style
    // balance banner from them, one per JEV card.
    jevBalances,
    confirmAction,
    setConfirmAction,
    handleConfirmAction,
    jev_types,
    jev_status,
    jevPendingKey,
    isManagement,
    isFinanceOfficer,
    groupView,
    openGroupView,
    closeGroupView,
    selectedItemId,
    detailsOpen,
    page,
    rowsPerPage,
    groupListPage,
    handleGroupListPageChange,
    selectedStatusCode,
    inventoryStatus,
    inventoryReceivedKey,
    inventoryDeliveredKey,
    inventoryPendingKey,
    inventoryCancelledKey,
    inventoryReceivedLabel,
    inventoryDeliveredLabel,
    inventoryPendingLabel,
    inventoryCancelledLabel,
    filteredItems,
    fetchItems,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    handleCompanyFilterChange,
    closeDetails,
  };
}
