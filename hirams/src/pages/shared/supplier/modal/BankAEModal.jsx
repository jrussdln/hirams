import React, { useState, useEffect } from "react";
import { Grid, Box, Typography } from "@mui/material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import SupplierBankAPI from "../../../../api/endpoints/supplier-bank.api.js";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import { validateFormData } from "../../../../utils/form/validation";

export default function BankAEModal({
  open,
  onClose,
  supplierId,
  bank = null,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    strBankName: "",
    strAccountName: "",
    strAccountNumber: "",
  });
  const [errors, setErrors] = useState({});

  const isEdit = !!bank;

  useEffect(() => {
    if (!open) return;
    if (bank) {
      setFormData({
        strBankName: bank.strBankName || "",
        strAccountName: bank.strAccountName || "",
        strAccountNumber: bank.strAccountNumber || "",
      });
    } else {
      setFormData({
        strBankName: "",
        strAccountName: "",
        strAccountNumber: "",
      });
    }
    setErrors({});
  }, [open, bank]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const validationErrors = validateFormData(formData, "BANK_SUPPLIER");
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const entity = formData.strBankName.trim() || "Bank";
    onClose?.();
    try {
      await withSpinner(entity, async () => {
        const payload = {
          nSupplierId: supplierId,
          strBankName: formData.strBankName,
          strAccountName: formData.strAccountName,
          strAccountNumber: formData.strAccountNumber,
        };
        if (isEdit) {
          await SupplierBankAPI.updateBank(bank.nSupplierBankId, payload);
        } else {
          await SupplierBankAPI.createBank(payload);
        }
      });
      await showSwal("SUCCESS", {}, { entity, action: isEdit ? "updated" : "added" });
      onSuccess?.();
    } catch {
      setErrors({ general: "Failed to save bank" });
    }
  };

  const fields = [
    {
      name: "strBankName",
      label: "Bank Name",
      type: "text",
      required: true,
      gridSize: { xs: 12, sm: 6 },
    },
    {
      name: "strAccountName",
      label: "Account Name",
      type: "text",
      required: true,
      gridSize: { xs: 12, sm: 6 },
    },
    {
      name: "strAccountNumber",
      label: "Account Number",
      type: "text",
      required: true,
      gridSize: { xs: 12 },
    },
  ];

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={isEdit ? "Edit Bank" : "Add Bank"}
      onSave={handleSave}
      showSave
      saveLabel="Save"
      showCancel
      cancelLabel="Cancel"
      onCancel={onClose}
      width={600}
    >
      <FormGrid
        fields={fields}
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
    </ModalContainer>
  );
}
