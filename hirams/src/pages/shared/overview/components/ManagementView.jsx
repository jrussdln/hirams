import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  Chip,
  Avatar,
  LinearProgress,
  Select,
  MenuItem,
  Menu,
  FormControl,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../utils/style/getThemeColors";
import ChartStructure from "../../../../components/ui/structure/ChartStructure";
import { fmtDate, fmtDateTime } from "../../../../utils/helpers/timeZone";
import { getDueDateColor } from "../../../../utils/helpers/dueDateColor";
import useKeysLabels from "../../../../hooks/useKeysLabels";
import { fmtPHP } from "../../../../utils/formatters/formatter";
import { calculateCollectionEWT } from "../../../../utils/helpers/calculateEWT";
import { calculateCollectionTax } from "../../../../utils/helpers/calculateTax";
import { getItem, setItem } from "../../../../utils/storage/localStorage";
import { cardSx, cardVariants } from "./overviewStyles";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  People,
  Business,
  Group,
  LocalShipping,
  TrendingUp,
  ExpandMore,
  ExpandLess,
  KeyboardArrowDown,
  QueryStatsOutlined,
  WarningAmberRounded,
  ChevronRight,
} from "@mui/icons-material";
import OverviewAPI from "../../../../api/endpoints/overview.api";
import useAttentionItems from "../../../../hooks/useAttentionItems";
import NeedsAttentionBanner from "./NeedsAttentionBanner";
import { quickRange } from "../../../../components/ui/form/FilterDate.jsx";
import CustomTable from "../../../../components/ui/form/Table.jsx";

// ─── Data (dummy chart placeholders) ────────────────────────────────────────
const monthlyData = [
  { month: "Jan", views: 8000, expenses: 5000 },
  { month: "Feb", views: 10000, expenses: 6200 },
  { month: "Mar", views: 7000, expenses: 4800 },
  { month: "Apr", views: 12000, expenses: 7100 },
  { month: "May", views: 9000, expenses: 5500 },
  { month: "Jun", views: 11000, expenses: 6800 },
];
const statusData = [
  { name: "Active", value: 42 },
  { name: "Pending", value: 18 },
  { name: "Inactive", value: 10 },
  { name: "Completed", value: 30 },
];
// Chart series colours come from chart.* and are mode-INDEPENDENT by design:
// a series must keep the SAME identity in both themes or the tooltip and the
// legend stop agreeing with the bars. Read once at module scope — these are
// plain data arrays, not components, so no hooks are possible here.
const chart = getThemeColors(false).chart;

const PIE_COLORS = [chart.pie.blue, chart.pie.amber, chart.pie.gray, chart.pie.green];

const STAGE_PALETTE = chart.stage;

// ─── Shared Styles — cardSx / cardVariants live in ./overviewStyles ─────────

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ item, index, theme }) {
  const Icon = item.icon;
  return (
    <Grid item xs={12} sm={6} md={3}>
      <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <Card sx={cardSx(theme, item.color)}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.62rem",
                }}
              >
                {item.title}
              </Typography>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                <CountUp
                  start={0}
                  end={Number(item.value)}
                  duration={2}
                  separator=","
                  useEasing
                  easingFn={(t) => t * t * t}
                />
              </Typography>
              {item.change && (
                <Typography
                  variant="caption"
                  sx={{
                    color: item.color,
                    fontWeight: 600,
                    fontSize: "0.68rem",
                  }}
                >
                  {item.change}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                backgroundColor: item.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon sx={{ color: item.color, fontSize: 20 }} />
            </Box>
          </Box>
        </Card>
      </motion.div>
    </Grid>
  );
}

