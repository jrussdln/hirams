import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Popover,
  Menu,
  MenuItem,
  useTheme,
} from "@mui/material";
// ADD to imports
import {
  EventOutlined,
  KeyboardArrowDown,
  FilterListOutlined,
} from "@mui/icons-material";

import getThemeColors from "../../../utils/style/getThemeColors";

const useColors = (c) => ({
  border: c.slate.border,
  divider: c.slate.divider,
  hoverBg: c.slate.hover,
  blue: { text: c.blue.text, bg: c.blue.bg, border: c.blue.border },
  inputBg: c.gray.inputBg,
  gray: {
    pri: c.gray.textPrimary,
    sec: c.gray.textSecondary,
    muted: c.gray.textMuted,
    textOnFill: c.gray.textOnFill,
  },
  panelBg: c.slate.outerBg,
});

// Presets offered by the "This ▾" dropdown
const THIS_OPTIONS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const QUICK_LABEL = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

// "YYYY-MM-DD" -> "MM/DD/YYYY"
const formatDisplay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/**
 * Resolve a quick-pick key into an explicit [from, to] ISO pair.
 * Exported so <LedgerFilterModal> can seed its "Today" default
 * without duplicating the presets — the rest of this file only exports
 * components.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const quickRange = (key) => {
  const today = startOfDay(new Date());
  switch (key) {
    case "today":
      return [toISO(today), toISO(today)];
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return [toISO(y), toISO(y)];
    }
    case "week": {
      // Week runs Monday → Sunday (getDay(): 0 = Sun … 6 = Sat)
      const offset = (today.getDay() + 6) % 7;
      const start = new Date(today);
      start.setDate(start.getDate() - offset);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return [toISO(start), toISO(end)];
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [toISO(start), toISO(end)];
    }
    case "year":
      return [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`];
    default:
      return ["", ""];
  }
};

/**
 * The body of the date filter — the quick-pick row (Today / Yesterday /
 * This ▾ → Week, Month, Year) above the always-visible From / To row.
 *
 * Fully controlled: it owns no range of its own, it just reports edits
 * through `onPatch`, so the same body can live inside <FilterDate />'s
 * popover or inside <LedgerFilterModal />.
 *
 *   from   — "YYYY-MM-DD" ("" when unset)
 *   to     — "YYYY-MM-DD" ("" when unset)
 *   quick  — today | yesterday | week | month | year | custom | null
 *   onPatch— (partial) => void, partial = { from, to, quick }
 */
