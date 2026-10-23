import { Fragment, useCallback, useMemo, useState } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Visibility,
  ReceiptLongOutlined,
  Inventory2Outlined,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter.js";
import {
  itemTotal,
  hasDeliveredRows,
  isDeliveredRow,
  rowTransactionItemId,
  rowTransactionId,
} from "../itemRows.js";
import PickableValue from "../../jev/components/AmountPick.jsx";
// ─────────────────────────────────────────────────────────────────────
// THE INVENTORY "ITEMS" TABLE
// The voucher-particulars layout (sticky column header, scrollable rows,
// Grand Total bar) that answers one question everywhere it is used — WHICH
// batches does this JEV cover?
//
//   • the Pending JEV drill-down      → interactive, rows open the item,
//                                       ACTIONS column shown;
//   • the "Add / Edit Entry" modal    → read-only, scoped to that JEV's own
//                                       rows (a click there would unmount
//                                       the very form being filled in);
//   • the shared read-only JEV viewer → read-only, for JEVs with no voucher
//                                       behind them, so its Particulars
//                                       block never comes up empty.
//
// Self-contained: it paints its own theme colours, so a host only hands
// over `rows` + `total` (+ `sellingPrices` on the DELIVERED side, which
// adds UNIT SELLING PRICE and TOTAL SELLING PRICE — a price only means
// something once the batch has gone out, so a received table stays as it
// was).
// ─────────────────────────────────────────────────────────────────────

// Cell geometry is SHARED by the column header and the item rows so every
// title sits exactly above its own data column. QTY / UNIT PRICE / TOTAL /
// ACTIONS all use ONE width so the columns line up evenly.
const COL_W = 90;

const cellSx = (width, align = "left") => ({
  width,
  flexShrink: 0,
  textAlign: align,
});

// ONLY the tokens this table paints with. Named `makeColors` (not
// `useColors`) so calling it inside useMemo doesn't trip
// react-hooks/rules-of-hooks — same trick JevListView uses.
const makeColors = (c) => ({
  border: c.slate.border,
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  hover: c.slate.hover,
  outerBg: c.slate.outerBg,
  scrollbarThumb: c.slate.scrollbarThumb,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
  purple: { bg: c.purple.bg, border: c.purple.border, text: c.purple.text },
  blue: { text: c.blue.text },
  orange: { text: c.orange.text },
  // foreground for the count badge that sits on gray.textSecondary
  textOnFill: c.gray.textOnFill,
});