// ── Theme Token Map — only tokens THIS component actually uses ──
const useColors = (c) => ({
  navyText: c.navy.text, // brand navy — section header icon (was color: "primary.main")

  // "N active" / year count chip
  chipBg: c.blue.infoChipBg,
  chipText: c.blue.infoChipText,

  // list surfaces
  stageTrack: c.slate.stageTrack,
  rowHover: c.slate.cardHover,
  progressTrack: c.slate.progressTrack,
  dueRule: c.slate.dueRule,

  // inline Revenue / Expenses / Profit figures
  revenueText: c.blue.text,
  expenseText: c.totals.expenses,
  profitPos: c.totals.profitPos,
  profitNeg: c.totals.profitNeg,

  // ranking row tints — the shapes match what medalColor() returns
  gold: {
    bg: c.medal.gold.bg,
    border: c.medal.gold.border,
    text: c.medal.gold.text,
  },
  silver: {
    bg: c.medal.silver.bg,
    border: c.medal.silver.border,
    text: c.medal.silver.text,
  },
  bronze: {
    bg: c.medal.bronze.bg,
    border: c.medal.bronze.border,
    text: c.medal.bronze.text,
  },
  plain: {
    bg: c.medal.plain.bg,
    border: c.medal.plain.border,
    text: c.medal.plain.text,
  },

  // KPI tiles
  metricUsers: { color: c.metric.users.color, bg: c.metric.users.bg },
  metricCompany: { color: c.metric.company.color, bg: c.metric.company.bg },
  metricClients: { color: c.metric.clients.color, bg: c.metric.clients.bg },
  metricSuppliers: { color: c.metric.suppliers.color, bg: c.metric.suppliers.bg },

  // Needs Attention banner — the amber warn family
  warn: {
    bg: c.amber.warnBg,
    border: c.amber.warnBorder,
    text: c.amber.warnText,
    hoverBg: c.amber.warnHoverBg,
    surface: c.amber.surface,
    signalBorder: c.amber.signalBorder,
    signalText: c.amber.signalText,
  },
});

function SectionHeader({ icon: Icon, title }) {
  // ✅ Standard wiring — PROMPT 1 pattern
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Icon sx={{ color: colors.navyText, fontSize: 20 }} />
      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
        {title}
      </Typography>
    </Box>
  );
}

