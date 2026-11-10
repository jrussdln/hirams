import React from "react";
import { Alert } from "@mui/material";
import { PurchasePageSkeleton } from "../../../../components/ui/loader/Skeleton";
import CompareView from "../../canvas/components/CompareView";
import TransactionItemsTable from "../../canvas/components/TransactionItemsTable";

/**
 * For Purchase View — the content of the "For Purchase" tab.
 *
 * Extracted from PurchaseView so it can be dropped into the pricing and
 * pricing-set pages (and any other place that needs the same purchase-side
 * table) without dragging the whole PurchaseView shell along.
 *
 * Pass the same props the PurchaseView destructures for the purchase tab —
 * the component reads them straight through and renders the table, the ABC
 * validation alert, and the compare view exactly as the original tab did.
 */
export default function ForPurchasePanel({
  // items / loading
  items,
  itemsLoading,
  expandedRows,
  expandedOptions,
  optionErrors,
  crudItemsEnabled,
  showPurchaseOptions,
  purchaseCheckboxOptionsEnabled,
  isArchiveView,
  /* Set by the For Collection workspace — its purchase tab shows the
     table at the collection stage, so the option buttons must not
     print there either (it's a stage reference, not a live purchase
     list). */
  hideOptionActions = false,
  anyItemHasABC,
  statusChangedAlert,
  // roles
  isManagement,
  isAccountOfficer,
  isFinanceOfficer,
  isProcurement,
  isProcurementTL,
  // transaction
  suppliers,
  cItemType,
  currentStatusLabel,
  transaction,
  transactionCode,
  currentUserId,
  abcValue,
  abcSub,
  abcValidation,
  totalCanvas,
  totalABC,
  totalPurchaseProgress,
  totalPurchaseBalance,
  totalCollectibleValue,
  cancelledPOKey,
  forCanvasKey,
  optionStatuses,
  latestHistories,
  getEffectiveABC,
  handleCollapseAllToggle,
  toggleSpecsRow,
  toggleOptionsRow,
  toggleOptionSpecs,
  handleToggleInclude,
  setEditingItem,
  setAddingNewItem,
  setEntityToDelete,
  setSuggestionsItem,
  setIsSuggestionsModalOpen,
  setEditingOption,
  setOptionModalItemId,
  setOptionModalItem,
  setExpandedRows,
  getDueDateVariant,
  forCollection,
  isAssignedToMe,
  // compare
  isCompareActive,
  compareData,
  updateSpecs,
  // refresh
  onRefreshOptionData,
}) {
  return (
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
             Action column after EWT folds away for them.
             FINANCE READS IT TOO — the column folds away and
             the checkboxes render disabled (still visible). */
          checkboxOptionsEnabled={
            purchaseCheckboxOptionsEnabled &&
            !(isProcurement || isProcurementTL) &&
            !isFinanceOfficer
          }
          isFinanceOfficer={isFinanceOfficer}
          isArchiveView={isArchiveView}
          hideOptionActions={hideOptionActions}
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
          onRefreshOptionData={onRefreshOptionData}
          showPurchaseOptionActionColumn
        />
      )}
    </>
  );
}