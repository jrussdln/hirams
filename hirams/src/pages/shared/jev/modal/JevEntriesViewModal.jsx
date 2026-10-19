import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CheckOutlined, EditOutlined, WarningAmberOutlined, CloseOutlined } from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import JevViewPanel from "../components/JevViewPanel.jsx";
import useJevBalance, { computeJevBalance } from "../hooks/useJevBalance.js";
import POListPanel from "../../voucher/components/POListPanel.jsx";
import AssigneeListPanel from "../../voucher/components/AssigneeListPanel.jsx";
import { SectionLabel } from "../../voucher/sub-pages/voucher-update/VoucherUpdateView.jsx";
import VoucherAPI from "../../../../api/endpoints/voucher.api.js";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import JevEntriesAPI from "../../../../api/endpoints/jev-entries.api.js";
import InventoryAPI from "../../../../api/endpoints/inventory.api.js";
import ItemsTable from "../../inventory/component/ItemsTable.jsx";
import {
  mapInventoryItems,
  itemTotal,
  isDeliveredRow,
} from "../../inventory/itemRows.js";
import useSellingPrices from "../../inventory/useSellingPrices.js";
import { fmtDate } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const makeColors = (c) => ({
  border: c.slate.border,
  itemHeaderBg: c.slate.itemHeaderBg,
  textPrimary: c.gray.textPrimary,
  textMuted: c.gray.textMuted,
  red: { text: c.red.text },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  // Amber warning tint for the unbalanced-JEV banner — the same trio
  // JevViewSection paints its balance banner with.
  amber: {
    warnBg: c.amber.warnBg,
    warnBorder: c.amber.warnBorder,
    warnText: c.amber.warnText,
  },
  neutral: {
    bg: c.slate.itemHeaderBg,
    border: c.slate.border,
    text: c.gray.textPrimary,
  },
});

// ── JEV date helpers — the very rules JevAEModal writes by ─────────────
// The value a <input type="date"> wants: "YYYY-MM-DD". Both what the API
// returns ("2026-10-08 14:30:00") and an ISO string are already shaped
// that way in their first ten characters.
const toInputDate = (val) => String(val ?? "").slice(0, 10);

// Only the DATE ever moves: the time of day the JEV was booked at is
// carried over as it was, so an inline edit can never shift the
// bookkeeping time on top of the date.
const withTime = (date, original) => {
  const time = String(original ?? "").slice(11, 19);
  return `${date} ${/^\d{2}:\d{2}:\d{2}$/.test(time) ? time : "00:00:00"}`;
};

const pad = (n) => String(n).padStart(2, "0");

// Local today — never toISOString(), which can already be tomorrow in PHT.
const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// jev_status codes straight from config/mappings.php — the same literals
// JevStatusUpdateTooltip paints its radios with. Only these two matter here:
// an ACTIVE JEV left unbalanced by its own entries is put back to PENDING
// when this viewer closes (see handleClose / demoteIfUnbalanced).
const STATUS_ACTIVE = "A";
const STATUS_PENDING = "P";

// Plain button, same 40px height as the date field / display box.
const dateBtnSx = (tint) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 0.5,
  height: 32,
  px: 1.5,
  boxSizing: "border-box",
  borderRadius: "7px",
  border: `0.5px solid ${tint.border}`,
  bgcolor: tint.bg,
  color: tint.text,
  fontFamily: "inherit",
  fontSize: "0.7rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  "&:hover": { filter: "brightness(0.95)" },
  "&:disabled": { opacity: 0.5, cursor: "default" },
});

