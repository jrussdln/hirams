import React, { useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, Checkbox, Tooltip, IconButton } from "@mui/material";
import {
  Edit,
  Delete,
  ExpandLess,
  CompareArrows,
  AddShoppingCart,
  RemoveShoppingCart,
  ShoppingCart,
  Visibility,
  SyncOutlined,
} from "@mui/icons-material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BaseButton from "../../../../components/ui/form/BaseButton";
import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import PurchaseCartUpdateModal from "../../item-purchasing/modal/PurchaseCartUpdateModal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors";
import {
  fmtPHP,
  fmtDate,
  fmtQty,
} from "../../../../utils/formatters/formatter.js";
import MiniBaseButton from "../../../../components/ui/form/MiniBaseButton";
import { CART_STATUS_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import { getOptionArrival } from "../../../../utils/helpers/purchaseProgress.js";
import { ewtOfOption } from "../../../../utils/helpers/calculateEWT.js";
// ── PROMPT 1 — inline color map, only tokens this component uses ──
const useColors = (c) => ({
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  errorText: c.red.text,
  errorTooltipBg: c.slate.mutedBg,
  rowBg: c.slate.outerBg,
  rowHoverBg: c.slate.hover,
  rowBorder: c.slate.border,
  rowDisabledBg: c.slate.mutedBg,
  specsBodyBg: c.slate.outerBg,
  specsBorder: c.slate.mutedBorder,
  connectorLine: c.slate.divider,
  actionBtnBg: c.slate.outerBg,
  actionBtnBorder: c.slate.border,
  actionBtnText: c.blue.text,
  addOnGreen: c.green.text,
  // purchase-mode additions
  voidColor: c.red.text,
  voidBg: c.red.bg,
  voidBorder: c.red.border,
  cartColor: c.cyan.text,
  cartBg: c.cyan.bg,
  cartBorder: c.cyan.border,
  progressColor: c.violet.text,
  progressBg: c.violet.bg,
  progressBorder: c.violet.border,
  successColor: c.green.text,
  viewColor: c.blue.text,
  spinnerTrack: c.slate.mutedBorder,
  textOnFill: c.gray.textOnFill,
  shadowChip: c.shadow.chip,
  // banners — theme-derived
  addOnHeaderBg: c.green.active,
  addOnHeaderBorder: c.green.border,
  addOnHeaderText: c.gray.textPrimary,
  // specs — plain grayish, not colored
  specsHeaderBg: c.slate.mutedBg,
  specsHeaderBorder: c.slate.mutedBorder,
  specsHeaderText: c.gray.textPrimary,
  specsContentBg: c.slate.outerBg,
  specsContentText: c.gray.textSecondary,
  // the PENDING purchase price notice
  pendingText: c.amber.warnText,
});

const getColor = (colors, path) =>
  path.split(".").reduce((obj, key) => obj?.[key], colors);

// Approved-only received/delivered progress for ONE option (same rules as CartCardPanel).
// Falls back to the old A+P totals if the backend fields aren't there yet.
// Approved (cStatus "A") only. Pending (P) never counts toward the percentage.
const getArrivalStats = (option) => {
  const ordered = Number(option?.nQuantity || 0);
  const received = Math.min(Number(option?.nApprovedReceivedQty || 0), ordered);
  const delivered = Math.min(
    Number(option?.nApprovedDeliveredQty || 0),
    ordered,
  );
  const pct = (n) => (ordered > 0 ? Math.round((n / ordered) * 100) : 0);
  return {
    ordered,
    received,
    delivered,
    receivedPct: pct(received),
    deliveredPct: pct(delivered),
    allReceived: ordered > 0 && received >= ordered,
    allDelivered: ordered > 0 && delivered >= ordered,
  };
};
// bannerColors() is removed entirely — no more hardcoded hex block.
const STAMP_BASE_SX = {
  fontSize: "0.45rem",
  fontWeight: 900,
  borderRadius: "4px",
  px: 0.4,
  py: 0.2,
  lineHeight: 1.3,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  transform: "rotate(-15deg)",
  whiteSpace: "nowrap",
  userSelect: "none",
};

const inlineBtnSx = (colors) => ({
  fontSize: "0.6rem",
  background: colors.actionBtnBg,
  border: `1px solid ${colors.actionBtnBorder}`,
  cursor: "pointer",
  color: colors.actionBtnText,
  fontWeight: 500,
  borderRadius: "6px",
  padding: "1px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

/* ─── Purchase-mode sub-widgets ────────────────────────────────── */
function Spinner({ color, colors }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          border: `2px solid ${colors.spinnerTrack}`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
    </Box>
  );
}

function SuccessTick({ colors }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeInScale 0.2s ease",
      }}
    >
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: colors.successColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 5,
            borderLeft: `2px solid ${colors.textOnFill}`,
            borderBottom: `2px solid ${colors.textOnFill}`,
            transform: "rotate(-45deg) translate(1px, -1px)",
          }}
        />
      </Box>
    </Box>
  );
}

