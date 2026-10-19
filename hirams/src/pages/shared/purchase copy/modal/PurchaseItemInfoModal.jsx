import React, { useMemo, useState, useEffect } from "react";
import InventoryAPI from "../../../../api/endpoints/inventory.api.js";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import { Box, Typography, Collapse, IconButton, Tooltip } from "@mui/material";

import {
  getOptionArrival,
  getPartialForStep,
} from "../../../../utils/helpers/purchaseProgress.js";
import {
  StoreOutlined,
  ExpandMore,
  ExpandLess,
  ShoppingCartOutlined,
  HourglassEmptyOutlined,
  PaidOutlined,
  MoveToInboxOutlined,
  LocalShippingOutlined,
} from "@mui/icons-material";
import {
  fmtDate,
  fmtPHP,
  fmtQty,
} from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  border: c.slate.border,
  borderLight: c.slate.borderLight,
  borderRow: c.slate.borderRow,
  mutedBorder: c.slate.mutedBorder,
  innerBg: c.slate.innerBg,
  outerBg: c.slate.outerBg,
  btnBg: c.slate.btnBg,
  mutedBg: c.slate.mutedBg,
  hover: c.slate.hover,
  scrollbarThumb: c.slate.scrollbarThumb,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  // timeline step header strip + white glyph on a filled pip + row hover
  stepHeaderBg: c.slate.stepHeaderBg,
  textOnFill: c.gray.textOnFill,
  hoverShadow: c.shadow.hover,
  blue: c.blue,
  violet: c.violet,
  teal: c.teal,
  cyan: c.cyan,
  green: c.green,
  red: c.red,
  orange: c.orange,
});

// ── STEPS now mirror the new PO status keys 1:1 ──
const STEPS = [
  {
    key: "cart",
    label: "In Cart",
    sublabel: "Queued",
    icon: <ShoppingCartOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "blue",
  },
  {
    key: "forApproval",
    label: "For Approval",
    sublabel: "Awaiting Approval",
    icon: <HourglassEmptyOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "violet",
  },
  {
    key: "forPayment",
    label: "For Payment",
    sublabel: "Awaiting Payment",
    icon: <PaidOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "teal",
  },
  {
    key: "pendingReceipt",
    label: "Pending Receipt",
    sublabel: "From Supplier",
    icon: <MoveToInboxOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "cyan",
  },
  {
    key: "forDelivery",
    label: "For Delivery",
    sublabel: "To Client",
    icon: <LocalShippingOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "orange",
  },
  {
    key: "delivered",
    label: "Delivered",
    sublabel: "Completed",
    icon: <LocalShippingOutlined sx={{ fontSize: "0.8rem" }} />,
    accent: "green",
  },
];

const stepIndexByKey = (statusKey, keys) => {
  if (!statusKey) return -1;
  const s = String(statusKey);
  if (s === String(keys.cartKey)) return 0;
  if (s === String(keys.forApprovalKey)) return 1;
  if (s === String(keys.forPaymentKey)) return 2;
  if (s === String(keys.pendingReceiptKey)) return 3;
  if (s === String(keys.forDeliveryKey)) return 4;
  if (s === String(keys.deliveredKey)) return 5;
  return -1;
};

