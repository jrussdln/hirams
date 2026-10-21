/**
 * Skeleton.jsx — the loading states of the Item Purchasing pages.
 *
 * Both skeletons mirror the CURRENT UI, piece for piece, so the page does
 * not jump when the data arrives:
 *
 *   • CartSkeleton      → the Item Purchasing LIST page: the time-period
 *                         groups (This Week / This Month / …) and the PO
 *                         cards inside them — PO number · AO chip · supplier ·
 *                         company · amount, the item rows and the date/VIEW
 *                         footer.
 *   • CartUpdateSkeleton→ the PO DETAIL page: the progress stepper, the
 *                         company / supplier / purchase-order cards, the
 *                         shipping + payment row and the Purchase Items table
 *                         with its Order Total footer.
 *
 * The bars themselves are neutral (the theme's own skeleton shades), so a
 * loading state never shouts — only the small chips keep their tint, so the
 * shape of the real row still reads.
 */
import { useTheme } from "@mui/material/styles";
import { Box, Skeleton } from "@mui/material";
import {
  AccessTimeOutlined,
  Visibility,
  Inventory2Outlined,
  ExpandLess,
  ExpandMore,
  StoreOutlined,
  LocalShippingOutlined,
  ReceiptLongOutlined,
  AccountCircleOutlined,
} from "@mui/icons-material";
import getThemeColors from "../../../../../utils/style/getThemeColors";

// ── Pulse keyframes (theme-aware) ─────────────────────────────────────────────
const getPulseStyles = (isDark) => `
  @keyframes ip-card-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: ${isDark ? 0.78 : 0.86}; }
  }
`;

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

// The colors + a pre-bound bar factory, so every piece below reads the same.
const useSkel = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = getThemeColors(isDark);
  const bar = ({ tint, ...rest }) => (
    <Bar {...rest} tint={tint ?? c.skeleton.skelLight} />
  );
  return { c, isDark, bar };
};

// ═══════════════════════════════════════════════════════════════════════════
// LIST PAGE — the Item Purchasing cards
// ═══════════════════════════════════════════════════════════════════════════

