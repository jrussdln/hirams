import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Alert, useTheme } from "@mui/material";
import { Replay } from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import TransactionDetails from "../transactions/components/TransactionDetails";
import { PurchasePageSkeleton } from "../../../components/ui/loader/Skeleton";
import CompareView from "../canvas/components/CompareView";
import NewOptionModal from "../canvas/modal/NewOptionModal";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import TransactionActionModal from "../transactions/modal/TransactionActionModal";
import GetSuggestionsModal from "../canvas/modal/GetSuggestionsModal";
import UpdateDeliveryInfoModal from "../pricing/modal/UpdateDeliveryInfoModal";
import PrintDeliveryReceiptModal from "../purchase/modal/PrintDeliveryReceiptModal";
import PrintSalesInvoiceModal from "../purchase/modal/PrintSalesInvoiceModal";
import DirectCostModal from "../transactions/modal/DirectCostModal";import ArchiveModal from "../archive/modal/ArchiveModal";
import AlertStructure from "../../../components/ui/structure/AlertStructure";
import TransactionItemsTable from "../canvas/components/TransactionItemsTable";
import PricingPanel from "../pricing/components/PricingPanel";
import AssignAOModal from "../canvas/modal/AssignAOModal";
import AssignProcurementModal from "../pricing-set/modal/AssignProcurementModal";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
import JevViewPanel from "../journal-entry-voucher/components/JEVViewPanel.jsx";
import { MonetizationOnOutlined } from "@mui/icons-material";
import ContentHeaderStructure from "../../../components/ui/structure/ContentHeaderStructure";
import CardStructure from "../../../components/ui/structure/CardStructure";
const useColors = (c) => ({
  slateBorder: c.slate.border,
  slateBorderLight: c.slate.borderLight,
  slateOuterBg: c.slate.outerBg,
  slateInnerBg: c.slate.innerBg,
  grayTextPrimary: c.gray.textPrimary,
  grayTextSecondary: c.gray.textSecondary,
  amber: c.amber,
  blue: c.blue,
});

