import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";
import {
  AccountBalanceOutlined,
  DriveFileMoveOutlined,
  EventOutlined,
  ExpandLess,
  ExpandMore,
  FileDownloadOutlined,
  FolderOffOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { toCents } from "../../../../utils/helpers/money.js";
import CustomTable from "../../../../components/ui/form/Table.jsx";
import TransferEntryModal from "../modal/TransferEntryModal.jsx";
import VoucherAPI from "../../../../api/endpoints/voucher.api.js";
import InventoryAPI from "../../../../api/endpoints/inventory.api.js";

const useColors = (c) => ({
  border: c.slate.border,
  divider: c.slate.divider,
  headerBg: c.slate.itemHeaderBg ?? c.slate.mutedBg,
  hoverBg: c.slate.hover,
  mutedBg: c.slate.mutedBg,
  violet: { bg: c.violet.bg, border: c.violet.border, text: c.violet.text },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  red: { bg: c.red.bg, text: c.red.text },
  green: { bg: c.green.bg, text: c.green.text },
  gray: {
    pri: c.gray.textPrimary,
    sec: c.gray.textSecondary,
    muted: c.gray.textMuted,
    text: c.gray.textSecondary,
    bg: c.slate.mutedBg,
    border: c.slate.border,
  },
  inputBg: c.gray.inputBg,
  // white treatments laid over the violet account banner
  plateBg: c.onAccent.plate,
  chipBg: c.badge.plain.bg,
  chipBorder: c.badge.plain.borderSoft,
});

const flatten = (nodes, depth = 0, out = []) => {
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    flatten(n.children || [], depth + 1, out);
  });
  return out;
};

// Stable identity for a row — used as the React key and as the id of the
// collapse state, so it still works when a node has no database id.
const rowKeyOf = ({ node, depth }) => node.id ?? `${depth}-${node.accountName}`;

