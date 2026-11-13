import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";
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
import DirectCostModal from "../transactions/modal/DirectCostModal";
import ArchiveModal from "../archive/modal/ArchiveModal";
import JEVConfirmationModal from "../journal-entry-voucher/modal/JEVConfirmationModal";
import { JEV_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import { withSpinner } from "../../../utils/helpers/swal.jsx";
import TransactionItemsTable from "../canvas/components/TransactionItemsTable";
import PricingPanel from "../pricing/components/PricingPanel";
import AssignAOModal from "../canvas/modal/AssignAOModal";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
import ForPurchasePanel from "../purchase/components/ForPurchasePanel.jsx";
import CollectionPanel from "./components/CollectionPanel.jsx";

const useColors = (c) => ({
  slateBorderLight: c.slate.borderLight,
  slateOuterBg: c.slate.outerBg,
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

/**
 * The "For Collection" workspace — the same screen as PurchaseView, reached
 * when a transaction sits in the For Collection status instead of For
 * Purchase. Everything here is what the collector actually does: read the
 * collectible breakdown, manage the JEV, and mark the transaction collected.
 *
 * The shared data/logic comes from useCollection → useTransactionWorkspace.
 */
export default function CollectionView(props) {
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
    cancelledPOKey,
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
    deliveredOptions,

    removedFromCartKey,
    forCanvasKey,
    forCollectionKey,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    actionModal,
    setActionModal,
    directCostModalOpen,
    setDirectCostModalOpen,
    createJevConfirmOpen,
    setCreateJevConfirmOpen,
    finalizeJevConfirmOpen,
    setFinalizeJevConfirmOpen,
    completeConfirmOpen,
    setCompleteConfirmOpen,
    completeModalOpen,
    setCompleteModalOpen,
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
    setExpandedRows,
    ao_status,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    isProcurement,
    isProcurementTL,
    proc_status,
    assignMode,
    setAssignMode,
    accountOfficers,
    isAssignedToMe,
    hasAssignedAO,
    showReassignAO,

    jev,
    jevLoading,
    creatingJev,
    handleCreateJev,
    jevPendingKey,
    isFinanceOfficer,
    handleToggleJevFinalize,
    jevToggling,
    jevBalance,

    collectionRetention,
    isArchiveView,
  } = props;

  const [unarchiveOpen, setUnarchiveOpen] = useState(false);

  if (!transaction) return null;
  // The collection page always sits at the collection stage — the status is
  // what routed us here — so it drives the layout outright.
  const txnDetailsProps = {
    details: transaction,
    statusTransaction,
    itemType,
    procMode,
    procSourceLabel,
  };

  // ── The footer's Finalize gates — the same trio every finalize path
  // follows (the /jev-update page, the voucher page): the journal must
  // carry a title and its From / To sides must square before it can
  // leave Pending. The workspace hook loads the FULL JEV record
  // (entries included), so its strTitle is on hand for the title gate.
  const isPendingJev =
    jev && String(jev.cStatus) === String(jevPendingKey);
  const jevHasTitle = Boolean(String(jev?.strTitle ?? "").trim());

  return (
    <PageLayout
      title={isArchiveView ? "Transaction Archived" : "Transaction"}
      subtitle={
        isArchiveView
          ? `Transaction Completed (Archived) / ${transactionCode || ""}`
          : `${currentStatusLabel || ""} / ${transactionCode || ""}`
      }
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
              ["purchase", "Purchase"],
              ["collection", "Collection"],
            ].map(([tab, label], i, arr) => (
              <button
                key={tab}
                data-active={activeTab === tab}
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
            isCompareActive
              ? handleBackFromCompare
              : isArchiveView
                ? () => navigate(-1)
                : () => navigate("/transaction")
          }
          actionColor="back"
        />
      }
      footerRActions={
        <>
         {!isCompareActive && isAssignedToMe && (
            <BaseButton
              label="Direct Cost"
              icon={icons.quote}
              onClick={() => setDirectCostModalOpen(true)}
              actionColor="breakdown"
            />
          )}
          {/* Finalize / Undo Finalize sits BEFORE the complete button — an
              active JEV must be undoable right beside "Transaction
              Completed". */}
          {!statusChangedAlert &&
            !isArchiveView &&
            !isCompareActive &&
            jev &&
            (isManagement || isFinanceOfficer) && (
              <BaseButton
                label={isPendingJev ? "Finalize JEV" : "Undo Finalize"}
                icon={isPendingJev ? icons.finalize : icons.revert}
                onClick={() => setFinalizeJevConfirmOpen(true)}
                actionColor={isPendingJev ? "approve" : "delete"}
                disabled={
                  jevToggling ||
                  (isPendingJev &&
                    (jevBalance.loading || !jevHasTitle || !jevBalance.balanced))
                }
                tooltip={
                  isPendingJev
                    ? jevBalance.loading
                      ? "Checking JEV balance…"
                      : !jevHasTitle
                        ? "Title is not yet added."
                        : !jevBalance.balanced
                          ? jevBalance.message ||
                            "JEV totals must be equal before finalizing"
                          : "Finalize this JEV"
                    : ""
                }
              />
            )}
          {!isCompareActive && isAssignedToMe && (
            <>
              {jev && String(jev.cStatus) !== String(jevPendingKey) && (
                <BaseButton
                  label="Transaction Completed"
                  icon={icons.check}
                  onClick={() => setCompleteModalOpen(true)}
                  actionColor="submit"
                />
              )}
            </>
          )}
          {!statusChangedAlert &&
            !isArchiveView &&
            !isCompareActive &&
            (isManagement || isFinanceOfficer) &&
            !jev && (
              <BaseButton
                label={creatingJev ? "Creating..." : "Create JEV"}
                icon={icons.submit}
                onClick={() => setCreateJevConfirmOpen(true)}
                actionColor="approve"
                disabled={creatingJev || jevLoading}
              />
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
          {isArchiveView && isManagement && (
            <BaseButton
              label="Unarchive"
              icon={icons.unarchived}
              onClick={() => setUnarchiveOpen(true)}
              actionColor="revert"
            />
          )}
        </>
      }
      loading={itemsLoading}
    >
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
                showPurchasedBadge={true}
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
                forCollection={true}
                isArchiveView={isArchiveView}
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
                procSource={procSourceLabel}
                statusTransaction={statusTransaction}
                clientNickName={transaction?.clientName || "—"}
                statusChangedAlert={statusChangedAlert}
              />
            )}
            {activeTab === "purchase" && (
              <ForPurchasePanel
                forCollection={false}
                isArchiveView={isArchiveView}
                /* The purchase tab inside the For Collection workspace is a
                   stage reference — never an authoring surface — so the
                   Get Suggestions / + Option buttons are hidden here
                   unconditionally (the genuinely live purchase list lives
                   on the For Purchase page, which doesn't set this). */
                hideOptionActions
                items={items}
                itemsLoading={itemsLoading}
                expandedRows={expandedRows}
                expandedOptions={expandedOptions}
                optionErrors={optionErrors}
                crudItemsEnabled={crudItemsEnabled}
                showPurchaseOptions={showPurchaseOptions}
                purchaseCheckboxOptionsEnabled={purchaseCheckboxOptionsEnabled}
                statusChangedAlert={statusChangedAlert}
                anyItemHasABC={anyItemHasABC}
                isManagement={isManagement}
                isAccountOfficer={isAccountOfficer}
                isFinanceOfficer={isFinanceOfficer}
                isProcurement={isProcurement}
                isProcurementTL={isProcurementTL}
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
                isAssignedToMe={isAssignedToMe}
                isCompareActive={isCompareActive}
                compareData={compareData}
                updateSpecs={updateSpecs}
                onRefreshOptionData={() => fetchItems({ restoreScroll: true })}
              />
            )}
            {activeTab === "collection" && (
              <CollectionPanel {...props} />
            )}
          </>
        )}
      </Box>
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
        // The Add-On rule belongs to the For Canvass / For Purchase
        // stages — at the collection stage the switch is the user's.
        stage="collection"
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
        // The Add-On rule belongs to the For Canvass / For Purchase
        // stages — at the collection stage the switch is the user's.
        stage="collection"
        onSuccess={() => fetchItems({ restoreScroll: true })}
      />
      <DirectCostModal
        open={directCostModalOpen}
        onClose={() => setDirectCostModalOpen(false)}
        transaction={transaction}
        isManagement={isManagement || isAccountOfficer}
        isPricingSetting={true}
      />
      <JEVConfirmationModal
        open={createJevConfirmOpen}
        style={JEV_CONFIRM_STYLES.create_collection_jev}
        loading={creatingJev}
        onConfirm={() => {
          setCreateJevConfirmOpen(false);
          withSpinner("JEV", () => handleCreateJev());
        }}
        onClose={() => setCreateJevConfirmOpen(false)}
      />
      <JEVConfirmationModal
        open={finalizeJevConfirmOpen}
        style={
          String(jev?.cStatus) === String(jevPendingKey)
            ? JEV_CONFIRM_STYLES.finalize_collection_jev
            : JEV_CONFIRM_STYLES.undo_finalize_collection_jev
        }
        loading={jevToggling}
        onConfirm={() => {
          setFinalizeJevConfirmOpen(false);
          withSpinner("JEV", () => handleToggleJevFinalize());
        }}
        onClose={() => setFinalizeJevConfirmOpen(false)}
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
      {unarchiveOpen && (
        <ArchiveModal
          open={unarchiveOpen}
          onClose={() => setUnarchiveOpen(false)}
          transaction={transaction}
          transactionId={transaction?.nTransactionId}
          transactionCode={transactionCode}
          mode="unarchive"
          archiveStatus={archiveStatus}
          onSuccess={() => {
            setUnarchiveOpen(false);
            navigate(-1);
          }}
        />
      )}
      <AssignAOModal
        open={!!assignMode}
        mode={assignMode}
        transaction={transaction}
        accountOfficers={accountOfficers}
        onClose={() => setAssignMode(null)}
        onSuccess={() => window.history.back()}
      />
    </PageLayout>
  );
}
