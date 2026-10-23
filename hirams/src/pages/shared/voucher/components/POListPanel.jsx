import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import {
  ReceiptLongOutlined,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { useMemo } from "react";
import { fmtPHP } from "../../../../utils/formatters/formatter";
import { totalEWT } from "../../../../utils/helpers/calculateEWT.js";
import getThemeColors from "../../../../utils/style/getThemeColors";
import PORowPanel from "./PORowPanel";
import PickableValue from "../../jev/components/AmountPick.jsx";
import AddItemButton from "./AddItemButton.jsx";
import { contactFallbacks } from "./contactFallbacks.js";

const useColors = (c) => ({
  border: c.slate.border,
  scrollbarThumb: c.slate.scrollbarThumb,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
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
});

export default function POListPanel({
  supplierLinks = [],
  onRemovePO,
  isJEVPage = false,
  onBrandClick,
  // The voucher's supplier nickname — the PO graph has no supplier loaded.
  supplierNickName = "",
  // The voucher's own number (DV No.).
  voucherNumber = "",
  // The supplier's address.
  supplierAddress = "",
  // The supplier's TIN.
  supplierTIN = "",
  // The DV code becomes a LINK when this is set — it opens the voucher
  // itself (the JEV viewer hands it over).
  onVoucherClick,
  // Adds a particular to the voucher.
  onAddItem,
  // Opens the Freight / EWT editor for the clicked row's PO.
  onFreightEwt,
  // The PO numbers are LINKS while this is true. False renders them plain
  // — surfaces where the reader has no business jumping to purchasing.
  navigable = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState(null);
  const [openRows, setOpenRows] = useState({});
  // The triangle folds the whole list of POs away.
  const [rowsOpen, setRowsOpen] = useState(true);
  // With several POs the header carries the supplier's details and the rows
  // only need the PO number; with a single PO the row keeps the full layout
  // and the header is skipped.
  const multiplePOs = supplierLinks.length > 1;
  // The shared fallbacks fill in an address / TIN that is not on file.
  const contact = contactFallbacks(supplierAddress, supplierTIN);

  const handleRemove = async (id) => {
    setRemovingId(id);
    try {
      await onRemovePO?.(id);
    } finally {
      setRemovingId(null);
    }
  };

  const toggleRow = (id) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (purchaseOrderId) => {
    if (!navigable) return;
    navigate(`/item-purchasing-update?id=${purchaseOrderId}`);
  };

  // The grand total of every linked PO — the foot of the list.
  const grandTotal = supplierLinks.reduce((sum, link) => {
    const opts = link.purchase_order?.purchase_order_options || [];
    return (
      sum +
      opts.reduce(
        (s, opt) =>
          s +
          (opt.purchase_option?.nQuantity || 0) *
            (opt.purchase_option?.dUnitPrice || 0),
        0,
      )
    );
  }, 0);

  // The EWT is derived per line — see utils/helpers/calculateEWT.js
  const grandEwtTotal = supplierLinks.reduce((sum, link) => {
    const opts = link.purchase_order?.purchase_order_options || [];
    return sum + totalEWT(opts);
  }, 0);

  // The FREIGHT on the linked POs — the charge on top of the goods. It sits
  // on the PO itself, so a list of POs carries the sum of their freight.
  const freightTotal = supplierLinks.reduce(
    (sum, link) => sum + Number(link.purchase_order?.dFreight || 0),
    0,
  );

  if (supplierLinks.length === 0) {
    return (
      <Box
        sx={{
          mx: 1.5,
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${colors.border}`,
          px: 2,
          py: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}>
          No purchase orders linked.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: "10px",
        border: `0.5px solid ${colors.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "60vh",
      }}
    >
      {/* SECTION HEADER — the voucher's supplier, shown once for the whole
          list. With a single PO the row carries that detail itself, so the
          header is skipped and the chip moves into the row. */}
      {multiplePOs && (
        <Box
          onClick={() => setRowsOpen((v) => !v)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 2,
            py: 1,
            background: colors.itemHeaderBg,
            borderBottom: `0.5px solid ${colors.divider}`,
            cursor: "pointer",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {voucherNumber && (
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
                  color: onVoucherClick
                    ? colors.blue.text
                    : colors.gray.textMuted,
                  textTransform: "uppercase",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  // Block, so the DV code keeps a line of its own above
                  // the supplier's name.
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

            <Typography
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                fontWeight: 700,
                color: colors.gray.textPrimary,
                textTransform: "uppercase",
                lineHeight: 1,
                mt: 0.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {supplierNickName}
            </Typography>

            {contact.combined ? (
              <Typography
                sx={{
                  fontSize: "0.48rem",
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
                    fontSize: "0.48rem",
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
                <Typography
                  sx={{
                    fontSize: "0.48rem",
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
          </Box>

          <AddItemButton onClick={onAddItem} c={colors} />

          <IconButton
            size="small"
            onClick={(e) => {
              // The header toggles on its own — the button must not double up.
              e.stopPropagation();
              setRowsOpen((v) => !v);
            }}
            title={
              rowsOpen ? "Hide the purchase orders" : "Show the purchase orders"
            }
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              color: colors.gray.textMuted,
              border: `0.5px solid ${colors.border}`,
              borderRadius: "50px",
              p: 0,
              flexShrink: 0,
            }}
          >
            {rowsOpen ? (
              <KeyboardArrowUp
                sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
              />
            ) : (
              <KeyboardArrowDown
                sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
              />
            )}
          </IconButton>
        </Box>
      )}

      {rowsOpen && (
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
          {supplierLinks.map((link, idx) => {
            const rowId = link.nVoucherSupplierId;
            const isOpen = !!openRows[rowId];
            const isRemoving = removingId === rowId;

            return (
              <PORowPanel
                key={rowId}
                link={link}
                idx={idx}
                totalCount={supplierLinks.length}
                isOpen={isOpen}
                isRemoving={isRemoving}
                onToggle={() => toggleRow(rowId)}
                onRemove={onRemovePO ? () => handleRemove(rowId) : undefined}
                onNavigate={navigable ? handleNavigate : undefined}
                onBrandClick={onBrandClick}
                supplierNickName={supplierNickName}
                voucherNumber={voucherNumber}
                onVoucherClick={onVoucherClick}
                supplierAddress={supplierAddress}
                supplierTIN={supplierTIN}
                compact={multiplePOs}
                onAddItem={multiplePOs ? undefined : onAddItem}
                // The footer owns the Freight / EWT button for a single-PO
                // voucher; the per-row trucks only appear when several POs
                // share it (the footer button cannot say which PO it edits).
                onFreightEwt={
                  onFreightEwt && multiplePOs
                    ? () => onFreightEwt(link)
                    : undefined
                }
                isJEVPage={isJEVPage}
              />
            );
          })}
        </Box>
      )}

      {/* GRAND TOTAL — the foot of the list: the receipt icon, how many POs,
          and the amount with its EWT / NET underneath. */}
      <Box
        sx={{
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          background: colors.totalBg,
          borderTop: `1px solid ${colors.totalBorder}`,
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "7px",
            background: colors.blue.bg,
            border: `0.5px solid ${colors.blue.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1,
            flexShrink: 0,
          }}
        >
          <ReceiptLongOutlined
            sx={{ fontSize: "0.85rem", color: colors.blue.text }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: "0.67rem",
              fontWeight: 700,
              color: colors.gray.textPrimary,
            }}
          >
            Grand Total
          </Typography>
          <Typography
            sx={{ fontSize: "0.54rem", color: colors.gray.textSecondary }}
          >
            {supplierLinks.length} PO{supplierLinks.length !== 1 ? "s" : ""}
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
            value={grandTotal}
            sx={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color: colors.orange.text,
              textAlign: "right",
            }}
          >
            {fmtPHP(grandTotal)}
          </PickableValue>
          {/* FREIGHT — the charge on top of the goods, above the EWT line */}
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: colors.gray.textSecondary,
              textAlign: "right",
              lineHeight: 1.1,
            }}
          >
            {freightTotal > 0 ? (
              <>
                Freight:{" "}
                <PickableValue variant="inherit" value={freightTotal}>
                  {fmtPHP(freightTotal)}
                </PickableValue>
              </>
            ) : (
              "No Freight"
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: colors.gray.textSecondary,
              textAlign: "right",
              lineHeight: 1.1,
            }}
          >
            {grandEwtTotal > 0 ? (
              <>
                EWT:{" "}
                <PickableValue variant="inherit" value={grandEwtTotal}>
                  {fmtPHP(grandEwtTotal)}
                </PickableValue>
              </>
            ) : (
              "No EWT"
            )}
          </Typography>
          {/* NET mirrors the EWT line exactly so the two read as a pair */}
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: colors.gray.textSecondary,
              textAlign: "right",
              lineHeight: 1.1,
            }}
          >
            NET:{" "}
            <PickableValue
              variant="inherit"
              value={grandTotal - grandEwtTotal}
            >
              {fmtPHP(grandTotal - grandEwtTotal)}
            </PickableValue>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