/** Ongoing Transactions panel — funnel by stage + urgency-sorted worklist */
function OngoingTransactionsPanel({
  transactions,
  stageOrder,
  navigate,
  sessionKey,
  theme,
}) {
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));

  const stageCounts = useMemo(() => {
    const counts = {};
    stageOrder.forEach((s) => (counts[s.key] = 0));
    transactions.forEach((t) => {
      const code = String(t.status_code ?? "");
      if (counts[code] !== undefined) counts[code]++;
    });
    return counts;
  }, [transactions, stageOrder]);

  const totalOngoing = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  const worklist = useMemo(() => {
    return [...transactions]
      .filter((t) => t.dtAODueDate)
      .sort((a, b) => new Date(a.dtAODueDate) - new Date(b.dtAODueDate))
      .slice(0, 6);
  }, [transactions]);

  return (
    <Card sx={{ ...cardSx(theme), p: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Ongoing Transactions
        </Typography>
        <Chip
          label={`${totalOngoing} active`}
          size="small"
          sx={{
            bgcolor: colors.chipBg,
            color: colors.chipText,
            fontWeight: 700,
            fontSize: "0.68rem",
          }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
        {stageOrder.length === 0 && (
          <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
            Loading stages…
          </Typography>
        )}
        {stageOrder.map((stage) => {
          const count = stageCounts[stage.key] ?? 0;
          const pct = totalOngoing > 0 ? (count / totalOngoing) * 100 : 0;
          return (
            <Box
              key={stage.key}
              onClick={() => {
                // Same store the transaction page reads its selected status
                // from (setItem → localStorage, "hirams_" prefix). Writing to
                // raw sessionStorage was never seen by /transaction, so it
                // always opened on the previously selected status.
                setItem(sessionKey, stage.key);
                navigate("/transaction");
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                "&:hover .stage-bar": { opacity: 0.85 },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  minWidth: 120,
                  color: "text.secondary",
                }}
                noWrap
              >
                {stage.label}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 16,
                  borderRadius: 1,
                  background: colors.stageTrack,
                  overflow: "hidden",
                }}
              >
                <Box
                  className="stage-bar"
                  sx={{
                    width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                    height: "100%",
                    background: stage.color,
                    transition: "width 0.4s ease, opacity 0.15s",
                    borderRadius: 1,
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  minWidth: 20,
                  textAlign: "right",
                }}
              >
                {count}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "text.disabled",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          mb: 1,
        }}
      >
        Needs Attention
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {worklist.length === 0 && (
          <Typography
            sx={{ fontSize: "0.72rem", color: "text.disabled", py: 1 }}
          >
            Nothing due soon.
          </Typography>
        )}
        {worklist.map((t) => {
          const dueColor = getDueDateColor(t.dtAODueDate);
          const stage = stageOrder.find((s) => s.key === String(t.status_code));
          return (
            <Box
              key={t.id}
              onClick={() => {
                // Look at THIS transaction's own status, the way the Look Up
                // modal does, instead of leaving whatever was last selected.
                if (stage?.key) setItem(sessionKey, stage.key);
                navigate("/transaction");
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                borderLeft: `3px solid ${dueColor || colors.dueRule}`,
                cursor: "pointer",
                "&:hover": {
                  background: colors.rowHover,
                },
              }}
            >
              <Box flex={1} minWidth={0}>
                <Typography
                  sx={{ fontSize: "0.72rem", fontWeight: 600 }}
                  noWrap
                >
                  {t.transactionId} — {t.transactionName}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.62rem", color: "text.secondary" }}
                  noWrap
                >
                  {stage?.label ?? "—"} · {t.aoName || "Unassigned"}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: dueColor || "text.secondary",
                  flexShrink: 0,
                }}
              >
                {t.dtAODueDate ? fmtDate(t.dtAODueDate) : "—"}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

/**
 * Collectibles / Collection — the money side of the collection flow.
 *
 * ONE card with TWO collapsible sections (Collectibles, Collection). Each
 * section shows its receipt-style ledger — title + count chip, then the
 * five right-aligned metrics (Amount → Less EWT → Less Tax → Less
 * Retention → Net) — with a collapse toggle in the right corner; expanding
 * reveals the section's transaction list beneath.
 *
 *   • Collectibles — at "For Collection" with no receipt raised yet;
 *     the amount is the chosen pricing set's total selling price.
 *   • Collection — transactions that already have a Collection (C) journal;
 *     the amount is the journal's credit side (what was collected).
 * Rows are display-only: the figures feed management's overview, they are
 * not a worklist the way the Ongoing Transactions panel below is.
 *
 * The EWT / TAX are worked out PER ROW exactly the way CollectionReceiptCard
 * does it (the rate depends on the transaction's cItemType; the tax is a
 * flat 5% of the VAT-net amount). Summing the row figures — not the formulas
 * of the sums — keeps every row and the total in agreement.
 */

// Section totals: Amount → Less EWT → Less Tax → Less Retention → Net,
// summed from the ROW figures (not the formulas of the sums).
const ledgerTotalsOf = (rows) => {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const amount = rows.reduce((s, r) => s + num(r.amount), 0);
  const ewt = rows.reduce(
    (s, r) => s + num(calculateCollectionEWT(num(r.amount), r.cItemType)),
    0,
  );
  const tax = rows.reduce(
    (s, r) => s + num(calculateCollectionTax(num(r.amount))),
    0,
  );
  const retention = rows.reduce((s, r) => s + num(r.retention), 0);
  return { amount, ewt, tax, retention, net: amount - ewt - tax - retention };
};

// ── The section's date filter — the same This ▾ / Previous ▾ quick picks
// the Ledger filter modal offers, resolved through FilterDate's quickRange.
const FILTER_LABEL = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  week_prev: "Prev Week",
  month_prev: "Prev Month",
  year_prev: "Prev Year",
};

const FILTER_GROUPS = [
  {
    label: "This",
    items: [
      ["week", "Week"],
      ["month", "Month"],
      ["year", "Year"],
    ],
  },
  {
    label: "Previous",
    items: [
      ["week_prev", "Week"],
      ["month_prev", "Month"],
      ["year_prev", "Year"],
    ],
  },
];

// NOTE: defined at MODULE scope, not inside the panel — an inline component
// gets a fresh identity every parent render, so React would unmount it (and
// wipe its `viewAll` state) whenever the dashboard data refreshed.
function CollectionLedgerSection({ title, rows, emptyLabel, viewAll, onToggleViewAll }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // The metrics tiles read straight off the receipt's ledger. Net carries
  // the receipt's green — it is the figure the "Collection Amount" prints.
  const green = getThemeColors(isDark).green.paid;
  const badgeColors = getThemeColors(isDark).blue;
  const badgeBorder = getThemeColors(isDark).slate.border;

  // Date filter — null means "All"; anything else is a quickRange key.
  const [filter, setFilter] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);

  // A Collection journal with no posted entries reads ₱0.00 and carries no
  // completion date — drop it so the count, totals and table agree.
  const validRows = useMemo(
    () => (rows || []).filter((r) => Number(r.amount) > 0),
    [rows],
  );

  // A quick window keeps only rows whose date falls inside it; rows without
  // a date can never match a window, so they only show under "All".
  const filteredRows = useMemo(() => {
    if (!filter) return validRows;
    const [from, to] = quickRange(filter);
    return validRows.filter((r) => {
      const d = (r.date || "").slice(0, 10);
      return d && d >= from && d <= to;
    });
  }, [validRows, filter]);

  const totals = useMemo(() => ledgerTotalsOf(filteredRows), [filteredRows]);

  // Default dashboard tiles hide Tax and Retention; the View All header keeps
  // the full five-figure ledger.
  const metricTiles = [
    { label: "BID Amount", value: totals.amount },
    { label: "Less: EWT", value: totals.ewt, deduction: true },
    { label: "Net Amount", value: totals.net, strong: true },
  ];
  const viewAllTiles = [
    { label: "BID Amount", value: totals.amount },
    { label: "Less: EWT", value: totals.ewt, deduction: true },
    { label: "Less: Tax", value: totals.tax, deduction: true },
    { label: "Less: Retention", value: totals.retention, deduction: true },
    { label: "Net Amount", value: totals.net, strong: true },
  ];

  // Rows for the shared Table component — every money cell pre-computed so
  // the column renders stay plain and sorting/paging stay off.
  const tableRows = useMemo(
    () =>
      filteredRows.map((r) => {
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const amount = num(r.amount);
        const ewt = num(calculateCollectionEWT(amount, r.cItemType));
        const tax = num(calculateCollectionTax(amount));
        const retention = num(r.retention);
        return {
          id: r.id ?? r.strCode,
          code: r.strCode || "—",
          company: r.companyNickName || "",
          client: r.clientNickName || "",
          office: r.officeNickName || "",
          title: r.strTitle || "—",
          date: r.date,
          amount,
          ewt,
          tax,
          retention,
          net: amount - ewt - tax - retention,
        };
      }),
    [filteredRows],
  );

  const tableColumns = useMemo(
    () => [
      {
        key: "title",
        label: "Transaction",
        xs: 2.4,
        render: (_, row) => (
          <Box sx={{ textAlign: "left", lineHeight: 1.1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, lineHeight: 1.1 }}>
              <Typography
                sx={{ fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase", lineHeight: 1.1 }}
                noWrap
              >
                {row.code}
              </Typography>
              {(row.company || row.client) && (
                <Box
                  component="span"
                  sx={{
                    px: 0.5,
                    py: "1px",
                    borderRadius: "9999px",
                    backgroundColor: badgeColors.bg,
                    color: badgeColors.text,
                    border: `1px solid ${badgeBorder}`,
                    fontSize: "0.5rem",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {row.company || ""}
                  {row.company && row.client ? " ➟ " : ""}
                  {row.client || ""}
                  {row.office ? ` (${row.office})` : ""}
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.15 }} noWrap>
              {row.title}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.56rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.1,
              }}
              noWrap
            >
              {fmtDateTime(row.date)}
            </Typography>
          </Box>
        ),
      },
      {
        key: "amount",
        label: "BID Amount",
        xs: 1.1,
        align: "right",
        render: (v) => <Typography sx={{ fontSize: "0.68rem", fontWeight: 600 }}>{fmtPHP(v)}</Typography>,
      },
      {
        key: "net",
        label: "Net Amount",
        xs: 1.4,
        align: "right",
        render: (v, row) => (
          <Box sx={{ textAlign: "right", lineHeight: 1.45 }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: green }}>
              {fmtPHP(v)}
            </Typography>
            {row.ewt > 0 && (
              <Typography sx={{ fontSize: "0.58rem", color: "text.secondary" }}>
                EWT: {fmtPHP(row.ewt)}
              </Typography>
            )}
            {row.tax > 0 && (
              <Typography sx={{ fontSize: "0.58rem", color: "text.secondary" }}>
                Tax: {fmtPHP(row.tax)}
              </Typography>
            )}
            {row.retention > 0 && (
              <Typography sx={{ fontSize: "0.58rem", color: "text.secondary" }}>
                Retention: {fmtPHP(row.retention)}
              </Typography>
            )}
          </Box>
        ),
      },
    ],
    [green, badgeColors, badgeBorder],
  );

  return (
    <Box>
      {/* ── Header — the View All button swaps this section's body ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              lineHeight: 1.2,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {title}{" "}
            <Box
              component="span"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              ({filteredRows.length})
            </Box>
          </Typography>
        </Box>
        {/* Right corner — the filter field, then View All. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{ fontSize: "0.6rem", color: "text.secondary" }}
              component="span"
            >
              Filter:
            </Typography>
            {/* The "This ▾" style quick pick from the Ledger filter */}
            <Box
              component="button"
              type="button"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={Boolean(filterAnchor)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.75,
                py: 0.35,
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                background: "transparent",
                color: "text.primary",
                fontSize: "0.6rem",
                fontWeight: 600,
                lineHeight: 1.2,
                cursor: "pointer",
                whiteSpace: "nowrap",
                "&:hover": { background: theme.palette.action.hover },
              }}
            >
              {filter ? FILTER_LABEL[filter] : "All"}
              <KeyboardArrowDown
                sx={{
                  fontSize: "0.85rem",
                  color: "text.secondary",
                  transform: Boolean(filterAnchor)
                    ? "rotate(180deg)"
                    : "none",
                  transition: "transform .15s",
                }}
              />
            </Box>
            <Menu
              open={Boolean(filterAnchor)}
              anchorEl={filterAnchor}
              onClose={() => setFilterAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 130, py: 0.5 } }}
            >
              <MenuItem
                selected={filter === null}
                onClick={() => {
                  setFilter(null);
                  setFilterAnchor(null);
                }}
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  borderRadius: 1,
                  mx: 0.5,
                  py: 0.4,
                }}
              >
                All
              </MenuItem>
              {FILTER_GROUPS.map((group) => [
                <Typography
                  key={group.label}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    color: "text.secondary",
                  }}
                >
                  {group.label}
                </Typography>,
                ...group.items.map(([value, label]) => (
                  <MenuItem
                    key={value}
                    selected={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setFilterAnchor(null);
                    }}
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      borderRadius: 1,
                      mx: 0.5,
                      py: 0.4,
                    }}
                  >
                    {label}
                  </MenuItem>
                )),
              ])}
            </Menu>
          </Box>
          {!viewAll && (
            <Box
              component="button"
              type="button"
              onClick={onToggleViewAll}
              sx={{
                px: 0.9,
                py: 0.4,
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                background: "transparent",
                color: "text.primary",
                fontSize: "0.6rem",
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
                "&:hover": { background: theme.palette.action.hover },
              }}
            >
              View All
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Horizontal boundary between the section label and the metrics ── */}
      <Divider sx={{ mt: 0.75 }} />

      {/* ── Default view: the five ledger metrics as tiles ── */}
      {!viewAll && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
        <QueryStatsOutlined
          sx={{
            fontSize: "1.7rem",
            color: "text.secondary",
            flexShrink: 0,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 0.75,
            ml: 0.75,
          }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 1.5,
            flex: 1,
            minWidth: 0,
          }}
        >
        {metricTiles.map((tile) => (
          <Box key={tile.label} sx={{ minWidth: 0, textAlign: "right" }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.secondary",
                mb: 0.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tile.label}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 600,
                lineHeight: 1.2,
                // EWT / Tax / Retention are deductions — they read orange;
                // Net Amount keeps the receipt's green, Amount stays neutral.
                color: tile.strong
                  ? green
                  : tile.deduction
                    ? getThemeColors(isDark).orange.text
                    : "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {fmtPHP(tile.value)}
            </Typography>
          </Box>
        ))}
        </Box>
      </Box>
      )}

      {/* ── View All: summary header + transaction table ── */}
      {viewAll && (
      <>
        {/* Content header — the same five ledger figures, side by side */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(5, 1fr)",
            },
            gap: 1.5,
            mt: 1.25,
          }}
        >
          {viewAllTiles.map((tile) => (
            <Box key={tile.label} sx={{ minWidth: 0, textAlign: "right" }}>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "text.secondary",
                  mb: 0.35,
                  whiteSpace: "nowrap",
                }}
              >
                {tile.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: tile.strong ? 700 : 600,
                  color: tile.strong
                    ? green
                    : tile.deduction
                      ? getThemeColors(isDark).orange.text
                      : "text.primary",
                  whiteSpace: "nowrap",
                }}
              >
                {fmtPHP(tile.value)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1.25 }} />
        {filteredRows.length === 0 ? (
          <Typography
            sx={{ fontSize: "0.66rem", color: "text.disabled", py: 1.5, textAlign: "center" }}
          >
            {filter && validRows.length > 0 ? "Nothing in this period." : emptyLabel}
          </Typography>
        ) : (
          <CustomTable
            columns={tableColumns}
            rows={tableRows}
            getRowId={(row) => row.id}
            enableSorting={false}
            showPagination={false}
            rowsPerPage={-1}
            maxHeight="57vh"
          />
        )}
      </>)}
    </Box>
  );
}

