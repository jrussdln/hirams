import { useMemo } from "react";
import { Tooltip } from "@mui/material";
import PageLayout from "../../../../../components/layouts/page/content-page";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import JEVUpdatePanel from "../../components/JEVUpdatePanel.jsx";
import JEVConfirmationModal from "../../modal/JEVConfirmationModal.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";
import { JEV_CONFIRM_STYLES } from "../../../../../utils/style/sharedConfirmStyles.jsx";
import useJEVUpdate from "./useJEVUpdate";

// ── /jev-update — the full-page JEV viewer / updater route ───────────────
// A thin shell: the PageLayout (title = the JEV number, subtitle = the
// type in words) plus its Footer buttons — Back (with the unbalanced
// Active → Draft demote check) and Finalize / Undo Finalize for every
// JEV type. Everything between lives in components/JEVUpdatePanel.jsx,
// which any other host can use instead (its hook takes a jevId override).
//
// The finalize gates mirror the voucher's Finalize: the journal must
// carry a title and its From / To sides must square before it can leave
// Draft; Undo works on a finalized (Pending Clearance / Active) journal.
// A Cancelled journal gets no buttons at all — changing it would
// resurrect it.
export default function JEVUpdateView() {
  const {
    loading,
    jev,
    jevId,
    isManagement,
    isFinanceOfficer,
    canManage,
    canFinalize,
    jev_types,
    jev_status,
    jevPendingKey,
    // Collection (C)
    jevCollectionKey,
    isCollectionLinkType,
    isPendingClearanceJev,
    // Voucher
    voucher,
    showParticulars,
    isAssigneeType,
    assigneeLinks,
    supplierLinks,
    voucherNumber,
    supplierNickName,
    supplierAddress,
    supplierTIN,
    // Items
    itemRows,
    itemsTotal,
    sellingPrices,
    isReceivedSide,
    // Collection (C) details
    isCollectionJev,
    collectionTransaction,
    collectibleAmount,
    retentionAmount,
    // Balance
    balance,
    showBalanceBanner,
    dismissBalanceMsg,
    willDemoteOnLeave,
    // Finalize
    isDraftJev,
    isPendingJev,
    isActiveJev,
    isFinalizableStatus,
    jevHasTitle,
    finalizingJev,
    finalizeChoiceOpen,
    setFinalizeChoiceOpen,
    toggleJevFinalize,
    draftStatus,
    pendingClearanceStatus,
    activeStatus,
    // Actions
    goBack,
    openVoucher,
    openTransactionForPurchase,
    openInventoryRowTransaction,
  } = useJEVUpdate();

  // Footer + the layout's own loading
  // The layout's `loading` (footer skeleton + a pointer-events lock over
  // the content) stays off: with no entry form of our own there is no
  // user action the layout blocks on. Data loading is shown as a plain,
  // non-blocking stage note instead (inside the panel).
  const uiLoading = false;

  // ── Footer ──────────────────────────────────────────────────────────
  // The way back to the list.
  const footerLActions = (
    <BaseButton
      icon={icons.back}
      label="Back"
      size="small"
      actionColor="back"
      onClick={goBack}
    />
  );

  // ── Footer right — Finalize / Undo Finalize (every JEV type) ────────
  // Same gates as the voucher's Finalize: the journal must carry a title
  // and its From / To sides must square before it can leave Draft;
  // Undo works on a finalized (Pending Clearance or Active) journal
  // regardless. A Cancelled journal gets no buttons at all.
  //
  // Collection (C) JEVs finalize in one of two states, so their Finalize
  // opens the choice dialog: Pending Clearance (R) or Cleared (A).
  // Every other type keeps the direct Draft -> Active button.
  const footerRActions = (() => {
    if (!jev || !canFinalize || !isFinalizableStatus) return null;

    const finalizeNeeds =
      balance.loading
        ? "Checking JEV balance…"
        : !jevHasTitle
          ? "Title is not yet added."
          : !balance.balanced
            ? balance.message || "JEV totals must be equal before finalizing"
            : isCollectionLinkType
              ? "Choose Pending Clearance or Cleared"
              : "Finalize this JEV";

    const finalizeBlocked =
      finalizingJev || balance.loading || !jevHasTitle || !balance.balanced;

    const finalizeButton = (
      <Tooltip title={finalizeNeeds} arrow>
        <span>
          <BaseButton
            label={finalizingJev ? "Finalizing…" : "Finalize"}
            icon={icons.finalize}
            onClick={() => {
              if (isCollectionLinkType) {
                // Ask whether the collection is cleared or still awaiting
                // clearance before writing either R or A.
                setFinalizeChoiceOpen(true);
              } else {
                toggleJevFinalize(activeStatus);
              }
            }}
            actionColor="approve"
            disabled={finalizeBlocked}
          />
        </span>
      </Tooltip>
    );

    const markClearedButton = (
      <Tooltip
        title={
          balance.loading
            ? "Checking JEV balance…"
            : !balance.balanced
              ? balance.message || "JEV totals must be equal before clearing"
              : "Mark this JEV as Cleared (Active)"
        }
        arrow
      >
        <span>
          <BaseButton
            label={finalizingJev ? "Updating…" : "Mark Cleared"}
            icon={icons.check}
            onClick={() => toggleJevFinalize(activeStatus)}
            actionColor="submit"
            disabled={finalizeBlocked}
          />
        </span>
      </Tooltip>
    );

    const undoButton = (
      <Tooltip title="Undo Finalize this JEV" arrow>
        <span>
          <BaseButton
            label={finalizingJev ? "Updating…" : "Undo Finalize"}
            icon={icons.revert}
            onClick={() => toggleJevFinalize(draftStatus)}
            actionColor="delete"
            disabled={finalizingJev}
          />
        </span>
      </Tooltip>
    );

    // Pending Clearance is already finalized: it can be undone or marked
    // Cleared. Active only needs the undo. Draft starts the flow.
    if (isPendingClearanceJev) {
      return (
        <>
          {undoButton}
          {markClearedButton}
        </>
      );
    }
    if (isActiveJev) return undoButton;
    if (isDraftJev) return finalizeButton;
    return null;
  })();

  const jevTypeLabel = useMemo(() => {
    const label = jev_types?.[jev?.cJEVLinkType] ?? "";
    if (isCollectionLinkType && isPendingClearanceJev) {
      return `${label} / Pending Clearance`;
    }
    return label;
  }, [jev, jev_types, isCollectionLinkType, isPendingClearanceJev]);

  return (
    <PageLayout
      title={jev?.strJEVNumber || "Journal Entry Voucher"}
      subtitle={jevTypeLabel}
      footerLActions={footerLActions}
      footerRActions={footerRActions}
      loading={uiLoading}
    >
      <JEVUpdatePanel
        // The hook's state — page-level loading (JEV + voucher + inventory).
        loading={loading}
        jev={jev}
        // The skeleton gate needs the id before the JEV itself has landed.
        jevId={jevId}
        jev_types={jev_types}
        jev_status={jev_status}
        jevPendingKey={jevPendingKey}
        // Roles — entry CRUD (Management / Finance Officer) and the blue
        // navigation links (DV code, brand · model).
        canManage={canManage}
        isManagement={isManagement}
        isFinanceOfficer={isFinanceOfficer}
        canNavigate={isFinanceOfficer || isManagement}
        // Voucher particulars (V / C types).
        showParticulars={showParticulars}
        isAssigneeType={isAssigneeType}
        assigneeLinks={assigneeLinks}
        supplierLinks={supplierLinks}
        voucher={voucher}
        voucherNumber={voucherNumber}
        supplierNickName={supplierNickName}
        supplierAddress={supplierAddress}
        supplierTIN={supplierTIN}
        // Items (R / D types).
        itemRows={itemRows}
        itemsTotal={itemsTotal}
        sellingPrices={sellingPrices}
        isReceivedSide={isReceivedSide}
        // Collection (C) JEV — the receipt block above the journal.
        isCollectionJev={isCollectionJev}
        collectionTransaction={collectionTransaction}
        collectibleAmount={collectibleAmount}
        retentionAmount={retentionAmount}
        // Balance banner state.
        balance={balance}
        showBalanceBanner={showBalanceBanner}
        dismissBalanceMsg={dismissBalanceMsg}
        willDemoteOnLeave={willDemoteOnLeave}
        // Finalize state — entry controls are withheld once the JEV left
        // Draft.
        isPendingJev={isPendingJev}
        // Navigations.
        openVoucher={openVoucher}
        openTransactionForPurchase={openTransactionForPurchase}
        openInventoryRowTransaction={openInventoryRowTransaction}
      />

      {/* Collection finalize choice — Pending Clearance (R) or Cleared (A).
          Both are finalized states; only Cleared puts the collection on the
          books (A is what the ledger / fund balances read). */}
      <JEVConfirmationModal
        open={finalizeChoiceOpen}
        style={JEV_CONFIRM_STYLES.finalize_collection_choice}
        badge={jev?.strJEVNumber}
        loading={finalizingJev}
        onConfirm={() => {
          // Close on click; the spinner covers the pending work.
          setFinalizeChoiceOpen(false);
          toggleJevFinalize(activeStatus);
        }}
        onSecondary={() => {
          setFinalizeChoiceOpen(false);
          toggleJevFinalize(pendingClearanceStatus);
        }}
        onClose={() => {
          if (!finalizingJev) setFinalizeChoiceOpen(false);
        }}
      />
    </PageLayout>
  );
}
