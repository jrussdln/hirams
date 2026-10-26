import { Tooltip } from "@mui/material";
import PageLayout from "../../../../../components/layouts/page/content-page";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import JEVUpdatePanel from "../../components/JEVUpdatePanel.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";
import useJEVUpdate from "./useJEVUpdate";

// ── /jev-update — the full-page JEV viewer / updater route ───────────────
// A thin shell: the PageLayout (title = the JEV number, subtitle = the
// type in words) plus its Footer buttons — Back (with the unbalanced
// Active → Pending demote check) and Finalize / Undo Finalize for every
// JEV type. Everything between lives in components/JEVUpdatePanel.jsx,
// which any other host can use instead (its hook takes a jevId override).
//
// The finalize gates mirror the voucher's Finalize: the journal must
// carry a title and its From / To sides must square before it can leave
// Pending; Undo works on an Active journal. A Cancelled journal gets no
// buttons at all — toggling it would resurrect it to Pending.
export default function JEVUpdateView() {
  const {
    loading,
    jev,
    jevId,
    jevTypeLabel,
    isManagement,
    isFinanceOfficer,
    canManage,
    jev_types,
    jev_status,
    jevPendingKey,
    voucher,
    showParticulars,
    isAssigneeType,
    assigneeLinks,
    supplierLinks,
    voucherNumber,
    supplierNickName,
    supplierAddress,
    supplierTIN,
    itemRows,
    itemsTotal,
    sellingPrices,
    isReceivedSide,
    balance,
    showBalanceBanner,
    dismissBalanceMsg,
    willDemoteOnLeave,
    isPendingJev,
    isFinalizableStatus,
    jevHasTitle,
    finalizingJev,
    toggleJevFinalize,
    goBack,
    openVoucher,
    openTransactionForPurchase,
    openInventoryRowTransaction,
  } = useJEVUpdate();

  // ── Footer + the layout's own loading ────────────────────────────────
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
  // and its From / To sides must square before it can leave Pending;
  // Undo works on an Active journal regardless. A Cancelled journal gets
  // no buttons at all.
  const footerRActions = (() => {
    if (!jev || !canManage || !isFinalizableStatus) return null;

    const finalizeNeeds =
      balance.loading
        ? "Checking JEV balance…"
        : !jevHasTitle
          ? "Title is not yet added."
          : !balance.balanced
            ? balance.message || "JEV totals must be equal before finalizing"
            : "Finalize this JEV";

    return (
      <Tooltip title={isPendingJev ? finalizeNeeds : "Undo Finalize this JEV"} arrow>
        <span>
          <BaseButton
            label={
              finalizingJev
                ? "Finalizing…"
                : isPendingJev
                  ? "Finalize"
                  : "Undo Finalize"
            }
            icon={isPendingJev ? icons.finalize : icons.revert}
            onClick={toggleJevFinalize}
            actionColor={isPendingJev ? "approve" : "delete"}
            disabled={
              finalizingJev ||
              (isPendingJev &&
                (balance.loading || !jevHasTitle || !balance.balanced))
            }
          />
        </span>
      </Tooltip>
    );
  })();

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
        // Balance banner state.
        balance={balance}
        showBalanceBanner={showBalanceBanner}
        dismissBalanceMsg={dismissBalanceMsg}
        willDemoteOnLeave={willDemoteOnLeave}
        // Finalize state — entry controls are withheld once the JEV left
        // Pending.
        isPendingJev={isPendingJev}
        // Navigations.
        openVoucher={openVoucher}
        openTransactionForPurchase={openTransactionForPurchase}
        openInventoryRowTransaction={openInventoryRowTransaction}
      />
    </PageLayout>
  );
}