function CollectiblesCollectionPanel({
  collectibles,
  collections,
  theme,
  viewingAll,
  onViewingAllChange,
}) {
  const toggle = (title) =>
    onViewingAllChange(viewingAll === title ? null : title);

  // Viewing one ledger in full hides the other section entirely — header,
  // count and all — so only what was opened stays on screen.
  const showCollectibles = !viewingAll || viewingAll === "Collectibles";
  const showCollection = !viewingAll || viewingAll === "Collection";

  return (
    <Card sx={{ ...cardSx(theme), p: 2 }}>
      {/* ── Section 1 — Collectibles ── */}
      {showCollectibles && (
        <CollectionLedgerSection
          title="Collectibles"
          rows={collectibles}
          emptyLabel="Nothing pending collection."
          viewAll={viewingAll === "Collectibles"}
          onToggleViewAll={() => toggle("Collectibles")}
        />
      )}

      {showCollectibles && showCollection && <Divider sx={{ my: 2 }} />}

      {/* ── Section 2 — Collection ── */}
      {showCollection && (
        <CollectionLedgerSection
          title="Collection"
          rows={collections}
          emptyLabel="No collections raised yet."
          viewAll={viewingAll === "Collection"}
          onToggleViewAll={() => toggle("Collection")}
        />
      )}
    </Card>
  );
}

