import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, IconButton, Skeleton, useTheme } from "@mui/material";
import {
  AddOutlined,
  EditOutlined,
  DeleteOutline,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from "@mui/icons-material";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import JevEntriesAPI from "../../../../api/endpoints/jev-entries.api.js";
import { fmtPHP, fmtDate } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { loadMappings } from "../../../../utils/storage/mappingCache.js";
import JEVEntryAEModal from "../modal/JEVEntryAEModal.jsx";
import JEVTitleDateUpdate from "./JEVTitleDateUpdate.jsx";
import { warmAccountCache } from "./AccountChainSelect.jsx";

// ── Helper functions for date editing ──────────────────────────────────
const toInputDate = (val) => String(val ?? "").slice(0, 10);
const withTime = (date, original) => {
  const time = String(original ?? "").slice(11, 19);
  return `${date} ${/^\d{2}:\d{2}:\d{2}$/.test(time) ? time : "00:00:00"}`;
};

const useColors = (c) => ({
  slate: {
    border: c.slate.border,
    itemHeaderBg: c.slate.itemHeaderBg,
    divider: c.slate.divider,
    hover: c.slate.hover,
    expandedBg: c.slate.expandedBg,
    outerBg: c.slate.outerBg,
  },
  gray: {
    textHeading: c.gray.textHeading,
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
  blue: {
    bg: c.blue.bg,
    border: c.blue.border,
    hoverBg: c.blue.hover,
    text: c.blue.text,
  },
  purple: {
    bg: c.purple.bg,
    border: c.purple.border,
    text: c.purple.text,
  },
  skeleton: { strong: c.skeleton.strong },
  red: { text: c.red.text, bg: c.red.bg, border: c.red.border },
  green: {
    paid: c.green.paid,
    text: c.green.text,
    bg: c.green.bg,
    border: c.green.border,
  },
});
const resolveAccountLabel = (account) => {
  if (account?.strAccountName) return account.strAccountName;
  if (account?.client) {
    return `Receivables from ${
      account.client.strClientNickName || account.client.strClientName
    }`;
  }
  if (account?.supplier) {
    return `Receivables from ${
      account.supplier.strSupplierNickName || account.supplier.strSupplierName
    }`;
  }
  return "—";
};
const accountNodeLabel = (account) =>
  account?.display_name || resolveAccountLabel(account);

const buildAccountPath = (account) => {
  const path = [];
  let current = account;
  let guard = 0;
  while (current && guard < 10) {
    path.unshift(accountNodeLabel(current));
    current = current.parent ?? null;
    guard++;
  }
  return path.join(" / ");
};

// Fund account = the "From" (credit) account that holds the money.
// TODO: verify this matches how your accounts identify a Fund account.
// If you have a flag (e.g. account.bIsFund), use that instead.
const isFundAccount = (account) =>
  buildAccountPath(account).trim().toLowerCase().startsWith("fund");

export default function JevViewPanel({
  jev,
  voucherNumber,
  onClose,
  particularsGrandTotal = 0,
  equivalentValue,
  jev_types,
  jev_status,
  jevPendingKey,
  // The cancelled status key — it tints the header's status chip.
  jevCancelledKey = "",
  // Whole-panel lock: entries may be viewed but never added / edited /
  // deleted. Set by a caller showing a journal that is already settled —
  // currently a CANCELLED voucher, whose JEV may still be pending when it is
  // shared with another live voucher. Defaults to false so every other caller
  // keeps the status rule below as its only gate.
  readOnly = false,
  // Which JEV statuses may be MANAGED from this panel: "pending" (the
  // default — the voucher, purchase and inventory screens pass nothing
  // and depend on it) or "all" (the JEV list page, where entries are
  // managed whatever the status is).
  entryStatusGate = "pending",
  isJevBalanced,
  jevBalanceLoading,
  isAssigneeType,
  assigneeLinks = [],
  supplierLinks = [],
  isFinanceOfficer,
  isManagement,
  logsPanel = null,
  supplierInfo = null,
  supplierLabel = "Supplier",
  companyName = null,
  clientName = null,
  panelTitle = null,
  flowType = "received",
  // Panel shown under the modal's label instead of the voucher
  // particulars (the inventory screen passes its Items table here)
  itemsPanel = null,
  // True only where the voucher itself is CLOSED or PAID — the sole contexts
  // a cheque may be printed from. Defaults to false so reusing this panel
  // anywhere else never shows the Cheque button.
  isClosedOrPaidVoucher = false,
  showPrintCheque = false,
  onPrintCheque,
  // The header (JEV number · type · status) is on by default — every screen
  // that shows a journal says which one it is. A caller that already prints
  // that identity right above the panel can turn it off.
  showHeader = true,
  // Whether the From / To columns start open. A caller that only wants
  // the journal's identity (the inventory item details) folds them away.
  defaultOpen = true,
  // The JEV number in the header is a LINK: it opens that very journal on
  // the full-page viewer (/jev-update?id=…). A caller that does not want a
  // link there (the number is plain text, not a link) turns it off.
  jevLinkable: jevLinkableProp = true,
  // Open the header's title / date fields on mount. Used right after a
  // JEV is created — the user has to name it before doing anything else.
  startEditing = false,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  // Riding on a screen that already shows this journal — the JEV list page
  // (/journal-entry-voucher) or its full-page viewer (/jev-update) — the
  // number needs no link: its target IS the screen it sits on, even for
  // finance / management.
  const location = useLocation();
  const onJevPage =
    location.pathname === "/journal-entry-voucher" ||
    location.pathname.startsWith("/journal-entry-voucher/") ||
    location.pathname === "/jev-update" ||
    location.pathname.startsWith("/jev-update/");
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const keys = useKeysLabels();
  const cached = useMemo(() => loadMappings() ?? {}, []);
  const typeMap = jev_types ?? cached.jev_types ?? keys.jev_types;
  const statusMap = jev_status ?? cached.jev_status ?? keys.jev_status;
  const pendingStatusKey = jevPendingKey ?? keys.jevPendingKey;
  const cancelledStatusKey = jevCancelledKey || keys.jevCancelledKey;

  // ── The journal's type and status, in words ──────────────────────────
  // "V" and "A" are codes; the header must print "Disbursement Voucher"
  // and "Active". A caller may hand the mappings over; when it does not,
  // they come from the shared mapping cache, so the raw code can never
  // reach the screen. The cache is read straight from storage first, so
  // the very first paint already carries the words.
  const jevId = jev?.nJEVId;
  // The JEV number navigates (it opens /jev-update?id=…) for
  // FINANCE and
  // MANAGEMENT only — every other role reads it as plain text. Callers
  // may hand the flags in; otherwise the signed-in user's roles decide.
  // (?? lets an explicit false from a caller stand, and a caller that
  // says nothing fall back to the user's own roles.)
  const canNavigate =
    (isFinanceOfficer ?? keys.isFinanceOfficer) ||
    (isManagement ?? keys.isManagement);
  // A link needs an id to point at — without one it stays plain text. And
  // on the JEV list page or /jev-update the panel is already showing that
  // very journal, so the number is plain text there for everyone.
  const jevLinkable =
    jevLinkableProp && !!jevId && canNavigate && !onJevPage;

  // ── R / D — inventory-backed JEVs ────────────────────────────────────
  // Received Purchases (R) and Delivered Items (D) are stamped onto
  // inventory rows, so there is no voucher particulars total to cap the
  // entries against. The ONE rule for these is that "To" and "From" end up
  // equal: the entry form REPORTS that state — it never blocks the save.
  // Finalize is the gate that refuses an unbalanced JEV.
  const isInventoryJev = ["R", "D"].includes(
    String(jev?.cJEVLinkType ?? "").toUpperCase(),
  );

  // ── Entry CRUD gate ───────────────────────────────────────────────────
  // readOnly first — a caller showing a settled journal (a cancelled
  // voucher) locks the panel outright. Then the role — Management or
  // Finance Officer, always. Then the status rule: PENDING only unless this
  // panel was opened with entryStatusGate="all" (the JEV list page).
  // Read-only callers mount this panel without the roles at all, which
  // fails the second half of the check and renders no Add / Edit / Delete
  // Entry anywhere.
  const canManageEntries =
    !readOnly &&
    (isManagement || isFinanceOfficer) &&
    (entryStatusGate === "all" || jev?.cStatus === pendingStatusKey);

  const [entries, setEntries] = useState(jev?.entries ?? []);
  const [loading, setLoading] = useState(!jev?.entries);
  // The header's triangle opens and closes the From / To columns.
  const [contentOpen, setContentOpen] = useState(defaultOpen !== false);
  const [titleEditing, setTitleEditing] = useState(!!startEditing);
  const [titleValue, setTitleValue] = useState(
    startEditing ? (jev?.strTitle ?? "") : "",
  );
  const [dateValue, setDateValue] = useState(
    startEditing ? toInputDate(jev?.dtOccur ?? "") : "",
  );
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [savedDate, setSavedDate] = useState(null);
  const [savedTitle, setSavedTitle] = useState(null);
  // Focuses the Title field whenever the header's edit mode opens (the
  // newly created JEV, or a click on EDIT TITLE).
  const titleInputRef = useRef(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formSide, setFormSide] = useState("from");
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    nJournalAccountId: "",
    amount: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  // A failed save says it HERE, in the form — there is no Swal anymore
  // (the modal's own spinner replaced withSpinner, and the SUCCESS /
  // ERROR popups went with it).
  const [saveError, setSaveError] = useState("");

  const fetchEntries = useCallback(async () => {
    if (!jevId) return;
    setLoading(true);
    try {
      const res = await JevEntriesAPI.getByJevId(jevId);
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setEntries(list);
    } catch (err) {
      console.error("Failed to fetch JEV entries:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [jevId]);

  // A different journal in this panel must never inherit the previous one's
  // in-progress edit or its locally saved title / date. A freshly created
  // JEV opens straight into its fields (startEditing) instead.
  useEffect(() => {
    setTitleEditing(!!startEditing);
    setTitleValue(startEditing ? (jev?.strTitle ?? "") : "");
    setDateValue(startEditing ? toInputDate(jev?.dtOccur ?? "") : "");
    setTitleError("");
    setDateError("");
    setSavedDate(null);
    setSavedTitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jevId]);

  // Put the caret in the Title field as soon as edit mode opens. The tick
  // lets it win over the modal's own focus trap.
  useEffect(() => {
    if (!titleEditing) return;
    const t = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [titleEditing]);

  const startEditInfo = () => {
    setTitleValue(savedTitle ?? jev?.strTitle ?? "");
    setDateValue(toInputDate(savedDate ?? jev?.dtOccur ?? ""));
    setTitleError("");
    setDateError("");
    setTitleEditing(true);
  };

  const cancelEditInfo = () => {
    setTitleEditing(false);
    setTitleValue("");
    setDateValue("");
    setTitleError("");
    setDateError("");
  };

  const saveInfo = async () => {
    const date = String(dateValue ?? "").trim();
    const title = String(titleValue ?? "").trim();

    const dateMsg = date ? "" : "Date is required.";
    const titleMsg = !title ? "Title is required." : "";

    setDateError(dateMsg);
    setTitleError(titleMsg);
    if (dateMsg || titleMsg) return;

    setInfoSaving(true);
    try {
      const dtOccur = withTime(date, savedDate ?? jev?.dtOccur ?? "");
      await JevAPI.update(jevId, {
        dtOccur,
        strTitle: title,
      });
      setSavedDate(dtOccur);
      setSavedTitle(title);
      setTitleEditing(false);
      setTitleValue("");
      setDateValue("");
      window.dispatchEvent(new CustomEvent("jev_data_updated"));
    } catch (err) {
      console.error("Failed to update JEV info:", err);
      const message = err?.response?.data?.message || "Failed to update. Please try again.";
      setDateError(message);
      setTitleError(message);
    } finally {
      setInfoSaving(false);
    }
  };

  useEffect(() => {
    if (!jev?.entries) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jevId]);

  // Preload the account lists while the panel itself loads, so the
  // Add Entry / Edit Entry modal opens with accounts already in memory
  // instead of waiting on the network.
  useEffect(() => {
    warmAccountCache();
  }, []);

  const fromEntries = useMemo(
    () => entries.filter((e) => Number(e.dAmount) < 0),
    [entries],
  );
  const toEntries = useMemo(
    () => entries.filter((e) => Number(e.dAmount) >= 0),
    [entries],
  );

  const fromTotal = useMemo(
    () =>
      fromEntries.reduce((sum, e) => sum + Math.abs(Number(e.dAmount || 0)), 0),
    [fromEntries],
  );

  // ── Header tint — the journal's status drives its colour ───────────────
  const isPendingJev = String(jev?.cStatus ?? "") === String(pendingStatusKey ?? "");
  const isCancelledJev =
    String(jev?.cStatus ?? "") === String(cancelledStatusKey ?? "");
  const statusTint = isPendingJev
    ? {
        bg: colors.purple.bg,
        border: colors.purple.border,
        text: colors.purple.text,
      }
    : isCancelledJev
      ? {
          bg: colors.red.bg,
          border: colors.red.border,
          text: colors.red.text,
        }
      : {
          bg: colors.green.bg,
          border: colors.green.border,
          text: colors.green.text,
        };

  // The status chip sits in the header's action row, left of the Edit
  // Title button.
  const statusBadge = (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 0.6,
        py: 0.2,
        borderRadius: "99px",
        background: statusTint.bg,
        border: `1px solid ${statusTint.border}`,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.5rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: statusTint.text,
          lineHeight: 1,
        }}
      >
        {statusMap?.[jev?.cStatus] ?? jev?.cStatus ?? "—"}
      </Typography>
    </Box>
  );

  const toTotal = useMemo(
    () =>
      toEntries.reduce((sum, e) => sum + Math.abs(Number(e.dAmount || 0)), 0),
    [toEntries],
  );

  // ── To/From state for those JEVs ─────────────────────────────────────
  // Handed to the entry form as a message in the same wording style as the
  // old cap ("… ₱265,000.00 · Remaining max: ₱…"), but purely informative.
  const balanceHint = useMemo(() => {
    if (!isInventoryJev) return null;
    const balanced = Math.abs(fromTotal - toTotal) < 0.005;
    return {
      balanced,
      text: balanced
        ? `To and From are equal: To ₱${fmtPHP(toTotal)} = From ₱${fmtPHP(fromTotal)}`
        : `To and From must be equal. To: ₱${fmtPHP(toTotal)} · From: ₱${fmtPHP(fromTotal)} · Difference: ₱${fmtPHP(
            Math.abs(toTotal - fromTotal),
          )}`,
    };
  }, [isInventoryJev, fromTotal, toTotal]);

  const fromAccountIds = useMemo(
    () => fromEntries.map((e) => Number(e.nJournalAccountId)).filter(Boolean),
    [fromEntries],
  );
  const toAccountIds = useMemo(
    () => toEntries.map((e) => Number(e.nJournalAccountId)).filter(Boolean),
    [toEntries],
  );

  const usedAccountIds = useMemo(() => {
    const ids = formSide === "from" ? fromAccountIds : toAccountIds;
    if (editingEntry?.nJournalAccountId) {
      const editingId = Number(editingEntry.nJournalAccountId);
      return ids.filter((id) => id !== editingId);
    }
    return ids;
  }, [formSide, fromAccountIds, toAccountIds, editingEntry]);

  const oppositeSideAccountIds = useMemo(
    () => (formSide === "from" ? toAccountIds : fromAccountIds),
    [formSide, toAccountIds, fromAccountIds],
  );

  // ── Entry triggers ───────────────────────────────────────────────────
  // Add / Edit Entry ALWAYS opens the built-in JEVEntryAEModal modal —
  // the inline form hand-off (onEntryAction → JEVTitleDateUpdate) is retired.
  const handleEntryAction = ({ type, side, entry = null }) => {
    type === "add" ? openAdd(side) : openEdit(entry, side);
  };

  const openAdd = (side) => {
    setFormSide(side);
    setEditingEntry(null);
    setFormData({ nJournalAccountId: "", journalAccount: null, amount: "" });
    setFormErrors({});
    setSaveError("");
    setFormOpen(true);
  };

  const openEdit = (entry, side) => {
    setFormSide(side);
    setEditingEntry(entry);
    setFormData({
      nJournalAccountId: entry.nJournalAccountId ?? "",
      journalAccount: entry.journal_account,
      amount: Math.abs(Number(entry.dAmount || 0)),
    });
    setFormErrors({});
    setSaveError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingEntry(null);
    setSaveError("");
  };

  // The modal path owns its validation and
  // save through handleSaveEntry below.
  const handleSaveEntry = async () => {
    const errs = {};
    const grandTotal = Number(particularsGrandTotal) || 0;
    const amount = Number(formData.amount) || 0;
    const selectedAccountId = Number(formData.nJournalAccountId);

    if (!formData.nJournalAccountId)
      errs.nJournalAccountId = "Account is required";
    if (!formData.amount || amount <= 0) errs.amount = "Amount must be > 0";

    if (selectedAccountId && usedAccountIds.includes(selectedAccountId)) {
      errs.nJournalAccountId =
        "This account already exists here — please choose a different one.";
    }

    if (
      selectedAccountId &&
      oppositeSideAccountIds.includes(selectedAccountId)
    ) {
      errs.nJournalAccountId =
        "Cannot use the same account in both From and To.";
    }

    // A voucher JEV is capped by its particulars. An R/D JEV is NOT: the
    // only rule there is To = From, which the form shows as a line instead
    // of refusing the save.
    if (grandTotal > 0 && !isInventoryJev) {
      const currentTotal = formSide === "from" ? fromTotal : toTotal;
      let newSideTotal;

      if (editingEntry) {
        const originalAmount = Math.abs(Number(editingEntry.dAmount || 0));
        newSideTotal = currentTotal - originalAmount + amount;
      } else {
        newSideTotal = currentTotal + amount;
      }

      if (newSideTotal > grandTotal) {
        const remaining =
          grandTotal -
          (editingEntry
            ? currentTotal - Math.abs(Number(editingEntry.dAmount || 0))
            : currentTotal);
        errs.amount = `Total cannot exceed ₱${grandTotal.toFixed(2)}. Remaining max: ₱${Math.max(0, remaining).toFixed(2)}`;
      }
    }

    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    const signedAmount =
      formSide === "from" ? -Math.abs(amount) : Math.abs(amount);

    // Spinner lives INSIDE the modal, not over the whole screen: the
    // form stays put and its own ModalContainer renders `loading`
    // (JEVEntryAEModal passes `saving` straight in). `withSpinner`'s
    // Swal overlay would have covered the modal instead — and the form
    // used to be closed first, so the modal's spinner never even got
    // to show.
    // No Swal either end: success is the form closing over the
    // refreshed entries, failure is the message under the fields.
    setSaveError("");
    setSaving(true);
    try {
      // 25s so a wedged request can never hold the viewer's footer (and
      // its content lock) hostage for the axios-wide 120s.
      const timeout = { timeout: 25000 };
      editingEntry
        ? await JevEntriesAPI.update(
            editingEntry.nJEVEntryId,
            {
              nJEVId: jevId,
              nJournalAccountId: formData.nJournalAccountId,
              dAmount: signedAmount,
            },
            timeout,
          )
        : await JevEntriesAPI.create(
            {
              nJEVId: jevId,
              nJournalAccountId: formData.nJournalAccountId,
              dAmount: signedAmount,
            },
            timeout,
          );
      await fetchEntries();
      notifyEntryUpdated(); // sync voucher-level balance in the same tab
      closeForm();
    } catch (err) {
      console.error("Save JEV entry failed:", err);
      // Form untouched: same values, same validation, ready to retry.
      setSaveError(
        err?.message || "Saving the entry failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    await JevEntriesAPI.delete(entry.nJEVEntryId);
    await fetchEntries();
    notifyEntryDeleted(entry.nJEVEntryId); // sync voucher-level balance
  };
  const notifyEntryUpdated = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("jev_entry_data_updated", { detail: { jevId } }),
    );
  }, [jevId]);

  const notifyEntryDeleted = useCallback(
    (entryId) => {
      window.dispatchEvent(
        new CustomEvent("jev_entry_data_deleted", {
          detail: { jevId, jevEntryId: entryId },
        }),
      );
    },
    [jevId],
  );

  // Listen for real-time changes to this JEV's entries (e.g. from another
  // tab/user) so this panel stays in sync without a full voucher reload.
  useEffect(() => {
    if (!jevId) return;

    const handleChange = (e) => {
      const eventJevId = e.detail?.jevId;
      if (String(eventJevId) !== String(jevId)) return;
      fetchEntries();
    };

    window.addEventListener("jev_entry_data_updated", handleChange);
    window.addEventListener("jev_entry_data_deleted", handleChange);
    return () => {
      window.removeEventListener("jev_entry_data_updated", handleChange);
      window.removeEventListener("jev_entry_data_deleted", handleChange);
    };
  }, [jevId, fetchEntries]);

  // Cheque is a closed-voucher action (CLOSED or PAID). Only the voucher
  // page declares that context, so every other place this panel is reused —
  // purchase, item purchasing, previews — keeps the button hidden even if it
  // ever passes showPrintCheque/onPrintCheque.
  const canPrintCheque =
    !!isClosedOrPaidVoucher && !!showPrintCheque && !!onPrintCheque;

  const renderColumn = (label, icon, list, side, total, grid) => (
    <Box
      sx={{
        // The columns and the total band share ONE grid, so the rule that
        // runs between them lines up exactly.
        gridColumn: grid?.column,
        gridRow: grid?.row,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: "20vh",
        maxHeight: "30vh",
        ...(grid?.divider && {
          // Just the rule — the column's own padding puts its content the
          // same distance from the rule as the From column is from the edge.
          borderLeft: `0.5px solid ${colors.slate.divider}`,
        }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.6,
          // A rule under the label so the column reads as a headed section
          // now that it has no box of its own.
          borderBottom: `0.5px solid ${colors.slate.divider}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {icon}
          <Typography
            sx={{
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.gray.textHeading,
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
        </Box>
        {canManageEntries && (
          <IconButton
            size="small"
            onClick={() => handleEntryAction({ type: "add", side })}
            sx={{
              width: "auto",
              height: 24,
              px: 0.75,
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              bgcolor: colors.blue.bg,
              border: `0.5px solid ${colors.blue.border}`,
              "&:hover": { bgcolor: colors.blue.hoverBg },
            }}
          >
            <AddOutlined
              sx={{ fontSize: "0.85rem", color: colors.blue.text }}
            />
            <Typography
              sx={{
                fontSize: "0.5rem",
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: colors.gray.textHeading,
              }}
            >
              Entry
            </Typography>
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          [1, 2].map((i) => (
            <Box key={i} sx={{ px: 1.5, py: 1 }}>
              <Skeleton
                variant="text"
                width="70%"
                height={14}
                sx={{ bgcolor: colors.skeleton.strong }}
              />
            </Box>
          ))
        ) : list.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography
              sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}
            >
              No entries yet.
            </Typography>
          </Box>
        ) : (
          list.map((entry, idx) => (
            <Box
              key={entry.nJEVEntryId}
              sx={{
                px: 1.5,
                py: 0.875,
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom:
                  idx < list.length - 1
                    ? `0.5px solid ${colors.slate.divider}`
                    : "none",
                "&:hover": { background: colors.slate.hover },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.gray.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {buildAccountPath(entry.journal_account) || "—"}
                </Typography>
              </Box>

              <Typography
                component="span"
                sx={{
                  fontSize: "0.68rem",
                  color: colors.gray.textSecondary,
                  minWidth: "90px",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {canPrintCheque &&
                  side === "from" &&
                  isFundAccount(entry.journal_account) && (
                    <Box
                      component="span"
                      onClick={() => onPrintCheque(entry)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 0.75,
                        py: 0.25,
                        mr: 1,
                        borderRadius: "7px",
                        bgcolor: colors.blue.bg,
                        border: `0.5px solid ${colors.blue.border}`,
                        cursor: "pointer",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        "&:hover": { bgcolor: colors.blue.hoverBg },
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: colors.gray.textHeading,
                        }}
                      >
                        Cheque
                      </Typography>
                    </Box>
                  )}
                {fmtPHP(Math.abs(Number(entry.dAmount || 0)))}
              </Typography>

              {canManageEntries && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    flexShrink: 0,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleEntryAction({ type: "edit", side, entry })}
                    sx={{
                      width: 18,
                      height: 18,
                      p: 0,
                      flexShrink: 0,
                      color: colors.gray.textSecondary,
                    }}
                  >
                    <EditOutlined sx={{ fontSize: "0.75rem" }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteEntry(entry)}
                    sx={{
                      width: 18,
                      height: 18,
                      p: 0,
                      flexShrink: 0,
                      color: colors.red.text,
                    }}
                  >
                    <DeleteOutline sx={{ fontSize: "0.75rem" }} />
                  </IconButton>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* ── JEV Info card — the Title / Date form ABOVE the panel ──
          While it is open the panel itself stays hidden: the card is
          the only thing on screen until Save / Close. */}
      {titleEditing && (
        <JEVTitleDateUpdate
          titleValue={titleValue}
          dateValue={dateValue}
          onTitleChange={(e) => {
            setTitleValue(e.target.value);
            if (titleError) setTitleError("");
          }}
          onDateChange={(e) => {
            setDateValue(e.target.value);
            if (dateError) setDateError("");
          }}
          titleError={titleError}
          dateError={dateError}
          saving={infoSaving}
          titleInputRef={titleInputRef}
          onSave={saveInfo}
          onCancel={cancelEditInfo}
        />
      )}

      {/* ── The JEV view panel itself — hidden while the JEV Info card
          above is open ── */}
      {!titleEditing && (
        <Box
          sx={{
            borderRadius: "10px",
            border: `0.5px solid ${colors.slate.border}`,
            background: colors.slate.outerBg,
            overflow: "hidden",
          }}
        >
      {/* HEADER — the journal's own number, title and status, in the same
          shape as the voucher's card header: the number, the title with its
          status badge, the type under it, and a triangle on the right that
          opens and closes the From / To columns. */}
      {showHeader && (
        <Box
          onClick={() => {
            // The header folds the From / To columns; the title / date
            // fields live on the card above, so editing never blocks it.
            setContentOpen((v) => !v);
          }}
          sx={{
            display: "flex",
            // The triangle sits in the middle of the header, not at its top.
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 1,
            background: colors.slate.itemHeaderBg,
            borderBottom: contentOpen
              ? `0.5px solid ${colors.slate.divider}`
              : "none",
            cursor: "pointer",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* The JEV code hides while editing — its fields live in the
                JEV Info card above the panel, and Save / Cancel sit in
                this header for the duration. */}
            {!titleEditing && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography
                  component={jevLinkable ? "button" : "span"}
                  onClick={
                    jevLinkable
                      ? (e) => {
                          // The header folds the From / To columns on its own —
                          // the link must not fold them on the way out.
                          e.stopPropagation();
                          navigate(`/jev-update?id=${jevId}`);
                        }
                      : undefined
                  }
                  title={jevLinkable ? "Open this JEV" : undefined}
                  sx={{
                    // Same look as the DV number on the voucher card.
                    fontSize: { xs: "0.5rem", sm: "0.55rem", md: "0.58rem" },
                    fontWeight: 700,
                    // Blue when it opens the journal — it is a link then.
                    color: jevLinkable
                      ? colors.blue.text
                      : colors.gray.textMuted,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: jevLinkable ? "inline-block" : "inherit",
                    width: jevLinkable ? "fit-content" : "auto",
                    p: 0,
                    border: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    cursor: jevLinkable ? "pointer" : "inherit",
                    "&:hover": jevLinkable
                      ? { textDecoration: "underline" }
                      : undefined,
                  }}
                >
                  {jev?.strJEVNumber || "—"}
                </Typography>
              </Box>
            )}

            {/* What it is — the kind of journal, then the specific type.
                While the Title / Date fields are open (EDIT TITLE) the
                header keeps showing them — the fields live in the JEV
                Info card ABOVE this panel now. */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 0.2,
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "0.62rem", sm: "0.68rem", md: "0.75rem" },
                  fontWeight: 500,
                  color: colors.gray.textPrimary,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {(savedTitle ?? jev?.strTitle) || "Title is not yet added."}
              </Typography>
            </Box>

            {/* The type — the label of the journal. */}
            <Typography
              sx={{
                fontSize: { xs: "0.5rem", sm: "0.55rem", md: "0.58rem" },
                fontWeight: 600,
                fontStyle: "italic",
                color: colors.gray.textMuted,
                textTransform: "uppercase",
                lineHeight: 1,
                mt: 0.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {typeMap?.[jev?.cJEVLinkType] ?? jev?.cJEVLinkType ?? "—"}
            </Typography>

            {/* Date display under the type */}
            <Typography
              sx={{
                fontSize: { xs: "0.48rem", sm: "0.52rem", md: "0.55rem" },
                fontWeight: 500,
                color: colors.gray.textMuted,
                lineHeight: 1,
                mt: 0.1,
              }}
            >
              {fmtDate(savedDate ?? jev?.dtOccur ?? "")}
            </Typography>
          </Box>

          {/* STATUS — sits before the panel's actions, after the title
              block: it always travels with the title. */}
          {statusBadge}

          {/* EDIT TITLE — a round icon button just left of the toggle.
              While the fields are open the actions live on the card
              itself (Close / Save in its footer). */}
          {canManageEntries && !titleEditing && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                startEditInfo();
              }}
              title="Edit title and date"
              sx={{
                width: 22,
                height: 22,
                p: 0,
                flexShrink: 0,
                color: colors.blue.text,
                border: `0.5px solid ${colors.slate.border}`,
                borderRadius: "50px",
                "&:hover": { bgcolor: colors.blue.bg },
              }}
            >
              <EditOutlined sx={{ fontSize: "0.7rem" }} />
            </IconButton>
          )}

          {/* The fold toggle — available in every state, edit mode
              included: the fields sit on the card above, not here. */}
          <IconButton
            size="small"
            onClick={(e) => {
              // The header toggles on its own — the button must not double up.
              e.stopPropagation();
              setContentOpen((v) => !v);
            }}
            title={contentOpen ? "Hide the entries" : "Show the entries"}
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              color: colors.gray.textMuted,
              border: `0.5px solid ${colors.slate.border}`,
              borderRadius: "50px",
              p: 0,
              flexShrink: 0,
            }}
          >
            {contentOpen ? (
              <KeyboardArrowUp sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
            ) : (
              <KeyboardArrowDown
                sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
              />
            )}
          </IconButton>
        </Box>
      )}

      {contentOpen && (
        <Box>
          {/* Add / Edit Entry opens the JEVEntryAEModal rendered at the
              bottom of this panel — there is no inline form section
              anymore, and the columns never disappear behind a form.
              The columns and the total band are ONE grid — two columns,
              two rows — so the rule that separates From from To and the
              rule in the total band sit on the same line. */}
          <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              {renderColumn(
                "From",
                <ArrowUpwardOutlined
                  sx={{ fontSize: "0.85rem", color: colors.red.text }}
                />,
                fromEntries,
                "from",
                fromTotal,
                { column: "1", row: "1" },
              )}
              {renderColumn(
                "To",
                <ArrowDownwardOutlined
                  sx={{ fontSize: "0.85rem", color: colors.green.paid }}
                />,
                toEntries,
                "to",
                toTotal,
                { column: "2", row: "1", divider: true },
              )}

              {[
                {
                  label: "Total",
                  value: fromTotal,
                  column: "1",
                  divider: false,
                },
                { label: "Total", value: toTotal, column: "2", divider: true },
              ].map((cell) => (
                <Box
                  // The COLUMN, not the label: both cells read "Total", so
                  // keying off the label gave them the same key.
                  key={`total-${cell.column}`}
                  sx={{
                    gridColumn: cell.column,
                    gridRow: "2",
                    minWidth: 0,
                    px: 1.5,
                    py: 0.875,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 1,
                    borderTop: `0.5px solid ${colors.slate.divider}`,
                    bgcolor: colors.slate.expandedBg,
                    ...(cell.divider && {
                      borderLeft: `0.5px solid ${colors.slate.divider}`,
                    }),
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: colors.gray.textHeading,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: colors.gray.textPrimary,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtPHP(cell.value)}
                  </Typography>
                </Box>
              ))}
            </Box>
        </Box>
      )}

      {/* The built-in modal path — every Add / Edit Entry click opens
          the JEV entry form as a modal, for every caller. */}
      <JEVEntryAEModal
          open={formOpen}
          onClose={closeForm}
          side={formSide}
          editingEntry={editingEntry}
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          saving={saving}
          saveError={saveError}
          onSave={handleSaveEntry}
          particularsGrandTotal={particularsGrandTotal}
          equivalentValue={equivalentValue}
          sideTotal={formSide === "from" ? fromTotal : toTotal}
          usedAccountIds={usedAccountIds}
          oppositeSideAccountIds={oppositeSideAccountIds}
          isAssigneeType={isAssigneeType}
          assigneeLinks={assigneeLinks}
          supplierLinks={supplierLinks}
          voucherNumber={voucherNumber}
          companyName={companyName}
          logsPanel={logsPanel}
          panelTitle={panelTitle}
          flowType={flowType}
          itemsPanel={itemsPanel}
          balanceHint={balanceHint}
          supplierInfo={supplierInfo}
          clientName={clientName}
        />
        </Box>
      )}
    </Box>
  );
}
