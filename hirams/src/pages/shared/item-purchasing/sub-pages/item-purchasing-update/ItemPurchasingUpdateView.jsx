import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import {
  ReceiptLongOutlined,
  AccountCircleOutlined,
} from "@mui/icons-material";

import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import { CartUpdateSkeleton } from "../../components/shared/Skeleton.jsx";
import CartProgressStepper from "../../components/CartProgressStepper.jsx";
import LineItems from "../../components/LineItems.jsx";
import PendingReceiptPanel from "../../components/PendingReceiptPanel.jsx";
import ForDeliveryPanel from "../../components/ForDeliveryPanel.jsx";
import DeliveredPanel from "../../components/DeliveredPanel.jsx";
import PurchaseCartUpdateModal from "../../modal/PurchaseCartUpdateModal.jsx";
import PODetailsUpdateModal from "../../modal/PODetailsUpdateModal.jsx";
import ManagePOVoucherModal from "../../modal/ManagePOVoucherModal.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";
import {
  getToDeliver,
  getDelivered,
} from "../../../../../utils/helpers/purchaseProgress.js";
import ContentHeaderStructure from "../../../../../components/ui/structure/ContentHeaderStructure.jsx";
import CardStructure from "../../../../../components/ui/structure/CardStructure.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";

const useColors = (c) => ({
  border: c.slate.border,
  borderFaint: c.slate.divider,
  bgCard: c.slate.outerBg,
  bgHeader: c.slate.itemHeaderBg,
  bgSubCard: c.slate.innerBg,
  bgOrangeBadge: c.badge.orangeBg,
  bgAmberBadge: c.badge.amberBg,
  textMuted: c.gray.textSecondary,
  textMutedAlt: c.gray.textDisabled,
  textBody: c.gray.textPrimary,
  textBodySoft: c.gray.textHeading,
  textOrange: c.orange.text,
  textOrangeDark: c.amber.text,
  textAmber: c.amber.text,
  borderOrange: c.orange.border,
  borderAmber: c.amber.border,
  buttonBg: c.slate.btnBg,
  buttonHover: c.slate.btnHoverBg,
  danger: c.red.text,
});

// ─────────────────────────────────────────────────────────────────
// VARIANT COLORS — accent border + icon color per InfoCard variant
// ─────────────────────────────────────────────────────────────────
const VARIANT_COLORS = (c) => ({
  default: { border: c.slate.border, icon: c.gray.textSecondary },
  info: { border: c.blue.border, icon: c.blue.text },
  success: { border: c.green.border, icon: c.green.text },
  warn: { border: c.amber.border, icon: c.amber.text },
});

export const IconBox = ({
  size = 34,
  bg,
  border,
  radius = "8px",
  mr = 1,
  children,
  sx = {},
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg || c.bgSubCard,
        border: border || `0.5px solid ${c.borderFaint}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        mr,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────
// InfoCard — styled sub-card used inside the PO header
// ─────────────────────────────────────────────────────────────────
export const InfoCard = ({
  icon,
  label,
  variant = "default",
  flex = 1,
  minWidth,
  children,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  const v = React.useMemo(
    () => VARIANT_COLORS(base)[variant] ?? VARIANT_COLORS(base).default,
    [base, variant],
  );

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        flex,
        minWidth,
        px: 1,
        py: 0.75,
        borderRadius: "8px",
        background: c.bgSubCard,
        border: `0.5px solid ${v.border}`,
        borderLeft: `3px solid ${v.border}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mb: 0.3 }}>
        {React.cloneElement(icon, {
          sx: { fontSize: { xs: "0.55rem", sm: "0.6rem" }, color: v.icon },
        })}
        <Typography
          sx={{
            fontSize: { xs: "0.55rem", sm: "0.6rem" },
            fontWeight: 700,
            color: v.icon,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>

      <Box
        sx={{
          position: "absolute",
          right: -6,
          bottom: -6,
          width: 44,
          height: 44,
          opacity: isDark ? 0.1 : 0.07,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 64, color: v.icon } })}
      </Box>
    </Box>
  );
};

