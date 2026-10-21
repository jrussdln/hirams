import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import {
  RemoveShoppingCart,
  Inventory2Outlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";
import {
  fmtPHP,
  fmtQty,
} from "../../../../../utils/formatters/formatter.js";
import { IconBox } from "../LineItems.jsx";
import DeliveryDateLabel from "./DeliveryDateLabel.jsx";

const useColors = (c) => ({
  border: c.slate.border,
  divider: c.slate.divider,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  mutedColor: c.slate.mutedColor,
  mutedText: c.slate.mutedText,
  itemHeaderBg: c.slate.itemHeaderBg,
  itemHover: c.slate.itemHover,
  innerBg: c.slate.innerBg,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  outerBg: c.slate.outerBg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textHeading: c.gray.textHeading,
  textMuted: c.gray.textMuted,
  labelMuted: c.gray.textMuted,
  blueText: c.blue.text,
  blueTextStrong: c.blue.textStrong,
  blueBg: c.blue.bg,
  blueBorder: c.blue.border,
  redText: c.red.text,
  redBg: c.red.bg,
  redBorder: c.red.border,
  orangeText: c.orange.text,
  greenText: c.green.text,
  amberWarnText: c.amber.warnText,
  // foreground for the row-index badge sitting on a status fill
  textOnFill: c.gray.textOnFill,
});

const HeaderCell = ({ label, width, c }) => (
  <Box sx={{ minWidth: width, textAlign: "center" }}>
    <Typography
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        color: c.textSecondary,
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </Typography>
  </Box>
);

const StatRow = ({
  label,
  value,
  total,
  pending,
  activeColor,
  c,
  hideTotal,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "baseline",
      gap: 0.2,
      justifyContent: "flex-end",
      whiteSpace: "nowrap",
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
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: "0.62rem",
        fontWeight: 700,
        color: value > 0 ? activeColor : c.textSecondary,
        lineHeight: 1,
      }}
    >
      {fmtQty(value)}
      {pending > 0 && (
        <Box
          component="span"
          title={`${fmtQty(pending)} awaiting approval`}
          sx={{ color: c.redText, fontWeight: 700 }}
        >
          ({fmtQty(pending)})
        </Box>
      )}
      {!hideTotal && `/${fmtQty(total)}`}
    </Typography>
  </Box>
);
const StatStack = ({ label, value, activeColor, c }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 0.2,
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
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: "0.8rem",
        fontWeight: 800,
        color: value > 0 ? activeColor : c.textSecondary,
        lineHeight: 1,
      }}
    >
      {fmtQty(value)}
    </Typography>
  </Box>
);
export default function CartRowPanel({
  opt,
  idx,
  totalCount,
  colors,
  isRemoving,
  showRemove,
  onRemove,
  removingOptionId,
  hasAnyEWT,
  showQty = true,
  poIsPaidRcvdDvrd,
  isForDelivery = false,
  isPendingReceipt = false,
  isDelivered = false,
  arrivedStats = null,
  hideRowBadge = false,
  // Clicking the row opens the PO — the same thing the card's VIEW button
  // does. The card passes it in; the table (PO detail page) does not.
  onRowClick,
  // Only the brand · model is a link (the PO detail page uses it to open the
  // transaction for purchase). A line with no brand · model falls back to
  // the item name, so there is always something to click.
  onBrandClick,
  // The Purchase Items TABLE (the PO detail page) reads better with its own
  // layout: a "#" column for the numbering, no item icon, and the code
  // stacked above the brand · model. The cards keep the compact row.
  tableLayout = false,
  variant = "item",
  itemCount,
  totalAmount,
  ewtAmount = 0,
  // The PO's freight charge — printed above the EWT line in the total row.
  freightAmount = 0,
}) {
  const c = React.useMemo(() => useColors(colors), [colors]);

  // ── TOTAL ROW VARIANT ──
  if (variant === "total") {
    return (
      <Box
        sx={{
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          background: c.totalBg,
          borderRadius: 1,
          position: "sticky",
          bottom: 0,
          zIndex: 5,
          borderTop: `0.5px solid ${c.totalBorder}`,
        }}
      >
        <IconBox>
          <ReceiptLongOutlined
            sx={{ fontSize: "0.85rem", color: c.textSecondary }}
          />
        </IconBox>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.67rem",
              fontWeight: 700,
              color: c.textHeading,
              lineHeight: 1.2,
            }}
          >
            Order Total
          </Typography>
          <Typography
            sx={{ fontSize: "0.54rem", color: c.textMuted, lineHeight: 1.2 }}
          >
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <Box sx={{ width: 44, flexShrink: 0 }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            mr: 1.5,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: c.orangeText,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "right",
            }}
          >
            {fmtPHP(totalAmount)}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: c.textSecondary,
              textAlign: "right",
              lineHeight: 1.4,
            }}
          >
            {freightAmount > 0
              ? `Freight: ${fmtPHP(freightAmount)}`
              : "No Freight"}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: c.textSecondary,
              textAlign: "right",
              lineHeight: 1.4,
            }}
          >
            {ewtAmount > 0 ? `EWT: ${fmtPHP(ewtAmount)}` : "No EWT"}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── ITEM ROW VARIANT ──
  const p = opt.purchase_option;
  const tx = p?.transaction_item?.transaction;
  const lineTotal = (p?.nQuantity || 0) * (p?.dUnitPrice || 0);
  const txnCode = tx?.strCode ?? "—";
  const ewtValue = p?.dEWT;
  // Pending ("P") rows count as received/delivered too — the goods are
  // already in hand, they only await approval. This matches the backend's
  // nInventoryQty / nDeliveredQty, which are approved (A) + pending (P).
  const rcvdQty = arrivedStats
    ? arrivedStats.approvedRcvd + (arrivedStats.pendingRcvd || 0)
    : p?.nInventoryQty || 0;
  const dlvdQty = arrivedStats
    ? arrivedStats.approvedDlvd + (arrivedStats.pendingDlvd || 0)
    : p?.nDeliveredQty || 0;
  const forDeliveryQty = Math.max(rcvdQty - dlvdQty, 0);
  // The brand · model is the link; a line without one links on its name.
  const brandClickable = Boolean(
    onBrandClick && (p?.strBrand || p?.strModel),
  );
  const nameClickable = Boolean(onBrandClick && !brandClickable);
  const orderedQty = arrivedStats ? arrivedStats.totalQty : p?.nQuantity || 0;
  const toReceiveQty = Math.max(orderedQty - rcvdQty, 0);
  const removeSpinner = (
    <Box
      sx={{
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          border: `1.5px solid ${c.redText}`,
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
    </Box>
  );

  const removeButton = (
    <IconButton
      size="small"
      disabled={removingOptionId !== null}
      onClick={(e) => {
        // The row itself opens the PO — the remove button must not.
        e.stopPropagation();
        onRemove(p?.nPurchaseItemId);
      }}
      sx={{
        width: { xs: 18, sm: 20 },
        height: { xs: 18, sm: 20 },
        color: c.redText,
        opacity: removingOptionId ? 0.4 : 0.6,
        "&:hover": { background: c.redBg, opacity: 1 },
        border: `0.5px solid ${c.redBorder}`,
        borderRadius: "50px",
        p: 0,
        m: 1,
      }}
      title="Remove from cart"
    >
      <RemoveShoppingCart sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
    </IconButton>
  );

  const removeBtn = showRemove
    ? isRemoving
      ? removeSpinner
      : removeButton
    : null;

  return (
    <>
      {/* Sticky header — first row only, hidden once PO is paid/received/delivered */}
      {idx === 0 && !poIsPaidRcvdDvrd && (
        <Box
          sx={{
            px: 2,
            py: 0.5,
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            background: c.itemHeaderBg,
            borderBottom: `0.5px solid ${c.divider}`,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              gap: tableLayout ? 2 : 1,
            }}
          >
            {/* The numbering column — the row's icon slot in the card rows. */}
            {tableLayout ? (
              <Box sx={{ width: 20, flexShrink: 0, textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: c.textSecondary,
                    letterSpacing: "0.03em",
                    lineHeight: 1,
                  }}
                >
                  #
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: 26, flexShrink: 0 }} />
            )}
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: c.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              ITEMS
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            {hasAnyEWT && !poIsPaidRcvdDvrd && (
              <HeaderCell label="EWT" width={60} c={c} />
            )}
            {arrivedStats || poIsPaidRcvdDvrd ? (
              <HeaderCell label="STATUS" width={100} c={c} />
            ) : (
              <>
                {showQty && <HeaderCell label="QTY" width={50} c={c} />}
                <HeaderCell label="UNIT PRICE" width={70} c={c} />
                <HeaderCell label="TOTAL" width={70} c={c} />
              </>
            )}
            {showRemove && (
              <Box
                sx={{
                  width: 28,
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: c.textSecondary,
                    letterSpacing: "0.03em",
                    lineHeight: 1,
                  }}
                >
                  ACTION
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Box
        onClick={onRowClick}
        sx={{
          borderBottom:
            idx < totalCount - 1 ? `0.5px solid ${c.divider}` : "none",
          cursor: onRowClick ? "pointer" : "default",
          "&:hover": { background: c.itemHover },
          transition: "background 0.15s",
        }}
      >
        <Box
          sx={{
            position: "relative",
            px: 2,
            py: 1,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 0.75, sm: 2 },
            justifyContent: "space-between",
          }}
        >
          {/* Mobile-only remove button */}
          {showRemove && (
            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                position: "absolute",
                top: 4,
                right: 4,
                zIndex: 1,
              }}
            >
              {removeBtn}
            </Box>
          )}

          {/* COLUMN 0 — the row number (Purchase Items table only) */}
          {tableLayout && (
            <Box
              sx={{
                width: 20,
                flexShrink: 0,
                textAlign: "center",
                alignSelf: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: c.textSecondary,
                  lineHeight: 1,
                }}
              >
                {idx + 1}
              </Typography>
            </Box>
          )}

          {/* COLUMN 1 — Item Info */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: { sm: "1 1 0" },
              minWidth: 0,
              pr: { xs: showRemove ? 3.5 : 0, sm: 0 },
            }}
          >
            {!tableLayout && (
              <Box sx={{ position: "relative", flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "6px",
                    background: c.mutedBg,
                    border: `0.5px solid ${c.mutedBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Inventory2Outlined
                    sx={{ fontSize: "0.75rem", color: c.mutedColor }}
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
                    background: c.textSecondary,
                    border: `1.5px solid ${c.outerBg}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.4rem",
                      fontWeight: 700,
                      color: c.textOnFill,
                      lineHeight: 1,
                    }}
                  >
                    {idx + 1}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* CODE — above the brand · model, plain text, exactly like the
                  code line of the card header (same size, weight, colour and
                  line spacing). */}
              {tableLayout && !hideRowBadge && (
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    color: c.textSecondary,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    mb: 0.05,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {txnCode}
                </Typography>
              )}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  mb: tableLayout ? 0.1 : 0.2,
                  flexWrap: "wrap",
                }}
              >
                {(p?.strBrand || p?.strModel) && (
                  <Typography
                    onClick={brandClickable ? onBrandClick : undefined}
                    sx={{
                      fontSize: tableLayout ? "0.78rem" : "0.65rem",
                      fontWeight: 600,
                      // A link looks like a link — blue, underlined on hover.
                      color: brandClickable ? c.blueText : c.textPrimary,
                      textTransform: tableLayout ? "uppercase" : "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: brandClickable ? "pointer" : "default",
                      ...(brandClickable && {
                        "&:hover": { textDecoration: "underline" },
                      }),
                    }}
                  >
                    {[p?.strBrand, p?.strModel].filter(Boolean).join(" · ")}
                  </Typography>
                )}
                {/* No badge on the transaction cards (For Delivery /
                    Delivered) — the PO code is not wanted in the row. The
                    Purchase Items table shows the code as plain text above
                    the brand · model instead. */}
                {!hideRowBadge && !tableLayout && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 0.35,
                      py: 0.08,
                      borderRadius: "50px",
                      background: c.blueBg,
                      border: `0.5px solid ${c.blueBorder}`,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "0.38rem", sm: "0.45rem" },
                        fontWeight: 500,
                        color: c.blueTextStrong,
                        lineHeight: 1,
                      }}
                    >
                      {txnCode}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography
                onClick={nameClickable ? onBrandClick : undefined}
                sx={{
                  fontSize: "0.58rem",
                  color: nameClickable ? c.blueText : c.textSecondary,
                  textTransform: tableLayout ? "uppercase" : "none",
                  lineHeight: tableLayout ? 1.1 : 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: nameClickable ? "pointer" : "default",
                  ...(nameClickable && {
                    "&:hover": { textDecoration: "underline" },
                  }),
                }}
              >
                {p?.transaction_item?.strName ?? "—"}
              </Typography>
              {/* The delivery date is a promise while the goods are still in
                  flight — it only means something on the For Delivery
                  stage, so it shows there and nowhere else. */}
              {isForDelivery && (
                <DeliveryDateLabel
                  date={tx?.dtDelivery}
                  sx={{ color: c.mutedColor }}
                />
              )}
            </Box>
          </Box>

          {/* COLUMN 2 — Pricing / status / remove */}
          <Box
            sx={{
              display: { xs: "grid", sm: "flex" },
              gridTemplateColumns: { xs: "repeat(4, 1fr)" },
              gap: { xs: 0.5, sm: 2 },
              alignItems: "center",
              justifyContent: { xs: "space-between", sm: "flex-end" },
              width: { xs: "100%", sm: "auto" },
              flexShrink: 0,
            }}
          >
            {hasAnyEWT && !poIsPaidRcvdDvrd && (
              <Box sx={{ minWidth: { sm: 60 }, textAlign: "right" }}>
                <Typography
                  sx={{
                    display: { xs: "block", sm: "none" },
                    fontSize: "0.45rem",
                    color: c.textSecondary,
                    lineHeight: 1,
                    mb: 0.1,
                  }}
                >
                  EWT
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: c.textSecondary,
                    lineHeight: 1,
                  }}
                >
                  {ewtValue ? fmtPHP(ewtValue) : "—"}
                </Typography>
              </Box>
            )}

            {!poIsPaidRcvdDvrd && (
              <>
                <Box sx={{ minWidth: { sm: 50 }, textAlign: "right" }}>
                  <Typography
                    sx={{
                      display: { xs: "block", sm: "none" },
                      fontSize: "0.45rem",
                      color: c.textSecondary,
                      lineHeight: 1,
                      mb: 0.1,
                    }}
                  >
                    QTY
                  </Typography>
                  {/* QTY — the number with the unit under it. */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: c.textSecondary,
                        lineHeight: 1,
                      }}
                    >
                      {fmtQty(p?.nQuantity)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.5rem",
                        color: c.textSecondary,
                        textTransform: "uppercase",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p?.strUOM}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ minWidth: { sm: 70 }, textAlign: "right" }}>
                  <Typography
                    sx={{
                      display: { xs: "block", sm: "none" },
                      fontSize: "0.45rem",
                      color: c.textSecondary,
                      lineHeight: 1,
                      mb: 0.1,
                    }}
                  >
                    Unit Price
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: c.textSecondary,
                      lineHeight: 1,
                    }}
                  >
                    {fmtPHP(p?.dUnitPrice)}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: { sm: 70 }, textAlign: "right" }}>
                  <Typography
                    sx={{
                      display: { xs: "block", sm: "none" },
                      fontSize: "0.45rem",
                      color: c.textSecondary,
                      lineHeight: 1,
                      mb: 0.1,
                    }}
                  >
                    Total
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: c.orangeText,
                      lineHeight: 1,
                    }}
                  >
                    {fmtPHP(lineTotal)}
                  </Typography>
                </Box>
              </>
            )}

            {(arrivedStats || poIsPaidRcvdDvrd) && (
              <Box
                sx={{
                  minWidth: { sm: 100 },
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
                }}
              >
                {isPendingReceipt ? (
                  <StatStack
                    label="TO RECEIVE"
                    value={toReceiveQty}
                    activeColor={c.blueTextStrong}
                    c={c}
                  />
                ) : isForDelivery ? (
                  <StatStack
                    label="FOR DELIVERY"
                    value={forDeliveryQty}
                    activeColor={c.blueTextStrong}
                    c={c}
                  />
                ) : isDelivered ? (
                  <StatStack
                    label="DELIVERED"
                    value={dlvdQty}
                    activeColor={c.greenText}
                    c={c}
                  />
                ) : (
                  <>
                    <StatRow
                      label="RECEIVED"
                      value={rcvdQty}
                      pending={arrivedStats?.pendingRcvd || 0}
                      total={
                        arrivedStats ? arrivedStats.totalQty : p?.nQuantity || 0
                      }
                      activeColor={c.blueTextStrong}
                      c={c}
                    />
                    <StatRow
                      label="DELIVERED"
                      value={dlvdQty}
                      pending={arrivedStats?.pendingDlvd || 0}
                      total={
                        arrivedStats ? arrivedStats.totalQty : p?.nQuantity || 0
                      }
                      activeColor={c.greenText}
                      c={c}
                    />
                  </>
                )}
              </Box>
            )}

            {showRemove && (
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  width: 28,
                  justifyContent: "center",
                }}
              >
                {removeBtn}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}
