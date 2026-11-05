import React, { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, Divider, Chip } from "@mui/material";
import {
  InventoryOutlined,
  ShoppingCartOutlined,
  ScaleOutlined,
  StraightenOutlined,
  LocalOfferOutlined,
  StorefrontOutlined,
  StyleOutlined,
  MonetizationOnOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";
import ContentHeaderStructure from "../../../../components/ui/structure/ContentHeaderStructure";
import FormGrid from "../../../../components/ui/form/FormGrid";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────
// INLINE COLOR MAP — per-file useColors pattern (PROMPT 1)
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Text hierarchy
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,

  // Blue section — Transaction Item
  blue: {
    color: c.blue.text,
    bg: c.blue.bg,
    border: c.blue.border,
    textStrong: c.blue.textStrong,
  },

  // Green section — Purchase Option
  green: {
    color: c.green.text,
    bg: c.green.bg,
    border: c.green.border,
    textStrong: c.green.textDark,
  },

  // Textarea background
  textareaBg: c.gray.inputBg,

  // Divider
  divider: c.slate.border,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, highlight = false, colors }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
      <Icon
        sx={{
          fontSize: 11,
          color: highlight ? colors.blue.textStrong : colors.textDisabled,
          mt: "2px",
          flexShrink: 0,
          opacity: 0.7,
        }}
      />
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: colors.textSecondary,
            fontWeight: 500,
            whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}
        >
          {label}:
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: highlight ? colors.blue.textStrong : colors.textPrimary,
            fontWeight: highlight ? 700 : 600,
            lineHeight: 1.4,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function SectionLabel({
  color,
  bgColor,
  borderColor,
  icon: Icon,
  label,
  badge,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "5px",
            background: bgColor,
            border: `0.5px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 11, color }} />
        </Box>
        <Typography
          variant="overline"
          sx={{
            fontSize: "0.6rem",
            fontWeight: 700,
            color,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
      {badge && (
        <Chip
          label={badge}
          size="small"
          sx={{
            height: 16,
            fontSize: "0.5rem",
            fontWeight: 700,
            bgcolor: bgColor,
            color,
            border: `0.5px solid ${borderColor}`,
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      )}
    </Box>
  );
}

function ItemPanel({ compareData, onSpecsChange, forCanvasKey }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <ContentHeaderStructure
      p={1.5}
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <SectionLabel
        icon={InventoryOutlined}
        label="Transaction Item"
        color={colors.blue.color}
        bgColor={colors.blue.bg}
        borderColor={colors.blue.border}
        badge="ITEM"
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.6,
          mb: 1.25,
          minHeight: 92, // keep in sync with OptionPanel
        }}
      >
        <InfoRow
          icon={StyleOutlined}
          label="Name"
          value={compareData.itemName || "—"}
          highlight
          colors={colors}
        />
        <InfoRow
          icon={ScaleOutlined}
          label="Quantity"
          value={`${fmtQty(compareData.quantity)} ${compareData.uom || ""}`.trim()}
          colors={colors}
        />
        <InfoRow
          icon={MonetizationOnOutlined}
          label="ABC"
          value={compareData.abc ? `${fmtPHP(compareData.abc)}` : "—"}
          highlight={!!compareData.abc}
          colors={colors}
        />
      </Box>

      {/* Pushes Specifications to the bottom, so it aligns with the
          option panel(s) on the right regardless of how much content
          is above it. */}
      <Box sx={{ mt: "auto" }}>
        <Divider sx={{ mb: 1.25, borderColor: colors.divider }} />

        <Typography
          variant="overline"
          sx={{
            fontSize: "0.55rem",
            fontWeight: 700,
            color: colors.textSecondary,
            letterSpacing: "0.08em",
            display: "block",
            mb: 0.75,
            textAlign: "left",
          }}
        >
          Specifications
        </Typography>

        <FormGrid
          fields={[
            {
              name: "specs",
              label: "",
              type: "textarea",
              xs: 12,
              multiline: true,
              minRows: 3,
              showOnlyHighlighter: forCanvasKey ? false : true,
              readOnlyHighlight: forCanvasKey ? false : true,
              sx: {
                "& textarea": {
                  resize: "vertical",
                  userSelect: "text",
                  pointerEvents: "auto",
                  backgroundColor: colors.textareaBg,
                  borderRadius: 2,
                  fontSize: "0.7rem",
                  textAlign: "left",
                },
              },
            },
          ]}
          formData={{ specs: compareData.specs }}
          handleChange={(e) => onSpecsChange(e.target.value)}
          errors={{}}
        />
      </Box>
    </ContentHeaderStructure>
  );
}

// ─── Option Panel ─────────────────────────────────────────────────────────────

function OptionPanel({ option, onOptionSpecsChange, forCanvasKey }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const totalPrice = option.quantity * option.unitPrice;

  return (
    <ContentHeaderStructure
      p={1.5}
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <SectionLabel
        icon={ShoppingCartOutlined}
        label="Purchase Option"
        color={colors.green.color}
        bgColor={colors.green.bg}
        borderColor={colors.green.border}
        badge="OPTION"
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "start",
          mb: 1.25,
          minHeight: 92, // keep in sync with ItemPanel
        }}
      >
        {/* Col 1: identity */}
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 0.6, pr: 1.25 }}
        >
          <InfoRow
            icon={StorefrontOutlined}
            label="Supplier"
            value={option.supplierName || option.supplierNickName || "—"}
            highlight
            colors={colors}
          />
          <InfoRow
            icon={StyleOutlined}
            label="Model / Brand"
            value={
              [option.model, option.brand].filter(Boolean).join(" · ") || "—"
            }
            colors={colors}
          />
          <InfoRow
            icon={StraightenOutlined}
            label="Quantity"
            value={`${fmtQty(option.quantity)} ${option.uom || ""}`.trim()}
            colors={colors}
          />
        </Box>

        {/* Vertical divider */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: colors.divider }}
        />

        {/* Col 2: pricing */}
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 0.6, pl: 1.25 }}
        >
          <InfoRow
            icon={LocalOfferOutlined}
            label="Unit Price"
            value={`${fmtPHP(option.unitPrice)}`}
            highlight
            colors={colors}
          />
          <InfoRow
            icon={MonetizationOnOutlined}
            label="Total Price"
            value={`${fmtPHP(totalPrice)}`}
            highlight
            colors={colors}
          />
          {option.ewt > 0 && (
            <InfoRow
              icon={ReceiptLongOutlined}
              label="EWT"
              value={`${fmtPHP(option.ewt)}`}
              colors={colors}
            />
          )}
        </Box>
      </Box>

      {/* Pushes Specifications to the bottom — aligns with ItemPanel's
          Specifications row on the left. */}
      <Box sx={{ mt: "auto" }}>
        <Divider sx={{ mb: 1.25, borderColor: colors.divider }} />

        <Typography
          variant="overline"
          sx={{
            fontSize: "0.55rem",
            fontWeight: 700,
            color: colors.textSecondary,
            letterSpacing: "0.08em",
            display: "block",
            mb: 0.75,
            textAlign: "left",
          }}
        >
          Specifications
        </Typography>

        <FormGrid
          fields={[
            {
              name: "specs",
              label: "",
              type: "textarea",
              xs: 12,
              multiline: true,
              minRows: 3,
              showOnlyHighlighter: forCanvasKey ? false : true,
              readOnlyHighlight: forCanvasKey ? false : true,
              sx: {
                "& textarea": {
                  resize: "vertical",
                  userSelect: "text",
                  pointerEvents: "auto",
                  backgroundColor: colors.textareaBg,
                  borderRadius: 2,
                  fontSize: "0.7rem",
                  textAlign: "left",
                },
              },
            },
          ]}
          formData={{ specs: option.specs }}
          handleChange={(e) =>
            onOptionSpecsChange(option.nPurchaseItemId, e.target.value)
          }
          errors={{}}
        />
      </Box>
    </ContentHeaderStructure>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

function CompareView({
  compareData,
  onSpecsChange,
  onOptionSpecsChange,
  forCanvasKey,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  if (!compareData) return null;

  const hasOptions = compareData.purchaseOptions?.length > 0;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
        overflowX: { xs: "auto", md: "visible" },
      }}
    >
      {/* Left: Transaction Item */}
      <Box sx={{ flex: { xs: "0 0 300px", md: 1 }, minWidth: 280 }}>
        <ItemPanel
          compareData={compareData}
          onSpecsChange={onSpecsChange}
          forCanvasKey={forCanvasKey}
        />
      </Box>

      {/* Right: Purchase Options */}
      <Box
        sx={{
          flex: { xs: "0 0 300px", md: 1 },
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {hasOptions ? (
          compareData.purchaseOptions.map((option) => (
            <OptionPanel
              key={option.nPurchaseItemId}
              option={option}
              onOptionSpecsChange={onOptionSpecsChange}
              forCanvasKey={forCanvasKey}
            />
          ))
        ) : (
          <ContentHeaderStructure p={1.5}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 3,
                gap: 0.75,
              }}
            >
              <ShoppingCartOutlined
                sx={{
                  fontSize: "1.5rem",
                  color: colors.textDisabled,
                  opacity: 0.4,
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: colors.textDisabled, fontStyle: "italic" }}
              >
                No purchase options available
              </Typography>
            </Box>
          </ContentHeaderStructure>
        )}
      </Box>
    </Box>
  );
}

export default CompareView;
