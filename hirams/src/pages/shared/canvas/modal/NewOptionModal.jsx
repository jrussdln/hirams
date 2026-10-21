import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import { Typography, Link, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import SupplierContactField from "./SupplierContactField.jsx";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import { validateFormData } from "../../../../utils/form/validation.js";
import uiMessages from "../../../../utils/helpers/uiMessages.js";

const initialFormData = {
  nSupplierId: "",
  quantity: "",
  uom: "",
  brand: "",
  model: "",
  specs: "",
  unitPrice: "",
  ewt: "",
  bIncluded: false,
  bAddOn: true,
  nSupplierContactId: "",
};

// ── Theme Color Map — ONLY uses tokens from getThemeColors ──
const useColors = (c) => ({
  // slate (structural surfaces)
  bgPaper: c.slate.outerBg,
  // mutedBg always resolves, so the old isDark fallback branch was dead code
  bgSoft: c.slate.mutedBg,
  border: c.slate.border,

  // gray (text hierarchy + inputs)
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  bgInput: c.gray.inputBg,

  // accent colors
  primary: c.blue.textStrong,
  primaryBg: c.blue.bg,
  success: c.green.text,
  successDark: c.green.textDark,
  successBg: c.green.bg,
  successBgSoft: c.green.bgSoft,
  error: c.red.text,
  borderError: c.red.borderStrong,
  borderFocus: c.blue.borderStrong,
  hoverBg: c.slate.hover,
});

function NewOptionModal({
  open,
  onClose,
  editingOption,
  itemId,
  sourceItem,
  onSuccess,
  suppliers,
  cItemType,
  isForPurchase = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // Wire up theme colors — SINGLE SOURCE from getThemeColors
  const baseColors = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(baseColors);

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const ewtDebounceRef = useRef(null);
  const [calculatedEWT, setCalculatedEWT] = useState("");
  const [ewtLoading, setEwtLoading] = useState(false);

  useEffect(() => {
    if (editingOption) {
      setFormData({
        nSupplierId: editingOption.nSupplierId || "",
        quantity: editingOption.nQuantity || "",
        uom: editingOption.strUOM || "",
        brand: editingOption.strBrand || "",
        model: editingOption.strModel || "",
        specs: editingOption.strSpecs || "",
        unitPrice: editingOption.dUnitPrice || "",
        ewt: editingOption.dEWT || "",
        bIncluded: !!editingOption.bIncluded,
        bAddOn: editingOption.bAddOn,
        id: editingOption.id,
        nSupplierContactId: editingOption.nSupplierContactId || "",
      });
      setCalculatedEWT(editingOption.dEWT || "");
    } else {
      setFormData({
        ...initialFormData,
        quantity: sourceItem?.remainingQty ?? sourceItem?.qty ?? "",
        uom: sourceItem?.uom ?? "",
        specs: sourceItem?.specs ?? "",
      });
      setCalculatedEWT("");
    }
    setErrors({});
  }, [editingOption, open]);

  useEffect(() => {
    const supplierId = Number(formData.nSupplierId);
    const quantity = Number(formData.quantity);
    const unitPrice = Number(formData.unitPrice);

    if (
      !supplierId ||
      !quantity ||
      !unitPrice ||
      isNaN(quantity) ||
      isNaN(unitPrice)
    ) {
      clearTimeout(ewtDebounceRef.current);
      setCalculatedEWT("");
      setFormData((prev) => ({ ...prev, ewt: "" }));
      setEwtLoading(false);
      return;
    }

    setEwtLoading(true);
    clearTimeout(ewtDebounceRef.current);
    let cancelled = false;

    ewtDebounceRef.current = setTimeout(async () => {
      try {
        const response = await PurchaseOptionAPI.calculateEWT({
          nSupplierId: supplierId,
          quantity,
          unitPrice,
          cItemType,
        });
        if (!cancelled) {
          const ewt = response.calculatedEWT;
          setCalculatedEWT(ewt);
          setFormData((prev) => ({ ...prev, ewt }));
        }
      } catch {
        if (!cancelled) {
          setCalculatedEWT("");
          setFormData((prev) => ({ ...prev, ewt: "" }));
        }
      } finally {
        if (!cancelled) setEwtLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(ewtDebounceRef.current);
    };
  }, [
    Number(formData.nSupplierId),
    Number(formData.quantity),
    Number(formData.unitPrice),
    cItemType,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSupplierChange = (value) => {
    const selectedSupplier = suppliers.find((s) => s.value === Number(value));
    setFormData((prev) => ({
      ...prev,
      nSupplierId: selectedSupplier?.value || "",
      // the contact belongs to the old supplier — the picker reloads its list
      nSupplierContactId: "",
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validate = () => {
    const validationErrors = validateFormData(formData, "TRANSACTION_OPTION");
    if (!formData.nSupplierContactId) {
      validationErrors.nSupplierContactId = "Supplier contact is required.";
    }
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const brandModel =
      formData.model || formData.brand
        ? `${formData.model || ""}${formData.model && formData.brand ? " (" : ""}${formData.brand || ""}${formData.model && formData.brand ? ")" : ""}`
        : "Purchase Option";
    const entity = brandModel;
    const isEdit = Boolean(formData.id);

    // ✅ FIXED: removed the stray "npayload = {" typo
    const payload = {
      nTransactionItemId: itemId,
      nSupplierId: formData.nSupplierId || null,
      quantity: Number(formData.quantity),
      uom: formData.uom,
      brand: formData.brand || null,
      model: formData.model || null,
      specs: formData.specs || null,
      unitPrice: Number(formData.unitPrice),
      ewt: Number(formData.ewt) || 0,
      bIncluded: formData.bIncluded ? 1 : 0,
      bAddOn: formData.bAddOn ? 1 : 0,
      nSupplierContactId: formData.nSupplierContactId || null,
    };

    try {
      handleClose();
      await withSpinner(entity, async () => {
        if (isEdit) await PurchaseOptionAPI.updateOption(formData.id, payload);
        else await PurchaseOptionAPI.createOption(payload);
        await onSuccess();
      });
      await showSwal(
        "SUCCESS",
        {},
        { entity, action: isEdit ? "updated" : "added" },
      );
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          general: `${uiMessages.common.errorMessage}`,
        },
      );
      await showSwal("ERROR", {}, { entity });
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setEwtLoading(false);
    onClose();
  };

  // In For Purchase only options that are part of the selection (bIncluded)
  // get locked — an option added straight from this page (bIncluded = 0) stays
  // fully editable. Falls back to the loaded form flag if the prop is absent.
  const optionIncluded =
    Number(editingOption?.bIncluded ?? formData.bIncluded) === 1;
  const isEditForPurchase =
    Boolean(formData.id) && Boolean(isForPurchase) && optionIncluded;

  const fields = [
    { name: "brand", label: "Brand", xs: 4, disabled: isEditForPurchase },
    { name: "model", label: "Model", xs: 4, disabled: isEditForPurchase },
    {
      name: "nSupplierId",
      label: "Supplier",
      type: "select",
      options: suppliers,
      xs: 4,
      value: formData.nSupplierId,
      onChange: handleSupplierChange,
      disabled: isEditForPurchase,
    },
    {
      name: "_supplierLink",
      type: "custom",
      xs: 12,
      render: () => (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "right",
            mt: -0.5,
            fontSize: "0.65rem",
            lineHeight: 1,
            color: colors.textSecondary,
          }}
        >
          New Supplier?{" "}
          <Link
            component="button"
            underline="hover"
            sx={{ fontSize: "inherit", color: colors.primary }}
            onClick={() => {
              handleClose();
              navigate("/supplier?add=true");
            }}
          >
            Click here
          </Link>
        </Typography>
      ),
    },
    {
      name: "_supplierContact",
      type: "custom",
      xs: 12,
      render: () => (
        <SupplierContactField
          supplierId={formData.nSupplierId}
          value={formData.nSupplierContactId}
          onChange={(id) =>
            setFormData((prev) => ({ ...prev, nSupplierContactId: id }))
          }
          error={errors.nSupplierContactId}
        />
      ),
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      xs: 4,
      numberOnly: true,
    },
    {
      name: "unitPrice",
      label: "Unit Price",
      type: "peso",
      xs: 4,
      numberOnly: true,
    },
    {
      name: "ewt",
      label: ewtLoading ? "EWT (calculating...)" : "EWT",
      type: "peso",
      xs: 4,
      numberOnly: true,
      value: calculatedEWT ? Number(calculatedEWT) : "",
      onChange: (e) =>
        setFormData((prev) => ({ ...prev, ewt: e.target.value })),
      placeholder: calculatedEWT
        ? Number(calculatedEWT).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00",
      disabled: isEditForPurchase,
    },
    {
      name: "specs",
      label: "Specifications",
      placeholder: "Type here the specifications...",
      type: "textarea",
      xs: 12,
      multiline: true,
      minRows: 3,
      showOnlyHighlighter: isEditForPurchase,
      showAllFormatting: !isEditForPurchase,
      readOnlyHighlight: isEditForPurchase,
      sx: {
        "& textarea": {
          resize: "vertical",
          userSelect: "text",
          pointerEvents: "auto",
          backgroundColor: colors.bgSoft,
          borderRadius: 2,
          fontSize: "0.7rem",
          color: colors.textPrimary,
        },
      },
    },
  ];

  // The Add-On is ON and locked: an option added for a purchase is always
  // an add-on, and it cannot be switched off.
  const switches = [
    { name: "bAddOn", label: "Add-On?", xs: 12, disabled: true },
  ];

  if (!open) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title={formData?.id ? "Edit Purchase Option" : "Add Purchase Option"}
      subTitle={
        formData.brand || formData.model
          ? `${[formData.brand, formData.model].filter(Boolean).join(" ")}`
          : ""
      }
      onSave={handleSave}
      disabled={ewtLoading}
    >
      <FormGrid
        fields={fields}
        switches={switches}
        formData={formData}
        errors={errors}
        handleChange={handleChange}
        handleSwitchChange={handleSwitchChange}
      />
    </ModalContainer>
  );
}

export default NewOptionModal;