function StatusStamp({ children, color, bg, border, pct, colors }) {
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          ...STAMP_BASE_SX,
          color: pct != null ? colors.textOnFill : color,
          backgroundColor: pct != null ? color : bg,
          border: `2px solid ${color}`,
          boxShadow: `inset 0 0 0 1px ${border}`,
          ...(pct != null && {
            fontSize: "0.38rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            transform: "none",
          }),
        }}
      >
        {pct != null ? `${pct}%` : children}
      </Box>
    </Box>
  );
}

function CartActionButtons({
  latestHistory,
  isProgressed,
  isInCart,
  // The purchase page reads View Cart as an eye; the canvas keeps the cart.
  eyeViewCart = false,
  option,
  isIncluded,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  // Ask-then-confirm: the click only raises the confirmation; the actual
  // call runs after "Yes, Remove Item". `removing` spins the button while
  // the request is in flight.
  onRemoveRequest,
  removing = false,
  onEditOption,
  onAddToCart,
  onViewCart,
  isAssignedToMe,
  readOnly,
  colors,
}) {
  const [cartPhase, setCartPhase] = useState("idle");

  const progressLabel = latestHistory
    ? ({
        [String(forApprovalKey)]: "For Approval",
        [String(forPaymentKey)]: "For Payment",
        [String(pendingReceiptKey)]: "Pending Receipt",
        [String(forDeliveryKey)]: "For Delivery",
        [String(deliveredKey)]: "Delivered",
      }[String(latestHistory.nStatus)] ?? "")
    : "";

  const isDisabled = readOnly || isAssignedToMe;
  const canRemove = isInCart && !isDisabled;
  // A CART-stage order — the cart itself, For Approval or For Payment —
  // still lets an option be pulled back out of it. Pending Receipt and
  // beyond, and anything already holding stock, never gets the remove
  // button: from those points the option feeds a voucher or moves through
  // the warehouse.
  const stageAllowsRemove =
    latestHistory != null &&
    [String(cartKey), String(forApprovalKey), String(forPaymentKey)].includes(
      String(latestHistory.nStatus),
    );
  const hasStock =
    Number(option?.nInventoryQty || 0) > 0 ||
    Number(option?.nDeliveredQty || 0) > 0;
  const handleAddClick = async () => {
    if (isDisabled) return;
    setCartPhase("loading");
    try {
      await onAddToCart();
      setCartPhase("success");
      setTimeout(() => setCartPhase("idle"), 1000);
    } catch {
      setCartPhase("idle");
    }
  };

  // An option that is ALREADY on the order (in the cart, or moved on to
  // For Approval / For Payment / Pending Receipt / For Delivery / Delivered)
  // is edited from here — and the cart it sits in is one click away.
  const viewCartButton = (
    <BaseButton
      icon={
        eyeViewCart ? (
          <Visibility sx={{ fontSize: "0.9rem", color: colors.viewColor }} />
        ) : (
          <ShoppingCart sx={{ fontSize: "0.9rem", color: colors.viewColor }} />
        )
      }
      // The stage the option is at rides along on the tooltip — the View
      // button used to carry it.
      tooltip={progressLabel ? `${progressLabel} — View Cart` : "View Cart"}
      onClick={onViewCart}
      disabled={isDisabled}
      size="small"
    />
  );

  if (isProgressed)
    return (
      <>
        {viewCartButton}
        <BaseButton
          icon={<Edit sx={{ fontSize: "0.9rem" }} />}
          tooltip={isDisabled ? "Not allowed" : "Edit"}
          onClick={() => !isDisabled && onEditOption(option)}
          disabled={isDisabled}
          size="small"
        />
        {/* Still in a cart-stage order (For Approval / For Payment
            included) → the same remove-from-cart the cart branch offers.
            Later stages or existing stock never reach this. */}
        {stageAllowsRemove && !hasStock
          ? removing
            ? <Spinner color={colors.voidColor} colors={colors} />
            : (
                <BaseButton
                  icon={
                    <RemoveShoppingCart
                      sx={{ fontSize: "0.9rem", color: colors.voidColor }}
                    />
                  }
                  tooltip={isDisabled ? "Not allowed" : "Remove from cart"}
                  onClick={() => !isDisabled && onRemoveRequest()}
                  disabled={isDisabled}
                  size="small"
                />
              )
          : null}
      </>
    );

  if (canRemove)
    return (
      <>
        {viewCartButton}
        <BaseButton
          icon={<Edit sx={{ fontSize: "0.9rem" }} />}
          tooltip={isDisabled ? "Not allowed" : "Edit"}
          onClick={() => !isDisabled && onEditOption(option)}
          disabled={isDisabled}
          size="small"
        />
        {removing ? (
          <Spinner color={colors.voidColor} colors={colors} />
        ) : (
          <BaseButton
            icon={
              <RemoveShoppingCart
                sx={{ fontSize: "0.9rem", color: colors.voidColor }}
              />
            }
            tooltip={isDisabled ? "Not allowed" : "Remove from cart"}
            onClick={() => !isDisabled && onRemoveRequest()}
            disabled={isDisabled}
            size="small"
          />
        )}
      </>
    );

  if (isInCart)
    return (
      <>
        {viewCartButton}
        <BaseButton
          icon={<Edit sx={{ fontSize: "0.9rem" }} />}
          tooltip={isDisabled ? "Not allowed" : "Edit"}
          onClick={() => !isDisabled && onEditOption(option)}
          disabled={isDisabled}
          size="small"
        />
      </>
    );

  if (cartPhase === "loading")
    return (
      <>
        <BaseButton
          icon={<Edit sx={{ fontSize: "0.9rem" }} />}
          tooltip={isDisabled ? "Not allowed" : "Edit"}
          onClick={() => !isDisabled && onEditOption(option)}
          disabled={isDisabled}
          size="small"
        />
        <Spinner color={colors.successColor} colors={colors} />
      </>
    );

  if (cartPhase === "success")
    return (
      <>
        <BaseButton
          icon={<Edit sx={{ fontSize: "0.9rem" }} />}
          tooltip={isDisabled ? "Not allowed" : "Edit"}
          onClick={() => !isDisabled && onEditOption(option)}
          disabled={isDisabled}
          size="small"
        />
        <SuccessTick colors={colors} />
      </>
    );

  return (
    <>
      <BaseButton
        icon={<Edit sx={{ fontSize: "0.9rem" }} />}
        tooltip={isDisabled ? "Not allowed" : "Edit"}
        onClick={() => !isDisabled && onEditOption(option)}
        disabled={isDisabled}
        size="small"
      />
      <BaseButton
        icon={
          <AddShoppingCart
            sx={{
              fontSize: "0.9rem",
              color:
                !isIncluded || isDisabled
                  ? colors.textDisabled
                  : colors.successColor,
            }}
          />
        }
        tooltip={
          isDisabled
            ? "Not allowed"
            : !isIncluded
              ? "Check the option to add to cart"
              : "Add to cart"
        }
        disabled={!isIncluded || isDisabled}
        onClick={handleAddClick}
        size="small"
      />
    </>
  );
}

