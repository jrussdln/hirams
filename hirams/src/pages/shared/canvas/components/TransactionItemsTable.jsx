import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  Add,
  AutoAwesome,
  ListAlt,
} from "@mui/icons-material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Edit, Delete } from "@mui/icons-material";
import BaseButton from "../../../../components/ui/form/BaseButton";
import DataTable from "../../../../components/ui/form/DataTable";
import DotSpinner from "../../../../components/ui/loader/DotSpinner";
import PurchaseOptionRow from "./PurchaseOptionsRow";
import CompareView from "./CompareView";
import { TransactionItemsTableSkeleton } from "./Skeleton";
import CollectionPaymentDetails from "../../collection/components/CollectionPaymentDetails";
import MiniBaseButton from "../../../../components/ui/form/MiniBaseButton";
import useKeysLabels from "../../../../hooks/useKeysLabels";
import useMapping from "../../../../hooks/useMapping";
import {
  getOptionStep,
  MAX_STEP,
} from "../../../../utils/helpers/purchaseProgress";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import ContentHeaderStructure from "../../../../components/ui/structure/ContentHeaderStructure";
import CardStructure from "../../../../components/ui/structure/CardStructure";
import {
  fmtPHP,
  fmtDate,
  fmtQty,
} from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";
import ProgressBar from "../../../../components/ui/form/ProgressBar";
import {
  NO_TRANSACTION_ABC,
  OPEN_DATE,
} from "../../../../constants/tableDataFallbacks";
// ─────────────────────────────────────────────────────────────────
// INLINE COLOR MAP — per-file useColors pattern (PROMPT 1)
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  primaryMain: c.blue.textStrong,
  primaryContrastText: c.gray.textOnFill,
  successMain: c.green.text,
  dangerMain: c.red.text,
  divider: c.slate.divider,
  borderLight: c.slate.border,
  headerBg: c.blue.active,
  headerText: c.blue.headerText,
  headerBorder: c.blue.border,
  contentBg: c.blue.bgSoft,
  contentText: c.gray.textPrimary,
  // Specs — now plain/neutral, no accent color
  specsHeaderBg: c.slate.mutedBg,
  specsHeaderBorder: c.slate.mutedBorder,
  specsHeaderText: c.gray.textPrimary,
  specsContentBg: c.slate.outerBg,
  specsContentText: c.gray.textSecondary,
  accentBorder: c.blue.borderStrong,
  accentBorderSoft: c.blue.bg,
  badgeBg: c.blue.bgSoft,
  badgeBorder: c.blue.border,
  badgeText: c.blue.text,
  infoBadgeBg: c.blue.bgSoft,
  infoBadgeBorder: c.slate.border,
  infoBadgeText: c.blue.textStrong,
  subHeaderBg: c.slate.itemHeaderBg,
  subHeaderBorder: c.slate.border,
  panelBg: c.slate.outerBg,
  cardBg: c.slate.cardGlass,
  textSecondary: c.gray.textSecondary,
  textPrimary: c.gray.textPrimary,
  // purchase-mode additions
  successColor: c.green.text,
  warnColor: c.amber.textDark,
  progressTrack: c.slate.mutedBg,
  progressGradientDone: c.green.progressGradient,
  progressGradientActive: c.blue.progressGradient,
  progressTextDone: c.green.text,
  progressTextActive: c.blue.text,
  circleTrack: c.slate.mutedBg,
  circleActive: c.blue.text,
  circleDone: c.green.text,
  balanceLabel: c.gray.textDisabled,
  balanceDivider: c.slate.divider,
  collectibleBg: c.green.bgSoft,
  collectibleBorder: c.green.border,
  collectibleText: c.green.textStrong,
  ratioDoneBg: c.green.bg,
  ratioDoneBorder: c.green.border,
  ratioDoneText: c.green.textDark,
  ratioPendingBg: c.blue.bg,
  ratioPendingBorder: c.blue.border,
  ratioPendingText: c.blue.textStrong,
  actionBtnActiveBg: c.blue.active,
  actionBtnActiveText: c.blue.textStrong,
});
/* ─── Shared inline button style — THEMED ─────────────────────────── */
const inlineBtnSx = (colors, baseBg, active) => ({
  fontSize: "0.7rem",
  backgroundColor: active
    ? colors.actionBtnActiveBg
    : (baseBg ?? colors.panelBg),
  border: `1px solid ${colors.divider}`,
  cursor: "pointer",
  color: active ? colors.actionBtnActiveText : colors.badgeText,
  fontWeight: 500,
  borderRadius: "6px",
  padding: "1px 6px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

/* ─── Status color palettes — THEMED ──────────────────────────────── */
const STAT_STYLES = (c) => ({
  default: {
    border: c.blue.border,
    label: c.blue.text,
    value: c.blue.textStrong,
    sub: c.blue.text,
  },
  warn: {
    border: c.amber.border,
    label: c.amber.text,
    value: c.amber.textDark,
    sub: c.amber.text,
  },
  danger: {
    border: c.red.border,
    label: c.red.text,
    value: c.red.textDark,
    sub: c.red.text,
  },
  info: {
    border: c.teal.border,
    label: c.teal.text,
    value: c.teal.textStrong,
    sub: c.teal.text,
  },
});

const StatCard = ({ icon, label, value, sub, variant = "default" }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = getThemeColors(isDark);
  const colors = useColors(c);
  const s = STAT_STYLES(c)[variant] ?? STAT_STYLES(c).default;

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        background: colors.cardBg,
        border: `0.5px solid ${s.border}`,
        borderRadius: "7px",
        px: 1.25,
        py: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        {React.cloneElement(icon, { sx: { fontSize: 12, color: s.label } })}
        <Typography
          sx={{
            fontSize: "0.65rem",
            fontWeight: 500,
            color: s.label,
            letterSpacing: "0.03em",
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: s.value,
          lineHeight: 1.2,
          textAlign: "left",
          ml: 2,
          position: "relative",
          zIndex: 1,
        }}
      >
        {value || "—"}
      </Typography>
      {sub && (
        <Typography
          sx={{
            fontSize: "0.65rem",
            color: s.sub,
            opacity: 0.85,
            lineHeight: 1,
            textAlign: "left",
            ml: 2,
            position: "relative",
            zIndex: 1,
          }}
        >
          {sub}
        </Typography>
      )}
      <Box
        sx={{
          position: "absolute",
          right: -6,
          bottom: -6,
          width: 54,
          height: 54,
          opacity: isDark ? 0.12 : 0.09,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 84, color: s.label } })}
      </Box>
    </Box>
  );
};

