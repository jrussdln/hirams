// pages/shared/collection/components/CollectionReceiptCard.jsx
//
// The collection receipt itself — company header + live timestamp, the
// Collection Amount block with the deduction ledger, the client info and
// the "In partial / full payment of" section. Rendered by the For
// Collection workspace AND handed into the JEV Entry modal as its
// reference panel, so both always show the same figures from one source.
//
// `compact` scales everything down (fonts + spacing) for mounts like the
// entry modal, where the page-size receipt would dominate the form.
import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Divider, useTheme } from "@mui/material";
import { numberToWords } from "../../../../utils/helpers/numberToWords";
import { fmtDate, fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { calculateCollectionEWT } from "../../../../utils/helpers/calculateEWT.js";
import { calculateCollectionTax } from "../../../../utils/helpers/calculateTax.js";
import PickableValue from "../../../../components/ui/form/AmountPick.jsx";

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
  navyText: c.navy.text,
});

const Field = ({
  label,
  value,
  // The RAW number behind the text — when provided (and a provider is
  // above), the printed figure becomes click-to-fill-Amt.
  pickValue,
  mono = false,
  right = false,
  compact = false,
  sizes,
  sx = {},
  valueSx = {},
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const align = right ? { textAlign: "right" } : {};
  // Tighter, lighter variant for the deduction rows.
  const compactLabel = compact
    ? { fontSize: sizes.deductionLabel, fontWeight: 600, lineHeight: 0.85, mb: 0.05 }
    : {};
  const compactValue = compact
    ? { fontSize: sizes.deductionValue, fontWeight: 500, lineHeight: 1 }
    : {};

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: sizes.fieldLabel,
          fontWeight: 700,
          color: colors.text.muted,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          lineHeight: 1,
          mb: compact ? 0.25 : 0.3,
          ...compactLabel,
          ...align,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: sizes.fieldValue,
          fontWeight: 600,
          color: colors.text.heading,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textTransform: "uppercase",
          fontFamily: mono ? "monospace" : "inherit",
          ...compactValue,
          ...align,
          ...sx,
          ...valueSx,
        }}
        title={
          typeof value === "string"
            ? value
            : pickValue != null
              ? `Click to fill Amount`
              : undefined
        }
      >
        {pickValue != null && Number.isFinite(Number(pickValue)) ? (
          <PickableValue value={pickValue} variant="inherit">
            {value || "—"}
          </PickableValue>
        ) : (
          value || "—"
        )}
      </Typography>
    </Box>
  );
};

