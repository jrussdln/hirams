import { useMemo } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  DeleteOutlineOutlined,
} from "@mui/icons-material";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";
import PickableValue from "../../jev/components/AmountPick.jsx";
import AddItemButton from "./AddItemButton.jsx";
import { contactFallbacks } from "./contactFallbacks.js";

const useColors = (c) => ({
  border: c.slate.border,
  divider: c.slate.divider,
  hover: c.slate.hover,
  expandedBg: c.slate.expandedBg,
  itemHeaderBg: c.slate.itemHeaderBg,
  itemHover: c.slate.itemHover,
  scrollbarThumb: c.slate.scrollbarThumb,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  mutedColor: c.slate.mutedColor,
  outerBg: c.slate.outerBg,
  blue: {
    bg: c.blue.bg,
    border: c.blue.border,
    text: c.blue.text,
    hover: c.blue.hover,
  },
  green: {
    bg: c.green.bg,
    text: c.green.text,
    border: c.green.border,
    hover: c.green.hover,
    active: c.green.active,
  },
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
  orange: { text: c.orange.text },
  textOnFill: c.gray.textOnFill,
  amber: { text: c.amber.text },
  red: { text: c.red.text, bg: c.red.bg, border: c.red.border },
});

export default function PORowPanel({
  link,
  idx,
  totalCount,
  isOpen,
  isRemoving,
  onToggle,
  onRemove,
  onNavigate,
  // Clicking the brand · model opens the transaction for purchase.
  onBrandClick,
  // The voucher's supplier nickname (the PO graph has no supplier loaded).
  supplierNickName: supplierNickNameProp = "",
  // The voucher's own number (DV No.) — printed on the top line.
  voucherNumber = "",
  // The DV code becomes a LINK when this is set — it opens the voucher
  // itself (the JEV viewer hands it over).
  onVoucherClick,
  // The supplier's address — printed under the supplier's name.
  supplierAddress = "",
  // The supplier's TIN — under the address.
  supplierTIN = "",
  // True when the list header already carries the supplier's details, so the
  // row only needs the PO number.
  compact = false,
  // Adds a particular to the voucher (shown when the list has no header of
  // its own to hold it).
  onAddItem,
  isJEVPage = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const rowId = link.nVoucherSupplierId;
  const poNo =
    link.purchase_order?.strPurchaseOrderNo ?? `PO #${link.nPurchaseOrderId}`;
  const options = link.purchase_order?.purchase_order_options || [];
  // The transaction the PO belongs to — printed after the voucher's number.
  const transactionCode =
    options[0]?.purchase_option?.transaction_item?.transaction?.strCode ?? "";
  // The supplier behind this PO — printed under the code. The voucher's own
  // supplier is passed in (the PO graph does not load the option's supplier).
  const supplierNickName =
    supplierNickNameProp ||
    options[0]?.purchase_option?.supplier?.strSupplierNickName ||
    link.purchase_order?.supplier?.strSupplierNickName ||
    "";

  const poTotal = options.reduce((sum, opt) => {
    const p = opt.purchase_option;
    return sum + (p?.nQuantity || 0) * (p?.dUnitPrice || 0);
  }, 0);

  const poQtyTotal = options.reduce(
    (sum, opt) => sum + Number(opt.purchase_option?.nQuantity || 0),
    0,
  );

  const poEwtTotal = options.reduce(
    (sum, opt) => sum + Number(opt.purchase_option?.dEWT || 0),
    0,
  );

  // The supplier's address and TIN — the shared fallbacks fill in whatever
  // is not on file.
  const contact = contactFallbacks(supplierAddress, supplierTIN);

  return (
    <Box
      sx={{
        borderBottom:
          idx < totalCount - 1 ? `0.5px solid ${colors.divider}` : "none",
      }}
    >
      {/* PO ROW HEADER — clicking the row opens / closes its items. */}
      <Box
        onClick={onToggle}
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          position: "sticky",
          top: 0,
          background: colors.hover,
          backdropFilter: "blur(6px)",
          zIndex: 2,
          cursor: "pointer",
          "&:hover": { background: colors.hover },
          transition: "background 0.15s",
        }}
      >
        {/* The receipt icon marks the PO — the PO number below is the link
            that opens it. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* The voucher's own number — the top line of the block, ABOVE
              the supplier's name. It has to be a BLOCK: as a plain span or
              button it stays inline, and the supplier block below it is
              inline-block too, so the two ended up sharing one line — the
              DV code sitting to the LEFT of the supplier's name.

              With several POs the list header already prints the DV code,
              so the rows leave it out — it would just repeat it on every
              row of the same list. */}
          {voucherNumber && !compact && (
            <Typography
              component={onVoucherClick ? "button" : "span"}
              onClick={
                onVoucherClick
                  ? (e) => {
                      e.stopPropagation();
                      onVoucherClick();
                    }
                  : undefined
              }
              title={onVoucherClick ? "Open this voucher" : undefined}
              sx={{
                fontSize: { xs: "0.5rem", sm: "0.55rem", md: "0.58rem" },
                fontWeight: 700,
                // Blue when it opens the voucher — it is a link then.
                color: onVoucherClick ? colors.blue.text : colors.gray.textMuted,
                textTransform: "uppercase",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                // Block, so it takes a line of its own above the supplier.
                display: "block",
                width: onVoucherClick ? "fit-content" : "auto",
                p: 0,
                border: "none",
                background: "transparent",
                fontFamily: "inherit",
                cursor: onVoucherClick ? "pointer" : "inherit",
                "&:hover": onVoucherClick
                  ? { textDecoration: "underline" }
                  : undefined,
              }}
            >
              {voucherNumber}
            </Typography>
          )}

          {compact ? (
            /* The list header carries the supplier, so the row only needs
               the PO number — with the transaction code under it. */
            <>
              <Typography
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(link.nPurchaseOrderId);
                }}
                title="Open this purchase order"
                sx={{
                  fontSize: { xs: "0.72rem", sm: "0.8rem", md: "0.88rem" },
                  fontWeight: 700,
                  color: colors.blue.text,
                  textTransform: "uppercase",
                  cursor: onNavigate ? "pointer" : "default",
                  // The box hugs the text — otherwise the whole column width is
                  // a link and clicking the empty space opens the PO. No
                  // overflow clipping here: it would cut the hover
                  // underline in half.
                  display: "block",
                  width: "fit-content",
                  maxWidth: "100%",
                  lineHeight: 1,
                  mt: 0.15,
                  whiteSpace: "nowrap",
                  ...(onNavigate && {
                    "&:hover": { textDecoration: "underline" },
                  }),
                }}
              >
                {poNo}
              </Typography>
              {transactionCode && (
                <Typography
                  sx={{
                    fontSize: { xs: "0.4rem", sm: "0.44rem", md: "0.48rem" },
                    color: colors.gray.textMuted,
                    lineHeight: 1.15,
                    mt: 0.15,
                    whiteSpace: "nowrap",
                  }}
                >
                  {transactionCode}
                </Typography>
              )}
            </>
          ) : (
            /* One PO only — the row keeps the full layout. */
            <Box sx={{ display: "inline-block", minWidth: 0, mt: 0.15 }}>
              {/* The supplier's name with the transaction code beside it. */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 0.6,
                  minWidth: 0,
                }}
              >
                {supplierNickName && (
                  <Typography
                    sx={{
                      fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                      fontWeight: 700,
                      color: colors.gray.textPrimary,
                      textTransform: "uppercase",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {supplierNickName}
                  </Typography>
                )}
                {transactionCode && (
                  <Typography
                    sx={{
                      fontSize: { xs: "0.44rem", sm: "0.48rem", md: "0.52rem" },
                      color: colors.gray.textMuted,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {transactionCode}
                  </Typography>
                )}
              </Box>
              {/* The supplier's address, under its name. */}
              {contact.combined ? (
                <Typography
                  sx={{
                    fontSize: { xs: "0.48rem", sm: "0.52rem", md: "0.56rem" },
                    fontWeight: 500,
                    textTransform: "uppercase",
                    color: colors.gray.textMuted,
                    lineHeight: 1.15,
                    mt: 0.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {contact.combined}
                </Typography>
              ) : (
                <>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.48rem", sm: "0.52rem", md: "0.56rem" },
                      fontWeight: 500,
                      textTransform: "uppercase",
                      color: colors.gray.textMuted,
                      lineHeight: 1.15,
                      mt: 0.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {contact.address}
                  </Typography>
                  {/* …and the TIN under the address. */}
                  <Typography
                    sx={{
                      fontSize: { xs: "0.48rem", sm: "0.52rem", md: "0.56rem" },
                      fontWeight: 500,
                      textTransform: "uppercase",
                      color: colors.gray.textMuted,
                      lineHeight: 1.15,
                      mt: 0.05,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {contact.tin}
                  </Typography>
                </>
              )}
              {/* The PO number — the last line of the block. */}
              <Typography
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(link.nPurchaseOrderId);
                }}
                title="Open this purchase order"
                sx={{
                  fontSize: { xs: "0.5rem", sm: "0.54rem", md: "0.58rem" },
                  fontWeight: 700,
                  color: colors.blue.text,
                  cursor: onNavigate ? "pointer" : "default",
                  // The box hugs the text — otherwise the whole column width is
                  // a link and clicking the empty space opens the PO. No
                  // overflow clipping here: it would cut the hover
                  // underline in half.
                  display: "block",
                  width: "fit-content",
                  maxWidth: "100%",
                  lineHeight: 1.15,
                  mt: 0.15,
                  whiteSpace: "nowrap",
                  ...(onNavigate && {
                    "&:hover": { textDecoration: "underline" },
                  }),
                }}
              >
                {poNo}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right-side cluster: the action buttons. The amounts live in the
            Grand Total at the foot of the list. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.35, sm: 0.5 },
            flexShrink: 0,
          }}
        >
          {/* A single PO has no list header of its own, so the button sits
              here — left of the others. */}
          {onAddItem && <AddItemButton onClick={onAddItem} c={colors} />}
          {onRemove && (
            <IconButton
              size="small"
              disabled={isRemoving}
              onClick={(e) => {
                // The row toggles on its own — the button must not double up.
                e.stopPropagation();
                onRemove?.();
              }}
              sx={{
                width: { xs: 18, sm: 20 },
                height: { xs: 18, sm: 20 },
                borderRadius: "50px",
                border: `0.5px solid ${colors.red.border}`,
                background: colors.red.bg,
                color: colors.red.text,
                opacity: isRemoving ? 0.4 : 0.85,
                "&:hover": { background: colors.red.bg, opacity: 1 },
                p: 0,
                flexShrink: 0,
              }}
            >
              {isRemoving ? (
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    border: `1.5px solid ${colors.red.text}`,
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              ) : (
                <DeleteOutlineOutlined
                  sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                />
              )}
            </IconButton>
          )}
          {options.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                // The row toggles on its own — the button must not double up.
                e.stopPropagation();
                onToggle?.();
              }}
              sx={{
                width: { xs: 18, sm: 20 },
                height: { xs: 18, sm: 20 },
                color: colors.gray.textMuted,
                border: `0.5px solid ${colors.border}`,
                borderRadius: "50px",
                p: 0,
                // The same gap as the buttons before it — the row's own
                // spacing, nothing more.
              }}
            >
              {isOpen ? (
                <KeyboardArrowUp
                  sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                />
              ) : (
                <KeyboardArrowDown
                  sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                />
              )}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* EXPANDED ITEMS */}
      {isOpen && options.length > 0 && (
        <Box
          sx={{
            background: colors.expandedBg,
            borderTop: `0.5px solid ${colors.divider}`,
            display: "flex",
            flexDirection: "column",
            maxHeight: "30vh",
          }}
        >
          {/* ITEMS HEADER — Desktop only */}
          <Box
            sx={{
              px: 2,
              py: 1,
              pl: 2,
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "space-between",
              background: colors.itemHeaderBg,
              backdropFilter: "blur(6px)",
              borderBottom: `0.5px solid ${colors.divider}`,
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flex: 1,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  flexShrink: 0,
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: colors.gray.textSecondary,
                    letterSpacing: "0.03em",
                    lineHeight: 1,
                  }}
                >
                  #
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: colors.gray.textSecondary,
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
                gap: 3,
                flexShrink: 0,
              }}
            >
              {poEwtTotal > 0 && (
                <Box sx={{ minWidth: 70, textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: colors.gray.textSecondary,
                      letterSpacing: "0.03em",
                    }}
                  >
                    EWT
                  </Typography>
                </Box>
              )}
              <Box sx={{ minWidth: 60, textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: colors.gray.textSecondary,
                    letterSpacing: "0.03em",
                  }}
                >
                  QTY
                </Typography>
              </Box>
              <Box sx={{ minWidth: 80, textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: colors.gray.textSecondary,
                    letterSpacing: "0.03em",
                  }}
                >
                  UNIT PRICE
                </Typography>
              </Box>
              <Box sx={{ minWidth: 80, textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: colors.gray.textSecondary,
                    letterSpacing: "0.03em",
                  }}
                >
                  TOTAL
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* SCROLLABLE ITEMS BODY */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              "&::-webkit-scrollbar": { width: 3 },
              "&::-webkit-scrollbar-thumb": {
                background: colors.scrollbarThumb,
                borderRadius: 2,
              },
            }}
          >
            {options.map((opt, i) => {
              const p = opt.purchase_option;
              const lineTotal = (p?.nQuantity || 0) * (p?.dUnitPrice || 0);
              const ewtAmount = Number(p?.dEWT || 0);

              return (
                <Box
                  key={opt.nPurchaseOrder_ItemId ?? i}
                  sx={{
                    px: 2,
                    py: 1,
                    pl: 2,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 0.75, sm: 0 },
                    justifyContent: "space-between",
                    borderBottom:
                      i < options.length - 1
                        ? `0.5px solid ${colors.divider}`
                        : "none",
                    "&:hover": { background: colors.itemHover },
                  }}
                >
                  {/* LEFT — Item Info with the numbering column */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* The numbering — its own narrow column, centred on
                        the row (same as the Purchase Items table). */}
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
                          color: colors.gray.textSecondary,
                          lineHeight: 1,
                        }}
                      >
                        {i + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.4,
                          mb: 0.1,
                          flexWrap: "wrap",
                        }}
                      >
                        {(p?.strBrand || p?.strModel) && (
                          <Typography
                            onClick={
                              onBrandClick
                                ? () =>
                                    onBrandClick(
                                      p?.transaction_item?.transaction,
                                    )
                                : undefined
                            }
                            title={
                              onBrandClick
                                ? "Open this transaction for purchase"
                                : undefined
                            }
                            sx={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: onBrandClick
                                ? colors.blue.text
                                : colors.gray.textPrimary,
                              textTransform: "uppercase",
                              // The box hugs the text — only the words are the
                              // link, not the whole column width.
                              display: "inline-block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: onBrandClick ? "pointer" : "default",
                              ...(onBrandClick && {
                                "&:hover": { textDecoration: "underline" },
                              }),
                            }}
                          >
                            {[p?.strBrand, p?.strModel]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.58rem",
                          color: colors.gray.textSecondary,
                          textTransform: "uppercase",
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p?.transaction_item?.strName ?? "—"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* RIGHT — Item values */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "grid", sm: "row" },
                      gridTemplateColumns: { xs: "repeat(4, 1fr)" },
                      gap: { xs: 0.5, sm: 3 },
                      alignItems: { xs: "start", sm: "center" },
                      justifyContent: { xs: "space-between", sm: "flex-end" },
                      flexShrink: 0,
                    }}
                  >
                    {poEwtTotal > 0 && (
                      <Box
                        sx={{
                          minWidth: { sm: 70 },
                          textAlign: { xs: "right", sm: "right" },
                        }}
                      >
                        <Typography
                          sx={{
                            display: { xs: "block", sm: "none" },
                            fontSize: "0.45rem",
                            color: colors.gray.textSecondary,
                            lineHeight: 1,
                            mb: 0.1,
                          }}
                        >
                          EWT
                        </Typography>
                        <PickableValue
                          value={ewtAmount > 0 ? ewtAmount : undefined}
                          sx={{
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            color: colors.gray.textSecondary,
                          }}
                        >
                          {ewtAmount > 0 ? fmtPHP(ewtAmount) : "--"}
                        </PickableValue>
                      </Box>
                    )}
                    <Box
                      sx={{
                        minWidth: { sm: 60 },
                        textAlign: { xs: "right", sm: "right" },
                      }}
                    >
                      <Typography
                        sx={{
                          display: { xs: "block", sm: "none" },
                          fontSize: "0.45rem",
                          color: colors.gray.textSecondary,
                          lineHeight: 1,
                          mb: 0.1,
                        }}
                      >
                        QTY
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          color: colors.gray.textSecondary,
                          lineHeight: 1,
                        }}
                      >
                        {fmtQty(p?.nQuantity)}{" "}
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "0.5rem",
                            color: colors.gray.textSecondary,
                          }}
                        >
                          {p?.strUOM}
                        </Typography>
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        minWidth: { sm: 80 },
                        textAlign: { xs: "right", sm: "right" },
                      }}
                    >
                      <Typography
                        sx={{
                          display: { xs: "block", sm: "none" },
                          fontSize: "0.45rem",
                          color: colors.gray.textSecondary,
                          lineHeight: 1,
                          mb: 0.1,
                        }}
                      >
                        Unit Price
                      </Typography>
                      <PickableValue
                        value={p?.dUnitPrice}
                        sx={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          color: colors.gray.textSecondary,
                        }}
                      >
                        {fmtPHP(p?.dUnitPrice)}
                      </PickableValue>
                    </Box>
                    <Box
                      sx={{
                        minWidth: { sm: 80 },
                        textAlign: { xs: "right", sm: "right" },
                      }}
                    >
                      <Typography
                        sx={{
                          display: { xs: "block", sm: "none" },
                          fontSize: "0.45rem",
                          color: colors.gray.textSecondary,
                          lineHeight: 1,
                          mb: 0.1,
                        }}
                      >
                        Total
                      </Typography>
                      <PickableValue
                        value={lineTotal}
                        sx={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          color: colors.gray.textSecondary,
                        }}
                      >
                        {fmtPHP(lineTotal)}
                      </PickableValue>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* SUBTOTAL — Sticky bottom */}
          {totalCount > 1 && (
            <Box
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                alignItems: "center",
                background: colors.itemHover,
                borderTop: `0.5px solid ${colors.divider}`,
                flexShrink: 0,
                position: "sticky",
                bottom: 0,
                zIndex: 4,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: "0.67rem",
                    fontWeight: 700,
                    color: colors.gray.textPrimary,
                  }}
                >
                  Subtotal
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  flexShrink: 0,
                }}
              >
                <PickableValue
                  value={poTotal}
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: colors.amber.text,
                    textAlign: "right",
                  }}
                >
                  {fmtPHP(poTotal)}
                </PickableValue>
                <Typography
                  sx={{
                    fontSize: "0.57rem",
                    fontWeight: 500,
                    fontStyle: "italic",
                    color: colors.gray.textSecondary,
                    textAlign: "right",
                    lineHeight: 0.5,
                  }}
                >
                  {poEwtTotal > 0 ? (
                    <>
                      EWT:{" "}
                      <PickableValue variant="inherit" value={poEwtTotal}>
                        {fmtPHP(poEwtTotal)}
                      </PickableValue>
                    </>
                  ) : (
                    "No EWT"
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
