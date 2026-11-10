// pages/shared/collection/components/CollectionPanel.jsx
//
// The Collection TAB's content — the items table at the collection stage
// (or the compare drill-down) plus the ABC note. Standalone so any other
// host (e.g. a header tab) can mount it: give it the same workspace bag a
// For Collection view uses — `<CollectionPanel {...props} />`.
import { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import CompareView from "../../canvas/components/CompareView";
import TransactionItemsTable from "../../canvas/components/TransactionItemsTable";
import { PurchasePageSkeleton } from "../../../../components/ui/loader/Skeleton";
import getThemeColors from "../../../../utils/style/getThemeColors";

const useColors = (c) => ({
  grayTextSecondary: c.gray.textSecondary,
});

export default function CollectionPanel({
  items,
  itemsLoading,
  expandedRows,
  expandedOptions,
  optionErrors,
  crudItemsEnabled,
  showPurchaseOptions,
  statusChangedAlert,
  anyItemHasABC,
  isManagement,
  isAccountOfficer,
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
  collectionRetention,
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
  isAssignedToMe,
  isProcurement,
  isProcurementTL,
  isCompareActive,
  compareData,
  updateSpecs,
  jev,
  jevPendingKey,
  jevBalance,
  isFinanceOfficer,
}) {
  const theme = useTheme();
  const base = useMemo(
    () => getThemeColors(theme.palette.mode === "dark"),
    [theme],
  );
  const colors = useMemo(() => useColors(base), [base]);

  if (!transaction) return null;

  return (
    <Box>
      {!isCompareActive && !itemsLoading && abcValidation && (
        <Typography
          sx={{
            mb: 2,
            fontSize: "0.78rem",
            color: colors.grayTextSecondary,
          }}
        >
          {abcValidation}
        </Typography>
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
          collectionRetention={collectionRetention}
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
          forCollection={true}
          isAssignedToMe={isAssignedToMe}
          isProcurement={isProcurement}
          isProcurementTL={isProcurementTL}
          showPurchaseOptionActionColumn
          jev={jev}
          jevPendingKey={jevPendingKey}
          jevBalance={jevBalance}
          isFinanceOfficer={isFinanceOfficer}
          /* CollectionPanel only ever renders inside the For Collection
             workspace — live or archived — so option authoring never
             applies: the buttons are hidden unconditionally. */
          hideOptionActions
        />
      )}
    </Box>
  );
}
