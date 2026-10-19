import React from "react";
import { TablePagination, useMediaQuery, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

// ── PROMPT 1 — useColors: MATCH MODAL SOLID COLORS ──────────────────
const useColors = (c) => ({
  border: c.slate.border,
  hoverBg: c.slate.hover,
  headerBg: c.slate.itemHeaderBgSolid, // ✅ matches modal header bg
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  inputBg: c.slate.outerBgSolid, // ✅ solid bg for selects/buttons
});

const CustomPagination = ({
  count = 0,
  page = 0,
  rowsPerPage: propRowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base, isDark), [base, isDark]);

  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMd = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const rowsPerPageOptions = [{ label: "All", value: -1 }, 15, 50, 100, 500];
  const validValues = [-1, 15, 50, 100, 500];
  const rowsPerPage = validValues.includes(propRowsPerPage)
    ? propRowsPerPage
    : 15;

  const effectiveRowsPerPage = rowsPerPage === -1 ? count : rowsPerPage;
  const startRecord = count === 0 ? 0 : page * effectiveRowsPerPage + 1;
  const endRecord =
    rowsPerPage === -1
      ? count
      : Math.min((page + 1) * effectiveRowsPerPage, count);
  const totalPages =
    rowsPerPage === -1 ? 1 : Math.ceil(count / effectiveRowsPerPage);
  const currentPage = page + 1;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: { xs: 1.5, sm: 2 },
        py: 1,
        bgcolor: colors.headerBg, // ✅ SOLID — NO gradient!
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      {/* Left Side - Summary (hidden on mobile) */}
      {!isXs && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              color: colors.textSecondary,
              fontWeight: 500,
            }}
          >
            Showing {startRecord}-{endRecord} of {count}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              color: colors.textDisabled,
              mx: 0.25,
            }}
          >
            •
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              color: colors.textSecondary,
              fontWeight: 500,
            }}
          >
            Page {currentPage} of {totalPages || 1}
          </Typography>
        </Box>
      )}

      {/* Right Side - Pagination Controls */}
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={rowsPerPageOptions}
        labelRowsPerPage={isXs ? "" : "Rows:"}
        showFirstButton={!isXs}
        showLastButton={!isXs}
        labelDisplayedRows={({ from, to, count }) =>
          isXs ? `${from}-${to} of ${count}` : ""
        }
        sx={{
          width: isXs ? "100%" : "auto",
          border: "none",
          "& .MuiTablePagination-toolbar": {
            minHeight: { xs: "36px", sm: "38px" },
            padding: 0,
            gap: { xs: 0.5, sm: 1 },
            justifyContent: isXs ? "space-between" : "flex-end",
          },
          "& .MuiTablePagination-selectLabel": {
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            color: colors.textSecondary,
            fontWeight: 500,
            margin: 0,
          },
          "& .MuiTablePagination-select": {
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            color: colors.textPrimary,
            fontWeight: 600,
            paddingTop: "4px",
            paddingBottom: "4px",
            paddingLeft: "8px",
            paddingRight: "24px",
            backgroundColor: colors.inputBg, // ✅ solid bg
            borderRadius: "4px",
            border: `1px solid ${colors.border}`,
            "&:focus": {
              backgroundColor: colors.inputBg,
              borderRadius: "4px",
            },
          },
          "& .MuiTablePagination-displayedRows": {
            fontSize: "0.7rem",
            color: colors.textSecondary,
            fontWeight: 500,
            margin: 0,
          },
          "& .MuiTablePagination-actions": {
            marginLeft: { xs: 0.5, sm: 1 },
            gap: 0.25,
          },
          "& .MuiTablePagination-actions button": {
            padding: { xs: "4px", sm: "6px" },
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            backgroundColor: colors.inputBg, // ✅ solid bg
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: colors.hoverBg, // ✅ SLATE hover — NO blue!
              color: colors.textPrimary, // ✅ neutral text — NO blue!
              borderColor: colors.border, // ✅ same border — NO blue!
            },
            "&.Mui-disabled": {
              backgroundColor: colors.headerBg,
              color: colors.textDisabled,
              borderColor: colors.border,
            },
          },
        }}
      />
    </Box>
  );
};

export default CustomPagination;
