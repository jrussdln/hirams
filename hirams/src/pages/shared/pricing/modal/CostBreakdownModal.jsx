import React, { useState, useMemo, useEffect, useRef } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import {
  Box,
  Typography,
  Divider,
  Collapse,
  IconButton,
  useTheme,
} from "@mui/material";
import { ReceiptLong, TrendingUp, ExpandMore } from "@mui/icons-material";
import DirectCostAPI from "../../../../api/endpoints/direct-cost.api.js";
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import ExportAPI from "../../../../api/endpoints/export.api.js";
import ExportSpinnerContent from "../../../../components/ui/content/ExportSpinnerContent.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { totalEWT } from "../../../../utils/helpers/calculateEWT.js";
import {
  calculateItemTax,
  purchaseTotalOf,
} from "../../../../utils/helpers/calculateTax.js";

const PESO_WIDTH = 16;
const VALUE_WIDTH = 100;

const useColors = (c) => ({
  text: {
    primary: c.gray.textPrimary,
    secondary: c.gray.textSecondary,
    muted: c.gray.textMuted,
    label: c.gray.label,
  },
  green: {
    bg: c.green.bg,
    bgSoft: c.green.bgSoft,
    border: c.green.border,
    borderStrong: c.green.borderStrong,
    text: c.green.text,
    textStrong: c.green.textStrong,
    textDark: c.green.textDark,
    paid: c.green.paid,
    badgeBg: c.green.badgeBg,
    badgeText: c.green.badgeText,
  },
  red: {
    bg: c.red.bg,
    bgSoft: c.red.bgSoft,
    border: c.red.border,
    borderStrong: c.red.borderStrong,
    text: c.red.text,
    textStrong: c.red.textStrong,
    textDark: c.red.textDark,
    danger: c.red.danger,
  },
  indigo: c.indigo,
  blue: c.blue,
  slate: {
    border: c.slate.border,
    borderLight: c.slate.borderLight,
    divider: c.slate.divider,
    mutedColor: c.slate.mutedColor,
    mutedBg: c.slate.mutedBg,
    mutedBorder: c.slate.mutedBorder,
    // used as an icon's foreground when it sits on a filled chip
    outerBg: c.slate.outerBg,
  },
});

const FinancialRow = ({
  label,
  value,
  highlight,
  bold,
  variant = "normal",
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const isTotal = variant === "total",
    isSubtotal = variant === "subtotal";
  const totalGreen = colors.green.paid,
    subtotalRed = colors.red.danger,
    normalIndigo = colors.indigo.textStrong,
    lossRed = colors.red.danger,
    profitGreen = colors.green.paid,
    labelColor = colors.text.label;
  const valueColor =
    highlight && value < 0
      ? lossRed
      : highlight && value > 0
        ? profitGreen
        : isTotal
          ? totalGreen
          : isSubtotal
            ? subtotalRed
            : normalIndigo;
  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : value || "0.00";
  const valueWeight = isSubtotal ? 700 : bold ? 600 : 500;
  const valueSize = isTotal ? "0.9rem" : isSubtotal ? "0.82rem" : "0.78rem";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: isTotal ? 0.6 : isSubtotal ? 0.5 : 0.35,
        px: 0.5,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.72rem",
          fontWeight: isSubtotal ? 700 : bold ? 600 : 500,
          color: isTotal ? totalGreen : isSubtotal ? subtotalRed : labelColor,
          textTransform: isTotal || isSubtotal ? "uppercase" : "none",
          letterSpacing: isTotal || isSubtotal ? "0.5px" : "normal",
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          width: VALUE_WIDTH,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: valueSize,
            fontWeight: valueWeight,
            color: valueColor,
            width: PESO_WIDTH,
            flexShrink: 0,
          }}
        >
          ₱
        </Typography>
        <Typography
          sx={{
            fontSize: valueSize,
            fontWeight: valueWeight,
            color: valueColor,
            flex: 1,
            textAlign: "right",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formattedValue}
        </Typography>
      </Box>
    </Box>
  );
};