// `wrap` lets the longer selling-price titles break onto a second line
// instead of punching through a column that is only COL_W wide — the
// header cell keeps the exact width of the cell it labels either way.
const HeaderCell = ({
  label,
  colors,
  width,
  grow = false,
  align = "left",
  wrap = false,
}) => (
  <Box
    sx={{
      // Matches the data cell it labels: fixed columns never shrink,
      // the grow column stretches the same way on every breakpoint.
      ...(grow
        ? { flex: { sm: 1 }, minWidth: { xs: 180, sm: 0 } }
        : cellSx(width)),
      textAlign: align,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        color: colors.gray.textSecondary,
        letterSpacing: "0.03em",
        whiteSpace: wrap ? "normal" : "nowrap",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// Icon square + overlapping sequence badge
const RowIcon = ({ icon, index, colors, tint }) => (
  <Box sx={{ position: "relative", flexShrink: 0 }}>
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "7px",
        background: tint.bg,
        border: `0.5px solid ${tint.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </Box>
    <Box
      sx={{
        position: "absolute",
        top: -5,
        left: -5,
        minWidth: 13,
        height: 13,
        px: 0.25,
        borderRadius: "50px",
        background: colors.gray.textSecondary,
        border: `1.5px solid ${colors.outerBg}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.4rem",
          fontWeight: 600,
          color: colors.textOnFill,
          lineHeight: 1,
        }}
      >
        {index + 1}
      </Typography>
    </Box>
  </Box>
);

// Sticky Grand Total bar — identical shell to the voucher particulars
// footer. On the delivered side it also sums the TOTAL SELLING PRICE
// column (sellingTotal = null hides that line, so a received table looks
// exactly as it always did).
const TotalFooter = ({
  colors,
  count,
  countLabel,
  amount,
  sellingTotal = null,
}) => {
  const rows = [
    {
      label: "Total Purchase Price",
      value: fmtPHP(amount),
      raw: amount,
      color: colors.orange.text,
    },
    ...(sellingTotal != null
      ? [
          {
            label: "Total Selling Price",
            value: fmtPHP(sellingTotal),
            raw: sellingTotal,
            color: colors.gray.textPrimary,
          },
        ]
      : []),
  ];

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.875,
        display: "flex",
        alignItems: "center",
        background: colors.totalBg,
        borderTop: `1px solid ${colors.totalBorder}`,
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "7px",
          background: colors.purple.bg,
          border: `0.5px solid ${colors.purple.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mr: 1,
          flexShrink: 0,
        }}
      >
        <ReceiptLongOutlined
          sx={{ fontSize: "0.85rem", color: colors.purple.text }}
        />
      </Box>

      {/* LEFT: title + item count */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.67rem",
            fontWeight: 700,
            color: colors.gray.textPrimary,
          }}
        >
          Grand Total
        </Typography>
        <Typography
          sx={{ fontSize: "0.54rem", color: colors.gray.textSecondary }}
        >
          {count} {countLabel}
        </Typography>
      </Box>

      {/* RIGHT: Label: Value pairs */}
      <Box
        sx={{
          flexShrink: 0,
          display: "grid",
          gridTemplateColumns: "auto auto",
          columnGap: 1.5,
          rowGap: 0.35,
          alignItems: "baseline",
        }}
      >
        {rows.map(({ label, value, raw, color }) => (
          <Fragment key={label}>
            <Typography
              sx={{
                fontSize: "0.58rem",
                fontWeight: 600,
                color: colors.gray.textSecondary,
                textAlign: "right",
              }}
            >
              {label}:
            </Typography>
            {/* Click-to-fill (entry modal only — see AmountPick.jsx) */}
            <PickableValue
              value={raw}
              sx={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color,
                textAlign: "right",
              }}
            >
              {value}
            </PickableValue>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
};

// The unit selling price of ONE row: undefined = nothing to show (the
// lookup hasn't reached it, the row has no transaction item, or its set
// carries no price) — printed as a dash instead of a made-up ₱0.00.
const unitSellingPriceOf = (row, prices) => {
  const id = rowTransactionItemId(row);
  if (id == null) return undefined;
  return prices?.[String(id)];
};

// The row's share of the TOTAL SELLING PRICE column = unit × qty (qty is
// already absolute on a mapped row). Unknown price stays unknown so the
// cell prints a dash instead of a ₱0.00 nobody set.
const rowSellingTotal = (row, prices) => {
  const unit = unitSellingPriceOf(row, prices);
  return unit === undefined ? undefined : unit * Number(row.nQuantity ?? 0);
};

const fmtSelling = (value) => (value === undefined ? "—" : fmtPHP(value));

// ─────────────────────────────────────────────────────────────────────
// THE ITEMS HEADER CARD
//
// The header of an items table: the PO number(s) the batches were bought
// on, the supplier behind them, and the triangle that folds the rows
// away. Clicking ANYWHERE on the card folds/unfolds it — the triangle is
// only the visual cue.
//
// It lives INSIDE the table's own container, so the header, the column
// header, the rows and the Grand Total bar read as ONE card — the same
// shape as the voucher's assignee card.
// ─────────────────────────────────────────────────────────────────────
export function ItemsHeaderCard({
  colors,
  // [{ label, poId }] — the code(s) on top. A code that knows its PO id is
  // a link to that PO in Item Purchasing.
  codes = [],
  name = "",
  open,
  onToggle,
  onOpenPO,
}) {
  const titles = (codes ?? []).filter((v) => v?.label && v.label !== "—");

  return (
    <Box
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 2,
        py: 1,
        background: colors.itemHeaderBg,
        borderBottom: `0.5px solid ${colors.divider}`,
        cursor: "pointer",
        userSelect: "none",
        "&:hover": { background: colors.hover },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {titles.length > 0 && (
          <Typography
            component="div"
            sx={{
              fontSize: { xs: "0.5rem", sm: "0.55rem", md: "0.58rem" },
              fontWeight: 700,
              color: colors.gray.textMuted,
              textTransform: "uppercase",
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {titles.map((t, i) => (
              <Box
                key={t.label}
                component="span"
                onClick={(e) => {
                  if (!t.poId || !onOpenPO) return;
                  e.stopPropagation();
                  onOpenPO(t.poId);
                }}
                title={t.poId ? "Open this PO in Item Purchasing" : undefined}
                sx={{
                  font: "inherit",
                  // Blue — a PO code with an id behind it is a link.
                  color: t.poId && onOpenPO ? colors.blue.text : "inherit",
                  cursor: t.poId && onOpenPO ? "pointer" : "inherit",
                  textDecoration: "none",
                  "&:hover": t.poId && onOpenPO
                    ? { textDecoration: "underline" }
                    : undefined,
                }}
              >
                {i > 0 ? " · " : ""}
                {t.label}
              </Box>
            ))}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
            fontWeight: 700,
            color: colors.gray.textPrimary,
            textTransform: "uppercase",
            lineHeight: 1,
            mt: 0.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name || "—"}
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        title={open ? "Hide the items" : "Show the items"}
        sx={{
          width: { xs: 18, sm: 20 },
          height: { xs: 18, sm: 20 },
          color: colors.gray.textMuted,
          border: `0.5px solid ${colors.border}`,
          borderRadius: "50px",
          p: 0,
          flexShrink: 0,
        }}
      >
        {open ? (
          <KeyboardArrowUp sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
        ) : (
          <KeyboardArrowDown sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
        )}
      </IconButton>
    </Box>
  );
}

export default function ItemsTable({
  rows = [],
  total = 0,
  // Read-only hosts (the entry modal, the shared JEV viewer) pass no
  // onRowClick: no ACTIONS column, no hover, no pointer cursor.
  readonly = false,
  onRowClick = null,
  // The header card (PO number · supplier · triangle) painted INSIDE the
  // table's own container, above the column header row.
  showHeader = true,
  // nTransactionItemId → unit selling price, from useSellingPrices.
  // Only read on the delivered side, so a host may just always pass it.
  sellingPrices = {},
  // null = decide from the rows themselves (a delivered batch shows the
  // selling columns, nothing else does). false is for a host that KNOWS
  // its view is the RECEIVED side even though a delivered aggregate sits
  // in it — the shared JEV viewer passes it for an R JEV, whose table is
  // the batches received under that JEV, valued at cost.
  showSellingOverride = null,
  // The brand · model becomes a LINK when this is set: it opens the
  // transaction the batch was bought on. The callback receives the row.
  onBrandClick = null,
  // The PO code (header card + delivered rows) is a LINK while this is
  // true — false renders every PO code as plain text. The JEV viewer
  // turns it off for finance; on the PO itself management keeps the jump.
  poNavigable = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => makeColors(base), [base]);

  const navigate = useNavigate();

  const interactive = !readonly && typeof onRowClick === "function";

  // The PO code is a LINK: it opens that PO in Item Purchasing, the same
  // route the voucher page's PO list uses.
  const openPurchaseOrder = useCallback(
    (nPurchaseOrderId) => {
      // A host that says the PO must NOT navigate silences the internal
      // jump entirely (finance on the JEV viewer).
      if (!poNavigable || nPurchaseOrderId == null) return;
      navigate(`/item-purchasing-update?id=${nPurchaseOrderId}`);
    },
    [navigate, poNavigable],
  );

  const showSelling = showSellingOverride ?? hasDeliveredRows(rows);

  // The header card folds the rows away — the header itself and the Grand
  // Total bar stay, so a folded table still says what it holds.
  const [open, setOpen] = useState(true);

  // WHICH SIDE is this table about? A batch on its way OUT belongs to the
  // client — its header carries the TRANSACTION code and the client's name;
  // a batch on its way IN belongs to the supplier — its header carries the
  // PO number and the supplier's name. A host that KNOWS its side says so;
  // otherwise the rows themselves decide (the majority direction wins).
  const clientSide = useMemo(() => {
    if (showSellingOverride === false) return false;
    if (showSellingOverride === true) return true;
    if (!rows.length) return false;
    const delivered = rows.filter(isDeliveredRow).length;
    return delivered * 2 > rows.length;
  }, [rows, showSellingOverride]);

  // What the header card shows: the code on top, the counterparty under it.
  // The received side's code IS a PO number — it carries the PO's id, so it
  // opens that PO in Item Purchasing. The delivered side's code is a
  // transaction code: nothing to open.
  const headerCodes = useMemo(() => {
    if (clientSide) {
      return [
        ...new Set(rows.map((r) => r.strTransactionCode).filter((v) => v && v !== "—")),
      ].map((label) => ({ label, poId: null }));
    }
    const byCode = new Map();
    rows.forEach((r) => {
      const label = r.strPurchaseOrderNo;
      if (!label || label === "—") return;
      if (!byCode.has(label)) byCode.set(label, r.nPurchaseOrderId ?? null);
    });
    return [...byCode.entries()].map(([label, poId]) => ({ label, poId }));
  }, [rows, clientSide]);

  const headerName = useMemo(() => {
    const field = clientSide ? "strClientNickName" : "strSupplierNickName";
    const found = rows.find((r) => r[field] && r[field] !== "—");
    return found?.[field] ?? "—";
  }, [rows, clientSide]);

  console.log(
    rows[0] && {
      showSelling,
      txn: rowTransactionId(rows[0]),
      item: rowTransactionItemId(rows[0]),
      sellingPrices,
    },
  );
  const sellingTotal = useMemo(() => {
    if (!showSelling) return null;
    let known = false;
    const sum = rows.reduce((acc, row) => {
      const value = rowSellingTotal(row, sellingPrices);
      if (value !== undefined) known = true;
      return acc + Number(value ?? 0);
    }, 0);
    // Nothing priced yet (the prices arrive after first paint) — print no
    // line at all rather than a ₱0.00 under a column of dashes.
    return known ? sum : null;
  }, [rows, showSelling, sellingPrices]);

  const headerSx = {
    px: 2,
    py: 1,
    display: "flex",
    alignItems: "center",
    gap: 1,
    // Same wrapping rules as the item rows, so headers stay lined up
    // with their columns on narrow screens too.
    flexWrap: { xs: "wrap", sm: "nowrap" },
    background: colors.itemHeaderBg,
    borderBottom: `0.5px solid ${colors.divider}`,
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const panelSx = {
    mb: 1.5,
    borderRadius: "10px",
    border: `0.5px solid ${colors.border}`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "60vh",
  };
  const scrollSx = {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    "&::-webkit-scrollbar": { width: 3 },
    "&::-webkit-scrollbar-thumb": {
      background: colors.scrollbarThumb,
      borderRadius: 2,
    },
  };
  const valueSx = {
    fontSize: "0.66rem",
    fontWeight: 700,
    color: colors.gray.textSecondary,
  };
  const actionBtnSx = {
    width: 20,
    height: 20,
    color: colors.blue.text,
    opacity: 0.6,
    p: 0,
  };

  if (!rows.length) {
    return (
      <Box
        sx={{
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${colors.border}`,
          px: 2,
          py: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}>
          No items found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={panelSx}>
      {/* The header card (PO number · supplier · triangle) lives INSIDE the
          table's own container, so the whole thing reads as one card.
          Clicking it folds/unfolds the rows. */}
      {showHeader && (
        <ItemsHeaderCard
          colors={colors}
          codes={headerCodes}
          name={headerName}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          onOpenPO={poNavigable ? openPurchaseOrder : undefined}
        />
      )}
      {open && (
      <Box sx={scrollSx}>
        {/* COLUMN HEADER */}
        <Box sx={headerSx}>
          <Box sx={{ width: 20, flexShrink: 0, textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              #
            </Typography>
          </Box>
          <HeaderCell label="ITEMS" colors={colors} grow />
          <HeaderCell
            label="QTY"
            colors={colors}
            width={COL_W}
            align="center"
          />
          <HeaderCell
            label="PURCHASE PRICE"
            colors={colors}
            width={COL_W}
            align="right"
            wrap
          />
          {showSelling && (
            <HeaderCell
              label="SELLING PRICE"
              colors={colors}
              width={COL_W}
              align="right"
              wrap
            />
          )}
          <HeaderCell
            label="TOTAL PURCHASE"
            colors={colors}
            width={COL_W}
            align="right"
            wrap
          />
          {showSelling && (
            <HeaderCell
              label="TOTAL SELLING"
              colors={colors}
              width={COL_W}
              align="right"
              wrap
            />
          )}
          {interactive && (
            <HeaderCell
              label="ACTIONS"
              colors={colors}
              width={COL_W}
              align="center"
            />
          )}
        </Box>

        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          return (
            <Box
              key={row.id ?? `item-${idx}`}
              onClick={interactive ? () => onRowClick(row) : undefined}
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                justifyContent: "space-between",
                flexWrap: { xs: "wrap", sm: "nowrap" },
                borderBottom: isLast ? "none" : `0.5px solid ${colors.divider}`,
                cursor: interactive ? "pointer" : "default",
                "&:hover": interactive
                  ? { background: colors.hover }
                  : undefined,
              }}
            >
              {/* LEFT: the numbering + brand/model + date */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flex: { sm: 1 },
                  minWidth: { xs: 180, sm: 0 },
                }}
              >
                {/* The numbering — its own narrow column, centred on the
                    row (same as the Purchase Items table). */}
                <Box
                  sx={{
                    width: 20,
                    flexShrink: 0,
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: colors.gray.textSecondary,
                      lineHeight: 1,
                    }}
                  >
                    {idx + 1}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* The PO this batch was bought on — right on top of the
                      brand · model it belongs to. Only on the DELIVERED
                      side: there the header carries the transaction code,
                      so the PO is what tells the rows apart. On the For
                      Delivery side the header already shows the PO. */}
                  {isDeliveredRow(row) &&
                    row.strPurchaseOrderNo &&
                    row.strPurchaseOrderNo !== "—" && (
                    <Typography
                      component="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPurchaseOrder(row.nPurchaseOrderId);
                      }}
                      title={
                        poNavigable && row.nPurchaseOrderId
                          ? "Open this PO in Item Purchasing"
                          : undefined
                      }
                      sx={{
                        // The box hugs the text — otherwise the whole column
                        // width is a link and clicking the empty space opens
                        // the PO.
                        display: "inline-block",
                        width: "fit-content",
                        maxWidth: "100%",
                        textAlign: "left",
                        p: 0,
                        border: "none",
                        background: "transparent",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        // Blue — it is a link, like every other PO code. A
                        // non-navigable host (finance on the JEV viewer)
                        // reads it as plain muted text.
                        color:
                          poNavigable && row.nPurchaseOrderId
                            ? colors.blue.text
                            : colors.gray.textSecondary,
                        textTransform: "uppercase",
                        lineHeight: 1,
                        mb: 0.15,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor:
                          poNavigable && row.nPurchaseOrderId
                            ? "pointer"
                            : "default",
                        "&:hover":
                          poNavigable && row.nPurchaseOrderId
                            ? { textDecoration: "underline" }
                            : undefined,
                      }}
                    >
                      {row.strPurchaseOrderNo}
                    </Typography>
                  )}
                  <Typography
                    onClick={onBrandClick ? () => onBrandClick(row) : undefined}
                    title={
                      onBrandClick
                        ? "Open this transaction for purchase"
                        : undefined
                    }
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      // A link looks like a link.
                      color: onBrandClick
                        ? colors.blue.text
                        : colors.gray.textPrimary,
                      textTransform: "uppercase",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: onBrandClick ? "pointer" : "default",
                      ...(onBrandClick && {
                        "&:hover": { textDecoration: "underline" },
                      }),
                    }}
                  >
                    {row.strBrandModel}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.58rem",
                      color: colors.gray.textMuted,
                      textTransform: "uppercase",
                      lineHeight: 1.1,
                      mt: 0.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.dtLog}
                  </Typography>
                </Box>
              </Box>

              {/* QTY | PURCHASE PRICE | SELLING PRICE | TOTAL PURCHASE | TOTAL SELLING | ACTIONS */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexShrink: 0,
                }}
              >
                {/* QTY */}
                <Box sx={cellSx(COL_W, "center")}>
                  <Typography sx={valueSx}>
                    {fmtQty(row.nQuantity)}{" "}
                    <Typography
                      component="span"
                      sx={{ fontSize: "0.5rem", color: valueSx.color }}
                    >
                      {row.strUOM}
                    </Typography>
                  </Typography>
                </Box>

                {/* PURCHASE PRICE */}
                <Box sx={cellSx(COL_W, "right")}>
                  <PickableValue
                    value={Number(
                      row._raw?.purchaseOption?.dUnitPrice ?? 0,
                    )}
                    sx={valueSx}
                  >
                    {fmtPHP(Number(row._raw?.purchaseOption?.dUnitPrice ?? 0))}
                  </PickableValue>
                </Box>

                {/* SELLING PRICE — delivered rows only */}
                {showSelling && (
                  <Box sx={cellSx(COL_W, "right")}>
                    <PickableValue
                      value={unitSellingPriceOf(row, sellingPrices)}
                      sx={valueSx}
                    >
                      {fmtSelling(unitSellingPriceOf(row, sellingPrices))}
                    </PickableValue>
                  </Box>
                )}

                {/* TOTAL PURCHASE PRICE */}
                <Box sx={cellSx(COL_W, "right")}>
                  <PickableValue value={itemTotal(row)} sx={valueSx}>
                    {fmtPHP(itemTotal(row))}
                  </PickableValue>
                </Box>

                {/* TOTAL SELLING PRICE — delivered rows only */}
                {showSelling && (
                  <Box sx={cellSx(COL_W, "right")}>
                    <PickableValue
                      value={rowSellingTotal(row, sellingPrices)}
                      sx={valueSx}
                    >
                      {fmtSelling(rowSellingTotal(row, sellingPrices))}
                    </PickableValue>
                  </Box>
                )}

                {/* ACTIONS */}
                {interactive && (
                  <Box
                    sx={{
                      ...cellSx(COL_W),
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                      sx={actionBtnSx}
                    >
                      <Visibility sx={{ fontSize: "0.75rem" }} />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      )}

      <TotalFooter
        colors={colors}
        count={rows.length}
        countLabel={rows.length === 1 ? "item" : "items"}
        amount={total}
        sellingTotal={sellingTotal}
      />
    </Box>
  );
}
