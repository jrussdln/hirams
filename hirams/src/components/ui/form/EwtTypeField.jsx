import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { ExpandMoreRounded, PercentRounded } from "@mui/icons-material";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { fmtPHP } from "../../../utils/formatters/formatter.js";

// The EWT types, in the order the menu shows them. The first one ("" =
// Default) has no code — the line falls back to the default formula, the
// one the supplier's own flags decide.
const EWT_TYPE_DEFAULT = "";
const EWT_TYPE_OPTIONS = ["", "A", "B", "C", "D", "E"];

// Fallback labels — the same wording as the `ewt_bypass_type` mapping in
// apiHirams/config/mappings.php, used until the mapping arrives.
const FALLBACK_LABELS = {
  A: "0% of TC",
  B: "1% of TC",
  C: "2% of TC",
  D: "1% of TC / 1.12 (VAT net)",
  E: "2% of TC / 1.12 (VAT net)",
};

const useColors = (c) => ({
  border: c.slate.border,
  borderFocus: c.blue.borderStrong,
  borderError: c.red.borderStrong,
  bgPaper: c.slate.outerBg,
  bgSoft: c.slate.mutedBg,
  bgInput: c.gray.inputBg,
  hoverBg: c.slate.hover,
  shadowColor: c.shadow.popover,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  primary: c.blue.textStrong,
  primaryBg: c.blue.bg,
  error: c.red.text,
});

/**
 * The EWT field: the computed amount (read-only) + the picker that
 * decides WHICH formula it comes from.
 *
 * The amount is never typed in — it is derived by the server from the
 * line's EWT type (see FormulaHelper::calculateEWT):
 *
 *   Default → the supplier's own flags decide (bEWT gate, goods 1% /
 *             service 2%, VAT gross-down when the supplier is vattable)
 *   A       → 0% of TC
 *   B       → 1% of TC
 *   C       → 2% of TC
 *   D       → 1% of TC / 1.12 (VAT net)
 *   E       → 2% of TC / 1.12 (VAT net)
 *
 * Controlled: the selected type lives in the parent form as `cEWTType`.
 *
 * The formula that produced the value lives in the FIELD LABEL (as
 * "EWT (1% of TC / 1.12 (VAT net))"), so the box itself only holds the
 * amount and the picker, both on one row, side by side.
 *
 * The field IS a MUI small TextField — the very same one FormGrid renders
 * for the fields beside it. Same component, same size, same notched
 * outline, same label treatment: the height can never drift away from the
 * neighbours, whatever MUI does to its inputs.
 *
 * @param value     the current type ("" = Default, "A" | "B" | "C" | "D" | "E")
 * @param amount    the computed EWT amount to display
 * @param onChange  (type) => void — type is "" | "A" | "B" | "C" | "D" | "E"
 * @param labels    the `ewt_bypass_type` mapping { A, B, C, D, E } (optional)
 * @param compact   the small variant, for the rows of a list/modal
 */
export default function EwtTypeField({
  value = EWT_TYPE_DEFAULT,
  amount = null,
  onChange,
  label = "EWT",
  disabled = false,
  loading = false,
  error = "",
  labels = null,
  compact = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColors = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(baseColors);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const typeLabels = { ...FALLBACK_LABELS, ...(labels || {}) };
  const current = value || EWT_TYPE_DEFAULT;
  const currentLabel =
    current === EWT_TYPE_DEFAULT ? "Default" : typeLabels[current] || current;

  // The label carries the formula, e.g. "EWT (1% of TC / 1.12 (VAT net))".
  // The Default type has no formula of its own, so it stays bare.
  const displayLabel =
    label && current !== EWT_TYPE_DEFAULT ? `${label} (${currentLabel})` : label;

  const menuOptions = EWT_TYPE_OPTIONS.map((code) => ({
    code,
    label:
      code === EWT_TYPE_DEFAULT ? "Default" : typeLabels[code] || code,
  }));

  const handleSelect = (code) => {
    setAnchorEl(null);
    if (code === current) return;
    onChange?.(code);
  };

  const amountText =
    amount === null || amount === undefined || amount === ""
      ? "—"
      : `₱ ${fmtPHP(amount)}`;

  // The input's own box is what decides the height of the whole field:
  // MUI's small outlined input is 23px of content + 8.5px of padding on
  // each side = 40px, the very height of the TextFields FormGrid renders
  // next to this one. The amount is set in a smaller font than MUI's
  // default, so the content height is pinned here — the font can change
  // without the box shrinking under it.
  //
  // The compact rows get the same 40px: a field that is shorter than the
  // others in the same form only reads as a mistake.
  const inputStyle = {
    textAlign: "right",
    fontWeight: 700,
    fontSize: compact ? "0.75rem" : "0.8rem",
    color: colors.textPrimary,
    height: "23px",
    cursor: "default",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
      {/* THE FIELD — a plain MUI small TextField: the calculated value
          (right-aligned) and the picker (the end adornment), on one row. */}
      <TextField
        label={displayLabel}
        size="small"
        fullWidth
        value={loading ? "…" : amountText}
        error={!!error}
        disabled={disabled}
        helperText={error || ""}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                disabled={disabled}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                title={
                  disabled ? "EWT type is locked" : "Change the EWT type"
                }
                aria-label="Change the EWT type"
                sx={{
                  width: 32,
                  height: 24,
                  p: 0,
                  gap: 0.2,
                  border: `0.5px solid ${open ? colors.borderFocus : colors.border}`,
                  borderRadius: "5px",
                  background: colors.bgSoft,
                  color: colors.textSecondary,
                  "&:hover": { background: colors.hoverBg },
                  "&.Mui-disabled": { opacity: 0.45 },
                }}
              >
                <PercentRounded sx={{ fontSize: "0.8rem" }} />
                <ExpandMoreRounded sx={{ fontSize: "0.8rem" }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        inputProps={{ readOnly: true, style: inputStyle }}
        sx={{
          // The border follows MUI's own, so the EWT box and the fields
          // beside it are cut from the same cloth.
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? colors.borderError : undefined,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? colors.borderError : undefined,
          },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              background: colors.bgPaper,
              border: `0.5px solid ${colors.border}`,
              boxShadow: `0 4px 16px ${colors.shadowColor}`,
              minWidth: 190,
            },
          },
        }}
      >
        {menuOptions.map((opt) => (
          <MenuItem
            key={opt.code || "default"}
            selected={opt.code === current}
            onClick={() => handleSelect(opt.code)}
            sx={{
              fontSize: "0.72rem",
              gap: 0.75,
              "&.Mui-selected": { background: colors.primaryBg },
              "&.Mui-selected:hover": { background: colors.primaryBg },
            }}
          >
            <Box
              sx={{
                width: 14,
                fontWeight: 800,
                color:
                  opt.code === current ? colors.primary : colors.textMuted,
              }}
            >
              {opt.code === EWT_TYPE_DEFAULT ? "•" : opt.code}
            </Box>
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