export const FilterDateFields = ({
  from = "",
  to = "",
  quick = null,
  onPatch,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  // Fill both inputs from a preset — nothing is committed until Apply.
  const pickQuick = (key) => {
    const [f, t] = quickRange(key);
    onPatch?.({ from: f, to: t, quick: key });
    setMenuAnchor(null);
  };

  // Manual typing turns the selection into a custom range.
  const editFrom = (v) => onPatch?.({ from: v, quick: "custom" });
  const editTo = (v) => onPatch?.({ to: v, quick: "custom" });

  // Label of the "This ▾" chip — shows the picked option once one is selected.
  const thisLabel = useMemo(() => {
    const opt = THIS_OPTIONS.find((o) => o.value === quick);
    return opt ? `This ${opt.label}` : "This";
  }, [quick]);

  const fieldSx = {
    height: 32,
    px: 1,
    borderRadius: "7px",
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.gray.pri,
    fontSize: "0.75rem",
    outline: "none",
    fontFamily: "inherit",
    "&:focus": { borderColor: colors.blue.text },
  };

  const chipSx = (active) => ({
    px: 1,
    py: 0.55,
    borderRadius: "6px",
    border: `1px solid ${active ? colors.blue.border : colors.border}`,
    background: active ? colors.blue.bg : "transparent",
    color: active ? colors.blue.text : colors.gray.sec,
    fontSize: "0.68rem",
    fontWeight: 700,
    cursor: "pointer",
    lineHeight: 1.2,
    "&:hover": { background: active ? colors.blue.bg : colors.hoverBg },
  });

  const isThisActive = ["week", "month", "year"].includes(quick);

  return (
    <Box>
      {/* Quick picks */}
      <Box sx={{ display: "flex", gap: 0.5, mb: 1.25 }}>
        <Box
          component="button"
          type="button"
          onClick={() => pickQuick("today")}
          sx={{ ...chipSx(quick === "today"), flex: 1 }}
        >
          Today
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => pickQuick("yesterday")}
          sx={{ ...chipSx(quick === "yesterday"), flex: 1 }}
        >
          Yesterday
        </Box>
        <Box
          component="button"
          type="button"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          sx={{
            ...chipSx(isThisActive),
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            whiteSpace: "nowrap",
            flex: isThisActive ? "1.4" : 1,
          }}
        >
          {thisLabel}
          <KeyboardArrowDown
            sx={{
              fontSize: "0.95rem",
              transform: menuOpen ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          />
        </Box>
      </Box>

      {/* Always-visible range inputs */}
      <Box sx={{ display: "flex", gap: 0.75 }}>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{ fontSize: "0.6rem", color: colors.gray.muted, mb: 0.3 }}
          >
            From
          </Typography>
          <Box
            component="input"
            type="date"
            value={from}
            onChange={(e) => editFrom(e.target.value)}
            aria-label="From date"
            sx={{ ...fieldSx, width: "100%" }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{ fontSize: "0.6rem", color: colors.gray.muted, mb: 0.3 }}
          >
            To
          </Typography>
          <Box
            component="input"
            type="date"
            value={to}
            onChange={(e) => editTo(e.target.value)}
            aria-label="To date"
            sx={{ ...fieldSx, width: "100%" }}
          />
        </Box>
      </Box>

      {/* "This ▾" dropdown: Week / Month / Year */}
      <Menu
        open={menuOpen}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            background: colors.panelBg,
            border: `1px solid ${colors.border}`,
            borderRadius: "9px",
            mt: 0.5,
            minWidth: 130,
            py: 0.5,
          },
        }}
      >
        {THIS_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={quick === opt.value}
            onClick={() => pickQuick(opt.value)}
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "6px",
              mx: 0.5,
              py: 0.5,
              color: colors.gray.pri,
              "&.Mui-selected": {
                background: colors.blue.bg,
                color: colors.blue.text,
              },
              "&.Mui-selected:hover": { background: colors.blue.bg },
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

/**
 * Compact date-range filter. Clicking the trigger opens a popover with a
 * quick-pick row (Today / Yesterday / This ▾ → Week, Month, Year) sitting
 * above an always-visible From / To row. Picking a quick option only fills
 * the inputs; the range is committed — and the trigger label updated — when
 * "Apply" is clicked. "Cancel" discards any unsaved changes.
 *
 *   <FilterDate onChange={({ from, to }) => …} hint={<Warning />} />
 */
const FilterDate = ({ onChange, hint = null, sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // ── Committed state (what's actually applied) ──
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quick, setQuick] = useState(null); // today | yesterday | week | month | year | custom

  // ── Draft state (edited inside the popover, not yet applied) ──
  const [anchorEl, setAnchorEl] = useState(null);
  const [draft, setDraft] = useState({ from: "", to: "", quick: null });

  const appliedRange = useMemo(
    () => ({ from: fromDate || null, to: toDate || null }),
    [fromDate, toDate],
  );

  // Fire onChange only when the committed range actually changes
  useEffect(() => {
    onChange?.(appliedRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedRange]);

  const openPopover = (e) => {
    // seed the draft from the last committed values every time it opens
    setDraft({ from: fromDate, to: toDate, quick });
    setAnchorEl(e.currentTarget);
  };
  const closePopover = () => setAnchorEl(null);

  const handleApply = () => {
    setFromDate(draft.from);
    setToDate(draft.to);
    setQuick(draft.quick);
    closePopover();
  };
  const handleCancel = () => closePopover();

  // ── Trigger label ──
  const triggerLabel = useMemo(() => {
    if (quick && QUICK_LABEL[quick]) return QUICK_LABEL[quick];
    if (fromDate || toDate) {
      const f = formatDisplay(fromDate);
      const t = formatDisplay(toDate);
      if (f && t) return `${f} - ${t}`;
      return f ? `From ${f}` : `To ${t}`;
    }
    return "All";
  }, [quick, fromDate, toDate]);

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, ...sx }}>
      <Box
        component="button"
        type="button"
        onClick={openPopover}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          height: 32,
          borderRadius: "7px",
          border: `1px solid ${open ? colors.blue.border : colors.border}`,
          background: colors.inputBg,
          color: colors.gray.pri,
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "pointer",
          overflow: "hidden",
          "&:hover": { background: colors.hoverBg },
        }}
        title="Filter by date"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: "100%",
            color: colors.gray.muted,
            borderRight: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <FilterListOutlined sx={{ fontSize: "1.05rem" }} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.1 }}>
          <EventOutlined sx={{ fontSize: "1rem", color: colors.gray.muted }} />
          {triggerLabel}
          <KeyboardArrowDown
            sx={{
              fontSize: "1rem",
              color: colors.gray.muted,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          />
        </Box>
      </Box>
      {hint}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCancel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, minWidth: 300, background: colors.panelBg }}>
          <FilterDateFields
            from={draft.from}
            to={draft.to}
            quick={draft.quick}
            onPatch={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />

          {/* Apply / Cancel */}
          <Box sx={{ display: "flex", gap: 0.75, mt: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={handleCancel}
              sx={{
                flex: 1,
                py: 0.7,
                borderRadius: "7px",
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.gray.sec,
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                "&:hover": { background: colors.hoverBg },
              }}
            >
              Cancel
            </Box>
            <Box
              component="button"
              type="button"
              onClick={handleApply}
              sx={{
                flex: 1,
                py: 0.7,
                borderRadius: "7px",
                border: `1px solid ${colors.blue.text}`,
                background: colors.blue.text,
                color: colors.gray.textOnFill,
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Apply
            </Box>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default FilterDate;
