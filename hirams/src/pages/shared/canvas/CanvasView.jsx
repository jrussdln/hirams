import React, { useMemo } from "react";
import PageLayout from "../../../components/layouts/page/content-page";

import { Box, Typography, Alert } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Replay } from "@mui/icons-material";
import BaseButton from "../../../components/ui/form/BaseButton";
import TransactionDetails from "../transactions/components/TransactionDetails";
import TransactionItemsTable from "./components/TransactionItemsTable";
import PricingPanel from "../pricing/components/PricingPanel";
import AssignAOModal from "./modal/AssignAOModal";
import NewItemModal from "./modal/NewItemModal";
import NewOptionModal from "./modal/NewOptionModal";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import TransactionActionModal from "../transactions/modal/TransactionActionModal";
import ExportCanvasModal from "./modal/ExportCanvasModal";
import CostBreakdownModal from "../pricing/modal/CostBreakdownModal";
import GetSuggestionsModal from "./modal/GetSuggestionsModal";
import StatusModal from "../pricing/modal/StatusModal";
import ArchiveModal from "../archive/modal/ArchiveModal";
import DirectCostModal from "../transactions/modal/DirectCostModal";
import AlertStructure from "../../../components/ui/structure/AlertStructure";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
// ─────────────────────────────────────────────────────────────────
// PROMPT 1 — Inline color map: ONLY tokens this component uses
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Tab switcher colors
  tabBorder: c.slate.border,
  tabInactiveBg: c.slate.btnBg,
  tabInactiveText: c.gray.textSecondary,
  tabActiveBg: c.blue.bg,
  tabActiveText: c.blue.text,

  // Amber banner — status changed alert
  bannerBg: c.amber.warnBg,
  bannerBorder: c.amber.warnBorder,
  bannerAccent: c.amber.textDark,
  bannerText: c.amber.warnText,

  // Green success card — direct cost summary
  successCardBg: c.green.badgeBg,
  successCardBorder: c.green.paidBorder,
  successCardText: c.green.badgeText,
});

