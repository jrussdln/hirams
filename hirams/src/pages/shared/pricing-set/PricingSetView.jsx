import React, { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ArrowBack, Undo } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import PricingSetPanel from "./components/PricingSetPanel";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
const useColors = (c) => ({
  alertBg: c.amber.bgSoft,
  alertBorder: c.amber.border,
  alertIcon: c.amber.textStrong,
  alertText: c.amber.textDark,
  countCircleBorder: c.amber.textStrong,
  countText: c.amber.textStrong,
});

export default function PricingSetView(props) {
  const {
    navigate,
    transaction,
    loading,
    statusChangedAlert,
    countdown,
    footerActions,
    setFooterActions,
    selectedStatusCode,
    isManagement,
    isProcurementTL,
    transacstatus,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    isPricingSetting,
    currentStatusLabel,
    currentUserId,
    itemType,
    procMode,
    procSource,
    proc_status,
    statusTransaction,
    clientNickName,
    priceSettingKey,
    priceFinalizeVerificationKey,
    handleStatusChanged,
    beginLocalAction,
    cancelLocalAction,
  } = props;

  const theme = useTheme(),
    isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const [setsLoading, setSetsLoading] = useState(false);
  const footerLActions = (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={() => navigate(-1)}
      actionColor="back"
      disabled={loading}
    />
  );

  return (
    <PageLayout
      title="Transaction"
      subtitle={`${currentStatusLabel || ""} / ${transaction?.strCode || transaction?.transactionId || ""}`}
      loading={loading || setsLoading}
      footerLActions={footerLActions}
      footerRActions={footerActions ?? null}
    >
      {statusChangedAlert && (
        <Box
          sx={{
            mb: 1.5,
            px: 1.5,
            py: 0.75,
            background: colors.alertBg,
            border: `1px solid ${colors.alertBorder}`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Undo sx={{ fontSize: "0.9rem", color: colors.alertIcon }} />
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: colors.alertText,
                fontWeight: 600,
              }}
            >
              Status update detected — this transaction has been moved to a
              different status. All actions are disabled. Redirecting you back
              shortly.
            </Typography>
          </Box>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${colors.countCircleBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: colors.countText,
              }}
            >
              {countdown ?? 5}
            </Typography>
          </Box>
        </Box>
      )}
      <PricingSetPanel
        transaction={transaction}
        selectedStatusCode={selectedStatusCode}
        isManagement={isManagement}
        isProcurementTL={isProcurementTL}
        transacstatus={transacstatus}
        forPricingKey={forPricingKey}
        priceVerificationKey={priceVerificationKey}
        priceApprovalKey={priceApprovalKey}
        priceSettingKey={priceSettingKey}
        priceFinalizeVerificationKey={priceFinalizeVerificationKey}
        isPricingSetting={isPricingSetting}
        currentStatusLabel={currentStatusLabel}
        currentUserId={currentUserId}
        itemType={itemType}
        procMode={procMode}
        procSource={procSource}
        proc_status={proc_status}
        statusTransaction={statusTransaction}
        clientNickName={clientNickName}
        onStatusChanged={handleStatusChanged}
        onActionStart={beginLocalAction}
        onActionFailed={cancelLocalAction}
        statusChangedAlert={statusChangedAlert}
        onActionsReady={setFooterActions}
        onLoadingChange={setSetsLoading}
      />
    </PageLayout>
  );
}