// One PO card — the shape of CartCardPanel: header, item rows, footer.
function POCardSkeleton({ bar, c, isDark, index, rows = 2 }) {
  return (
    <Box
      sx={{
        border: `0.5px solid ${c.slate.border}`,
        borderRadius: 2,
        overflow: "hidden",
        background: c.slate.outerBg,
        width: "100%",
        boxShadow: `0 1px ${isDark ? "4px" : "3px"} ${c.shadow.loading}`,
        animation: `ip-card-pulse 1.8s ease-in-out ${index * 0.08}s infinite`,
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
          background: c.slate.itemHeaderBg,
          borderBottom: `0.5px solid ${c.slate.border}`,
        }}
      >
        {/* The status stamp */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: c.skeleton.skelMed,
            flexShrink: 0,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, ml: 0.3 }}>
          {/* PO NUMBER + AO BADGE */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 0.05,
            }}
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
          {bar({ w: 52, h: 11, tint: c.skeleton.skelMed })}
          {bar({ w: 42, h: 8, sx: { mt: 0.1 } })}
        </Box>

        {/* The fold triangle */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50px",
            border: `0.5px solid ${c.slate.border}`,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* THE ITEM ROWS — icon + index badge, brand · model, and the figures */}
      <Box sx={{ maxHeight: "20vh", overflow: "hidden" }}>
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
                row < rows - 1 ? `0.5px solid ${c.slate.divider}` : "none",
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
                    background: c.slate.mutedBg,
                    border: `0.5px solid ${c.slate.mutedBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Inventory2Outlined
                    sx={{ fontSize: "0.75rem", color: c.slate.mutedColor }}
                  />
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
                    background: c.skeleton.skelMed,
                    border: `1.5px solid ${c.slate.outerBg}`,
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
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexShrink: 0,
              }}
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
                  tint: c.skeleton.skelMed,
                  sx: { ml: "auto" },
                })}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* FOOTER — the date on the left, VIEW on the right */}
      <Box
        sx={{
          borderTop: `0.5px solid ${c.slate.border}`,
          background: c.slate.itemHeaderBg,
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
          <AccessTimeOutlined
            sx={{ fontSize: "0.6rem", color: c.slate.mutedColor }}
          />
          {bar({ w: 64, h: 8 })}
        </Box>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            px: 1,
            py: 0.4,
            borderRadius: "6px",
            background: c.slate.btnBg,
            border: `1px solid ${c.slate.btnBorder}`,
          }}
        >
          <Visibility sx={{ fontSize: "0.65rem", color: c.blue.text }} />
          {bar({ w: 24, h: 8, tint: c.blue.border })}
        </Box>
      </Box>
    </Box>
  );
}

// One time-period group — the header (label · count · triangle) and the
// cards inside it. The real page opens the first group only.
function PeriodGroupSkeleton({ bar, c, isDark, cards = 2, open = true, index = 0 }) {
  return (
    <Box
      sx={{
        mb: 0.75,
        borderRadius: "7px",
        border: `0.5px solid ${c.slate.border}`,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.75,
          py: 1.25,
          background: c.slate.itemHeaderBg,
        }}
      >
        {bar({ w: 68, h: 9 })}
        <Box
          sx={{
            px: 0.6,
            py: 0.15,
            borderRadius: "4px",
            background: c.slate.mutedBg,
          }}
        >
          {bar({ w: 10, h: 8 })}
        </Box>
        <Box sx={{ flex: 1 }} />
        {open ? (
          <ExpandLess sx={{ fontSize: "0.75rem", color: c.slate.mutedColor }} />
        ) : (
          <ExpandMore sx={{ fontSize: "0.75rem", color: c.slate.mutedColor }} />
        )}
      </Box>

      {open && (
        <Box sx={{ p: 0.75 }}>
          {/* Mobile: one card per row. Desktop: two columns. */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            {Array.from({ length: cards }).map((_, i) => (
              <POCardSkeleton
                key={i}
                bar={bar}
                c={c}
                isDark={isDark}
                index={index * 3 + i}
              />
            ))}
          </Box>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "row",
              gap: 0.5,
              alignItems: "flex-start",
            }}
          >
            {[0, 1].map((col) => (
              <Box
                key={col}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {Array.from({
                  length: Math.ceil(cards / 2),
                }).map((_, i) => (
                  <POCardSkeleton
                    key={i}
                    bar={bar}
                    c={c}
                    isDark={isDark}
                    index={index * 3 + col * 2 + i}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Purchase Cart Skeleton Preloader ──────────────────────────────────────────
export function CartSkeleton() {
  const { c, isDark, bar } = useSkel();

  return (
    <>
      <style>{getPulseStyles(isDark)}</style>
      <Box>
        {/* The first period is open, the next one is folded away — the same
            shape the real page takes when it opens. */}
        <PeriodGroupSkeleton
          bar={bar}
          c={c}
          isDark={isDark}
          cards={2}
          open
          index={0}
        />
        <PeriodGroupSkeleton
          bar={bar}
          c={c}
          isDark={isDark}
          cards={2}
          open={false}
          index={1}
        />
      </Box>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PO DETAIL PAGE — the Item Purchasing update view
// ═══════════════════════════════════════════════════════════════════════════

// The progress stepper — six pips with their labels, joined by a line.
function StepperSkeleton({ bar, c }) {
  const steps = [
    "In Cart",
    "For Approval",
    "For Payment",
    "Pending Receipt",
    "For Delivery",
    "Delivered",
  ];

  return (
    <Box sx={{ pt: 0.5, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", pt: 0.5 }}>
        {steps.map((label, i) => (
          <Box
            key={label}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {i < steps.length - 1 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 11,
                  left: "50%",
                  width: "100%",
                  height: "1.5px",
                  borderRadius: "2px",
                  background: c.slate.mutedBg,
                }}
              />
            )}
            <Box
              sx={{
                position: "relative",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: c.slate.mutedBg,
                border: `2px solid ${c.slate.mutedBorder}`,
                zIndex: 1,
                mb: 0.5,
              }}
            />
            <Box sx={{ px: 0.25, textAlign: "center" }}>
              {bar({ w: 52, h: 8 })}
            </Box>
            <Box sx={{ px: 0.25, mt: 0.15, textAlign: "center" }}>
              {bar({ w: 40, h: 6, tint: c.skeleton.skelFaint })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// One info card of the header row (Company / Supplier / Purchase Order).
function InfoCardSkeleton({ bar, c, icon, lines = 2, extra = null }) {
  return (
    <Box
      sx={{
        flex: 1,
        px: 1.25,
        py: 1.25,
        borderRadius: "8px",
        background: c.slate.innerBg,
        border: `0.5px solid ${c.slate.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
        {icon}
        {bar({ w: 56, h: 8 })}
      </Box>
      {Array.from({ length: lines }).map((_, i) => (
        <Box key={i}>
          {bar({ w: i === lines - 1 ? "45%" : "78%", h: i === 0 ? 10 : 8 })}
        </Box>
      ))}
      {extra}
    </Box>
  );
}