export default function CanvasView(props) {
  // ✅ Standard wiring — PROMPT 1 pattern
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const {
    navigate,
    scrollRef,
    transaction,
    transactionCode,
    selectedStatusCode,
    statusTransaction,
    itemType,
    procMode,
    procSource,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    ao_status,
    proc_status,
    transacstatus,
    currentStatusLabel,
    isManagement,
    isProcurement,
    isAccountOfficer,
    isAOTL,
    isArchiveView,
    statusChangedAlert,
    countdown,
    activeTab,
    setActiveTab,
    actionModal,
    setActionModal,
    expandedRows,
    setExpandedRows,
    expandedOptions,
    setExpandedOptions,
    isCompareActive,
    setIsCompareActive,
    itemsLoading,
    items,
    suppliers,
    compareData,
    setCompareData,
    cItemType,
    editingOption,
    optionModalItemId,
    optionModalItem,
    addingNewItem,
    editingItem,
    entityToDelete,
    assignMode,
    accountOfficers,
    optionErrors,
    suggestionsItem,
    isSuggestionsModalOpen,
    isExportCanvasOpen,
    isCostBreakdownOpen,
    pricingSet,
    pricingItems,
    unitSellingPrices,
    pricingTaxes,
    isStatusModalOpen,
    isArchiveModalOpen,
    directCostModalOpen,
    directCostCheckOpen,
    existingDirectCosts,
    directCostOptions,
    showCostBreakdown,
    hasAssignedAO,
    limitedContent,
    isDraftOrFinalizeStatus,
    showForAssignment,
    showPurchaseOptions,
    crudItemsEnabled,
    showAddButton,
    checkboxOptionsEnabled,
    showVerify,
    showFinalize,
    showForceFinalize,
    showRevert,
    abcValidation,
    shouldDisableFinalize,
    finalizeBlockReason,
    abcValue,
    abcSub,
    fmt,
    fmtDateTime,
    getDueDateVariant,
    getEffectiveABC,
    fetchItems,
    setIsSuggestionsModalOpen,
    setSuggestionsItem,
    setAddingNewItem,
    setEditingItem,
    setEntityToDelete,
    setEditingOption,
    setOptionModalItemId,
    setOptionModalItem,
    setAssignMode,
    setIsExportCanvasOpen,
    setIsCostBreakdownOpen,
    setIsStatusModalOpen,
    setIsArchiveModalOpen,
    setDirectCostModalOpen,
    setDirectCostCheckOpen,
    handleCollapseAllToggle,
    toggleSpecsRow,
    toggleOptionsRow,
    toggleOptionSpecs,
    handleToggleInclude,
    handleDragEnd,
    handleCompareClick,
    handleBackFromCompare,
    updateSpecs,
    handleFinalizeWithDirectCostCheck,
    handleAfterAction,
    getDirectCostLabel,
    archiveStatus,
    pendingFinalizeAction,
    forCanvasKey,
    priceSettingKey,
    finalizeVerificationKey,
    priceFinalizeVerificationKey,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    currentUserId,
  } = props;

  const StatusChangedBanner = () =>
    statusChangedAlert ? (
      <Box
        sx={{
          mb: 1.5,
          px: 1.5,
          py: 0.75,
          background: colors.bannerBg,
          border: `1px solid ${colors.bannerBorder}`,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Replay sx={{ fontSize: "0.9rem", color: colors.bannerAccent }} />
          <Typography
            sx={{
              fontSize: "0.65rem",
              color: colors.bannerText,
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
            border: `2px solid ${colors.bannerAccent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: colors.bannerAccent,
              lineHeight: 1,
            }}
          >
            {countdown ?? 5}
          </Typography>
        </Box>
      </Box>
    ) : null;

  if (!transaction) return null;

  const totalIncludedQty = items.reduce(
    (sum, item) =>
      sum +
      item.purchaseOptions
        .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
        .reduce((s, o) => s + Number(o.nQuantity || 0), 0),
    0,
  );
  const totalItemQty = items.reduce((sum, i) => sum + Number(i.qty || 0), 0);

  return (
    <PageLayout
      title={isArchiveView ? "Transaction Archived" : "Transaction"}
      subtitle={
        !isArchiveView
          ? `${currentStatusLabel || ""} / ${transactionCode || ""}`
          : `${transactionCode || ""}`
      }
      loading={itemsLoading}
      scrollRef={scrollRef}
      headerRight={
        isDraftOrFinalizeStatus ? null : !limitedContent ? (
          <div
            style={{
              display: "flex",
              border: `1px solid ${colors.tabBorder}`,
              borderRadius: "8px",
              overflow: "hidden",
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            <button
              onClick={() => setActiveTab("info")}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === "info"
                    ? colors.tabActiveBg
                    : colors.tabInactiveBg,
                color:
                  activeTab === "info"
                    ? colors.tabActiveText
                    : colors.tabInactiveText,
                border: "none",
                borderRight: `1px solid ${colors.tabBorder}`,
                cursor: "pointer",
              }}
            >
              Information
            </button>
            <button
              onClick={() => setActiveTab("canvas")}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === "canvas"
                    ? colors.tabActiveBg
                    : colors.tabInactiveBg,
                color:
                  activeTab === "canvas"
                    ? colors.tabActiveText
                    : colors.tabInactiveText,
                border: "none",
                cursor: "pointer",
              }}
            >
              Canvas
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              border: `1px solid ${colors.tabBorder}`,
              borderRadius: "8px",
              overflow: "hidden",
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            <button
              onClick={() => setActiveTab("canvas")}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === "canvas"
                    ? colors.tabActiveBg
                    : colors.tabInactiveBg,
                color:
                  activeTab === "canvas"
                    ? colors.tabActiveText
                    : colors.tabInactiveText,
                border: "none",
                cursor: "pointer",
              }}
            >
              Canvas
            </button>
            <button
              onClick={() => setActiveTab("pricing")}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === "pricing"
                    ? colors.tabActiveBg
                    : colors.tabInactiveBg,
                color:
                  activeTab === "pricing"
                    ? colors.tabActiveText
                    : colors.tabInactiveText,
                border: "none",
                cursor: "pointer",
              }}
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveTab("info")}
              style={{
                padding: "3px 10px",
                background:
                  activeTab === "info"
                    ? colors.tabActiveBg
                    : colors.tabInactiveBg,
                color:
                  activeTab === "info"
                    ? colors.tabActiveText
                    : colors.tabInactiveText,
                border: "none",
                borderRight: `1px solid ${colors.tabBorder}`,
              }}
            >
              Awarding
            </button>
          </div>
        )
      }
      footerLActions={
        <BaseButton
          label="Back"
          icon={icons.back}
          onClick={isCompareActive ? handleBackFromCompare : () => navigate(-1)}
          actionColor="back"
        />
      }
      footerRActions={
        <>
          {showRevert && (
            <BaseButton
              label="Revert"
              icon={icons.revert}
              onClick={() => setActionModal("reverted")}
              disabled={itemsLoading || statusChangedAlert}
              actionColor="revert"
            />
          )}
          {showCostBreakdown && (
            <BaseButton
              label="Cost Breakdown"
              icon={icons.breakdown}
              onClick={() => setIsCostBreakdownOpen(true)}
              disabled={itemsLoading || statusChangedAlert}
              actionColor="breakdown"
            />
          )}
          {showCostBreakdown && (isManagement || isProcurement) && (
            <BaseButton
              label="Update Status"
              icon={icons.status}
              onClick={() => setIsStatusModalOpen(true)}
              disabled={itemsLoading || statusChangedAlert}
              actionColor="approve"
            />
          )}
          {forCanvasKey.includes(selectedStatusCode) && !isCompareActive && (
            <BaseButton
              label="Export"
              icon={icons.export}
              onClick={() => setIsExportCanvasOpen(true)}
              disabled={
                statusChangedAlert ||
                itemsLoading ||
                totalIncludedQty !== totalItemQty
              }
              actionColor="save"
              tooltip={
                totalIncludedQty !== totalItemQty
                  ? "All quantities must be fulfilled before exporting"
                  : ""
              }
            />
          )}
          {showVerify && (
            <BaseButton
              label="Verify"
              icon={icons.verify}
              onClick={() => setActionModal("verified")}
              disabled={itemsLoading || statusChangedAlert}
              actionColor="verify"
            />
          )}
          {showFinalize && (
            <BaseButton
              label="Finalize"
              icon={icons.finalize}
              onClick={() => handleFinalizeWithDirectCostCheck("finalized")}
              disabled={shouldDisableFinalize || statusChangedAlert}
              actionColor="finalize"
              tooltip={finalizeBlockReason}
            />
          )}
          {showForceFinalize && (
            <BaseButton
              label="Force Finalize"
              icon={icons.finalize}
              onClick={() =>
                handleFinalizeWithDirectCostCheck("force_finalized")
              }
              disabled={shouldDisableFinalize || statusChangedAlert}
              actionColor="finalize"
              tooltip={finalizeBlockReason}
            />
          )}
          {showForAssignment && (
            <BaseButton
              label={hasAssignedAO ? "Reassign AO" : "Assign AO"}
              icon={icons.assign}
              onClick={() =>
                setAssignMode(hasAssignedAO ? "reassign" : "assign")
              }
              disabled={itemsLoading || statusChangedAlert}
              actionColor={hasAssignedAO ? "reassign" : "assign"}
            />
          )}
          {isArchiveView && (
            <BaseButton
              label="Unarchive"
              icon={icons.unarchived}
              onClick={() => setIsArchiveModalOpen(true)}
              actionColor="revert"
            />
          )}
        </>
      }
    >
      <Box>
        <StatusChangedBanner />

        {activeTab === "pricing" && (
          <PricingPanel
            transaction={transaction}
            selectedStatusCode={selectedStatusCode}
            isManagement={isManagement}
            isProcurementTL={isAccountOfficer}
            transacstatus={transacstatus}
            currentStatusLabel={currentStatusLabel}
            currentUserId={transaction?.created_by_id}
            itemType={itemType}
            procMode={procMode}
            procSource={procSource}
            statusTransaction={statusTransaction}
            clientNickName={transaction?.clientName}
            isPricingSetting={forCanvasKey.includes(selectedStatusCode)}
            statusChangedAlert={statusChangedAlert}
            forPricingKey={forPricingKey}
            priceVerificationKey={priceVerificationKey}
            priceApprovalKey={priceApprovalKey}
            priceSettingKey={priceSettingKey}
            priceFinalizeVerificationKey={priceFinalizeVerificationKey}
          />
        )}

        {activeTab === "info" && (
          <TransactionDetails
            details={transaction}
            statusTransaction={statusTransaction}
            itemType={itemType}
            procMode={procMode}
            procSourceLabel={procSource?.[transaction?.cProcSource] || null}
          />
        )}

        {activeTab === "canvas" && (
          <>
            {!isCompareActive && abcValidation && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {abcValidation}
              </Alert>
            )}
            <TransactionItemsTable
              items={items}
              itemsLoading={itemsLoading}
              expandedRows={expandedRows}
              expandedOptions={expandedOptions}
              optionErrors={optionErrors}
              compareData={compareData}
              isCompareActive={isCompareActive}
              crudItemsEnabled={crudItemsEnabled}
              showAddButton={showAddButton}
              showPurchaseOptions={showPurchaseOptions}
              checkboxOptionsEnabled={checkboxOptionsEnabled}
              anyItemHasABC={
                items.some((i) => Number(i.abc || 0) > 0) || items.length === 0
              }
              statusChangedAlert={statusChangedAlert}
              isManagement={isManagement}
              isAccountOfficer={isAccountOfficer}
              isAOTL={isAOTL}
              suppliers={suppliers}
              cItemType={cItemType}
              currentStatusLabel={currentStatusLabel}
              transaction={transaction}
              getEffectiveABC={getEffectiveABC}
              handleDragEnd={handleDragEnd}
              handleCollapseAllToggle={handleCollapseAllToggle}
              toggleSpecsRow={toggleSpecsRow}
              toggleOptionsRow={toggleOptionsRow}
              toggleOptionSpecs={toggleOptionSpecs}
              handleToggleInclude={handleToggleInclude}
              handleCompareClick={handleCompareClick}
              setEditingItem={setEditingItem}
              setAddingNewItem={setAddingNewItem}
              setEntityToDelete={setEntityToDelete}
              setSuggestionsItem={setSuggestionsItem}
              setIsSuggestionsModalOpen={setIsSuggestionsModalOpen}
              setEditingOption={setEditingOption}
              setOptionModalItemId={setOptionModalItemId}
              setOptionModalItem={setOptionModalItem}
              setExpandedRows={setExpandedRows}
              forCanvasKey={forCanvasKey}
              abcValue={abcValue}
              abcSub={abcSub}
              abcValidation={abcValidation}
              totalCanvas={items.reduce(
                (sum, item) =>
                  sum +
                  item.purchaseOptions
                    .filter((o) => o.bIncluded)
                    .reduce(
                      (s, o) =>
                        s +
                        Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
                      0,
                    ),
                0,
              )}
              totalABC={
                transaction?.dTotalABC
                  ? Number(transaction.dTotalABC)
                  : items.reduce((s, i) => s + Number(i.abc || 0), 0)
              }
              fmtDateTime={fmtDateTime}
              getDueDateVariant={getDueDateVariant}
              onSpecsChange={(newSpecs) => {
                setCompareData((prev) => ({
                  ...prev,
                  specs: newSpecs,
                }));
                updateSpecs(compareData.itemId, newSpecs, "item");
              }}
              onOptionSpecsChange={(optionId, newSpecs) => {
                setCompareData((prev) => ({
                  ...prev,
                  purchaseOptions: prev.purchaseOptions.map((po) =>
                    po.nPurchaseItemId === optionId
                      ? { ...po, specs: newSpecs }
                      : po,
                  ),
                }));
                updateSpecs(optionId, newSpecs);
              }}
            />
          </>
        )}
      </Box>

      <DeleteVerificationModal
        open={entityToDelete !== null}
        entityToDelete={entityToDelete}
        onClose={() => setEntityToDelete(null)}
        onSuccess={() => fetchItems({ restoreScroll: true })}
      />
      <NewItemModal
        open={addingNewItem || editingItem !== null}
        onClose={() => {
          setAddingNewItem(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSuccess={() => fetchItems({ restoreScroll: true })}
        transactionId={transaction?.nTransactionId}
        transactionHasABC={
          !!(transaction?.dTotalABC && Number(transaction.dTotalABC) > 0)
        }
        transactionABC={transaction?.dTotalABC}
        totalItemsABC={items.reduce((s, i) => s + Number(i.abc || 0), 0)}
        clientId={transaction?.client?.nClientId ?? transaction?.nClientId}
      />
      <NewOptionModal
        open={optionModalItemId !== null}
        onClose={() => {
          setOptionModalItemId(null);
          setEditingOption(null);
          setOptionModalItem(null);
        }}
        editingOption={editingOption}
        itemId={optionModalItemId}
        sourceItem={optionModalItem}
        onSuccess={() => fetchItems({ restoreScroll: true })}
        suppliers={suppliers}
        cItemType={cItemType}
        stage={forCanvasKey.includes(selectedStatusCode) ? "canvas" : ""}
      />
      <ExportCanvasModal
        open={isExportCanvasOpen}
        onClose={() => setIsExportCanvasOpen(false)}
        items={items}
        transaction={transaction}
        clientName={transaction?.clientName}
      />
      <TransactionActionModal
        open={Boolean(actionModal)}
        actionType={actionModal}
        transaction={transaction}
        canvasVerificationLabel={canvasVerificationLabel}
        forCanvasLabel={forCanvasLabel}
        finalizeKeyLabel={finalizeKeyLabel}
        onClose={() => setActionModal(null)}
        aostatus={isManagement ? "" : isProcurement ? proc_status : ao_status}
        transacstatus={isManagement ? transacstatus : ""}
        onVerified={handleAfterAction}
        onReverted={handleAfterAction}
        onFinalized={handleAfterAction}
        role={isManagement ? "M" : isProcurement ? "P" : "A"}
      />
      <AssignAOModal
        open={!!assignMode}
        mode={assignMode}
        transaction={transaction}
        accountOfficers={accountOfficers}
        onClose={() => setAssignMode(null)}
        onSuccess={() => navigate(-1)}
      />
      <GetSuggestionsModal
        open={isSuggestionsModalOpen}
        onClose={() => {
          setIsSuggestionsModalOpen(false);
          setSuggestionsItem(null);
        }}
        item={suggestionsItem}
        itemId={suggestionsItem?.id}
        suppliers={suppliers}
        cItemType={cItemType}
        stage={forCanvasKey.includes(selectedStatusCode) ? "canvas" : ""}
        onSuccess={() => fetchItems({ restoreScroll: true })}
      />
      <CostBreakdownModal
        open={isCostBreakdownOpen}
        onClose={() => setIsCostBreakdownOpen(false)}
        transaction={transaction}
        selectedSet={pricingSet}
        items={pricingItems}
        unitSellingPrices={unitSellingPrices}
        clientName={transaction?.clientName}
        taxes={pricingTaxes}
      />
      <StatusModal
        open={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        transaction={transaction}
        transacstatus={transacstatus}
        archiveStatus={archiveStatus ?? {}}
        onSuccess={handleAfterAction}
      />

      <ArchiveModal
        open={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        transaction={transaction}
        transactionId={transaction?.nTransactionId}
        transactionCode={transactionCode}
        mode="unarchive"
        archiveStatus={archiveStatus ?? {}}
        onSuccess={() => {
          setIsArchiveModalOpen(false);
          navigate(-1);
        }}
      />
      <AlertStructure
        open={directCostCheckOpen}
        title="Direct Cost"
        type={existingDirectCosts.length > 0 ? "success" : "warning"}
        headerTitle="Before Finalizing"
        confirmText={
          existingDirectCosts.length > 0
            ? "Edit Direct Costs"
            : "Yes, add Direct Cost"
        }
        cancelLabel="No, proceed to finalize"
        message={
          existingDirectCosts.length > 0 ? (
            <Box>
              <Typography
                sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1 }}
              >
                This transaction has the following direct costs:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  mb: 1,
                }}
              >
                {existingDirectCosts.map((cost, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "6px",
                      backgroundColor: colors.successCardBg,
                      border: `1px solid ${colors.successCardBorder}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: colors.successCardText,
                        fontWeight: 500,
                      }}
                    >
                      {getDirectCostLabel(cost.nDirectCostOptionID)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: colors.successCardText,
                        fontWeight: 700,
                      }}
                    >
                      ₱{" "}
                      {Number(cost.dAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                Would you like to edit them or proceed to finalize?
              </Typography>
            </Box>
          ) : (
            "Does this transaction have direct costs?"
          )
        }
        onConfirm={() => {
          setDirectCostCheckOpen(false);
          setDirectCostModalOpen(true);
        }}
        onCancel={() => {
          setDirectCostCheckOpen(false);
          setActionModal(pendingFinalizeAction);
        }}
        onClose={() => setDirectCostCheckOpen(false)}
      />
      <DirectCostModal
        open={directCostModalOpen}
        onClose={() => {
          setDirectCostModalOpen(false);
          setActionModal(pendingFinalizeAction);
        }}
        transaction={transaction}
        isManagement={isManagement || isAccountOfficer}
        isPricingSetting={forCanvasKey.includes(selectedStatusCode)}
      />
    </PageLayout>
  );
}
