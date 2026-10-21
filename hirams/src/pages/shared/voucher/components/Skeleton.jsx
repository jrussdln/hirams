/**
 * Skeleton.jsx — the Disbursement Voucher page's loading state.
 *
 * The page shows two blocks, and the skeleton draws both of them as they
 * really are, so nothing shifts when the voucher arrives:
 *
 *   • the PARTICULS card — the same PO card the voucher page shows: the
 *     status stamp, the PO number with the AO chip, the supplier, the
 *     company, the amount, then the item rows and the Grand Total footer;
 *   • the JOURNAL card — the same panel the JEV viewer shows: the JEV
 *     number, "Journal Entry Voucher", the type, the status badge, and the
 *     From / To columns with their total band.
 *
 * Content only — the page's header and footer chrome belong to PageLayout.
 */
import { Box, Skeleton, Typography, useTheme } from "@mui/material";
import { useMemo } from "react";
import {
  Inventory2Outlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors";

// ── The building block: a thin bar ────────────────────────────────────────────
const Bar = ({ w = "100%", h = 10, tint, radius, sx }) => (
  <Skeleton
    variant="text"
    width={w}
    height={h}
    sx={{
      bgcolor: tint,
      my: 0,
      ...(radius ? { borderRadius: radius } : null),
      ...sx,
    }}
  />
);

// The colours + a pre-bound bar factory, so every piece reads the same.
// Named `makeColors`, not `useColors`, so calling it inside useMemo doesn't
// trip react-hooks/rules-of-hooks.
const makeColors = (c) => ({
  border: c.slate.border,
  outerBg: c.slate.outerBg,
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  mutedColor: c.slate.mutedColor,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  skeleton: {
    light: c.skeleton.skelLight,
    med: c.skeleton.skelMed,
    faint: c.skeleton.skelFaint,
  },
});

const useSkel = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = getThemeColors(isDark);
  const c = useMemo(() => makeColors(base), [base]);
  const bar = ({ tint, ...rest }) => (
    <Bar {...rest} tint={tint ?? c.skeleton.light} />
  );
  return { c, isDark, bar };
};

