import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Collapse, useTheme } from "@mui/material";
import {
  ExpandMoreOutlined,
  ExpandLessOutlined,
  TagOutlined,
  MoveToInboxOutlined,
  OutputOutlined,
} from "@mui/icons-material";
import {
  fmtPHP,
  fmtQty,
} from "../../../../utils/formatters/formatter.js";
import { fmtDateTime } from "../../../../utils/helpers/timeZone.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import JevViewPanel from "../../jev/components/JevViewPanel.jsx";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // slate — structural surfaces
  border: c.slate.border,
  borderRow: c.slate.borderRow,
  divider: c.slate.divider,
  itemHover: c.slate.itemHover,
  outerBg: c.slate.outerBg,
  btnBg: c.slate.btnBg,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  summaryBg: c.slate.summaryBg,
  summaryBorder: c.slate.summaryBorder,
  cardBg: c.slate.btnBg,
  // gray — text hierarchy
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  // blue — transaction link
  blueTextDark: c.blue.textDark,
  // JEV strip — number / type / status chip
  purple: { bg: c.purple.bg, border: c.purple.border, text: c.purple.text },
  green: { bg: c.green.bg, border: c.green.border, text: c.green.text },
  red: { bg: c.red.bg, border: c.red.border, text: c.red.text },
  jevCardBg: c.slate.itemHeaderBg,
  // accents (kept functional for status)
  received: {
    color: c.blue.textDark,
    bg: c.blue.bg,
    border: c.blue.border,
    dot: c.blue.text,
  },
  delivered: {
    color: c.green.text,
    bg: c.green.bg,
    border: c.green.border,
    dot: c.green.paid,
  },
  pending: {
    color: c.amber.warnText,
    bg: c.amber.warnBg,
    border: c.amber.warnBorder,
    dot: c.amber.text,
  },
  cancelled: {
    color: c.red.textDark,
    bg: c.red.bg,
    border: c.red.border,
    dot: c.red.text,
  },
});

// ── Sub-components ──────────────────────────────────────────────────────────
const SectionLabel = ({ children, colors }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    <Typography
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        color: colors.textMuted,
      }}
    >
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", background: colors.divider }} />
  </Box>
);

const SerialChip = ({ sn, accent }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.4,
      px: 0.75,
      py: 0.3,
      borderRadius: "6px",
      background: accent.bg,
      border: `1px solid ${accent.border}`,
    }}
  >
    <TagOutlined sx={{ fontSize: "0.55rem", color: accent.color }} />
    <Typography
      sx={{
        fontSize: "0.58rem",
        fontWeight: 700,
        color: accent.color,
        lineHeight: 1,
        fontFamily: "monospace",
        letterSpacing: "0.02em",
      }}
    >
      {sn}
    </Typography>
  </Box>
);

