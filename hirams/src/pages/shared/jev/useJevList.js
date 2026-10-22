import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import JevAPI from "../../../api/endpoints/jev.api.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
import { fmtPHP } from "../../../utils/formatters/formatter.js";
import { fmtDate, fmtDateTime } from "../../../utils/helpers/timeZone.js";
import { getItem, setItem } from "../../../utils/storage/localStorage.js";

// The sidebar owns the picked JEV type: JevNav writes it here and announces
// every change with a "jev_type_changed" event — the same contract the
// Voucher / Client sections use for their status codes.
const SESSION_KEY = "selectedJevTypeCode";

// "No Type" — the one JEV type this page can CREATE: JevListView shows
// its Add JEV button (and the per-row pencil) on that list alone, and
// JevAEModal always writes this code. Mirrors jev_types in
// apiHirams/config/mappings.php; JevNav picks the entry up from the same
// mapping, so the sidebar sub-item and this list always agree.
export const NO_TYPE_CODE = "N";

// Listing of the JEVs of ONE type — the type is chosen in the sidebar's
// "Journal Entry Voucher" section, not by a filter on the page.
//
// Each row opens the JEV in the shared viewer modal
// (JevEntriesViewModal), where its entries can be managed, and carries a
// Delete — the JEV itself may be removed ONLY while it is Pending or
// Cancelled; an Active one shows nothing (JevListView withholds the
// button, this hook re-checks it too so a stale row can't slip past).
//
// The ONLY JEVs this page creates are No Type ones: NO_TYPE_CODE below
// gates the Add JEV button and the per-row Edit, both of which open
// JevAEModal (date only — see its header).
export default function useJevList() {
  const {
    jev_types,
    jev_status,
    jevActiveKey,
    jevPendingKey,
    jevCancelledKey,
    // The viewer's entry CRUD is role-gated the same way every other
    // screen gates it — Management or Finance Officer only.
    isManagement,
    isFinanceOfficer,
    loading: mappingLoading,
  } = useKeysLabels();

  const [jevs, setJevs] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [selectedTypeCode, setSelectedTypeCode] = useState("");
  // "all" or a raw jev_status code (A / C / P) — page-local, unlike the type,
  // which the sidebar owns.
  const [statusFilter, setStatusFilter] = useState("all");
  const [jevModal, setJevModal] = useState(null);
  const [jevModalOpen, setJevModalOpen] = useState(false);
  const [jevCreateMode, setJevCreateMode] = useState(false);
  // ── Delete ────────────────────────────────────────────────────────────
  // JevListView only offers the button for a Pending / Cancelled row;
  // the guard repeats here because the list re-renders off a payload
  // fetched once (the status could have moved to Active since).
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);

  // ── Status update ─────────────────────────────────────────────────────
  // The JEV whose status the tooltip is editing — null while closed. The
  // tooltip writes through JevAPI.update and raises jev_data_updated itself,
  // which the listener above turns into a refetch, so no handler lives here.
  // `statusAnchorEl` is the button the panel opens against (an anchored
  // tooltip needs somewhere to sit), cleared together with the target.
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);

  // Confirmations
  // Same contract as inventory's / settings': the button only opens the
  // dialog, handleConfirmAction runs the action it was opened for.
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Add / Edit ────────────────────────────────────────────────────────
  // `jevAETarget` is the JEV being edited — null while adding, which is
  // what tells JevAEModal to show the date alone.
  const [jevAEModalOpen, setJevAEModalOpen] = useState(false);
  const [jevAETarget, setJevAETarget] = useState(null);

  const typeCodes = useMemo(() => Object.keys(jev_types || {}), [jev_types]);
  const firstCode = typeCodes[0] ?? "";

  // ── Fetch ────────────────────────────────────────────────────────────
  // No localStorage payload cache: a JEV row carries its entries AND its
  // voucher relations, which is far too heavy for the 5MB store.
  const fetchJevs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setItemsLoading(true);
    try {
      const res = await JevAPI.getAll();
      const data = Array.isArray(res) ? res : res?.data || [];
      setJevs(data);
    } catch (err) {
      console.error("Failed to fetch JEVs:", err);
    } finally {
      if (!silent) setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mappingLoading) fetchJevs();
  }, [mappingLoading, fetchJevs]);

  // Rows can go stale from another tab / user too: JevController broadcasts
  // every JEV write and RealtimeProvider turns it into jev_data_updated /
  // jev_data_deleted here. The local delete path dispatches the same
  // jev_data_deleted, so this doubles as a confirmation that the row is
  // really gone server-side (the filter above already dropped it).
  useEffect(() => {
    const refresh = () => fetchJevs({ silent: true });
    window.addEventListener("jev_data_updated", refresh);
    window.addEventListener("jev_data_deleted", refresh);
    return () => {
      window.removeEventListener("jev_data_updated", refresh);
      window.removeEventListener("jev_data_deleted", refresh);
    };
  }, [fetchJevs]);

  // ── Selected type — follow the sidebar ───────────────────────────────
  useEffect(() => {
    if (mappingLoading) return;
    const saved = getItem(SESSION_KEY, "");
    if (saved) {
      setSelectedTypeCode(saved);
      return;
    }
    if (firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedTypeCode(firstCode);
    }
  }, [mappingLoading, firstCode]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setItem(SESSION_KEY, code);
      setSelectedTypeCode(code);
      setPage(0);
    };
    window.addEventListener("jev_type_changed", handler);
    return () => window.removeEventListener("jev_type_changed", handler);
  }, []);

  // ── Filter — the sidebar's type, then status, then the search box ─────
  const filteredJevs = useMemo(() => {
    const byType = jevs.filter(
      (j) =>
        (!selectedTypeCode ||
          String(j.cJEVLinkType) === String(selectedTypeCode)) &&
        (statusFilter === "all" || String(j.cStatus) === String(statusFilter)),
    );

    // Status first (Active → Pending → Cancelled), then newest first within
    // each status — dtOccur is "YYYY-MM-DD HH:mm:ss", so a plain string
    // compare already sorts correctly.
    const statusRank = {
      [jevActiveKey]: 0,
      [jevPendingKey]: 1,
      [jevCancelledKey]: 2,
    };
    const rankOf = (j) => statusRank[j.cStatus] ?? 3;

    const sorted = [...byType].sort(
      (a, b) =>
        rankOf(a) - rankOf(b) ||
        String(b.dtOccur ?? "").localeCompare(String(a.dtOccur ?? "")),
    );

    const q = search.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((j) =>
      [
        j.strJEVNumber,
        j.strTitle,
        // Derived for Received / Delivered, so their supplier or client
        // nickname is searchable even though no strTitle is stored.
        j.strDisplayTitle,
        j.strPayeeName,
        j.strCompanyName,
        j.strVoucherNumber,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [
    jevs,
    selectedTypeCode,
    statusFilter,
    search,
    jevActiveKey,
    jevPendingKey,
    jevCancelledKey,
  ]);
  const tableRows = useMemo(
    () =>
      filteredJevs.map((j) => {
        const entries = j.entries ?? [];
        // Debits are stored positive and credits negative (they net to 0),
        // so the JEV's gross total is the sum of the positive side.
        const total = entries.reduce(
          (sum, e) => sum + (Number(e.dAmount) > 0 ? Number(e.dAmount) : 0),
          0,
        );

        return {
          _raw: j,
          id: j.nJEVId,
          // Empty string (not "—") so the table can detect a missing
          // number and render the NO_JEV_NO fallback.
          strJEVNumber: j.strJEVNumber ?? "",
          // Only a No Type JEV owns a strTitle; the API also derives one for
          // Received (supplier nickname) and Delivered (client) rows.
          strTitle: j.strDisplayTitle ?? "",
          total,
          totalLabel: fmtPHP(total),
          statusLabel: jev_status?.[j.cStatus] ?? j.cStatus ?? "—",
          cStatus: j.cStatus ?? "",
          // The Actions column keys Edit off this: only a No Type row is
          // ever edited in place (see openEditJev).
          cJEVLinkType: j.cJEVLinkType ?? "",
          dtOccur: fmtDateTime(j.dtOccur),
          // Whether this row may be deleted, and why not when it may not.
          // The API decides (a paid voucher, a live Purchase Order, a
          // completed transaction all keep their journal), so the button
          // and the API can never disagree.
          bDeletable: j.bDeletable !== false,
          strDeleteBlockReason: j.strDeleteBlockReason ?? "",
        };
      }),
    [filteredJevs, jev_status],
  );

  // ── Viewer ───────────────────────────────────────────────────────────
  const openJevModal = useCallback((row) => {
    const j = row?._raw ?? row;
    if (!j?.nJEVId) return;
    // Rebuilt WITHOUT `entries` → JevViewPanel fetches them fresh with
    // their journal_account data (same trick AccountReportPanel uses).
    setJevModal({
      nJEVId: j.nJEVId,
      strJEVNumber: j.strJEVNumber ?? "",
      // Only a No Type JEV carries one, but the viewer rebuilds its JEV
      // without `entries` — drop this too and the title never renders.
      strTitle: j.strTitle ?? "",
      dtOccur: j.dtOccur ?? "",
      cStatus: j.cStatus ?? "",
      cJEVLinkType: j.cJEVLinkType ?? "",
    });
    setJevCreateMode(false);
    setJevModalOpen(true);
  }, []);

  const closeJevModal = useCallback(() => {
    setJevModalOpen(false);
    setJevCreateMode(false);
  }, []);

  // ── Deep link — /jev?id=… opens that very journal ───────────────────
  // The JEV number printed by the panel header (JevViewPanel) links here,
  // so the list has to answer the id: it opens that JEV in the viewer and
  // moves the sidebar (and the list with it) to the type it belongs to —
  // this page shows one type at a time, and the journal may well be of
  // another.
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get("id");
  // The id already handled — one opening per id, so a refetch (or the
  // close of the modal) never re-opens the journal behind the reader.
  const deepLinkOpenedRef = useRef("");

  useEffect(() => {
    const id = String(deepLinkId ?? "");
    if (!id || deepLinkOpenedRef.current === id) return;
    // The list may still be loading — the journal is opened once it is
    // there.
    const j = jevs.find((x) => String(x.nJEVId) === id);
    if (!j) return;
    deepLinkOpenedRef.current = id;
    if (j.cJEVLinkType && String(j.cJEVLinkType) !== String(selectedTypeCode)) {
      window.dispatchEvent(
        new CustomEvent("jev_type_changed", {
          detail: { code: String(j.cJEVLinkType) },
        }),
      );
    }
    openJevModal(j);
  }, [deepLinkId, jevs, selectedTypeCode, openJevModal]);
  const handleDeleteClick = useCallback(
    (row) => {
      const j = row?._raw ?? row;
      if (!j?.nJEVId) return;
      const removable = [jevPendingKey, jevCancelledKey].includes(j.cStatus);
      if (!removable) return;
      // The API has the last word — a journal that is still on the books
      // (a paid voucher, a live Purchase Order, a completed transaction)
      // is refused there, and the row's disabled button already says so.
      if (j.bDeletable === false) return;

      // ADD this line:
      const num = String(j.strJEVNumber ?? "").trim();

      setEntityToDelete({
        type: "jev",
        // CHANGE this line:
        data: { id: j.nJEVId, name: num || `JEV ${j.nJEVId}` },
      });
      setOpenDeleteModal(true);
    },
    [jevPendingKey, jevCancelledKey],
  );

  const handleCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setEntityToDelete(null);
  }, []);
  // The viewer created the JEV: swap it from create mode to the normal
  // view of the new record, and refresh the list / sidebar badge.
  const handleJevCreated = useCallback((j) => {
    if (!j?.nJEVId) {
      setJevModalOpen(false);
      setJevCreateMode(false);
    } else {
      setJevModal({
        nJEVId: j.nJEVId,
        strJEVNumber: j.strJEVNumber ?? "",
        strTitle: j.strTitle ?? "",
        dtOccur: j.dtOccur ?? "",
        cStatus: j.cStatus ?? "P",
        cJEVLinkType: j.cJEVLinkType ?? NO_TYPE_CODE,
      });
      setJevCreateMode(false);
    }
    window.dispatchEvent(new CustomEvent("jev_data_updated"));
  }, []);
  const openAddJev = useCallback(() => {
    setJevModal(null); // no JEV yet
    setJevCreateMode(true); // viewer opens in create mode
    setJevModalOpen(true);
  }, []);

  // The "Add JEV" button only opens the dialog; this is what actually
  // creates it (same contract as inventory's handleConfirmAction).
  const handleConfirmAction = useCallback(async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "create_jev") openAddJev();
  }, [confirmAction, openAddJev]);

  // The viewer's JEV Info row saved. Keep the record the modal was built
  // from in step so its own header line (type · title · date) can't go
  // stale — the list refetches itself off jev_data_updated, but `jevModal`
  // is this hook's state and would otherwise keep the old values.
  const handleJevInfoSaved = useCallback((patch) => {
    if (!patch) return;
    setJevModal((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const openEditJev = useCallback((row) => {
    const j = row?._raw ?? row;
    if (!j?.nJEVId) return;
    // Type gate REMOVED: Edit is now available for ANY JEV type.
    // Status gate also removed: Active JEVs are now editable too.
    // (Previously this returned early for Active rows, but the user requested
    // that Active JEVs should also be editable.)

    setJevAETarget(j);
    setJevAEModalOpen(true);
  }, []);

  const closeJevAEModal = useCallback(() => setJevAEModalOpen(false), []);

  // The server's JevUpdated broadcast goes toOthers(), so this tab has to
  // tell ITSELF the row changed: the same window event RealtimeProvider
  // raises for every other tab — the listener above refetches the list
  // silently and JevNav recounts its badge.
  const handleJevAESaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("jev_data_updated"));
  }, []);

  // The row is already gone server-side: drop it locally so the table
  // doesn't flicker, then tell the sidebar its per-type badge is stale.
  const handleDeleteSuccess = useCallback(() => {
    if (!entityToDelete?.data) return;
    setJevs((prev) => prev.filter((j) => j.nJEVId !== entityToDelete.data.id));
    window.dispatchEvent(new CustomEvent("jev_data_deleted"));
  }, [entityToDelete]);

  // "Voucher · Petty Cash · Sep 15, 2026" — the type label from the mapping
  // with "Disbursement" dropped, the title a No Type JEV names itself with
  // (no voucher stands behind one), then the day the JEV occurred. Other
  // types keep their full label ("Received Purchases", "Delivered Items",
  // "Collection").
  const jevSubTitle = useMemo(() => {
    if (!jevModal) return "";
    const typeLabel = (jev_types?.[jevModal.cJEVLinkType] ?? "").replace(
      /^Disbursement\s+/i,
      "",
    );
    const day = jevModal.dtOccur ? fmtDate(jevModal.dtOccur) : "";
    const title =
      jevModal.cJEVLinkType === NO_TYPE_CODE ? jevModal.strTitle : "";
    return [typeLabel, title, day].filter(Boolean).join(" · ");
  }, [jevModal, jev_types]);

  const handlePageChange = useCallback((_, p) => setPage(p), []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  const handleRowClick = useCallback(
    (row) => openJevModal(row),
    [openJevModal],
  );

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    setPage(0);
  }, []);

  return {
    itemsLoading,
    search,
    setSearch,
    page,
    rowsPerPage,
    selectedTypeCode,
    statusFilter,
    handleStatusFilterChange,
    mappingLoading,
    jev_types,
    jev_status,
    jevActiveKey,
    jevPendingKey,
    jevCancelledKey,
    // Role flags for the viewer's entry CRUD (Management / Finance Officer)
    isManagement,
    isFinanceOfficer,
    tableRows,
    fetchJevs,
    handlePageChange,
    handleRowsPerPageChange,
    handleRowClick,
    openJevModal,
    closeJevModal,
    jevModal,
    jevModalOpen,
    jevSubTitle,
    // Delete — pending / cancelled JEVs only (see handleDeleteClick)
    openDeleteModal,
    entityToDelete,
    handleDeleteClick,
    handleCloseDeleteModal,
    handleDeleteSuccess,
    // Status — any of A / P / C (see JevStatusUpdateTooltip)
    statusTarget,
    setStatusTarget,
    statusAnchorEl,
    setStatusAnchorEl,
    // Add / Edit — No Type JEVs only (see NO_TYPE_CODE)
    jevAEModalOpen,
    jevAETarget,
    openAddJev,
    openEditJev,
    closeJevAEModal,
    handleJevAESaved,
    jevCreateMode,
    handleJevCreated,
    handleJevInfoSaved,
    // Confirmation - create_jev (see handleConfirmAction)
    confirmAction,
    setConfirmAction,
    handleConfirmAction,
  };
}
