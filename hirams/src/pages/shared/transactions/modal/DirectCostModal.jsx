import React, { useState, useEffect, useCallback } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import {
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  MonetizationOn,
  AttachMoney,
  AddCircleOutline as AddCircleOutlineIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import DirectCostAPI from "../../../../api/endpoints/direct-cost.api.js";
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import TransacVerificationModalContent from "../../../../components/ui/content/TransacVerificationModalContent.jsx";
import Toast from "../../../../components/ui/banner/Toast.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Theme Mapping — only tokens THIS component actually uses ──────────────────
const useColors = (c) => ({
  slateBorder: c.slate.border,
  slateBorderLight: c.slate.borderLight,
  slateHover: c.slate.hover,
  slateItemHover: c.slate.itemHover,
  slateInnerBg: c.slate.innerBg,
  slateMutedBg: c.slate.mutedBg,
  slateMutedBorder: c.slate.mutedBorder,
  slateMutedColor: c.slate.mutedColor,
  grayTextPrimary: c.gray.textPrimary,
  grayTextSecondary: c.gray.textSecondary,
  grayTextMuted: c.gray.textMuted,
  grayInputBg: c.gray.inputBg,
  blueBg: c.blue.bg,
  blueBorder: c.blue.border,
  blueBorderStrong: c.blue.borderStrong,
  blueText: c.blue.text,
  blueTextStrong: c.blue.textStrong,
  blueHover: c.blue.hover,
  blueActive: c.blue.active,
  amberBg: c.amber.bg,
  amberBgSoft: c.amber.bgSoft,
  amberBorder: c.amber.border,
  amberBorderStrong: c.amber.borderStrong,
  amberText: c.amber.text,
  amberTextStrong: c.amber.textStrong,
  amberHover: c.amber.hover,
  amberActive: c.amber.active,
  amberWarnBg: c.amber.warnBg,
  amberWarnBorder: c.amber.warnBorder,
  amberWarnText: c.amber.warnText,
  redBg: c.red.bg,
  redBorder: c.red.border,
  redBorderStrong: c.red.borderStrong,
  redText: c.red.text,
  redHover: c.red.hover,
  redActive: c.red.active,
  // shadows — geometry stays at the call site
  blueShadow: c.shadow.accentHover, // blue hover elevation
  warnShadow: c.shadow.dropdown, // static elevation on the amber callout
  iconOnFill: c.gray.textOnFill, // white glyph on a filled badge
});

const DirectCostRow = ({
  item,
  optionLabel,
  onEdit,
  onDelete,
  isManagement,
  isPricingSetting,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);
  // Always editable for management — the pricing-setting status gate is
  // removed, so editing works in every status (pricing, canvas, etc.).
  const canEdit = isManagement;
  const amount = Number(item.dAmount) || 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 2 },
        py: 1.2,
        px: { xs: 1, sm: 1.5 },
        borderRadius: 1.5,
        backgroundColor: amount > 0 ? colors.blueBg : colors.slateInnerBg,
        border: `1px solid ${amount > 0 ? colors.blueBorder : colors.slateBorder}`,
        transition: "all 0.2s ease",
        cursor: canEdit ? "pointer" : "default",
        "&:hover": canEdit
          ? {
              backgroundColor: colors.blueHover,
              borderColor: colors.blueBorderStrong,
              boxShadow: `0 2px 8px ${colors.blueShadow}`,
            }
          : {},
      }}
      onClick={() => canEdit && onEdit()}
    >
      <Box
        sx={{
          backgroundColor:
            amount > 0 ? colors.blueTextStrong : colors.slateMutedColor,
          borderRadius: "6px",
          p: 0.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background-color 0.2s",
        }}
      >
        <AttachMoney sx={{ color: colors.iconOnFill, fontSize: "0.9rem" }} />
      </Box>
      <Typography
        sx={{
          flex: 1,
          fontSize: "0.78rem",
          fontWeight: amount > 0 ? 600 : 500,
          color: amount > 0 ? colors.blueTextStrong : colors.grayTextSecondary,
          transition: "color 0.2s",
          display: { xs: "none", sm: "block" },
        }}
      >
        {optionLabel}
      </Typography>
      <Box
        sx={{
          width: { xs: "100px", sm: "150px" },
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 0.5,
          px: 1,
          borderRadius: 1,
          backgroundColor: colors.grayInputBg,
          border: `1px solid ${colors.slateBorder}`,
          flexShrink: 0,
          ml: { xs: "auto", sm: 0 },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: colors.grayTextSecondary,
          }}
        >
          ₱
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            fontWeight: amount > 0 ? 600 : 400,
            color: amount > 0 ? colors.blueTextStrong : colors.grayTextMuted,
          }}
        >
          {amount > 0
            ? amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "—"}
        </Typography>
      </Box>
      {canEdit && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{
            width: 24,
            height: 24,
            flexShrink: 0,
            bgcolor: colors.grayInputBg,
            border: `1px solid ${colors.slateBorder}`,
            "&:hover": {
              bgcolor: colors.redBg,
              borderColor: colors.redBorderStrong,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: "0.75rem", color: colors.redText }} />
        </IconButton>
      )}
    </Box>
  );
};