const SerialSection = ({
  title,
  serials = [],
  accent,
  emptyText,
  icon,
  colors,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Box
      sx={{
        borderRadius: "8px",
        border: `1px solid ${accent.border}`,
        overflow: "hidden",
        mb: 1,
      }}
    >
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          background: accent.bg,
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.15s ease",
          "&:hover": { bgcolor: colors.itemHover },
        }}
      >
        <Box sx={{ color: accent.color, display: "flex" }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: "0.6rem",
            fontWeight: 700,
            color: accent.color,
            flex: 1,
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            px: 0.5,
            py: 0.15,
            borderRadius: "4px",
            background: colors.outerBg,
            border: `1px solid ${accent.border}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              color: accent.color,
              lineHeight: 1,
            }}
          >
            {serials.length}
          </Typography>
        </Box>
        {expanded ? (
          <ExpandLessOutlined
            sx={{ fontSize: "0.8rem", color: accent.color }}
          />
        ) : (
          <ExpandMoreOutlined
            sx={{ fontSize: "0.8rem", color: accent.color }}
          />
        )}
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.25,
            py: serials.length ? 1 : 0.75,
            background: colors.btnBg,
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
          {serials.length > 0 ? (
            serials.map((sn) => <SerialChip key={sn} sn={sn} accent={accent} />)
          ) : (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: colors.textMuted,
                fontStyle: "italic",
              }}
            >
              {emptyText}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
// Dashed fallback under the "Journal Entry Voucher" label — same shell the
// Pending group view uses when there is no JEV to show yet.
const JevEmptyBox = ({ colors, message }) => (
  <Box
    sx={{
      mb: 1.5,
      py: 2,
      textAlign: "center",
      fontSize: "0.65rem",
      fontStyle: "italic",
      color: colors.textSecondary,
      border: `1px dashed ${colors.border}`,
      borderRadius: "10px",
    }}
  >
    {message}
  </Box>
);

// A date the server already stores in LOCAL time (the JEV's occurrence,
// the transaction's delivery date) is printed as it stands — the PHT
// shift the UTC stamps get would move it.
const fmtLocalDateTime = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const DarkSummary = ({
  item,
  accent,
  colors,
  statusKind,
  deliveredDate = null,
}) => {
  const p = item?.purchaseOption;
  const qty = Math.abs(item?.nQuantity ?? 0);
  const unitPrice = Number(p?.dUnitPrice ?? 0);
  const total = qty * unitPrice;

  return (
    <Box
      sx={{
        background: colors.summaryBg,
        border: `1px solid ${colors.summaryBorder}`,
        borderRadius: "10px",
        p: 1.25,
        mb: 1.5,
      }}
    >
      {/* THREE COLUMNS:
          FIRST  — who the item is (status · brand · model · title) and what
                   it costs (QTY · UNIT PRICE · TOTAL, side by side);
          SECOND — the transaction behind it (code · company) and who
                   supplied it;
          THIRD  — the serial numbers of this batch. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: { xs: "wrap", sm: "nowrap" },
        }}
      >
        {/* ── COLUMN 1 — the item and its figures ── */}
        <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
          {/* The status sits ON TOP of the brand · model — plain text, no
              badge: the same muted label colour the QTY / UNIT PRICE /
              TOTAL captions use. */}
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1,
              mb: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {accent.label}
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: "0.78rem", sm: "0.85rem", md: "0.9rem" },
              fontWeight: 700,
              color: colors.textPrimary,
              // Brand · model reads the same everywhere else in the app.
              textTransform: "uppercase",
              lineHeight: 1.05,
              wordBreak: "break-word",
            }}
          >
            {[p?.strBrand, p?.strModel].filter(Boolean).join(" · ") || "—"}
          </Typography>

          {/* ITEM NAME — the item this brand · model belongs to. */}
          <Box sx={{ mt: 0.35 }}>
            <Typography
              sx={{
                fontSize: "0.5rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                lineHeight: 1,
                mb: 0.25,
              }}
            >
              Item Name
            </Typography>
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color: colors.textPrimary,
                textTransform: "uppercase",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {p?.transaction_item?.strName ?? "—"}
            </Typography>
          </Box>

          {/* The figures — side by side, each a label over a value (the
              qty carries its unit under it). */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: { xs: 2, sm: 3 },
              mt: 1.25,
            }}
          >
            {[
              { label: "Qty", value: fmtQty(qty), unit: p?.strUOM ?? "units" },
              { label: "Unit Price", value: fmtPHP(unitPrice), unit: null },
              {
                label: "Total",
                value: fmtPHP(total),
                unit: null,
                highlight: true,
              },
            ].map(({ label, value, unit, highlight }) => (
              <Box key={label}>
                <Typography
                  sx={{
                    fontSize: "0.5rem",
                    fontWeight: 700,
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    lineHeight: 1,
                    mb: 0.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    fontWeight: 700,
                    color: highlight ? accent.color : colors.textPrimary,
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                  }}
                >
                  {value}
                </Typography>
                {unit && (
                  <Typography
                    sx={{
                      fontSize: "0.5rem",
                      color: colors.textMuted,
                      mt: 0.1,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {unit}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── COLUMN 2 — the transaction behind the item ── */}
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: 230 },
            pl: { xs: 0, sm: 2 },
            borderLeft: { xs: "none", sm: `1px solid ${colors.borderRow}` },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.5rem",
              fontWeight: 700,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            Transaction
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
              fontWeight: 700,
              color: colors.blueTextDark,
              textTransform: "uppercase",
              lineHeight: 1.05,
              wordBreak: "break-word",
            }}
          >
            {p?.transaction_item?.transaction?.strCode || "—"}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
              lineHeight: 1.1,
              mt: 0.15,
              wordBreak: "break-word",
            }}
          >
            {item?.strCompanyNickName ||
              p?.transaction_item?.transaction?.company?.strCompanyNickName ||
              "—"}
          </Typography>

          {/* CLIENT — the nickname of the client the goods go to. */}
          <Box sx={{ mt: 0.6 }}>
            <Typography
              sx={{
                fontSize: "0.5rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                lineHeight: 1,
                mb: 0.25,
              }}
            >
              Client
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                fontWeight: 700,
                color: colors.textPrimary,
                textTransform: "uppercase",
                lineHeight: 1.05,
                wordBreak: "break-word",
              }}
            >
              {item?.strClientNickName ||
                p?.transaction_item?.transaction?.client?.strClientNickName ||
                "—"}
            </Typography>
          </Box>

          {/* SUPPLIED BY — the supplier's name under its own label. */}
          <Box sx={{ mt: 0.6 }}>
            <Typography
              sx={{
                fontSize: "0.5rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                lineHeight: 1,
                mb: 0.25,
              }}
            >
              Supplied By
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                fontWeight: 700,
                color: colors.textPrimary,
                textTransform: "uppercase",
                lineHeight: 1.05,
                wordBreak: "break-word",
              }}
            >
              {item?.strSupplierNickName ||
                p?.supplier?.strSupplierNickName ||
                p?.supplier?.strSupplierName ||
                "—"}
            </Typography>
          </Box>
        </Box>

        {/* ── COLUMN 3 — when the batch came in and when it went out ── */}
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: 230 },
            pl: { xs: 0, sm: 2 },
            borderLeft: { xs: "none", sm: `1px solid ${colors.borderRow}` },
          }}
        >
          {[
            {
              label: "Received Date",
              // The batch's own log — the day it was booked in.
              value: fmtDateTime(item?.dtLog),
            },
            {
              // A batch that already went out is DELIVERED, not "to be
              // delivered" — the label follows what happened to it.
              label:
                statusKind === "delivered" ? "Delivered Date" : "Delivery Date",
              // A delivered batch is dated by its Delivered Items JEV (the
              // day it left); a batch still waiting shows the scheduled
              // delivery date, falling back to its own log when the
              // transaction carries none.
              value: fmtLocalDateTime(
                deliveredDate ??
                  p?.transaction_item?.transaction?.dtDelivery ??
                  item?.dtLog,
              ),
            },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ mb: 0.6 }}>
              <Typography
                sx={{
                  fontSize: "0.5rem",
                  fontWeight: 700,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  lineHeight: 1,
                  mb: 0.25,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ── Main Panel ──────────────────────────────────────────────────────────────
export default function InventoryDetailsPanel({
  item,
  inventoryDeliveredKey,
  inventoryPendingKey,
  inventoryCancelledKey,
  inventoryReceivedLabel,
  inventoryDeliveredLabel,
  inventoryPendingLabel,
  inventoryCancelledLabel,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // Label maps for the JEV header strip (type + status come from the
  // shared mappings, not from this page's inventory statuses).
  const { jev_types, jev_status, jevPendingKey } = useKeysLabels();

  const [serialNumbers, setSerialNumbers] = useState([]);

  // ── The item's Journal Entry Voucher(s) ────────────────────────────
  // nJEVId is stamped on each inventory row when its JEV is created —
  // 'R' (Received Purchases) for received batches, 'D' (Delivered Items)
  // for delivered ones. A Delivered row also came in through the
  // purchase's 'R' JEV, so the API lists EVERY distinct JEV of the whole
  // purchase item in nJEVIds (received first, delivered after); nJEVId
  // stays the first row's own id as a fallback. Only the headers are
  // shown here; the entries panel stays on the Pending group view.
  const jevIdsKey = useMemo(() => {
    const ids = Array.isArray(item?.nJEVIds) ? item.nJEVIds : [];
    const list = ids.length ? ids : item?.nJEVId != null ? [item.nJEVId] : [];
    return [
      ...new Set(list.filter((id) => id != null).map(String)),
    ].join(",");
  }, [item]);

  const [jevs, setJevs] = useState([]);
  const [jevLoading, setJevLoading] = useState(false);

  useEffect(() => {
    if (!jevIdsKey) {
      setJevs([]);
      setJevLoading(false);
      return;
    }
    const ids = jevIdsKey.split(",");
    let alive = true;
    setJevs([]); // never show the previous item's JEVs
    setJevLoading(true);
    Promise.all(
      ids.map((id) =>
        JevAPI.getById(id).catch((err) => {
          console.error(`Failed to fetch JEV ${id}:`, err);
          return null;
        }),
      ),
    )
      .then((list) => {
        if (alive)
          setJevs(list.filter((j) => j && typeof j === "object" && !j.message));
      })
      .finally(() => {
        if (alive) setJevLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [jevIdsKey]);

  // ✅ Determine status → pick accent from local map
  const statusKind =
    item?.cStatus === inventoryDeliveredKey
      ? "delivered"
      : item?.cStatus === inventoryPendingKey
        ? "pending"
        : item?.cStatus === inventoryCancelledKey
          ? "cancelled"
          : "received";

  const STATUS_LABELS = {
    received: inventoryReceivedLabel,
    delivered: inventoryDeliveredLabel,
    pending: inventoryPendingLabel,
    cancelled: inventoryCancelledLabel,
  };
  const accent = {
    ...colors[statusKind],
    label: STATUS_LABELS[statusKind] || "",
  };

  useEffect(() => {
    if (!item) {
      setSerialNumbers([]);
      return;
    }
    setSerialNumbers((item.serialNumbers || []).filter(Boolean));
  }, [item]);

  // ── JEV viewer ─────────────────────────────────────────────────────
  // The JEVs of this item are shown with the shared JevViewPanel: its own
  // header (number · type · status · triangle) and the From / To entries
  // under it, read-only — the entry form lives on the Pending group view.

  // WHEN the batch went OUT. A delivered batch's own log still says when it
  // was booked in, so the day it left comes from its Delivered Items JEV
  // — otherwise both dates would read the same day.
  const deliveredDate = useMemo(() => {
    if (statusKind !== "delivered") return null;
    const deliveryJev = jevs.find(
      (j) => String(j?.cJEVLinkType ?? "").toUpperCase() === "D",
    );
    return deliveryJev?.dtOccur ?? item?.dtLog ?? null;
  }, [statusKind, jevs, item]);

  if (!item) return null;

  // No frame / header of its own — the page layout header (title + subtitle)
  // carries the context, and the content runs full width like every other
  // section of the page (no card inset, no centering).
  return (
    <Box>
      <DarkSummary
        item={item}
        accent={accent}
        colors={colors}
        statusKind={statusKind}
        deliveredDate={deliveredDate}
      />

      <SerialSection
        title={`${accent.label} Serial Numbers`}
        serials={serialNumbers}
        accent={accent}
        emptyText="No serial numbers recorded."
        icon={
          statusKind === "delivered" ? (
            <OutputOutlined sx={{ fontSize: "0.75rem" }} />
          ) : (
            <MoveToInboxOutlined sx={{ fontSize: "0.75rem" }} />
          )
        }
        colors={colors}
      />

      {/* JOURNAL ENTRY VOUCHER — the shared panel: its own header (number ·
          type · status · triangle) and the From / To entries under it.
          A Delivered item lists its Received Purchases JEV AND its
          Delivered Items JEV, one panel each. */}
      {jevs.length > 0 ? (
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}
        >
          {jevs.map((j) => (
            <JevViewPanel
              key={j.nJEVId ?? j.strJEVNumber}
              // entries stripped so the panel reloads them with the full
              // journal-account paths
              jev={{ ...j, entries: undefined }}
              jev_types={jev_types}
              jev_status={jev_status}
              jevPendingKey={jevPendingKey}
              // this screen only SHOWS the journal — the entry form lives
              // on the Pending group view
              readOnly
              // folded away by default: the header alone identifies the
              // journal here, the entries open on demand
              defaultOpen={false}
            />
          ))}
        </Box>
      ) : (
        <JevEmptyBox
          colors={colors}
          message={
            jevLoading
              ? "Loading Journal Entry Voucher…"
              : "No Journal Entry Voucher linked to this item."
          }
        />
      )}
    </Box>
  );
}
