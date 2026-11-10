import React, { useMemo } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataTableSkeleton } from "../loader/Skeleton";
import getThemeColors from "../../../utils/style/getThemeColors";


// ─────────────────────────────────────────────────────────────────
// PROMPT 1 — Inline color map: ONLY tokens this component uses
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Blue band — sell columns
  blueBg: c.blue.bg,
  blueBgSoft: c.blue.bgSoft,
  blueBorder: c.blue.border,

  // Teal band — budget columns
  tealBg: c.teal.bg,
  tealBorder: c.teal.border,

  // Amber band — cost columns
  amberBg: c.amber.bg,
  amberWarnBg: c.amber.warnBg,
  amberBorder: c.amber.border,

  // Slate — structural: borders, rows, headers, summary
  slateBorder: c.slate.border,
  slateTotalBorder: c.slate.totalBorder,
  slateSummaryBg: c.slate.summaryBg,
  slateRowHover: c.slate.hover,
  slateStripeBg: c.slate.stripeBg,
  slateOuterBg: c.slate.outerBg,

  // Gray — text hierarchy
  grayTextPrimary: c.gray.textPrimary,
  grayTextHeading: c.gray.textHeading,
  grayTextSecondary: c.gray.textSecondary,
  grayTextMuted: c.gray.textMuted,

  // Blue — required labels
  blueTextMid: c.blue.text,
});


/* ═══════════════════════════════════════════════════════════════════
   SX BUILDERS
═══════════════════════════════════════════════════════════════════ */

const buildCellSx = (
  col,
  colors,
  { isSummary = false, isLast = false, row = null, rowIndex = null } = {},
) => {
  const bandBg =
    col.band === "sell"
      ? isSummary
        ? colors.blueBg
        : colors.blueBgSoft
      : col.band === "budget"
        ? colors.tealBg
        : col.band === "cost"
          ? isSummary
            ? colors.amberWarnBg
            : colors.amberBg
          : undefined;

  const bandBorderColor =
    col.band === "sell"
      ? colors.blueBorder
      : col.band === "budget"
        ? colors.tealBorder
        : col.band === "cost"
          ? colors.amberBorder
          : colors.slateBorder;

  const extra = isSummary
    ? {}
    : col.cellSxExtra
      ? typeof col.cellSxExtra === "function"
        ? col.cellSxExtra(row, rowIndex)
        : col.cellSxExtra
      : {};

  const dataAlign = col.align ?? "left";

  return {
    py: 0.75,
    display: "flex",
    alignItems: "center",
    justifyContent:
      dataAlign === "right"
        ? "flex-end"
        : dataAlign === "center"
          ? "center"
          : "flex-start",
    ...(dataAlign === "right" && { pr: 1 }),
    ...(dataAlign === "left" && { pl: 1 }),
    ...(bandBg && { background: bandBg }),
    ...(col.borderLeft && { borderLeft: `1px solid ${bandBorderColor}` }),
    ...(col.borderRight && { borderRight: `1px solid ${bandBorderColor}` }),
    ...(!col.borderRight &&
      !col.hideBorder &&
      !isLast && { borderRight: `1px solid ${colors.slateBorder}` }),
    ...(isSummary && {
      borderTop: `2px solid ${colors.slateTotalBorder}`,
    }),
    ...extra,
  };
};

const buildHeaderCellSx = (col, isLast, colors) => {
  const bandBg =
    col.band === "sell"
      ? colors.blueBgSoft
      : col.band === "budget"
        ? colors.tealBg
        : col.band === "cost"
          ? colors.amberBg
          : undefined;

  const bandBorderColor =
    col.band === "sell"
      ? colors.blueBorder
      : col.band === "budget"
        ? colors.tealBorder
        : col.band === "cost"
          ? colors.amberBorder
          : colors.slateBorder;

  const hAlign = col.headerAlign ?? "center";
  return {
    py: 0.6,
    display: "flex",
    alignItems: "center",
    justifyContent:
      hAlign === "right"
        ? "flex-end"
        : hAlign === "left"
          ? "flex-start"
          : "center",
    ...(hAlign === "right" && { pr: 1 }),
    ...(hAlign === "left" && { pl: 0.75 }),
    ...(bandBg && { background: bandBg }),
    ...(col.borderLeft && { borderLeft: `1px solid ${bandBorderColor}` }),
    ...(col.borderRight && { borderRight: `1px solid ${bandBorderColor}` }),
    ...(!col.borderRight &&
      !col.hideBorder &&
      !isLast && { borderRight: `1px solid ${colors.slateBorder}` }),
    ...(col.headerSxExtra || {}),
  };
};