export default function CollectionReceiptCard({
  // The company line + the live timestamp sit ABOVE the bordered card —
  // the entry modal's narrower mount can hide them, but callers usually
  // want exactly the receipt the workspace shows.
  eventName = "",
  showHeader = true,
  // Scale everything down for small mounts (the JEV Entry modal).
  compact = false,
  // The client-info blocks ("Received From", "Business Style", "Address",
  // "TIN" and the "In partial / full payment of" line) sit under the
  // amount + deduction ledger. A mount that needs ONLY the figures — the
  // /jev-update page's top block — hides them while keeping the full-size
  // fonts (unlike `compact`, which hides them AND shrinks everything).
  // Defaults to `!compact`: the page receipt shows them, the modal's
  // shrunken one does not — exactly the way both mounts have always read.
  showClientInfo,
  collectibleAmount = 0,
  cItemType,
  retentionAmount: fetchedRetentionAmount = 0,
  clientName,
  clientAddress,
  clientTIN,
  businessStyle,
  transactionTitle,
}) {
  const isDark = useTheme().palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // The two size sets: the page receipt, and the shrunken modal receipt.
  const sizes = compact
    ? {
        header: "0.6rem",
        amountLabel: "0.58rem",
        amount: "1.6rem",
        words: "0.58rem",
        fieldLabel: "0.5rem",
        fieldValue: "0.66rem",
        deductionLabel: "0.46rem",
        deductionValue: "0.56rem",
        payLabel: "0.5rem",
        payValue: "0.66rem",
        padX: 1.25,
        rowGap: 2,
        ledgerGap: 0.45,
        blockGapY: 0.9,
        clientGapX: 1,
        clientGapY: 0.7,
        clientMb: 1,
      }
    : {
        header: "0.75rem",
        amountLabel: "0.72rem",
        amount: "2.8rem",
        words: "0.75rem",
        fieldLabel: "0.6rem",
        fieldValue: "0.8rem",
        deductionLabel: "0.55rem",
        deductionValue: "0.7rem",
        payLabel: "0.6rem",
        payValue: "0.8rem",
        padX: 2,
        rowGap: 3,
        ledgerGap: 0.6,
        blockGapY: 1.25,
        clientGapX: 1.25,
        clientGapY: 0.9,
        clientMb: 1.25,
      };

  // The card timestamp ticks: it shows the wall clock, not the transaction
  // date — refreshed every 30s so the minutes never go stale.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // EWT is determined by the transaction item type, not by the direct-cost
  // rows. Calculate it directly so the collection summary cannot remain at
  // the initial zero while the rest of the transaction data is loading.
  const ewtAmount = calculateCollectionEWT(collectibleAmount, cItemType);
  const taxAmount = calculateCollectionTax(collectibleAmount);
  const retentionAmount = Number(fetchedRetentionAmount || 0);
  const deductionsLoading = false;

  // `?? ` lets an explicit false stand (the /jev-update mount) while a
  // caller that says nothing keeps the historic rule: full receipt shows
  // the client blocks, the compact modal one hides them.
  const showClient = showClientInfo ?? !compact;
  // When the client blocks are hidden (the entry modal's shrunken
  // receipt, the /jev-update page's figures-only one) the client's name
  // would disappear entirely — so it moves INTO the header line, ahead
  // of the company: "LGU - VICTORIA - HiRAMS' Supply Wholesaling".
  const headerName =
    !showClient && clientName ? `${clientName} - ${eventName}` : eventName;

  const netAmount =
    Number(collectibleAmount || 0) - ewtAmount - taxAmount - retentionAmount;
  const amountInWords = numberToWords(netAmount);

  return (
    <Box>
      {showHeader && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.5,
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
            {eventName && (
              <Typography
                sx={{
                  fontSize: sizes.header,
                  fontWeight: 600,
                  color: colors.text.secondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textTransform: "uppercase",
                  fontStyle: "italic",
                }}
                title={
                  !showClient && clientName
                    ? headerName
                    : eventName
                }
              >
                {headerName}
              </Typography>
            )}
          </Box>
          <Typography
            sx={{
              fontSize: sizes.header,
              fontWeight: 600,
              color: colors.text.secondary,
              flexShrink: 0,
              textTransform: "uppercase",
              mr: 1,
            }}
          >
            {fmtDate(now)}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          borderTop: `2px solid ${colors.text.heading}`,
          borderBottom: `2px solid ${colors.text.heading}`,
        }}
      >
        <Box
          sx={{
            px: sizes.padX,
            py: 1,
            display: "flex",
            alignItems: "flex-start",
            gap: sizes.rowGap,
            borderBottom: `1px dashed ${colors.border.divider}`,
          }}
        >
          {/* ── Collection amount + words, on the left of the row ── */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: sizes.amountLabel,
                fontWeight: 700,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                mb: 0.25,
              }}
            >
              Collection Amount
            </Typography>
            <Typography
              sx={{
                fontSize: sizes.amount,
                fontWeight: 800,
                color: colors.green.paid,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {deductionsLoading ? (
                "…"
              ) : (
                <PickableValue value={netAmount} variant="inherit">
                  {fmtPHP(netAmount)}
                </PickableValue>
              )}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: sizes.words,
                fontStyle: "italic",
                color: colors.text.secondary,
                lineHeight: 1.35,
                whiteSpace: "nowrap",
              }}
            >
              {!deductionsLoading && amountInWords}
            </Typography>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 0.5,
              borderStyle: "dashed",
              borderColor: colors.border.divider,
              alignSelf: "stretch",
              flexShrink: 0,
            }}
          />

          {/* ── The deduction ledger, on the right of the same row ── */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: sizes.ledgerGap,
              flexShrink: 0,
            }}
          >
            <Field
              label="Amount"
              value={`${fmtPHP(collectibleAmount)}`}
              right
              pickValue={collectibleAmount}
              sizes={sizes}
            />
            <Field
              label="Less: EWT"
              right
              compact
              sizes={sizes}
              sx={{ fontStyle: "italic" }}
              value={
                deductionsLoading
                  ? "…"
                  : ewtAmount > 0
                    ? `${fmtPHP(ewtAmount)}`
                    : "₱ 00.00"
              }
              pickValue={ewtAmount > 0 ? ewtAmount : null}
              valueSx={{ color: colors.text.label }}
            />
            <Field
              label="Less: Tax"
              right
              compact
              sizes={sizes}
              sx={{ fontStyle: "italic" }}
              value={
                deductionsLoading
                  ? "…"
                  : taxAmount > 0
                    ? `${fmtPHP(taxAmount)}`
                    : "₱ 00.00"
              }
              pickValue={taxAmount > 0 ? taxAmount : null}
              valueSx={{ color: colors.text.label }}
            />
            <Field
              label="Less: Retention"
              right
              compact
              sizes={sizes}
              sx={{ fontStyle: "italic" }}
              value={
                deductionsLoading
                  ? "…"
                  : retentionAmount > 0
                    ? `${fmtPHP(retentionAmount)}`
                    : "₱ 00.00"
              }
              pickValue={retentionAmount > 0 ? retentionAmount : null}
              valueSx={{ color: colors.text.label }}
            />
          </Box>
        </Box>

        {showClient && (
          <Box sx={{ px: sizes.padX, py: sizes.blockGapY }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: sizes.clientGapX,
                mb: sizes.clientMb,
              }}
            >
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: sizes.clientGapY }}
              >
                <Field label="Received From" value={clientName} sizes={sizes} />
                <Field label="Business Style" value={businessStyle} sizes={sizes} />
              </Box>

              <Box
                sx={{ display: "flex", flexDirection: "column", gap: sizes.clientGapY }}
              >
                <Field label="Address" value={clientAddress} sizes={sizes} />
                <Field label="TIN" value={clientTIN} sizes={sizes} />
              </Box>
            </Box>

            <Divider
              sx={{
                borderStyle: "dashed",
                borderColor: colors.border.divider,
                mb: sizes.clientMb,
              }}
            />

            <Box>
              <Typography
                sx={{
                  fontSize: sizes.payLabel,
                  fontWeight: 700,
                  color: colors.text.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  mb: 0.25,
                }}
              >
                In partial / full payment of account due us
              </Typography>
              <Typography
                sx={{
                  fontSize: sizes.payValue,
                  fontWeight: 500,
                  color: colors.text.heading,
                  lineHeight: 1.3,
                  textTransform: "uppercase",
                  fontStyle: "italic",
                }}
              >
                {transactionTitle || "—"}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
