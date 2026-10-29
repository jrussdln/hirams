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

import InventoryAPI from "../../../../api/endpoints/inventory.api.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { ewtOfOption, totalEWT } from "../../../../utils/helpers/calculateEWT.js";
import {
  fmtDate,
  fmtPHP,
  fmtQty,
} from "../../../../utils/formatters/formatter.js";
import { CART_STATUS_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import CartRowPanel from "./shared/CartRowPanel.jsx";
import { BadgeCycler } from "./shared/Stamp.jsx";
import {
  getOptionArrival,
  getPoArrival,
  getArrivalBadges,
  getToDeliver,
  getDelivered,
} from "../../../../utils/helpers/purchaseProgress.js";

const getColor = (colors, path) =>
  path.split(".").reduce((obj, key) => obj?.[key], colors);

const num = (v) => Number(v) || 0;

const mapColors = (c) => ({
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

/**
 * For Delivery / Delivered card — ONE CARD PER TRANSACTION.
 *
 * Every item of every PO that shares the same transaction code is combined
 * into this single card, so each row carries its own PO number.
 * (CartCardPanel stays the per-PO / per-supplier card for Cart → Pending
 * Receipt.)
 */
export default function CartCardForDelivery({
  entries = [], // [{ po, opt }] — items of this transaction, across POs
  viewStatus,
  cartStatus,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  cancelledPOKey,
  onUpdateClick,
  collapsed,
  voucherStatus,
  voucherActiveKey,
  voucherClosedKey,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => mapColors(base), [base]);

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
  const [inventoryRows, setInventoryRows] = useState({});
  useEffect(() => {
    setOpen(!collapsed);
  }, [collapsed]);

  // ── Group shape ──────────────────────────────────────────────────────
  const listStatus = String(viewStatus ?? "");
  const isDeliveredTab = listStatus === String(deliveredKey);
  const isForDeliveryTab = listStatus === String(forDeliveryKey);

  // unique POs behind this card
  const pos = React.useMemo(() => {
    const seen = new Set();
    return entries
      .filter(({ po }) => {
        const id = po.nPurchaseOrderId;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(({ po }) => po);
  }, [entries]);

  const allOptions = entries.map(({ opt }) => opt);
  // The EWT is derived — see utils/helpers/calculateEWT.js
  const hasAnyEWT = allOptions.some((o) => ewtOfOption(o) > 0);

  // ONE ROW PER REQUESTED ITEM: the same item split across two suppliers
  // (two purchase options, possibly two different POs) must show as ONE row
  // with the quantities summed — otherwise it appears twice.
  const itemRows = React.useMemo(() => {
    const byKey = new Map();
    entries.forEach(({ opt, po }, i) => {
      const p = opt?.purchase_option;
      const tiId = p?.transaction_item?.nTransactionItemId;
      const key =
        tiId != null ? `ti-${tiId}` : `oi-${opt?.nPurchaseOrder_ItemId ?? i}`;
      // The order(s) this row belongs to — a row is one item, but the item
      // can be bought on more than one PO, so the numbers are collected.
      const poNo = po?.strPurchaseOrderNo ?? "";
      const row = byKey.get(key);
      if (!row) {
        byKey.set(key, {
          key,
          opt,
          parts: [p],
          poNos: poNo ? [poNo] : [],
        });
        return;
      }
      row.parts.push(p);
      if (poNo && !row.poNos.includes(poNo)) row.poNos.push(poNo);
      const mp = row.opt.purchase_option;
      row.opt = {
        ...row.opt,
        purchase_option: {
          ...mp,
          nQuantity: num(mp.nQuantity) + num(p.nQuantity),
          nInventoryQty: num(mp.nInventoryQty) + num(p.nInventoryQty),
          nDeliveredQty: num(mp.nDeliveredQty) + num(p.nDeliveredQty),
        },
      };
    });
    return [...byKey.values()];
  }, [entries]);

  // Rows that belong in the tab being viewed:
  //   For Delivery : hide fully delivered rows (0 left to deliver)
  //   Delivered    : hide rows with nothing delivered yet
  const visibleRows = itemRows.filter((row) =>
    isDeliveredTab
      ? getDelivered(row.opt.purchase_option) > 0
      : getToDeliver(row.opt.purchase_option) > 0,
  );

  // ── Load inventory rows so approved (A) and pending (P) can be split ──
  useEffect(() => {
    const ids = entries
      .map(({ opt }) => opt.purchase_option)
      .filter((p) => (p?.nInventoryQty || 0) > 0 || (p?.nDeliveredQty || 0) > 0)
      .map((p) => p.nPurchaseItemId)
      .filter(Boolean);
    if (!ids.length) return;

    let active = true;
    const load = async () => {
      try {
        // ONE call for every item of this card — the bulk endpoint queries
        // all ids in a single request. The old per-item loop queued one
        // history GET per item on the (single-process) server, which made
        // the tab crawl on cards with many items.
        const res = await InventoryAPI.getHistoryBulk(ids);
        // Normalize: an item with no inventory rows yet must still map to
        // an empty list, or its stats would read as "not loaded" forever.
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
  }, [entries]);

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

  // Same stats summed across every supplier row of this item
  const statsForRow = (row) => {
    const stats = row.parts.map((p) => statsFor(p));
    if (stats.some((s) => !s)) return null;
    return stats.reduce(
      (acc, s) => ({
        totalQty: acc.totalQty + num(s.totalQty),
        approvedRcvd: acc.approvedRcvd + num(s.approvedRcvd),
        pendingRcvd: acc.pendingRcvd + num(s.pendingRcvd),
        approvedDlvd: acc.approvedDlvd + num(s.approvedDlvd),
        pendingDlvd: acc.pendingDlvd + num(s.pendingDlvd),
      }),
      {
        totalQty: 0,
        approvedRcvd: 0,
        pendingRcvd: 0,
        approvedDlvd: 0,
        pendingDlvd: 0,
      },
    );
  };

  const statuses = pos.map((p) => String(p.nStatus ?? ""));
  const stampConfig = (() => {
    if (statuses.length && statuses.every((s) => s === String(cancelledPOKey)))
      return { type: "single", ...stamps.VOID };

    // ✅ RCVD / DLVRD percentage badges — combined across every PO
    const arrival = getPoArrival(allOptions, inventoryRows);
    const badges = getArrivalBadges(arrival).map(({ type, pct }) => ({
      ...stamps[type],
      pct,
    }));
    if (badges.length > 0) return { type: "multi", badges };

    // POs in the group normally share one status — show its stamp
    const status = statuses[0] ?? "";
    if (status && statuses.every((s) => s === status)) {
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
    }
    return null;
  })();

  const total = allOptions.reduce(
    (s, o) =>
      s +
      (o.purchase_option?.nQuantity || 0) *
        (o.purchase_option?.dUnitPrice || 0),
    0,
  );
  const poEwtTotal = totalEWT(allOptions);
  // Card totals for the tab being viewed — the same figures the rows carry
  // (each row is the item's options merged, so nothing is counted twice).
  const toDeliverTotal = itemRows.reduce(
    (s, row) => s + getToDeliver(row.opt.purchase_option),
    0,
  );
  const deliveredTotal = itemRows.reduce(
    (s, row) => s + getDelivered(row.opt.purchase_option),
    0,
  );
  const firstPO = pos[0] ?? {};
  const statusLabel = cartStatus?.[firstPO.cStatus] ?? firstPO.cStatus;

  const firstOpt = entries[0]?.opt;
  const tx = firstOpt?.purchase_option?.transaction_item?.transaction;
  // "Client Nickname - Transaction Code"
  const clientLabel =
    tx?.client?.strClientNickName || tx?.client?.strClientName || "—";
  const transactionCode = tx?.strCode ?? "—";
  const companyName =
    tx?.company?.strCompanyNickName ?? "—";
  const assignedAOName = tx?.user?.strNickName?.trim() || "—";

  const showVoucherBadge =
    voucherStatus &&
    (String(voucherStatus) === String(voucherActiveKey) ||
      String(voucherStatus) === String(voucherClosedKey)) &&
    statuses.includes(String(forApprovalKey));

  const poIsPaidRcvdDvrd =
    statuses.some((s) =>
      [pendingReceiptKey, forDeliveryKey, deliveredKey]
        .map(String)
        .includes(s),
    ) ||
    allOptions.some((o) => {
      const p = o.purchase_option;
      return (p?.nInventoryQty || 0) > 0 || (p?.nDeliveredQty || 0) > 0;
    });

  // oldest PO date in the group
  const groupDate = pos
    .map((p) => p.dtPurchaseOrderCreated)
    .filter(Boolean)
    .sort()[0];

  const openPO = (po) =>
    onUpdateClick?.({ po, statusLabel, viewStatus: listStatus });

  const headerRow = (sm) => (
    <Box
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
        {/* TRANSACTION CODE — the code line sits on top, like the PO number
            on the Cart card. */}
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
            {transactionCode}
          </Typography>
          {/* AO BADGE — a soft blue chip, same as the Cart card. */}
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

        {/* CLIENT — the card's headline, so it is the biggest thing in the
            header. */}
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
            {clientLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: sm ? 0.5 : 0.4,
            // Same left margin as the code and client lines above, so all
            // three read down the same edge.
            ml: 0.3,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: sm ? 0.3 : 0.25,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Typography
              sx={{
                fontSize: sm ? "0.55rem" : "0.5rem",
                fontWeight: 600,
                color: c.textSecondary,
                textTransform: "uppercase",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {companyName}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* FOR DELIVERY / DELIVERED — the card's total for the tab being
          viewed. It takes the right side on those tabs, where the amount
          block is already hidden (the PO is paid and received by then). */}
      {isForDeliveryTab || isDeliveredTab ? (
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
            {isDeliveredTab ? "Delivered" : "For Delivery"}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 800,
              lineHeight: 1,
              textAlign: "right",
              color:
                (isDeliveredTab ? deliveredTotal : toDeliverTotal) > 0
                  ? c.blueTextStrong
                  : c.textSecondary,
            }}
          >
            {fmtQty(isDeliveredTab ? deliveredTotal : toDeliverTotal)}
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
              {visibleRows.length}
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
            <KeyboardArrowDown sx={{ fontSize: sm ? "0.9rem" : "0.85rem" }} />
          )}
        </IconButton>
      </Box>
    </Box>
  );

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
      {/* Header (xs + sm variants) */}
      {[false, true].map((sm) => (
        <React.Fragment key={sm ? "sm" : "xs"}>{headerRow(sm)}</React.Fragment>
      ))}

      {/* Expanded Content — ROWS (items from every PO of this transaction) */}
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
            {visibleRows.length === 0 && (
              <Box sx={{ px: 1.5, py: 1.5 }}>
                <Typography
                  sx={{ fontSize: "0.6rem", color: c.textSecondary }}
                >
                  No items left for delivery.
                </Typography>
              </Box>
            )}

            {visibleRows.map((row, idx) => (
              <CartRowPanel
                key={row.key}
                opt={row.opt}
                idx={idx}
                totalCount={visibleRows.length}
                colors={base}
                tableLayout
                // The card is one per TRANSACTION, so the row carries the
                // order it belongs to — the one line that says which PO
                // this item went out on.
                poNumber={row.poNos.join(", ")}
                onRowClick={() => openPO(firstPO)}
                showRemove={false}
                hasAnyEWT={hasAnyEWT}
                poIsPaidRcvdDvrd={poIsPaidRcvdDvrd}
                isForDelivery={listStatus === String(forDeliveryKey)}
                isDelivered={isDeliveredTab}
                arrivedStats={
                  poIsPaidRcvdDvrd ? statsForRow(row) : null
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
                  {fmtDate(groupDate)}
                </Typography>
              </Box>
            </Box>

            {statuses.length > 0 &&
            statuses.every((s) => s === String(cancelledPOKey)) ? (
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
                onClick={() => openPO(firstPO)}
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
    </Box>
  );
}
