/**
 * Skeleton.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized skeleton/loading-state helpers.
 *
 * Exports:
 *  • DataTableSkeleton   — drop-in loading state for <DataTable>
 *  • TransactionSkeleton — full Transaction page skeleton
 *
 * Usage:
 *   import { DataTableSkeleton, TransactionSkeleton } from "./Skeleton";
 *
 *   // Inside DataTable (replaces the inline loading block):
 *   {loading && <DataTableSkeleton columns={columns} rows={5} />}
 *
 *   // Inside a Transaction page:
 *   if (loading) return <TransactionSkeleton />;
 */

import React, { useMemo } from "react";
import { Box, Grid, Paper, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

/* ═══════════════════════════════════════════════════════════════════
   Primitive: animated shimmer cell
═══════════════════════════════════════════════════════════════════ */
function ShimmerCell({ flex, widthPct = 60, height = 14 }) {
  return (
    <Box sx={{ flex, px: 1, display: "flex", alignItems: "center" }}>
      <Skeleton
        variant="text"
        width={`${widthPct}%`}
        height={height}
        animation="wave"
        sx={{ borderRadius: 1 }}
      />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PurchasePageSkeleton
   ─────────────────────────────────────────────────────────────────
   Loading state for the canvas tab inside TransactionForPurchase.
   Mirrors the exact layout of PurchaseItemsTable:
     • Transaction details card  (icon + text + avatar)
     • Section label + status badge row
     • Table header row          (4 flex columns)
     • 5 banded item rows        (checkbox + name / badge / value / action)
═══════════════════════════════════════════════════════════════════ */
export function PurchasePageSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box>
      {/* ── Transaction details card ── */}
      <Box
        sx={{
          mb: 1,
          p: 1.5,
          border: `1px solid ${colors.skeleton.rule}`,
          borderRadius: "8px",
          background: theme.palette.background.paper,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={30}
            height={30}
            sx={{ flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant="rounded"
              width={120}
              height={14}
              sx={{ mb: 0.75, borderRadius: "5px" }}
            />
            <Skeleton variant="text" width="60%" height={12} />
          </Box>
          <Skeleton
            variant="circular"
            width={52}
            height={52}
            sx={{ flexShrink: 0 }}
          />
        </Box>
      </Box>

      {/* ── Section label + status badge ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Skeleton
          variant="rounded"
          width={110}
          height={16}
          sx={{ borderRadius: "4px" }}
        />
        <Skeleton
          variant="rounded"
          width={80}
          height={22}
          sx={{ borderRadius: "6px" }}
        />
      </Box>

      {/* ── Table header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1.5,
          py: 0.75,
          background: colors.slate.itemHeaderBg,
          border: `1px solid ${colors.skeleton.rule}`,
          borderTopLeftRadius: "10px",
          borderTopRightRadius: "10px",
          borderBottom: "none",
          gap: 1,
        }}
      >
        {[42, 28, 16, 8].map((flex, i) => (
          <Box
            key={i}
            sx={{
              flex,
              display: "flex",
              justifyContent: i === 0 ? "flex-start" : "center",
            }}
          >
            <Skeleton variant="text" width="55%" height={11} />
          </Box>
        ))}
      </Box>

      {/* ── Item rows ── */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 0.9,
            background: theme.palette.background.paper,
            border: `1px solid ${colors.skeleton.rule}`,
            borderTop: "none",
            borderLeft: `4px solid ${colors.skeleton.accentRule}`,
            gap: 1,
            ...(i === 4 && {
              borderBottomLeftRadius: "10px",
              borderBottomRightRadius: "10px",
            }),
          }}
        >
          {/* Name column — checkbox + text */}
          <Box sx={{ flex: 42, display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton
              variant="rounded"
              width={16}
              height={16}
              sx={{ flexShrink: 0 }}
            />
            <Skeleton
              variant="text"
              width={`${55 + (i % 3) * 15}%`}
              height={13}
              sx={{ borderRadius: "4px" }}
            />
          </Box>

          {/* Status badge column */}
          <Box sx={{ flex: 28, px: 1 }}>
            <Skeleton
              variant="rounded"
              height={18}
              sx={{
                borderRadius: "99px",
                width: `${40 + (i % 4) * 15}%`,
                mx: "auto",
              }}
            />
          </Box>

          {/* Value column */}
          <Box sx={{ flex: 16, display: "flex", justifyContent: "center" }}>
            <Skeleton variant="text" width={56} height={13} />
          </Box>

          {/* Action column */}
          <Box sx={{ flex: 8, display: "flex", justifyContent: "center" }}>
            <Skeleton variant="circular" width={20} height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PurchaseCartSkeleton
   ─────────────────────────────────────────────────────────────────
   Loading state for TransactionPurchaseCart.
   Two-column grid of 3 POCards each — mirrors the card layout with
   header, 3 line-item rows, and a footer.
═══════════════════════════════════════════════════════════════════ */
export function PurchaseCartSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box
      sx={{
        border: `1px solid ${colors.skeleton.rule}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Section headers */}
      {[0, 1].map((section) => (
        <Box
          key={section}
          sx={{
            borderBottom: section === 0 ? `1px solid ${colors.skeleton.rule}` : "none",
            overflow: "hidden",
          }}
        >
          {/* Section group header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1.5,
              background: colors.skeleton.panelAlt,
            }}
          >
            <Skeleton
              variant="circular"
              width={8}
              height={8}
              sx={{ flexShrink: 0 }}
            />
            <Skeleton variant="text" width={110} height={14} sx={{ flex: 1 }} />
            <Skeleton
              variant="rounded"
              width={24}
              height={18}
              sx={{ borderRadius: "5px" }}
            />
            <Skeleton variant="circular" width={14} height={14} />
          </Box>

          <Box sx={{ p: 1, background: theme.palette.background.paper }}>
            {/* Time period group */}
            <Box
              sx={{
                mb: 0.75,
                borderRadius: "7px",
                border: `0.5px solid ${colors.skeleton.rule}`,
                overflow: "hidden",
              }}
            >
              {/* Time period header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.75,
                  py: 1.25,
                  background: colors.skeleton.panel,
                }}
              >
                <Skeleton
                  variant="text"
                  width={60}
                  height={12}
                  sx={{ flex: 1 }}
                />
                <Skeleton
                  variant="rounded"
                  width={20}
                  height={14}
                  sx={{ borderRadius: "4px" }}
                />
                <Skeleton variant="circular" width={12} height={12} />
              </Box>

              {/* Cards */}
              <Box sx={{ p: 0.75 }}>
                {/* Mobile */}
                <Box
                  sx={{
                    display: { xs: "flex", md: "none" },
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {[0, 1].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </Box>
                {/* Desktop two-column */}
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
                      {[0, 1].map((i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function SkeletonCard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box
      sx={{
        border: `0.5px solid ${colors.skeleton.rule}`,
        borderRadius: 2,
        overflow: "hidden",
        background: theme.palette.background.paper,
        boxShadow: `0 1px 3px ${colors.shadow.raised}`,
      }}
    >
      {/* Header — navy blue removed, replaced with light gray */}
      <Box
        sx={{
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: colors.skeleton.panel,
        }}
      >
        <Skeleton
          variant="circular"
          width={24}
          height={24}
          sx={{ flexShrink: 0, bgcolor: colors.skeleton.bar }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.35 }}
          >
            <Skeleton
              variant="circular"
              width={14}
              height={14}
              sx={{ flexShrink: 0, bgcolor: colors.skeleton.bar }}
            />
            <Skeleton
              variant="text"
              width={130}
              height={14}
              sx={{ bgcolor: colors.skeleton.bar }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Skeleton
              variant="rounded"
              width={70}
              height={16}
              sx={{ borderRadius: "50px", bgcolor: colors.skeleton.overlay }}
            />
            <Skeleton
              variant="rounded"
              width={55}
              height={16}
              sx={{ borderRadius: "50px", bgcolor: colors.skeleton.overlay }}
            />
          </Box>
        </Box>
        <Skeleton
          variant="text"
          width={52}
          height={14}
          sx={{ flexShrink: 0, bgcolor: colors.skeleton.bar }}
        />
        <Skeleton
          variant="rounded"
          width={22}
          height={22}
          sx={{
            borderRadius: "50px",
            flexShrink: 0,
            bgcolor: colors.skeleton.bar,
          }}
        />
      </Box>

      {/* Line items */}
      {[0, 1, 2].map((row) => (
        <Box
          key={row}
          sx={{
            px: 1.5,
            py: 0.875,
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderTop: `0.5px solid ${colors.skeleton.ruleSoft}`,
          }}
        >
          <Skeleton
            variant="text"
            width={18}
            height={14}
            sx={{ flexShrink: 0 }}
          />
          <Skeleton
            variant="rounded"
            width={34}
            height={34}
            sx={{ borderRadius: "8px", flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.2 }}
            >
              <Skeleton
                variant="rounded"
                width={38}
                height={13}
                sx={{ borderRadius: "3px", flexShrink: 0 }}
              />
              <Skeleton variant="text" width={80} height={13} />
            </Box>
            <Skeleton variant="text" width="60%" height={12} />
            <Skeleton variant="text" width={90} height={10} />
          </Box>
          <Skeleton
            variant="text"
            width={52}
            height={13}
            sx={{ flexShrink: 0 }}
          />
          <Box
            sx={{
              width: 60,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.3,
            }}
          >
            <Skeleton variant="text" width={24} height={14} />
            <Skeleton variant="text" width={32} height={10} />
          </Box>
          <Skeleton
            variant="text"
            width={64}
            height={14}
            sx={{ flexShrink: 0 }}
          />
        </Box>
      ))}

      {/* Footer */}
      <Box
        sx={{
          borderTop: `0.5px solid ${colors.skeleton.rule}`,
          background: colors.slate.itemHeaderBg,
          px: 1.5,
          py: 0.875,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
          <Skeleton variant="circular" width={10} height={10} />
          <Skeleton variant="text" width={80} height={11} />
        </Box>
        <Skeleton
          variant="rounded"
          width={52}
          height={20}
          sx={{ borderRadius: "6px" }}
        />
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PurchaseCartModalSkeleton
   ─────────────────────────────────────────────────────────────────
   Full loading state for PurchaseCartUpdateStatusModal (LoadingSkeleton).
   Covers: stepper row, dark header card (company/supplier/PO row),
   section divider, 3 line-item rows, and a dark footer total.
═══════════════════════════════════════════════════════════════════ */
export function PurchaseCartModalSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Stepper */}
      <Box
        sx={{
          background: colors.skeleton.headGradient,
          borderBottom: `0.5px solid ${colors.skeleton.rule}`,
          px: 2,
          pt: 1.25,
          pb: 1.75,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Skeleton variant="circular" width={22} height={22} />
              <Skeleton variant="text" width="70%" height={9} />
              <Skeleton variant="text" width="50%" height={8} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Light header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Box
          sx={{
            background: colors.skeleton.panel,
            border: `1px solid ${colors.skeleton.rule}`,
            borderRadius: "16px",
            p: 1.5,
          }}
        >
          {/* Company + Supplier cards */}
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            {[0, 1].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  px: 1,
                  py: 0.85,
                  borderRadius: "10px",
                  background: colors.skeleton.panelAlt,
                  border: `0.5px solid ${colors.skeleton.rule}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    mb: 0.5,
                  }}
                >
                  <Skeleton
                    variant="circular"
                    width={10}
                    height={10}
                    sx={{ bgcolor: colors.skeleton.bar }}
                  />
                  <Skeleton
                    variant="text"
                    width={45}
                    height={10}
                    sx={{ bgcolor: colors.skeleton.bar }}
                  />
                </Box>
                <Skeleton
                  variant="text"
                  width="80%"
                  height={12}
                  sx={{ bgcolor: colors.skeleton.bar }}
                />
                <Skeleton
                  variant="text"
                  width="60%"
                  height={10}
                  sx={{ bgcolor: colors.skeleton.barFaint }}
                />
                <Skeleton
                  variant="text"
                  width="45%"
                  height={10}
                  sx={{ bgcolor: colors.skeleton.barFaint }}
                />
              </Box>
            ))}
          </Box>
          {/* PO row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton
              variant="rounded"
              width={28}
              height={28}
              sx={{
                borderRadius: "7px",
                flexShrink: 0,
                bgcolor: colors.skeleton.bar,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton
                variant="text"
                width="55%"
                height={14}
                sx={{ bgcolor: colors.skeleton.bar }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: 0.5,
                }}
              >
                <Skeleton
                  variant="rounded"
                  width={70}
                  height={18}
                  sx={{
                    borderRadius: "50px",
                    bgcolor: colors.skeleton.bar,
                  }}
                />
                <Skeleton
                  variant="text"
                  width={35}
                  height={10}
                  sx={{ bgcolor: colors.skeleton.barFaint }}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.625 }}>
              <Skeleton
                variant="rounded"
                width={60}
                height={24}
                sx={{ borderRadius: "6px", bgcolor: colors.skeleton.bar }}
              />
              <Skeleton
                variant="rounded"
                width={68}
                height={24}
                sx={{ borderRadius: "6px", bgcolor: colors.skeleton.bar }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Section divider */}
      <Box
        sx={{
          px: 2,
          pt: 1,
          pb: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <Skeleton variant="text" width={35} height={10} />
        <Box sx={{ flex: 1, height: "0.5px", background: colors.skeleton.rule }} />
      </Box>

      {/* Line items */}
      <Box
        sx={{
          mx: 1.5,
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${colors.skeleton.rule}`,
          overflow: "hidden",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              px: 1.5,
              py: 0.875,
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderBottom: i < 2 ? `0.5px solid ${colors.skeleton.ruleSoft}` : "none",
            }}
          >
            <Skeleton
              variant="rounded"
              width={34}
              height={34}
              sx={{ borderRadius: "8px", flexShrink: 0 }}
            />
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 0.3,
                }}
              >
                <Skeleton
                  variant="rounded"
                  width={30}
                  height={11}
                  sx={{ borderRadius: "3px" }}
                />
                <Skeleton
                  variant="text"
                  width={`${50 + i * 12}%`}
                  height={13}
                />
              </Box>
              <Skeleton variant="text" width="45%" height={10} />
              <Skeleton variant="text" width="30%" height={9} />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 44,
              }}
            >
              <Skeleton variant="text" width={20} height={13} />
              <Skeleton variant="text" width={24} height={10} />
            </Box>
            <Box sx={{ width: 80, textAlign: "right" }}>
              <Skeleton
                variant="text"
                width="80%"
                height={13}
                sx={{ ml: "auto" }}
              />
              <Skeleton
                variant="text"
                width="55%"
                height={10}
                sx={{ ml: "auto" }}
              />
            </Box>
          </Box>
        ))}
        {/* Light footer total */}
        <Box
          sx={{
            px: 1.5,
            py: 0.875,
            display: "flex",
            alignItems: "center",
            gap: 1,
            background: colors.skeleton.panel,
            borderTop: `1px solid ${colors.skeleton.rule}`,
          }}
        >
          <Skeleton
            variant="rounded"
            width={34}
            height={34}
            sx={{
              borderRadius: "8px",
              flexShrink: 0,
              bgcolor: colors.skeleton.bar,
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant="text"
              width="40%"
              height={12}
              sx={{ bgcolor: colors.skeleton.bar }}
            />
            <Skeleton
              variant="text"
              width="25%"
              height={10}
              sx={{ bgcolor: colors.skeleton.barFaint }}
            />
          </Box>
          <Box sx={{ width: 44, flexShrink: 0 }} />
          <Box sx={{ width: 80, textAlign: "right" }}>
            <Skeleton
              variant="text"
              width="85%"
              height={14}
              sx={{ ml: "auto", bgcolor: colors.skeleton.bar }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VoucherUpdateModalSkeleton
   ─────────────────────────────────────────────────────────────────
   Loading state for VoucherUpdateModal (LoadingSkeleton).
   Covers: dark header with 2 info cards, section divider,
   3 PO rows with icon + text + actions.
═══════════════════════════════════════════════════════════════════ */
export function VoucherUpdateSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {/* Light header */}
      <Box sx={{ pb: 1.5 }}>
        <Box
          sx={{
            background: colors.skeleton.panel,
            border: `1px solid ${colors.skeleton.rule}`,
            borderRadius: "16px",
            p: 1.5,
          }}
        >
          {/* Two info cards */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {[0, 1].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  px: 1,
                  py: 0.85,
                  borderRadius: "10px",
                  background: colors.skeleton.panelAlt,
                  border: `0.5px solid ${colors.skeleton.rule}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    mb: 0.5,
                  }}
                >
                  <Skeleton
                    variant="circular"
                    width={10}
                    height={10}
                    sx={{ bgcolor: colors.skeleton.bar }}
                  />
                  <Skeleton
                    variant="text"
                    width={45}
                    height={10}
                    sx={{ bgcolor: colors.skeleton.bar }}
                  />
                </Box>
                <Skeleton
                  variant="text"
                  width="80%"
                  height={12}
                  sx={{ bgcolor: colors.skeleton.bar }}
                />
                <Skeleton
                  variant="text"
                  width="55%"
                  height={10}
                  sx={{ bgcolor: colors.skeleton.barFaint }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      {/* Section divider */}
      <Box
        sx={{
          pt: 1,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <Skeleton variant="text" width={60} height={10} />
        <Box sx={{ flex: 1, height: "0.5px", background: colors.skeleton.rule }} />
      </Box>

      {/* PO rows */}
      <Box
        sx={{
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${colors.skeleton.rule}`,
          overflow: "hidden",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              px: 1.5,
              py: 0.875,
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderBottom: i < 2 ? `0.5px solid ${colors.skeleton.ruleSoft}` : "none",
            }}
          >
            <Skeleton variant="text" width={16} height={12} />
            <Skeleton
              variant="rounded"
              width={30}
              height={30}
              sx={{ borderRadius: "7px" }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={`${45 + i * 15}%`} height={13} />
              <Skeleton
                variant="text"
                width="25%"
                height={10}
                sx={{ mt: 0.3 }}
              />
            </Box>
            <Skeleton variant="text" width={55} height={13} />
            <Skeleton
              variant="rounded"
              width={20}
              height={20}
              sx={{ borderRadius: "50px" }}
            />
            <Skeleton
              variant="rounded"
              width={20}
              height={20}
              sx={{ borderRadius: "4px" }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DataTableSkeleton
   ─────────────────────────────────────────────────────────────────
   Props:
     columns   ColumnDef[]   — same columns array passed to DataTable
     rows      number        — skeleton row count (default 5)
     hasHeader boolean       — show header shimmer (default true)
     minWidth  string        — matches DataTable's minWidth (default "900px")
═══════════════════════════════════════════════════════════════════ */
export function DataTableSkeleton({
  columns = [],
  rows = 5,
  hasHeader = true,
  minWidth = "900px",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const baseBorder = `1px solid ${theme.palette.divider}`;

  /* Seed widths so adjacent rows look different */
  const seedWidth = (rowIdx, colKey = "") =>
    55 + ((rowIdx * 13 + (colKey?.length ?? 3) * 7) % 35);

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Box sx={{ overflowX: "auto", pb: 1 }}>
        <Box sx={{ minWidth }}>
          {/* Header shimmer */}
          {hasHeader && (
            <Paper
              elevation={0}
              sx={{
                background: colors.skeleton.panel,
                borderRadius: "10px 10px 0 0",
                border: baseBorder,
                borderBottom: "none",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 0.6,
                }}
              >
                {columns.map((col) => (
                  <Box key={col.key} sx={{ flex: col.xs, px: 1 }}>
                    <Skeleton
                      variant="text"
                      width="50%"
                      height={12}
                      animation="wave"
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Data rows */}
          <Box sx={{ border: baseBorder, borderTop: "none" }}>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <Box
                key={rowIdx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 0.75,
                  background:
                    rowIdx % 2 === 0
                      ? theme.palette.background.paper
                      : colors.skeleton.panelAlt,
                  borderBottom: rowIdx < rows - 1 ? baseBorder : "none",
                }}
              >
                {columns.map((col) => (
                  <ShimmerCell
                    key={col.key}
                    flex={col.xs}
                    widthPct={seedWidth(rowIdx, col.key)}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CustomTableSkeleton
   ─────────────────────────────────────────────────────────────────
   Drop-in replacement for the inline SkeletonRow / TableLoadingState
   inside CustomTable.  Mirrors the exact chrome of CustomTable:
     • gradient header row with # column + all data columns
     • banded data rows with left accent border
     • seeded shimmer widths so adjacent rows look naturally varied
     • DotSpinner fallback when useSkeleton=false (same as original)

   Props:
     columns      ColumnDef[]  — same columns array passed to CustomTable
     rows         number       — skeleton row count; capped at 6 (default 5)
     useSkeleton  boolean      — false → renders DotSpinner instead (default true)
═══════════════════════════════════════════════════════════════════ */
export function CustomTableSkeleton({
  columns = [],
  rows = 5,
  useSkeleton = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const clampedRows = Math.min(rows > 0 ? rows : 5, 6);
  const seedWidth = (rowIdx, colKey = "", colIdx = 0) =>
    55 + ((rowIdx * 13 + (colKey?.length ?? colIdx) * 7) % 35);

  if (!useSkeleton) {
    /* Mirrors the DotSpinner fallback in TableLoadingState */
    return (
      <Box
        sx={{
          p: 1.5,
          textAlign: "center",
          background: theme.palette.action.hover,
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          gap={1}
        >
          {/* Inline pulse dots — no DotSpinner import needed here */}
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="circular"
              width={8}
              height={8}
              animation="wave"
              sx={{ display: "inline-block", mx: 0.25 }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <>
      {Array.from({ length: clampedRows }).map((_, rowIdx) => (
        <Box
          key={`ct-skeleton-${rowIdx}`}
          sx={{
            px: 1.5,
            py: 0.75,
            background:
              rowIdx % 2 === 0
                ? theme.palette.background.paper
                : colors.skeleton.panelAlt,
            borderLeft: `3px solid ${colors.skeleton.accentRule}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* # column */}
            <Box
              sx={{ width: "40px", display: "flex", justifyContent: "center" }}
            >
              <Skeleton
                variant="text"
                width={18}
                height={14}
                animation="wave"
                sx={{ borderRadius: 1 }}
              />
            </Box>

            {/* Data columns */}
            {columns.map((col, ci) => (
              <Box
                key={col.key ?? `ct-sk-col-${ci}`}
                sx={{ flex: col.xs ?? 1, px: 0.5 }}
              >
                <Skeleton
                  variant="text"
                  width={`${seedWidth(rowIdx, col.key, ci)}%`}
                  height={14}
                  animation="wave"
                  sx={{ borderRadius: 1 }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </>
  );
}

const Skeletons = {
  DataTable: DataTableSkeleton,
  CustomTable: CustomTableSkeleton,
  PurchasePage: PurchasePageSkeleton,
  PurchaseCart: PurchaseCartSkeleton,
  PurchaseCartModal: PurchaseCartModalSkeleton,
  VoucherUpdate: VoucherUpdateSkeleton,
};

/* ═══════════════════════════════════════════════════════════════════
   NotificationSkeleton
   ─────────────────────────────────────────────────────────────────
   Loading state for the notification surfaces (bell dropdown, mobile
   bottom sheet, right-side panel). Mirrors a notification row:
   type circle · title + message lines · action buttons.
   Usage: {loading && <NotificationSkeleton rows={4} />}
═══════════════════════════════════════════════════════════════════ */
export function NotificationSkeleton({ rows = 4 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.25,
            px: 1.75,
            py: 1.25,
            borderBottom: `1px solid ${colors.skeleton.rule}`,
            "&:last-child": { borderBottom: "none" },
          }}
        >
          {/* Type circle */}
          <Skeleton
            variant="circular"
            width={32}
            height={32}
            animation="wave"
            sx={{ flexShrink: 0, bgcolor: colors.skeleton.bar }}
          />

          {/* Title + message lines */}
          <Box sx={{ flex: 1, minWidth: 0, px: 0.25 }}>
            <Skeleton
              variant="text"
              animation="wave"
              width="60%"
              height={14}
              sx={{ mb: 0.5, bgcolor: colors.skeleton.bar }}
            />
            <Skeleton
              variant="text"
              animation="wave"
              width="92%"
              height={12}
              sx={{ bgcolor: colors.skeleton.barFaint }}
            />
            <Skeleton
              variant="text"
              animation="wave"
              width="70%"
              height={12}
              sx={{ bgcolor: colors.skeleton.barFaint }}
            />
          </Box>

          {/* Action buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            <Skeleton
              variant="rounded"
              width={16}
              height={16}
              animation="wave"
              sx={{ borderRadius: 0.75, bgcolor: colors.skeleton.barFaint }}
            />
            <Skeleton
              variant="rounded"
              width={16}
              height={16}
              animation="wave"
              sx={{ borderRadius: 0.75, bgcolor: colors.skeleton.barFaint }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default Skeletons;