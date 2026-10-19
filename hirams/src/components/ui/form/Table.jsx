import React, { useState, useMemo, useRef } from "react";
import {
  Typography,
  Box,
  Paper,
  IconButton,
  Menu,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ArrowUpward,
  ArrowDownward,
  UnfoldMore,
  MoreVert,
} from "@mui/icons-material";
import CustomPagination from "./Pagination";
import { CustomTableSkeleton } from "../loader/Skeleton";
import getThemeColors from "../../../utils/style/getThemeColors";
import UpDownIndicatorWidget from "../widget/UpDownIndicatorWidget";

// ── PROMPT 1 — useColors: MATCH MODAL'S SOLID COLORS ──────────────────
const useColors = (c) => ({
  border: c.slate.border,
  hoverBg: c.slate.hover, // ✅ slate hover ONLY — NO blue!
  rowStripe: c.slate.itemHeaderBgSolid, // ✅ matches modal header bg
  rowSolid: c.slate.outerBgSolid, // ✅ matches modal body bg
  shadowBase: c.shadow.base,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
});

// ── Map actionColor string → theme color token group ──────────────────
const resolveColorGroup = (actionColor, c) => {
  const map = {
    default: c.slate,
    primary: c.blue,
    success: c.green,
    danger: c.red,
    warning: c.amber,
    info: c.cyan || c.blue,
  };
  return map[actionColor] || c.slate; // ✅ default = slate, NOT blue
};
const flattenActionChildren = (children) => {
  const result = [];
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type === React.Fragment) {
      result.push(...flattenActionChildren(child.props.children));
    } else {
      result.push(child);
    }
  });
  return result;
};
// ── Actions Cell ──────────────────────────────────────────────────────
const ActionsCell = ({ render }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const open = Boolean(anchorEl);
  const content = render();
  const showDot = useMediaQuery("(max-width:1364px)");

  return (
    <>
      {!showDot && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>{content}</Box>
      )}

      {showDot && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setAnchorEl(e.currentTarget);
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            onClick={(e) => e.stopPropagation()}
            PaperProps={{
              sx: {
                minWidth: 180,
                borderRadius: "10px",
                boxShadow: `0 4px 20px ${colors.shadowBase}`,
                py: 0.5,
                bgcolor: colors.rowSolid, // ✅ solid modal bg
                border: `1px solid ${colors.border}`,
              },
            }}
          >
            {flattenActionChildren(content?.props?.children).map((child, i) => {
              if (!child) return null;
              const actionColor = child.props?.actionColor ?? "default";
              const cg = resolveColorGroup(actionColor, base);
              const isHovered = hoveredIndex === i;

              return (
                <Box
                  key={child.key ?? `action-${i}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.5,
                    py: 0.75,
                    mx: 0.75,
                    mb: 0.25,
                    borderRadius: "8px",
                    cursor: "pointer",
                    bgcolor: isHovered ? colors.hoverBg : "transparent", // ✅ slate hover ONLY
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    child.props?.onClick?.(e);
                    setAnchorEl(null);
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: isHovered ? colors.rowStripe : colors.hoverBg, // ✅ slate tones
                      color: colors.textPrimary, // ✅ no blue icons
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  >
                    {child.props?.icon}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: colors.textPrimary,
                      transition: "color 0.15s",
                    }}
                  >
                    {child.props?.tooltip ?? ""}
                  </Typography>
                </Box>
              );
            })}
          </Menu>
        </Box>
      )}
    </>
  );
};

// ── Custom Table ──────────────────────────────────────────────────────
const CustomTable = ({
  columns = [],
  rows = [],
  page = 0,
  rowsPerPage = 15,
  loading = false,
  enableSorting = true,
  onRowClick,
  getRowId = (row) => row.id ?? row.nSupplierId ?? row.nClientId,
  onPageChange,
  onRowsPerPageChange,
  showPagination = true,
  rowSx,
  useSkeleton = true,
  maxHeight = "68vh",
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const tableBodyRef = useRef(null);

  const handleSort = (key) => {
    if (!enableSorting) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    return [...rows].sort((a, b) => {
      const valA = a[sortConfig.key] ?? "";
      const valB = b[sortConfig.key] ?? "";
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  const visibleRows = useMemo(() => {
    if (rowsPerPage === -1) return sortedRows;
    return sortedRows.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedRows, page, rowsPerPage]);

  const getSortIcon = (colKey) => {
    if (!enableSorting) return null;
    if (sortConfig.key !== colKey)
      return (
        <UnfoldMore
          sx={{
            fontSize: "0.75rem",
            opacity: 0.4,
            color: colors.textSecondary,
          }}
        />
      );
    return sortConfig.direction === "asc" ? (
      <ArrowUpward sx={{ fontSize: "0.75rem", color: colors.textSecondary }} />
    ) : (
      <ArrowDownward
        sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
      />
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: "800px" }}>
          <Paper
            elevation={2}
            sx={{
              borderRadius: "8px",
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
              bgcolor: colors.rowSolid, // ✅ table bg = modal body bg
            }}
          >
            {/* HEADER — bg = modal header bg ✅ */}
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                bgcolor: colors.rowStripe, // ✅ matches modal header bg
                borderBottom: `2px solid ${colors.border}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: "40px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    color: colors.textSecondary,
                  }}
                >
                  #
                </Box>
                {columns.map((col, ci) => (
                  <Box
                    key={col.key ?? `header-col-${ci}`}
                    sx={{
                      flex: col.xs ?? 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      cursor: enableSorting ? "pointer" : "default",
                      transition: "opacity 0.2s ease",
                      "&:hover": { opacity: enableSorting ? 0.7 : 1 },
                    }}
                    onClick={() => handleSort(col.key)}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: {
                          xs: "0.6rem",
                          sm: "0.625rem",
                          md: "0.65rem",
                        },
                        color: colors.textPrimary,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {col.label}
                    </Typography>
                    {getSortIcon(col.key)}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Scrollable body */}
            <Box
              ref={tableBodyRef}
              sx={{
                maxHeight,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <UpDownIndicatorWidget
                scrollRef={tableBodyRef}
                direction="up"
                arrowSize={18}
                watch={[visibleRows, loading]}
              />

              <Box>
                {loading && (
                  <CustomTableSkeleton
                    columns={columns}
                    rows={rowsPerPage}
                    useSkeleton={useSkeleton}
                  />
                )}

                {/* Empty state */}
                {!loading && visibleRows.length === 0 && (
                  <Box
                    sx={{
                      p: 1,
                      textAlign: "center",
                      bgcolor: colors.rowStripe,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: colors.textDisabled, fontSize: "0.7rem" }}
                    >
                      No data available
                    </Typography>
                  </Box>
                )}

                {/* DATA ROWS — NO blue border, slate hover only ✅ */}
                {!loading &&
                  visibleRows.length > 0 &&
                  visibleRows.map((row, index) => {
                    const rowKey = getRowId(row) ?? `row-fallback-${index}`;
                    const isEven = index % 2 === 0;
                    return (
                      <Box
                        key={rowKey}
                        sx={{
                          px: 1.5,
                          lineHeight: 3,
                          bgcolor: isEven ? colors.rowSolid : colors.rowStripe, // ✅ stripe = modal colors
                          borderLeft: "none", // ✅ REMOVED BLUE LEFT BORDER
                          borderBottom: `1px solid ${colors.border}`,
                          cursor: onRowClick ? "pointer" : "default",
                          transition: "background 0.15s ease",
                          "&:hover": onRowClick
                            ? { bgcolor: colors.hoverBg } // ✅ SLATE hover ONLY — NO BLUE!
                            : {},
                          "&:last-child": {
                            borderBottom: showPagination
                              ? `1px solid ${colors.border}`
                              : "none",
                          },
                          ...(rowSx ? rowSx(row) : {}),
                        }}
                        onClick={() => onRowClick && onRowClick(row)}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: "40px",
                              textAlign: "center",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              color: colors.textSecondary,
                            }}
                          >
                            {rowsPerPage === -1
                              ? index + 1
                              : page * rowsPerPage + index + 1}
                          </Box>
                          {columns.map((col, ci) => {
                            const isActionsCol = col.key === "actions";
                            return (
                              <Box
                                key={col.key ?? `cell-${index}-${ci}`}
                                sx={{
                                  flex: col.xs ?? 1,
                                  textAlign: col.align || "left",
                                  fontSize: "0.75rem",
                                  px: 0.5,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color: colors.textPrimary,
                                  fontWeight: 500,
                                }}
                                title={
                                  col.render
                                    ? undefined
                                    : row[col.key]?.toString()
                                }
                                onClick={(e) => {
                                  if (e.target.closest("button, svg, a"))
                                    e.stopPropagation();
                                }}
                              >
                              {isActionsCol && col.render ? (
  <ActionsCell
    render={() => col.render(row[col.key], row)}
  />
) : col.render ? (
  col.render(row[col.key], row)
) : (
  (() => {
    const text = (row[col.key] ?? "").toString();
    const max = col.maxChars ?? 50;
    if (!text) return "--";
    return text.length > max ? `${text.slice(0, max)}...` : text;
  })()
)}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
              </Box>

              <UpDownIndicatorWidget
                scrollRef={tableBodyRef}
                direction="down"
                arrowSize={18}
                watch={[visibleRows, loading]}
              />
            </Box>

            {/* Pagination */}
            {showPagination && (
              <CustomPagination
                count={sortedRows.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
              />
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default CustomTable;