/* ─── Status icon: void stamp / cart badge / progress stamps / checkbox (purchase mode) ── */
function PurchaseStatusIcon({
  isCancelled,
  isInCart,
  isProgressed,
  latestHistory,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  option,
  checkboxOptionsEnabled,
  isFull,
  cancelledPOKey,
  optionErrors,
  onToggleInclude,
  itemId,
  isAssignedToMe,
  readOnly,
  isProcurement,
  isManagement,
  isProcurementTL,
  colors,
  stamps, // ← new
}) {
  if (isCancelled)
    return (
      <StatusStamp
        color={colors.voidColor}
        bg={colors.voidBg}
        border={colors.voidBorder}
        colors={colors}
      >
        VOID
      </StatusStamp>
    );

  if (isInCart)
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: "50%",
          border: `2px solid ${colors.cartColor}`,
          outline: `1px solid ${colors.cartColor}`,
          outlineOffset: "2px",
          boxShadow: `0 0 0 1px ${colors.cartBorder}`,
          backgroundColor: colors.cartBg,
        }}
      >
        <ShoppingCart sx={{ fontSize: "0.9rem", color: colors.cartColor }} />
      </Box>
    );

  if (isProgressed) {
    const nStatus = latestHistory ? String(latestHistory.nStatus) : null;
    const s = getOptionArrival(option); // was getArrivalStats(option)
    const badges = [];

    // Received / Delivered stamps, each with its own %
    if (s.received > 0 || s.delivered > 0) {
      if (!s.allReceived || s.delivered === 0)
        badges.push({
          ...stamps.RCVD,
          pct: s.allReceived ? null : `${s.receivedPct}%`,
          tip: `Received ${s.received}/${s.ordered}`,
        });
      if (s.delivered > 0)
        badges.push({
          ...stamps.DLVRD,
          pct: s.allDelivered ? null : `${s.deliveredPct}%`,
          tip: `Delivered ${s.delivered}/${s.ordered}`,
        });
    }

    // Nothing approved yet: fall back to the PO status stamp (same mapping as the card)
    if (badges.length === 0 && nStatus) {
      const byStatus = {
        [String(forApprovalKey)]: stamps.PO,
        [String(forPaymentKey)]: stamps.PENDING,
        [String(pendingReceiptKey)]: stamps.PAID,
        [String(forDeliveryKey)]: stamps.RCVD,
        [String(deliveredKey)]: stamps.DLVRD,
      };
      if (byStatus[nStatus]) badges.push({ ...byStatus[nStatus], pct: null });
    }

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        {badges
          .filter((b) => b.label)
          .map(({ pct, label, color, bg, border, tip }, i) => (
            <Box
              key={i}
              title={tip}
              sx={{
                ...STAMP_BASE_SX,
                color,
                backgroundColor: bg,
                border: `2px solid ${color}`,
                boxShadow: `inset 0 0 0 1px ${border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                lineHeight: 1.2,
              }}
            >
              {pct && (
                <span
                  style={{ fontSize: "0.5rem", fontWeight: 800, lineHeight: 1 }}
                >
                  {pct}
                </span>
              )}
              <span>{label}</span>
            </Box>
          ))}
      </Box>
    );
  }

  const isIncluded = Number(option.bPurchaseIncluded) === 1;
  const isCheckboxDisabled =
    isProcurement ||
    isProcurementTL ||
    readOnly ||
    (!isAssignedToMe && !isManagement) ||
    !checkboxOptionsEnabled ||
    (isFull && !option.bPurchaseIncluded && Number(option.bAddOn) !== 1) ||
    (!!latestHistory &&
      String(latestHistory.nStatus) !== String(cancelledPOKey)) ||
    (Number(option.bAddOn) === 1 && isProgressed);

  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Checkbox
        checked={isIncluded}
        disabled={isCheckboxDisabled}
        onChange={(e) =>
          onToggleInclude(itemId, option.id, e.target.checked, "purchase")
        }
        sx={{
          p: 0,
          m: 0,
          width: 20,
          height: 20,
          color:
            Number(option.bAddOn) === 1
              ? colors.addOnGreen
              : optionErrors[option.id]
                ? colors.errorText
                : colors.textSecondary,
          "&.Mui-checked": {
            color: Number(option.bAddOn) === 1 ? colors.addOnGreen : undefined,
          },
          transition: "color 0.2s ease, opacity 0.2s ease",
        }}
      />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — mode: "canvas" (default) | "purchase"
═══════════════════════════════════════════════════════════════ */
const PurchaseOptionRow = ({
  option,
  // The EWT type labels (A / B / C) — the mapping, with the app's own
  // wording as the fallback.
  ewtTypeLabels: ewtTypeLabelsProp,
  // The letter that means "Pending" in the purchase price status — the
  // table resolves it once (it owns the mapping) and hands it down.
  pendingStatusLetter = "P",
  index,
  isLastOption,
  itemId,
  checkboxOptionsEnabled,
  expandedOptions,
  optionErrors,
  onToggleInclude,
  onToggleOptionSpecs,
  onEditOption,
  onDeleteOption,
  onCompareClick,
  item,
  isManagement,
  isFirstAddOn,
  hasNoRegularOptions,
  displayIndex,
  statusChangedAlert,
  readOnly = false,
  mode = "canvas",
  // Purchase page shows View Cart as an eye; the canvas keeps the cart.
  eyeViewCart = false,
  // purchase-mode only:
  currentUserId,
  cancelledPOKey,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  latestHistory = null,
  onAddedToCart,
  isProgressed = false,
  isInCart = false,
  isAssignedToMe = false,
  isProcurement = false,
  isProcurementTL = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const stamps = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(CART_STATUS_STYLES).map(([key, val]) => [
          key,
          {
            label: val.label,
            color: getColor(base, val.colorKey),
            bg: getColor(base, val.bgKey),
            border: getColor(base, val.borderKey),
          },
        ]),
      ),
    [base],
  );
  const isPurchase = mode === "purchase";
  const navigate = useNavigate();

  // ── THE PENDING PURCHASE PRICE ───────────────────────────────
  // A price renegotiated at the purchase stage does NOT touch the
  // canvassed one (dUnitPrice): it is filed as a PENDING purchase
  // price (dPurchaseUnitPrice + cPurchaseUnitPriceStatus = 'P') until
  // it is approved ('A'). Until then the line still counts at the
  // canvassed price — so the row says so, and switches between the
  // request and the price that counts every 2 seconds.
  const pendingPrice = option.dPurchaseUnitPrice;
  const hasPendingPrice =
    pendingPrice !== null &&
    pendingPrice !== undefined &&
    pendingPrice !== "" &&
    String(option.cPurchaseUnitPriceStatus || "") === pendingStatusLetter;

  // The REQUESTED price lives in the PENDING tag's tooltip — the row
  // never changes on its own, so nothing flickers while you read it.

  // VIEW CART — the order this option sits in, the same jump the option
  // details modal makes. The PO's stage rides along: without ?status= the
  // update page has to infer the tab, and a deep-link response that lacks
  // the option quantities can misfile the PO (a Pending Receipt order
  // opened under Delivered with a Pending Receipt tracker).
  const handleViewCart = () => {
    const poId = option?.nPurchaseOrderId;
    if (poId) {
      const stage = latestHistory?.nStatus
        ? `&status=${encodeURIComponent(String(latestHistory.nStatus))}`
        : "";
      navigate(`/item-purchasing-update?id=${poId}${stage}`);
    } else {
      console.warn("PurchaseOptionRow: no PO id to open the cart for.");
    }
  };

  // The EWT TYPE of the line — the formula its EWT is built from. The
  // default ("") is never named: it needs no label, the supplier's own
  // flags decide.
  const ewtTypeLabels = {
    A: "0% of Q",
    B: "1% of Q",
    C: "2% of Q",
    D: "1% of Q / 1.12 (VAT net)",
    ...(ewtTypeLabelsProp || {}),
  };
  const ewtType = String(option.cEWTType || "");
  const ewtTypeLabel =
    ewtType && ewtType !== "—"
      ? ewtTypeLabels[ewtType] || ewtType
      : "";

  const includedQty = item.purchaseOptions
    .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
    .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
  const purchasedQty = item.purchaseOptions
    .filter((o) => o.bPurchaseIncluded && Number(o.bAddOn) !== 1)
    .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
  const isFull = isPurchase
    ? purchasedQty >= Number(item.qty || 0)
    : includedQty >= Number(item.qty || 0);

  const isCancelled =
    isPurchase &&
    latestHistory &&
    String(latestHistory.nStatus) === String(cancelledPOKey);
  const isIncluded = isPurchase
    ? Number(option.bPurchaseIncluded) === 1
    : !!option.bIncluded;
  const rowDisabled = isPurchase && (readOnly || !isAssignedToMe);

  const handleAddToCart = () => {
    if (readOnly) return;
    return PurchaseOrderAPI.addToCart({
      nPurchaseItemId: option.nPurchaseItemId,
      nUserId: currentUserId,
      nStatus: cartKey,
      isManagement,
    }).then(async (res) => {
      if (res?.purchaseOrder) {
        await onAddedToCart?.();
        window.dispatchEvent(new CustomEvent("cart_data_updated"));
      } else throw new Error("No purchase order returned");
    });
  };
  // Remove-from-cart runs through a confirmation — the button only raises
  // the ask; the request fires from "Yes, Remove Item".
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const handleRemoveFromCart = async () => {
    if (readOnly) return;
    setRemoving(true);
    setConfirmRemove(false);
    try {
      const res = await PurchaseOrderAPI.removeFromCart({
        nPurchaseItemId: option.nPurchaseItemId,
        nUserId: currentUserId,
        isManagement,
      });
      if (res) {
        await onAddedToCart?.(option.nPurchaseItemId);
        window.dispatchEvent(new CustomEvent("cart_data_updated"));
      }
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    } finally {
      setRemoving(false);
    }
  };

  // ── SYNC — adopt the pending (renegotiated) price straight from the row.
  // The owner sees the PENDING tag on the unit price and can take the
  // proposal as-is: the backend writes the pending value into dUnitPrice,
  // detects the adoption and clears the pending fields + stamps dtCanvass.
  const [syncingUnitPrice, setSyncingUnitPrice] = useState(false);
  const [adoptedSync, setAdoptedSync] = useState(null);

  const handleSyncUnitPrice = async () => {
    if (!hasPendingPrice || syncingUnitPrice) return;
    setSyncingUnitPrice(true);
    try {
      const res = await PurchaseOptionAPI.syncPriceChange(
        option.nPurchaseItemId,
      );
      const adopted = res?.data?.item;
      if (adopted) {
        setAdoptedSync({
          nPurchaseItemId: option.nPurchaseItemId,
          dUnitPrice: adopted.dUnitPrice ?? adopted.dPurchaseUnitPrice,
          dtCanvass: adopted.dtCanvass,
        });
      }
    } catch (err) {
      console.error("PurchaseOptionRow: sync failed:", err);
    } finally {
      setSyncingUnitPrice(false);
    }
  };

  return (
    <React.Fragment>
      {isFirstAddOn && Number(option.bAddOn) === 1 && hasNoRegularOptions && (
        <Box
          sx={{
            py: 1,
            mt: 2,
            textAlign: "center",
            fontSize: "0.75rem",
            color: colors.textSecondary,
            fontStyle: "italic",
          }}
        >
          No options available.
        </Box>
      )}

      {isFirstAddOn && Number(option.bAddOn) === 1 && (
        // Add-ons banner
        <Box
          sx={{
            mt: 0,
            mb: 0,
            px: 2,
            py: 0.7,
            pl: 5,
            backgroundColor: colors.addOnHeaderBg,
            borderTop: `1px solid ${colors.addOnHeaderBorder}`,
            borderBottom: `1px solid ${colors.addOnHeaderBorder}`,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.addOnHeaderText,
          }}
        >
          Add-ons
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          position: "relative",
          px: 1.2,
          py: 0.7,
          display: "flex",
          flexDirection: "column",
          borderBottom: `1px solid ${colors.rowBorder}`,
          transition: "background 0.2s",
          backgroundColor: rowDisabled ? colors.rowDisabledBg : colors.rowBg,
          "&:hover": {
            backgroundColor: rowDisabled
              ? colors.rowDisabledBg
              : colors.rowHoverBg,
          },
          opacity: rowDisabled ? 0.8 : 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* DESCRIPTION + STATUS/CHECKBOX + EXPAND ICON */}
          <Box
            sx={{
              flex: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {isPurchase ? (
                  <PurchaseStatusIcon
                    isCancelled={isCancelled}
                    isInCart={isInCart}
                    isProgressed={isProgressed}
                    latestHistory={latestHistory}
                    cartKey={cartKey}
                    forApprovalKey={forApprovalKey}
                    forPaymentKey={forPaymentKey}
                    pendingReceiptKey={pendingReceiptKey}
                    forDeliveryKey={forDeliveryKey}
                    deliveredKey={deliveredKey}
                    option={option}
                    checkboxOptionsEnabled={checkboxOptionsEnabled}
                    isFull={isFull}
                    cancelledPOKey={cancelledPOKey}
                    optionErrors={optionErrors}
                    onToggleInclude={onToggleInclude}
                    itemId={itemId}
                    isAssignedToMe={isAssignedToMe}
                    readOnly={readOnly}
                    isProcurement={isProcurement}
                    isProcurementTL={isProcurementTL}
                    isManagement={isManagement}
                    colors={colors}
                    stamps={stamps}
                  />
                ) : (
                  <Checkbox
                    checked={isIncluded}
                    disabled={
                      !checkboxOptionsEnabled ||
                      (isFull &&
                        !option.bIncluded &&
                        Number(option.bAddOn) !== 1)
                    }
                    onChange={(e) =>
                      onToggleInclude(
                        itemId,
                        option.id,
                        e.target.checked,
                        "canvas",
                      )
                    }
                    sx={{
                      p: 0.5,
                      opacity:
                        isFull &&
                        !option.bIncluded &&
                        Number(option.bAddOn) !== 1
                          ? 0
                          : 1,
                      pointerEvents:
                        isFull &&
                        !option.bIncluded &&
                        Number(option.bAddOn) !== 1
                          ? "none"
                          : "auto",
                      color:
                        Number(option.bAddOn) === 1
                          ? colors.addOnGreen
                          : optionErrors[option.id]
                            ? colors.errorText
                            : colors.textSecondary,
                      "&.Mui-checked": {
                        color:
                          Number(option.bAddOn) === 1
                            ? colors.addOnGreen
                            : undefined,
                      },
                      transition: "color 0.2s ease, opacity 0.2s ease",
                    }}
                  />
                )}

                {optionErrors[option.id] && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: "calc(100% + 6px)",
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      backgroundColor: colors.errorTooltipBg,
                      color: colors.errorText,
                      fontSize: "0.65rem",
                      lineHeight: 1.2,
                      px: 0.75,
                      py: 0.3,
                      borderRadius: 1,
                      boxShadow: `0 2px 6px ${colors.shadowChip}`,
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      animation: "optionErrorFade 0.18s ease-out",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: -4,
                        top: "50%",
                        transform: "translateY(-50%)",
                        borderWidth: 4,
                        borderStyle: "solid",
                        borderColor: `transparent ${colors.errorTooltipBg} transparent transparent`,
                      },
                      "@keyframes optionErrorFade": {
                        from: {
                          opacity: 0,
                          transform: "translateY(-50%) scale(0.95)",
                        },
                        to: {
                          opacity: 1,
                          transform: "translateY(-50%) scale(1)",
                        },
                      },
                    }}
                  >
                    {optionErrors[option.id]}
                  </Box>
                )}
              </Box>

              {/* SUPPLIER — the nickname in caps. */}
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
                {displayIndex}.{" "}
                {String(
                  option.supplierNickName || option.strSupplierNickName || "",
                ).toUpperCase()}
              </Typography>
            </Box>

            <ArrowDropDownIcon
              sx={{
                fontSize: 22,
                transform: expandedOptions[option.id]
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "0.25s",
                cursor: rowDisabled ? "default" : "pointer",
                mr: { xs: 0, lg: 4 },
                color: rowDisabled ? colors.textDisabled : colors.textSecondary,
              }}
              onClick={() => !rowDisabled && onToggleOptionSpecs(option.id)}
            />
          </Box>

          {/* BRAND on its own line, MODEL under it — both flush left. */}
          <Box
            sx={{
              flex: 2,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 0,
              minWidth: 0,
            }}
          >
            {option.strBrand && (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  lineHeight: 1.15,
                  textTransform: "uppercase",
                }}
              >
                {option.strBrand}
              </Typography>
            )}
            {option.strModel && (
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontStyle: "italic",
                  lineHeight: 1.15,
                }}
              >
                {option.strModel}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: optionErrors[option.id]
                  ? colors.errorText
                  : colors.textPrimary,
              }}
            >
              {fmtQty(option.nQuantity)}
              <br />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: optionErrors[option.id]
                    ? colors.errorText
                    : colors.textSecondary,
                }}
              >
                {option.strUOM}
              </span>
            </Typography>
          </Box>

          {/* UNIT PRICE, with the price-updated date under it — the same
              tight line spacing as the brand · model, but right aligned.

              A PENDING purchase price takes the lead every other second:
              the request is called out, and the price that actually
              counts stays on screen the rest of the time. While it is
              pending the owner can also SYNC — take the proposed price as
              their own straight from the row. */}
          <Box
            sx={{
              flex: isPurchase ? 2 : 1.5,
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 0,
              minWidth: 0,
            }}
          >
            {hasPendingPrice &&
              adoptedSync?.nPurchaseItemId !== option.nPurchaseItemId ? (
              // A small tag ABOVE the price — always there. The REQUESTED
              // price is in its tooltip: the price on the row never moves.
              <Tooltip
                title={`Requested price: ₱ ${fmtPHP(pendingPrice)}`}
                placement="top"
                arrow
              >
                <Typography
                  sx={{
                    fontSize: "0.5rem",
                    lineHeight: 1,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: colors.pendingText,
                    cursor: "help",
                  }}
                >
                  PENDING
                </Typography>
              </Tooltip>
            ) : null}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 0.25,
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontSize: "0.7rem", lineHeight: 1.15 }}>
                ₱ {fmtPHP(
                  adoptedSync?.nPurchaseItemId === option.nPurchaseItemId
                    ? adoptedSync.dUnitPrice
                    : option.dUnitPrice,
                )}
              </Typography>
              {hasPendingPrice &&
                adoptedSync?.nPurchaseItemId !== option.nPurchaseItemId && (
                <Tooltip
                  title="Sync — adopt this pending price. The backend clears the proposal and stamps the canvass date."
                >
                  <IconButton
                    size="small"
                    onClick={handleSyncUnitPrice}
                    disabled={syncingUnitPrice}
                    aria-label="Sync pending price"
                    sx={{
                      width: 20,
                      height: 20,
                      color: colors.pendingText,
                      "&:hover": { backgroundColor: colors.rowHoverBg },
                    }}
                  >
                    <SyncOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography
              sx={{
                fontSize: "0.58rem",
                lineHeight: 1.15,
                color: colors.textSecondary,
              }}
            >
              {adoptedSync?.nPurchaseItemId === option.nPurchaseItemId
                ? fmtDate(adoptedSync.dtCanvass)
                : option.dtCanvass
                  ? fmtDate(option.dtCanvass)
                  : "—"}
            </Typography>
          </Box>

          <Box sx={{ flex: isPurchase ? 2 : 1.5, textAlign: "right" }}>
            <Typography sx={{ fontSize: "0.7rem", color: colors.textPrimary }}>
              {/* The line amount follows the unit price it belongs to —
                  the request and the price that counts switch together,
                  so the row never shows a unit price that does not add
                  up. */}
              ₱ {fmtPHP(
                option.nQuantity *
                  (adoptedSync?.nPurchaseItemId === option.nPurchaseItemId
                    ? adoptedSync.dUnitPrice
                    : option.dUnitPrice),
              )}
            </Typography>
          </Box>

          {/* THE EWT — after the total, with the TYPE under it. */}
          <Box
            sx={{
              flex: 1.5,
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 0,
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontSize: "0.7rem", lineHeight: 1.15 }}>
              ₱ {fmtPHP(
                ewtOfOption({
                  ...option,
                  dUnitPrice:
                    adoptedSync?.nPurchaseItemId === option.nPurchaseItemId
                      ? adoptedSync.dUnitPrice
                      : option.dUnitPrice,
                }),
              )}
            </Typography>
            {ewtTypeLabel && (
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  lineHeight: 1.15,
                  color: colors.textSecondary,
                }}
              >
                {ewtTypeLabel}
              </Typography>
            )}
          </Box>

          {checkboxOptionsEnabled && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 0,
              }}
            >
              {isPurchase ? (
                isCancelled ? (
                  // A CANCELLED order is still an order — the cart is
                  // where it lives, so the button goes there (the eye
                  // that used to open the details modal is gone).
                  <BaseButton
                    icon={
                      eyeViewCart ? (
                        <Visibility
                          sx={{ fontSize: "0.9rem", color: colors.viewColor }}
                        />
                      ) : (
                        <ShoppingCart
                          sx={{ fontSize: "0.9rem", color: colors.viewColor }}
                        />
                      )
                    }
                    tooltip="View Cart"
                    onClick={handleViewCart}
                    disabled={rowDisabled}
                    size="small"
                  />
                ) : (
                  <CartActionButtons
                    latestHistory={latestHistory}
                    option={option}
                    // Purchase page shows the eye glyph for View Cart.
                    eyeViewCart={eyeViewCart}
                    isIncluded={isIncluded}
                    cartKey={cartKey}
                    forApprovalKey={forApprovalKey}
                    forPaymentKey={forPaymentKey}
                    pendingReceiptKey={pendingReceiptKey}
                    forDeliveryKey={forDeliveryKey}
                    deliveredKey={deliveredKey}
                    onEditOption={onEditOption}
                    onAddToCart={handleAddToCart}
                    onRemoveRequest={() => setConfirmRemove(true)}
                    removing={removing}
                    onViewCart={handleViewCart}
                    isProgressed={isProgressed}
                    isInCart={isInCart}
                    isAssignedToMe={!isAssignedToMe}
                    readOnly={readOnly}
                    colors={colors}
                  />
                )
              ) : (
                <>
                  <BaseButton
                    icon={<Edit sx={{ fontSize: "0.9rem" }} />}
                    tooltip="Edit"
                    onClick={() => onEditOption(option)}
                    size="small"
                  />
                  <BaseButton
                    icon={<Delete sx={{ fontSize: "0.9rem" }} />}
                    tooltip="Delete"
                    onClick={() => onDeleteOption(itemId, option)}
                    disabled={option.bIncluded}
                    size="small"
                  />
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {expandedOptions[option.id] && (
        <Paper
          elevation={1}
          sx={{
            mt: 0,
            borderBottom: `2px solid ${colors.specsBorder}`,
            background: colors.specsBodyBg,
            overflow: "hidden",
            borderRadius: 0,
            position: "relative",
            opacity: rowDisabled ? 0.8 : 1,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 62,
              top: 0,
              width: 24,
              height: 32,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <svg
              width="24"
              height="32"
              style={{ overflow: "visible", display: "block" }}
            >
              <line
                x1="6"
                y1="-14"
                x2="6"
                y2="16"
                stroke={colors.connectorLine}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="16"
                x2="25"
                y2="16"
                stroke={colors.connectorLine}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 0.5,
              backgroundColor: colors.specsHeaderBg,
              borderBottom: `1px solid ${colors.specsHeaderBorder}`,
              fontWeight: 600,
              color: colors.specsHeaderText,
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
              pl: 12,
              cursor: rowDisabled ? "default" : "pointer",
            }}
            onClick={() => !rowDisabled && onToggleOptionSpecs(option.id)}
          >
            <span>Specifications</span>
            <Box sx={{ display: "flex", gap: 1 }}>
              {!statusChangedAlert &&
                !readOnly &&
                (!isPurchase || !isAssignedToMe) && (
                  <MiniBaseButton
                    icon={<CompareArrows />}
                    label="Compare"
                    variant="blue"
                    disabled={rowDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!rowDisabled) onCompareClick(item, option);
                    }}
                  />
                )}
              <MiniBaseButton
                icon={<ExpandLess />}
                label="Hide"
                variant="blue"
                disabled={rowDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!rowDisabled) onToggleOptionSpecs(option.id);
                }}
              />
            </Box>
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1,
              pl: 15,
              maxHeight: 100,
              overflowY: "auto",
              backgroundColor: colors.specsContentBg,
              color: colors.specsContentText,
              fontSize: "0.7rem",
              "& *": { backgroundColor: "transparent !important" },
              "& ul": { paddingLeft: 2, margin: 0, listStyleType: "disc" },
              "& ol": { paddingLeft: 2, margin: 0, listStyleType: "decimal" },
              "& li": { marginBottom: 0.25 },
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{
              __html: option.strSpecs || "No specifications available.",
            }}
          />
        </Paper>
      )}

      {/* Remove-from-cart asks once before it pulls the option off its PO. */}
      <PurchaseCartUpdateModal
        open={confirmRemove}
        action="remove_from_cart"
        loading={removing}
        onConfirm={handleRemoveFromCart}
        onClose={() => setConfirmRemove(false)}
      />
      </React.Fragment>
  );
};

export default PurchaseOptionRow;