const DirectCostLine = ({ label, amount }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const labelColor = colors.text.label,
    emptyMuted = colors.slate.mutedColor,
    activeIndigo = colors.indigo.textStrong,
    valueColor = amount > 0 ? activeIndigo : emptyMuted,
    pesoColor = amount > 0 ? activeIndigo : emptyMuted,
    weight = amount > 0 ? 600 : 400;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.3,
        px: 0.5,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: amount > 0 ? 600 : 500,
          color: labelColor,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pr: 1,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          width: VALUE_WIDTH,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: weight,
            color: pesoColor,
            width: PESO_WIDTH,
            flexShrink: 0,
          }}
        >
          ₱
        </Typography>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: weight,
            color: valueColor,
            flex: 1,
            textAlign: "right",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
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
    </Box>
  );
};

const NetProfitRow = ({ amount, percent }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const positive = amount >= 0,
    labelColor = colors.text.label;
  const badgeBg = positive ? colors.green.bg : colors.red.bg;
  const badgeBorder = positive ? colors.green.border : colors.red.border;
  const badgeText = positive ? colors.green.textStrong : colors.red.textStrong;
  const amountColor = positive ? colors.green.paid : colors.red.danger;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.35,
        px: 0.5,
      }}
    >
      <Typography
        sx={{ fontSize: "0.72rem", fontWeight: 600, color: labelColor }}
      >
        Net Profit (%)
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            px: 0.6,
            py: 0.1,
            borderRadius: "10px",
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.62rem",
              fontWeight: 800,
              color: badgeText,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.abs(percent).toFixed(2)}%
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            width: VALUE_WIDTH,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: amountColor,
              width: PESO_WIDTH,
              flexShrink: 0,
            }}
          >
            ₱
          </Typography>
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: amountColor,
              flex: 1,
              textAlign: "right",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.abs(amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const DiveAmountRow = ({ amount, percent }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  if (amount === null || percent === null)
    return <FinancialRow label="Dive Amount (%)" value={0} />;
  const positive = percent >= 0,
    labelColor = colors.text.label,
    diveRed = colors.red.danger;
  const badgeBg = colors.red.bg,
    badgeBorder = colors.red.border;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.35,
        px: 0.5,
      }}
    >
      <Typography
        sx={{ fontSize: "0.72rem", fontWeight: 600, color: labelColor }}
      >
        Dive Amount (%)
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            px: 0.6,
            py: 0.1,
            borderRadius: "10px",
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.62rem",
              fontWeight: 800,
              color: diveRed,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.abs(percent).toFixed(2)}%
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            width: VALUE_WIDTH,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: diveRed,
              width: PESO_WIDTH,
              flexShrink: 0,
            }}
          >
            ₱
          </Typography>
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: diveRed,
              flex: 1,
              textAlign: "right",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.abs(amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const CollapsibleSectionHeader = ({
  icon: Icon,
  title,
  // no default: both call sites pass an explicit accent
  color,
  expanded,
  onToggle,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const iconFg = isDark ? colors.slate.outerBg : colors.text.primary;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 0.75,
        pb: 0.5,
        borderBottom: `2px solid ${color}`,
        cursor: "pointer",
        "&:hover": { opacity: 0.8 },
      }}
      onClick={onToggle}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: "5px",
            p: 0.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ color: iconFg, fontSize: "0.9rem" }} />
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.78rem",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color,
          }}
        >
          {title}
        </Typography>
      </Box>
      <IconButton
        size="small"
        sx={{
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
          color,
          p: 0.25,
        }}
      >
        <ExpandMore sx={{ fontSize: "1rem" }} />
      </IconButton>
    </Box>
  );
};