/* ═══════════════════════════════════════════════════════════════════
   Helper: cumulative left-offset % per column
═══════════════════════════════════════════════════════════════════ */
const computeColumnOffsets = (columns) => {
  let running = 0;
  return columns.map((col) => {
    const left = (running / 12) * 100;
    const width = (col.xs / 12) * 100;
    running += col.xs;
    return { left, width };
  });
};

/* ═══════════════════════════════════════════════════════════════════
   Helper: merge cells for summary row
═══════════════════════════════════════════════════════════════════ */
const buildSummaryCells = (columns) => {
  const cells = [];
  let skip = 0;

  columns.forEach((col, ci) => {
    if (skip > 0) {
      skip--;
      return;
    }

    const span =
      col.summaryColSpan && col.summaryColSpan > 1 ? col.summaryColSpan : 1;
    let mergedXs = 0;
    const spannedCols = [];
    for (let s = 0; s < span && ci + s < columns.length; s++) {
      mergedXs += columns[ci + s].xs;
      spannedCols.push(columns[ci + s]);
    }

    const isLast = ci + span - 1 === columns.length - 1;
    cells.push({ col, xs: mergedXs, spannedCols, isLast });
    skip = span - 1;
  });

  return cells;
};

/* ═══════════════════════════════════════════════════════════════════
   DataTable
═══════════════════════════════════════════════════════════════════ */
function DataTable({
  columns = [],
  columnGroups = null,
  overlayHeaders = null,
  rows = [],
  summaryRow = null,
  loading = false,
  emptyText = "No items available.",
  minWidth = "900px",
  rowKey,
  rowSx,
  wrapRow,
  onRowClick,
  footer,
}) {
  // ✅ Standard wiring — PROMPT 1 pattern
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const hasGroups = Array.isArray(columnGroups) && columnGroups.length > 0;
  const hasOverlays =
    Array.isArray(overlayHeaders) && overlayHeaders.length > 0;

  const rowSpanColumns = hasGroups ? columns.filter((c) => c.rowSpan) : [];
  const hasRowSpan = rowSpanColumns.length > 0;

  const columnOffsets =
    hasGroups && hasRowSpan ? computeColumnOffsets(columns) : [];

  const renderCell = (col, row, i) => {
    if (col.render) return col.render(row, i);
    const val = col.value ? col.value(row, i) : row[col.key];
    return (
      <Typography
        sx={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: colors.grayTextPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.3,
          width: "100%",
          textAlign:
            col.align === "right"
              ? "right"
              : col.align === "center"
                ? "center"
                : "left",
        }}
      >
        {val ?? "—"}
      </Typography>
    );
  };

  const hasSummaryContent = (col) => {
    if (col.summaryRender || col.summaryValue) return true;
    const val = summaryRow?.[col.key];
    return val !== undefined && val !== null;
  };

  const hasSpanSummaryContent = (spannedCols) =>
    spannedCols.some((c) => hasSummaryContent(c));

  const renderSummaryCell = (col) => {
    if (col.summaryRender) return col.summaryRender(summaryRow);
    const val = col.summaryValue
      ? col.summaryValue(summaryRow)
      : summaryRow?.[col.key];
    if (val === undefined || val === null) return null;
    return (
      <Typography
        sx={{
          fontSize: "0.6rem",
          fontWeight: 800,
          color: colors.grayTextHeading,
          whiteSpace: "nowrap",
        }}
      >
        {val}
      </Typography>
    );
  };

  const wrap = (row, i, node) =>
    wrapRow ? wrapRow(row, i, node, i === rows.length - 1) : node;

  const renderHeader = () => (
    <Paper
      elevation={0}
      sx={{
        py: 0,
        bgcolor: colors.slateSummaryBg, // ✅ from slate token
        borderRadius: "10px 10px 0 0",
        overflow: "hidden",
        border: `1px solid ${colors.slateBorder}`,
        borderBottom: "none",
        ...((hasOverlays || (hasGroups && hasRowSpan)) && {
          position: "relative",
        }),
      }}
    >
      {hasGroups && (
        <Grid container alignItems="stretch">
          {columnGroups.map((g, gi) => (
            <Grid
              key={gi}
              item
              xs={g.span}
              sx={{
                py: 0.4,
                textAlign: "center",
                bgcolor: g.bgColor || colors.slateSummaryBg, // ✅ from slate
                borderBottom: `1px solid ${colors.slateBorder}`,
                ...(g.borderLeft && {
                  borderLeft: `1px solid ${g.borderLeft}`,
                }),
                ...(g.borderRight && {
                  borderRight: `1px solid ${g.borderRight}`,
                }),
                ...(!g.borderRight &&
                  gi < columnGroups.length - 1 && {
                    borderRight: `1px solid ${colors.slateBorder}`,
                  }),
              }}
            >
              {g.label && (
                <Typography
                  sx={{
                    fontSize: "0.5rem",
                    color: g.color || colors.grayTextSecondary,
                    fontWeight: 700,
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                  }}
                >
                  {g.label}
                </Typography>
              )}
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container alignItems="center">
        {columns.map((col, ci) => (
          <Grid
            key={col.key}
            item
            xs={col.xs}
            sx={{
              ...buildHeaderCellSx(col, ci === columns.length - 1, colors),
              ...(hasGroups && col.rowSpan && { visibility: "hidden" }),
            }}
          >
            {col.headerRender ? (
              col.headerRender()
            ) : (
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: col.labelColor
                    ? col.labelColor
                    : col.required
                      ? colors.blueTextMid
                      : colors.grayTextSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {col.label}
              </Typography>
            )}
          </Grid>
        ))}
      </Grid>

      {hasGroups &&
        hasRowSpan &&
        columns.map((col, ci) => {
          if (!col.rowSpan) return null;
          const { left, width } = columnOffsets[ci];
          const isLast = ci === columns.length - 1;
          const bandBorderColor =
            col.band === "sell"
              ? colors.blueBorder
              : col.band === "budget"
                ? colors.tealBorder
                : col.band === "cost"
                  ? colors.amberBorder
                  : colors.slateBorder;
          const bandBg =
            col.band === "sell"
              ? colors.blueBgSoft
              : col.band === "budget"
                ? colors.tealBg
                : col.band === "cost"
                  ? colors.amberBg
                  : undefined;

          return (
            <Box
              key={`rowspan-${col.key}`}
              sx={{
                position: "absolute",
                top: 0,
                height: "100%",
                left: `${left}%`,
                width: `${width}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: (() => {
                  const ha = col.headerAlign ?? "center";
                  return ha === "right"
                    ? "flex-end"
                    : ha === "left"
                      ? "flex-start"
                      : "center";
                })(),
                ...((col.headerAlign ?? "center") === "left" && { pl: 0.75 }),
                ...((col.headerAlign ?? "center") === "right" && { pr: 1 }),
                bgcolor: colors.slateSummaryBg, // ✅ from slate
                ...(bandBg && { background: bandBg }),
                ...(col.borderLeft && {
                  borderLeft: `1px solid ${bandBorderColor}`,
                }),
                ...(col.borderRight && {
                  borderRight: `1px solid ${bandBorderColor}`,
                }),
                ...(!col.borderRight &&
                  !col.hideBorder &&
                  !isLast && {
                    borderRight: `1px solid ${colors.slateBorder}`,
                  }),
                pointerEvents: "none",
                zIndex: 1,
                ...(col.headerSxExtra || {}),
              }}
            >
              {col.headerRender ? (
                col.headerRender()
              ) : (
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: col.labelColor
                      ? col.labelColor
                      : col.required
                        ? colors.blueTextMid
                        : colors.grayTextSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </Typography>
              )}
            </Box>
          );
        })}

      {hasOverlays &&
        overlayHeaders.map(({ label, left, right, width, pl }) => (
          <Box
            key={label}
            sx={{
              position: "absolute",
              top: 0,
              height: "100%",
              width: `${width}%`,
              ...(left !== undefined && { left: `${left}%` }),
              ...(right !== undefined && { right: `${right}%` }),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...(pl !== undefined && { pl }),
              pointerEvents: "none",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: colors.grayTextSecondary,
              }}
            >
              {label}
            </Typography>
          </Box>
        ))}
    </Paper>
  );

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Box sx={{ overflowX: "auto", pb: 1 }}>
        <Box sx={{ minWidth }}>
          {renderHeader()}

          {loading && (
            <DataTableSkeleton
              columns={columns}
              rows={5}
              hasHeader={false}
              minWidth="0px"
            />
          )}

          {!loading && rows.length === 0 && (
            <Box
              sx={{
                height: 80,
                border: `1px solid ${colors.slateBorder}`,
                borderTop: "none",
                borderRadius: "0 0 10px 10px",
                bgcolor: colors.slateOuterBg, // ✅ from slate
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ fontSize: "0.7rem", color: colors.grayTextMuted }}
              >
                {emptyText}
              </Typography>
            </Box>
          )}

          {!loading &&
            rows.map((row, rowIndex) => {
              const key = rowKey ? rowKey(row, rowIndex) : (row.id ?? rowIndex);
              const extraSx = rowSx ? rowSx(row, rowIndex) : {};
              const isEven = rowIndex % 2 === 0;

              const paperNode = (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 0,
                    border: `1px solid ${colors.slateBorder}`,
                    borderTop: "none",
                    bgcolor: isEven ? colors.slateOuterBg : colors.slateStripeBg, // ✅ from slate
                    overflow: "visible",
                    cursor: onRowClick ? "pointer" : "default",
                    "&:hover": { bgcolor: colors.slateRowHover }, // ✅ slate hover only
                    transition: "background 0.15s ease",
                    ...extraSx,
                  }}
                  onClick={
                    onRowClick
                      ? (event) => {
                          if (
                            event.target.closest(
                              "button, input, textarea, select, a, [role=button]",
                            )
                          ) {
                            return;
                          }
                          onRowClick(row, rowIndex);
                        }
                      : undefined
                  }
                >
                  <Grid container alignItems="stretch">
                    {columns.map((col, ci) => (
                      <Grid
                        key={col.key}
                        item
                        xs={col.xs}
                        sx={buildCellSx(col, colors, {
                          isSummary: false,
                          isLast: ci === columns.length - 1,
                          row,
                          rowIndex,
                        })}
                      >
                        {renderCell(col, row, rowIndex)}
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              );

              return (
                <React.Fragment key={key}>
                  {wrap(row, rowIndex, paperNode)}
                </React.Fragment>
              );
            })}

          {!loading && summaryRow !== null && rows.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "0 0 10px 10px",
                border: `1px solid ${colors.slateBorder}`,
                borderTop: "none",
                bgcolor: colors.slateSummaryBg, // ✅ matches header
                overflow: "hidden",
              }}
            >
              <Grid container alignItems="stretch">
                {buildSummaryCells(columns).map(
                  ({ col, xs, spannedCols, isLast }) => {
                    const hasContent = hasSpanSummaryContent(spannedCols);
                    return (
                      <Grid
                        key={col.key}
                        item
                        xs={xs}
                        sx={{
                          ...buildCellSx(col, colors, {
                            isSummary: true,
                            isLast,
                          }),
                          ...(!hasContent && { py: 0, minHeight: 0 }),
                        }}
                      >
                        {renderSummaryCell(col)}
                      </Grid>
                    );
                  },
                )}
              </Grid>
            </Paper>
          )}

          {footer && <Box sx={{ mt: 1 }}>{footer}</Box>}
        </Box>
      </Box>
    </Box>
  );
}

export default DataTable;