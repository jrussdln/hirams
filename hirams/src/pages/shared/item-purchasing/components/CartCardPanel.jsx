import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  AccessTimeOutlined,
  CancelOutlined,
  Visibility,
} from "@mui/icons-material";

import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";
import InventoryAPI from "../../../../api/endpoints/inventory.api.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { fmtDate, fmtPHP, fmtQty } from "../../../../utils/formatters/formatter.js";
import { ewtOfOption, totalEWT } from "../../../../utils/helpers/calculateEWT.js";
import { CART_STATUS_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import CartRowPanel from "./shared/CartRowPanel.jsx";
import PurchaseCartUpdateModal from "../modal/PurchaseCartUpdateModal.jsx";
import MoveItemModal from "../modal/MoveItemModal.jsx";
import { BadgeCycler } from "./shared/Stamp.jsx";
import {
  getOptionArrival,
  getPoArrival,
  getArrivalBadges,
  getToReceive,
  getToDeliver,
  getDelivered,
} from "../../../../utils/helpers/purchaseProgress.js";
const getColor = (colors, path) =>
  path.split(".").reduce((obj, key) => obj?.[key], colors);

const useColors = (c) => ({
  border: c.slate.border,
  borderRow: c.slate.borderRow,
  bgCard: c.slate.outerBg,
  itemHeaderBg: c.slate.itemHeaderBg,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  textHeading: c.gray.textHeading,
  slateMutedColor: c.slate.mutedColor,
  orangeText: c.orange.text,
  blueText: c.blue.text,
  blueBg: c.blue.bg,
  blueBorder: c.blue.border,
  blueTextStrong: c.blue.textStrong,
  greenText: c.green.text,
  redText: c.red.text,
  redBg: c.red.bg,
  redBorder: c.red.border,
  hoverBg: c.slate.hover,
  btnBg: c.slate.btnBg,
  btnBorder: c.slate.btnBorder,
  btnHoverBg: c.slate.btnHoverBg,
  scrollbarThumb: c.slate.scrollbarThumb,
});

export default function CartCardPanel({
  po,
  viewStatus,
  cartStatus,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  cancelledPOKey,
  currentUserId,
  // Management pages pass true; AO / AOTL surfaces pass their real flag —
  // the backend's cart permission is management · AO · AOTL.
  isManagement = true,
  onUpdateClick,
  collapsed,
  onRemoved,
  voucherStatus,
  voucherActiveKey,
  voucherClosedKey,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  const cardShadow = base.shadow.cart;
  const innerShadowColor = base.slate.stampRing;

  const stamps = Object.fromEntries(
    Object.entries(CART_STATUS_STYLES).map(([key, val]) => [
      key,
      {
        label: val.label,
        color: getColor(base, val.colorKey),
        bg: getColor(base, val.bgKey),
        border: getColor(base, val.borderKey),
        inner: innerShadowColor,
      },
    ]),
  );

  const [open, setOpen] = useState(!collapsed);
  const [removingOptionId, setRemovingOptionId] = useState(null);
  const [inventoryRows, setInventoryRows] = useState({});

  useEffect(() => {
    setOpen(!collapsed);
  }, [collapsed]);

  const options = po.purchase_order_options || [];
  // The EWT is derived — see utils/helpers/calculateEWT.js
  const hasAnyEWT = options.some((o) => ewtOfOption(o) > 0);

  // The tab being viewed drives the row labels and which rows are hidden:
  // a PO can be listed under For Delivery while its status is still Pending
  // Receipt. Falls back to the PO's own status for every other caller.
  const listStatus = viewStatus ?? po.nStatus;
  const isPendingReceiptPO = String(listStatus) === String(pendingReceiptKey);
  const isForDeliveryPO = String(listStatus) === String(forDeliveryKey);
  const isDeliveredPO = String(listStatus) === String(deliveredKey);
  // A called-off order — the card says WHEN it went down.
  const isCancelledPO = String(po.nStatus) === String(cancelledPOKey);

  // Same card in multiple tabs — only the hidden row differs:
  //   Pending Receipt : hide fully received rows (0 left to receive)
  //   For Delivery    : hide fully delivered rows (0 left to deliver)
  //   Delivered       : hide rows with nothing delivered yet
  // The card itself always stays visible.
  const visibleOptions = isPendingReceiptPO
    ? options.filter((o) => getToReceive(o.purchase_option) > 0)
    : isForDeliveryPO
      ? options.filter((o) => getToDeliver(o.purchase_option) > 0)
      : isDeliveredPO
        ? options.filter((o) => getDelivered(o.purchase_option) > 0)
        : options;

  // ── Load inventory rows so approved (A) and pending (P) can be split ──
  useEffect(() => {
    const ids = (po.purchase_order_options || [])
      .map((o) => o.purchase_option)
      .filter((p) => (p?.nInventoryQty || 0) > 0 || (p?.nDeliveredQty || 0) > 0)
      .map((p) => p.nPurchaseItemId)
      .filter(Boolean);
    if (!ids.length) return;

    let active = true;
    const load = async () => {
      try {
        // ONE call for every item of this PO — the bulk endpoint queries
        // all ids in a single request instead of one history GET per item
        // queued on the server.
        const res = await InventoryAPI.getHistoryBulk(ids);
        // An item with no inventory rows yet still maps to an empty list,
        // or its stats would read as "not loaded" forever.
        const rowsMap = { ...(res?.rows ?? {}) };
        for (const id of ids) rowsMap[id] ??= [];
        if (active) setInventoryRows(rowsMap);
      } catch {
        if (active) setInventoryRows({});
      }
    };
    load();
    window.addEventListener("inventory_data_updated", load);
    return () => {
      active = false;
      window.removeEventListener("inventory_data_updated", load);
    };
  }, [po]);

  const statsFor = (p) => {
    const rows = inventoryRows[p?.nPurchaseItemId];
    if (!rows) return null; // not loaded yet
    const a = getOptionArrival(p, rows);
    return {
      totalQty: a.ordered,
      approvedRcvd: a.approvedReceived,
      pendingRcvd: a.pendingReceived,
      approvedDlvd: a.approvedDelivered,
      pendingDlvd: a.pendingDelivered,
    };
  };
  const stampConfig = (() => {
    const status = String(po.nStatus ?? "");

    if (status === String(cancelledPOKey))
      return { type: "single", ...stamps.VOID };

    // ✅ RCVD / DLVRD percentage badges
    const arrival = getPoArrival(options, inventoryRows);
    const badges = getArrivalBadges(arrival).map(({ type, pct }) => ({
      ...stamps[type],
      pct,
    }));
    if (badges.length > 0) return { type: "multi", badges };

    const stepOrder = [
      { key: cartKey, stamp: stamps.CART },
      { key: forApprovalKey, stamp: stamps.PO },
      { key: forPaymentKey, stamp: stamps.PENDING },
      { key: pendingReceiptKey, stamp: stamps.PAID },
      { key: forDeliveryKey, stamp: stamps.RCVD },
      { key: deliveredKey, stamp: stamps.DLVRD },
    ];
    for (const { key, stamp } of stepOrder)
      if (status === String(key)) return { type: "single", ...stamp };
    return null;
  })();
  const total = options.reduce(
    (s, o) =>
      s +
      (o.purchase_option?.nQuantity || 0) *
        (o.purchase_option?.dUnitPrice || 0),
    0,
  );
  const poEwtTotal = totalEWT(options);
  // The PO's own freight charge — printed above the EWT on the card.
  const poFreight = Number(po?.dFreight) || 0;
  // Everything this card still has to take in — the sum of the "To Receive"
  // of every line on it (same rule the item rows use).
  const toReceiveTotal = options.reduce(
    (s, o) => s + getToReceive(o.purchase_option),
    0,
  );
  const statusLabel = cartStatus?.[po.cStatus] ?? po.cStatus;
  const firstOpt = options[0];
  const primarySupplier =
    firstOpt?.purchase_option?.supplier?.strSupplierNickName ?? "—";
  const companyName =
    firstOpt?.purchase_option?.transaction_item?.transaction?.company
      ?.strCompanyNickName ?? "—";
  const aoUser = firstOpt?.purchase_option?.transaction_item?.transaction?.user;
  const assignedAOName = aoUser ? `${aoUser.strNickName}`.trim() : "—";

  const showVoucherBadge =
    voucherStatus &&
    (String(voucherStatus) === String(voucherActiveKey) ||
      String(voucherStatus) === String(voucherClosedKey)) &&
    String(po.nStatus) === String(forApprovalKey);
  const poIsPaidRcvdDvrd = (() => {
    const isPaidOrLater = [pendingReceiptKey, forDeliveryKey, deliveredKey]
      .map(String)
      .includes(String(po.nStatus));
    const hasReceivedOrDelivered = options.some((o) => {
      const p = o.purchase_option;
      const ordered = p?.nQuantity || 0;
      const received = Math.min(p?.nInventoryQty || 0, ordered);
      const delivered = Math.min(p?.nDeliveredQty || 0, ordered);
      return received > 0 || delivered > 0;
    });
    return isPaidOrLater || hasReceivedOrDelivered;
  })();
  const handleRemoveOption = async (nPurchaseItemId) => {
    setRemovingOptionId(nPurchaseItemId);
    try {
      await PurchaseOrderAPI.removeFromCart({
        nPurchaseItemId,
        nUserId: currentUserId,
        isManagement: true,
      });
      await onRemoved?.();
      window.dispatchEvent(new CustomEvent("cart_data_updated"));
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setRemovingOptionId(null);
    }
  };

  // The remove button first asks — the row only carries the id it wants
  // gone; the actual call waits for "Yes, Remove Item".
  const [removeConfirmId, setRemoveConfirmId] = React.useState(null);
  const confirmRemoveOption = async () => {
    const id = removeConfirmId;
    setRemoveConfirmId(null);
    await handleRemoveOption(id);
  };

  // The MOVE modal picks the destination; the row only opens the modal.
  // Like remove, the source id travels with the call, so closing the modal
  // loses nothing.
  const [moveItemId, setMoveItemId] = React.useState(null);
  const handleMoveItem = async (nPurchaseItemId, nTargetPurchaseOrderId) => {
    await PurchaseOrderAPI.moveItem({
      nPurchaseItemId,
      nTargetPurchaseOrderId,
      nUserId: currentUserId,
      isManagement: isManagement,
    });
    await onRemoved?.();
    window.dispatchEvent(new CustomEvent("cart_data_updated"));
  };

  return (
    <Box
      sx={{
        border: `0.5px solid ${c.border}`,
        borderRadius: 2,
        overflow: "hidden",
        background: c.bgCard,
        width: "100%",
        boxShadow: `0 1px ${isDark ? "4px" : "3px"} ${cardShadow}`,
      }}
    >
      {/* Header */}
      {[false, true].map((sm) => (
        <Box
          key={sm ? "sm" : "xs"}
          onClick={() => setOpen((v) => !v)}
          sx={{
            display: sm
              ? { xs: "none", sm: "flex" }
              : { xs: "flex", sm: "none" },
            alignItems: "center",
            gap: sm ? 1 : 0.75,
            px: sm ? 1.5 : 1,
            py: 1,
            background: c.itemHeaderBg,
            borderBottom: open ? `0.5px solid ${c.border}` : "none",
            cursor: "pointer",
            transition: "background 0.15s",
            "&:hover": { background: c.hoverBg },
          }}
        >
          <BadgeCycler
            showVoucher={showVoucherBadge}
            isVoucherActive={String(voucherStatus) === String(voucherActiveKey)}
            stampConfig={stampConfig}
            sm={sm}
            c={c}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* PO NUMBER + AO BADGE — the code line sits on top. */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: sm ? 0.5 : 0.4,
                mb: sm ? 0.05 : 0,
                ml: 0.3,
              }}
            >
              <Typography
                sx={{
                  fontSize: sm ? "0.55rem" : "0.5rem",
                  fontWeight: 600,
                  color: c.textSecondary,
                  textTransform: "uppercase",
                  textAlign: "left",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {po.strPurchaseOrderNo}
              </Typography>
              {/* AO BADGE — a soft blue chip so the eye finds the officer
                  straight away; the name alone, hovering it says what it is. */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: sm ? 0.25 : 0.2,
                  px: sm ? 0.6 : 0.5,
                  py: sm ? 0.15 : 0.1,
                  borderRadius: "50px",
                  background: c.blueBg,
                  border: `0.5px solid ${c.blueBorder}`,
                  flexShrink: 1,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <Tooltip title="AO" arrow placement="top">
                  <Typography
                    sx={{
                      fontSize: sm ? "0.55rem" : "0.5rem",
                      fontWeight: 600,
                      color: c.blueText,
                      textTransform: "uppercase",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {assignedAOName}
                  </Typography>
                </Tooltip>
              </Box>
            </Box>

            {/* SUPPLIER — the nickname is the card's headline, so it is the
                biggest thing in the header. */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                ml: 0.3,
              }}
            >
              <Typography
                sx={{
                  fontSize: sm ? "0.8rem" : "0.68rem",
                  fontWeight: 600,
                  color: c.textPrimary,
                  textTransform: "uppercase",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1,
                }}
              >
                {primarySupplier}
              </Typography>
            </Box>

            {/* COMPANY — plain text under the supplier, no badge around it. */}
            <Typography
              sx={{
                fontSize: sm ? "0.55rem" : "0.5rem",
                fontWeight: 600,
                color: c.textSecondary,
                textTransform: "uppercase",
                textAlign: "left",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                ml: 0.3,
                mt: sm ? 0.1 : 0.05,
              }}
            >
              {companyName}
            </Typography>
          </Box>

          {/* TO RECEIVE — the card's total still to take in. It takes the
              right side on the Pending Receipt phase, where the amount block
              is already hidden (the PO is paid by then). */}
          {isPendingReceiptPO ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                mr: sm ? 1 : 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.48rem",
                  fontWeight: 700,
                  color: c.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                To Receive
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  textAlign: "right",
                  color:
                    toReceiveTotal > 0 ? c.blueTextStrong : c.textSecondary,
                }}
              >
                {fmtQty(toReceiveTotal)}
              </Typography>
            </Box>
          ) : !poIsPaidRcvdDvrd ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                mr: sm ? 1 : 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: sm ? "0.72rem" : "0.65rem",
                  fontWeight: 800,
                  color: c.orangeText,
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {fmtPHP(total)}
              </Typography>
              {/* FREIGHT — the charge on top of the goods, above the EWT */}
              <Typography
                sx={{
                  fontSize: sm ? "0.52rem" : "0.48rem",
                  fontWeight: 500,
                  fontStyle: "italic",
                  color: c.textSecondary,
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {poFreight > 0
                  ? `Freight: ${fmtPHP(poFreight)}`
                  : "No Freight"}
              </Typography>
              <Typography
                sx={{
                  fontSize: sm ? "0.52rem" : "0.48rem",
                  fontWeight: 500,
                  fontStyle: "italic",
                  color: c.textSecondary,
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {poEwtTotal > 0 ? `EWT: ${fmtPHP(poEwtTotal)}` : "No EWT"}
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ position: "relative", flexShrink: 0 }}>
            {!open && (
              <Box
                sx={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: sm ? 14 : 13,
                  height: sm ? 14 : 13,
                  borderRadius: "50px",
                  background: c.textSecondary,
                  border: `1.5px solid ${c.itemHeaderBg}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: sm ? "0.45rem" : "0.42rem",
                    fontWeight: 700,
                    color: c.bgCard,
                    lineHeight: 1,
                  }}
                >
                  {visibleOptions.length}
                </Typography>
              </Box>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                // The header is clickable too — swallow this so the click
                // doesn't bubble up and toggle the card a second time.
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              sx={{
                width: sm ? 22 : 20,
                height: sm ? 22 : 20,
                borderRadius: "50px",
                border: `0.5px solid ${c.border}`,
                color: c.textSecondary,
                "&:hover": { background: c.hoverBg },
                p: 0,
              }}
            >
              {open ? (
                <KeyboardArrowUp sx={{ fontSize: sm ? "0.9rem" : "0.85rem" }} />
              ) : (
                <KeyboardArrowDown
                  sx={{ fontSize: sm ? "0.9rem" : "0.85rem" }}
                />
              )}
            </IconButton>
          </Box>
        </Box>
      ))}

      {/* Expanded Content — ROWS */}
      {open && (
        <>
          <Box
            sx={{
              maxHeight: "20vh",
              overflowY: "auto",
              overflowX: "hidden",
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": {
                background: c.scrollbarThumb,
                borderRadius: 2,
              },
            }}
          >
            {visibleOptions.map((opt, idx) => (
              <CartRowPanel
                key={opt.nPurchaseOrder_ItemId}
                opt={opt}
                idx={idx}
                totalCount={visibleOptions.length}
                colors={base}
                tableLayout
                // Pending Receipt: nothing above the brand · model — the
                // goods are still on the supplier's side, so the order's
                // number would only be noise.
                hideRowBadge={isPendingReceiptPO}
                onRowClick={() =>
                  onUpdateClick({ po, statusLabel, viewStatus: listStatus })
                }
                isRemoving={
                  removingOptionId === opt.purchase_option?.nPurchaseItemId
                }
                // A cart-stage order — Cart, For Approval or For Payment —
                // still lets a line be pulled back out of it. From Pending
                // Receipt on the line is moving through the warehouse.
                showMove={
                  [String(cartKey), String(forApprovalKey), String(forPaymentKey)].includes(
                    String(po.nStatus),
                  ) && !isCancelledPO
                }
                onMove={setMoveItemId}
                showRemove={[String(cartKey), String(forApprovalKey), String(forPaymentKey)].includes(
                  String(po.nStatus),
                )}
                onRemove={setRemoveConfirmId}
                removingOptionId={removingOptionId}
                hasAnyEWT={hasAnyEWT}
                poIsPaidRcvdDvrd={poIsPaidRcvdDvrd}
                isForDelivery={isForDeliveryPO}
                isPendingReceipt={isPendingReceiptPO}
                isDelivered={isDeliveredPO}
                arrivedStats={
                  poIsPaidRcvdDvrd ? statsFor(opt.purchase_option) : null
                }
              />
            ))}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              borderTop: `0.5px solid ${c.border}`,
              background: c.itemHeaderBg,
              px: 1.5,
              py: 0.875,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <AccessTimeOutlined
                  sx={{ fontSize: "0.6rem", color: c.slateMutedColor }}
                />
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    color: c.slateMutedColor,
                    lineHeight: 1,
                  }}
                >
                  {fmtDate(po.dtPurchaseOrderCreated)}
                </Typography>
              </Box>
              {/* WHEN the order was called off — under the date it was
                  raised on, so the two read as one story. */}
              {isCancelledPO && po.dtCancelled && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <CancelOutlined
                    sx={{ fontSize: "0.6rem", color: c.redText }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.55rem",
                      color: c.redText,
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    {fmtDate(po.dtCancelled)}
                  </Typography>
                </Box>
              )}
            </Box>

            {isCancelledPO ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: c.redBg,
                  border: `0.5px solid ${c.redBorder}`,
                  color: c.redText,
                  borderRadius: "50px",
                  px: 1,
                  py: 0.25,
                }}
              >
                <CancelOutlined sx={{ fontSize: "0.65rem" }} />
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 600 }}>
                  Cancelled
                </Typography>
              </Box>
            ) : (
              <Box
                onClick={() =>
                  onUpdateClick({ po, statusLabel, viewStatus: listStatus })
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: { xs: 0, sm: 0.4 },
                  px: { xs: 0.6, sm: 1 },
                  py: 0.4,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: c.btnBg,
                  border: `1px solid ${c.btnBorder}`,
                  "&:hover": { background: c.btnHoverBg },
                }}
              >
                <Visibility sx={{ fontSize: "0.65rem", color: c.blueText }} />
                <Typography
                  sx={{
                    display: { xs: "none", sm: "inline" },
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: c.blueText,
                    letterSpacing: "0.04em",
                  }}
                >
                  VIEW
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
      {/* Remove-from-cart asks once before it pulls the line off its PO. */}
      <PurchaseCartUpdateModal
        open={removeConfirmId !== null}
        action="remove_from_cart"
        purchaseOrderNumber={po.strPurchaseOrderNo}
        loading={removingOptionId !== null}
        onConfirm={confirmRemoveOption}
        onClose={() => setRemoveConfirmId(null)}
      />
      {/* Moving a line: the other cart-stage orders it can live under. */}
      <MoveItemModal
        open={moveItemId !== null}
        handleClose={() => setMoveItemId(null)}
        sourcePoNumber={po.strPurchaseOrderNo}
        itemId={moveItemId}
        currentUserId={currentUserId}
        isManagement={isManagement}
        onMove={handleMoveItem}
      />
    </Box>
  );
}