// jev.dtOccur is a MySQL datetime ("2026-09-15 14:30:00") — parse the
// "YYYY-MM-DD" prefix by hand so no timezone shift can move the date.
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDay = (raw) => {
  const s = String(raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s ? s.slice(0, 10) : "—";
  return `${MONTH_SHORT[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
};

// Index JEV entries by JEV and by journal account
const groupEntries = (entries = []) => {
  const byJev = {};
  const byAccount = {};
  entries.forEach((e) => {
    (byJev[e.nJEVId] ||= []).push(e);
    (byAccount[e.nJournalAccountId] ||= []).push(e);
  });
  return { byJev, byAccount };
};

const Chip = ({ tone, colors, icon, children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.3,
      px: 0.6,
      py: 0.1,
      borderRadius: "50px",
      fontSize: "0.55rem",
      fontWeight: 600,
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      color: colors[tone].text,
      background: colors[tone].bg,
      border: `0.5px solid ${colors[tone].border ?? colors[tone].text}`,
    }}
  >
    {icon}
    {children}
  </Box>
);

const fmtAmt = (n) =>
  Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Payee nickname of the voucher behind a JEV — the very fields the voucher
// list (useVoucher) and the JEV viewer (JevEntriesViewModal) print:
//   • assignee-type voucher → first assignee's nickname
//   • supplier-type voucher → the supplier's nickname
// Returns null when the record has no resolvable nickname so the caller can
// fall back to the counterpart account name.
const voucherPayeeName = (voucher) => {
  if (!voucher) return null;
  const isAssignee =
    (voucher.voucher_assignees?.length ?? 0) > 0 &&
    !(voucher.voucher_suppliers?.length > 0);
  const name = isAssignee
    ? voucher.voucher_assignees?.[0]?.assignee?.strAssigneeNickName
    : voucher.supplier?.strSupplierNickName;
  return name ? String(name) : null;
};

const NUM_FONT = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

// Fixed-width Debit / Credit lanes. `minWidth` let a longer figure grow its
// box and push the next column sideways, so the same column sat at a
// different x on the overall header vs. the account rows. A fixed width
// keeps every Debit and Credit in the same vertical lane.
const MONEY_COL = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  width: "6rem",
  flexShrink: 0,
};
const MONEY_GAP = { mr: 3 };

// Entries of one account, shown with the shared CustomTable (+ pagination).
// `onOpenJev({ nJEVId, jev })` makes the JEV No. cell clickable for EVERY
// type — the viewer renders whichever block that type actually has: the
// voucher's Particulars (V/C), the Items table (R/D), and always the JEV's
// own From/To entries (see JevEntriesViewModal).
const EntryBranch = ({
  entries,
  colors,
  byJev,
  nameById,
  // nJEVId → payee nickname (supplier / assignee) for voucher-backed JEVs.
  // When a JEV has one, its Particulars cell leads with the payee instead of
  // the counterpart account name.
  payeeByJevId = {},
  // nJEVId → supplier nickname for "Received Purchases" (R) JEVs, taken from
  // the received inventory rows behind them. Drives the
  // "Received Purchases from {supplier}" Particulars text.
  receivedSupplierByJevId = {},
  companyByJevId = {},
  // Raw key of the "Received Purchases" JEV type — matched against
  // entry.jev.cJEVLinkType to know which rows take the received treatment.
  jevReceivedPurchasesKey = "",
  sx,
  onOpenJev,
  // (row) => void — row carries nJournalAccountId; opens the transfer
  // modal to re-home that entry's journal account. When the caller passes
  // nothing (finance on the journal-accounts page), the whole Action
  // column folds away.
  onTransferEntry,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // One row per entry. Entries arrive newest first, so the running balance
  // starts at the LAST row and accumulates upward (first row = grand total).
  // It is computed over ALL entries, before paging.
  const rows = useMemo(() => {
    const balances = new Array(entries.length);
    let running = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      running += Number(entries[i].dAmount) || 0;
      balances[i] = running;
    }

    return entries.map((e, i) => {
      const amt = Number(e.dAmount) || 0;
      const isOut = amt < 0;
      const counterparts = (byJev[e.nJEVId] || [])
        .filter((s) => s !== e && Number(s.dAmount) < 0 !== isOut)
        .map((s) => nameById[s.nJournalAccountId] ?? "—");

      // Voucher-backed JEV → its payee's nickname (supplier / assignee).
      // undefined = no voucher behind this JEV, so Particulars keeps the
      // counterpart account name as before.
      const payee =
        e.nJEVId != null && payeeByJevId[String(e.nJEVId)] != null
          ? payeeByJevId[String(e.nJEVId)]
          : null;

      // "Received Purchases" (R) JEV → the supplier the goods came in from,
      // read off the received inventory rows stamped with this JEV.
      const receivedSupplier =
        String(e?.jev?.cJEVLinkType ?? "") === String(jevReceivedPurchasesKey)
          ? e.nJEVId != null
            ? (receivedSupplierByJevId[String(e.nJEVId)] ?? null)
            : null
          : null;

      // The journal's own title — every link type carries one now, so it
      // leads the Particulars cell. A journal saved without one keeps the
      // older resolution (payee → received supplier → counterpart account).
      const jevTitle =
        String(e?.jev?.strTitle ?? "").trim() || null;

      return {
        id: e.nJEVEntryId ?? `entry-${i}`,
        // Kept under its own name too — TransferEntryModal reads
        // entry.nJEVEntryId for the update call.
        nJEVEntryId: e.nJEVEntryId ?? null,
        date: String(e?.jev?.dtOccur ?? ""),
        jevNo: e?.jev?.strJEVNumber ?? "",
        companyName: e?.jev?.company?.strCompanyNickName ?? e?.jev?.company?.strCompanyName ?? e?.jev?.entries?.[0]?.strCompanyName ?? companyByJevId[String(e.nJEVId)] ?? "—",
        nJEVId: e.nJEVId ?? null,
        // The journal account this entry posts to — what the row's Transfer
        // button re-assigns. dAmount travels with it so the update call
        // carries the exact same signed amount.
        nJournalAccountId: e.nJournalAccountId ?? null,
        dAmount: amt,
        // Raw JEV record (number / date / type / status) — what the JEV No.
        // click hands to the modal.
        jevRef: e?.jev ?? null,
        payee,
        receivedSupplier,
        // The JEV's strTitle IS the Particulars cell. When the journal was
        // saved without one, fall back to a plain dash instead of falling
        // back to the payee / supplier / counterpart chain.
        particulars: jevTitle ?? "—",
        counterparts,
        from: isOut ? amt : 0, // money out
        to: !isOut ? amt : 0, // money in
        balance: balances[i],
      };
    });
  }, [
    entries,
    byJev,
    nameById,
    payeeByJevId,
    receivedSupplierByJevId,
    companyByJevId,
    jevReceivedPurchasesKey,
  ]);

  const columns = useMemo(() => {
    const dash = (
      <Box component="span" sx={{ color: colors.gray.muted, opacity: 0.5 }}>
        —
      </Box>
    );
    const num = { ...NUM_FONT, fontWeight: 600 };

    return [
      {
        key: "date",
        label: "Date",
        xs: 1.3,
        align: "center",
        render: (v) => (
          <Box
            component="span"
            title={v}
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              color: colors.gray.sec,
            }}
          >
            {formatDay(v)}
          </Box>
        ),
      },
      {
        key: "jevNo",
        label: "JEV No.",
        xs: 1.7,
        align: "center",
        render: (v, row) => (
          <Box
            sx={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            {/* Every JEV number opens: the viewer picks the block its own
                type has — Particulars (V/C), Items (R/D) — and always the
                JEV's From/To entries. A line with no JEV keeps plain text. */}
            {(() => {
              if (!v || !onOpenJev || !row.nJEVId) {
                return v ? (
                  <Box
                    component="span"
                    title={v}
                    sx={{
                      ...NUM_FONT,
                      fontWeight: 600,
                      color: colors.gray.sec,
                    }}
                  >
                    {v}
                  </Box>
                ) : (
                  dash
                );
              }
              // Clicking opens the whole JEV (every entry of it, both sides)
              // plus whichever block its type has — the voucher's
              // particulars or the Items table.
              return (
                <Box
                  component="button"
                  type="button"
                  onClick={() =>
                    onOpenJev({ nJEVId: row.nJEVId, jev: row.jevRef })
                  }
                  title={`Open JEV ${v}`}
                  aria-label={`View entries of JEV ${v}`}
                  sx={{
                    ...NUM_FONT,
                    p: 0,
                    m: 0,
                    border: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    lineHeight: "inherit",
                    fontWeight: 600,
                    color: colors.blue.text,
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                    "&:focus-visible": {
                      outline: "none",
                      textDecoration: "underline",
                    },
                  }}
                >
                  {v}
                </Box>
              );
            })()}
          </Box>
        ),
      },
      {
        key: "particulars",
        label: "Title",
        xs: 4.2,
        render: (_, row) => (
          <Box
            component="span"
            // Lead with the resolved particulars (payee nickname / "Received
            // Purchases from {supplier}") when present, then the counterpart
            // accounts. When particulars is just the first counterpart, this
            // equals the full counterpart list.
            title={
              row.particulars && row.particulars !== "—"
                ? [
                    row.particulars,
                    ...row.counterparts.filter((c) => c !== row.particulars),
                  ]
                    .filter(Boolean)
                    .join(", ")
                : row.counterparts.join(", ")
            }
          >
            {row.particulars}
          </Box>
        ),
      },
      {
        key: "from",
        label: "Debit",
        xs: 1.4,
        align: "right",
        render: (_, row) =>
          row.from !== 0 ? (
            <Box
              component="span"
              sx={{ ...num, color: colors.red.text }}
            >
              {fmtAmt(row.from)}
            </Box>
          ) : (
            dash
          ),
      },
      {
        key: "to",
        label: "Credit",
        xs: 1.4,
        align: "right",
        render: (_, row) =>
          row.to !== 0 ? (
            <Box
              component="span"
              sx={{ ...num, color: colors.green.text }}
            >
              {fmtAmt(row.to)}
            </Box>
          ) : (
            dash
          ),
      },
      // Action column — Transfer re-homes the entry's journal account.
      // Only exists while the caller hands the handler in; finance reads
      // the report without it.
      ...(onTransferEntry
        ? [
            {
              key: "action",
              label: "Action",
              xs: 0.9,
              align: "center",
              render: (_, row) => (
                <Box
                  component="button"
                  type="button"
                  onClick={() => onTransferEntry(row)}
                  title="Transfer this entry's journal account"
                  aria-label="Transfer this entry's journal account"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.35,
                    px: 0.7,
                    py: 0.3,
                    borderRadius: "6px",
                    border: `1px solid ${colors.border}`,
                    background: "transparent",
                    color: colors.gray.sec,
                    fontFamily: "inherit",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    "&:hover": {
                      background: colors.hoverBg,
                      borderColor: colors.blue.border,
                      color: colors.blue.text,
                    },
                  }}
                >
                  <DriveFileMoveOutlined sx={{ fontSize: "0.8rem" }} />
                  Transfer
                </Box>
              ),
            },
          ]
        : []),
    ];
  }, [colors, onOpenJev, onTransferEntry]);

  // Keep the page valid when the entry list shrinks (date range / filters)
  const pageCount =
    rowsPerPage === -1 ? 1 : Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);

  // Works whether CustomPagination reports (event, newPage) or just newPage
  const handlePageChange = (a, b) =>
    setPage(typeof b === "number" ? b : Number(a) || 0);

  const handleRowsPerPageChange = (e) => {
    const v = Number(e?.target?.value ?? e);
    setRowsPerPage(Number.isNaN(v) ? 10 : v);
    setPage(0);
  };

  return (
    <Box sx={sx}>
      <CustomTable
        columns={columns}
        rows={rows}
        page={safePage}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        getRowId={(row) => row.id}
        maxHeight="none"
      />
    </Box>
  );
};

// Stable "no window chosen" value so memo deps don't change identity each render
const EMPTY_RANGE = { from: null, to: null, quick: null };

function LedgerPanel({
  account,
  allAccounts = [],
  jevEntries = [],
  jevTypeOptions = [],
  jevActiveKey = "A",
  // Raw key of the "Received Purchases" JEV type — its Particulars cell is
  // built from the inventory behind it ("Received Purchases from {supplier}").
  jevReceivedPurchasesKey = "",
  // Collection (C) JEV type and its Pending Clearance (R) status — used for
  // the "Pending: ₱…" figure under the overall Total.
  jevCollectionKey = "",
  jevPendingClearanceKey = "",
  // Inclusive { from, to } window chosen in LedgerFilterModal
  // before the panel opened (nulls = entire history).
  dateRange = EMPTY_RANGE,
  // Reopens LedgerFilterModal on the header's date chip so the
  // window can be changed while the report is already on screen.
  onEditRange = null,
  // Icon-only Export on the selected account's row — the host (the page
  // footer already has one) decides what it does; the panel only renders it.
  onExport = null,
  // Role flags — handed to JevEntriesViewModal as `entryCrud` so its entry
  // rows are editable here just like on the JEV list page.
  isManagement = false,
  isFinanceOfficer = false,
  // JEV number click override — when the host embeds the updater IN this
  // screen (JournalAccountsView swaps the ledger for JEVUpdatePanel), it
  // hands this down and the click never leaves the page. Without it the
  // click falls back to the /jev-update route.
  onOpenJevPage = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [search, setSearch] = useState("");

  // ── Vouchers behind voucher-backed JEVs ────────────────────────────────
  // Particulars for a V/C JEV shows the payee's nickname (supplier or
  // assignee). A JEV is linked to its voucher through voucher.nJEVId, so we
  // fetch the voucher list ONCE and index it by that id. The value is either
  // the nickname string or null (no voucher / no nickname) — null is cached
  // too, so a lookup never re-fetches.
  const [payeeByJevId, setPayeeByJevId] = useState({});
  const [companyByJevId, setCompanyByJevId] = useState({});
  const [companyIdByJevId, setCompanyIdByJevId] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await VoucherAPI.getVouchers();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (cancelled) return;
        const pMap = {};
        const cMap = {};
        const idMap = {};
        list.forEach((v) => {
          if (!v?.nJEVId) return;
          const jevId = String(v.nJEVId);
          pMap[jevId] = voucherPayeeName(v);
          
          // Extract company nickname and company id
          const firstPO = v.voucher_suppliers?.[0]?.purchase_order;
          const firstPOOption = firstPO?.purchase_order_options?.[0];
          const company = v.company || firstPOOption?.purchase_option?.transaction_item?.transaction?.company;
          const nick = company?.strCompanyNickName || company?.strCompanyName;
          if (nick) cMap[jevId] = String(nick);

          const compId = v.nCompanyId ?? company?.nCompanyId;
          if (compId != null) idMap[jevId] = Number(compId);
        });
        setPayeeByJevId(pMap);
        setCompanyByJevId((prev) => ({ ...prev, ...cMap }));
        setCompanyIdByJevId((prev) => ({ ...prev, ...idMap }));
      } catch (err) {
        console.error("Failed to load vouchers for the report:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Suppliers behind "Received Purchases" (R) JEVs ────────────────────
  // An R JEV has no voucher — it's stamped onto the received inventory
  // rows, whose strSupplierNickName names the supplier. We fetch the
  // inventory ONCE and index the supplier nickname by every JEV id a row
  // carries (nJEVIds, else nJEVId — the same rule JevEntriesViewModal uses).
  // Only RECEIVED rows (qty > 0) contribute; a delivered batch belongs to a
  // D JEV and names a client, not a supplier.
  const [receivedSupplierByJevId, setReceivedSupplierByJevId] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await InventoryAPI.getInventory();
        const rows = Array.isArray(res) ? res : res?.inventories || [];
        if (cancelled) return;
        const sMap = {};
        const cMap = {};
        const idMap = {};
        rows.forEach((i) => {
          const nick = i?.strSupplierNickName;
          const compNick = i?.strCompanyNickName;
          const compId = i?.nCompanyId ?? i?.purchaseOption?.transactionItem?.transaction?.company?.nCompanyId ?? i?.purchaseOption?.transactionItem?.transaction?.nCompanyId;

          const ids =
            Array.isArray(i?.nJEVIds) && i.nJEVIds.length
              ? i.nJEVIds
              : [i?.nJEVId];

          ids.forEach((id) => {
            if (id == null) return;
            const k = String(id);
            
            // Received side only for supplier nickname
            if (Number(i?.nQuantity ?? 0) > 0) {
              if (nick && nick !== "—" && sMap[k] == null) sMap[k] = String(nick);
            }

            // All rows for company nickname and ID
            if (compNick && compNick !== "—" && cMap[k] == null) cMap[k] = String(compNick);
            if (compId != null && idMap[k] == null) idMap[k] = Number(compId);
          });
        });
        setReceivedSupplierByJevId(sMap);
        setCompanyByJevId((prev) => ({ ...prev, ...cMap }));
        setCompanyIdByJevId((prev) => ({ ...prev, ...idMap }));
      } catch (err) {
        console.error("Failed to load inventory for the report:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Row keys whose subtree (its entry block + the linked accounts under it)
  // is currently folded away.
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  // The JEV entry line waiting to be re-assigned by TransferEntryModal
  // (null = closed). Set by an entry row's Transfer button; the modal picks
  // the destination account and updates ONLY that entry.
  const [transferEntry, setTransferEntry] = useState(null);

  // Same rule the account tree above follows: finance reads the books —
  // transferring an entry line is management's (or any other role's, as
  // before) action.
  const canTransferEntry = isManagement || !isFinanceOfficer;

  // Entry row's Transfer → open the modal for THAT entry line. No handler
  // for finance → EntryBranch drops its Action column entirely.
  const handleTransferEntry = canTransferEntry
    ? (row) => {
        if (!row?.nJEVEntryId) return;
        setTransferEntry(row);
      }
    : undefined;

  const toggleRow = (key) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── JEV viewer — where the journal opens ───────────────────────────────
  // Clicking a JEV number in an entry table opens the whole JEV on
  // /jev-update?id=… (the full-page updater) — UNLESS the host hands its
  // own `onOpenJevPage` (JournalAccountsView embeds the updater panel in
  // this screen instead of leaving), in which case the host decides.
  const navigate = useNavigate();

  const openJevModal = ({ nJEVId }) => {
    if (!nJEVId) return;
    if (onOpenJevPage) {
      onOpenJevPage(nJEVId);
      return;
    }
    navigate(`/jev-update?id=${nJEVId}`);
  };

  // ── Date filter — the inclusive window chosen in
  // LedgerFilterModal before this panel was opened ────────────────
  const range = dateRange || EMPTY_RANGE;
  const dateFilterActive = !!(range.from || range.to);

  // "Sep 1, 2026 – Sep 30, 2026" (or "All dates" when nothing was picked)
  const rangeLabel = useMemo(() => {
    if (!dateFilterActive) return "All dates";
    const f = range.from ? formatDay(range.from) : null;
    const t = range.to ? formatDay(range.to) : null;
    if (f && t) return f === t ? f : `${f} – ${t}`;
    return f ? `From ${f}` : `To ${t}`;
  }, [dateFilterActive, range]);



  // Rebuild the linked subtree from the FULL account list so an active search
  // on the page can't hide any of the account's links from this report.
  const children = useMemo(() => {
    if (!account) return [];
    if (!allAccounts.length) return account.children ?? [];

    const byParent = {};
    allAccounts.forEach((a) => {
      if (!a.nParentAccountId) return;
      (byParent[a.nParentAccountId] ||= []).push(a);
    });

    const seen = new Set();
    const walk = (parentId, depth) =>
      (byParent[parentId] ?? []).map((c) => {
        if (seen.has(c.id) || depth > 50) return { ...c, children: [] };
        seen.add(c.id);
        return { ...c, children: walk(c.id, depth + 1) };
      });

    // Start at depth 1: the reported account itself is the ROOT row of the
    // list (treeRows prepends it at depth 0), so its linked children sit one
    // level under it — indented, and hidden together when its row is folded.
    return walk(account.id, 1);
  }, [account, allAccounts]);

  const flat = useMemo(() => flatten(children), [children]);
  const total = flat.length;

  // Only entries whose JEV is still ACTIVE (jevActiveKey, i.e. cStatus "A")
  // AND falls inside the chosen date window belong in the report — cancelled /
  // pending JEVs are excluded, including as counterpart lines.
  const { byJev, byAccount: entriesByAccount } = useMemo(() => {
    const activeStatus = String(jevActiveKey ?? "").trim() || "A";
    const { from, to, companyIds } = range;
    const hasCompanyFilter = Array.isArray(companyIds) && !companyIds.includes("all") && companyIds.length > 0;

    // jev.dtOccur is a MySQL datetime → compare its "YYYY-MM-DD" prefix, so
    // no timezone shifting can move an entry across the range edge.
    const dayOf = (e) => String(e?.jev?.dtOccur ?? "").slice(0, 10);
    const inRange = (day) => {
      if (!from && !to) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    };

    const matchesCompany = (e) => {
      if (!hasCompanyFilter) return true;
      const jId = e.nJEVId != null ? String(e.nJEVId) : null;
      const compId =
        e?.jev?.company?.nCompanyId ??
        e?.jev?.transactions?.[0]?.company?.nCompanyId ??
        e?.jev?.vouchers?.[0]?.company?.nCompanyId ??
        e?.jev?.inventories?.[0]?.purchaseOption?.transactionItem?.transaction?.company?.nCompanyId ??
        (jId ? companyIdByJevId[jId] : null);

      // "No Company" — the JEV resolves to no company at all; it passes
      // only when the "none" sentinel is among the chosen ids.
      if (compId == null) return companyIds.includes("none");
      return companyIds
        .filter((x) => x !== "none")
        .map(Number)
        .includes(Number(compId));
    };

    const activeEntries = (jevEntries || []).filter((e) => {
      if (String(e?.jev?.cStatus ?? "").trim() !== activeStatus) return false;
      if (!inRange(dayOf(e))) return false;
      if (!matchesCompany(e)) return false;
      return true;
    });
    // Newest first — dtOccur is "YYYY-MM-DD HH:mm:ss", so string compare sorts correctly
    const sorted = [...activeEntries].sort((a, b) => {
      const da = String(a?.jev?.dtOccur ?? "");
      const db = String(b?.jev?.dtOccur ?? "");
      if (da !== db) return da < db ? 1 : -1;
      return (Number(b.nJEVEntryId) || 0) - (Number(a.nJEVEntryId) || 0);
    });
    return groupEntries(sorted);
  }, [jevEntries, jevActiveKey, range, companyIdByJevId]);

  // ── Header total — unfiltered by date ──────────────────────────────────
  // The violet banner's balance chip shows the account's ALL-TIME total:
  // the date window only narrows the entry rows beneath it, never this
  // number. Same active-status rule, same cents math, just no date filter.
  const grandTotalsById = useMemo(() => {
    const activeStatus = String(jevActiveKey ?? "").trim() || "A";
    const byAccount = {};
    (jevEntries || []).forEach((e) => {
      if (String(e?.jev?.cStatus ?? "").trim() !== activeStatus) return;
      (byAccount[e.nJournalAccountId] ||= []).push(e);
    });
    const cache = {};
    const compute = (node) => {
      if (cache[node.id]) return cache[node.id];
      let from = 0;
      let to = 0;
      (byAccount[node.id] || []).forEach((e) => {
        if (Number(e.dAmount) < 0) from += toCents(e.dAmount);
        else to += toCents(e.dAmount);
      });
      (node.children || []).forEach((c) => {
        const kid = compute(c);
        from += kid.from;
        to += kid.to;
      });
      const totals = { from, to, net: (to - from) / 100 };
      cache[node.id] = totals;
      return totals;
    };
    if (account) compute({ id: account.id, children });
    flat.forEach((x) => compute(x.node));
    return cache;
  }, [account, children, flat, jevEntries, jevActiveKey]);

  // Pending Clearance collections on LINKED fund accounts — printed under
  // the overall Total. Fund = bAllowNegative off; a Collection JEV still in
  // Pending Clearance is money that hasn't cleared into the active books.
  // Only the reported account + its linked descendants contribute, and the
  // line is omitted entirely when the tree has no fund account.
  const pendingClearanceTotal = useMemo(() => {
    if (!jevCollectionKey) return null;
    // "Pending Clearance" lives in its own mapping; "R" is its raw code.
    const pendingKey = String(jevPendingClearanceKey || "R");
    const fundIds = new Set(
      [account, ...flat.map((x) => x.node)]
        .filter((a) => a != null && Number(a.bAllowNegative ?? 1) === 0)
        .map((a) => Number(a.id ?? a.nJournalAccountId))
        .filter(Boolean),
    );
    if (fundIds.size === 0) return null;

    let cents = 0;
    (jevEntries || []).forEach((e) => {
      if (String(e?.jev?.cJEVLinkType ?? "") !== String(jevCollectionKey)) return;
      if (
        String(e?.jev?.cStatus ?? "").trim() !== pendingKey
      )
        return;
      if (!fundIds.has(Number(e.nJournalAccountId))) return;
      cents += toCents(e.dAmount);
    });
    return cents / 100;
  }, [account, flat, jevEntries, jevCollectionKey, jevPendingClearanceKey]);

  // From / To / net per account = its own filtered entries + all descendants':
  // the same three numbers the entry table adds up (its From column, its To
  // column and its running Balance). Stored in whole cents — 0.1 + 0.2 !== 0.3
  // in doubles — and converted once, so a large report cannot drift. Cached
  // bottom-up so each id is computed once no matter how many rows ask for it.
  const totalsById = useMemo(() => {
    const cache = {};
    const compute = (node) => {
      if (cache[node.id]) return cache[node.id];
      let from = 0;
      let to = 0;
      (entriesByAccount[node.id] || []).forEach((e) => {
        if (Number(e.dAmount) < 0) from += toCents(e.dAmount);
        else to += toCents(e.dAmount);
      });
      (node.children || []).forEach((c) => {
        const kid = compute(c);
        from += kid.from;
        to += kid.to;
      });
      const totals = { from, to, net: (to - from) / 100 };
      cache[node.id] = totals;
      return totals;
    };
    if (account) compute({ id: account.id, children });
    flat.forEach((x) => compute(x.node));
    return cache;
  }, [account, children, flat, entriesByAccount]);

  // Balances keep their real sign — negative money always prints with a
  // minus and the red colour, regardless of the account's settings.
  const formatBalance = (net) => {
    const isNeg = net < 0;
    const value = Math.abs(net).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    });
    return { text: `${isNeg ? "-" : ""}${value}`, isNeg };
  };

  const nameById = useMemo(() => {
    const map = {};
    allAccounts.forEach((a) => {
      map[a.id] = a.accountName;
    });
    if (account) map[account.id] = account.accountName;
    return map;
  }, [allAccounts, account]);

  // "Parent / Child / Account" — walk up from the reported account
  const accountPath = useMemo(() => {
    if (!account) return "—";
    const byId = {};
    allAccounts.forEach((a) => {
      byId[a.id] = a;
    });
    const parts = [account.accountName];
    const seen = new Set([account.id]);
    let pid = account.nParentAccountId;
    while (pid && byId[pid] && !seen.has(pid)) {
      seen.add(pid);
      parts.unshift(byId[pid].accountName);
      pid = byId[pid].nParentAccountId;
    }
    return parts.join(" / ");
  }, [account, allAccounts]);
  // NOTE: filters/collapse state start fresh on mount — the parent unmounts
  // this panel whenever the report is closed, so no reset effect is needed.

  // The linked-accounts list INCLUDES the reported account itself — its
  // row sits on top (depth 0) with its own balance, fold toggle and entry
  // block, exactly like every linked account under it. `flat` (its linked
  // children) is a depth-first walk, so the list stays parent-before-child.
  const treeRows = useMemo(
    () => (account ? [{ node: account, depth: 0 }, ...flat] : []),
    [account, flat],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    // While a search is active every match stays visible — a folded branch
    // must never swallow a result.
    if (q) {
      return treeRows.filter((x) =>
        String(x.node.accountName ?? "")
          .toLowerCase()
          .includes(q),
      );
    }

    // Otherwise drop everything sitting beneath a collapsed row. `treeRows`
    // is a depth-first walk (parent before its children), so a stack of the
    // still open collapsed depths is enough to skip a whole subtree at once.
    const openBelow = [];
    return treeRows.filter((x) => {
      while (openBelow.length && x.depth <= openBelow[openBelow.length - 1])
        openBelow.pop();
      const visible = openBelow.length === 0;
      if (collapsedIds.has(rowKeyOf(x))) openBelow.push(x.depth);
      return visible;
    });
  }, [treeRows, search, collapsedIds]);

  // A row can fold only when something is drawn beneath it: linked accounts
  // and/or its own entry block.
  const isFoldable = ({ node }) =>
    (node.children?.length ?? 0) > 0 ||
    (entriesByAccount[node.id]?.length ?? 0) > 0;

  // Header toggle: "Collapse all" while anything is still showing beneath a
  // row, "Expand all" once every nested account and entry block is folded —
  // the reported account's own entry block included.
  const foldableRows = treeRows.filter(isFoldable);
  const somethingShown = filtered.some(
    (x) =>
      x.depth > 0 ||
      (!collapsedIds.has(rowKeyOf(x)) &&
        (entriesByAccount[x.node.id]?.length ?? 0) > 0),
  );
  const allCollapsed = foldableRows.length > 0 && !somethingShown;

  // Header controls: fold / unfold the whole tree at once. Marking every row
  // key is safe — rows with nothing beneath them simply don't render a toggle.
  const collapseAll = () => setCollapsedIds(new Set(treeRows.map(rowKeyOf)));
  const expandAll = () => setCollapsedIds(new Set());

  // The header's Collapse all / Expand all pill — same height as the search
  // box and the date-range chip next to it (both height: 32).
  const headerBtnSx = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0.2,
    px: 0.9,
    // Fixed width so toggling Collapse all ↔ Expand all never resizes the
    // pill. Below sm the label is hidden, so it shrinks to an icon-only chip.
    width: { xs: 32, sm: 94 },
    height: 32,
    borderRadius: "7px",
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.gray.sec,
    fontSize: "0.6rem",
    fontWeight: 600,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "inherit",
    "&:hover": {
      background: colors.hoverBg,
      borderColor: colors.blue.border,
      color: colors.blue.text,
    },
  };

  // The header's totals overlay only renders over a non-zero net — the
  // account name narrows only when it is actually on screen.
  const showHeaderTotals = (grandTotalsById[account?.id]?.net ?? 0) !== 0;

  // TRULY EMPTY report — the account has no linked accounts AND no entries
  // of its own. The linked-accounts card still renders (its search row and
  // the reported account's own row stay on top); only what sits UNDER them
  // becomes the empty banner.
  const noLinkedNoEntries =
    total === 0 && !(entriesByAccount[account?.id]?.length > 0);

  // The "No linked accounts" empty state, drawn INSIDE the linked-accounts
  // card — beneath the search row and the reported account's own row — so
  // the search box and the current account always stay visible above it.
  const emptyBanner = (
    <Box
      sx={{
        m: 1.25,
        py: 4,
        px: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        textAlign: "center",
        border: `1px dashed ${colors.border}`,
        borderRadius: "10px",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          background: colors.mutedBg,
          border: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.gray.muted,
        }}
      >
        <FolderOffOutlined sx={{ fontSize: "1.1rem" }} />
      </Box>
      <Typography
        sx={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: colors.gray.pri,
        }}
      >
        No linked accounts
      </Typography>
      <Typography sx={{ fontSize: "0.68rem", color: colors.gray.sec }}>
        {account?.accountName
          ? `“${account.accountName}” has no accounts linked to it yet.`
          : "This account has no accounts linked to it yet."}
      </Typography>
    </Box>
  );

  return (
    <>
      {/* ── Report body ──────────────────────────────────────────── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {/* ── Account being reported ──────────────────────────────── */}
        {/* Account Totals moved into the linked-accounts card above the search row. */}


        {/* The reported account's own entries now live on its row inside
            the linked-accounts list — it IS the first row of that list, so
            no separate entry block is drawn under the banner anymore. */}
        {/* The linked-accounts card ALWAYS renders — its search row and the
            reported account's own row stay on top even when the account has
            nothing linked to it; the "No linked accounts" banner then draws
            inside the card, beneath them. */}
          <Box
            sx={{
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* ── Reported account total (moved from banner to card top) ── */}
            <Box
              sx={{
                px: 1.25,
                py: 0.9,
                bgcolor: colors.violet.bg,
                borderBottom: `1px solid ${colors.violet.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                }}
              >
                <AccountBalanceOutlined
                  sx={{ fontSize: "0.85rem", color: colors.violet.text }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: colors.violet.text,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      lineHeight: 1,
                    }}
                  >
                    {account?.accountName ?? "Account"} Overall
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.55rem",
                      fontWeight: 600,
                      color: colors.violet.text,
                      opacity: 0.8,
                      mt: 0.2,
                      lineHeight: 1,
                    }}
                  >
                    {total} Linked Account{total === 1 ? "" : "s"}
                  </Typography>
                </Box>
              </Box>

              {(() => {
                const { from, to, net } = grandTotalsById[account?.id] ?? {
                  from: 0,
                  to: 0,
                  net: 0,
                };
                return (
                <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
                  <Box sx={{ ...MONEY_COL, ...MONEY_GAP }}>
                    <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: colors.violet.text, textTransform: "uppercase" }}>Debit</Typography>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, ...NUM_FONT, color: colors.red.text, textAlign: "right" }}>{fmtAmt(from / 100)}</Typography>
                  </Box>
                  <Box sx={{ ...MONEY_COL, ...MONEY_GAP }}>
                    <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: colors.violet.text, textTransform: "uppercase" }}>Credit</Typography>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, ...NUM_FONT, color: colors.green.text, textAlign: "right" }}>{fmtAmt(to / 100)}</Typography>
                  </Box>
                  <Box sx={MONEY_COL}>
                    <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: colors.violet.text, textTransform: "uppercase" }}>Total</Typography>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.1, ...NUM_FONT, color: net < 0 ? colors.red.text : colors.green.text, textAlign: "right" }}>
                      {`${net < 0 ? "-" : ""}${fmtAmt(Math.abs(net))}`}
                    </Typography>
                    {pendingClearanceTotal != null && (
                      <Typography
                        sx={{
                          fontSize: "0.45rem",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          ...NUM_FONT,
                          color: colors.violet.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {`Pending: ₱${pendingClearanceTotal < 0 ? "-" : ""}${fmtAmt(Math.abs(pendingClearanceTotal))}`}
                      </Typography>
                    )}
                  </Box>
                  {/* Overall Export */}
                  {onExport && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onExport?.(companyIdByJevId)}
                      aria-label="Export overall ledger"
                      title="Export overall ledger"
                      sx={{
                        width: 24,
                        height: 24,
                        p: 0,
                        ml: 1,
                        borderRadius: "6px",
                        border: `1px solid ${colors.violet.border}`,
                        background: colors.plateBg,
                        color: colors.violet.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        "&:hover": { background: "rgba(255,255,255,0.2)" },
                      }}
                    >
                      <FileDownloadOutlined sx={{ fontSize: "0.85rem" }} />
                    </Box>
                  )}
                </Box>
                );
              })()}
            </Box>

            {/* ── Search + date filter ─────────────────────────── */}
            <Box
              sx={{
                px: 1.25,
                py: 1,
                bgcolor: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  flex: "1 1 160px",
                  minWidth: 160,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "7px",
                  px: 1,
                  height: 32,
                }}
              >
                <SearchOutlined
                  sx={{ fontSize: "0.85rem", color: colors.gray.muted }}
                />
                <Box
                  component="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search linked accounts…"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "0.75rem",
                    color: colors.gray.pri,
                    "::placeholder": { color: colors.gray.muted },
                  }}
                />
              </Box>

              {/* Date window of this report — sits left of the fold-all
                  toggle (moved out of the banner's totals overlay). */}
              <Box
                component={onEditRange ? "button" : "div"}
                type={onEditRange ? "button" : undefined}
                onClick={onEditRange ?? undefined}
                title={
                  onEditRange
                    ? `Change the date range of this ledger (${rangeLabel})`
                    : `Date range of this ledger (${rangeLabel})`
                }
                aria-label={onEditRange ? "Change date range" : undefined}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.9,
                  borderRadius: "7px",
                  height: 32,
                  fontFamily: "inherit",
                  textAlign: "center",
                  cursor: onEditRange ? "pointer" : "default",
                  border: `1px solid ${dateFilterActive ? colors.blue.border : colors.border}`,
                  background: dateFilterActive ? colors.blue.bg : colors.inputBg,
                  color: dateFilterActive ? colors.blue.text : colors.gray.sec,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  ...(onEditRange && {
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      borderColor: colors.blue.border,
                      boxShadow: `0 0 0 2px ${colors.blue.bg}`,
                    },
                    "&:focus-visible": {
                      outline: "none",
                      borderColor: colors.blue.border,
                    },
                  }),
                }}
              >
                <EventOutlined
                  sx={{ fontSize: "0.95rem", color: colors.gray.muted }}
                />
                {rangeLabel}
              </Box>

              <Box
                component="button"
                type="button"
                onClick={allCollapsed ? expandAll : collapseAll}
                aria-label={allCollapsed ? "Expand all" : "Collapse all"}
                title={
                  allCollapsed
                    ? "Expand every linked account and show all entries"
                    : "Collapse every linked account and hide all entries"
                }
                sx={headerBtnSx}
              >
                {allCollapsed ? (
                  <ExpandMore sx={{ fontSize: "0.75rem" }} />
                ) : (
                  <ExpandLess sx={{ fontSize: "0.75rem" }} />
                )}
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  {allCollapsed ? "Expand all" : "Collapse all"}
                </Box>
              </Box>
            </Box>

            {/* ── Linked accounts ───────────────────────────────── */}
            {filtered.length === 0 ? (
              noLinkedNoEntries ? (
                // The account has nothing linked at all — the full empty
                // banner replaces the search's "no match" line, which would
                // otherwise just repeat the same fact.
                emptyBanner
              ) : (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography
                    sx={{ fontSize: "0.72rem", color: colors.gray.muted }}
                  >
                    No linked accounts match “{search.trim()}”
                  </Typography>
                </Box>
              )
            ) : (
              <Box sx={{ maxHeight: "65vh", overflowY: "auto" }}>
                {filtered.map(({ node, depth }, i) => {
                  const isLinked = !!node.nRecordId;
                  const kidCount = node.children?.length ?? 0;
                  const rowKey = rowKeyOf({ node, depth });
                  const isCollapsed = collapsedIds.has(rowKey);
                  const entryCount = entriesByAccount[node.id]?.length ?? 0;
                  const foldable = isFoldable({ node, depth });
                  // The reported account itself — the root of this list. It
                  // reads as SELECTED (tinted + accent edge, heavier name)
                  // and carries NO round toggle: folding it happens by
                  // clicking the row itself, like every other foldable row.
                  const isRootRow = node.id === account?.id;
                  // Solid separator on top of this account row when the row
                  // above it ends with a VISIBLE entry block — keeps each
                  // account's entries closed before the next account starts,
                  // and never stacks a line under a folded row.
                  const prev = i > 0 ? filtered[i - 1] : null;
                  const prevHadEntries =
                    !!prev &&
                    !collapsedIds.has(rowKeyOf(prev)) &&
                    (entriesByAccount[prev.node.id]?.length ?? 0) > 0;
                  return (
                    <Box key={rowKey}>
                      <Box
                        role={foldable ? "button" : undefined}
                        tabIndex={foldable ? 0 : undefined}
                        aria-expanded={foldable ? !isCollapsed : undefined}
                        onClick={(e) => {
                          // Clicks on the round toggle (or any future
                          // interactive element) already toggle themselves —
                          // letting them bubble would toggle twice.
                          if (e.target.closest("button")) return;
                          if (foldable) toggleRow(rowKey);
                        }}
                        onKeyDown={(e) => {
                          if (
                            foldable &&
                            (e.key === "Enter" || e.key === " ") &&
                            e.target === e.currentTarget
                          ) {
                            e.preventDefault();
                            toggleRow(rowKey);
                          }
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.25,
                          py: 0.75,
                          pl: 1.25,
                          // Selected-account treatment on the root row: a
                          // blue tint plus an inset accent edge on the left
                          // (no layout shift) so it never reads as just
                          // another account.
                          background: isRootRow ? colors.blue.bg : "transparent",
                          boxShadow: isRootRow
                            ? `inset 3px 0 0 ${colors.blue.text}`
                            : undefined,
                          borderTop: prevHadEntries
                            ? `1px solid ${colors.divider}`
                            : "none",
                          borderBottom: `1px solid ${colors.divider}`,
                          transition: "background .15s",
                          cursor: foldable ? "pointer" : "default",
                          outline: "none",
                          "&:hover": {
                            background: isRootRow
                              ? colors.blue.bg
                              : colors.hoverBg,
                          },
                          ...(foldable && {
                            "&:focus-visible": {
                              boxShadow: isRootRow
                                ? `inset 3px 0 0 ${colors.blue.text}, inset 0 0 0 1px ${colors.blue.border}`
                                : `inset 0 0 0 1px ${colors.blue.border}`,
                            },
                          }),
                        }}
                      >
                        <Box
                          sx={{
                            width: depth === 0 ? 26 : 22,
                            height: depth === 0 ? 26 : 22,
                            borderRadius: "6px",
                            background: colors.blue.bg,
                            border: `1px solid ${colors.blue.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            ml: depth * 2,
                          }}
                        >
                          <AccountBalanceOutlined
                            sx={{
                              fontSize: depth === 0 ? "0.75rem" : "0.68rem",
                              color: colors.blue.text,
                            }}
                          />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.6,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              title={node.accountName}
                              sx={{
                                fontSize: "0.72rem",
                                fontWeight: isRootRow ? 700 : 600,
                                color: isRootRow
                                  ? colors.blue.text
                                  : colors.gray.pri,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: 0,
                              }}
                            >
                              {node.accountName}
                            </Typography>
                            {isLinked && (
                              <Chip
                                tone="blue"
                                colors={colors}
                                icon={
                                  <LinkOutlined sx={{ fontSize: "0.65rem" }} />
                                }
                              >
                                Linked
                              </Chip>
                            )}
                          </Box>
                          {(kidCount > 0 || entryCount > 0) && (
                            <Typography
                              sx={{
                                fontSize: "0.58rem",
                                color: colors.gray.sec,
                                mt: 0.15,
                              }}
                            >
                              {[
                                kidCount > 0
                                  ? `${kidCount} linked account${kidCount === 1 ? "" : "s"}`
                                  : "",
                                entryCount > 0
                                  ? `${entryCount} entr${entryCount === 1 ? "y" : "ies"}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Typography>
                          )}
                        </Box>
                            {(() => {
                            const { from, to, net } = totalsById[node.id] ?? {
                              from: 0,
                              to: 0,
                              net: 0,
                            };
                            const { text } = formatBalance(net);
                            return (
                              <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
                                {/* Debit, Credit and Total */}
                                <Box sx={{ ...MONEY_COL, ...MONEY_GAP }}>
                                  {isRootRow && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.5rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                        color: colors.gray.sec,
                                        lineHeight: 1.2,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Debit
                                    </Typography>
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      ...NUM_FONT,
                                      color: colors.red.text,
                                      whiteSpace: "nowrap",
                                      textAlign: "right",
                                      mt: isRootRow ? 0.1 : 0,
                                    }}
                                  >
                                    {fmtAmt(from / 100)}
                                  </Typography>
                                </Box>
                                <Box sx={{ ...MONEY_COL, ...MONEY_GAP }}>
                                  {isRootRow && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.5rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                        color: colors.gray.sec,
                                        lineHeight: 1.2,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Credit
                                    </Typography>
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      ...NUM_FONT,
                                      color: colors.green.text,
                                      whiteSpace: "nowrap",
                                      textAlign: "right",
                                      mt: isRootRow ? 0.1 : 0,
                                    }}
                                  >
                                    {fmtAmt(to / 100)}
                                  </Typography>
                                </Box>
                                <Box sx={MONEY_COL}>
                                  {isRootRow && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.5rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                        color: colors.gray.sec,
                                        lineHeight: 1.2,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Total
                                    </Typography>
                                  )}
                                  <Typography
                                    title={`Debit ₱${fmtAmt(from / 100)} · Credit ₱${fmtAmt(to / 100)}`}
                                    sx={{
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      ...NUM_FONT,
                                      color:
                                        net > 0
                                          ? colors.green.text
                                          : net < 0
                                            ? colors.red.text
                                            : colors.gray.muted,
                                      whiteSpace: "nowrap",
                                      textAlign: "right",
                                      mt: isRootRow ? 0.1 : 0,
                                    }}
                                  >
                                    {text}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })()}

                        {/* Selected account only — icon-only Export sitting
                            where the other rows' fold toggle is. Its click
                            must not fold the row: the row handler already
                            ignores clicks from inside a button, and the
                            stopPropagation keeps it that way even if the
                            row handler changes. */}
                        {isRootRow && onExport && (
                          <Box
                            component="button"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // The export re-runs this panel's exact filter
                              // chain — hand it the voucher / inventory
                              // company map so its Company filter resolves
                              // the same entries the screen shows.
                              onExport?.(companyIdByJevId);
                            }}
                            aria-label="Export this ledger"
                            title="Export this ledger"
                            sx={{
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              p: 0,
                              lineHeight: 1,
                              borderRadius: "6px",
                              border: `1px solid ${colors.blue.border}`,
                              background: colors.inputBg,
                              color: colors.blue.text,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "background .15s",
                              "&:hover": {
                                background: colors.blue.bg,
                                borderColor: colors.blue.text,
                              },
                              "&:focus-visible": {
                                outline: "none",
                                borderColor: colors.blue.text,
                                boxShadow: `0 0 0 2px ${colors.blue.bg}`,
                              },
                            }}
                          >
                            <FileDownloadOutlined
                              sx={{ fontSize: "0.85rem" }}
                            />
                          </Box>
                        )}

                        {foldable && !isRootRow ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => toggleRow(rowKey)}
                            aria-expanded={!isCollapsed}
                            aria-label={
                              isCollapsed
                                ? `Show accounts and entries under ${node.accountName}`
                                : `Hide accounts and entries under ${node.accountName}`
                            }
                            title={
                              isCollapsed
                                ? "Show linked accounts and entries"
                                : "Hide linked accounts and entries"
                            }
                            sx={{
                              flexShrink: 0,
                              // +4px (mr: 0.5) matches the export button's
                              // footprint on the header / selected-account
                              // row, so every totals block ends at the same x.
                              mr: 0.5,
                              width: 20,
                              height: 20,
                              p: 0,
                              lineHeight: 1,
                              borderRadius: "50%",
                              border: `1px solid ${isCollapsed ? colors.blue.border : colors.border}`,
                              background: isCollapsed
                                ? colors.blue.bg
                                : colors.mutedBg,
                              color: isCollapsed
                                ? colors.blue.text
                                : colors.gray.sec,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "background .15s",
                              "&:hover": {
                                background: colors.hoverBg,
                                borderColor: colors.blue.border,
                                color: colors.blue.text,
                              },
                            }}
                          >
                            {isCollapsed ? (
                              <ExpandLess sx={{ fontSize: "0.8rem" }} />
                            ) : (
                              <ExpandMore sx={{ fontSize: "0.8rem" }} />
                            )}
                          </Box>
                        ) : (
                          // No toggle on this row. Only toggle-less rows get
                          // the invisible spacer that keeps every balance on the same right edge.
                          !isRootRow && (
                            <Box
                              aria-hidden
                              sx={{ flexShrink: 0, mr: 0.5, width: 20, height: 20 }}
                            />
                          )
                        )}
                      </Box>

                      {!isCollapsed &&
                        // An entry block is drawn ONLY when the row has
                        // entries of its own. A parent account whose money
                        // all sits on its linked children (or the reported
                        // account in a truly empty report) has none — so its
                        // unfolded row shows nothing beneath it instead of a
                        // "No data available" table that could never fill.
                        entryCount > 0 && (
                        <EntryBranch
                          entries={entriesByAccount[node.id] || []}
                          colors={colors}
                          byJev={byJev}
                          nameById={nameById}
                          payeeByJevId={payeeByJevId}
                          receivedSupplierByJevId={receivedSupplierByJevId}
                          companyByJevId={companyByJevId}
                          jevReceivedPurchasesKey={jevReceivedPurchasesKey}
                          onOpenJev={openJevModal}
                          onTransferEntry={handleTransferEntry}
                          sx={{
                            // Left edge aligns flush with the container without indentation
                            ml: 1.5,
                            mr: 1.5,
                            mt: 1,
                            mb: 1.5,
                            width: "calc(100% - 24px)",
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* TRULY EMPTY — the banner sits inside the card, under the
                reported account's own row, so the search row and that row
                stay on top of it. */}
            {noLinkedNoEntries && filtered.length > 0 && emptyBanner}
          </Box>
      </Box>

      {/* ── JEV number click → the journal's own page (/jev-update) ──── */}

      {/* ── Entry row Transfer → re-assign that entry line to another
          journal account. Only the entry moves — the accounts and the
          JEV itself stay put. The modal dispatches
          "jev_entry_data_updated" on success, which the hook already
          listens to, so the report refetches on its own. */}
      <TransferEntryModal
        open={!!transferEntry}
        onClose={() => setTransferEntry(null)}
        entry={transferEntry}
      />
    </>
  );
}

export default LedgerPanel;
