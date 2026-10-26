import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import JevAPI from "../../../api/endpoints/jev.api.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
import { fmtPHP } from "../../../utils/formatters/formatter.js";
import { fmtDateTime } from "../../../utils/helpers/timeZone.js";
import { getItem, setItem } from "../../../utils/storage/localStorage.js";
import { withSpinner } from "../../../utils/helpers/swal.jsx";

// The sidebar owns the picked JEV type: JevNav writes it here and announces
// every change with a "jev_type_changed" event — the same contract the
// Voucher / Client sections use for their status codes.
const SESSION_KEY = "selectedJevTypeCode";

// "No Type" — the one JEV type this page can CREATE: the view shows its
// Add JEV button on that list alone, and Add writes this code before
// landing the new journal on /jev-update. Mirrors jev_types in
// apiHirams/config/mappings.php; JevNav picks the entry up from the same
// mapping, so the sidebar sub-item and this list always agree.
export const NO_TYPE_CODE = "N";

// Listing of the JEVs of ONE type — the type is chosen in the sidebar's
// "Journal Entry Voucher" section, not by a filter on the page.
//
// Each row opens the journal on its own page (/jev-update?id=…) and carries a
// Delete — the JEV itself may be removed ONLY while it is Pending or
// Cancelled; an Active one shows nothing (the view withholds the button,
// this hook re-checks it too so a stale row can't slip past).
export default function useJournalEntryVoucher() {
  const navigate = useNavigate();
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
  // ── Delete ───────────────────────────────────────────────────────────
  // The view only offers the button for a Pending / Cancelled row; the
  // guard repeats here because the list re-renders off a payload fetched
  // once (the status could have moved to Active since).
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
          // The journal's OWN title — every link type carries one now. The
          // API additionally derives a name per type (strDisplayTitle: the
          // supplier for Received, the client for Delivered, the voucher's
          // assignee / supplier for DV and Collection); the view prints it
          // as the secondary line under the title.
          strTitle: j.strTitle ?? "",
          strPayee: j.strDisplayTitle ?? "",
          total,
          totalLabel: fmtPHP(total),
          statusLabel: jev_status?.[j.cStatus] ?? j.cStatus ?? "—",
          cStatus: j.cStatus ?? "",
          // A No Type row is the only kind this page can create — the gate
          // the Add button keys off.
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

  // ── Viewer — every open lands on the journal's own page ──────────────
  // The list's View (and the shared openJevModal entry point) open
  // /jev-update?id=… — the full-page updater — not the viewer modal.
  const openJevModal = useCallback(
    (row) => {
      const j = row?._raw ?? row;
      if (!j?.nJEVId) return;
      navigate(`/jev-update?id=${j.nJEVId}`);
    },
    [navigate],
  );

  // ── Deep link — /journal-entry-voucher?id=… opens that very journal ──
  // The JEV number printed by the panel header (JevViewPanel) links
  // here, so the list answers the id: it hands the journal straight to
  // its own page.
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get("id");
  // The id already handled — one opening per id, so a refetch (or the
  // close of the modal) never re-opens the journal behind the reader.
  const deepLinkOpenedRef = useRef("");

  useEffect(() => {
    const id = String(deepLinkId ?? "");
    if (!id || deepLinkOpenedRef.current === id) return;
    deepLinkOpenedRef.current = id;
    navigate(`/jev-update?id=${id}`);
  }, [deepLinkId, navigate]);

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

      const num = String(j.strJEVNumber ?? "").trim();

      setEntityToDelete({
        type: "jev",
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

  // ── Add JEV — confirm, then NAME it before it exists ──────────────────
  // Confirming "Create JEV?" opens JEVAEModal — the Title / Date card in a
  // modal, Title already focused. Save is what actually creates the record
  // (today's date prefilled, like the old direct create), then the journal
  // opens on /jev-update?id=….
  const [createJevOpen, setCreateJevOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTitleError, setCreateTitleError] = useState("");
  const [createDateError, setCreateDateError] = useState("");
  // The modal focuses the Title field through this ref on open.
  const createTitleRef = useRef(null);

  const openAddJev = useCallback(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const d = new Date();
    // Local today — never toISOString(), which can already be tomorrow.
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}`;
    // A fresh card every open — no leftovers from a discarded edit.
    setCreateDate(today);
    setCreateTitle("");
    setCreateTitleError("");
    setCreateDateError("");
    setCreateJevOpen(true);
  }, []);

  const handleCloseCreateJev = useCallback(() => {
    setCreateJevOpen(false);
  }, []);

  // Save on the naming modal. The create runs under the global
  // withSpinner overlay (no loading inside the modal): the modal closes
  // first, the spinner covers the request, and the JEV opens on
  // /jev-update?id=… inside it — with the usual SUCCESS / ERROR Swal.
  const handleCreateJev = useCallback(async () => {
    const title = String(createTitle ?? "").trim();
    const date = String(createDate ?? "").trim();

    const titleMsg = !title ? "Title is required." : "";
    const dateMsg = !date ? "Date is required." : "";
    setCreateTitleError(titleMsg);
    setCreateDateError(dateMsg);
    if (titleMsg || dateMsg) return;

    setCreateJevOpen(false);
    try {
      await withSpinner("JEV", async () => {
        const res = await JevAPI.create({
          cJEVLinkType: NO_TYPE_CODE,
          strTitle: title,
          dtOccur: `${date} 00:00:00`,
        });
        const created = res?.nJEVId
          ? res
          : res?.data?.nJEVId
            ? res.data
            : (res?.jev ?? null);
        window.dispatchEvent(new CustomEvent("jev_data_updated"));
        if (created?.nJEVId) navigate(`/jev-update?id=${created.nJEVId}`);
      });
    } catch (err) {
      console.error("Failed to create the JEV:", err);
      // No Swal — the naming modal comes back with the failure message in
      // the Title field, so the values stay and the save can be retried.
      setCreateTitleError("Failed to create. Please try again.");
      setCreateJevOpen(true);
    }
  }, [createTitle, createDate, navigate]);

  // The "Add JEV" button only opens the dialog; this is what actually
  // creates it (same contract as inventory's handleConfirmAction).
  const handleConfirmAction = useCallback(() => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "create_jev") openAddJev();
  }, [confirmAction, openAddJev]);

  // The row is already gone server-side: drop it locally so the table
  // doesn't flicker, then tell the sidebar its per-type badge is stale.
  const handleDeleteSuccess = useCallback(() => {
    if (!entityToDelete?.data) return;
    setJevs((prev) => prev.filter((j) => j.nJEVId !== entityToDelete.data.id));
    window.dispatchEvent(new CustomEvent("jev_data_deleted"));
  }, [entityToDelete]);

  // "Voucher · Petty Cash · Sep 15, 2026" — removed with the viewer modal;
  // /jev-update titles itself.

  const handlePageChange = useCallback((_, p) => setPage(p), []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  // ── Row click / View ────────────────────────────────────────────────
  // Opens the journal on its own page (/jev-update?id=…), not the viewer
  // modal — the full-page updater is this page's View. The deep link
  // below keeps going through the viewer modal (see openJevModal).
  const handleRowClick = useCallback(
    (row) => {
      const j = row?._raw ?? row;
      if (!j?.nJEVId) return;
      navigate(`/jev-update?id=${j.nJEVId}`);
    },
    [navigate],
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
    // Add JEV — the naming modal opened by the confirmation dialog
    createJevOpen,
    createTitle,
    createDate,
    setCreateTitle,
    setCreateDate,
    createTitleError,
    createDateError,
    createTitleRef,
    openAddJev,
    handleCreateJev,
    handleCloseCreateJev,
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
    // Confirmation - create_jev (see handleConfirmAction)
    confirmAction,
    setConfirmAction,
    handleConfirmAction,
  };
}