// ═══════════════════════════════════════════════════════════════════════════
// THE PARTICULS CARD — the PO card of the voucher page
// ═══════════════════════════════════════════════════════════════════════════
function ParticularsSkeleton({ bar, c, rows = 2 }) {
  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 2,
        border: `0.5px solid ${c.border}`,
        overflow: "hidden",
        background: c.outerBg,
      }}
    >
      {/* HEADER — stamp · PO number + AO chip · supplier · company · amount */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          background: c.itemHeaderBg,
          borderBottom: `0.5px solid ${c.border}`,
        }}
      >
        {/* The status stamp */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: c.skeleton.med,
            flexShrink: 0,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, ml: 0.3 }}>
          {/* PO NUMBER + AO BADGE */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.05 }}
          >
            {bar({ w: 66, h: 9 })}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 0.5,
                py: 0.1,
                borderRadius: "50px",
                background: c.blue.bg,
                border: `0.5px solid ${c.blue.border}`,
                flexShrink: 0,
              }}
            >
              {bar({ w: 30, h: 7, tint: c.blue.border })}
            </Box>
          </Box>
          {/* SUPPLIER — the card's headline */}
          {bar({ w: "52%", h: 12, sx: { mt: 0.15 } })}
          {/* COMPANY */}
          {bar({ w: "30%", h: 8, sx: { mt: 0.1 } })}
        </Box>

        {/* THE AMOUNT — the figure, then the EWT line under it */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            mr: 1,
            flexShrink: 0,
          }}
        >
          {bar({ w: 52, h: 11, tint: c.skeleton.med })}
          {bar({ w: 42, h: 8, sx: { mt: 0.1 } })}
        </Box>

        {/* The fold triangle */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50px",
            border: `0.5px solid ${c.border}`,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* THE ITEM ROWS — icon + index badge, brand · model, and the figures */}
      {Array.from({ length: rows }).map((_, row) => (
        <Box
          key={row}
          sx={{
            position: "relative",
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            gap: 2,
            justifyContent: "space-between",
            borderBottom:
              row < rows - 1 ? `0.5px solid ${c.divider}` : "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {/* The item icon with its row number on the corner */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "6px",
                  background: c.mutedBg,
                  border: `0.5px solid ${c.mutedBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Inventory2Outlined sx={{ fontSize: "0.75rem", color: c.mutedColor }} />
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
                  background: c.skeleton.med,
                  border: `1.5px solid ${c.outerBg}`,
                }}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* BRAND · MODEL + the transaction-code chip */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  mb: 0.2,
                }}
              >
                {bar({ w: 92, h: 10 })}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 0.35,
                    py: 0.08,
                    borderRadius: "50px",
                    background: c.blue.bg,
                    border: `0.5px solid ${c.blue.border}`,
                    flexShrink: 0,
                  }}
                >
                  {bar({ w: 24, h: 6, tint: c.blue.border })}
                </Box>
              </Box>
              {/* THE ITEM NAME */}
              {bar({ w: "58%", h: 8 })}
            </Box>
          </Box>

          {/* QTY · UNIT PRICE · TOTAL */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
          >
            <Box sx={{ minWidth: 50, textAlign: "right" }}>
              {bar({ w: 28, h: 10, sx: { ml: "auto" } })}
            </Box>
            <Box sx={{ minWidth: 70, textAlign: "right" }}>
              {bar({ w: 40, h: 10, sx: { ml: "auto" } })}
            </Box>
            <Box sx={{ minWidth: 70, textAlign: "right" }}>
              {bar({
                w: 44,
                h: 10,
                tint: c.skeleton.med,
                sx: { ml: "auto" },
              })}
            </Box>
          </Box>
        </Box>
      ))}

      {/* GRAND TOTAL — the receipt icon, the count and the amount */}
      <Box
        sx={{
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          background: c.totalBg,
          borderTop: `1px solid ${c.totalBorder}`,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "7px",
            background: c.blue.bg,
            border: `0.5px solid ${c.blue.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1,
            flexShrink: 0,
          }}
        >
          <ReceiptLongOutlined sx={{ fontSize: "0.85rem", color: c.blue.text }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {bar({ w: 62, h: 10 })}
          {bar({ w: 34, h: 7, sx: { mt: 0.15 } })}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          {bar({ w: 56, h: 12, tint: c.skeleton.med })}
          {bar({ w: 44, h: 7, tint: c.skeleton.faint, sx: { mt: 0.1 } })}
        </Box>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THE JOURNAL CARD — the JEV panel below the particulars
// ═══════════════════════════════════════════════════════════════════════════
function JournalSkeleton({ bar, c, rows = 2 }) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${c.border}`,
        background: c.outerBg,
        overflow: "hidden",
      }}
    >
      {/* HEADER — the JEV number, its kind, the type and the status badge */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 1,
          background: c.itemHeaderBg,
          borderBottom: `0.5px solid ${c.divider}`,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {bar({ w: 72, h: 9 })}
          {bar({ w: 96, h: 10, sx: { mt: 0.3 } })}
          {bar({ w: 60, h: 8, sx: { mt: 0.15 } })}
        </Box>

        {/* The status badge */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 0.6,
            py: 0.2,
            borderRadius: "99px",
            background: c.skeleton.med,
            flexShrink: 0,
          }}
        >
          {bar({ w: 40, h: 8, tint: c.skeleton.faint })}
        </Box>

        {/* The fold triangle */}
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50px",
            border: `0.5px solid ${c.border}`,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* THE COLUMNS — From | To, and the total band under them */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        {["From", "To"].map((side) => (
          <Box
            key={side}
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: "20vh",
              borderLeft: side === "To" ? `0.5px solid ${c.divider}` : "none",
            }}
          >
            {/* The column's own header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 0.6,
                borderBottom: `0.5px solid ${c.divider}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {bar({ w: 40, h: 9 })}
              </Box>
              <Box
                sx={{
                  px: 0.75,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "7px",
                  background: c.blue.bg,
                  border: `0.5px solid ${c.blue.border}`,
                }}
              >
                {bar({ w: 26, h: 7, tint: c.blue.border })}
              </Box>
            </Box>

            {/* The account lines */}
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              {Array.from({ length: rows }).map((_, row) => (
                <Box
                  key={row}
                  sx={{
                    px: 1.5,
                    py: 0.875,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderBottom:
                      row < rows - 1 ? `0.5px solid ${c.divider}` : "none",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {bar({ w: `${62 + ((row * 17) % 24)}%`, h: 10 })}
                  </Box>
                  <Box sx={{ minWidth: 90, textAlign: "right" }}>
                    {bar({ w: 56, h: 10, sx: { ml: "auto" } })}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* The column's total */}
            <Box
              sx={{
                px: 1.5,
                py: 0.875,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 1,
                borderTop: `0.5px solid ${c.divider}`,
                background: c.itemHeaderBg,
              }}
            >
              {bar({ w: 34, h: 9 })}
              {bar({ w: 52, h: 10, tint: c.skeleton.med })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PAGE
// ═══════════════════════════════════════════════════════════════════════════
export function VoucherUpdateSkeleton() {
  const { c, isDark, bar } = useSkel();

  return (
    <>
      <style>{`
        @keyframes voucher-update-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: ${isDark ? "0.78" : "0.86"}; }
        }
      `}</style>

      {/* THE PARTICULS */}
      <ParticularsSkeleton bar={bar} c={c} rows={2} />

      {/* THE JOURNAL */}
      <JournalSkeleton bar={bar} c={c} rows={2} />
    </>
  );
}

export default VoucherUpdateSkeleton;