function EmployeeChart({
  data,
  availableYears,
  selectedYear,
  onYearChange,
  theme,
}) {
  const topEmployees = data.slice(0, 10);

  return (
    <Card sx={{ ...cardSx(theme), p: 2, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          Employee Performance
        </Typography>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <Select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            sx={{ fontSize: "0.75rem", height: 32 }}
          >
            {availableYears.map((y) => (
              <MenuItem key={y} value={y} sx={{ fontSize: "0.75rem" }}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 1 }}>
        Bars: transactions handled · Line: avg business hours per step
      </Typography>

      {topEmployees.length === 0 ? (
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: "text.disabled",
            py: 4,
            textAlign: "center",
          }}
        >
          No employee activity for {selectedYear}.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={topEmployees} margin={{ bottom: 40 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
              angle={-35}
              textAnchor="end"
              interval={0}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              stroke={theme.palette.text.secondary}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke={theme.palette.text.secondary}
              label={{
                value: "hrs",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 10, fill: theme.palette.text.secondary },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "0.7rem",
                color: theme.palette.text.primary,
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="transactionsHandled"
              name="Transactions"
              fill={chart.transactions}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgBusinessHours"
              name="Avg Hrs/Step"
              stroke={chart.avgHours}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function EmployeeRankingPanel({ data, selectedYear, theme }) {
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));

  const ranked = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        if (b.transactionsHandled !== a.transactionsHandled) {
          return b.transactionsHandled - a.transactionsHandled;
        }
        return (a.avgBusinessHours || 0) - (b.avgBusinessHours || 0);
      })
      .slice(0, 10);
  }, [data]);

  const maxHandled = ranked.length > 0 ? ranked[0].transactionsHandled : 0;

  const medalColor = (rank) => {
    if (rank === 0) return colors.gold;
    if (rank === 1) return colors.silver;
    if (rank === 2) return colors.bronze;
    return colors.plain;
  };

  return (
    <Card sx={{ ...cardSx(theme), p: 2, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          Rankings
        </Typography>
        <Chip
          label={selectedYear}
          size="small"
          sx={{
            bgcolor: colors.chipBg,
            color: colors.chipText,
            fontWeight: 700,
            fontSize: "0.65rem",
          }}
        />
      </Box>

      <Typography
        sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 1.5 }}
      >
        Ranked by transactions handled, ties broken by speed
      </Typography>

      {ranked.length === 0 ? (
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: "text.disabled",
            py: 4,
            textAlign: "center",
          }}
        >
          No employee activity for {selectedYear}.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {ranked.map((emp, index) => {
            const medal = medalColor(index);
            const pct =
              maxHandled > 0 ? (emp.transactionsHandled / maxHandled) * 100 : 0;
            return (
              <Box
                key={emp.userId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  border: `1px solid ${medal.border}`,
                  background: medal.bg,
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: medal.text,
                    border: `1.5px solid ${medal.border}`,
                    background: theme.palette.background.paper,
                  }}
                >
                  {index + 1}
                </Box>

                <Box flex={1} minWidth={0}>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "text.primary",
                    }}
                    noWrap
                  >
                    {emp.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.3,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 5,
                        borderRadius: 3,
                        background: colors.progressTrack,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.max(pct, 4)}%`,
                          height: "100%",
                          background: medal.text,
                          borderRadius: 3,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: medal.text,
                    }}
                  >
                    {emp.transactionsHandled}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.58rem", color: "text.secondary" }}
                  >
                    {emp.avgBusinessHours != null
                      ? `${emp.avgBusinessHours}h avg`
                      : "—"}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
}

// ─── Management view ─────────────────────────────────────────────────────────

export default function ManagementView({ viewingAll, onViewingAllChange }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));
  const {
    transacstatus,
    loading: mappingLoading,
  } = useKeysLabels();

  // ── LOCAL STORAGE CACHE ─────────────────────────────────────────────
  // Each widget seeds from its cache so a revisit renders instantly and
  // the fetches below silently refresh the numbers.
  const cacheKey = {
    metrics: "overview_metrics_cache",
    ongoingTxns: "overview_ongoing_txns_cache",
    collectibles: "overview_collectibles_cache",
    employee: (year) => `overview_employee_performance_${year}`,
  };
  const currentYear = new Date().getFullYear();

  const [metrics, setMetrics] = useState(() => {
    const base = [
      {
        title: "Users",
        value: 0,
        change: "Total",
        color: colors.metricUsers.color,
        bg: colors.metricUsers.bg,
        icon: People,
      },
      {
        title: "Company",
        value: 0,
        change: "Total",
        color: colors.metricCompany.color,
        bg: colors.metricCompany.bg,
        icon: Business,
      },
      {
        title: "Clients",
        value: 0,
        change: "Total",
        color: colors.metricClients.color,
        bg: colors.metricClients.bg,
        icon: Group,
      },
      {
        title: "Suppliers",
        value: 0,
        change: "Total",
        color: colors.metricSuppliers.color,
        bg: colors.metricSuppliers.bg,
        icon: LocalShipping,
      },
    ];
    const cached = getItem(cacheKey.metrics, null);
    return Array.isArray(cached)
      ? base.map((m, i) => ({ ...m, value: Number(cached[i]) || 0 }))
      : base;
  });
  // Seeded caches, no skeleton on revisit:
  const [ongoingTxns, setOngoingTxns] = useState(() =>
    getItem(cacheKey.ongoingTxns, []),
  );
  const [allTxns, setAllTxns] = useState(() =>
    getItem(cacheKey.ongoingTxns, []),
  );
  // Seeded { collectibles, collections } — empty arrays render an empty card
  // on first visit, cached lists render instantly on a revisit.
  const [collectiblesData, setCollectiblesData] = useState(() =>
    getItem(cacheKey.collectibles, { collectibles: [], collections: [] }),
  );
  const [employeeData, setEmployeeData] = useState(() =>
    getItem(cacheKey.employee(currentYear), []),
  );
  const [employeeYear, setEmployeeYear] = useState(currentYear);

  useEffect(() => {
    let mounted = true;
    OverviewAPI.getTotalMetrics()
      .then((res) => {
        const data = res?.totals ?? {};
        setItem(cacheKey.metrics, [
          Number(data.users) || 0,
          Number(data.companies) || 0,
          Number(data.clients) || 0,
          Number(data.suppliers) || 0,
        ]);
        if (!mounted) return;
        setMetrics((prev) => [
          { ...prev[0], value: Number(data.users) || 0 },
          { ...prev[1], value: Number(data.companies) || 0 },
          { ...prev[2], value: Number(data.clients) || 0 },
          { ...prev[3], value: Number(data.suppliers) || 0 },
        ]);
      })
      .catch((err) => console.error("Failed to load dashboard metrics", err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    OverviewAPI.getEmployeePerformance(employeeYear)
      .then((res) => {
        const data = res.employees || [];
        setItem(cacheKey.employee(employeeYear), data);
        if (!mounted) return;
        setEmployeeData(data);
      })
      .catch((err) =>
        console.error("Failed to load employee performance", err),
      );
    return () => {
      mounted = false;
    };
  }, [employeeYear]);

  useEffect(() => {
    let mounted = true;
    OverviewAPI.getOngoingTransactions()
      .then((res) => {
        if (!mounted) return;
        const list = res.transactions || res.data || [];
        const formatted = list.filter(Boolean).map((txn, idx) => ({
          id: txn.nTransactionId ?? `txn-fallback-${idx}`,
          transactionId: txn.strCode || "--",
          transactionName: txn.strTitle || "--",
          status_code: txn.current_status ?? txn.latest_history?.nStatus,
          dtAODueDate: txn.dtAODueDate ?? null,
          dtOccur: txn.latest_history?.dtOccur ?? null,
          aoName: txn.user ? `${txn.user.strNickName}`.trim() : "",
        }));
        setOngoingTxns(formatted);
        setAllTxns(formatted);
        setItem(cacheKey.ongoingTxns, formatted);
      })
      .catch((err) =>
        console.error("Failed to load ongoing transactions", err),
      );
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    OverviewAPI.getCollectiblesCollection()
      .then((res) => {
        if (!mounted) return;
        const data = {
          collectibles: res?.collectibles || [],
          collections: res?.collections || [],
        };
        setCollectiblesData(data);
        setItem(cacheKey.collectibles, data);
      })
      .catch((err) =>
        console.error("Failed to load collectibles and collections", err),
      );
    return () => {
      mounted = false;
    };
  }, []);

  const stageOrder = useMemo(() => {
    if (mappingLoading || !transacstatus) return [];
    return Object.entries(transacstatus)
      .filter(([, label]) => !/archived|closed|cancelled/i.test(label))
      .map(([key, label], i) => ({
        key,
        label,
        color: STAGE_PALETTE[i % STAGE_PALETTE.length],
      }));
  }, [transacstatus, mappingLoading]);

  // ── NEEDS ATTENTION — clients, suppliers & carts still at "For Approval"
  // The pill list lives in the shared useAttentionItems hook so the
  // finance dashboard renders the exact same banner; the bell in the
  // sidebar rings off the same numbers.
  const attentionItems = useAttentionItems();

  // The chime is NOT here anymore — it lives in the sidebar shell
  // (SidebarContent) so it rings on every page, not just /dashboard.
  // This view only renders the banner and its pill.

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let earliestYear = currentYear;
    allTxns.forEach((t) => {
      if (t.dtOccur) {
        const y = new Date(t.dtOccur).getFullYear();
        if (!isNaN(y) && y < earliestYear) earliestYear = y;
      }
    });
    const lastYear = currentYear + 7;
    const years = [];
    for (let y = earliestYear; y <= lastYear; y++) {
      years.push(y);
    }
    return years.sort((a, b) => b - a);
  }, [allTxns]);

  return (
    <div className="space-y-6">
      {/* Needs Attention — hidden entirely while viewing a ledger in full. */}
      {!viewingAll && (
        <NeedsAttentionBanner items={attentionItems} theme={theme} />
      )}

      {/* Overview Metrics — commented out for now */}
      {/* <Grid container spacing={1.5}>
        {metrics.map((item, i) => (
          <SummaryCard key={i} item={item} index={i} theme={theme} />
        ))}
      </Grid> */}

      {/* Collectibles / Collection — one card, two columns */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <CollectiblesCollectionPanel
            collectibles={collectiblesData.collectibles}
            collections={collectiblesData.collections}
            theme={theme}
            viewingAll={viewingAll}
            onViewingAllChange={onViewingAllChange}
          />
        </Grid>
      </Grid>

      {/* Ongoing Transactions — commented out for now */}
      {/* <Grid container spacing={2}>
        <Grid item xs={12}>
          <OngoingTransactionsPanel
            transactions={ongoingTxns}
            stageOrder={stageOrder}
            navigate={navigate}
            sessionKey="selectedStatusCode"
            theme={theme}
          />
        </Grid>
      </Grid> */}

      {/* Employee Performance / Rankings — commented out for now */}
      {/* <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <EmployeeChart
            data={employeeData}
            availableYears={availableYears}
            selectedYear={employeeYear}
            onYearChange={setEmployeeYear}
            theme={theme}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <EmployeeRankingPanel
            data={employeeData}
            selectedYear={employeeYear}
            theme={theme}
          />
        </Grid>
      </Grid> */}
    </div>
  );
}
