// pages/shared/collection/components/CollectionPaymentDetails.jsx
//
// The For Collection payment summary: the receipt (CollectionReceiptCard)
// followed by the JEV journal — a dashed placeholder while finance has not
// created one, then the journal itself. The same receipt is handed into
// the Add / Edit Entry modal as its reference panel.
import React, { useMemo, useState } from "react";
import { Box, useTheme } from "@mui/material";
import {
  WarningAmberOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import JevViewPanel from "../../journal-entry-voucher/components/JEVViewPanel.jsx";
import CollectionReceiptCard from "./CollectionReceiptCard.jsx";

// ── Color map: only tokens actually used in this component ──
const useColors = (c) => ({
  border: {
    default: c.slate.border,
  },
  text: {
    secondary: c.gray.textSecondary,
  },
});

export default function CollectionPaymentDetails({
  collectibleAmount = 0,
  clientName,
  clientAddress,
  clientTIN,
  businessStyle,
  companyName,
  transactionTitle,
  nTransactionId,
  cItemType,
  retentionAmount: fetchedRetentionAmount,
  // The journal behind this collection — rendered below the payment
  // details, or a placeholder when finance has not created one yet.
  jev,
  jevPendingKey,
  jevBalance = {},
  isFinanceOfficer,
  isManagement,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const [dismissedMsg, setDismissedMsg] = useState(null);

  // The receipt — one element shared by the page mount and the JEV Entry
  // modal, so both always show the same figures. The modal gets a compact
  // (scaled-down) render so it does not dominate the form.
  const receipt = (
    <CollectionReceiptCard
      eventName={companyName}
      collectibleAmount={collectibleAmount}
      cItemType={cItemType}
      retentionAmount={fetchedRetentionAmount}
      clientName={clientName}
      clientAddress={clientAddress}
      clientTIN={clientTIN}
      businessStyle={businessStyle}
      transactionTitle={transactionTitle}
    />
  );
  const receiptCompact = (
    <CollectionReceiptCard
      compact
      eventName={companyName}
      collectibleAmount={collectibleAmount}
      cItemType={cItemType}
      retentionAmount={fetchedRetentionAmount}
      clientName={clientName}
      clientAddress={clientAddress}
      clientTIN={clientTIN}
      businessStyle={businessStyle}
      transactionTitle={transactionTitle}
    />
  );

  return (
    <Box sx={{ mb: 1.5 }}>
      {receipt}

      {/* ── The journal behind this collection — always visible ──────────
          Voucher-style: a dashed placeholder while finance has not created
          the JEV, then the journal itself (number, title, type, status and
          the From / To columns). */}
      {(() => {
        const balance = jevBalance || {};
        const isPending = String(jev?.cStatus) === String(jevPendingKey);
        const showBanner =
          isPending &&
          !balance.loading &&
          !!balance.message &&
          dismissedMsg !== balance.message;

        return (
          <>
            {showBanner && (
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 4,
                  py: 0.75,
                  mt: 1,
                  borderRadius: "8px",
                  bgcolor: base.amber.warnBg,
                  border: `1px dashed ${base.amber.warnBorder}`,
                }}
              >
                <WarningAmberOutlined
                  sx={{ fontSize: "1rem", color: base.amber.warnText, flexShrink: 0 }}
                />
                <Box
                  sx={{
                    fontSize: "0.72rem",
                    color: base.amber.warnText,
                    lineHeight: 1.4,
                  }}
                >
                  <strong>{balance.message}</strong>
                </Box>
                <Box
                  component="button"
                  onClick={() => setDismissedMsg(balance.message)}
                  aria-label="Dismiss banner"
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    p: 0.4,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: base.amber.warnText,
                  }}
                >
                  <CloseOutlined sx={{ fontSize: "0.9rem" }} />
                </Box>
              </Box>
            )}

            {!jev ? (
              <Box
                sx={{
                  py: 3,
                  mt: 2,
                  textAlign: "center",
                  fontSize: "0.75rem",
                  fontStyle: "italic",
                  color: colors.text.secondary,
                  border: `1px dashed ${colors.border.default}`,
                  borderRadius: "10px",
                }}
              >
                JEV Entries not yet added.
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                <JevViewPanel
                  key={jev.nJEVId}
                  jev={(() => {
                    // strip entries so JevViewPanel fetches the full account
                    // paths itself
                    // eslint-disable-next-line no-unused-vars
                    const { entries, ...jevWithoutEntries } = jev;
                    return jevWithoutEntries;
                  })()}
                  particularsGrandTotal={collectibleAmount}
                  // The full receipt, scaled down for the modal — the
                  // Add / Edit Entry modal prints it as its reference, so
                  // the figures are visible while the entry amounts are
                  // typed in.
                  collectionDetailsPanel={receiptCompact}
                  jevPendingKey={jevPendingKey}
                  isFinanceOfficer={isFinanceOfficer}
                  isManagement={isManagement}
                  isJevBalanced={balance.balanced}
                  jevBalanceLoading={balance.loading}
                  isAssigneeType={false}
                  assigneeLinks={[]}
                  supplierLinks={[]}
                  panelTitle="Collection Details"
                  flowType="collected"
                />
              </Box>
            )}
          </>
        );
      })()}
    </Box>
  );
}
