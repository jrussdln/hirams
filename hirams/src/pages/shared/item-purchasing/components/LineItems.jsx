import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";
import InventoryAPI from "../../../../api/endpoints/inventory.api.js";
import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";

import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { ewtOfOption, totalEWT } from "../../../../utils/helpers/calculateEWT.js";
import {
  getToReceive,
  getToDeliver,
} from "../../../../utils/helpers/purchaseProgress.js";
import CartRowPanel from "./shared/CartRowPanel.jsx";
import PurchaseCartUpdateModal from "../modal/PurchaseCartUpdateModal.jsx";
import MoveItemModal from "../modal/MoveItemModal.jsx";

const useColors = (c) => ({
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  border: c.slate.border,
  scrollbarThumb: c.slate.scrollbarThumb,
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
        background: bg || c.mutedBg,
        border: border || `0.5px solid ${c.mutedBorder}`,
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

export default function LineItems({
  options,
  // The PO's number — shown in the remove-from-cart confirmation badge.
  poNumber = "",
  // The PO's freight charge — printed above the EWT line in the total row.
  freight = 0,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  currentUserId,
  // Management pages pass true; AO / AOTL surfaces pass their real flag —
  // the backend's cart permission is management · AO · AOTL.
  isManagement = true,
  onRemoved,
  poStatus,
  anyOptionArrived,
  onRowClick,
  onBrandClick,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  const [removingOptionId, setRemovingOptionId] = useState(null);
  const [inventoryRows, setInventoryRows] = useState({});

  // The remove button first asks — the row only carries the id it wants
  // gone; the actual call waits for "Yes, Remove Item".
  const [removeConfirmId, setRemoveConfirmId] = React.useState(null);
  const confirmRemoveOption = async () => {
    const id = removeConfirmId;
    setRemoveConfirmId(null);
    await removeOption(id);
  };

  // The MOVE modal picks the destination; the row only opens the modal.
  const [moveItemId, setMoveItemId] = React.useState(null);
  const handleMoveItem = async (nPurchaseItemId, nTargetPurchaseOrderId) => {
    await PurchaseOrderAPI.moveItem({
      nPurchaseItemId,
      nTargetPurchaseOrderId,
      nUserId: currentUserId,
      isManagement,
    });
    await onRemoved?.();
    window.dispatchEvent(new CustomEvent("cart_data_updated"));
  };

  const removeOption = async (nPurchaseItemId) => {
    setRemovingOptionId(nPurchaseItemId);
    try {
      await PurchaseOrderAPI.removeFromCart({
        nPurchaseItemId,
        nUserId: currentUserId,
        isManagement: true,
      });
      if (options.length <= 1) {
        window.dispatchEvent(new CustomEvent("cart_data_updated"));
        navigate("/item-purchasing");
        return;
      }
      await onRemoved?.();
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    } finally {
      setRemovingOptionId(null);
    }
  };

  useEffect(() => {
    const isArrivedStatus = [
      forPaymentKey,
      pendingReceiptKey,
      forDeliveryKey,
      deliveredKey,
    ]
      .map(String)
      .includes(String(poStatus));
    if (!isArrivedStatus) return;

    const arrivedOptionIds = options
      .map((opt) => opt.purchase_option?.nPurchaseItemId)
      .filter(Boolean);
    if (arrivedOptionIds.length === 0) return;
    const fetchAll = async () => {
      const results = {};
      for (const id of arrivedOptionIds) {
        try {
          const res = await InventoryAPI.getHistory(id);
          results[id] = res?.rows || res?.inventory || [];
        } catch (e) {
          results[id] = [];
        }
      }
      setInventoryRows(results);
    };
    fetchAll();
  }, [
    options,
    poStatus,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
  ]);

  const localTotal = options.reduce(
    (sum, o) =>
      sum +
      (o.purchase_option?.nQuantity || 0) *
        (o.purchase_option?.dUnitPrice || 0),
    0,
  );
  // The EWT is derived — see utils/helpers/calculateEWT.js
  const localEwtTotal = totalEWT(options);
  const hasAnyEWT = options.some((o) => ewtOfOption(o) > 0);

  // Same rule as the cards:
  //   Pending Receipt : hide fully received rows (0 left to receive)
  //   For Delivery    : hide fully delivered rows (0 left to deliver)
  const isPendingReceiptPO = String(poStatus) === String(pendingReceiptKey);
  const isForDeliveryPO = String(poStatus) === String(forDeliveryKey);
  const visibleOptions = isPendingReceiptPO
    ? options.filter((o) => getToReceive(o.purchase_option) > 0)
    : isForDeliveryPO
      ? options.filter((o) => getToDeliver(o.purchase_option) > 0)
      : options;

  // The rows carry their own sticky header (the first row renders it), so
  // these flags only decide what each row shows.
  // A cart-stage order — Cart, For Approval or For Payment — still lets a
  // line be pulled back out of it. From Pending Receipt on the line is
  // moving through the warehouse.
  const showRemove = [cartKey, forApprovalKey, forPaymentKey]
    .map(String)
    .includes(String(poStatus));
  const showArrived = [pendingReceiptKey, forDeliveryKey, deliveredKey]
    .map(String)
    .includes(String(poStatus));

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: "10px",
        border: `0.5px solid ${c.border}`,
        overflowY: "auto",
        maxHeight: "50vh",
        "&::-webkit-scrollbar": { height: 5, width: 3 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: c.scrollbarThumb,
          borderRadius: 2,
        },
      }}
    >
      {visibleOptions.map((optRow, idx) => {
        const p = optRow.purchase_option;
        const nPurchaseItemId = p?.nPurchaseItemId;
        const isAtPurchaseOrderStage =
          String(poStatus) === String(cartKey) ||
          String(poStatus) === String(forApprovalKey) ||
          String(poStatus) === String(forPaymentKey);
        const showQty = true;

        const showPOPricing = isAtPurchaseOrderStage && !showArrived;
        let arrivedStats = null;
        if (showArrived) {
          const allRows = inventoryRows[nPurchaseItemId] || [];
          const sumBy = (test) =>
            allRows
              .filter(test)
              .reduce((sum, r) => sum + Math.abs(Number(r.nQuantity) || 0), 0);
          const pendingRcvdSum = sumBy(
            (r) =>
              Number(r.nQuantity) > 0 && String(r.cStatus || "").trim() === "P",
          );
          const approvedRcvdSum = sumBy(
            (r) =>
              Number(r.nQuantity) > 0 && String(r.cStatus || "").trim() === "A",
          );
          const pendingDlvdSum = sumBy(
            (r) =>
              Number(r.nQuantity) < 0 && String(r.cStatus || "").trim() === "P",
          );
          const approvedDlvdSum = sumBy(
            (r) =>
              Number(r.nQuantity) < 0 && String(r.cStatus || "").trim() === "A",
          );
          // approvedRcvd / approvedDlvd must be APPROVED ("A") only:
          // CartRowPanel adds pendingRcvd / pendingDlvd on top of them.
          // nInventoryQty / nDeliveredQty are A + P, so using those here
          // would count the pending rows twice.
          arrivedStats = {
            totalQty: p?.nQuantity || 0,
            approvedRcvd:
              approvedRcvdSum || Number(p?.nApprovedReceivedQty) || 0,
            pendingRcvd: pendingRcvdSum || Number(p?.nPendingReceivedQty) || 0,
            approvedDlvd:
              approvedDlvdSum || Number(p?.nApprovedDeliveredQty) || 0,
            pendingDlvd: pendingDlvdSum || Number(p?.nPendingDeliveredQty) || 0,
          };
        }

        return (
          <CartRowPanel
            key={optRow.nPurchaseOrder_ItemId ?? idx}
            variant="item"
            opt={optRow}
            idx={idx}
            totalCount={visibleOptions.length}
            colors={base}
            tableLayout
            onRowClick={onRowClick}
            onBrandClick={onBrandClick}
            showRemove={showRemove}
            showMove={showRemove}
            onMove={setMoveItemId}
            isRemoving={removingOptionId === nPurchaseItemId}
            removingOptionId={removingOptionId}
            onRemove={setRemoveConfirmId}
            hasAnyEWT={hasAnyEWT}
            showQty={showQty}
            showPricing={showPOPricing}
            poIsPaidRcvdDvrd={showArrived}
            isPendingReceipt={isPendingReceiptPO}
            isForDelivery={String(poStatus) === String(forDeliveryKey)}
            isDelivered={String(poStatus) === String(deliveredKey)}
            arrivedStats={arrivedStats}
          />
        );
      })}
      {!anyOptionArrived && (
        <CartRowPanel
          variant="total"
          colors={base}
          itemCount={options.length}
          totalAmount={localTotal}
          ewtAmount={localEwtTotal}
          // The PO's freight charge — printed above the EWT line.
          freightAmount={Number(freight) || 0}
        />
      )}
      {/* Remove-from-cart asks once before it pulls the line off its PO. */}
      <PurchaseCartUpdateModal
        open={removeConfirmId !== null}
        action="remove_from_cart"
        purchaseOrderNumber={poNumber}
        loading={removingOptionId !== null}
        onConfirm={confirmRemoveOption}
        onClose={() => setRemoveConfirmId(null)}
      />
      {/* Moving a line: the other cart-stage orders it can live under. */}
      <MoveItemModal
        open={moveItemId !== null}
        handleClose={() => setMoveItemId(null)}
        sourcePoNumber={poNumber}
        itemId={moveItemId}
        currentUserId={currentUserId}
        isManagement={isManagement}
        onMove={handleMoveItem}
      />
    </Box>
  );
}
