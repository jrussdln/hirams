import React, { useState, useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import {
  MonetizationOnOutlined,
  WarningAmberOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import ContentHeaderStructure from "../../../../components/ui/structure/ContentHeaderStructure";
import CardStructure from "../../../../components/ui/structure/CardStructure";
import JevViewPanel from "../../jev/components/JevViewPanel.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors";

export default function JevViewSection({
  jev,
  fmtPHP,
  amount = 0,
  ewt = 0,
  tax = 0,
  retention = 0,
  net = 0,
  particularsGrandTotal = 0,
  jevPendingKey,
  isFinanceOfficer,
  isManagement,
  balance = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const [dismissedMsg, setDismissedMsg] = useState(null);

  if (!jev) return null;

  const isPending = String(jev?.cStatus) === String(jevPendingKey);
  const showBanner =
    isPending &&
    !balance.loading &&
    !!balance.message &&
    dismissedMsg !== balance.message;

  const cards = [
    { label: "Amount", value: amount, variant: "info" },
    { label: "Less: EWT", value: ewt, variant: "default" },
    { label: "Less: Tax", value: tax, variant: "warn" },
    { label: "Less: Retention", value: retention, variant: "default" },
    { label: "Net Amount", value: net, variant: "success" },
  ];

  const headerCards = (
    <ContentHeaderStructure p={1.5} mb={1}>
      <Box
        sx={{
          display: "grid", // ← missing
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(5, minmax(0, 1fr))",
          },
          gap: "12px",
        }}
      >
        {cards.map((c) => (
          <CardStructure
            key={c.label}
            orientation="iconLeft"
            icon={<MonetizationOnOutlined />}
            label={c.label}
            variant={c.variant}
            value={`₱ ${fmtPHP(c.value)}`}
          />
        ))}
      </Box>
    </ContentHeaderStructure>
  );

  return (
    <>
      {headerCards}

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

      <Box sx={{ mt: 1 }}>
        <JevViewPanel
          key={jev.nJEVId}
          jev={(() => {
            // strip entries so JevViewPanel fetches the full account paths
            // eslint-disable-next-line no-unused-vars
            const { entries, ...jevWithoutEntries } = jev;
            return jevWithoutEntries;
          })()}
          particularsGrandTotal={particularsGrandTotal}
          jevPendingKey={jevPendingKey}
          isFinanceOfficer={isFinanceOfficer}
          isManagement={isManagement}
          isJevBalanced={balance.balanced}
          jevBalanceLoading={balance.loading}
          isAssigneeType={false}
          assigneeLinks={[]}
          supplierLinks={[]}
          logsPanel={headerCards}
          panelTitle="Collection Details"
          flowType="collected"
        />
      </Box>
    </>
  );
}