// ── Purchase Cart Update Page Skeleton ───────────────────────────────────────
export function CartUpdateSkeleton() {
  const { c, isDark, bar } = useSkel();
  const lineItemCount = 3;

  return (
    <>
      <style>{getPulseStyles(isDark)}</style>

      {/* STEPPER */}
      <StepperSkeleton bar={bar} c={c} />

      {/* HEADER CARDS — Company | Supplier | Purchase Order */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
          alignItems: "stretch",
        }}
      >
        <InfoCardSkeleton
          bar={bar}
          c={c}
          icon={
            <StoreOutlined sx={{ fontSize: "0.7rem", color: c.slate.mutedColor }} />
          }
          lines={3}
        />
        <InfoCardSkeleton
          bar={bar}
          c={c}
          icon={
            <LocalShippingOutlined
              sx={{ fontSize: "0.7rem", color: c.slate.mutedColor }}
            />
          }
          lines={3}
        />
        <InfoCardSkeleton
          bar={bar}
          c={c}
          icon={
            <ReceiptLongOutlined
              sx={{ fontSize: "0.7rem", color: c.slate.mutedColor }}
            />
          }
          lines={1}
          // The assigned AO, under the PO number.
          extra={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
              <AccountCircleOutlined
                sx={{ fontSize: "0.7rem", color: c.slate.mutedColor }}
              />
              {bar({ w: 54, h: 8 })}
            </Box>
          }
        />
      </Box>

      {/* SHIPPING + PAYMENT */}
      <Box
        sx={{
          mt: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
          alignItems: "stretch",
        }}
      >
        <InfoCardSkeleton
          bar={bar}
          c={c}
          icon={
            <LocalShippingOutlined
              sx={{ fontSize: "0.85rem", color: c.slate.mutedColor }}
            />
          }
          lines={2}
        />
        <InfoCardSkeleton
          bar={bar}
          c={c}
          icon={
            <ReceiptLongOutlined
              sx={{ fontSize: "0.85rem", color: c.slate.mutedColor }}
            />
          }
          lines={2}
        />
      </Box>

      {/* PURCHASE ITEMS — the table with its header strip and total footer */}
      <Box
        sx={{
          mt: 1.5,
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${c.slate.border}`,
          overflow: "hidden",
        }}
      >
        {/* The table's own header — title on the left, the toggle on the right */}
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
          {bar({ w: 70, h: 8 })}
          <Box
            sx={{
              px: 0.75,
              height: 22,
              display: "flex",
              alignItems: "center",
              borderRadius: "5px",
              background: c.blue.bg,
              border: `0.5px solid ${c.blue.border}`,
            }}
          >
            {bar({ w: 40, h: 7, tint: c.blue.border })}
          </Box>
        </Box>

        {/* THE ROWS — numbering · code · brand · model · name | qty · price · total */}
        {Array.from({ length: lineItemCount }).map((_, idx) => (
          <Box
            key={idx}
            sx={{
              px: 2,
              py: 0.875,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              borderBottom:
                idx < lineItemCount - 1
                  ? `0.5px solid ${c.slate.divider}`
                  : "none",
            }}
          >
            {/* The numbering column */}
            <Box sx={{ width: 20, flexShrink: 0, textAlign: "center" }}>
              {bar({ w: 12, h: 9 })}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* The transaction code, above the brand · model */}
              {bar({ w: 62, h: 8 })}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  mt: 0.15,
                }}
              >
                {bar({ w: 92, h: 10 })}
              </Box>
              {/* The item name */}
              {bar({ w: "55%", h: 8, sx: { mt: 0.15 } })}
            </Box>

            {/* QTY (with the unit under it) */}
            <Box
              sx={{
                width: 60,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {bar({ w: 28, h: 10 })}
              {bar({ w: 18, h: 6, tint: c.skeleton.skelFaint, sx: { mt: 0.1 } })}
            </Box>

            {/* UNIT PRICE */}
            <Box
              sx={{
                width: 80,
                flexShrink: 0,
                textAlign: "right",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {bar({ w: 44, h: 10 })}
            </Box>

            {/* TOTAL */}
            <Box
              sx={{
                width: 80,
                flexShrink: 0,
                textAlign: "right",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {bar({ w: 48, h: 10, tint: c.skeleton.skelMed })}
            </Box>
          </Box>
        ))}

        {/* ORDER TOTAL — the receipt icon, the count and the amount */}
        <Box
          sx={{
            px: 1.5,
            py: 0.875,
            display: "flex",
            alignItems: "center",
            background: c.slate.totalBg,
            borderTop: `0.5px solid ${c.slate.totalBorder}`,
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              background: c.slate.innerBg,
              border: `0.5px solid ${c.slate.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 1,
              flexShrink: 0,
            }}
          >
            <ReceiptLongOutlined
              sx={{ fontSize: "0.85rem", color: c.slate.mutedColor }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {bar({ w: 62, h: 10 })}
            {bar({ w: 42, h: 7, sx: { mt: 0.1 } })}
          </Box>
          <Box
            sx={{
              width: 80,
              flexShrink: 0,
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              mr: 1.5,
            }}
          >
            {bar({ w: 52, h: 12, tint: c.skeleton.skelMed })}
            {bar({ w: 40, h: 7, tint: c.skeleton.skelFaint, sx: { mt: 0.1 } })}
          </Box>
        </Box>
      </Box>
    </>
  );
}
