import React, { useState, useEffect } from "react";
import { Grid, Box, Typography } from "@mui/material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import SupplierContactAPI from "../../../../api/endpoints/supplier-contact.api.js";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import {
  formatPhoneNo,
  phoneNoToStorage,
  phoneNoToDisplay,
} from "../../../../utils/formatters/formatter.js";
import { validateFormData } from "../../../../utils/form/validation";
import uiMessages from "../../../../utils/helpers/uiMessages";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";

const useColors = (c) => ({
  blueBg: c.blue.bg,
  blueHover: c.blue.hover,
  blueBorder: c.blue.border,
  blueText: c.blue.text,
  grayTextPrimary: c.gray.textPrimary,
  grayTextSecondary: c.gray.textSecondary,
});

export default function ContactAEModal({
  open,
  onClose,
  supplierId,
  contact = null,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    strName: "",
    strNumber: "",
    strPosition: "",
    strDepartment: "",
  });
  const [errors, setErrors] = useState({});

  const isEdit = !!contact;

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setFormData({
        strName: contact.strName || "",
        strNumber: phoneNoToDisplay(contact.strNumber || ""),
        strPosition: contact.strPosition || "",
        strDepartment: contact.strDepartment || "",
      });
    } else {
      setFormData({
        strName: "",
        strNumber: "",
        strPosition: "",
        strDepartment: "",
      });
    }
    setErrors({});
  }, [open, contact]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === "strNumber" ? formatPhoneNo(value) : value;
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const validationErrors = validateFormData(formData, "CONTACT_SUPPLIER");
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const entity = formData.strName.trim() || "Contact";
    onClose?.();
    try {
      await withSpinner(entity, async () => {
        const payload = {
          nSupplierId: supplierId,
          strName: formData.strName,
          strNumber: phoneNoToStorage(formData.strNumber),
          strPosition: formData.strPosition,
          strDepartment: formData.strDepartment,
        };
        if (isEdit) {
          await SupplierContactAPI.updateContact(contact.nSupplierContactId, payload);
        } else {
          await SupplierContactAPI.createContact(payload);
        }
      });
      await showSwal("SUCCESS", {}, { entity, action: isEdit ? "updated" : "added" });
      onSuccess?.();
    } catch {
      setErrors({ general: "Failed to save contact" });
    }
  };

  const fields = [
    {
      name: "strName",
      label: "Name",
      type: "text",
      required: true,
      gridSize: { xs: 12, sm: 6 },
    },
    {
      name: "strNumber",
      label: "Number",
      type: "text",
      required: true,
      gridSize: { xs: 12, sm: 6 },
    },
    {
      name: "strPosition",
      label: "Position",
      type: "text",
      gridSize: { xs: 12, sm: 6 },
    },
    {
      name: "strDepartment",
      label: "Department",
      type: "text",
      gridSize: { xs: 12, sm: 6 },
    },
  ];

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={isEdit ? "Edit Contact" : "Add Contact"}
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