// Card shell: header bar (title left, actions right) over the fields.
const InfoCard = ({ title, actions, editing, colors, children }) => (
  <Box
    sx={{
      border: `0.5px solid ${editing ? colors.blue.border : colors.border}`,
      borderRadius: "10px",
      overflow: "hidden",
      mb: 1,
      transition: "border-color .15s",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 1.5,
        minHeight: 44,
        boxSizing: "border-box",
        bgcolor: editing ? colors.blue.bg : colors.itemHeaderBg,
        borderBottom: `0.5px solid ${editing ? colors.blue.border : colors.border}`,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: editing ? colors.blue.text : colors.textMuted,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>{actions}</Box>
    </Box>
    <Box sx={{ p: 1.5 }}>{children}</Box>
  </Box>
);

// Read-only label-over-value for the card's view state.
const InfoField = ({ label, value, colors }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      sx={{
        fontSize: "0.58rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: colors.textMuted,
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: "0.85rem",
        fontWeight: 600,
        color: colors.textPrimary,
        overflowWrap: "anywhere",
      }}
    >
      {value}
    </Typography>
  </Box>
);

/**
 * Viewer for ONE JEV — opened from the Account Report's "JEV No." column
 * and from the JEV list page (see AccountReportPanel / JevListView).
 *
 * Laid out exactly like VoucherUpdateView: a top block first
 * (SectionLabel + POListPanel / AssigneeListPanel with their Grand Total
 * footer), then "Journal Entry Voucher" over the From / To columns of
 * JevViewPanel — the same component the voucher and purchase pages use.
 *
 * What the top block holds depends on what the JEV was made from:
 *
 *   • V / C types → the voucher's Particulars, loaded on open and cached
 *     per JEV id. Only printed when it has rows.
 *   • R / D types (Received Purchases / Delivered Items) → NO voucher
 *     exists behind them, so the block is the inventory Items table.
 *     R lists the batches this JEV actually covers; D lists the WHOLE
 *     delivered group (same client + company), as JevEntryAEModal does.
 *   • N (No Type / Other JEV) → neither a voucher nor inventory stands
 *     behind it, so the JEV names ITSELF: `strTitle` is edited right in
 *     the JEV Info row, alongside the date, and is required there (the
 *     column is the only label such a JEV ever has).
 *
 * Entries are MANAGED only where the caller says so: `entryCrud` is
 * passed by the JEV list page as { isManagement, isFinanceOfficer }, and
 * it unlocks the JEV Info row, the Add / Edit / Delete Entry controls and
 * lifts JevViewPanel's pending-only status gate. Left as null the panel
 * stays read-only.
 *
 * Create mode (`createMode` + no `jev`): the modal creates a JEV right
 * away (today's date, `createLinkType`) behind the spinner. The caller
 * hands the new record back as `jev` through `onCreated`; the modal then
 * shows it like any other JEV — JEV Info + Journal Entry Voucher — with
 * the JEV Info row ALREADY in its edit state (Title focused for a No
 * Type JEV), since the user just clicked Add.
 *
 * Adding or editing an entry never opens a SECOND modal over this one:
 * JevViewPanel renders the form in place of its From / To columns
 * (inlineEntryForm) and this modal's footer becomes the form's.
 *
 * `jev` is rebuilt by the caller WITHOUT its `entries` array, which makes
 * JevViewPanel fetch the entries fresh with their journal_account data.
 */
function JevEntriesViewModal({
  open,
  onClose,
  jev = null,
  subTitle = "",
  entryCrud = null,
  createMode = false,
  createLinkType = "N",
  onCreated,
  // Called after the JEV Info row saves { dtOccur, strTitle }, so the
  // caller can refresh the record it built this modal's header from.
  onInfoSaved = null,
}) {
  const jevId = jev?.nJEVId ? String(jev.nJEVId) : "";
  const navigate = useNavigate();

  // ── JEV type ─────────────────────────────────────────────────────────
  // Decides what the top block holds AND whether this JEV carries a title:
  // only N (No Type / Other JEV) has one — every other type takes its name
  // from the voucher, purchase or inventory flow behind it.
  const linkType = String(jev?.cJEVLinkType ?? "").toUpperCase();
  const isNoType = linkType === "N";

  // ── Inline entry form ──────────────────────────────────────────────
  const [entryForm, setEntryForm] = useState(null);

  useEffect(() => {
    if (!open) setEntryForm(null);
  }, [open]);

  // ── JEV Info — title (No Type only) + date, edited in place ──────────
  // Both fields open under ONE Edit and are written back by ONE save, so
  // a reader never has to confirm the same row twice.
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => makeColors(getThemeColors(isDark)), [isDark]);
  const [infoEditing, setInfoEditing] = useState(false);
  const [dateValue, setDateValue] = useState(""); // "YYYY-MM-DD" while editing
  const [titleValue, setTitleValue] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [dateError, setDateError] = useState("");
  const [titleError, setTitleError] = useState("");
  // Local overrides after a save, so the row shows the new values without
  // waiting on the caller to refetch `jev`.
  const [savedDate, setSavedDate] = useState(null);
  const [savedTitle, setSavedTitle] = useState(null);
  const [infoBanner, setInfoBanner] = useState(false);
  // Dismissed text of the unbalanced-JEV banner — cleared whenever the
  // modal reopens or switches JEV (effect below), and per-message so a
  // NEW problem (e.g. "Entries not yet added" → "not balanced yet")
  // resurfaces even if the earlier one was dismissed.
  const [dismissedBalanceMsg, setDismissedBalanceMsg] = useState(null);
  // One close of one JEV = one Active → Pending check (demoteIfUnbalanced,
  // down by the balance block). Reset whenever the modal opens or switches
  // JEV, in the same effect that clears the rest of the per-opening state.
  const demotedRef = useRef(false);

  const currentDate = savedDate ?? jev?.dtOccur ?? "";
  const currentTitle = savedTitle ?? jev?.strTitle ?? "";

  useEffect(() => {
    setInfoEditing(false);
    setDateValue("");
    setTitleValue("");
    setDateError("");
    setTitleError("");
    setInfoSaving(false);
    setSavedDate(null);
    setSavedTitle(null);
    setInfoBanner(false);
    setDismissedBalanceMsg(null);
    // A fresh opening must be able to demote again — the guard above only
    // guards ONE closing of ONE JEV (see demoteIfUnbalanced).
    demotedRef.current = false;
  }, [open, jevId]);

  const startEditInfo = () => {
    setDateValue(toInputDate(currentDate));
    setTitleValue(currentTitle);
    setDateError("");
    setTitleError("");
    setInfoEditing(true);
  };

  const cancelEditInfo = () => {
    setInfoEditing(false);
    setDateValue("");
    setTitleValue("");
    setDateError("");
    setTitleError("");
    setInfoBanner(false);
  };

  const saveInfo = async () => {
    const date = String(dateValue ?? "").trim();
    const title = String(titleValue ?? "").trim();

    const dateMsg = date ? "" : "Date is required.";
    // The title is the only thing naming a No Type JEV — there is no
    // voucher or inventory behind it to fall back on, so it can't be left
    // blank.
    const titleMsg =
      isNoType && !title ? "Title is required for a No Type JEV." : "";

    setDateError(dateMsg);
    setTitleError(titleMsg);
    if (dateMsg || titleMsg) return;

    setInfoSaving(true);
    try {
      const dtOccur = withTime(date, currentDate);
      const strTitle = isNoType ? title : (savedTitle ?? jev?.strTitle ?? "");
      // strTitle rides along ONLY on a No Type JEV. Any other type sends
      // the date alone, which JevController reads as "leave the title be".
      await JevAPI.update(
        jevId,
        isNoType ? { dtOccur, strTitle: title } : { dtOccur },
      );
      setSavedDate(dtOccur);
      if (isNoType) setSavedTitle(title);
      setInfoEditing(false);
      setDateValue("");
      setTitleValue("");
      setInfoBanner(false);
      // The caller owns the JEV record (and builds the modal's own header
      // line from it) — hand the saved values back so its subtitle can't
      // go stale while this modal stays open.
      onInfoSaved?.({ dtOccur, strTitle });
      window.dispatchEvent(new CustomEvent("jev_data_updated"));
    } catch (err) {
      console.error("❌ Error updating the JEV:", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Saving failed. Please try again.";
      setDateError(message);
      setTitleError(message);
    } finally {
      setInfoSaving(false);
    }
  };

  // Every close path funnels through here (Cancel / X / backdrop / Escape
  // all reach ModalContainer's handleClose), so the Active → Pending check
  // runs once per closing however it was triggered — and never waits on it:
  // the modal drops straight away while the verdict resolves behind it.
  //
  // First Close while editing: raise the banner instead of closing. The
  // second Close dismisses the modal without saving.
  const handleClose = () => {
    if (infoEditing && !infoBanner) {
      setInfoBanner(true);
      return;
    }
    demoteIfUnbalanced();
    onClose?.();
  };

  // ── Create mode — the JEV is created the moment the modal opens ─────
  // The spinner covers the POST; the caller then hands the new record back
  // as `jev` (onCreated) and the JEV Info row opens in edit mode.
  const isCreating = createMode && !jev;
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Guards against a second create (StrictMode double effect, re-renders)
  // while one is already running for this opening.
  const createStartedRef = useRef(false);

  // Set to the new JEV's id right after it is created, so the JEV Info row
  // opens straight into edit mode once the caller hands the record back.
  const pendingEditIdRef = useRef("");

  // Title input of the JEV Info row — focused whenever the row enters edit
  // mode. Done after a tick so it also wins over MUI's focus trap.
  const titleInputRef = useRef(null);
  useEffect(() => {
    if (!infoEditing || !isNoType) return;
    const t = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [infoEditing, isNoType]);

  useEffect(() => {
    if (!open || !isCreating) {
      createStartedRef.current = false;
      return;
    }
    if (createStartedRef.current) return;
    createStartedRef.current = true;

    (async () => {
      setCreateError("");
      setCreateSaving(true);
      try {
        const res = await JevAPI.create({
          cJEVLinkType: createLinkType,
          dtOccur: withTime(todayInput()),
        });
        // Accept the common response shapes: the JEV itself or wrapped.
        const created = res?.nJEVId
          ? res
          : res?.data?.nJEVId
            ? res.data
            : (res?.jev ?? null);
        if (created?.nJEVId) pendingEditIdRef.current = String(created.nJEVId);
        onCreated?.(created);
      } catch (err) {
        console.error("❌ Error creating the JEV:", err);
        setCreateError(
          err?.response?.data?.message ||
            err?.message ||
            "Creating the JEV failed. Please try again.",
        );
      } finally {
        setCreateSaving(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCreating]);

  // Just created → open the JEV Info row in edit mode. Declared AFTER the
  // [open, jevId] reset effect above so it wins when both run together.
  useEffect(() => {
    if (!open || !jevId || pendingEditIdRef.current !== jevId) return;
    pendingEditIdRef.current = "";
    startEditInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jevId]);

  // nJEVId → voucher (null = no voucher found). Keyed so a cached `null`
  // counts as "already looked up" and doesn't loop the effect below.
  const [vouchers, setVouchers] = useState({});
  const [loadingVoucher, setLoadingVoucher] = useState(false);

  useEffect(() => {
    if (!open || !jevId) return;
    if (vouchers[jevId] !== undefined) return;

    (async () => {
      setLoadingVoucher(true);
      try {
        const res = await VoucherAPI.getVouchers();
        const list = Array.isArray(res) ? res : res?.data || [];
        const found = list.find((v) => String(v.nJEVId) === jevId) || null;
        setVouchers((prev) => ({ ...prev, [jevId]: found }));
      } catch (err) {
        console.error("Failed to load the voucher behind this JEV:", err);
        setVouchers((prev) => ({ ...prev, [jevId]: null }));
      } finally {
        setLoadingVoucher(false);
      }
    })();
  }, [open, jevId, vouchers]);

  const voucher = jevId ? (vouchers[jevId] ?? null) : null;

  // ── Inventory-backed JEVs ──────────────────────────────────────────
  // R (Received Purchases) and D (Delivered Items) are stamped onto
  // inventory rows by InventoryController::bulkCreateJev — there is no
  // voucher for them, so their top block is that Items table instead.
  // An absent/unknown type still looks: an empty result renders nothing.
  const isInventoryBacked = !linkType || linkType === "R" || linkType === "D";

  // null = not fetched yet (the guard that stops the effect looping).
  // Cached for the modal's lifetime, same as the voucher above.
  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    if (!open || !jevId || !isInventoryBacked) return;
    if (inventory !== null) return;

    let cancelled = false;
    (async () => {
      setLoadingInventory(true);
      try {
        const res = await InventoryAPI.getInventory();
        if (!cancelled) setInventory(res?.inventories ?? []);
      } catch (err) {
        console.error("Failed to load the inventory behind this JEV:", err);
        if (!cancelled) setInventory([]);
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, jevId, isInventoryBacked, inventory]);

  // Every inventory row this JEV actually covers: the pending batches
  // before it is finalized, the API's already-aggregated 'A' entry after.
  // (A D JEV is the exception — it widens to its whole delivered group,
  // see the branch below.)
  // Rows cancelled later keep their nJEVId and stay listed — dropping them
  // would silently shrink the total this JEV was built on.
  //
  // An aggregated entry (Stock / Delivered) sums several rows that can
  // carry DIFFERENT JEVs — a received batch paid by voucher gets the V
  // JEV, a later one its own R JEV — and only the FIRST row's id sits on
  // nJEVId, so nJEVIds (every JEV of the rows behind the entry) has to be
  // consulted too or that JEV's Items block comes up empty.
  const itemRows = useMemo(() => {
    if (!jevId || !isInventoryBacked || !inventory) return [];

    const idsOf = (i) =>
      Array.isArray(i.nJEVIds) && i.nJEVIds.length
        ? i.nJEVIds.map(String)
        : [String(i.nJEVId ?? "")];

    const matched = inventory.filter((i) => idsOf(i).includes(jevId));

    // ── D (Delivered Items) ─────────────────────────────────────────
    // The WHOLE delivered group, never just this JEV's own rows — the
    // very table JevEntryAEModal shows for the same JEV (PendingInventory
    // builds that one from the open group: every delivered batch of the
    // same client + company). bulkCreateJev books a whole group on ONE
    // JEV per direction, but a group can still hold more than one JEV
    // (both directions, or legacy per-item ones), so scoping to `matched`
    // alone could list only part of what the entry modal beside it lists.
    //
    // The group is keyed off the rows this JEV covers (same client, same
    // company); the rows this JEV itself carries are always kept, so a
    // batch booked under another JEV of the group can never drop out.
    // Direction guard, delivered side: a Delivered entry also lists the
    // purchase's R JEV (so the item details can show it) — those rows are
    // not part of a D JEV's own table. isDeliveredRow knows both shapes:
    // raw rows by their negative qty, the aggregated one by its 'D'
    // status (its qty is already abs).
    if (linkType === "D") {
      const seed = matched.find((i) => isDeliveredRow({ _raw: i }));
      if (!seed) return []; // nothing delivered carries this JEV
      const client = String(seed.strClientNickName ?? "—");
      const company = String(seed.strCompanyNickName ?? "—");
      const ownIds = new Set(matched.map((i) => i.nInventoryId));

      return mapInventoryItems(
        inventory.filter(
          (i) =>
            isDeliveredRow({ _raw: i }) &&
            (ownIds.has(i.nInventoryId) ||
              (String(i.strClientNickName ?? "—") === client &&
                String(i.strCompanyNickName ?? "—") === company)),
        ),
      );
    }

    // ── R (Received Purchases), and an absent/unknown type ──────────
    // Everything still carrying this JEV is the RECEIVED side: pending
    // and cancelled batches as they are, plus — once the purchase item is
    // approved — the aggregates getInventory folds it into:
    //
    //   Stock     = what is still on hand   (positive rows, net of…)
    //   Delivered = what has since gone out (the negative rows)
    //
    // The Delivered aggregate MUST stay in: it lists this R JEV because
    // its goods were received under it, and dropping it emptied this
    // block twice over —
    //   • fully delivered: getInventory emits NO Stock entry at all
    //     (stockQty is 0), so the Delivered one was the only row left
    //     and an R JEV showed no Items table while the D JEV beside it
    //     did;
    //   • partially delivered: the block was short everything that had
    //     gone out, so its total no longer matched the amount the JEV
    //     was booked for.
    //
    // Stock + Delivered of ONE purchase item IS the quantity received,
    // so the two aggregates are merged back into a single row — one
    // batch, received quantity, listed once instead of split in two.
    const rows = [];
    const aggregateAt = new Map(); // nPurchaseItemId → slot in `rows`
    matched.forEach((i) => {
      const isAggregate = i.cStatus === "S" || i.cStatus === "D";
      if (!isAggregate) {
        rows.push(i);
        return;
      }

      const key = String(i.nPurchaseItemId ?? i.nInventoryId);
      const at = aggregateAt.get(key);
      if (at === undefined) {
        aggregateAt.set(key, rows.length);
        rows.push(i);
        return;
      }

      const prev = rows[at];
      // Prefer the Stock entry as the base: it carries the received rows.
      const base = prev.cStatus === "S" ? prev : i;
      rows[at] = {
        ...base,
        nQuantity: Number(prev.nQuantity ?? 0) + Number(i.nQuantity ?? 0),
        nInventoryIds: [
          ...(prev.nInventoryIds ?? []),
          ...(i.nInventoryIds ?? []),
        ],
        nJEVIds: [...new Set([...(prev.nJEVIds ?? []), ...(i.nJEVIds ?? [])])],
      };
    });

    return mapInventoryItems(rows);
  }, [inventory, jevId, isInventoryBacked, linkType]);

  // An R JEV's table is the RECEIVED side: its rows are valued at cost,
  // so the selling columns — which only mean something once a batch has
  // gone OUT — stay hidden even when the batch shown is one that has
  // since been delivered. No prices are fetched for it either.
  const isReceivedSide = linkType === "R";

  const itemsTotal = useMemo(
    () => itemRows.reduce((sum, r) => sum + itemTotal(r), 0),
    [itemRows],
  );

  // Unit selling price for a DELIVERED JEV's table — resolves through the
  // chosen pricing set of each row's transaction (see useSellingPrices).
  // A received JEV fetches nothing here: the table hides those columns
  // (isReceivedSide), so handing it an empty list keeps the lookup off.
  const sellingPrices = useSellingPrices(isReceivedSide ? [] : itemRows);

  // Same rule VoucherUpdateView uses to pick its particulars panel.
  const isAssigneeType =
    (voucher?.voucher_assignees?.length ?? 0) > 0 &&
    !(voucher?.voucher_suppliers?.length > 0);
  const assigneeLinks = voucher?.voucher_assignees ?? [];
  const supplierLinks = voucher?.voucher_suppliers ?? [];
  const particularsCount = isAssigneeType
    ? assigneeLinks.length
    : supplierLinks.length;

  // Only print a Particulars block that has rows in it — an empty panel
  // tells the reader nothing about what this JEV covers.
  const showParticulars = Boolean(voucher) && particularsCount > 0;

  // ── Balance ────────────────────────────────────────────────────────
  // From and To must square for this JEV to be balanced; the banner below
  // says so while they don't. The hook re-checks on every entry added,
  // edited or deleted (JevViewPanel publishes those events), so the
  // warning clears itself the moment the JEV balances.
  //
  // Strictness is OFF on purpose: the figure this modal holds (itemsTotal)
  // is the batches' PURCHASE value, while a delivered JEV is booked at the
  // SELLING price and a voucher / No Type JEV has no Items total at all —
  // insisting on a match would flag perfectly balanced JEVs as wrong.
  const balance = useJevBalance(open ? jevId : "", itemsTotal, false);
  const showBalanceBanner =
    !balance.loading &&
    !!balance.message &&
    dismissedBalanceMsg !== balance.message;

  // ── Active → Pending on an unbalanced close ───────────────────────────
  // The one automatic status move this viewer makes: a JEV that was ACTIVE
  // when it was opened (the record the caller handed in — `jev` never takes
  // on a new status while the modal is up) and whose From / To sides no
  // longer square is put back to PENDING as the modal closes, so a
  // half-edited JEV can never sit in the list wearing an Active badge.
  // Any other status the JEV was opened with is left exactly as it is.
  //
  // The verdict is fetched FRESH rather than read off `balance`: that state
  // can still be mid-flight from the last entry save when Close is clicked,
  // and "no verdict yet" must never pass for "balanced". Strictness stays
  // OFF for the same reason it is off on the banner above.
  //
  // Silent by contract: no toast, no dialog. The list badge follows on its
  // own — the dispatched jev_data_updated is the very event useJevList
  // refetches off (and JevNav recounts its badge from).
  // Whether THIS closing is the one that demotes the JEV — the banner
  // prints its Pending note from the very same condition, so the promise
  // shown to the reader can never drift from what handleClose actually
  // does (see demoteIfUnbalanced).
  const willDemoteOnClose =
    !!jevId && String(jev?.cStatus ?? "") === STATUS_ACTIVE;

  const demoteIfUnbalanced = async () => {
    if (demotedRef.current) return; // one close, one check
    if (!jevId || String(jev?.cStatus ?? "") !== STATUS_ACTIVE) return;
    demotedRef.current = true;
    try {
      const res = await JevEntriesAPI.getByJevId(jevId);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      const verdict = computeJevBalance(list, itemsTotal, {
        requireTotalMatch: false,
      });
      if (verdict.balanced) return;
      await JevAPI.update(jevId, { cStatus: STATUS_PENDING });
      window.dispatchEvent(new CustomEvent("jev_data_updated"));
    } catch (err) {
      console.error("Failed to set the unbalanced JEV back to Pending:", err);
    }
  };

  // "Disbursement Voucher · DV" — the caller's type label with the voucher
  // number joined on as soon as its record is in.
  const headerLine = [subTitle, voucher?.strNumber].filter(Boolean).join(" · ");

  // A voucher-backed JEV (V / C) shows that line as a LINK: clicking it
  // closes this modal and opens the voucher itself — the same
  // /voucher-update?id= route the voucher list's View uses. JEVs with no
  // voucher behind them (R / D / N) keep the line as plain text.
  const openVoucher = () => {
    if (!voucher?.nVoucherId) return;
    onClose?.();
    navigate(`/voucher-update?id=${voucher.nVoucherId}`);
  };

  // Kept INLINE (a span, not a button) so the header's ellipsis still
  // clips long subtitles the way it did as plain text.
  const headerNode = voucher?.nVoucherId ? (
    <Box
      component="span"
      role="button"
      tabIndex={0}
      onClick={openVoucher}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openVoucher();
        }
      }}
      title={`Open voucher ${voucher.strNumber ?? ""}`.trim()}
      sx={{
        cursor: "pointer",
        borderRadius: "2px",
        // Always blue — it is a link, not plain text; hover only adds
        // the underline.
        color: colors.blue.text,
        "&:hover": { textDecoration: "underline" },
        "&:focus-visible": {
          outline: "none",
          textDecoration: "underline",
        },
      }}
    >
      {headerLine}
    </Box>
  ) : (
    headerLine
  );

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title={jev?.strJEVNumber || (isCreating ? "Add JEV" : "JEV")}
      subTitle={isCreating ? "Creating…" : headerNode}
      width={{ xs: "95%", sm: 760, md: 980 }}
      contentPadding={{ xs: 1, sm: 1.5 }}
      // Viewer: a single Close — until an entry is being added or edited,
      // when the same footer becomes the form's (Back / Save).
      showSave={!!entryForm}
      saveLabel={entryForm?.isEdit ? "Update Entry" : "Save Entry"}
      onSave={entryForm?.save}
      cancelLabel={entryForm ? "Back" : "Close"}
      onCancel={entryForm ? entryForm.cancel : undefined}
      disabled={!!entryForm?.saving}
      // Spinner over the fetches on the way in, and over the entry /
      // JEV-info / create saves while they run.
      loading={
        loadingVoucher ||
        loadingInventory ||
        !!entryForm?.saving ||
        infoSaving ||
        createSaving
      }
    >
      {/* ── Create mode: the spinner covers the create; only a failure shows ── */}
      {isCreating && createError && (
        <Typography
          sx={{
            py: 2,
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.red.text,
          }}
        >
          {createError}
        </Typography>
      )}

      {jev && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* ── Unbalanced JEV ──────────────────────────────────────
              Flagged the moment this JEV's From and To sides don't
              square, whichever way it was opened (inventory drill-down,
              JEV list, Account Report). Sits above everything so it is
              the first thing seen, and clears itself as soon as an entry
              lands (the hook re-checks on every entry event). */}
          {showBalanceBanner && (
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 4,
                py: 0.75,
                borderRadius: "8px",
                bgcolor: colors.amber.warnBg,
                border: `1px dashed ${colors.amber.warnBorder}`,
              }}
            >
              <WarningAmberOutlined
                sx={{
                  fontSize: "1rem",
                  color: colors.amber.warnText,
                  flexShrink: 0,
                }}
              />
              <Box
                sx={{
                  fontSize: "0.72rem",
                  color: colors.amber.warnText,
                  lineHeight: 1.4,
                }}
              >
                <strong>{balance.message}</strong>
                {/* The rule in the reader's face: only an ACTIVE JEV is
                    ever demoted, so the note is printed for that status
                    alone — the same `willDemoteOnClose` check the close
                    itself runs. */}
                {willDemoteOnClose && (
                  <Box
                    component="span"
                    sx={{ display: "block", mt: 0.5, fontWeight: 500 }}
                  >
                    Closing this JEV while its entries stay unbalanced will
                    automatically set its status to{" "}
                    <strong>Pending</strong>.
                  </Box>
                )}
              </Box>
              <Box
                component="button"
                onClick={() => setDismissedBalanceMsg(balance.message)}
                aria-label="Dismiss banner"
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  p: 0.4,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: colors.amber.warnText,
                }}
              >
                <CloseOutlined sx={{ fontSize: "0.9rem" }} />
              </Box>
            </Box>
          )}

          {/* ── Particulars — same block as VoucherUpdateView ─────── */}
          {showParticulars && (
            <Box>
              <SectionLabel>Particulars ({particularsCount})</SectionLabel>
              {isAssigneeType ? (
                <AssigneeListPanel
                  assigneeLinks={assigneeLinks}
                  voucher={voucher}
                />
              ) : (
                <POListPanel supplierLinks={supplierLinks} />
              )}
            </Box>
          )}

          {/* ── Items — the batches an inventory JEV covers (a D JEV:
              its whole delivered group, as the entry modal shows) ── */}
          {itemRows.length > 0 && (
            <Box>
              <SectionLabel>Items ({itemRows.length})</SectionLabel>
              <ItemsTable
                rows={itemRows}
                total={itemsTotal}
                sellingPrices={sellingPrices}
                // Received batches are priced at COST: a batch that has
                // since gone out still belongs in this table, but the
                // selling columns stay the delivered side's own.
                showSellingOverride={isReceivedSide ? false : null}
              />
            </Box>
          )}

          {/* ── The JEV itself ────────────────────────────────────── */}
          <Box>
            {/* JEV Info — only where entry CRUD is enabled (the JEV list page) */}
            {entryCrud && (
              <>
              {infoBanner && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    mb: 1,
                    borderRadius: "8px",
                    border: `0.5px solid ${colors.blue.border}`,
                    bgcolor: colors.blue.bg,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: colors.blue.text,
                  }}
                >
                  You are currently in edit mode — save your changes first, or click Close again to discard them.
                </Box>
              )}
              <InfoCard
                title="JEV Info"
                editing={infoEditing}
                colors={colors}
                actions={
                  infoEditing ? (
                    <>
                      <Box
                        component="button"
                        type="button"
                        disabled={infoSaving}
                        onClick={saveInfo}
                        sx={dateBtnSx(colors.blue)}
                      >
                        <CheckOutlined sx={{ fontSize: "0.9rem" }} />
                        Save
                      </Box>
                      <Box
                        component="button"
                        type="button"
                        disabled={infoSaving}
                        onClick={cancelEditInfo}
                        sx={dateBtnSx(colors.neutral)}
                      >
                        Cancel
                      </Box>
                    </>
                  ) : (
                    <Box
                      component="button"
                      type="button"
                      onClick={startEditInfo}
                      sx={dateBtnSx(colors.neutral)}
                    >
                      <EditOutlined sx={{ fontSize: "0.9rem" }} />
                      Edit
                    </Box>
                  )
                }
              >
                <Box
                  onKeyDown={(e) => {
                    if (!infoEditing) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveInfo();
                    }
                    if (e.key === "Escape") {
                      // Cancel the edit without also closing the modal.
                      e.stopPropagation();
                      cancelEditInfo();
                    }
                  }}
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    alignItems: "start",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: isNoType ? "2fr 1fr" : "1fr",
                    },
                  }}
                >
                  {/* The title is a No Type JEV's only name — the other
                      types get theirs from the voucher / inventory behind
                      them, so the field is shown for N alone. */}
                  {isNoType &&
                    (infoEditing ? (
                      <TextField
                        label="Title"
                        size="small"
                        fullWidth
                        required
                        inputRef={titleInputRef}
                        value={titleValue}
                        onChange={(e) => {
                          setTitleValue(e.target.value);
                          if (titleError) setTitleError("");
                        }}
                        error={!!titleError}
                        helperText={titleError}
                        disabled={infoSaving}
                        inputProps={{ maxLength: 100 }}
                      />
                    ) : (
                      <InfoField
                        label="Title"
                        value={currentTitle || "—"}
                        colors={colors}
                      />
                    ))}

                  {infoEditing ? (
                    <TextField
                      label="Date"
                      type="date"
                      size="small"
                      fullWidth
                      required
                      value={dateValue}
                      onChange={(e) => {
                        setDateValue(e.target.value);
                        if (dateError) setDateError("");
                      }}
                      error={!!dateError}
                      helperText={dateError}
                      disabled={infoSaving}
                      InputLabelProps={{ shrink: true }}
                      autoFocus={!isNoType}
                    />
                  ) : (
                    <InfoField
                      label="Date"
                      value={fmtDate(currentDate)}
                      colors={colors}
                    />
                  )}
                </Box>
              </InfoCard>
              </>
            )}

            {/* Hidden while the entry form stands in for the columns —
                the form IS this section then (entryForm is set). */}
            {!entryForm && <SectionLabel>Journal Entry Voucher</SectionLabel>}
            <JevViewPanel
              key={jev.nJEVId}
              jev={jev}
              // The amount this JEV's entries must reconcile against —
              // the same figure the Items block prints as its total
              // (for a D JEV: the delivered group's, which the panel
              // never caps an R/D entry with anyway).
              particularsGrandTotal={itemsTotal}
              // Entry CRUD, opt-in per the header comment. With
              // entryCrud left null both roles stay undefined and the
              // panel renders no Add / Edit / Delete Entry at all.
              isManagement={entryCrud?.isManagement}
              isFinanceOfficer={entryCrud?.isFinanceOfficer}
              // …and where it IS enabled, entries are managed whatever
              // the status is (undefined → the panel's pending-only).
              entryStatusGate={entryCrud ? "all" : undefined}
              // No nested modal here: the form takes the columns' place
              // and publishes its Back / Save buttons to this modal's
              // footer through onEntryFormChange.
              inlineEntryForm
              onEntryFormChange={setEntryForm}
              // The voucher's own particulars, loaded above — handed on
              // so the Add / Edit Entry form shows the real thing
              // instead of an empty panel.
              isAssigneeType={isAssigneeType}
              assigneeLinks={assigneeLinks}
              supplierLinks={supplierLinks}
            />
          </Box>
        </Box>
      )}
    </ModalContainer>
  );
}

export default JevEntriesViewModal;
