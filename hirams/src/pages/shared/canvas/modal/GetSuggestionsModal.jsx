import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import {
  Box,
  Button,
  Typography,
  Divider,
  Skeleton,
  InputBase,
  Link,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import SupplierContactField from "./SupplierContactField.jsx";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import { validateFormData } from "../../../../utils/form/validation.js";
import uiMessages from "../../../../utils/helpers/uiMessages.js";
import { fmtDate } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Inline color map (Prompt 1 style — ONLY confirmed existing tokens) ─────
const useColors = (c) => ({
  // slate — structural surfaces / borders / hovers
  border: c.slate.border,
  borderLight: c.slate.borderLight,
  divider: c.slate.divider,
  hoverBg: c.slate.hover,
  rowHoverBg: c.slate.itemHover,
  cardBg: c.slate.innerBg,
  paperBg: c.slate.outerBg,
  inputBg: c.gray.inputBg,
  inputFocusBg: c.gray.inputFocusBg,
  // foreground on a SOLID accent fill (the "Use" button)
  textOnFill: c.gray.textOnFill,
  // gray — text hierarchy
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  // skeleton
  skeletonBg: c.skeleton.overlay,
  // accent — primary = blue
  primary: c.blue.bg,
  // The SOLID fill of an accent button — `primary` above is only a tint
  // (good for text and icons, not for a button with white text on it).
  primaryFill: c.blue.textStrong,
  primaryText: c.blue.text,
  primaryHover: c.blue.hover,
  primaryGlow: c.blue.active,
  primaryBorder: c.blue.border,
  // accent — price tag = green
  priceBg: c.green.bg,
  priceBorder: c.green.border,
  priceText: c.green.text,
  priceTextBold: c.green.textStrong,
  // tag / chip
  tagBg: c.slate.mutedBg,
  tagBorder: c.slate.mutedBorder,
  tagText: c.slate.mutedText,
  // close button
  closeBtnBg: c.slate.btnBg,
  closeBtnHover: c.slate.btnHoverBg,
});

/* ── Initial form state ── */
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

/* ── Skeleton row ── */
function SuggestionRowSkeleton({ colors }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: "8px",
        border: `0.5px solid ${colors.border}`,
        background: colors.cardBg,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Skeleton
            variant="text"
            width={140}
            height={16}
            sx={{ borderRadius: "4px", bgcolor: colors.skeletonBg }}
          />
          <Skeleton
            variant="rounded"
            width={80}
            height={18}
            sx={{ borderRadius: "4px", bgcolor: colors.skeletonBg }}
          />
          <Skeleton
            variant="rounded"
            width={55}
            height={18}
            sx={{ borderRadius: "4px", bgcolor: colors.skeletonBg }}
          />
        </Box>
        <Skeleton
          variant="text"
          width="85%"
          height={13}
          sx={{ borderRadius: "4px", bgcolor: colors.skeletonBg }}
        />
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <Skeleton
          variant="rounded"
          width={42}
          height={26}
          sx={{ borderRadius: "6px", bgcolor: colors.skeletonBg }}
        />
        <Skeleton
          variant="text"
          width={90}
          height={12}
          sx={{ mt: "auto", bgcolor: colors.skeletonBg }}
        />
      </Box>
    </Box>
  );
}

