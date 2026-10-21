import React from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";

/**
 * The header strip of a Purchase Items table (the PO detail page).
 *
 * Left: the table's title. Right: whatever toggle the table needs — the
 * Show All / Hide All button lives in the caller, it is passed in as
 * `action` so the two stay on the same line.
 */
export default function PurchaseItemsHeader({ title = "Purchase Items", action }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = React.useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box
      sx={{
        pl: 2,
        pr: 0.5,
        py: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        background: c.slate.itemHeaderBg,
        borderBottom: `0.5px solid ${c.slate.divider}`,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.55rem",
          fontWeight: 700,
          textTransform: "uppercase",
          color: c.gray.textSecondary,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {title}
      </Typography>
      {action}
    </Box>
  );
}

/**
 * The left part of an item row: the numbering, the transaction code, the
 * brand · model and the item name.
 *
 * Same styling as the Purchase Items table on the Cart stage — the panels
 * (Pending Receipt / For Delivery / Delivered) use it too, so a line looks
 * the same wherever it shows up.
 */
export function ItemInfoColumn({
  p,
  tx,
  idx,
  showCode = true,
  onBrandClick,
  children,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = React.useMemo(() => getThemeColors(isDark), [isDark]);

  // The brand · model is the link; a line with no brand · model links on its
  // name, so there is always something to click.
  const brandClickable = Boolean(
    onBrandClick && (p?.strBrand || p?.strModel),
  );
  const nameClickable = Boolean(onBrandClick && !brandClickable);

  return (
    <>
      {/* The numbering — its own narrow column, centred on the row. */}
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
            color: c.gray.textSecondary,
            lineHeight: 1,
          }}
        >
          {idx + 1}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* CODE — above the brand · model, plain text, like the card header. */}
        {showCode && (
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 600,
              color: c.gray.textSecondary,
              textTransform: "uppercase",
              lineHeight: 1,
              mb: 0.05,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {tx?.strCode ?? "—"}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.4,
            mb: 0.1,
            flexWrap: "wrap",
          }}
        >
          {(p?.strBrand || p?.strModel) && (
            <Typography
              onClick={brandClickable ? onBrandClick : undefined}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 600,
                // A link looks like a link — blue, underlined on hover.
                color: brandClickable ? c.blue.text : c.gray.textPrimary,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: brandClickable ? "pointer" : "default",
                ...(brandClickable && {
                  "&:hover": { textDecoration: "underline" },
                }),
              }}
            >
              {[p?.strBrand, p?.strModel].filter(Boolean).join(" · ")}
            </Typography>
          )}
        </Box>

        <Typography
          onClick={nameClickable ? onBrandClick : undefined}
          sx={{
            fontSize: "0.58rem",
            color: nameClickable ? c.blue.text : c.gray.textSecondary,
            textTransform: "uppercase",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: nameClickable ? "pointer" : "default",
            ...(nameClickable && {
              "&:hover": { textDecoration: "underline" },
            }),
          }}
        >
          {p?.transaction_item?.strName ?? "—"}
        </Typography>

        {children}
      </Box>
    </>
  );
}