const KEYFRAMES = `
  @keyframes pip-pulse   { 0%,100%{box-shadow:0 0 0 3px var(--pip-bg)} 50%{box-shadow:0 0 0 5px var(--pip-bg)} }
  @keyframes pip-pop     { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes pip-fadein  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pip-line    { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1);transform-origin:left} }
`;
if (typeof document !== "undefined" && !document.getElementById("pip-kf")) {
  const s = document.createElement("style");
  s.id = "pip-kf";
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ── Animated circular progress for partial steps. The pip stays 26px so the
// connector line still aligns; the ring is larger and centered on it so the
// percentage stays readable.
function PartialRing({ pct, color, trackColor, discColor }) {
  const size = 36;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);

  // Start empty, then fill to pct so the CSS transition animates the sweep
  useEffect(() => {
    const t = setTimeout(() => setShown(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill={discColor}
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - shown / 100)}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      {/* Percentage — static, no animation */}
      <Typography
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.52rem",
          fontWeight: 800,
          lineHeight: 1,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {pct}%
      </Typography>
    </Box>
  );
}

function HorizontalProgressTracker({ nStatus, dtOccur, statusKeys, option }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useMemo(() => useColors(base), [base]);

  // ✅ load this option's inventory rows (same source as CartProgressStepper)
  const [rows, setRows] = useState(null);
  const itemId = option?.nPurchaseItemId;
  const hasMovement =
    Number(option?.nInventoryQty || 0) > 0 ||
    Number(option?.nDeliveredQty || 0) > 0;

  useEffect(() => {
    if (!itemId || !hasMovement) {
      setRows(null);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const res = await InventoryAPI.getHistory(itemId);
        if (active) setRows(res?.rows || res?.inventory || []);
      } catch (err) {
        console.error("Option progress load failed:", err);
        if (active) setRows([]);
      }
    };
    load();
    window.addEventListener("inventory_data_updated", load);
    return () => {
      active = false;
      window.removeEventListener("inventory_data_updated", load);
    };
  }, [itemId, hasMovement]);

  // arrival counts pending (P) rows too; rows = null means "not loaded yet"
  const arrival = useMemo(
    () => getOptionArrival(option, rows ?? undefined),
    [option, rows],
  );
  const currentIndex = stepIndexByKey(nStatus, statusKeys);
  const isCancelled =
    nStatus != null && String(nStatus) === String(statusKeys.cancelledPOKey);

  if (currentIndex === -1 && !isCancelled) return null;

  const displayIndex = currentIndex;
  const partialFor = (i) =>
    isCancelled ? null : getPartialForStep(arrival, i);

  return (
    <Box
      sx={{
        borderTop: `0.5px solid ${c.borderRow}`,
        background: c.stepHeaderBg,
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.58rem",
            fontWeight: 700,
            color: c.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Purchase Progress
        </Typography>
        {!isCancelled && displayIndex >= 0 && (
          <Typography
            sx={{
              fontSize: "0.55rem",
              color: c.textDisabled,
              fontStyle: "italic",
            }}
          >
            Step {displayIndex + 1} of {STEPS.length}
          </Typography>
        )}
        {isCancelled && (
          <Box
            sx={{
              px: 0.6,
              py: 0.2,
              borderRadius: "4px",
              background: c.red.bgSoft,
              border: `0.5px solid ${c.red.border}`,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: c.red.textDark,
              }}
            >
              Cancelled
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{ px: 1.5, pb: 2.25, display: "flex", alignItems: "flex-start" }}
      >
        {STEPS.map((step, i) => {
          const accent = c[step.accent];
          const isDone = i < displayIndex;
          const isCurrent = i === displayIndex && !isCancelled;
          const partial = !isDone && !isCurrent ? partialFor(i) : null; // ✅
          const isPartial = !!partial; // ✅
          const isPending = i > displayIndex && !isPartial; // ✅
          const isLast = i === STEPS.length - 1;
          const delay = `${i * 80}ms`;

          return (
            <Box
              key={step.key}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                animation: `pip-fadein 0.35s ease both`,
                animationDelay: delay,
              }}
            >
              {!isLast && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 13,
                    left: "50%",
                    width: "100%",
                    height: 2,
                    borderRadius: "2px",
                    zIndex: 0,
                    background: isDone
                      ? `linear-gradient(to right, ${accent.border}, ${c.borderLight})`
                      : c.borderLight,
                    ...(isDone && {
                      animation: "pip-line 0.4s ease both",
                      animationDelay: delay,
                    }),
                  }}
                />
              )}

              <Box
                sx={{
                  position: "relative",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  zIndex: 1,
                  mb: 0.5,
                  // no pop for partial steps — keeps the percentage still
                  animation:
                    isDone || isCurrent ? `pip-pop 0.35s ease both` : "none",
                  animationDelay: delay,
                  ...(isDone && {
                    background: accent.bgSoft,
                    border: `2px solid ${accent.border}`,
                    color: accent.text,
                  }),
                  ...(isCurrent && {
                    "--pip-bg": accent.bgSoft,
                    background: accent.text,
                    border: `2px solid ${accent.text}`,
                    color: c.textOnFill,
                    animation: `pip-pop 0.35s ease both, pip-pulse 2s ease-in-out ${delay} infinite`,
                    animationDelay: delay,
                  }),
                  // partial: the pip is invisible; PartialRing draws the
                  // animated circular progress on top of it
                  ...(isPartial && {
                    background: "transparent",
                    border: "none",
                    mb: 1.25,
                  }),
                  ...(isPending && {
                    background: c.btnBg,
                    border: `2px solid ${c.mutedBorder}`,
                    color: c.scrollbarThumb,
                  }),
                }}
              >
                {isPartial ? (
                  <PartialRing
                    pct={partial.pct}
                    color={accent.text}
                    trackColor={c.mutedBg}
                    discColor={c.outerBg}
                  />
                ) : isDone || isCurrent ? (
                  step.icon
                ) : (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: c.scrollbarThumb,
                    }}
                  />
                )}
              </Box>

              <Typography
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: isCurrent || isPartial ? 700 : isDone ? 600 : 400,
                  color:
                    isCurrent || isPartial
                      ? accent.text
                      : isDone
                        ? c.textPrimary
                        : c.textDisabled,
                  textAlign: "center",
                  lineHeight: 1.3,
                  px: 0.25,
                  animation: `pip-fadein 0.3s ease both`,
                  animationDelay: `${i * 80 + 60}ms`,
                }}
              >
                {step.label}
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.52rem",
                  color: isPending ? c.borderLight : c.textDisabled,
                  textAlign: "center",
                  lineHeight: 1.2,
                  mt: 0.15,
                  px: 0.25,
                }}
              >
                {isPartial
                  ? partial.sub // e.g. "6/10 rcvd"
                  : isCurrent && dtOccur
                    ? fmtDate(dtOccur)
                    : step.sublabel}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function OptionCard({ option, statusKeys }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useMemo(() => useColors(base), [base]);

  const [specsOpen, setSpecsOpen] = useState(false);

  const qty = Number(option.nQuantity ?? 0);
  const unitPrice = Number(option.dUnitPrice ?? 0);
  const total = qty * unitPrice;
  const uom = option.strUOM || option.strUnit || "";
  const isIncluded = Number(option.bPurchaseIncluded) === 1;
  const isAddOn = Number(option.bAddOn) === 1;
  const hasSpecs = !!(
    option.strSpecs?.trim() && option.strSpecs.trim() !== "<p></p>"
  );

  return (
    <Box
      sx={{
        overflow: "hidden",
        background: isDark
          ? isIncluded
            ? c.cyan.bgSoft
            : c.innerBg
          : isIncluded
            ? c.cyan.bgSoft
            : c.outerBg,
        transition: "box-shadow 0.15s",
        "&:hover": {
          boxShadow: `0 1px 6px ${c.hoverShadow}`,
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "6px",
            background: isAddOn ? c.green.bg : c.mutedBg,
            border: "0.5px solid",
            borderColor: isAddOn ? c.green.border : c.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "1rem",
          }}
        >
          {isAddOn ? "➕" : "📦"}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexWrap: "wrap",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: c.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {option.strBrand || option.strModel
                ? [option.strBrand, option.strModel].filter(Boolean).join(" · ")
                : "No brand/model"}
            </Typography>
            {isAddOn && (
              <Box
                sx={{
                  fontSize: "0.52rem",
                  px: 0.5,
                  py: 0.1,
                  borderRadius: "4px",
                  background: c.green.bgSoft,
                  border: "0.5px solid",
                  borderColor: c.green.border,
                  color: c.green.text,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Add-on
              </Box>
            )}
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.25 }}
          >
            <StoreOutlined
              sx={{ fontSize: "0.62rem", color: c.textDisabled }}
            />
            <Typography sx={{ fontSize: "0.6rem", color: c.textSecondary }}>
              {option.supplierNickName ||
                option.strSupplierNickName ||
                option.supplierName ||
                "—"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: "center", flexShrink: 0, minWidth: 36 }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: c.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {fmtQty(qty)}
          </Typography>
          {uom && (
            <Typography
              sx={{
                fontSize: "0.52rem",
                color: c.textDisabled,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              {uom}
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
          <Typography
            sx={{ fontSize: "0.72rem", fontWeight: 700, color: c.orange.text }}
          >
            ₱ {fmtPHP(total)}
          </Typography>
          <Typography sx={{ fontSize: "0.57rem", color: c.textSecondary }}>
            ₱{fmtPHP(unitPrice)} / unit
          </Typography>
        </Box>

        {hasSpecs && (
          <Tooltip
            title={specsOpen ? "Hide specs" : "View specs"}
            placement="top"
          >
            <IconButton
              size="small"
              onClick={() => setSpecsOpen((v) => !v)}
              sx={{
                width: 24,
                height: 24,
                border: "0.5px solid",
                borderColor: specsOpen ? c.blue.borderStrong : c.border,
                borderRadius: "5px",
                color: specsOpen ? c.blue.text : c.textDisabled,
                background: specsOpen ? c.blue.bg : "transparent",
                flexShrink: 0,
                "&:hover": {
                  background: c.blue.bg,
                  borderColor: c.blue.borderStrong,
                  color: c.blue.text,
                },
              }}
            >
              {specsOpen ? (
                <ExpandLess sx={{ fontSize: "0.8rem" }} />
              ) : (
                <ExpandMore sx={{ fontSize: "0.8rem" }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Collapse in={specsOpen}>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: "0.5px solid",
            borderColor: c.cyan.border,
            background: c.cyan.bgSoft,
            fontSize: "0.77rem",
            color: c.textSecondary,
            maxHeight: 180,
            overflowY: "auto",
            "& *": { backgroundColor: "transparent !important" },
            "& ul": { paddingLeft: 2, margin: 0, listStyleType: "disc" },
            "& ol": { paddingLeft: 2, margin: 0, listStyleType: "decimal" },
            "& li": { marginBottom: "2px" },
            wordBreak: "break-word",
            lineHeight: 1.65,
          }}
          dangerouslySetInnerHTML={{
            __html: option.strSpecs || "No specifications available.",
          }}
        />
      </Collapse>

      <HorizontalProgressTracker
        nStatus={option.nStatus}
        dtOccur={option.dtStatusOccur}
        statusKeys={statusKeys}
        option={option} // ✅ new
      />
    </Box>
  );
}

export default function PurchaseItemInfoModal({
  open,
  onClose,
  item,
  option,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  cancelledPOKey,
  purchaseOrder,
  readOnly,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useMemo(() => useColors(base), [base]);

  if (!open || !item || !option) return null;

  const statusKeys = {
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
  };

  const handleViewCart = () => {
    const poId = option?.nPurchaseOrderId || purchaseOrder?.nPurchaseOrderId;
    if (poId) {
      navigate(`/item-purchasing-update?id=${poId}`);
    } else {
      console.warn("PurchaseItemInfoModal: No PO ID available to navigate");
    }
  };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Option Details"
      subTitle={
        item.nItemNumber ? `${option.strBrand} - ${option.strModel}` : ""
      }
      contentPadding={0}
      showSave={readOnly ? false : true}
      saveLabel="View Cart"
      onSave={handleViewCart}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
          bgcolor: c.outerBg,
        }}
      >
        <OptionCard option={option} statusKeys={statusKeys} />
      </Box>
    </ModalContainer>
  );
}