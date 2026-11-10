import React from "react";
import { useLocation } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";
import { ArrowBack, TrendingUp, ReceiptLong, Save } from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import MiniBaseButton from "../../../components/ui/form/MiniBaseButton";
import AlertStructure from "../../../components/ui/structure/AlertStructure";
import TransactionDetails from "../transactions/components/TransactionDetails";
import TransactionItemsTable from "../canvas/components/TransactionItemsTable";
import PricingPanel from "./components/PricingPanel";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
// ─── THEME COLORS MAPPING — only tokens PricingView itself still uses ──
// (all pricing-table tokens moved into PricingPanel, which owns that UI now)
const useColors = (c) => ({
  slateBorder: c.slate.border,
  slateBorderLight: c.slate.borderLight,
  textSecondary: c.gray.textSecondary,
  inputBg: c.gray.inputBg,
  amberWarnBg: c.amber.warnBg,
  amberWarnBorder: c.amber.warnBorder,
  amberWarnText: c.amber.warnText,
  amberStrong: c.amber.textStrong,
  tabActive: c.blue.tabActive,
  textOnFill: c.gray.textOnFill,
});

export default function PricingView(props) {
  const location = useLocation();
  const initialSet = location.state?.selectedSet; // ⬅ NEW — the row clicked in PricingSetPanel
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const {
    transaction,
    selectedStatusCode,
    isPricingSetting,
    currentStatusLabel,
    isManagement,
    isProcurementTL,
    transacstatus,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    currentUserId,
    procSource,
    onStatusChanged,
    items,
    itemsLoading,
    activeTab,
    setActiveTab,
    expandedRows,
    setExpandedRows,
    expandedOptions,
    setExpandedOptions,
    clientNickName,
    procSourceLabel,
    transactionHasABC,
    fmtPHP,
    getEffectiveABC,
    totals,
    blocker,
    uiMessages,
    statusChangedAlert,
    countdown,
    statusTransaction,
    itemType,
    procMode,
  } = props;

  // ── Bridge to PricingPanel: since it now owns its own pricing state,
  // the footer buttons read that state back via onStateChange and
  // trigger actions through the imperative ref — both additive/opt-in
  // on PricingPanel's side, so its other usages are unaffected.
  const pricingPanelRef = React.useRef(null);
  const [panelState, setPanelState] = React.useState({
    saving: false,
    hasUnsavedChanges: false,
    allItemsHavePrices: false,
    itemsLoading: false,
    selectedSet: null,
  });

  const footerLActions = (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={() => window.history.back()}
      actionColor="back"
    />
  );

  const footerRActions =
    activeTab === "pricing" ? (
      <Box sx={{ display: "flex", gap: 1 }}>
        <BaseButton
          label="Set Markup"
          icon={icons.markup}
          variant="outlined"
          actionColor="markup"
          onClick={() => pricingPanelRef.current?.openMarkupModal()}
          disabled={panelState.itemsLoading || !!statusChangedAlert}
        />
        <BaseButton
          label={panelState.saving ? "Saving..." : "Save Changes"}
          icon={icons.save}
          variant="contained"
          actionColor="approve"
          onClick={() => pricingPanelRef.current?.save()}
          disabled={
            panelState.itemsLoading ||
            !!statusChangedAlert ||
            !panelState.hasUnsavedChanges ||
            panelState.saving
          }
        />
      </Box>
    ) : null;

  const showCostBreakdownSubFooter =
    activeTab === "pricing" && panelState.allItemsHavePrices;

  return (
    <PageLayout
      title="Transaction"
      subtitle={`${currentStatusLabel || ""} / ${transaction?.strCode || transaction?.transactionId || ""}${panelState.selectedSet ? ` / ${panelState.selectedSet.name}` : ""}`}
      headerRight={
        <div
          style={{
            display: "flex",
            border: `1px solid ${colors.slateBorder}`,
            borderRadius: "8px",
            overflow: "hidden",
            fontSize: "0.65rem",
            fontWeight: 600,
          }}
        >
          {["info", "canvas", "pricing"].map((tab) => (
            <button
              key={tab}
              data-active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === tab ? colors.tabActive : colors.inputBg,
                color:
                  activeTab === tab ? colors.textOnFill : colors.textSecondary,
                border: "none",
                borderRight:
                  tab !== "pricing"
                    ? `1px solid ${colors.slateBorderLight}`
                    : "none",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      }
      footerLActions={footerLActions}
      footerRActions={footerRActions}
      subFooter={
        showCostBreakdownSubFooter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              height: "100%",
              padding: "0 1rem",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                pr: 1,
              }}
            >
              <ReceiptLong sx={{ fontSize: "0.8rem", color: "white" }} />
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "0.025em",
                }}
              >
                COST BREAKDOWN IS NOW AVAILABLE!
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <MiniBaseButton
                label="VIEW"
                icon={icons.view}
                color="white"
                bg="rgba(255, 255, 255, 0.15)"
                border="rgba(255, 255, 255, 0.3)"
                hoverBg="rgba(255, 255, 255, 0.25)"
                onClick={() => pricingPanelRef.current?.openCostBreakdown()}
              />
            </Box>
          </div>
        ) : null
      }
      loading={props.loading || panelState.itemsLoading}
    >
      {statusChangedAlert && (
        <Box
          sx={{
            mb: 1.5,
            px: 1.5,
            py: 0.75,
            background: colors.amberWarnBg,
            border: `1px solid ${colors.amberWarnBorder}`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Save sx={{ fontSize: "0.9rem", color: colors.amberWarnText }} />
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: colors.amberStrong,
                fontWeight: 600,
              }}
            >
              Status update detected — redirecting in {countdown ?? 5}s...
            </Typography>
          </Box>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${colors.amberWarnText}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: colors.amberWarnText,
              }}
            >
              {countdown ?? 5}
            </Typography>
          </Box>
        </Box>
      )}

      {activeTab === "info" && (
        <TransactionDetails
          details={transaction}
          statusTransaction={statusTransaction}
          itemType={itemType}
          procMode={procMode}
          procSourceLabel={procSourceLabel}
        />
      )}

      {/* Pricing tab now fully delegated to PricingPanel — no duplicated
          StatCard/UspCell/columns logic left in this file. */}
      {activeTab === "pricing" && (
        <PricingPanel
          ref={pricingPanelRef}
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
          statusTransaction={statusTransaction}
          clientNickName={clientNickName}
          onStatusChanged={onStatusChanged}
          statusChangedAlert={statusChangedAlert}
          onStateChange={setPanelState}
          initialSet={initialSet}
        />
      )}

      {activeTab === "canvas" && (
        <TransactionItemsTable
          readOnly
          items={items}
          itemsLoading={itemsLoading}
          expandedRows={expandedRows}
          expandedOptions={expandedOptions}
          optionErrors={props.optionErrors}
          anyItemHasABC={items.some((i) => Number(i.abc || 0) > 0)}
          isManagement={isManagement}
          transaction={transaction}
          getEffectiveABC={getEffectiveABC}
          showPurchaseOptions={true}
          handleCollapseAllToggle={() =>
            setExpandedRows(
              Object.keys(expandedRows).length
                ? {}
                : Object.fromEntries(
                    items.map((i) => [i.id, { specs: false, options: true }]),
                  ),
            )
          }
          toggleSpecsRow={(id) =>
            setExpandedRows((p) => ({
              ...p,
              [id]: { specs: !p[id]?.specs, options: p[id]?.options },
            }))
          }
          toggleOptionsRow={(id) =>
            setExpandedRows((p) => ({
              ...p,
              [id]: { specs: p[id]?.specs, options: !p[id]?.options },
            }))
          }
          toggleOptionSpecs={(optionId) =>
            setExpandedOptions((p) => ({ ...p, [optionId]: !p[optionId] }))
          }
          abcValue={
            transactionHasABC
              ? `${fmtPHP(transaction.dTotalABC)}`
              : `${fmtPHP(totals.totalABCAll)}`
          }
          totalCanvas={totals.totalPurchaseAll}
          totalABC={totals.totalABCAll}
        />
      )}

      <AlertStructure
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset()}
        title="Unsaved Changes"
        message={uiMessages.common.unsavedChanges}
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => blocker.proceed()}
      />
    </PageLayout>
  );
}