function PurchaseCircularProgress({ value, balance, colors }) {
  const done = value >= 100;
  const r = 54,
    circ = 2 * Math.PI * r,
    offset = circ - (value / 100) * circ;
  return (
    <Box
      sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1.5 }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 0.3,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.52rem",
            fontWeight: 600,
            color: colors.balanceLabel,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1,
          }}
        >
          Balance
        </Typography>
        <Typography
          sx={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: balance === 0 ? colors.successColor : colors.warnColor,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {balance === 0 ? "₱ 00.00" : `₱ ${fmtPHP(balance)}`}
        </Typography>
        <Box
          sx={{
            width: "100%",
            height: "1px",
            background: colors.balanceDivider,
            mt: 0.2,
          }}
        />
        <Typography
          sx={{
            fontSize: "0.52rem",
            color: colors.balanceLabel,
            lineHeight: 1,
          }}
        >
          unpaid total
        </Typography>
      </Box>
      <svg width="52" height="52" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={colors.circleTrack}
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={done ? colors.circleDone : colors.circleActive}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }}
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="700"
          fill={done ? colors.circleDone : colors.circleActive}
        >
          {value.toFixed(2)}%
        </text>
      </svg>
    </Box>
  );
}

function CollectibleValue({ value, colors }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 0.3,
        px: 1.5,
        py: 1,
        borderRadius: "10px",
        background: colors.collectibleBg,
        border: `0.5px solid ${colors.collectibleBorder}`,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.52rem",
          fontWeight: 600,
          color: colors.collectibleText,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        Collectible Value
      </Typography>
      <Typography
        sx={{
          fontSize: "0.95rem",
          fontWeight: 800,
          color: colors.collectibleText,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        ₱ {fmtPHP(value)}
      </Typography>
    </Box>
  );
}

/* ─── Drag-and-drop row wrapper ─────────────────────────────────── */
const SortableWrapper = ({ id, children, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: disabled ? "default" : "grab",
      }}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   TRANSACTION ITEMS TABLE — mode: "canvas" (default) | "purchase"
══════════════════════════════════════════════════════════════════ */
function TransactionItemsTable({
  items,
  itemsLoading,
  expandedRows,
  expandedOptions,
  optionErrors,
  compareData,
  isCompareActive,
  crudItemsEnabled,
  showAddButton,
  showPurchaseOptions,
  checkboxOptionsEnabled,
  anyItemHasABC,
  statusChangedAlert,
  isManagement,
  isAccountOfficer,
  isAOTL,
  suppliers,
  cItemType,
  currentStatusLabel,
  transaction,
  transactionCode,
  getEffectiveABC,
  handleDragEnd,
  handleCollapseAllToggle,
  toggleSpecsRow,
  toggleOptionsRow,
  toggleOptionSpecs,
  handleToggleInclude,
  handleCompareClick,
  setEditingItem,
  setAddingNewItem,
  setEntityToDelete,
  setSuggestionsItem,
  setIsSuggestionsModalOpen,
  setEditingOption,
  setOptionModalItemId,
  setOptionModalItem,
  setExpandedRows,
  forCanvasKey,
  transactionHasABC,
  abcValue,
  abcSub,
  abcValidation,
  totalCanvas,
  totalABC,
  getDueDateVariant = () => "default",
  onSpecsChange,
  onOptionSpecsChange,
  readOnly = false,
  // mode + purchase-only props
  mode = "canvas",
  forCollection = false,
  totalPurchaseProgress,
  totalPurchaseBalance,
  totalCollectibleValue = 0,
  optionStatuses = {},
  latestHistories = {},
  onRefreshOptionData,
  currentUserId,
  isAssignedToMe,
  isProcurement,
  isProcurementTL,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(c), [c]);
  const navigate = useNavigate();
  const isPurchase = mode === "purchase";

  // ── Assigned Account Officer (badge beside the transaction code) ─────────
  const aoUser = transaction?.user;
  const aoNickName = (
    aoUser?.strNickName ||
    transaction?.aoName ||
    ""
  )
    .toString()
    .trim();
  const aoFullName = (
    aoUser?.strFName ||
    aoUser?.strLName ||
    aoNickName ||
    ""
  )
    .toString()
    .trim();

  // ── Client label — nickname only ("6105D") ───────────────────────────────
  const clientLabel = (
    transaction?.client?.strClientNickName ||
    transaction?.clientName ||
    ""
  ).trim();
  const {
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,
  } = useKeysLabels();
  // The EWT TYPES (the per-line bypass of the default EWT formula) — the
  // rows print the type under the EWT amount.
  const { ewtBypassType, unitPriceStatus } = useMapping();

  // The letter that means "Pending" in the purchase price status — a
  // price request that does not count yet. The option rows need it.
  const pendingStatusLetter =
    Object.entries(unitPriceStatus || {}).find(
      ([, label]) => label === "Pending",
    )?.[0] ?? "P";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [chosenOnlyMap, setChosenOnlyMap] = useState({});
  const isChosenOnly = (id) => chosenOnlyMap[id] ?? true;
  const toggleChosenOnly = (id) =>
    setChosenOnlyMap((p) => ({ ...p, [id]: !isChosenOnly(id) }));

  const isAnythingExpanded = Object.values(expandedRows).some(
    (r) => r?.specs || r?.options,
  );

  // ── Per-item purchase progress ─────────────────────────────────────────
  // ONE source of truth for the row's Progress bar. The Get Suggestions /
  // + Option buttons are NOT gated on it any more — an item's options can
  // always grow, even when it is already fully covered.
  const getItemProgress = (item) => {
    let num = 0,
      den = 0;
    (item.purchaseOptions || [])
      .filter((o) => Number(o.bPurchaseIncluded) === 1)
      .forEach((o) => {
        const step = getOptionStep(optionStatuses[o.nPurchaseItemId], o, {
          cartKey,
          forApprovalKey,
          forPaymentKey,
          pendingReceiptKey,
          forDeliveryKey,
          deliveredKey,
        });
        const qty = Number(o.nQuantity || 0);
        num += qty * step;
        den += qty * MAX_STEP; // was: qty * 5
      });
    return den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;
  };

  const qtyXs =
    crudItemsEnabled && !showPurchaseOptions ? 3 : showPurchaseOptions ? 2 : 4;
  const showActionColumn =
    crudItemsEnabled || showPurchaseOptions || isManagement;

  // ⚠️ MUI <Grid container> moves a cell to a SECOND ROW whenever a row's xs
  // values exceed 12, so every branch below must total exactly 12.
  // Canvas (non-purchase) row = desc + qty + [abc:3] + [action:1]
  const descXs = showPurchaseOptions
    ? anyItemHasABC
      ? 3
      : 7
    : 12 - qtyXs - (anyItemHasABC ? 3 : 0) - (showActionColumn ? 1 : 0);

  const descColumn = {
    key: "desc",
    label: "Description",
    xs: isPurchase ? 5 : descXs,
    headerAlign: "center",
    cellSxExtra: { pl: 1.5 },
    render: (item) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
        }}
      >
        <Typography
          fontWeight={500}
          sx={{
            fontSize: ".70rem",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexGrow: 1,
          }}
        >
          <Box component="span" sx={{ fontWeight: 600 }}>
            {item.nItemNumber}.
          </Box>{" "}
          {item.name || "—"}
        </Typography>
        <Box
          sx={{ flexShrink: 0, mr: 3, display: "flex", alignItems: "center" }}
        >
          <Box
            component="button"
            title="Specs"
            onClick={(e) => {
              e.stopPropagation();
              toggleSpecsRow(item.id);
            }}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 0.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowDropDownIcon
              sx={{
                transform: expandedRows[item.id]?.specs
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
                fontSize: "1.2rem",
                color: colors.textSecondary,
              }}
            />
          </Box>
        </Box>
      </Box>
    ),
  };

  /* ── Canvas-mode columns (ABC / balance-vs-ABC) ── */
  const canvasColumns = [
    descColumn,
    {
      key: "qty",
      label: "Quantity",
      xs: qtyXs,
      align: "center",
      render: (item) => {
        const includedQty = item.purchaseOptions
          .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
          .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
        const isFilled =
          showPurchaseOptions &&
          Number(includedQty) === Number(item.qty || 0) &&
          Number(item.qty) > 0;
        return (
          <Typography
            sx={{
              fontSize: ".7rem",
              lineHeight: 1.3,
              textAlign: "center",
              width: "100%",
              color: isFilled ? colors.successMain : "inherit",
              fontWeight: isFilled ? 700 : 400,
            }}
          >
            {showPurchaseOptions && `${fmtQty(includedQty)} / `}
            {fmtQty(item.qty)}
            <br />
            <span
              style={{
                fontSize: "0.65rem",
                color: isFilled ? colors.successMain : colors.textSecondary,
                opacity: isDark ? 0.7 : 0.6,
              }}
            >
              {item.uom}
            </span>
          </Typography>
        );
      },
    },
    ...(showPurchaseOptions
      ? [
          {
            key: "canvas",
            label: "Canvas",
            xs: 2,
            align: "right",
            render: (item) => {
              const tot = item.purchaseOptions
                .filter((o) => o.bIncluded)
                .reduce(
                  (s, o) =>
                    s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
                  0,
                );
              return (
                <Typography sx={{ fontSize: ".7rem", lineHeight: 1.2 }}>
                  ₱ {fmtPHP(tot)}
                </Typography>
              );
            },
          },
        ]
      : []),
    ...(anyItemHasABC
      ? [
          {
            key: "abc",
            label: "ABC",
            xs: showPurchaseOptions ? 2 : 3,
            align: "right",
            render: (item) => {
              const tot = item.purchaseOptions
                .filter((o) => o.bIncluded)
                .reduce(
                  (s, o) =>
                    s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
                  0,
                );
              const effectiveABC = getEffectiveABC(item);
              const isOver = tot > effectiveABC && effectiveABC > 0;
              return (
                <Typography
                  sx={{
                    fontSize: ".7rem",
                    lineHeight: 1.2,
                    color: isOver ? colors.dangerMain : "inherit",
                    fontWeight: isOver ? 700 : 400,
                  }}
                >
                  ₱ {fmtPHP(item.abc)}
                </Typography>
              );
            },
          },
        ]
      : []),
    ...(showPurchaseOptions && anyItemHasABC
      ? [
          {
            key: "balance",
            label: "Balance",
            xs: 2,
            align: "right",
            render: (item) => {
              const tot = item.purchaseOptions
                .filter((o) => o.bIncluded)
                .reduce(
                  (s, o) =>
                    s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
                  0,
                );
              const balance = getEffectiveABC(item) - tot;
              const isNegative = balance < 0;
              return (
                <Typography
                  sx={{
                    fontSize: ".7rem",
                    lineHeight: 1.2,
                    color: isNegative ? colors.dangerMain : "inherit",
                    fontWeight: isNegative ? 700 : 400,
                  }}
                >
                  ₱ {fmtPHP(balance)}
                </Typography>
              );
            },
          },
        ]
      : []),
    ...(crudItemsEnabled || showPurchaseOptions || isManagement
      ? [
          {
            key: "action",
            label: "Action",
            xs: 1,
            align: "center",
            hideBorder: true,
            render: (item) => (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 0.25,
                }}
              >
                {(crudItemsEnabled ||
                  isManagement ||
                  isAccountOfficer ||
                  isAOTL) && (
                  <BaseButton
                    icon={<Edit sx={{ fontSize: "0.9rem" }} />}
                    tooltip="Edit"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem(item);
                      setAddingNewItem(true);
                    }}
                    disabled={statusChangedAlert}
                  />
                )}
                {crudItemsEnabled && (
                  <BaseButton
                    icon={<Delete sx={{ fontSize: "0.9rem" }} />}
                    tooltip="Delete"
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEntityToDelete({ type: "item", data: item });
                    }}
                    disabled={statusChangedAlert}
                  />
                )}
                {showPurchaseOptions && (
                  <IconButton
                    size="small"
                    sx={{ position: "relative" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOptionsRow(item.id);
                    }}
                  >
                    <ArrowDropDownIcon
                      sx={{
                        transform: expandedRows[item.id]?.options
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                        fontSize: "1.4rem",
                        color: colors.textSecondary,
                      }}
                    />
                    {item.purchaseOptions.length > 0 &&
                      !expandedRows[item.id]?.options && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: "1px",
                            right: "-3px",
                            backgroundColor: colors.badgeBg,
                            color: colors.badgeText,
                            width: "14px",
                            height: "14px",
                            fontSize: "0.50rem",
                            borderRadius: "50%",
                            border: `1px solid ${colors.badgeBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2,
                            fontWeight: 600,
                          }}
                        >
                          {item.purchaseOptions.length}
                        </Box>
                      )}
                  </IconButton>
                )}
              </Box>
            ),
          },
        ]
      : []),
  ];

  /* ── Purchase-mode columns (Progress / unpaid balance) ── */
  const purchaseColumns = [
    descColumn,
    {
      key: "progress",
      label: "Progress",
      xs: 4,
      align: "center",
      render: (item) => <ProgressBar value={getItemProgress(item)} />,
    },
    {
      key: "balance",
      label: "Balance",
      xs: 2,
      align: "right",
      render: (item) => {
        const paidStatuses = [
          String(pendingReceiptKey),
          String(forDeliveryKey),
          String(deliveredKey),
        ];
        const hasPurchaseIncluded = (item.purchaseOptions || []).some(
          (o) => Number(o.bPurchaseIncluded) === 1,
        );
        const unpaid = (item.purchaseOptions || [])
          .filter((o) => {
            const included = hasPurchaseIncluded
              ? Number(o.bPurchaseIncluded) === 1
              : Number(o.bIncluded) === 1;
            if (!included || Number(o.bAddOn) === 1) return false;
            const ordered = Number(o.nQuantity || 0);
            const deliveredQty = Number(o.nDeliveredQty || 0);
            if (ordered > 0 && deliveredQty >= ordered) return false;
            const s = optionStatuses[o.nPurchaseItemId];
            return s == null || !paidStatuses.includes(String(s));
          })
          .reduce(
            (sum, o) =>
              sum + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
            0,
          );
        return (
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: unpaid === 0 ? colors.successColor : colors.warnColor,
              textAlign: "center",
            }}
          >
            {unpaid === 0 ? "₱ 00.00" : `₱ ${fmtPHP(unpaid)}`}
          </Typography>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      xs: 1,
      align: "center",
      hideBorder: true,
      render: (item) =>
        showPurchaseOptions ? (
          <IconButton
            size="small"
            sx={{ position: "relative" }}
            onClick={(e) => {
              e.stopPropagation();
              toggleOptionsRow(item.id);
            }}
          >
            <ArrowDropDownIcon
              sx={{
                transform: expandedRows[item.id]?.options
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s",
                fontSize: "1.4rem",
                color: colors.textSecondary,
              }}
            />
            {item.purchaseOptions.length > 0 &&
              !expandedRows[item.id]?.options && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "1px",
                    right: "-3px",
                    backgroundColor: colors.badgeBg,
                    color: colors.badgeText,
                    width: "14px",
                    height: "14px",
                    fontSize: "0.50rem",
                    borderRadius: "50%",
                    border: `1px solid ${colors.badgeBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    fontWeight: 600,
                  }}
                >
                  {item.purchaseOptions.length}
                </Box>
              )}
          </IconButton>
        ) : null,
    },
  ];

  const activeColumns = isPurchase ? purchaseColumns : canvasColumns;

  const getRowSx = () => ({ borderLeft: `4px solid ${colors.primaryMain}` });

  /* ── Row wrapper (specs + options panels) ── */
  const wrapRow = (item, rowIndex, paperNode, isLastRow) => {
    const isSpecsOpen = !!expandedRows[item.id]?.specs;
    const isOptionsOpen = !!expandedRows[item.id]?.options;
    const isExpanded = isSpecsOpen || isOptionsOpen;
    const prevItem = rowIndex > 0 ? items[rowIndex - 1] : null;
    const prevExpanded = prevItem
      ? !!(
          expandedRows[prevItem.id]?.specs || expandedRows[prevItem.id]?.options
        )
      : false;

    const visibleOptions =
      isPurchase && isChosenOnly(item.id)
        ? item.purchaseOptions.filter(
            (o) =>
              Number(o.bPurchaseIncluded) === 1 || Number(o.bIncluded) === 1,
          )
        : item.purchaseOptions;

    const includedQty = item.purchaseOptions
      .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
      .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
    const purchasedQty = item.purchaseOptions
      .filter((o) => o.bPurchaseIncluded && Number(o.bAddOn) !== 1)
      .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
    const totalQty = Number(item.qty || 0);
    const isRatioDone = purchasedQty >= totalQty && totalQty > 0;

    const anyProgressed =
      isPurchase &&
      item.purchaseOptions.some((o) => {
        const s = latestHistories[o.nPurchaseItemId]?.nStatus;
        return (
          s &&
          [
            String(forApprovalKey),
            String(forPaymentKey),
            String(pendingReceiptKey),
            String(forDeliveryKey),
            String(deliveredKey),
          ].includes(String(s))
        );
      });

    return (
      <SortableWrapper id={item.id} disabled={!crudItemsEnabled || isSpecsOpen}>
        <>
          <Box
            sx={{
              ...(prevExpanded && {
                mt: 0.5,
                "& > .MuiPaper-root": {
                  borderTop: `2px solid ${colors.divider} !important`,
                },
              }),
              ...(isLastRow && !isExpanded
                ? {
                    "& > .MuiPaper-root": {
                      borderBottomLeftRadius: "10px !important",
                      borderBottomRightRadius: "10px !important",
                    },
                  }
                : isLastRow && isExpanded
                  ? {
                      "& > .MuiPaper-root": {
                        borderBottomLeftRadius: "0px !important",
                        borderBottomRightRadius: "0px !important",
                      },
                    }
                  : undefined),
            }}
          >
            {paperNode}
          </Box>

          {isSpecsOpen && (
            <Box
              sx={{
                position: "relative",
                height: 0,
                overflow: "visible",
                ml: "16px",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  overflow: "visible",
                  pointerEvents: "none",
                }}
                width="160"
                height="20"
              >
                <line
                  x1="12"
                  y1="0"
                  x2="12"
                  y2="16"
                  stroke={colors.divider}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="22"
                  y2="16"
                  stroke={colors.divider}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Box>
          )}

          {isSpecsOpen && (
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${colors.borderLight}`,
                borderTop: "none",
                borderLeft: `4px solid ${colors.specsHeaderBorder}`,
                overflow: "hidden",
                borderRadius: 0,
                ...(isLastRow &&
                  !isOptionsOpen && {
                    borderBottomLeftRadius: "10px",
                    borderBottomRightRadius: "10px",
                  }),
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  pl: 5,
                  backgroundColor: colors.specsHeaderBg,
                  borderBottom: `1px solid ${colors.specsHeaderBorder}`,
                  color: colors.specsHeaderText,
                  fontWeight: 600,
                  fontSize: "0.60rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => toggleSpecsRow(item.id)}
              >
                <span>Specifications</span>
                <MiniBaseButton
                  icon={<ExpandLess />}
                  label="Hide"
                  variant="blue"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSpecsRow(item.id);
                  }}
                />
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 1.2,
                  pl: 7,
                  maxHeight: 100,
                  overflowY: "auto",
                  backgroundColor: colors.specsContentBg,
                  color: colors.specsContentText,
                  fontSize: "0.7rem",
                  "& *": { backgroundColor: "transparent !important" },
                  "& ul": { paddingLeft: 2, margin: 0, listStyleType: "disc" },
                  "& ol": {
                    paddingLeft: 2,
                    margin: 0,
                    listStyleType: "decimal",
                  },
                  "& li": { marginBottom: 0.25 },
                  wordBreak: "break-word",
                }}
                dangerouslySetInnerHTML={{
                  __html: item.specs || "No data available.",
                }}
              />
            </Paper>
          )}
          {isOptionsOpen && (
            <Box
              sx={{
                position: "relative",
                height: 0,
                overflow: "visible",
                ml: "10px",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  overflow: "visible",
                  pointerEvents: "none",
                }}
                width="160"
                height="20"
              >
                <line
                  x1="12"
                  y1="0"
                  x2="12"
                  y2="16"
                  stroke={colors.divider}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="27"
                  y2="16"
                  stroke={colors.divider}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Box>
          )}

          {isOptionsOpen && (
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${colors.borderLight}`,
                borderTop: "none",
                borderLeft: `4px solid ${colors.accentBorder}`,
                background: colors.panelBg,
                overflow: "hidden",
                borderRadius: 0,
                ...(isLastRow && {
                  borderBottomLeftRadius: "10px",
                  borderBottomRightRadius: "10px",
                }),
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  pl: 5,
                  backgroundColor: colors.specsHeaderBg,
                  borderBottom: `1px solid ${colors.specsHeaderBorder}`,
                  color: colors.specsHeaderText,
                  fontWeight: 600,
                  fontSize: "0.60rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => toggleOptionsRow(item.id)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>Purchase Options</span>
                  {isPurchase && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        px: 0.8,
                        py: 0.15,
                        borderRadius: "5px",
                        border: `0.5px solid ${isRatioDone ? colors.ratioDoneBorder : colors.ratioPendingBorder}`,
                        background: isRatioDone
                          ? colors.ratioDoneBg
                          : colors.ratioPendingBg,
                        color: isRatioDone
                          ? colors.ratioDoneText
                          : colors.ratioPendingText,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtQty(purchasedQty)} / {fmtQty(totalQty)}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {/* The two buttons stay available in the PURCHASE stage
                      even when the item is fully covered (12 / 12) or an
                      add-on was just added — the options of an item can
                      always grow. Only a read-only view or a status change
                      (the transaction moved on) hides them. */}
                  {(checkboxOptionsEnabled || isPurchase) &&
                    !statusChangedAlert &&
                    !readOnly &&
                    (() => {
                      const remainingQty = totalQty - includedQty;
                      return (
                        <>
                          <MiniBaseButton
                            icon={<AutoAwesome />}
                            label="Get Suggestions"
                            variant="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSuggestionsItem(item);
                              setIsSuggestionsModalOpen(true);
                            }}
                          />
                          <MiniBaseButton
                            icon={<Add />}
                            label="Option"
                            variant="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOption(null);
                              setOptionModalItemId(item.id);
                              setOptionModalItem({ ...item, remainingQty });
                            }}
                          />
                        </>
                      );
                    })()}
                  {isPurchase && (
                    <MiniBaseButton
                      icon={<ListAlt />}
                      label={isChosenOnly(item.id) ? "Show all" : "Chosen only"}
                      variant="blue"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChosenOnly(item.id);
                      }}
                    />
                  )}
                  <MiniBaseButton
                    icon={<ExpandLess />}
                    label="Hide"
                    variant="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOptionsRow(item.id);
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  px: 1.2,
                  py: 0.7,
                  display: "flex",
                  background: colors.subHeaderBg,
                  fontSize: "0.72rem",
                  borderBottom: `1px solid ${colors.subHeaderBorder}`,
                  fontWeight: 600,
                  color: colors.textPrimary,
                }}
              >
                {(isPurchase
                  ? [
                      ["Supplier", 2],
                      ["Brand/Model", 2],
                      ["Quantity", 1],
                      ["Unit Price", 2],
                      ["Total", 2],
                      ["EWT", 1.5],
                    ]
                  : [
                      ["Supplier", 2.5],
                      ["Brand/Model", 2],
                      ["Quantity", 1],
                      ["Unit Price", 1.5],
                      ["Total", 1.5],
                      ["EWT", 1.5],
                    ]
                ).map(([h, flex]) => (
                  <Box key={h} sx={{ flex, textAlign: "center" }}>
                    {h}
                  </Box>
                ))}
                {checkboxOptionsEnabled && (
                  <Box sx={{ flex: 1, textAlign: "center" }}>Action</Box>
                )}
              </Box>
              {item.optionsLoading ? (
                <Box
                  sx={{
                    py: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <DotSpinner />
                </Box>
              ) : item.purchaseOptions.length === 0 ? (
                <Box
                  sx={{
                    py: 1,
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: colors.textSecondary,
                    fontStyle: "italic",
                  }}
                >
                  No options available.
                </Box>
              ) : (
                visibleOptions.map((option, index) => {
                  const hasNoRegularOptions = visibleOptions.every(
                    (o) => Number(o.bAddOn) === 1,
                  );
                  const isFirstAddOn =
                    Number(option.bAddOn) === 1 &&
                    (index === 0 ||
                      Number(visibleOptions[index - 1].bAddOn) !== 1);
                  const displayIndex =
                    Number(option.bAddOn) === 1
                      ? visibleOptions
                          .slice(0, index)
                          .filter((o) => Number(o.bAddOn) === 1).length + 1
                      : visibleOptions
                          .slice(0, index)
                          .filter((o) => Number(o.bAddOn) !== 1).length + 1;

                  const latestStatus =
                    isPurchase && latestHistories[option.nPurchaseItemId]
                      ? String(latestHistories[option.nPurchaseItemId].nStatus)
                      : null;
                  const isInCart =
                    isPurchase && latestStatus === String(cartKey);
                  const hasPartialReceived =
                    isPurchase && Number(option.nInventoryQty || 0) > 0;
                  const hasPartialDelivered =
                    isPurchase && Number(option.nDeliveredQty || 0) > 0;
                  const isOptionProgressed =
                    isPurchase &&
                    ((latestStatus !== null &&
                      [
                        String(forApprovalKey),
                        String(forPaymentKey),
                        String(pendingReceiptKey),
                        String(forDeliveryKey),
                        String(deliveredKey),
                      ].includes(latestStatus)) ||
                      hasPartialReceived ||
                      hasPartialDelivered);

                  return (
                    <PurchaseOptionRow
                      key={option.id}
                      mode={mode}
                      option={option}
                      ewtTypeLabels={ewtBypassType}
                      pendingStatusLetter={pendingStatusLetter}
                      index={index}
                      displayIndex={displayIndex}
                      isLastOption={index === item.purchaseOptions.length - 1}
                      itemId={item.id}
                      item={item}
                      checkboxOptionsEnabled={checkboxOptionsEnabled}
                      expandedOptions={expandedOptions}
                      optionErrors={optionErrors}
                      onToggleInclude={handleToggleInclude}
                      onToggleOptionSpecs={toggleOptionSpecs}
                      onEditOption={(opt) => {
                        setEditingOption(opt);
                        setOptionModalItemId(opt.nTransactionItemId);
                        // The item comes along too — the modal needs to know
                        // whether the item's quantity is already filled by
                        // its selection (then the option can only be an
                        // add-on).
                        setOptionModalItem(item);
                      }}
                      onDeleteOption={(_id, opt) =>
                        setEntityToDelete({ type: "option", data: opt })
                      }
                      onCompareClick={handleCompareClick}
                      isManagement={isManagement}
                      isFirstAddOn={isFirstAddOn}
                      hasNoRegularOptions={hasNoRegularOptions}
                      statusChangedAlert={statusChangedAlert}
                      readOnly={readOnly}
                      currentUserId={currentUserId}
                      cancelledPOKey={cancelledPOKey}
                      cartKey={cartKey}
                      forApprovalKey={forApprovalKey}
                      forPaymentKey={forPaymentKey}
                      pendingReceiptKey={pendingReceiptKey}
                      forDeliveryKey={forDeliveryKey}
                      deliveredKey={deliveredKey}
                      removedFromCartKey={removedFromCartKey}
                      latestHistory={
                        isPurchase
                          ? (latestHistories[option.nPurchaseItemId] ?? null)
                          : null
                      }
                      onAddedToCart={(optionId) =>
                        onRefreshOptionData?.(undefined, optionId)
                      }
                      isProgressed={isOptionProgressed}
                      isInCart={isInCart}
                      isAssignedToMe={isAssignedToMe}
                      isProcurement={isProcurement}
                      isProcurementTL={isProcurementTL}
                    />
                  );
                })
              )}
            </Paper>
          )}
        </>
      </SortableWrapper>
    );
  };

  const content = (
    <>
      {!isCompareActive && (
        <ContentHeaderStructure p={1.5} mb={1}>
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: "520px" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: colors.textSecondary,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {transaction.strCode ||
                          transactionCode ||
                          transaction.transactionId ||
                          "—"}
                      </Typography>
                      {aoNickName && (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.3,
                            px: 0.8,
                            py: 0.15,
                            borderRadius: "50px",
                            background: colors.badgeBg,
                            border: `0.5px solid ${colors.badgeBorder}`,
                            flexShrink: 0,
                            minWidth: 0,
                          }}
                        >
                          <Tooltip
                            title={
                              aoFullName
                                ? `Account Officer: ${aoFullName}`
                                : "Account Officer"
                            }
                            arrow
                            placement="top"
                          >
                            <Typography
                              sx={{
                                fontSize: "0.6rem",
                                fontWeight: 600,
                                color: colors.badgeText,
                                textTransform: "uppercase",
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {aoNickName}
                            </Typography>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        textAlign: "left",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                        lineHeight: 1,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {clientLabel || "—"}
                    </Typography>
                    <Typography
                      sx={{
                        textAlign: "left",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                        color: colors.textPrimary,
                        lineHeight: 1,
                        mt: 0.15,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {transaction.strTitle ||
                        transaction.transactionName ||
                        "—"}
                    </Typography>
                  </Box>
                </Box>

                {isPurchase ? (
                  <PurchaseCircularProgress
                    value={totalPurchaseProgress ?? 0}
                    balance={totalPurchaseBalance ?? 0}
                    colors={colors}
                  />
                ) : null}
              </Box>

              {!isPurchase && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: showPurchaseOptions
                      ? "repeat(4, minmax(0,1fr))"
                      : "repeat(3, minmax(0,1fr))",
                    gap: "8px",
                    mt: 1.25,
                  }}
                >
                  <CardStructure
                    label={
                      transactionHasABC
                        ? "Total ABC (per item)"
                        : "Transaction ABC"
                    }
                    value={abcValue || NO_TRANSACTION_ABC}
                    sub={abcSub}
                    variant={abcValidation ? "danger" : "default"}
                    dense
                  />
                  {showPurchaseOptions && (
                    <CardStructure
                      label="Total Canvas"
                      value={`₱ ${fmtPHP(totalCanvas)}`}
                      sub={
                        transactionHasABC ||
                        items.some((i) => Number(i.abc) > 0)
                          ? `Balance: ₱ ${fmtPHP(totalABC - totalCanvas)}`
                          : null
                      }
                      variant={abcValidation ? "danger" : "default"}
                      dense
                    />
                  )}
                  <CardStructure
                    label="AO Due Date"
                    value={
                      transaction.dtAODueDate
                        ? fmtDate(transaction.dtAODueDate)
                        : OPEN_DATE
                    }
                    variant={getDueDateVariant(transaction.dtAODueDate)}
                    dense
                  />
                  <CardStructure
                    label="Document Submission"
                    value={
                      transaction.dtDocSubmission
                        ? fmtDate(transaction.dtDocSubmission)
                        : OPEN_DATE
                    }
                    variant={getDueDateVariant(transaction.dtDocSubmission)}
                    dense
                  />
                </Box>
              )}
            </Box>
          </Box>
        </ContentHeaderStructure>
      )}

      {!isCompareActive && (
        <Box
          sx={{
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,

              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <ListAlt sx={{ fontSize: "1rem" }} />
            Transaction Items
            {showPurchaseOptions && !isPurchase && (
              <Box
                component="span"
                sx={{
                  fontSize: "0.65rem",
                  background: colors.infoBadgeBg,
                  color: colors.infoBadgeText,
                  border: `0.5px solid ${colors.infoBadgeBorder}`,
                  borderRadius: "5px",
                  px: 1,
                  py: 0.1,
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                PROGRESS:{" "}
                {
                  items.filter((item) => {
                    const includedQty = item.purchaseOptions
                      .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
                      .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
                    return (
                      Number(includedQty) === Number(item.qty || 0) &&
                      Number(item.qty) > 0
                    );
                  }).length
                }
                /{items.length}
              </Box>
            )}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {showAddButton &&
              !statusChangedAlert &&
              !readOnly &&
              !isPurchase && (
                <>
                  <button
                    style={inlineBtnSx(colors, colors.panelBg)}
                    onClick={() => {
                      setEditingItem(null);
                      setAddingNewItem(true);
                    }}
                  >
                    <Add fontSize="small" />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" } }}
                    >
                      Item
                    </Box>
                  </button>
                  <button
                    style={inlineBtnSx(colors, colors.panelBg)}
                    onClick={() =>
                      navigate("/add-bulk-item", {
                        state: { currentStatusLabel, transaction },
                      })
                    }
                  >
                    <Inventory2Outlined fontSize="small" />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" } }}
                    >
                      Add Bulk Item
                    </Box>
                  </button>
                </>
              )}
            <button
              style={inlineBtnSx(colors, colors.panelBg)}
              onClick={handleCollapseAllToggle}
            >
              {isAnythingExpanded ? (
                <ExpandLess fontSize="small" />
              ) : (
                <ExpandMore fontSize="small" />
              )}
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                {isAnythingExpanded ? "Hide all" : "Expand all"}
              </Box>
            </button>
          </Box>
        </Box>
      )}

      {!isCompareActive &&
        (itemsLoading ? (
          <TransactionItemsTableSkeleton rows={5} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setExpandedRows({})}
            onDragEnd={crudItemsEnabled ? handleDragEnd : undefined}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <DataTable
                minWidth="650px"
                rows={items}
                rowKey={(row) => row.id}
                rowSx={getRowSx}
                columns={activeColumns}
                wrapRow={wrapRow}
                emptyText="No items available."
              />
            </SortableContext>
          </DndContext>
        ))}

      {isCompareActive && compareData && (
        <CompareView
          compareData={compareData}
          onSpecsChange={onSpecsChange}
          onOptionSpecsChange={onOptionSpecsChange}
          forCanvasKey={forCanvasKey}
        />
      )}
    </>
  );

  return isPurchase && forCollection ? (
    <CollectionPaymentDetails
      collectibleAmount={totalCollectibleValue}
      totalSales={totalCollectibleValue}
      companyName={transaction?.company?.strCompanyName}
      clientName={transaction?.client?.strClientName}
      clientAddress={transaction?.client?.strAddress}
      clientTIN={transaction?.client?.strTIN}
      businessStyle={transaction?.client?.strBusinessStyle}
      transactionTitle={transaction?.strTitle}
      date={transaction?.dtDelivery ?? new Date().toISOString()}
      nTransactionId={transaction?.nTransactionId}
    />
  ) : (
    content
  );
}

export default TransactionItemsTable;
