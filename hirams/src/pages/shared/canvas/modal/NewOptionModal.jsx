import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import EwtTypeField from "../../../../components/ui/form/EwtTypeField.jsx";
import { Typography, Link, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import SupplierContactField from "./SupplierContactField.jsx";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import { validateFormData } from "../../../../utils/form/validation.js";
import uiMessages from "../../../../utils/helpers/uiMessages.js";
import useMapping from "../../../../hooks/useMapping.js";

const initialFormData = {
  nSupplierId: "",
  quantity: "",
  uom: "",
  brand: "",
  model: "",
  specs: "",
  unitPrice: "",
  // The EWT TYPE — which formula the line's EWT is built from.
  // "" = Default (the supplier's own flags decide), "A" = 0% of Q,
  // "B" = 1% of Q, "C" = 2% of Q, "D" = 1% of Q / 1.12 (VAT net).
  cEWTType: "",
  bIncluded: true,
  // A new option joins the item's SELECTION. The Add-On switch moves it
  // to the extra list instead — the two are the same choice, so they
  // never sit in neither list.
  bAddOn: false,
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
  // The stage the modal was opened from — "canvas" (For Canvass),
  // "purchase" (For Purchase) or anything else. The Add-On rule only
  // bites in the first two.
  stage = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { ewtBypassType } = useMapping();

  // Wire up theme colors — SINGLE SOURCE from getThemeColors
  const baseColors = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(baseColors);

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const ewtDebounceRef = useRef(null);
  const [calculatedEWT, setCalculatedEWT] = useState("");
  const [ewtLoading, setEwtLoading] = useState(false);

  // The Add-On rule is enforced in the FOR CANVASS and FOR PURCHASE
  // stages only — the two where an item's quantity is being covered by
  // its selection. In every other stage (For Collection and the rest)
  // the switch is the user's to flip.
  const stageLocksAddOn = stage === "canvas" || stage === "purchase";

  // WHAT "the item's quantity is filled" means DEPENDS on the stage:
  // the CANVASS stage measures the SELECTION (the options included in
  // the item's requirement — the "3 / 3" in the Quantity column), the
  // PURCHASE stage measures what has actually been ORDERED (the "0 / 3"
  // on the options badge). Measuring the wrong one locks the switch
  // while the stage still says the item is short.
  const measurePurchased = stage === "purchase";

  // The item's quantity is ALREADY COVERED (10/10): there is nothing
  // left of the item for this option to be part of, so it can only ride
  // along as an add-on. The option being edited is left out of the sum
  // — it is the one in question. An item with no quantity of its own is
  // never "full" — there is nothing to fill.
  //
  // Add-ons never count towards the cover: an item whose ONLY option is
  // an add-on has nothing in its selection, so it is NOT full — the
  // switch stays free there, for adding and for editing alike.
  const selectionFillsItem = (() => {
    const item = sourceItem;
    if (!item) return false;
    const itemQty = Number(item.qty || 0);
    if (!(itemQty > 0)) return false;
    const covered = (item.purchaseOptions || [])
      .filter(
        (o) =>
          // An add-on is an EXTRA — it never covers the item.
          Number(o.bAddOn) !== 1 &&
          // CANVASS counts the selection, PURCHASE counts the orders.
          (measurePurchased
            ? Number(o.bPurchaseIncluded) === 1
            : !!o.bIncluded) &&
          o.id !== (editingOption?.id ?? null),
      )
      .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
    return covered >= itemQty;
  })();

  // The option being edited IS already an add-on.
  const optionIsAddOn =
    Number(editingOption?.bAddOn ?? formData.bAddOn) === 1;

  // The Add-On switch is locked ON when the item's quantity is already
  // filled by its selection — there is nothing left of that item for the
  // line to be part of, so it can only be an extra.
  //
  // A NEW option always answers to that rule. An option that is being
  // EDITED does not — except when it IS the add-on: turning that one
  // back into a normal option would push the item over its quantity
  // (10 already covered + the add-on = too much).
  const isAddOnLocked =
    stageLocksAddOn && selectionFillsItem && (!formData.id || optionIsAddOn);

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
        cEWTType: editingOption.cEWTType || "",
        bIncluded: isAddOnLocked ? false : !!editingOption.bIncluded,
        // Locked ON (the item's quantity is already filled) — the switch
        // reads ON and the option is an add-on.
        bAddOn: isAddOnLocked ? true : !!editingOption.bAddOn,
        id: editingOption.id,
        nSupplierContactId: editingOption.nSupplierContactId || "",
      });
      setCalculatedEWT(editingOption.dEWT || "");
    } else {
      setFormData({
        ...initialFormData,
        // Locked ON (the item's quantity is already filled) — the switch
        // reads ON and the option is an add-on.
        ...(isAddOnLocked ? { bAddOn: true, bIncluded: false } : null),
        quantity: sourceItem?.remainingQty ?? sourceItem?.qty ?? "",
        uom: sourceItem?.uom ?? "",
        specs: sourceItem?.specs ?? "",
      });
      setCalculatedEWT("");
    }
    setErrors({});
  }, [editingOption, open, isAddOnLocked]);

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
          // The line's EWT type — the server picks the formula.
          cEWTType: formData.cEWTType || null,
        });
        if (!cancelled) {
          const ewt = response.calculatedEWT;
          setCalculatedEWT(ewt);
        }
      } catch {
        if (!cancelled) {
          setCalculatedEWT("");
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
    formData.cEWTType,
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
    setFormData((prev) => {
      // The Add-On switch is the ONE choice: an option either joins the
      // item's selection (bIncluded) or rides along as an extra (bAddOn).
      // It can never be neither — an option in neither list shows up
      // nowhere at all.
      if (name === "bAddOn") {
        return { ...prev, bAddOn: checked, bIncluded: !checked };
      }
      return { ...prev, [name]: checked };
    });
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
      // The EWT itself is derived by the server from this type — the
      // amount is never sent by the client.
      cEWTType: formData.cEWTType || null,
      bIncluded: formData.bIncluded ? 1 : 0,
      // Locked ON (the item's quantity is already filled) — the option is
      // an add-on, so the value goes with the switch.
      bAddOn: (isAddOnLocked || formData.bAddOn) ? 1 : 0,
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

  // The option's fields are ALWAYS editable — the For Purchase stage used
  // to lock the ones already on the order, but a line can be corrected
  // at any time.

  const fields = [
    { name: "brand", label: "Brand", xs: 4 },
    { name: "model", label: "Model", xs: 4 },
    {
      name: "nSupplierId",
      label: "Supplier",
      type: "select",
      options: suppliers,
      xs: 4,
      value: formData.nSupplierId,
      onChange: handleSupplierChange,
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
      // The EWT amount is DERIVED (server-side) from the line's EWT type —
      // the field only shows it and lets the user pick the type.
      name: "_ewtType",
      type: "custom",
      xs: 4,
      render: () => (
        <EwtTypeField
          value={formData.cEWTType}
          amount={calculatedEWT === "" ? null : Number(calculatedEWT)}
          loading={ewtLoading}
          labels={ewtBypassType}
          onChange={(type) =>
            setFormData((prev) => ({ ...prev, cEWTType: type }))
          }
        />
      ),
    },
    {
      name: "specs",
      label: "Specifications",
      placeholder: "Type here the specifications...",
      type: "textarea",
      xs: 12,
      multiline: true,
      minRows: 3,
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

  // The Add-On is ON and locked whenever the item's quantity is already
  // filled by its selection (there is nothing left of the item for this
  // option to be part of) — and only in the For Canvass / For Purchase
  // stages. In every other stage the switch is the user's to flip.
  const switches = [
    { name: "bAddOn", label: "Add-On?", xs: 12, disabled: isAddOnLocked },
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