export default function ItemPurchasingUpdateView({
  po,
  initialOptionId,
  isLoadingPage,
  poVoucherStatus,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  cancelledPOKey,
  removedFromCartKey,
  voucherActiveKey,
  voucherClosedKey,
  voucherPaidKey,
  voucherSupplierTypeKey,
  currentUserId,
  shippingMethod,
  paymentTerms,
  options,
  liveOptions,
  txnItemTotals,
  txnItemOptions,
  total,
  allOptionsAtPO,
  allOptionsAtPayment,
  anyOptionArrived,
  assignedAONickName,
  receiveForms,
  setReceiveForms,
  receiveSaving,
  handleConfirmReceived,
  deliverForms,
  setDeliverForms,
  deliverSaving,
  suggestedReceiptNo,
  handleConfirmDelivered,
  saveReceiveRow,
  saveDeliverRow,
  getLineReceiptNo,
  confirmAction,
  setConfirmAction,
  actionLoading,
  showPaymentForm,
  setShowPaymentForm,
  showManageVoucher,
  setShowManageVoucher,
  paymentForm,
  setPaymentForm,
  paymentLoading,
  paymentErrors,
  isArrivedView,
  setIsArrivedView,
  arrivedFooterActions,
  setArrivedFooterActions,
  setLineItemSaving,
  handleBack,
  handleConfirm,
  handleProceedToPODetails,
  openPaymentForm,
  onPatchOption,
  fetchTransactionForPurchase,
  isManagement,
  isAccountOfficer,
  isAOTL,
  isProcurement,
  isFinanceOfficer,
  itemType,
  procMode,
  procSource,
  statusTransaction,
  archiveStatus,
  forCanvasKey,
  canvasFinalizeKey,
  canvasVerificationKey,
  itemsManagementKey,
  forCollectionKey,
  forPurchaseKey,
  ao_status,
  transacstatus,
  forPricingKey,
  priceVerificationKey,
  priceApprovalKey,
  priceSettingKey,
  priceFinalizeVerificationKey,
  itemPurchasingStatus,
  selectedStatusCode,
  handlePreviewPO,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  const currentStatus = po?.nStatus;
  const activeStatus = String(selectedStatusCode ?? currentStatus);
  // Pending receipt swaps the line-item list for the Receive panel
  const isPendingReceipt = activeStatus === String(pendingReceiptKey);
  // For Delivery / Delivered both swap the line-item list for a deliver panel
  const isForDeliveryPhase =
    activeStatus === String(forDeliveryKey) ||
    activeStatus === String(deliveredKey);

  // ── Nothing left to deliver ───────────────────────────────────────────
  // The PO keeps its For Delivery code (150) — and the card keeps the
  // ?status= tab it was opened from — until the delivered rows are approved,
  // so after the last unit goes out both still read "For Delivery". Quantities
  // are the source of truth here.
  // Same row rule ForDeliveryPanel uses to drop finished rows: transaction
  // totals (rcvd − dlvd) when they are loaded, this PO's own share otherwise.
  const rowLeft = React.useCallback(
    (opt) => {
      const t =
        txnItemTotals?.[
          opt?.purchase_option?.transaction_item?.nTransactionItemId
        ];
      return t
        ? Math.max(Number(t.rcvd) - Number(t.dlvd), 0)
        : getToDeliver(opt?.purchase_option);
    },
    [txnItemTotals],
  );
  const forDeliveryDone = React.useMemo(() => {
    const list = liveOptions ?? [];
    if (!list.length) return false;
    const dlvdOf = (o) => {
      const t =
        txnItemTotals?.[
          o?.purchase_option?.transaction_item?.nTransactionItemId
        ];
      return Math.max(getDelivered(o?.purchase_option), Number(t?.dlvd) || 0);
    };
    // Something must actually have gone out — a card that merely reads
    // For Delivery with no stock yet is not delivered — and no row may still
    // hold deliverable quantity.
    const anythingOut = list.some((o) => dlvdOf(o) > 0);
    return anythingOut && !list.some((o) => rowLeft(o) > 0);
  }, [liveOptions, txnItemTotals, rowLeft]);

  // Delivered gets its own panel (items already out) — For Delivery keeps the
  // remaining-to-deliver list. Once nothing is left the For Delivery panel
  // closes itself and falls through to Delivered.
  const isDeliveredPhase =
    activeStatus === String(deliveredKey) ||
    (forDeliveryDone && activeStatus === String(forDeliveryKey));

  // What the horizontal tracker reads — it must not sit on For Delivery while
  // an empty deliver list is on screen.
  const trackerStatus = forDeliveryDone ? deliveredKey : currentStatus;
  // A delivery line cannot go out without a receipt number (each row comes
  // pre-filled with the card's suggested number).
  const deliverMissingReceipt = Object.values(deliverForms ?? {}).some(
    (f) => Number(f.qty) > 0 && !(f.receiptNo || "").trim(),
  );
  const navigate = useNavigate();
  const firstOption = options[0];

  const companyInfo =
    firstOption?.purchase_option?.transaction_item?.transaction?.company;
  const supplierInfo = firstOption?.purchase_option?.supplier;
  const supplierId = supplierInfo?.nSupplierId ?? null;
  const transactionObj =
    firstOption?.purchase_option?.transaction_item?.transaction;
  // Deliveries are addressed to the client, not the supplier — the header
  // card swaps to this during the For Delivery / Delivered phases.
  const clientInfo = transactionObj?.client;
  // Same "Client Nickname - Transaction Code" label the card carries in the
  // For Delivery / Delivered list (e.g. "LGU VICTORIA - 6031D").
  const clientLabel =
    clientInfo?.strClientNickName || clientInfo?.strClientName || "—";
  const transactionCode = transactionObj?.strCode ?? "—";
  const [historyView, setHistoryView] = React.useState(null); // { tone, onBack } | null

  const handleViewForPurchase = async () => {
    if (!transactionObj?.nTransactionId) {
      console.warn("No transaction found on this PO to view for purchase");
      return;
    }
    const fullTransaction = await fetchTransactionForPurchase(
      transactionObj.nTransactionId,
    );
    const finalTransaction = fullTransaction || {
      ...transactionObj,
      clientName:
        transactionObj.client?.strClientNickName ||
        transactionObj.client?.strClientName ||
        "",
      companyName:
        transactionObj.company?.strCompanyNickName ||
        transactionObj.company?.strCompanyName ||
        "",
      transactionId: transactionObj.strCode,
    };
    const statusCode = String(
      finalTransaction.current_status ??
        finalTransaction.latest_history?.nStatus ??
        forPurchaseKey ??
        "",
    );
    const statusLabelMap = isManagement ? transacstatus : ao_status;
    const currentStatusLabel = statusLabelMap?.[statusCode] ?? "";
    // Route to whichever workspace the transaction's status belongs to.
    navigate(
      String(statusCode) === String(forCollectionKey)
        ? "/transaction-for-collection"
        : "/transaction-for-purchase",
      {
      state: {
        transaction: finalTransaction,
        transactionCode: finalTransaction.transactionId,
        selectedStatusCode: statusCode,
        currentStatusLabel,
        forPurchaseKey,
        currentUserId,
        cancelledPOKey,
        cartKey,
        forApprovalKey,
        forPaymentKey,
        pendingReceiptKey,
        forDeliveryKey,
        deliveredKey,
        removedFromCartKey,
        isManagement,
        isAccountOfficer,
        isAOTL,
        isProcurement,
        itemType,
        procMode,
        procSource,
        statusTransaction,
        archiveStatus,
        forCanvasKey,
        canvasFinalizeKey,
        canvasVerificationKey,
        itemsManagementKey,
        forCollectionKey,
        ao_status,
        forPricingKey,
        priceVerificationKey,
        priceApprovalKey,
        priceSettingKey,
        priceFinalizeVerificationKey,
      },
    });
  };

  const toConfirmSlot = (key) => {
    if (key === "undo_approval") return "undo_approval";
    if (key === cartKey) return "open";
    if (key === forApprovalKey) return "close";
    if (key === forPaymentKey) return "approve";
    if (key === cancelledPOKey) return "cancel";
    return key;
  };
  const confirmSlot = confirmAction ? toConfirmSlot(confirmAction) : null;

  const showPODetails =
    !isArrivedView &&
    !(
      poVoucherStatus &&
      (String(poVoucherStatus) === String(voucherActiveKey) ||
        String(poVoucherStatus) === String(voucherClosedKey))
    );

  const footerLActions = (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={
        historyView
          ? historyView.onBack
          : isArrivedView && arrivedFooterActions
            ? arrivedFooterActions.onBack
            : handleBack
      }
      actionColor="cancel"
      disabled={historyView ? false : isLoadingPage || paymentLoading}
    />
  );

  const footerRActions = historyView ? null : (
    <Box
      sx={{
        display: "flex",
        gap: 0.75,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <BaseButton
        label="Cancel"
        icon={icons.cancel}
        onClick={() => setConfirmAction(cancelledPOKey)}
        actionColor="delete"
        disabled={isLoadingPage || actionLoading}
      />

      {selectedStatusCode === forApprovalKey && !isFinanceOfficer && (
        <BaseButton
          label="Reopen"
          icon={icons.open}
          onClick={() => setConfirmAction(cartKey)}
          actionColor="default"
          disabled={isLoadingPage || actionLoading}
        />
      )}

      {selectedStatusCode === forPaymentKey && !poVoucherStatus && (
        <BaseButton
          label="Undo Approval"
          icon={icons.open}
          onClick={() => setConfirmAction("undo_approval")}
          actionColor="cancel"
          disabled={isLoadingPage || actionLoading}
        />
      )}

      {showPODetails && (
        <>
          {po?.strShippingDetails || po?.cPaymentTerms ? (
            <>
              {selectedStatusCode === cartKey && (
                <>
                  <BaseButton
                    label="Edit PO Details"
                    icon={icons.edit}
                    onClick={openPaymentForm}
                    actionColor="default"
                    disabled={isLoadingPage || paymentLoading}
                  />
                  <BaseButton
                    label="Close"
                    icon={icons.close}
                    onClick={() => setConfirmAction(forApprovalKey)}
                    actionColor="approve"
                    disabled={isLoadingPage || actionLoading}
                  />
                </>
              )}
            </>
          ) : (
            <BaseButton
              label="Proceed to PO Details"
              icon={icons.submit}
              onClick={openPaymentForm}
              actionColor="approve"
              disabled={isLoadingPage || paymentLoading}
            />
          )}
        </>
      )}

      {!isFinanceOfficer && (
        <BaseButton
          label="View For Purchase"
          icon={icons.view}
          onClick={handleViewForPurchase}
          actionColor="default"
          disabled={isLoadingPage || actionLoading}
        />
      )}
      {selectedStatusCode === pendingReceiptKey && (
        <BaseButton
          label="Confirm Received"
          icon={icons.approve}
          onClick={handleConfirmReceived}
          actionColor="approve"
          disabled={
            isLoadingPage ||
            actionLoading ||
            receiveSaving ||
            !Object.values(receiveForms).some((f) => Number(f.qty) > 0)
          }
        />
      )}
      {isForDeliveryPhase && !isDeliveredPhase && (
        <BaseButton
          label="Confirm Delivered"
          icon={icons.approve}
          onClick={handleConfirmDelivered}
          actionColor="approve"
          disabled={
            isLoadingPage ||
            actionLoading ||
            deliverSaving ||
            !Object.values(deliverForms).some((f) => Number(f.qty) > 0) ||
            deliverMissingReceipt
          }
        />
      )}
      {(allOptionsAtPO || allOptionsAtPayment) && (
        <BaseButton
          label="View PO"
          icon={<ReceiptLongOutlined sx={{ fontSize: "1rem" }} />}
          onClick={handlePreviewPO}
          actionColor="default"
          disabled={isLoadingPage || actionLoading}
        />
      )}

      {selectedStatusCode === forPaymentKey && (
        <BaseButton
          label="Manage Voucher"
          icon={icons.manage}
          onClick={() => setShowManageVoucher(true)}
          actionColor="approve"
          disabled={isLoadingPage || actionLoading}
        />
      )}

      {selectedStatusCode === forApprovalKey &&
        (isFinanceOfficer || isManagement) && (
          <BaseButton
            label="Approve"
            icon={icons.approve}
            onClick={() => setConfirmAction(forPaymentKey)}
            actionColor="approve"
            disabled={isLoadingPage || actionLoading}
          />
        )}
    </Box>
  );

  const showShippingPaymentRow =
    !isArrivedView &&
    !anyOptionArrived &&
    (currentStatus === forApprovalKey || allOptionsAtPO) &&
    (po?.strShippingDetails || po?.cPaymentTerms);

  const PurchaseOrderHeader = (
    <ContentHeaderStructure
      p={1.5}
      mb={1}
      textAlign="left"
      fontSize="inherit"
      lineHeight="inherit"
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 0.75, sm: 1 },
          alignItems: "stretch",
        }}
      >
        {/* Company Card */}
        <CardStructure icon="bank" label="Company" variant="info">
          <Typography
            sx={{
              fontSize: { xs: "0.6rem", sm: "0.65rem" },
              fontWeight: 700,
              color: c.textBody,
              mb: 0.2,
            }}
          >
            {companyInfo?.strCompanyName ?? "—"}
          </Typography>
          {companyInfo?.strAddress && (
            <Typography
              sx={{
                fontSize: { xs: "0.5rem", sm: "0.55rem" },
                color: c.textMuted,
              }}
            >
              {companyInfo.strAddress}
            </Typography>
          )}
          {companyInfo?.strTIN && (
            <Typography
              sx={{
                fontSize: { xs: "0.5rem", sm: "0.55rem" },
                color: c.textMutedAlt,
                mt: 0.2,
              }}
            >
              TIN: {companyInfo.strTIN}
            </Typography>
          )}
        </CardStructure>

        {/* Supplier Card — For Delivery / Delivered shows the Client instead */}
        {isForDeliveryPhase ? (
          <CardStructure icon="assign" label="Client" variant="warn">
            <Typography
              sx={{
                fontSize: { xs: "0.6rem", sm: "0.65rem" },
                fontWeight: 700,
                color: c.textBody,
                mb: 0.2,
              }}
            >
              {clientInfo?.strClientName ||
                clientInfo?.strClientNickName ||
                "—"}
            </Typography>
            {clientInfo?.strAddress && (
              <Typography
                sx={{
                  fontSize: { xs: "0.5rem", sm: "0.55rem" },
                  color: c.textMuted,
                }}
              >
                {clientInfo.strAddress}
              </Typography>
            )}
            {clientInfo?.strTIN && (
              <Typography
                sx={{
                  fontSize: { xs: "0.5rem", sm: "0.55rem" },
                  color: c.textMutedAlt,
                  mt: 0.2,
                }}
              >
                TIN: {clientInfo.strTIN}
              </Typography>
            )}
          </CardStructure>
        ) : (
          <CardStructure icon="phone" label="Supplier" variant="warn">
            <Typography
              sx={{
                fontSize: { xs: "0.6rem", sm: "0.65rem" },
                fontWeight: 700,
                color: c.textBody,
                mb: 0.2,
              }}
            >
              {supplierInfo?.strSupplierName ?? "—"}
            </Typography>
            {supplierInfo?.strAddress && (
              <Typography
                sx={{
                  fontSize: { xs: "0.5rem", sm: "0.55rem" },
                  color: c.textMuted,
                }}
              >
                {supplierInfo.strAddress}
              </Typography>
            )}
            {supplierInfo?.strTIN && (
              <Typography
                sx={{
                  fontSize: { xs: "0.5rem", sm: "0.55rem" },
                  color: c.textMutedAlt,
                  mt: 0.2,
                }}
              >
                TIN: {supplierInfo.strTIN}
              </Typography>
            )}
          </CardStructure>
        )}

        {/* PO Number + Assigned AO */}
        {(allOptionsAtPO || allOptionsAtPayment) && (
          <CardStructure
            icon="check"
            label="Purchase Order"
            variant="success"
            flex="0 0 auto"
            minWidth={{ xs: "100%", sm: "140px" }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: { xs: "0.65rem", sm: "0.72rem" },
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: c.textBodySoft,
                  lineHeight: 1.2,
                  letterSpacing: "0.3px",
                }}
              >
                {po?.strPurchaseOrderNo ?? "—"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccountCircleOutlined
                  sx={{
                    fontSize: { xs: "0.6rem", sm: "0.7rem" },
                    color: c.textMuted,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: "0.55rem", sm: "0.6rem" },
                    color: c.textBodySoft,
                    fontWeight: 500,
                  }}
                >
                  {assignedAONickName}
                </Typography>
              </Box>
            </Box>
          </CardStructure>
        )}
      </Box>

      {/* Shipping + Payment Row */}
      {showShippingPaymentRow && (
        <Box
          sx={{
            mt: 1,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 0.75, sm: 1 },
            alignItems: "flex-start",
          }}
        >
          {po?.strShippingDetails && (
            <CardStructure
              icon="bank"
              label="Shipping Details"
              variant="default"
            >
              <Box
                sx={{
                  maxHeight: "20px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: 0.25,
                  "&::-webkit-scrollbar": { width: "3px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: c.border,
                    borderRadius: "3px",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.55rem", sm: "0.6rem" },
                    fontWeight: 500,
                    color: c.textBody,
                    lineHeight: 1.3,
                  }}
                  dangerouslySetInnerHTML={{ __html: po.strShippingDetails }}
                />
              </Box>
            </CardStructure>
          )}
          {po?.cPaymentTerms && (
            <CardStructure icon="tin" label="Payment Terms" variant="default">
              <Box
                sx={{
                  maxHeight: "20px",
                  minHeight: "20px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: 0.25,
                  "&::-webkit-scrollbar": { width: "3px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: c.border,
                    borderRadius: "3px",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.55rem", sm: "0.6rem" },
                    fontWeight: 500,
                    color: c.textBody,
                    lineHeight: 1.3,
                  }}
                >
                  {paymentTerms?.[po.cPaymentTerms] ?? po.cPaymentTerms}
                </Typography>
              </Box>
            </CardStructure>
          )}
        </Box>
      )}
    </ContentHeaderStructure>
  );

  return (
    <PageLayout
      title="Item Purchasing"
      subtitle={
        // For Delivery / Delivered are addressed per client — show the same
        // "Client Nickname - Transaction Code" label as the card instead of
        // the status + PO number used by every other phase.
        isForDeliveryPhase && clientInfo
          ? `${clientLabel} - ${transactionCode}`
          : po?.strPurchaseOrderNo
            ? `${itemPurchasingStatus[selectedStatusCode]} / ${po.strPurchaseOrderNo}`
            : ""
      }
      footerLActions={footerLActions}
      footerRActions={footerRActions}
      loading={isLoadingPage || paymentLoading}
    >
      {isLoadingPage && !paymentLoading ? (
        <CartUpdateSkeleton />
      ) : !po ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", color: c.textBodySoft }}>
            Purchase order not found.
          </Typography>
          <BaseButton
            label="Back to Cart"
            onClick={handleBack}
            actionColor="default"
          />
        </Box>
      ) : (
        <>
          <CartProgressStepper
            options={liveOptions}
            cartKey={cartKey}
            forApprovalKey={forApprovalKey}
            forPaymentKey={forPaymentKey}
            pendingReceiptKey={pendingReceiptKey}
            forDeliveryKey={forDeliveryKey}
            deliveredKey={deliveredKey}
            cancelledPOKey={cancelledPOKey}
            poStatus={trackerStatus}
          />
          {PurchaseOrderHeader}
          {isPendingReceipt ? (
            <PendingReceiptPanel
              options={liveOptions}
              forms={receiveForms}
              setForms={setReceiveForms}
              patchOption={onPatchOption}
              nPurchaseOrderId={po?.nPurchaseOrderId}
              poNumber={po?.strPurchaseOrderNo}
              currentUserId={currentUserId}
              pendingReceiptKey={pendingReceiptKey}
              forDeliveryKey={forDeliveryKey}
              deliveredKey={deliveredKey}
            />
          ) : isDeliveredPhase ? (
            <DeliveredPanel
              options={liveOptions}
              txnTotals={txnItemTotals}
              suggestedReceiptNo={suggestedReceiptNo}
              onSaveDeliver={saveDeliverRow}
              savingDeliver={deliverSaving}
              onLoadReceiptNo={getLineReceiptNo}
              txnItemOptions={txnItemOptions}
            />
          ) : isForDeliveryPhase ? (
            <ForDeliveryPanel
              options={liveOptions}
              forms={deliverForms}
              setForms={setDeliverForms}
              txnTotals={txnItemTotals}
              suggestedReceiptNo={suggestedReceiptNo}
              onSaveReceive={saveReceiveRow}
              savingReceive={receiveSaving}
              onLoadReceiptNo={getLineReceiptNo}
              txnItemOptions={txnItemOptions}
            />
          ) : (
            options.length > 0 && (
              <>
                <Box
                  sx={{
                    pt: 1,
                    pb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: c.textMutedAlt,
                    }}
                  >
                    Purchase Items
                  </Typography>
                  <Box
                    sx={{ flex: 1, height: "0.5px", background: c.border }}
                  />
                </Box>
                <LineItems
                  onHistoryViewChange={setHistoryView}
                  options={liveOptions}
                  nPurchaseOrderId={po?.nPurchaseOrderId}
                  poNumber={po?.strPurchaseOrderNo}
                  initialArrivedOptionId={initialOptionId}
                  onPatchOption={onPatchOption}
                  total={total}
                  cartKey={cartKey}
                  forApprovalKey={forApprovalKey}
                  forPaymentKey={forPaymentKey}
                  pendingReceiptKey={pendingReceiptKey}
                  forDeliveryKey={forDeliveryKey}
                  deliveredKey={deliveredKey}
                  removedFromCartKey={removedFromCartKey}
                  currentUserId={currentUserId}
                  poStatus={currentStatus}
                  onArrivedViewChange={setIsArrivedView}
                  onFooterActionsChange={setArrivedFooterActions}
                  onRemoved={() => {
                    window.dispatchEvent(new CustomEvent("cart_data_updated"));
                  }}
                  onSavingChange={setLineItemSaving}
                  anyOptionArrived={anyOptionArrived}
                />
              </>
            )
          )}
        </>
      )}
      <PurchaseCartUpdateModal
        open={!!confirmAction}
        action={confirmSlot}
        purchaseOrderNumber={po?.strPurchaseOrderNo}
        loading={actionLoading}
        onConfirm={handleConfirm}
        onClose={() => setConfirmAction(null)}
      />
      <PODetailsUpdateModal
        open={showPaymentForm}
        poNumber={po?.strPurchaseOrderNo}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        paymentErrors={paymentErrors}
        paymentTerms={paymentTerms}
        loading={paymentLoading}
        onSubmit={handleProceedToPODetails}
        onClose={() => setShowPaymentForm(false)}
      />
      <ManagePOVoucherModal
        open={showManageVoucher}
        onClose={() => setShowManageVoucher(false)}
        po={po}
        supplierId={supplierId}
        voucherActiveKey={voucherActiveKey}
        isEditable={isFinanceOfficer || isManagement}
        voucherSupplierTypeKey={voucherSupplierTypeKey}
        onSuccess={async () => {
          window.dispatchEvent(new CustomEvent("purchase_order_data_updated"));
        }}
      />
    </PageLayout>
  );
}
