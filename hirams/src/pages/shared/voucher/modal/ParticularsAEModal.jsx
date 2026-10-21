import { useState, useEffect } from "react";
import { Box, Typography, Skeleton, useTheme } from "@mui/material";
import { AddOutlined, ReceiptLongOutlined } from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";
import VoucherAPI from "../../../../api/endpoints/voucher.api.js";
import VoucherSupplierAPI from "../../../../api/endpoints/voucher-supplier.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  blue: {
    bg: c.blue.bg,
    border: c.blue.border,
    text: c.blue.text,
    textStrong: c.blue.textStrong,
  },
  orange: { text: c.orange.text },
  red: { bg: c.red.bg, border: c.red.border, textDark: c.red.textDark },
  gray: { textPrimary: c.gray.textPrimary, textMuted: c.gray.textMuted },
  slate: {
    borderLight: c.slate.borderLight,
    borderRow: c.slate.borderRow,
    itemHover: c.slate.itemHover,
  },
});

export default function ParticularsAEModal({
  open,
  onClose,
  isAssigneeType,
  voucher,
  editingAssignee,
  formData,
  setFormData,
  formErrors,
  onSave,
  onSuccess,
  voucherActiveKey,
  // The PO status a voucher may pay — only a PO waiting for payment can be
  // linked. A PO still at For Approval is not ready to be paid.
  forPaymentKey,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = getThemeColors(isDark);
  const colors = useColors(base);

  const [availablePOs, setAvailablePOs] = useState([]);
  // The ACTIVE voucher that already holds a PO — it is taken over (and
  // deleted) when that PO is linked here.
  const [activeVoucherByPO, setActiveVoucherByPO] = useState(new Map());
  const [posLoading, setPosLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!open || isAssigneeType) return;
    const supplierId = voucher?.supplier?.nSupplierId ?? voucher?.nSupplierId;
    if (!supplierId) return setAvailablePOs([]);
    const load = async () => {
      setPosLoading(true);
      try {
        const [poRes, vRes] = await Promise.all([
          PurchaseOrderAPI.getBySupplier({ nSupplierId: supplierId }),
          VoucherAPI.getVouchers(),
        ]);
        const all = Array.isArray(poRes) ? poRes : (poRes.data ?? []);
        const vouchers = Array.isArray(vRes) ? vRes : (vRes.data ?? []);

        // A PO another voucher already holds belongs to it — UNLESS that
        // voucher is still ACTIVE, in which case it can be taken over (the
        // old voucher is deleted when the PO is linked here).
        const activeVoucherByPO = new Map();
        const takenForGood = new Set();
        vouchers.forEach((v) => {
          const links = v.voucher_suppliers ?? [];
          if (String(v.cStatus) === String(voucherActiveKey)) {
            links.forEach((vs) =>
              activeVoucherByPO.set(vs.nPurchaseOrderId, v),
            );
          } else {
            links.forEach((vs) => takenForGood.add(vs.nPurchaseOrderId));
          }
        });
        setActiveVoucherByPO(activeVoucherByPO);

        const linkedIds = new Set(
          (voucher.voucher_suppliers ?? []).map((s) => s.nPurchaseOrderId),
        );

        // Only the POs of the voucher's OWN company can be paid by it —
        // a PO belongs to the company that ordered it.
        const voucherCompanyId =
          voucher?.nCompanyId ?? voucher?.company?.nCompanyId ?? null;
        const poCompanyId = (po) =>
          po?.purchase_order_options?.[0]?.purchase_option?.transaction_item
            ?.transaction?.nCompanyId ??
          null;

        setAvailablePOs(
          all.filter(
            (po) =>
              // Only a PO that is ready to be paid — For Payment. A PO still
              // at For Approval has not been through approval yet.
              (!forPaymentKey || String(po.nStatus) === String(forPaymentKey)) &&
              !linkedIds.has(po.nPurchaseOrderId) &&
              !takenForGood.has(po.nPurchaseOrderId) &&
              (!voucherCompanyId || poCompanyId(po) === voucherCompanyId),
          ),
        );
      } catch {
        setAvailablePOs([]);
      } finally {
        setPosLoading(false);
      }
    };
    load();
  }, [open, isAssigneeType, voucher, voucherActiveKey, forPaymentKey]);

  useEffect(() => {
    if (!open) return;
    setLinkError("");
    setFormData({
      particular: editingAssignee?.strParticular || "",
      amount: editingAssignee?.dAmount || "",
      quantity: editingAssignee?.nQuantity || 1,
      strUOM: editingAssignee?.strUOM || "",
      ewt: editingAssignee?.dEWT || "",
    });
  }, [open, editingAssignee, setFormData]);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLinkPO = async (po) => {
    const existingLinks = voucher.voucher_suppliers ?? [];
    if (existingLinks.length > 0) {
      const existingTerms = existingLinks[0]?.purchase_order?.cPaymentTerms;
      if (String(po.cPaymentTerms) !== String(existingTerms)) {
        setLinkError(
          "Payment Terms does not match with the existing linked purchase order.",
        );
        return;
      }
    }

    const entity = "Purchase Order";
    setLinkError("");
    onClose?.();
    try {
      await withSpinner(entity, async () => {
        // The PO may still sit on another ACTIVE voucher — that voucher is
        // replaced by this one, so it (and its journal) goes first.
        const oldVoucher = activeVoucherByPO.get(po.nPurchaseOrderId);
        if (
          oldVoucher &&
          String(oldVoucher.nVoucherId) !== String(voucher.nVoucherId)
        ) {
          await VoucherAPI.deleteVoucher(oldVoucher.nVoucherId);
        }

        await VoucherSupplierAPI.create({
          nVoucherId: voucher.nVoucherId,
          nPurchaseOrderId: po.nPurchaseOrderId,
        });
        await onSuccess?.();
      });
      await showSwal("SUCCESS", {}, { entity, action: "linked" });
    } catch (e) {
      console.error(e);
      await showSwal("ERROR", {}, { entity });
    }
  };

  const handleSaveClick = async () => {
    const entity = "Particular";
    const action = editingAssignee ? "updated" : "added";
    onClose?.();
    try {
      await withSpinner(entity, async () => {
        await onSave?.();
      });
      await showSwal("SUCCESS", {}, { entity, action });
    } catch (e) {
      console.error(e);
      await showSwal("ERROR", {}, { entity });
    }
  };

  if (!open) return null;

  const formFields = [
    {
      name: "particular",
      label: "Particular",
      placeholder: "e.g. Office supplies",
      xs: 12,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      numberOnly: true,
      placeholder: "1",
      xs: 3,
    },
    { name: "strUOM", label: "UOM", placeholder: "pcs / kg", xs: 3 },
    {
      name: "amount",
      label: "Unit Amount",
      type: "peso",
      placeholder: "0.00",
      xs: 3,
    },
    {
      name: "ewt",
      label: "EWT",
      type: "peso",
      placeholder: "0.00",
      xs: 3,
   
    },
  ];

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={editingAssignee ? "Edit Particular" : "Add Particular"}
      subTitle={formData.particular ? `${formData.particular}` : ""}
      saveLabel={editingAssignee ? "Update Entry" : "Save Entry"}
      onSave={isAssigneeType ? handleSaveClick : undefined}
      showSave={isAssigneeType}
      cancelLabel="Back"
      onCancel={onClose}
    >
      {isAssigneeType ? (
        <Box sx={{ px: 1.5, py: 1 }}>
          <FormGrid
            fields={formFields}
            formData={formData}
            errors={formErrors}
            handleChange={handleChange}
            autoFocus={true}
          />

          <Box
            sx={{
              mt: 2,
              px: 1.25,
              py: 0.75,
              borderRadius: "8px",
              background: colors.blue.bg,
              border: `0.5px solid ${colors.blue.border}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: colors.blue.textStrong,
                }}
              >
                Total
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: colors.orange.text,
                }}
              >
                {fmtPHP(
                  Number(formData.amount || 0) *
                    Number(formData.quantity || 1),
                )}
              </Typography>
            </Box>

            {/* EWT is per line — show it (and the net) as soon as it is set */}
            {Number(formData.ewt || 0) > 0 && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      fontStyle: "italic",
                      color: colors.blue.textStrong,
                    }}
                  >
                    Less: EWT
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: colors.red.textDark,
                    }}
                  >
                    -{fmtPHP(Number(formData.ewt || 0))}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 0.25,
                    pt: 0.5,
                    borderTop: `0.5px solid ${colors.blue.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: colors.blue.textStrong,
                    }}
                  >
                    Net
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: colors.orange.text,
                    }}
                  >
                    {fmtPHP(
                      Number(formData.amount || 0) *
                        Number(formData.quantity || 1) -
                        Number(formData.ewt || 0),
                    )}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      ) : (
        <Box>
          {linkError && (
            <Box
              sx={{
                mx: 1.5,
                mt: 1,
                px: 1.5,
                py: 0.75,
                background: colors.red.bg,
                border: `1px solid ${colors.red.border}`,
                borderRadius: "8px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: colors.red.textDark,
                  fontWeight: 600,
                }}
              >
                {linkError}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              px: 2,
              pt: 1,
              pb: 0.5,
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
                letterSpacing: "0.08em",
                color: colors.gray.textMuted,
              }}
            >
              Available Purchase Orders
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: "0.5px",
                background: colors.slate.borderLight,
              }}
            />
          </Box>

          <Box
            sx={{
              mx: 1.5,
              mb: 1.5,
              borderRadius: "10px",
              border: `0.5px solid ${colors.slate.borderLight}`,
              overflow: "hidden",
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            {posLoading ? (
              [1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderBottom: `0.5px solid ${colors.slate.borderRow}`,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    width={30}
                    height={30}
                    sx={{ borderRadius: "7px" }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={14}
                      sx={{ mb: 0.5 }}
                    />
                    <Skeleton variant="text" width="30%" height={10} />
                  </Box>
                  <Skeleton variant="text" width={50} height={14} />
                  <Skeleton variant="rounded" width={40} height={20} />
                </Box>
              ))
            ) : availablePOs.length === 0 ? (
              <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}
                >
                  No available purchase orders for this supplier and company.
                </Typography>
              </Box>
            ) : (
              availablePOs.map((po, idx) => {
                const options = po.purchase_order_options ?? [];
                const poTotal = options.reduce(
                  (sum, opt) =>
                    sum +
                    (opt.purchase_option?.nQuantity || 0) *
                      (opt.purchase_option?.dUnitPrice || 0),
                  0,
                );

                return (
                  <Box
                    key={po.nPurchaseOrderId}
                    sx={{
                      px: 1.5,
                      py: 0.875,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderBottom:
                        idx < availablePOs.length - 1
                          ? `0.5px solid ${colors.slate.borderRow}`
                          : "none",
                      "&:hover": { background: colors.slate.itemHover },
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
                      }}
                    >
                      <ReceiptLongOutlined
                        sx={{ fontSize: "0.85rem", color: colors.blue.text }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: colors.gray.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {po.strPurchaseOrderNo ?? `PO #${po.nPurchaseOrderId}`}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.58rem",
                          color: colors.gray.textMuted,
                          mt: 0.2,
                        }}
                      >
                        {options.length}{" "}
                        {options.length === 1 ? "item" : "items"}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: colors.orange.text,
                      }}
                    >
                      {fmtPHP(poTotal)}
                    </Typography>
                    <Box
                      onClick={() => handleLinkPO(po)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.35,
                        px: 0.75,
                        py: 0.35,
                        borderRadius: "5px",
                        background: colors.blue.bg,
                        border: `0.5px solid ${colors.blue.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <AddOutlined
                        sx={{ fontSize: "0.6rem", color: colors.blue.text }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color: colors.blue.textStrong,
                          textTransform: "uppercase",
                        }}
                      >
                        Link
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      )}
    </ModalContainer>
  );
}
