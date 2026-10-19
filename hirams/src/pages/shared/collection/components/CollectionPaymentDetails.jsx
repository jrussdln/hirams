// components/transaction-purchase/CollectionPaymentDetails.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Divider, useTheme } from "@mui/material";
import { numberToWords } from "../../../../utils/helpers/numberToWords";
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import DirectCostAPI from "../../../../api/endpoints/direct-cost.api.js";
import PricingAPI from "../../../../api/endpoints/pricing.api.js";
import { fmtDate, fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Color map: only tokens actually used in this component ──
const useColors = (c) => ({
  border: {
    default: c.slate.border,
    divider: c.slate.divider,
    borderStrong: c.slate.totalBorder,
  },
  text: {
    primary: c.gray.textPrimary,
    secondary: c.gray.textSecondary,
    muted: c.gray.textMuted,
    heading: c.gray.textHeading,
    label: c.gray.label,
  },
  green: {
    textDark: c.green.textDark,
    paid: c.green.paid,
  },
  amber: {
    warnText: c.amber.warnText,
  },
  navyText: c.navy.text, // brand navy — section title (was theme.palette.primary.main)
  slate: {
    mutedBorder: c.slate.mutedBorder,
  },
});

const Field = ({ label, value, mono = false, sx = {}, valueSx = {} }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          color: colors.text.muted,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          lineHeight: 1,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: colors.text.heading,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textTransform: "uppercase",
          fontFamily: mono ? "monospace" : "inherit",
          ...sx,
          ...valueSx,
        }}
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
};

