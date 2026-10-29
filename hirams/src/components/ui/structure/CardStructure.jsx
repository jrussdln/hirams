// components/common/CardStructure.jsx
import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";

// ─────────────────────────────────────────────────────────────────
// VARIANT STYLES — all color logic lives here. Callers just pass
// variant="info" / "success" / "warn" / "danger" / "default" etc.
// ─────────────────────────────────────────────────────────────────
const VARIANT_STYLES = (c) => ({
  default: {
    cardBg: c.slate.cardGlass,
    border: c.slate.border,
    label: c.gray.textSecondary,
    value: c.gray.textPrimary,
    sub: c.gray.textSecondary,
  },
  info: {
    cardBg: c.slate.cardGlass,
    border: c.blue.border,
    label: c.blue.text,
    value: c.blue.textStrong,
    sub: c.blue.text,
  },
  success: {
    cardBg: c.slate.cardGlass,
    border: c.green.border,
    label: c.green.text,
    value: c.green.textStrong ?? c.green.textDark,
    sub: c.green.text,
  },
  warn: {
    cardBg: c.slate.cardGlass,
    border: c.amber.border,
    label: c.amber.text,
    value: c.amber.textDark,
    sub: c.amber.text,
  },
  danger: {
    cardBg: c.slate.cardGlass,
    border: c.red.border,
    label: c.red.text,
    value: c.red.textDark,
    sub: c.red.text,
  },
  purple: {
    cardBg: c.slate.cardGlass,
    border: c.indigo.borderStrong ?? c.indigo.border,
    label: c.indigo.text,
    value: c.indigo.textStrong,
    sub: c.indigo.text,
  },
  teal: {
    cardBg: c.slate.cardGlass,
    border: c.teal.border,
    label: c.teal.text,
    value: c.teal.textStrong,
    sub: c.teal.text,
  },
});

/**
 * CardStructure
 *
 * A themed, self-contained "stat/info card" — colored left accent border,
 * uppercase label with a small icon, a main value/content area, optional
 * sub text, and an oversized faint watermark icon bleeding off the corner.
 *
 * Usage (simple value card, like StatCard):
 *   <CardStructure icon="tin" label="TIN" value="123-456-789" variant="info" />
 *
 * Usage (custom content, like InfoCard):
 *   <CardStructure icon="bank" label="Bank Details" variant="success">
 *     <Typography sx={{ fontSize: "0.7rem" }}>BDO - 1234 5678 90</Typography>
 *   </CardStructure>
 */
const CardStructure = ({
  icon,
  label,
  value,
  sub,
  variant = "default",
  flex = 1,
  minWidth,
  align = "left",
  orientation = "column", // ← add this line
  dense = false,
  // Pin the label + value + sub to the TOP of the card instead of stacking
  // them vertically centered — used by grids where several cards must keep
  // their first lines on the same height regardless of sub lines.
  topAlign = false,
  children,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = useMemo(() => getThemeColors(isDark), [isDark]);
  const styles = useMemo(
    () =>
      VARIANT_STYLES(c)[variant] ?? VARIANT_STYLES(c).default,
    [c, variant],
  );

  const iconEl = typeof icon === "string" ? icons[icon] : icon;
  const isCentered = align === "center";
  if (orientation === "iconLeft") {
    // icon pinned left; small label sits on top of the value, both flush right
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          flex,
          minWidth,
          background: styles.cardBg,
          border: `0.5px solid ${styles.border}`,
          borderLeft: `3px solid ${styles.border}`,
          borderRadius: "7px",
          px: dense ? 1 : 1.25,
          py: dense ? 0.6 : 0.75,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {iconEl &&
          React.cloneElement(iconEl, {
            sx: {
              fontSize: dense ? 14 : 16,
              color: styles.label,
              flexShrink: 0,
            },
          })}

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            minWidth: 0,
            textAlign: "right",
          }}
        >
          {label && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 500,
                color: styles.label,
                letterSpacing: "0.03em",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </Typography>
          )}

          {children != null ? (
            children
          ) : (
            <Typography
              sx={{
                fontSize: dense ? "0.65rem" : { xs: "0.66rem", sm: "0.7rem" },
                fontWeight: 700,
                color: styles.value,
                lineHeight: 1.2,
                mt: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              {value || "—"}
            </Typography>
          )}
        </Box>

        {iconEl && (
          <Box
            sx={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 40,
              height: 40,
              opacity: isDark ? 0.12 : 0.06,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(iconEl, {
              sx: { fontSize: 60, color: styles.label },
            })}
          </Box>
        )}
      </Box>
    );
  }
  if (orientation === "row") {
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          flex,
          minWidth,
          background: styles.cardBg,
          border: `0.5px solid ${styles.border}`,
          borderLeft: `3px solid ${styles.border}`,
          borderRadius: "7px",
          px: dense ? 1 : 1.25,
          py: dense ? 0.6 : 0.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}
        >
          {iconEl &&
            React.cloneElement(iconEl, {
              sx: { fontSize: 12, color: styles.label, flexShrink: 0 },
            })}
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: styles.label,
              letterSpacing: "0.03em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          {children != null ? (
            children
          ) : (
            <>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: styles.value,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {value || "—"}
              </Typography>
              {sub && (
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color: styles.sub,
                    opacity: 0.85,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {sub}
                </Typography>
              )}
            </>
          )}
        </Box>

        {iconEl && (
          <Box
            sx={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 40,
              height: 40,
              opacity: isDark ? 0.12 : 0.06,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(iconEl, {
              sx: { fontSize: 60, color: styles.label },
            })}
          </Box>
        )}
      </Box>
    );
  }
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        flex,
        minWidth,
        background: styles.cardBg,
        border: `0.5px solid ${styles.border}`,
        borderLeft: `3px solid ${styles.border}`,
        borderRadius: "8px",
        px: dense ? 1 : 1.25,
        py: dense ? 0.75 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        ...(topAlign ? { justifyContent: "flex-start" } : { justifyContent: "center" }),
      }}
    >
      {(iconEl || label) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            justifyContent: isCentered ? "center" : "flex-start",
          }}
        >
          {iconEl &&
            React.cloneElement(iconEl, {
              sx: {
                fontSize: dense ? "0.55rem" : { xs: "0.6rem", sm: "0.68rem" },
                color: styles.label,
              },
            })}
          {label && (
            <Typography
              sx={{
                fontSize: dense ? "0.55rem" : { xs: "0.6rem", sm: "0.65rem" },
                fontWeight: 700,
                color: styles.label,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {label}
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          textAlign: align,
        }}
      >
        {children != null ? (
          children
        ) : (
          <>
            <Typography
              sx={{
                fontSize: dense ? "0.72rem" : { xs: "0.75rem", sm: "0.8rem" },
                fontWeight: 700,
                color: styles.value,
                lineHeight: 1.2,
              }}
            >
              {value || "—"}
            </Typography>
            {sub && (
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  color: styles.sub,
                  opacity: 0.85,
                  lineHeight: 1.3,
                  mt: 0.2,
                }}
              >
                {sub}
              </Typography>
            )}
          </>
        )}
      </Box>

      {iconEl && (
        <Box
          sx={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: dense ? 44 : 54,
            height: dense ? 44 : 54,
            opacity: isDark ? 0.12 : 0.09,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {React.cloneElement(iconEl, {
            sx: { fontSize: dense ? 64 : 84, color: styles.label },
          })}
        </Box>
      )}
    </Box>
  );
};

export default CardStructure;