function StatusChangedBanner({ countdown, colors }) {
  if (!countdown) return null;
  return (
    <Box
      sx={{
        mb: 1.5,
        px: 1.5,
        py: 0.75,
        background: colors.amber.warnBg,
        border: `1px solid ${colors.amber.warnBorder}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Replay sx={{ fontSize: "0.9rem", color: colors.amber.warnText }} />
        <Typography
          sx={{
            fontSize: "0.65rem",
            color: colors.amber.textDark,
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
          border: `2px solid ${colors.amber.warnText}`,
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
            color: colors.amber.warnText,
            lineHeight: 1,
          }}
        >
          {countdown}
        </Typography>
      </Box>
    </Box>
  );
}

export default function PurchaseView(props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const navigate = useNavigate();

  const {
    transaction,
    transactionCode,
    currentStatusLabel,
    statusCode,
    limitedContent,
    activeTab,
    setActiveTab,
    statusChangedAlert,
    countdown,
    items,
    itemsLoading,
    suppliers,
    cItemType,
    expandedRows,
    expandedOptions,
    optionErrors,
    crudItemsEnabled,
    showPurchaseOptions,
    canvasCheckboxOptionsEnabled,
    purchaseCheckboxOptionsEnabled,
    anyItemHasABC,
    isManagement,
    isAccountOfficer,
    currentUserId,
    abcValue,
    abcSub,
    abcValidation,
    totalCanvas,
    totalABC,
    totalPurchaseProgress,
    totalPurchaseBalance,
    totalCollectibleValue,
    forCollection,
    forPurchaseKey,
    deliveredOptions,
    salesInvoiceItems,
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,

    removedFromCartKey,
    forCanvasKey,
    forCollectionKey,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    actionModal,
    setActionModal,
    completeConfirmOpen,
    setCompleteConfirmOpen,
    completeModalOpen,
    setCompleteModalOpen,
    directCostModalOpen,
    setDirectCostModalOpen,
    confirmDrPrint,
    setConfirmDrPrint,
    confirmSiPrint,
    setConfirmSiPrint,
    deliveryModalOpen,
    setDeliveryModalOpen,
    compareData,
    isCompareActive,
    entityToDelete,
    setEntityToDelete,
    suggestionsItem,
    setSuggestionsItem,
    isSuggestionsModalOpen,
    setIsSuggestionsModalOpen,
    editingItem,
    setEditingItem,
    addingNewItem,
    setAddingNewItem,
    editingOption,
    setEditingOption,
    optionModalItemId,
    setOptionModalItemId,
    optionModalItem,
    setOptionModalItem,
    optionStatuses,
    latestHistories,

    fmtPHP,
    fmtDate,
    getDueDateVariant,
    getEffectiveABC,
    fetchItems,
    toggleSpecsRow,
    toggleOptionsRow,
    toggleOptionSpecs,
    handleCollapseAllToggle,
    handleToggleInclude,
    handleAfterAction,
    handleCompareClick,
    handleBackFromCompare,
    updateSpecs,
    scrollRef,
    statusTransaction,
    itemType,
    procMode,
    procSourceLabel,
    archiveStatus,
    transacstatus,
    assignedAOName,
    assignedAONo,
    setExpandedRows,
    ao_status,
    priceSettingKey,
    priceFinalizeVerificationKey,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    isProcurement,
    isProcurementTL,
    procSource,
    isAOTL,
    assignMode,
    setAssignMode,
    accountOfficers,
    isAssignedToMe,
    hasAssignedAO,
    showReassignAO,
    proc_status,
    cancelledPOKey,
    showReassignProcurement,
    assignProcurementModalOpen,
    setAssignProcurementModalOpen,
    procurementUsers,

    jev,
    jevLoading,
    creatingJev,
    showJev,
    setShowJev,
    handleCreateJev,
    jevPendingKey,
    isFinanceOfficer,
    handleToggleJevFinalize,
    jevToggling,
    jevBalance,
  } = props;

  if (!transaction) return null;
  const isJevFinalized = !!jev && String(jev.cStatus) !== String(jevPendingKey);
  const showingJev = !!jev && showJev && !isCompareActive;
  const txnDetailsProps = {
    details: transaction,
    statusTransaction,
    itemType,
    procMode,
    procSourceLabel,
  };

  return (
    <PageLayout
      title="Transaction"
      subtitle={`${currentStatusLabel || ""} / ${transactionCode || ""}`}
      scrollRef={scrollRef}
      headerRight={
        !limitedContent ? (
          <div
            style={{
              display: "flex",
              border: `1px solid ${colors.slateBorderLight}`,
              borderRadius: "8px",
              overflow: "hidden",
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            {[
              ["info", "Details"],
              ["canvas", "Canvas"],
              ["pricing", "Pricing"],
              ["purchase", "For Purchase"],
            ].map(([tab, label], i, arr) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "3px 10px",
                  background:
                    activeTab === tab
                      ? colors.blue.active
                      : colors.slateOuterBg,
                  color:
                    activeTab === tab
                      ? colors.blue.text
                      : colors.grayTextSecondary,
                  border: "none",
                  borderRight:
                    i < arr.length - 1
                      ? `1px solid ${colors.slateBorderLight}`
                      : "none",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null
      }
      footerLActions={
        <BaseButton
          label="Back"
          icon={icons.back}
          onClick={
            showingJev
              ? () => setShowJev(false)
              : isCompareActive
                ? handleBackFromCompare
                : () => navigate("/transaction")
          }
          actionColor="back"
        />
      }
      footerRActions={
        <>
          {forPurchaseKey.includes(statusCode) &&
            !isCompareActive &&
            !statusChangedAlert &&
            /* Delivery details are the PROCUREMENT side of an order —
               the assigned AO, management, and now Proc / Proc TL all
               update them. The DR / SI / collection buttons below stay
               with the assigned AO and management only. */
            (isAssignedToMe || isProcurement || isProcurementTL) && (
              <BaseButton
                label="Delivery Info"
                icon={icons.delivery}
                onClick={() => setDeliveryModalOpen(true)}
                actionColor="info"
              />
            )}

          {/* Direct Cost lives here too — right after Delivery Info. */}
          {(isManagement || isAccountOfficer) && !isCompareActive && (
            <BaseButton
              label="Direct Cost"
              icon={icons.breakdown}
              onClick={() => setDirectCostModalOpen(true)}
              actionColor="breakdown"
            />
          )}

          {forPurchaseKey.includes(statusCode) &&
            !isCompareActive &&
            isAssignedToMe && (
              <>
                {!statusChangedAlert && deliveredOptions.length > 0 && (
                  <BaseButton
                    label="Print DR"
                    icon={icons.print}
                    onClick={() => setConfirmDrPrint(true)}
                    actionColor="save"
                  />
                )}
                {!statusChangedAlert &&
                  salesInvoiceItems.length > 0 &&
                  totalPurchaseProgress === 100 && (
                    <>
                      <BaseButton
                        label="Print SI"
                        icon={icons.print}
                        onClick={() => setConfirmSiPrint(true)}
                        actionColor="edit"
                        disabled={
                          salesInvoiceItems.length === 0 ||
                          totalPurchaseProgress < 100
                        }
                        tooltip={
                          salesInvoiceItems.length === 0
                            ? "No invoiceable items yet"
                            : totalPurchaseProgress < 100
                              ? "All purchase items must be 100% complete before printing the sales invoice"
                              : ""
                        }
                      />
                      <BaseButton
                        label="For Collection"
                        icon={icons.print}
                        onClick={() => setActionModal("for_collection")}
                        actionColor="submit"
                        disabled={
                          statusChangedAlert ||
                          salesInvoiceItems.length === 0 ||
                          totalPurchaseProgress < 100
                        }
                        tooltip={
                          salesInvoiceItems.length === 0
                            ? "No collectible items yet"
                            : totalPurchaseProgress < 100
                              ? "All purchase items must be 100% complete before proceeding to collection"
                              : ""
                        }
                      />
                    </>
                  )}
              </>
            )}
          {!statusChangedAlert && showReassignAO && (
            <BaseButton
              // An AO that is not on the transaction yet is ASSIGNED; one
              // that is already there is REASSIGNED.
              label={hasAssignedAO ? "Reassign AO" : "Assign AO"}
              icon={icons.assign}
              onClick={() =>
                setAssignMode(hasAssignedAO ? "reassign" : "assign")
              }
              actionColor={hasAssignedAO ? "reassign" : "assign"}
            />
          )}
          {!statusChangedAlert &&
            showReassignProcurement &&
            !(totalPurchaseProgress === 100) && (
              <BaseButton
                label="Reassign Procurement"
                icon={icons.assign}
                onClick={() => setAssignProcurementModalOpen(true)}
                actionColor="reassign"
              />
            )}
        </>
      }
      loading={itemsLoading}
    >
      {!showingJev && (
        <Box>
          <StatusChangedBanner countdown={countdown} colors={colors} />
          {limitedContent && <TransactionDetails {...txnDetailsProps} />}
          {!limitedContent && (
            <>
              {activeTab === "info" && (
                <TransactionDetails {...txnDetailsProps} />
              )}
              {activeTab === "canvas" && (
                <TransactionItemsTable
                  mode="canvas"
                  items={items}
                  itemsLoading={itemsLoading}
                  expandedRows={expandedRows}
                  expandedOptions={expandedOptions}
                  optionErrors={optionErrors}
                  crudItemsEnabled={crudItemsEnabled}
                  showAddButton={crudItemsEnabled}
                  showPurchaseOptions={showPurchaseOptions}
                  checkboxOptionsEnabled={canvasCheckboxOptionsEnabled}
                  anyItemHasABC={anyItemHasABC}
                  statusChangedAlert={statusChangedAlert}
                  isManagement={isManagement}
                  isAccountOfficer={isAccountOfficer}
                  suppliers={suppliers}
                  cItemType={cItemType}
                  currentStatusLabel={currentStatusLabel}
                  transaction={transaction}
                  transactionCode={transactionCode}
                  currentUserId={currentUserId}
                  abcValue={abcValue}
                  abcSub={abcSub}
                  abcValidation={abcValidation}
                  totalCanvas={totalCanvas}
                  totalABC={totalABC}
                  totalPurchaseProgress={totalPurchaseProgress}
                  totalPurchaseBalance={totalPurchaseBalance}
                  totalCollectibleValue={totalCollectibleValue}
                  forCanvasKey={forCanvasKey}
                  optionStatuses={optionStatuses}
                  latestHistories={latestHistories}
                  getEffectiveABC={getEffectiveABC}
                  handleCollapseAllToggle={handleCollapseAllToggle}
                  toggleSpecsRow={toggleSpecsRow}
                  toggleOptionsRow={toggleOptionsRow}
                  toggleOptionSpecs={toggleOptionSpecs}
                  handleToggleInclude={handleToggleInclude}
                  setEditingItem={setEditingItem}
                  setAddingNewItem={setAddingNewItem}
                  setEntityToDelete={setEntityToDelete}
                  setSuggestionsItem={setSuggestionsItem}
                  setIsSuggestionsModalOpen={setIsSuggestionsModalOpen}
                  setEditingOption={setEditingOption}
                  setOptionModalItemId={setOptionModalItemId}
                  setOptionModalItem={setOptionModalItem}
                  setExpandedRows={setExpandedRows}
                  getDueDateVariant={getDueDateVariant}
                  forCollection={forCollection}
                  isAssignedToMe={isAssignedToMe}
                  isProcurement={isProcurement}
                  isProcurementTL={isProcurementTL}
                />
              )}
              {activeTab === "pricing" && (
                <PricingPanel
                  transaction={transaction}
                  selectedStatusCode={statusCode}
                  isManagement={isManagement}
                  isProcurementTL={isProcurementTL}
                  transacstatus={transacstatus}
                  forPricingKey={forPricingKey}
                  priceVerificationKey={priceVerificationKey}
                  priceApprovalKey={priceApprovalKey}
                  priceSettingKey={priceSettingKey}
                  priceFinalizeVerificationKey={priceFinalizeVerificationKey}
                  isPricingSetting={false}
                  currentStatusLabel={currentStatusLabel}
                  currentUserId={currentUserId}
                  itemType={itemType}
                  procMode={procMode}
                  procSource={procSource}
                  statusTransaction={statusTransaction}
                  clientNickName={transaction?.clientName || "—"}
                  statusChangedAlert={statusChangedAlert}
                />
              )}
              {activeTab === "purchase" && (
                <>
                  {!isCompareActive && !itemsLoading && abcValidation && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {abcValidation}
                    </Alert>
                  )}
                  {itemsLoading ? (
                    <PurchasePageSkeleton />
                  ) : isCompareActive && compareData ? (
                    <CompareView
                      compareData={compareData}
                      forCanvasKey={forCanvasKey}
                      onSpecsChange={(newSpecs) =>
                        updateSpecs(compareData.itemId, newSpecs, "item")
                      }
                      onOptionSpecsChange={(optionId, newSpecs) =>
                        updateSpecs(optionId, newSpecs)
                      }
                    />
                  ) : (
                    <TransactionItemsTable
                      mode="purchase"
                      items={items}
                      itemsLoading={itemsLoading}
                      expandedRows={expandedRows}
                      expandedOptions={expandedOptions}
                      optionErrors={optionErrors}
                      crudItemsEnabled={crudItemsEnabled}
                      showAddButton={crudItemsEnabled}
                      showPurchaseOptions={showPurchaseOptions}
                      /* PROCUREMENT READS THE TABLE — Proc / Proc TL have
                         no cart actions on the purchase page, so the whole
                         Action column after EWT folds away for them. */
                      checkboxOptionsEnabled={
                        purchaseCheckboxOptionsEnabled &&
                        !(isProcurement || isProcurementTL)
                      }
                      anyItemHasABC={anyItemHasABC}
                      statusChangedAlert={statusChangedAlert}
                      isManagement={isManagement}
                      isAccountOfficer={isAccountOfficer}
                      suppliers={suppliers}
                      cItemType={cItemType}
                      currentStatusLabel={currentStatusLabel}
                      transaction={transaction}
                      transactionCode={transactionCode}
                      currentUserId={currentUserId}
                      abcValue={abcValue}
                      abcSub={abcSub}
                      abcValidation={abcValidation}
                      totalCanvas={totalCanvas}
                      totalABC={totalABC}
                      totalPurchaseProgress={totalPurchaseProgress}
                      totalPurchaseBalance={totalPurchaseBalance}
                      totalCollectibleValue={totalCollectibleValue}
                      cancelledPOKey={cancelledPOKey}
                      forCanvasKey={forCanvasKey}
                      optionStatuses={optionStatuses}
                      latestHistories={latestHistories}
                      getEffectiveABC={getEffectiveABC}
                      handleCollapseAllToggle={handleCollapseAllToggle}
                      toggleSpecsRow={toggleSpecsRow}
                      toggleOptionsRow={toggleOptionsRow}
                      toggleOptionSpecs={toggleOptionSpecs}
                      handleToggleInclude={handleToggleInclude}
                      setEditingItem={setEditingItem}
                      setAddingNewItem={setAddingNewItem}
                      setEntityToDelete={setEntityToDelete}
                      setSuggestionsItem={setSuggestionsItem}
                      setIsSuggestionsModalOpen={setIsSuggestionsModalOpen}
                      setEditingOption={setEditingOption}
                      setOptionModalItemId={setOptionModalItemId}
                      setOptionModalItem={setOptionModalItem}
                      setExpandedRows={setExpandedRows}
                      getDueDateVariant={getDueDateVariant}
                      forCollection={forCollection}
                      isAssignedToMe={isAssignedToMe}
                      isProcurement={isProcurement}
                      isProcurementTL={isProcurementTL}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Box>
      )}

      <DeleteVerificationModal
        open={entityToDelete !== null}
        entityToDelete={entityToDelete}
        onClose={() => setEntityToDelete(null)}
        onSuccess={() => fetchItems({ restoreScroll: true })}
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
        stage={forPurchaseKey.includes(statusCode) ? "purchase" : ""}
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
        onForCollection={handleAfterAction}
        forCollectionKey={forCollectionKey}
        role={isManagement ? "M" : isProcurement ? "P" : "A"}
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
        stage={forPurchaseKey.includes(statusCode) ? "purchase" : ""}
        onSuccess={() => fetchItems({ restoreScroll: true })}
      />
      <UpdateDeliveryInfoModal
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        transaction={transaction}
        /* Proc TL edits on the same gate as Proc — without it the TL
           sees the Delivery Info button but the modal stays read-only. */
        isProcurement={isProcurement || isProcurementTL || isAccountOfficer}
        isManagement={isManagement}
        onSuccess={() => setDeliveryModalOpen(false)}
      />
      <PrintDeliveryReceiptModal
        open={confirmDrPrint}
        onClose={() => setConfirmDrPrint(false)}
        transaction={transaction}
        deliveredOptions={deliveredOptions}
        assignedAOName={assignedAOName}
        assignedAONo={assignedAONo}
        transactionCode={transactionCode}
        currentUserId={currentUserId}
        pendingReceiptKey={pendingReceiptKey}
        deliveredKey={deliveredKey}
        forPaymentKey={forPaymentKey}
        onStatusToggled={() => fetchItems({ restoreScroll: true })}
      />
      <PrintSalesInvoiceModal
        open={confirmSiPrint}
        onClose={() => setConfirmSiPrint(false)}
        transaction={transaction}
        invoiceItems={salesInvoiceItems}
        assignedAOName={assignedAOName}
        assignedAONo={assignedAONo}
        transactionCode={transactionCode}
      />
      <DirectCostModal
        open={directCostModalOpen}
        onClose={() => setDirectCostModalOpen(false)}
        transaction={transaction}
        isManagement={isManagement || isAccountOfficer}
        isPricingSetting={false}
      />
      <AlertStructure
        open={false}
        title="Mark as Collected and Completed"
        type="warning"
        headerTitle="Confirm Completion"
        confirmText="Yes, Mark as Completed"
        cancelLabel="Cancel"
        message={
          <Typography
            sx={{ fontSize: "0.78rem", color: colors.grayTextSecondary }}
          >
            Remember, this action cannot be reverted. Once confirmed, this
            transaction will be moved and stored in the Transaction Archives.
          </Typography>
        }
        onConfirm={() => {
          setCompleteConfirmOpen(false);
          setCompleteModalOpen(true);
        }}
        onCancel={() => setCompleteConfirmOpen(false)}
        onClose={() => setCompleteConfirmOpen(false)}
      />
      <ArchiveModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        transaction={transaction}
        transactionId={transaction?.nTransactionId}
        transactionCode={transactionCode}
        mode="complete"
        archiveStatus={archiveStatus}
        onSuccess={() => {
          setCompleteModalOpen(false);
          handleAfterAction();
        }}
      />
      <AssignAOModal
        open={!!assignMode}
        mode={assignMode}
        transaction={transaction}
        accountOfficers={accountOfficers}
        onClose={() => setAssignMode(null)}
        onSuccess={() => window.history.back()}
      />
      <AssignProcurementModal
        open={assignProcurementModalOpen}
        onClose={() => setAssignProcurementModalOpen(false)}
        transaction={transaction}
        procurementUsers={procurementUsers}
        currentUserId={currentUserId}
        onSuccess={() => setAssignProcurementModalOpen(false)}
      />
    </PageLayout>
  );
}