function CostBreakdownModal({
  open,
  onClose,
  transaction = null,
  selectedSet = null,
  items = [],
  unitSellingPrices = {},
  clientName,
  taxes = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [directCosts, setDirectCosts] = useState([]);
  const [directCostOptions, setDirectCostOptions] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    costDetails: true,
    analysis: true,
  });
  const abortRef = useRef(null);
  const costDetailsColor = colors.blue.textStrong,
    analysisColor = colors.green.paid,
    emptyMuted = colors.slate.mutedColor,
    dividerColor = colors.slate.divider;
  const toggleSection = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  useEffect(() => {
    if (!open || !transaction?.nTransactionId) return;
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [optionsRes, costsRes] = await Promise.all([
          DirectCostOptionAPI.getDirectCostOptions(),
          DirectCostAPI.getByTransaction(transaction.nTransactionId),
        ]);
        const toArray = (res) =>
          Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.directCosts)
                ? res.directCosts
                : Array.isArray(res?.directCostOptions)
                  ? res.directCostOptions
                  : Array.isArray(res?.items)
                    ? res.items
                    : [];
        setDirectCostOptions(toArray(optionsRes));
        setDirectCosts(toArray(costsRes));
      } catch (err) {
        console.error("Error fetching direct costs:", err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [open, transaction?.nTransactionId]);
  useEffect(() => {
    if (!open) {
      setDirectCosts([]);
      setDirectCostOptions([]);
      setDataLoading(false);
      setExporting(false);
      setExportDone(false);
    }
  }, [open]);
  const getOptionLabel = (optionId) => {
    const found = directCostOptions.find(
      (o) => (o.nDirectCostOptionID || o.id) === optionId,
    );
    return found?.strName || found?.name || "Direct Cost";
  };
  const getOptionName = (optionId) => {
    const found = directCostOptions.find(
      (o) => (o.nDirectCostOptionID || o.id) === optionId,
    );
    return (found?.strName || found?.name || "").toLowerCase();
  };
  const calculations = useMemo(() => {
    if (!items || items.length === 0)
      return {
        abc: 0,
        budget: 0,
        purchases: 0,
        tax: 0,
        ewt: 0,
        totalCost: 0,
        grossProfit: 0,
        otherDirectCost: 0,
        retention: 0,
        finalTotal: 0,
        abcDiveAmount: null,
        abcDivePercent: null,
      };
    let totalPurchases = 0,
      totalSellingPrice = 0,
      totalTax = 0;
    items.forEach((item) => {
      const includedTotal = purchaseTotalOf(item.purchaseOptions);
      totalPurchases += includedTotal;
      const selling = Number(unitSellingPrices[item.id] || 0);
      totalSellingPrice += selling * Number(item.qty || 0);
      // The tax of each item, worked out the same way as the pricing table
      // (see utils/helpers/calculateTax.js) — so the two always agree.
      totalTax += calculateItemTax({
        unitSellingPrice: selling,
        qty: item.qty,
        purchaseTotal: includedTotal,
      });
    });
    totalTax = Math.round(totalTax * 100) / 100;
    // round only once, here, instead of summing per-item taxes
    const budget = totalSellingPrice;
    // The EWT is derived per option — see utils/helpers/calculateEWT.js
    const ewt = items.reduce(
      (sum, item) =>
        sum +
        totalEWT(item.purchaseOptions.filter((opt) => opt.bIncluded)),
      0,
    );
    let retention = 0,
      otherDirectCost = 0;
    directCosts.forEach((cost) => {
      const name = getOptionName(cost.nDirectCostOptionID);
      const amount = Number(cost.dAmount || 0);
      if (name.startsWith("ret")) retention += amount;
      // Every other direct cost — EWT included — is both listed in the
      // column beside it and rolled into Total Cost.
      else otherDirectCost += amount;
    });
    const totalCost = totalPurchases + totalTax + ewt + otherDirectCost;
    const grossProfit = budget - totalCost;
    const finalTotal = grossProfit - retention;
    const netProfitPercent = totalCost > 0 ? (finalTotal / totalCost) * 100 : 0;
    const itemsABC = items.reduce((sum, item) => {
      const hasIncluded = item.purchaseOptions?.some((opt) => opt.bIncluded);
      if (!hasIncluded) return sum;
      return sum + Number(item.abc || 0);
    }, 0);
    const abc = itemsABC > 0 ? itemsABC : Number(transaction?.dTotalABC || 0);
    const abcDiveAmount = abc > 0 ? abc - budget : null;
    const abcDivePercent = abc > 0 ? ((abc - budget) / abc) * 100 : null;
    return {
      abc,
      budget,
      purchases: totalPurchases,
      tax: totalTax,
      ewt,
      totalCost,
      grossProfit,
      otherDirectCost,
      retention,
      finalTotal,
      netProfitPercent,
      abcDiveAmount,
      abcDivePercent,
    };
  }, [
    items,
    unitSellingPrices,
    directCosts,
    directCostOptions,
    transaction,
    taxes,
  ]);
  if (!open) return null;
  const displayedDirectCosts = directCosts.filter((cost) => {
    const name = getOptionName(cost.nDirectCostOptionID);
    // Retention stays out of this list (it is netted off the profit further
    // down), but EWT direct costs are shown here like any other cost.
    return !name.startsWith("ret");
  });
  const handleSave = async () => {
    if (!transaction?.strCode) return;
    abortRef.current = new AbortController();
    setExporting(true);
    setExportDone(false);
    try {
      const blob = await ExportAPI.exportPricingReport(
        { transaction, unitSellingPrices, items },
        { signal: abortRef.current.signal },
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${transaction.strCode}_${clientName}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => {
        setExporting(false);
        setExportDone(false);
      }, 1600);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Export breakdown failed:", err);
        setExporting(false);
        setExportDone(false);
      }
    }
  };
  return (
    <>
      <ExportSpinnerContent
        open={exporting}
        done={exportDone}
        fileName={
          transaction?.strCode && clientName
            ? `${transaction.strCode}_${clientName}.xlsx`
            : ""
        }
        onCancel={() => {
          abortRef.current?.abort();
          setExporting(false);
          setExportDone(false);
        }}
      />
      <ModalContainer
        open={open}
        handleClose={onClose}
        title="Cost Breakdown"
        subTitle={
          transaction?.strCode && selectedSet?.name
            ? `${transaction.strCode} / ${selectedSet.name}`
            : transaction?.strCode
              ? `${transaction.strCode}`
              : ""
        }
        onSave={handleSave}
        saveLabel="Export"
        loading={dataLoading || exporting}
      >
        <Box sx={{ px: 1.5, py: 0.5 }}>
          <CollapsibleSectionHeader
            icon={ReceiptLong}
            title="Cost Details"
            color={costDetailsColor}
            expanded={expandedSections.costDetails}
            onToggle={() => toggleSection("costDetails")}
          />
          <Collapse in={expandedSections.costDetails}>
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "stretch" }}>
                <Box sx={{ flex: 1 }}>
                  <FinancialRow
                    label="Purchases"
                    value={calculations.purchases}
                  />
                  <FinancialRow label="EWT" value={calculations.ewt} />
                  <FinancialRow label="Tax" value={calculations.tax} />
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mx: 0.75, borderColor: dividerColor }}
                />
                <Box sx={{ flex: 1 }}>
                  {displayedDirectCosts.length === 0 ? (
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        color: emptyMuted,
                        px: 0.5,
                        py: 0.35,
                      }}
                    >
                      No other direct costs recorded.
                    </Typography>
                  ) : (
                    displayedDirectCosts.map((cost) => (
                      <DirectCostLine
                        key={cost.nDirectCostID}
                        label={getOptionLabel(cost.nDirectCostOptionID)}
                        amount={Number(cost.dAmount || 0)}
                      />
                    ))
                  )}
                </Box>
              </Box>
              <Divider sx={{ my: 0.75, borderColor: dividerColor }} />
              <FinancialRow
                label="Total Cost"
                value={calculations.totalCost}
                variant="subtotal"
                bold
              />
            </Box>
          </Collapse>
          <CollapsibleSectionHeader
            icon={TrendingUp}
            title="Analysis"
            color={analysisColor}
            expanded={expandedSections.analysis}
            onToggle={() => toggleSection("analysis")}
          />
          <Collapse in={expandedSections.analysis}>
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "stretch" }}>
                <Box sx={{ flex: 1 }}>
                  <FinancialRow label="Total ABC" value={calculations.abc} />
                  <FinancialRow
                    label="Total Selling Price"
                    value={calculations.budget}
                  />
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mx: 0.75, borderColor: dividerColor }}
                />
                <Box sx={{ flex: 1 }}>
                  <DiveAmountRow
                    amount={calculations.abcDiveAmount}
                    percent={calculations.abcDivePercent}
                  />
                  <NetProfitRow
                    amount={calculations.finalTotal}
                    percent={calculations.netProfitPercent}
                  />
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </ModalContainer>
    </>
  );
}

export default CostBreakdownModal;
