import React, { useMemo } from "react";
import { Button, Tooltip, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

export const ResponsiveLabel = ({ children, hideOnMobile }) => (
  <Box
    component="span"
    sx={{
      display: hideOnMobile ? { xs: "none", sm: "inline" } : "inline",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Box>
);

// ─────────────────────────────────────────────────────────────────
// INLINE COLOR MAP — per-file useColors pattern (PROMPT 1)
// ✅ Back = proper slate gray | Light: crisp | Dark: soft balanced
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Blue family — default/login/view/submit
  blueBg: c.blue.borderStrong,
  blueHover: c.blue.hover,

  // Green family — register/approve/confirm
  greenBg: c.green.borderStrong,
  greenHover: c.green.hover,

  // Teal family — add/save/apply/breakdown
  tealBg: c.teal.borderStrong,
  tealHover: c.teal.hover,

  // Amber family — edit/assign/revert/reset
  amberBg: c.amber.warnBorder,
  amberHover: c.amber.warnHoverBg,

  // Red family — delete
  redBg: c.red.borderStrong,
  redHover: c.red.hover,

  // Purple family — verify/markup
  purpleBg: c.purple.borderStrong,
  purpleHover: c.purple.hover,

  // Orange family — reassign
  orangeBg: c.orange.borderStrong,
  orangeHover: c.orange.hover,

  // Slate/neutral — deactivate/cancel/back/close
  // ✅ BACK BUTTON = proper slate gray (mode-adaptive, no harsh black)
  slateBg: c.slate.mutedColor, // Base = soft slate gray
  slateHover: c.slate.textSecondary, // Hover = slightly darker gray

  // Shadows — balanced per mode
  hoverShadowDark: `0 2px 8px ${c.shadow.strong}`,
  hoverShadowLight: `0 3px 10px ${c.shadow.base}`,

  // Text
  whiteText: c.gray.textOnFill,
});

// ─────────────────────────────────────────────────────────────────
// BUILD ACTION COLORS from palette tokens (auto dark/light)
// ─────────────────────────────────────────────────────────────────
const buildActionColors = (colors) => ({
  default: { bg: colors.blueBg, hover: colors.blueHover },
  login: { bg: colors.blueBg, hover: colors.blueHover },
  register: { bg: colors.greenBg, hover: colors.greenHover },
  add: { bg: colors.tealBg, hover: colors.tealHover },
  edit: { bg: colors.amberBg, hover: colors.amberHover },
  delete: { bg: colors.redBg, hover: colors.redHover },
  view: { bg: colors.blueBg, hover: colors.blueHover },
  submit: { bg: colors.blueBg, hover: colors.blueHover },
  save: { bg: colors.tealBg, hover: colors.tealHover },
  approve: { bg: colors.greenBg, hover: colors.greenHover },
  finalize: { bg: colors.tealBg, hover: colors.tealHover },
  verify: { bg: colors.purpleBg, hover: colors.purpleHover },
  apply: { bg: colors.tealBg, hover: colors.tealHover },
  confirm: { bg: colors.greenBg, hover: colors.greenHover },
  assign: { bg: colors.amberBg, hover: colors.amberHover },
  reassign: { bg: colors.orangeBg, hover: colors.orangeHover },
  markup: { bg: colors.purpleBg, hover: colors.purpleHover },
  breakdown: { bg: colors.tealBg, hover: colors.tealHover },
  deactivate: { bg: colors.slateBg, hover: colors.slateHover },
  cancel: { bg: colors.slateBg, hover: colors.slateHover },
  revert: { bg: colors.amberBg, hover: colors.amberHover },
  reset: { bg: colors.amberBg, hover: colors.amberHover },
  back: { bg: colors.slateBg, hover: colors.slateHover },
  close: { bg: colors.slateBg, hover: colors.slateHover },
});

const BaseButton = ({
  label,
  icon,
  tooltip,
  onClick,
  disabled = false,
  actionColor = "default",
  variant = "contained",
  size = "medium",
  // Native <button> type — pass "submit" when the button lives inside a form
  // (the auth pages submit that way) and "button" to keep it inert.
  type,
  sx = {},
}) => {
  // ✅ Standard wiring — PROMPT 1 pattern
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // Derive action colors from palette (auto dark/light mode)
  const ACTION_COLORS = useMemo(() => buildActionColors(colors), [colors]);

  const hasIcon = Boolean(icon);
  const hasLabel = Boolean(label);
  const isIconOnly = hasIcon && !hasLabel;
  const isResponsiveIconOnly = hasIcon && hasLabel;

  const action = ACTION_COLORS[actionColor] || ACTION_COLORS.default;

  const hoverShadow = isDark ? colors.hoverShadowDark : colors.hoverShadowLight;

  const buttonContent = (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={isIconOnly ? "text" : variant}
      size={size}
      aria-label={label || tooltip}
      sx={{
        textTransform: "none",
        fontWeight: 500,
        letterSpacing: "0.2px",
        minWidth: "auto",
        gap: hasLabel ? 1 : 0,
        transition: "all .18s ease",
        ...(isIconOnly
          ? {
              width: 19,
              height: 19,
              minWidth: 19,
              borderRadius: "50%",
              padding: 0,
              color: action.bg,
              "&:hover": {
                backgroundColor: `${action.bg}18`, // 10% opacity overlay
              },
            }
          : {
              px: { xs: 1.5, sm: 2.5 },
              height: { xs: 34, sm: 34 },
              borderRadius: "20px",
              backgroundColor: action.bg,
              color: colors.whiteText,
              "&:hover": {
                backgroundColor: action.hover,
                boxShadow: hoverShadow,
                transform: "translateY(-1px)",
              },
            }),
        "&:active": { transform: "translateY(0px)", boxShadow: "none" },
        "& .MuiSvgIcon-root": { fontSize: 16 },
        "&.Mui-disabled": { opacity: 0.45 },
        ...sx,
      }}
    >
      {icon}
      {hasLabel && (
        <ResponsiveLabel hideOnMobile={hasIcon}>{label}</ResponsiveLabel>
      )}
    </Button>
  );

  // ── Type 2: Icon + Label ──────────────────────────────────────
  // Desktop (sm+): label visible → no tooltip
  // Mobile  (xs):  label hidden  → show tooltip
  if (isResponsiveIconOnly) {
    return (
      <>
        {/* Mobile: label hidden → always show tooltip */}
        <Box sx={{ display: { xs: "inline-flex", sm: "none" } }}>
          <Tooltip title={tooltip || label}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: 0,
                margin: 0,
                lineHeight: 0,
              }}
            >
              {buttonContent}
            </span>
          </Tooltip>
        </Box>

        {/* Desktop: only show tooltip if disabled */}
        <Box sx={{ display: { xs: "none", sm: "inline-flex" } }}>
          {disabled ? (
            <Tooltip title={tooltip || label}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: 0,
                  margin: 0,
                  lineHeight: 0,
                }}
              >
                {buttonContent}
              </span>
            </Tooltip>
          ) : (
            buttonContent
          )}
        </Box>
      </>
    );
  }

  // ── Type 1: Icon only — always show tooltip ───────────────────
  // ── Type 3: Label only — only show tooltip if explicitly passed
  if (isIconOnly || tooltip) {
    return (
      <Tooltip title={tooltip || label}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: 0,
            margin: 0,
            lineHeight: 0,
          }}
        >
          {buttonContent}
        </span>
      </Tooltip>
    );
  }

  // ── Type 3: Label only, no tooltip prop → render as-is ───────
  return buttonContent;
};

export default BaseButton;
