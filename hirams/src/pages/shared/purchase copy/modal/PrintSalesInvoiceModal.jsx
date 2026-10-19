import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Box, Typography } from "@mui/material";
import {
  ReceiptLongOutlined,
  PersonOutlined,
  StorefrontOutlined,
  LocalShippingOutlined,
} from "@mui/icons-material";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  divider: c.slate.border,
  dividerFaint: c.slate.divider,
  rowBorder: c.slate.borderRow,
  rowAltBg: c.slate.stripeAltBg,
  rowBg: c.print.paper,
  badgeBg: c.blue.bgSoft,
  badgeBorder: c.blue.border,
  badgeText: c.blue.text,
  textStrong: c.gray.textPrimary,
  textMed: c.gray.label,
  textFaint: c.gray.textDisabled,
  textMuted: c.gray.textSecondary,
  hoverBg: c.slate.hover,
  toggleActiveBg: c.blue.bgSoft,
  panelBg: c.slate.innerBg,
  panelBorder: c.slate.border,
  tableHeaderBg: c.slate.expandedBg,
  emptyIconColor: c.slate.scrollbarThumb,
  priceText: c.green.text,
  priceBg: c.green.bgSoft,
  priceBorder: c.green.border,
  successColor: c.green.text,
  successBorder: c.green.border,
  successDot: c.green.text,
  specHeaderBg: c.blue.bgSoft,
  specHeaderText: c.blue.text,
  specPanelBg: c.blue.bgSoft,
  textDisabled: c.gray.textDisabled,
  textSecondary: c.gray.textSecondary,
});

function InfoRow({ icon: Icon, label, value }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 0.6 }}>
      <Icon
        sx={{
          fontSize: "0.75rem",
          color: c.textDisabled,
          mt: "2px",
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: "0.65rem",
          color: c.textSecondary,
          flexShrink: 0,
          minWidth: 90,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.65rem",
          fontWeight: 600,
          color: c.textStrong,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function SectionHeader({ label }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, mt: 0.5 }}>
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          color: c.textDisabled,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "0.5px", background: c.divider }} />
    </Box>
  );
}