const AddCostRow = ({ onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 2 },
        py: 1.2,
        px: { xs: 1, sm: 1.5 },
        borderRadius: 1.5,
        backgroundColor: colors.slateInnerBg,
        border: `2px dashed ${colors.blueBorder}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: colors.blueBg,
          borderColor: colors.blueTextStrong,
          "& .add-icon": { color: colors.blueTextStrong },
          "& .add-label": { color: colors.blueTextStrong },
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: colors.blueBg,
          borderRadius: "6px",
          p: 0.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AddCircleOutlineIcon
          className="add-icon"
          sx={{
            color: colors.blueBorder,
            fontSize: "0.9rem",
            transition: "color 0.2s",
          }}
        />
      </Box>
      <Typography
        className="add-label"
        sx={{
          flex: 1,
          fontSize: "0.78rem",
          fontWeight: 500,
          color: colors.blueBorder,
          transition: "color 0.2s",
          display: { xs: "none", sm: "block" },
        }}
      >
        Add Direct Cost
      </Typography>
      <Box
        sx={{
          width: { xs: "100px", sm: "150px" },
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          backgroundColor: colors.grayInputBg,
          border: `1px dashed ${colors.slateMutedBorder}`,
          flexShrink: 0,
          ml: { xs: "auto", sm: 0 },
        }}
      >
        <Typography sx={{ fontSize: "0.72rem", color: colors.grayTextMuted }}>
          ₱ 0.00
        </Typography>
      </Box>
      <Box sx={{ width: 24, flexShrink: 0 }} />
    </Box>
  );
};

const EditFormRow = ({
  formData,
  errors,
  formFields,
  handleChange,
  onCancel,
  saving,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: { xs: 1, sm: 2 },
        py: 1.2,
        px: { xs: 1, sm: 1.5 },
        borderRadius: 1.5,
        backgroundColor: colors.amberWarnBg,
        border: `1.5px solid ${colors.amberWarnBorder}`,
        boxShadow: `0 2px 8px ${colors.warnShadow}`,
      }}
    >
      <Box
        sx={{
          backgroundColor: colors.amberTextStrong,
          borderRadius: "6px",
          p: 0.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        <AttachMoney sx={{ color: colors.iconOnFill, fontSize: "0.9rem" }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FormGrid
          fields={formFields}
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          autoFocus={false}
        />
      </Box>
      <IconButton
        size="small"
        onClick={onCancel}
        disabled={saving}
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          bgcolor: colors.grayInputBg,
          border: `1px solid ${colors.slateBorder}`,
          mt: 0.5,
          "&:hover": {
            bgcolor: colors.redBg,
            borderColor: colors.redBorderStrong,
          },
        }}
      >
        <CloseIcon sx={{ fontSize: "0.75rem", color: colors.redText }} />
      </IconButton>
    </Box>
  );
};

function DirectCostModal({
  open,
  onClose,
  transaction,
  isManagement = true,
  isPricingSetting,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const [directCostOptions, setDirectCostOptions] = useState([]);
  const [directCostList, setDirectCostList] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    nDirectCostOptionID: "",
    dAmount: "",
  });
  const [errors, setErrors] = useState({});
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteLetter, setDeleteLetter] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const handleCloseToast = () =>
    setToast({ open: false, message: "", severity: "success" });
  const [totalEWT, setTotalEWT] = useState(0);

  const isEWTOption = (optionId) => {
    const label = getOptionLabel(optionId);
    return label?.toLowerCase() === "ewt";
  };

  const getOptionLabel = useCallback(
    (optionId) => {
      const found = directCostOptions.find(
        (o) => (o.nDirectCostOptionID || o.id) === optionId,
      );
      return found?.strName || found?.name || "Direct Cost";
    },
    [directCostOptions],
  );

  const getAvailableOptions = useCallback(() => {
    const usedIds = directCostList
      .filter((_, i) => i !== editingIndex)
      .map((item) => item.nDirectCostOptionID);
    return directCostOptions.filter(
      (opt) => !usedIds.includes(opt.nDirectCostOptionID || opt.id),
    );
  }, [directCostOptions, directCostList, editingIndex]);

  const fetchData = useCallback(async () => {
    if (!transaction?.nTransactionId) return;
    setOptionsLoading(true);
    try {
      let optionsData = null;
      const cached = sessionStorage.getItem("direct_cost_options_cache");
      if (cached) optionsData = JSON.parse(cached);
      const costsPromise = DirectCostAPI.getByTransaction(
        transaction.nTransactionId,
        "&withEWT=1",
      );
      const optionsPromise = optionsData
        ? Promise.resolve(optionsData)
        : DirectCostOptionAPI.getDirectCostOptions();
      const [costsRes, optionsRes] = await Promise.all([
        costsPromise,
        optionsPromise,
      ]);
      const opts = optionsRes.data || optionsRes || [];
      if (!cached)
        sessionStorage.setItem(
          "direct_cost_options_cache",
          JSON.stringify(opts),
        );
      setDirectCostOptions(opts);
      setDirectCostList(
        costsRes.directCosts || costsRes.data || costsRes || [],
      );
      setTotalEWT(Number(costsRes.totalEWT) || 0);
    } catch (err) {
      console.error("Error fetching direct costs:", err);
    } finally {
      setOptionsLoading(false);
      setLoadingMessage("");
    }
  }, [transaction?.nTransactionId]);

  useEffect(() => {
    if (open) {
      fetchData();
      setEditingIndex(null);
      setDeleteIndex(null);
      setFormData({ nDirectCostOptionID: "", dAmount: "" });
      setErrors({});
    }
  }, [open, fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "nDirectCostOptionID") {
      // Selecting EWT pre-fills the field with the transaction's summed EWT
      // (so it can be saved as-is); any other cost type starts blank.
      const isEWT = isEWTOption(value);
      setFormData((prev) => ({
        ...prev,
        nDirectCostOptionID: value,
        dAmount: isEWT && totalEWT > 0 ? Number(totalEWT).toFixed(2) : "",
      }));
    } else {
      const sanitized =
        name === "dAmount" ? value.replace(/[^0-9.]/g, "") : value;
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
    }
    // Switching cost type rewrites dAmount, so drop the stale amount error too
    if (errors[name] || name === "nDirectCostOptionID") {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
        ...(name === "nDirectCostOptionID" ? { dAmount: "" } : {}),
      }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.nDirectCostOptionID) errs.nDirectCostOptionID = "Required";
    if (
      !formData.dAmount ||
      isNaN(Number(formData.dAmount)) ||
      Number(formData.dAmount) <= 0
    )
      errs.dAmount = "Enter valid amount";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setFormData({ nDirectCostOptionID: "", dAmount: "" });
    setErrors({});
  };
  const extractCosts = (res) => {
    const payload = res?.data || res;
    return {
      list: payload?.directCosts || [],
      ewt: Number(payload?.totalEWT) || 0,
    };
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const isNew = editingIndex === -1;
    const entity = getOptionLabel(formData.nDirectCostOptionID);
    setLoading(true);
    setLoadingMessage(
      isNew
        ? `${uiMessages.common.adding}${entity}${uiMessages.common.ellipsis}`
        : `${uiMessages.common.updating}${entity}${uiMessages.common.ellipsis}`,
    );
    try {
      const payload = {
        nTransactionID: transaction.nTransactionId,
        nDirectCostOptionID: formData.nDirectCostOptionID,
        dAmount: Number(formData.dAmount),
      };
      if (isNew) await DirectCostAPI.createDirectCost(payload);
      else {
        const existingId = directCostList[editingIndex].nDirectCostID;
        await DirectCostAPI.updateDirectCost(existingId, payload);
      }
      const costsRes = await DirectCostAPI.getByTransaction(
        transaction.nTransactionId,
        "&withEWT=1",
      );
      const { list, ewt } = extractCosts(costsRes);
      setDirectCostList(list);
      setTotalEWT(ewt);
      showToast(
        isNew
          ? `${entity}${uiMessages.common.addedSuccessfully}`
          : `${entity}${uiMessages.common.updatedSuccessfully}`,
        "success",
      );
      cancelEdit();
    } catch (err) {
      console.error("Error saving direct cost:", err);
      showToast("Failed to save direct cost.", "error");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleDeleteCost = (index) => {
    setDeleteIndex(index);
    setDeleteLetter("");
    setDeleteError("");
    cancelEdit();
  };
  const confirmDelete = async () => {
    const item = directCostList[deleteIndex];
    if (!item) return;
    const entity = getOptionLabel(item.nDirectCostOptionID);
    if (deleteLetter.toUpperCase() !== entity[0]?.toUpperCase()) {
      setDeleteError(`${uiMessages.common.errorReqChar}`);
      return;
    }
    setLoading(true);
    setLoadingMessage(
      `${uiMessages.common.deleting}${entity}${uiMessages.common.ellipsis}`,
    );
    try {
      await DirectCostAPI.deleteDirectCost(item.nDirectCostID);
      const costsRes = await DirectCostAPI.getByTransaction(
        transaction.nTransactionId,
        "&withEWT=1",
      );
      const { list, ewt } = extractCosts(costsRes);
      setDirectCostList(list);
      setTotalEWT(ewt);
      showToast(`${entity}${uiMessages.common.deletedSuccessfully}`, "success");
    } catch (err) {
      showToast("Failed to delete direct cost.", "error");
    } finally {
      setLoading(false);
      setLoadingMessage("");
      setDeleteIndex(null);
      setDeleteLetter("");
      setDeleteError("");
    }
  };

  const total = directCostList.reduce(
    (sum, item) => sum + (Number(item.dAmount) || 0),
    0,
  );
  const isInDeleteMode = deleteIndex !== null;
  const isInEditMode = editingIndex !== null;
  const availableOptions = getAvailableOptions();
  const allOptionsUsed = availableOptions.length === 0 && editingIndex === null;

  const formFields = [
    {
      name: "nDirectCostOptionID",
      label: "Cost Type",
      type: "select",
      xs: 12,
      options: availableOptions.map((opt) => ({
        value: opt.nDirectCostOptionID || opt.id,
        label:
          opt.strName ||
          opt.name ||
          `Option ${opt.nDirectCostOptionID || opt.id}`,
      })),
    },
    {
      name: "dAmount",
      label: "Amount (₱)",
      type: "text",
      xs: 12,
      placeholder: isEWTOption(formData.nDirectCostOptionID)
        ? totalEWT.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00",
      numberOnly: false,
    },
  ];

  if (!open) return null;
  const isLoading = loading || optionsLoading;

  return (
    <ModalContainer
      open={open}
      handleClose={() => {
        cancelEdit();
        setDeleteIndex(null);
        onClose();
      }}
      title={isInDeleteMode ? "Delete Direct Cost" : "Direct Costs"}
      subTitle={
        isInDeleteMode && directCostList[deleteIndex]
          ? `${transaction?.strCode} / ${getOptionLabel(directCostList[deleteIndex].nDirectCostOptionID)}`
          : transaction?.strCode
            ? `${transaction.strCode}`
            : ""
      }
      onSave={
        isInDeleteMode ? confirmDelete : isInEditMode ? handleSave : undefined
      }
      loading={isLoading}
      customMessage={loadingMessage}
      disabled={isLoading}
      showSave={(isInEditMode || isInDeleteMode) && isManagement}
      saveLabel={isInDeleteMode ? "Confirm" : "Save"}
      showCancel={true}
      cancelLabel={isInEditMode || isInDeleteMode ? "Back" : "Cancel"}
      onCancel={() => {
        if (isInDeleteMode) setDeleteIndex(null);
        else if (isInEditMode) cancelEdit();
        else onClose();
      }}
    >
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={handleCloseToast}
      />
      {isInDeleteMode ? (
        <TransacVerificationModalContent
          entityName={getOptionLabel(
            directCostList[deleteIndex]?.nDirectCostOptionID,
          )}
          verificationInput={deleteLetter}
          setVerificationInput={setDeleteLetter}
          verificationError={deleteError}
          onBack={() => setDeleteIndex(null)}
          onConfirm={confirmDelete}
          actionWord="Delete"
          confirmButtonColor="error"
          showToast={showToast}
        />
      ) : (
        <Box sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
              pb: 1,
              borderBottom: `2px solid ${colors.amberWarnBorder}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  backgroundColor: colors.amberTextStrong,
                  borderRadius: "6px",
                  p: 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MonetizationOn sx={{ color: colors.iconOnFill, fontSize: "1rem" }} />
              </Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", sm: "0.85rem" },
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: colors.amberWarnText,
                }}
              >
                Direct Cost Items
              </Typography>
            </Box>
            <Chip
              label={`${directCostList.length} item${directCostList.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{
                fontSize: "0.7rem",
                backgroundColor:
                  directCostList.length > 0
                    ? colors.amberBg
                    : colors.slateMutedBg,
                color:
                  directCostList.length > 0
                    ? colors.amberTextStrong
                    : colors.slateMutedColor,
                fontWeight: 600,
              }}
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {directCostList.map((item, index) =>
              editingIndex === index ? (
                <EditFormRow
                  key={item.nDirectCostID || index}
                  formData={formData}
                  errors={errors}
                  formFields={formFields}
                  handleChange={handleChange}
                  onCancel={cancelEdit}
                  saving={loading}
                />
              ) : (
                <DirectCostRow
                  key={item.nDirectCostID || index}
                  item={item}
                  optionLabel={getOptionLabel(item.nDirectCostOptionID)}
                  onEdit={() => {
                    setEditingIndex(index);
                    setFormData({
                      nDirectCostOptionID: item.nDirectCostOptionID,
                      dAmount: String(item.dAmount || ""),
                    });
                    setErrors({});
                  }}
                  onDelete={() => handleDeleteCost(index)}
                  isManagement={isManagement}
                  isPricingSetting={isPricingSetting}
                />
              ),
            )}
            {directCostList.length === 0 && editingIndex === null && (
              <Box
                sx={{
                  py: 3,
                  textAlign: "center",
                  border: `1px dashed ${colors.slateMutedBorder}`,
                  borderRadius: 1.5,
                  backgroundColor: colors.slateInnerBg,
                }}
              >
                <Typography
                  sx={{ fontSize: "0.75rem", color: colors.grayTextMuted }}
                >
                  No direct costs recorded for this transaction.
                </Typography>
              </Box>
            )}
            {isManagement && editingIndex === null && !allOptionsUsed && (
                <AddCostRow
                  onClick={() => {
                    setEditingIndex(-1);
                    setFormData({ nDirectCostOptionID: "", dAmount: "" });
                    setErrors({});
                  }}
                />
              )}
            {isManagement && editingIndex === -1 && (
              <EditFormRow
                formData={formData}
                errors={errors}
                formFields={formFields}
                handleChange={handleChange}
                onCancel={cancelEdit}
                saving={loading}
              />
            )}
            {isManagement && allOptionsUsed && directCostList.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 1,
                    borderRadius: 1.5,
                    backgroundColor: colors.slateInnerBg,
                    border: `1px dashed ${colors.slateMutedBorder}`,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.grayTextMuted }}
                  >
                    All cost types have been added.
                  </Typography>
                </Box>
              )}
          </Box>
          {directCostList.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: { xs: 1, sm: 1.5 },
                  py: 1.2,
                  borderRadius: 1.5,
                  backgroundColor: colors.amberWarnBg,
                  border: `1px solid ${colors.amberWarnBorder}`,
                  borderLeft: `4px solid ${colors.amberTextStrong}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: colors.amberWarnText,
                  }}
                >
                  Total Direct Cost
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    fontWeight: 700,
                    color: colors.amberWarnText,
                  }}
                >
                  ₱{" "}
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    </ModalContainer>
  );
}

export default DirectCostModal;
