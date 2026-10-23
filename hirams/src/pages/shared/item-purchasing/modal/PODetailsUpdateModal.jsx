import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import {
  ReceiptLongOutlined,
  LocalShippingOutlined,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  primary: c.green.paid,
  primaryDark: c.green.textDark,
  selectedBgStart: c.green.selectedBgStart,
  selectedBgEnd: c.green.selectedBgEnd,
  unselectedBg: c.slate.outerBg,
  hoverBg: c.green.badgeBg,
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textMuted: c.gray.textSecondary,
  inputBg: c.gray.inputBg,
  error: c.red.text,
});

// Default shipping instructions — shown in the editor AND submitted when the
// PO has no shipping details yet (single source of truth for both the modal
// display and the form state seeded by useItemPurchasingUpdateView).
export const DEFAULT_SHIPPING_DETAILS =
  `<p><strong>Shipment Type </strong><em>(Pick-Up, D2D Delivery, etc.)</em><strong>: </strong></p><p><br></p><p><em>For shipping to Aguileon:</em> <strong>DV : 50%</strong></p><p><em>Deliver the items to:</em></p><p><strong>Aguileon Cargo, <em>1426</em> Gelinos St, Brgy. 342,</strong></p><p><strong>Zone 34, Sta Cruz, Manila</strong></p><p><br></p><p><em>Contact No. </em><strong><em>0998-857-9593</em></strong></p>`;

export default function PODetailsUpdateModal({
  open,
  onClose,
  poNumber,
  paymentForm,
  setPaymentForm,
  paymentErrors,
  paymentTerms,
  loading,
  onSubmit,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Update PO Details"
      subTitle={poNumber || ""}
      onSave={onSubmit}
      saveLabel="Submit"
      onCancel={onClose}
      cancelLabel="Back"
      loading={loading}
      disableBackdropClick
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ReceiptLongOutlined
              sx={{ fontSize: "0.75rem", color: c.primary }}
            />
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: c.textPrimary,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Payment Terms
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {Object.entries(paymentTerms || {}).map(([key, lbl]) => {
              const selected = paymentForm.cPaymentTerms === key;
              return (
                <Box
                  key={key}
                  onClick={() =>
                    setPaymentForm((p) => ({ ...p, cPaymentTerms: key }))
                  }
                  sx={{
                    flex: 1,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9px",
                    border: selected
                      ? `1.5px solid ${c.primary}`
                      : `0.5px solid ${c.border}`,
                    background: selected
                      ? `linear-gradient(135deg, ${c.selectedBgStart} 0%, ${c.selectedBgEnd} 100%)`
                      : c.unselectedBg,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: selected ? `0 2px 8px ${c.primary}22` : "none",
                    "&:hover": {
                      borderColor: c.primary,
                      background: selected ? undefined : c.hoverBg,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: selected ? 700 : 500,
                      color: selected ? c.primaryDark : c.textMuted,
                    }}
                  >
                    {lbl}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {paymentErrors?.cPaymentTerms && (
            <Typography sx={{ fontSize: "0.6rem", color: c.error, mt: -0.25 }}>
              {paymentErrors.cPaymentTerms}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocalShippingOutlined
              sx={{ fontSize: "0.75rem", color: c.primary }}
            />
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: c.textPrimary,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Shipping
            </Typography>
          </Box>
          <FormGrid
            fields={[
              {
                name: "strShippingDetails",
                label: "",
                type: "textarea",
                xs: 12,
                multiline: true,
                minRows: 3,

                sx: {
                  "& textarea": {
                    resize: "vertical",
                    userSelect: "text",
                    pointerEvents: "auto",
                    backgroundColor: c.inputBg,
                    borderRadius: 2,
                    fontSize: "0.7rem",
                    color: "inherit",
                  },
                },
              },
            ]}
            formData={{
              strShippingDetails:
                paymentForm.strShippingDetails || DEFAULT_SHIPPING_DETAILS,
            }}
            handleChange={(e) =>
              setPaymentForm((p) => ({
                ...p,
                strShippingDetails: e.target.value,
              }))
            }
            errors={{ strShippingDetails: paymentErrors?.strShippingDetails }}
          />
        </Box>
      </Box>
    </ModalContainer>
  );
}