export default function CollectionPaymentDetails({
  collectibleAmount = 0,
  totalSales = 0,
  clientName,
  clientAddress,
  clientTIN,
  businessStyle,
  companyName,
  transactionTitle,
  date,
  nTransactionId,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [ewtAmount, setEwtAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [retentionAmount, setRetentionAmount] = useState(0);
  const [deductionsLoading, setDeductionsLoading] = useState(false);

  useEffect(() => {
    if (!nTransactionId) return;
    let active = true;
    setDeductionsLoading(true);

    const getCachedOptions = async () => {
      const cached = sessionStorage.getItem("direct_cost_options_cache");
      if (cached) return JSON.parse(cached);
      const res = await DirectCostOptionAPI.getDirectCostOptions();
      const opts = res.data || res || [];
      sessionStorage.setItem("direct_cost_options_cache", JSON.stringify(opts));
      return opts;
    };

    const fetchEwtAndRetention = async () => {
      try {
        const [options, costsRes] = await Promise.all([
          getCachedOptions(),
          DirectCostAPI.getDirectCosts({
            nTransactionID: nTransactionId,
            withEWT: 1,
          }),
        ]);
        if (!active) return;

        const getOptionName = (optionId) => {
          const found = options.find(
            (o) => (o.nDirectCostOptionID || o.id) === optionId,
          );
          return (found?.strName || found?.name || "").toLowerCase();
        };

        const directCosts =
          costsRes.directCosts || costsRes.data || costsRes || [];
        const totalEWT = Number(costsRes.totalEWT) || 0;

        let ewt = 0,
          ewtRecordFound = false,
          retention = 0;
        directCosts.forEach((cost) => {
          const name = getOptionName(cost.nDirectCostOptionID);
          const amount = Number(cost.dAmount || 0);
          if (name === "ewt") {
            ewt += amount;
            ewtRecordFound = true;
          } else if (name.startsWith("ret")) retention += amount;
        });
        setEwtAmount(ewtRecordFound && ewt > 0 ? ewt : totalEWT);
        setRetentionAmount(retention);
      } catch (err) {
        console.error("Error fetching EWT/Retention:", err);
      }
    };

    const fetchTax = async () => {
      try {
        const setsRes = await PricingAPI.getPricingSets(nTransactionId);
        const sets = setsRes.data ?? setsRes ?? [];
        const chosen = sets.find((s) => s.bChosen === 1);
        const pricingSetId = chosen?.nPricingSetId ?? chosen?.id;
        if (!pricingSetId) return;
        const pricingsRes = await PricingAPI.getItemPricings(pricingSetId);
        const total = (pricingsRes.itemPricings || []).reduce(
          (sum, p) => sum + Number(p.tax || 0),
          0,
        );
        if (active) setTaxAmount(total);
      } catch (err) {
        console.error("Error fetching Tax:", err);
      }
    };

    Promise.all([fetchEwtAndRetention(), fetchTax()]).finally(() => {
      if (active) setDeductionsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [nTransactionId]);

  const netAmount =
    Number(collectibleAmount || 0) - ewtAmount - taxAmount - retentionAmount;
  const amountInWords = numberToWords(netAmount);

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: colors.navyText,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              ml: 1,
              flexShrink: 0,
            }}
          >
            Collection Details
          </Typography>
          {companyName && (
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: colors.text.secondary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textTransform: "uppercase",
                fontStyle: "italic",
              }}
              title={companyName}
            >
              — {companyName}
            </Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: colors.text.secondary,
            flexShrink: 0,
            textTransform: "uppercase",
            mr: 1,
          }}
        >
          {fmtDate(date)}
        </Typography>
      </Box>

      <Box
        sx={{
          borderTop: `2px solid ${colors.text.heading}`,
          borderBottom: `2px solid ${colors.text.heading}`,
        }}
      >
        <Box
          sx={{
            py: 2,
            textAlign: "center",
            borderBottom: `1px dashed ${colors.border.divider}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.text.secondary,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              mb: 0.5,
            }}
          >
            Collectible Amount
          </Typography>
          <Typography
            sx={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: colors.green.paid,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {deductionsLoading ? "…" : `₱ ${fmtPHP(netAmount)}`}
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: "0.72rem",
              fontStyle: "italic",
              color: colors.text.secondary,
              lineHeight: 1.5,
              maxWidth: 480,
              mx: "auto",
            }}
          >
            {!deductionsLoading && amountInWords}
          </Typography>
        </Box>

        <Box sx={{ px: 2.5, py: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.75,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Field label="Amount" value={`₱ ${fmtPHP(collectibleAmount)}`} />
              <Field
                label="Less: EWT"
                value={
                  deductionsLoading
                    ? "…"
                    : ewtAmount > 0
                      ? `₱ ${fmtPHP(ewtAmount)}`
                      : "₱ 00.00"
                }
                valueSx={{
                  color:
                    ewtAmount > 0 ? colors.amber.warnText : colors.text.muted,
                }}
              />
              <Field
                label="Less: Tax"
                value={
                  deductionsLoading
                    ? "…"
                    : taxAmount > 0
                      ? `₱ ${fmtPHP(taxAmount)}`
                      : "₱ 00.00"
                }
                valueSx={{
                  color:
                    taxAmount > 0 ? colors.amber.warnText : colors.text.muted,
                }}
              />
              <Field
                label="Less: Retention"
                value={
                  deductionsLoading
                    ? "…"
                    : retentionAmount > 0
                      ? `₱ ${fmtPHP(retentionAmount)}`
                      : "₱ 00.00"
                }
                valueSx={{
                  color:
                    retentionAmount > 0
                      ? colors.amber.warnText
                      : colors.text.muted,
                }}
              />
              <Field
                label="Net Amount"
                value={deductionsLoading ? "…" : `₱ ${fmtPHP(netAmount)}`}
                valueSx={{ color: colors.green.paid, fontWeight: 800 }}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Field
                label="Received From"
                value={clientName}
                sx={{ fontStyle: "italic" }}
              />
              <Field
                label="Business Style"
                value={businessStyle}
                sx={{ fontStyle: "italic" }}
              />
              <Field
                label="Address"
                value={clientAddress}
                sx={{ fontStyle: "italic" }}
              />
              <Field
                label="TIN"
                value={clientTIN}
                sx={{ fontStyle: "italic" }}
              />
            </Box>
          </Box>

          <Divider
            sx={{
              borderStyle: "dashed",
              borderColor: colors.border.divider,
              mb: 2,
            }}
          />

          <Box>
            <Typography
              sx={{
                fontSize: "0.58rem",
                fontWeight: 700,
                color: colors.text.muted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                mb: 0.5,
              }}
            >
              In partial / full payment of account due us
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 500,
                color: colors.text.heading,
                lineHeight: 1.4,
                textTransform: "uppercase",
                fontStyle: "italic",
              }}
            >
              {transactionTitle || "—"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