/* ── Suggestion row ── */
function SuggestionRow({ suggestion, onUse, colors }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: "8px",
        border: `0.5px solid ${colors.border}`,
        background: colors.paperBg,
        "&:hover": {
          background: colors.rowHoverBg,
          borderColor: colors.primaryBorder,
        },
        transition: "all 0.15s",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: colors.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 220,
            }}
          >
            {[suggestion.brand, suggestion.model]
              .filter(Boolean)
              .join(" · ") || (
              <span style={{ color: colors.textMuted }}>No brand/model</span>
            )}
          </Typography>
          {suggestion.supplierName && (
            <Box
              sx={{
                fontSize: "0.63rem",
                color: colors.tagText,
                background: colors.tagBg,
                border: `0.5px solid ${colors.tagBorder}`,
                borderRadius: "4px",
                px: 0.75,
                py: 0.15,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span style={{ color: colors.textMuted, fontSize: "0.6rem" }}>
                By
              </span>{" "}
              {suggestion.supplierNickName || suggestion.supplierName}
            </Box>
          )}
          {suggestion.unitPrice > 0 && (
            <Box
              sx={{
                fontSize: "0.63rem",
                background: colors.priceBg,
                border: `0.5px solid ${colors.priceBorder}`,
                borderRadius: "4px",
                px: 0.75,
                py: 0.15,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.3,
                flexShrink: 0,
              }}
            >
              <span style={{ color: colors.priceText, fontSize: "0.6rem" }}>
                ₱
              </span>
              <span style={{ color: colors.priceTextBold, fontWeight: 700 }}>
                {Number(suggestion.unitPrice).toLocaleString()}
              </span>
            </Box>
          )}
        </Box>
        <Typography
          sx={{
            fontSize: "0.65rem",
            color: colors.textSecondary,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {suggestion.specs ? (
            <>
              <Box
                component="span"
                sx={{ color: colors.textSecondary, fontWeight: 500 }}
              >
                Specs{" "}
              </Box>
              {suggestion.specs.replace(/<[^>]*>/g, "")}
            </>
          ) : (
            <Box
              component="span"
              sx={{ fontStyle: "italic", color: colors.textMuted }}
            >
              No specifications.
            </Box>
          )}
        </Typography>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 0.5,
          minWidth: 90,
        }}
      >
        <Button
          onClick={() => onUse(suggestion)}
          size="small"
          disableElevation
          sx={{
            fontSize: "0.68rem",
            // A SOLID accent fill with white text on it — the tint was
            // unreadable.
            backgroundColor: colors.primaryFill,
            color: colors.textOnFill,
            border: "none",
            borderRadius: "6px",
            px: 1.5,
            py: 0.35,
            minWidth: 0,
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            textTransform: "none",
            transition: "all 0.15s",
            "&:hover": {
              backgroundColor: colors.primaryFill,
              filter: "brightness(0.92)",
              boxShadow: `0 2px 8px ${colors.primaryHover}`,
            },
          }}
        >
          Use
        </Button>
        {suggestion.dtCanvass && (
          <Typography
            sx={{
              fontSize: "0.58rem",
              color: colors.textMuted,
              whiteSpace: "nowrap",
              mt: "auto",
              textAlign: "right",
            }}
          >
            {fmtDate(suggestion.dtCanvass)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
function GetSuggestionsModal({
  open,
  onClose,
  item,
  itemId,
  suppliers,
  cItemType,
  onSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // ✅ Wire up centralized theme colors (Prompt 1)
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(base);

  /* ── Search state ── */
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Form view state ── */
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [calculatedEWT, setCalculatedEWT] = useState("");
  const [ewtLoading, setEwtLoading] = useState(false);
  const ewtDebounceRef = useRef(null);

  const hasQuery = query.trim().length > 0;
  const isEmpty = !loading && suggestions.length === 0;

  /* ── Fetch suggestions ── */
  const fetchSuggestions = useCallback(async (search) => {
    const term = search.trim();
    if (!term) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ search: term });
      const res = await PurchaseOptionAPI.getSuggestions(params.toString());
      setSuggestions(res.suggestions || res.data?.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    if (open) {
      if (item?.name) setQuery((prev) => prev || item.name);
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open, item]);

  /* ── EWT auto-calculate ── */
  useEffect(() => {
    if (!showForm) return;
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
    showForm,
    Number(formData.nSupplierId),
    Number(formData.quantity),
    Number(formData.unitPrice),
    cItemType,
  ]);

  /* ── Handlers: search view ── */
  const handleClose = () => {
    setQuery("");
    setSuggestions([]);
    setIsFocused(false);
    setShowForm(false);
    setFormData(initialFormData);
    setErrors({});
    setCalculatedEWT("");
    clearTimeout(debounceRef.current);
    onClose();
  };

  const handleUse = (suggestion) => {
    const includedQty = (item?.purchaseOptions || [])
      .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
      .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
    const remainingQty = Number(item?.qty || 0) - includedQty;

    setFormData({
      ...initialFormData,
      quantity: remainingQty > 0 ? remainingQty : (item?.qty ?? ""),
      uom: item?.uom ?? "",
      specs: suggestion.specs ?? item?.specs ?? "",
      brand: suggestion.brand ?? "",
      model: suggestion.model ?? "",
      nSupplierId: suggestion.nSupplierId ?? "",
      unitPrice:
        suggestion.unitPrice != null ? String(suggestion.unitPrice) : "",
    });
    setCalculatedEWT("");
    setErrors({});
    setShowForm(true);
  };

  /* ── Handlers: form view ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSupplierChange = (value) => {
    const selected = suppliers.find((s) => s.value === Number(value));
    setFormData((prev) => ({
      ...prev,
      nSupplierId: selected?.value || "",
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
    // Same rule as NewOptionModal — the supplier contact is required
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
      await withSpinner(brandModel, async () => {
        await PurchaseOptionAPI.createOption(payload);
        await onSuccess();
      });
      await showSwal("SUCCESS", {}, { entity: brandModel, action: "added" });
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          general: `${uiMessages.common.errorMessage}`,
        },
      );
      await showSwal("ERROR", {}, { entity: brandModel });
    }
  };

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
    },
    {
      name: "specs",
      label: "Specifications",
      placeholder: "Type here the specifications...",
      type: "textarea",
      xs: 12,
      multiline: true,
      minRows: 4,
      showHighlighter: false,
      showAllFormatting: true,
      sx: {
        "& textarea": {
          resize: "vertical",
          backgroundColor: colors.cardBg,
          color: colors.textPrimary,
        },
      },
    },
  ];

  // The Add-On is ON and locked: an option suggested for a purchase is
  // always an add-on, and it cannot be switched off.
  const switches = [
    { name: "bAddOn", label: "Add-On?", xs: 12, disabled: true },
  ];

  /* ── Render ── */
  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title={showForm ? "Add Purchase Option" : "Get Suggestions"}
      subTitle={
        showForm
          ? formData.brand || formData.model
            ? `${[formData.brand, formData.model].filter(Boolean).join(" ")}`
            : ""
          : "Purchase Options"
      }
      showSave={showForm}
      onSave={showForm ? handleSave : undefined}
      disabled={showForm && ewtLoading}
      cancelLabel={showForm ? "Back" : "Cancel"}
      onCancel={
        showForm
          ? () => {
              setShowForm(false);
              setErrors({});
            }
          : undefined
      }
    >
      {/* ══ SEARCH VIEW ══ */}
      {!showForm && (
        <>
          {/* Search bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              width: "100%",
              background: isFocused ? colors.inputFocusBg : colors.inputBg,
              border: isFocused
                ? `1.5px solid ${colors.primaryBorder}`
                : `1px solid ${colors.border}`,
              borderRadius: "12px",
              px: 1.75,
              py: 1,
              mb: 2.5,
              boxShadow: isFocused ? `0 0 0 3px ${colors.primaryGlow}` : "none",
              transition: "all 0.25s ease",
              position: "sticky",
              top: 0,
              zIndex: 10,
              backdropFilter: "blur(8px)",
            }}
          >
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              {loading ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="2.5"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isFocused ? colors.primary : colors.textMuted}
                  strokeWidth="2.5"
                  style={{ transition: "stroke 0.2s" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
            </Box>

            <InputBase
              inputRef={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search by brand, model, or item name..."
              sx={{
                flex: 1,
                fontSize: "0.82rem",
                color: colors.textPrimary,
                "& input": { padding: 0 },
                "& input::placeholder": { color: colors.textMuted, opacity: 1 },
              }}
            />

            {hasQuery && (
              <Box
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                sx={{
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: colors.closeBtnBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  "&:hover": { background: colors.closeBtnHover },
                  transition: "background 0.15s",
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.textSecondary}
                  strokeWidth="3"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Box>
            )}
          </Box>

          {/* Results area */}
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
            >
              <Divider sx={{ flex: 1, bgcolor: colors.divider }} />
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: loading
                    ? colors.primary
                    : hasQuery && suggestions.length > 0
                      ? colors.primary
                      : colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s",
                }}
              >
                {loading
                  ? "Searching..."
                  : hasQuery && suggestions.length > 0
                    ? `${suggestions.length} result${suggestions.length !== 1 ? "s" : ""} found`
                    : "Recent Purchase Options"}
              </Typography>
              <Divider sx={{ flex: 1, bgcolor: colors.divider }} />
            </Box>

            {loading && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[...Array(3)].map((_, i) => (
                  <SuggestionRowSkeleton key={i} colors={colors} />
                ))}
              </Box>
            )}

            {isEmpty && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 4,
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: colors.tagBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 0.5,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.textMuted}
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                  }}
                >
                  {hasQuery
                    ? "No results found"
                    : "Search for purchase options"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: colors.textMuted,
                    textAlign: "center",
                    maxWidth: 260,
                  }}
                >
                  {hasQuery
                    ? `No purchase options matched "${query}". Try a different keyword.`
                    : "Type a brand, model, or item name to find matching purchase options from past transactions."}
                </Typography>
              </Box>
            )}

            {!loading && suggestions.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {suggestions.map((s, i) => (
                  <SuggestionRow
                    key={s.id ?? i}
                    suggestion={s}
                    onUse={handleUse}
                    colors={colors}
                  />
                ))}
              </Box>
            )}
          </Box>
        </>
      )}

      {/* ══ FORM VIEW ══ */}
      {showForm && (
        <FormGrid
          fields={fields}
          switches={switches}
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleSwitchChange={handleSwitchChange}
        />
      )}
    </ModalContainer>
  );
}

export default GetSuggestionsModal;