function ItemRow({ item, index }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  const [specsOpen, setSpecsOpen] = useState(false);
  const hasSpecs =
    item.itemSpecs &&
    item.itemSpecs.trim() &&
    item.itemSpecs.trim() !== "<p></p>";

  return (
    <Box
      sx={{
        borderBottom: `0.5px solid ${c.rowBorder}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1.5,
          py: 1.25,
          background:
            index % 2 === 0 ? c.rowAltBg : isDark ? "transparent" : c.rowBg,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "5px",
            background: c.badgeBg,
            border: `0.5px solid ${c.badgeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{ fontSize: "0.55rem", fontWeight: 700, color: c.badgeText }}
          >
            {index + 1}
          </Typography>
        </Box>
        <Typography
          sx={{
            flex: 1,
            fontSize: "0.7rem",
            fontWeight: 600,
            color: c.textStrong,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {item.itemName || "—"}
        </Typography>
        <Box sx={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}>
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: c.textMed,
              lineHeight: 1.2,
            }}
          >
            {item.itemQty ?? "—"}
          </Typography>
          {item.itemUOM && (
            <Typography
              sx={{
                fontSize: "0.5rem",
                color: c.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              {item.itemUOM}
            </Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: c.textMed,
            textAlign: "right",
            minWidth: 64,
            flexShrink: 0,
          }}
        >
          ₱{fmtPHP(item.unitPrice)}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: c.priceText,
            textAlign: "right",
            minWidth: 72,
            flexShrink: 0,
          }}
        >
          ₱{fmtPHP(item.totalPrice)}
        </Typography>
        {hasSpecs ? (
          <Box
            component="button"
            onClick={() => setSpecsOpen((v) => !v)}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 0.5,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <ArrowDropDownIcon
              sx={{
                fontSize: "1.2rem",
                color: specsOpen ? c.specHeaderText : c.textFaint,
                transform: specsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </Box>
        ) : (
          <Box sx={{ width: 28, flexShrink: 0 }} />
        )}
      </Box>

      {specsOpen && hasSpecs && (
        <>
          <Box
            sx={{
              px: 1.5,
              py: 0.4,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: c.specHeaderBg,
              borderBottom: `0.5px solid ${c.badgeBorder}`,
            }}
          >
            <Typography
              sx={{
                width: "100%",
                textAlign: "center",
                fontSize: "0.55rem",
                fontWeight: 700,
                color: c.specHeaderText,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Specifications
            </Typography>
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1,
              pl: 5,
              borderTop: `0.5px solid ${c.dividerFaint}`,
              background: c.specPanelBg,
              fontSize: "0.6rem",
              color: c.textMuted,
              lineHeight: 1.5,
              "& *": { backgroundColor: "transparent !important" },
              "& ul, & ol": { paddingLeft: "1rem", margin: 0 },
              "& p": { margin: 0 },
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: item.itemSpecs }}
          />
        </>
      )}
    </Box>
  );
}

export default function PrintSalesInvoiceModal({
  open,
  onClose,
  transaction,
  invoiceItems = [],
  assignedAOName,
  assignedAONo,
  transactionCode,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  if (!open || !transaction) return null;
  const grandTotal = invoiceItems.reduce(
    (sum, i) => sum + Number(i.totalPrice || 0),
    0,
  );

  const handlePrint = () => {
    navigate("/preview-si", {
      state: {
        transaction,
        invoiceItems,
        assignedAOName,
        assignedAONo,
        transactionCode,
      },
    });
  };

  const client = transaction?.client;

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Sales Invoice"
      subTitle={transactionCode ? `${transactionCode}` : ""}
      contentPadding={0}
      showSave={true}
      saveLabel="Print"
      onSave={handlePrint}
      disabled={invoiceItems.length === 0}
      showCancel={true}
      cancelLabel="Cancel"
      onCancel={onClose}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 2.5, py: 1.5 }}>
          {client && (client.strClientNickName || client.strClientName) && (
            <Box
              sx={{
                borderRadius: "8px",
                border: `0.5px solid ${c.panelBorder}`,
                background: c.panelBg,
                px: 1.5,
                py: 1,
                mb: 2,
              }}
            >
              <InfoRow
                icon={ReceiptLongOutlined}
                label="Transaction"
                value={
                  transaction?.strTitle
                    ? `${transactionCode} | ${transaction.strTitle}`
                    : transactionCode
                }
              />
              <InfoRow
                icon={PersonOutlined}
                label="Client"
                value={(
                  client.strClientNickName || client.strClientName
                )?.toUpperCase()}
              />
              {client.strTIN && (
                <InfoRow
                  icon={ReceiptLongOutlined}
                  label="TIN"
                  value={client.strTIN}
                />
              )}
              {client.strAddress && (
                <InfoRow
                  icon={LocalShippingOutlined}
                  label="Address"
                  value={client.strAddress}
                />
              )}
              {client.strBusinessStyle && (
                <InfoRow
                  icon={StorefrontOutlined}
                  label="Business Style"
                  value={client.strBusinessStyle}
                />
              )}
              <InfoRow
                icon={PersonOutlined}
                label="Account Officer"
                value={assignedAOName}
              />
            </Box>
          )}

          <SectionHeader label={`Invoice Items (${invoiceItems.length})`} />
          {invoiceItems.length === 0 ? (
            <Box
              sx={{
                borderRadius: "8px",
                border: `0.5px solid ${c.panelBorder}`,
                background: c.panelBg,
                px: 2,
                py: 3,
                textAlign: "center",
              }}
            >
              <ReceiptLongOutlined
                sx={{ fontSize: "1.5rem", color: c.emptyIconColor, mb: 0.5 }}
              />
              <Typography sx={{ fontSize: "0.65rem", color: c.textDisabled }}>
                No invoiceable items found for this transaction.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                borderRadius: "8px",
                border: `0.5px solid ${c.panelBorder}`,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.5,
                  py: 0.75,
                  background: c.tableHeaderBg,
                  borderBottom: `0.5px solid ${c.panelBorder}`,
                }}
              >
                <Box sx={{ width: 20, flexShrink: 0 }} />
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: "0.57rem",
                    fontWeight: 700,
                    color: c.textDisabled,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Item / Specifications
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.57rem",
                    fontWeight: 700,
                    minWidth: 44,
                    color: c.textDisabled,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    textAlign: "center",
                  }}
                >
                  Qty
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.57rem",
                    fontWeight: 700,
                    minWidth: 64,
                    color: c.textDisabled,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    textAlign: "right",
                  }}
                >
                  Unit Price
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.57rem",
                    fontWeight: 700,
                    minWidth: 72,
                    color: c.textDisabled,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    textAlign: "right",
                  }}
                >
                  Total
                </Typography>
                <Box sx={{ width: 28, flexShrink: 0 }} />
              </Box>
              {invoiceItems.map((item, i) => (
                <ItemRow key={i} item={item} index={i} />
              ))}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  background: c.priceBg,
                  borderTop: `0.5px solid ${c.priceBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: c.priceText,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Grand Total:
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: c.priceText,
                  }}
                >
                  ₱{fmtPHP(grandTotal)}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ModalContainer>
  );
}
