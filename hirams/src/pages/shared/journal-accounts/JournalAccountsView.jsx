import { useCallback, useState } from "react";
import { Tooltip } from "@mui/material";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import icons from "../../../utils/style/iconFormatStyles";
import JournalAccountPanel from "./components/JournalAccountPanel";
import LedgerPanel from "./components/LedgerPanel";
import LedgerFilterModal from "./modal/LedgerFilterModal";
import JEVUpdatePanel from "../journal-entry-voucher/components/JEVUpdatePanel.jsx";
import useJEVUpdate from "../journal-entry-voucher/sub-pages/jev-update/useJEVUpdate.js";

/* ─── View ──────────────────────────────────────────────────────────── */
// Page chrome only: holds the title and footer, and swaps the body between
// THREE panels — the chart (JournalAccountPanel), the account's Ledger,
// and the JEV itself (JEVUpdatePanel). Clicking "Ledger" on an account row
// asks the hook for a date range (LedgerFilterModal) — only Apply opens
// LedgerPanel for that account. Clicking a JEV number inside the ledger
// does NOT leave the page: the ledger hides itself and JEVUpdatePanel
// takes its place (fed by useJEVUpdate with that JEV's id), and the
// footer's Back goes one step back up this local stack:
//
//   Chart → Ledger → JEV update  (Back jumps one level each time)
//
// Everything not listed below is forwarded straight to JournalAccountPanel
// (search, tree, drag & drop, AEModal / delete / flash-import state…).
export default function JournalAccountsView({
  // ── owned by LedgerPanel ──
  reportOpen,
  reportTarget,
  reportFilterOpen,
  reportDateRange,
  setReportFilterOpen,
  openReport,
  closeReport,
  journalAccounts,
  jevEntries,
  jevTypeOptions,
  jevActiveKey,
  jevReceivedPurchasesKey,
  isManagement,
  isFinanceOfficer,
  // ── owned by JournalAccountPanel ──
  ...panelProps
}) {
  const showReport = !!reportOpen && !!reportTarget;
  // The filter modal only makes sense with a row already picked.
  const filterOpen = !!reportFilterOpen && !!reportTarget;

  // The report's header date chip reuses this same modal, so the window can be
  // changed while the report is on screen (reportTarget is still set here —
  // only Back/clearReport drops it).
  const editRange = () => setReportFilterOpen(true);

  // ── Third view: the JEV opened from the ledger's entry tables ────────
  // The id lives in THIS component's state (NOT the URL): leaving the JEV
  // simply nulls it and LedgerPanel comes back. The updater's hook is
  // driven by the id override — it lazily fetches the JEV, its voucher
  // and its inventory only while an id is set, so having it mounted every
  // render costs nothing.
  const [jevUpdateId, setJevUpdateId] = useState(null);
  const showJevUpdate = jevUpdateId != null && String(jevUpdateId) !== "";

  const {
    loading: loadingJevUpdate,
    jev: jevUpdate,
    jevId: jevUpdateHookId,
    canManage: jevUpdateCanManage,
    jev_types: jevUpdateTypes,
    jev_status: jevUpdateStatus,
    jevPendingKey: jevUpdatePendingKey,
    showParticulars,
    isAssigneeType,
    assigneeLinks,
    supplierLinks,
    voucherNumber,
    voucher,
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
    demoteIfUnbalanced,
    isPendingJev,
    jevHasTitle,
    finalizingJev,
    toggleJevFinalize,
  } = useJEVUpdate({ jevId: jevUpdateId });

  // JEV number click inside the ledger — open the updater IN PLACE.
  const openJevInPlace = useCallback(
    (nJEVId) => {
      if (nJEVId == null) return;
      setJevUpdateId(String(nJEVId));
    },
    [],
  );

  // Back — the local stack drops exactly one view. Leaving the JEV runs
  // the same unbalanced-Active → Pending demote the full page does BEFORE
  // the ledger comes back.
  const handleBack = useCallback(async () => {
    if (showJevUpdate) {
      await demoteIfUnbalanced?.();
      setJevUpdateId(null);
      return;
    }
    closeReport();
  }, [showJevUpdate, demoteIfUnbalanced, closeReport]);

  // The list itself needs no footer; the ledger and the JEV have a Back.
  const footerLActions = showReport ? (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={handleBack}
      actionColor="back"
    />
  ) : null;

  // ── Footer right — Finalize on the embedded JEV ─────────────────────
  // Same gates the /jev-update page uses: a title + square From/To sides
  // before a Pending journal may leave it. NO Undo Finalize here — once
  // the journal left Pending it is done from this screen's point of view.
  const footerRActions = (() => {
    if (!showJevUpdate || !jevUpdate || !jevUpdateCanManage || !isPendingJev)
      return null;

    const finalizeNeeds = balance.loading
      ? "Checking JEV balance…"
      : !jevHasTitle
        ? "Title is not yet added."
        : !balance.balanced
          ? balance.message || "JEV totals must be equal before finalizing"
          : "Finalize this JEV";

    return (
      <Tooltip title={finalizeNeeds} arrow>
        <span>
          <BaseButton
            label={finalizingJev ? "Finalizing…" : "Finalize"}
            icon={icons.finalize}
            onClick={toggleJevFinalize}
            actionColor="approve"
            disabled={
              finalizingJev ||
              balance.loading ||
              !jevHasTitle ||
              !balance.balanced
            }
          />
        </span>
      </Tooltip>
    );
  })();

  return (
    // REPLACE the PageLayout title/subtitle props
    <PageLayout
      // One title for the whole page; the subtitle walks the local stack —
      // "Ledger / <account> / <JEV No.>" while a JEV is open.
      title="Journal Accounts"
      subtitle={
        showJevUpdate
          ? `Ledger / ${reportTarget?.accountName ?? ""} / ${
              jevUpdate?.strJEVNumber ?? "JEV"
            }`
          : showReport
            ? `Ledger / ${reportTarget?.accountName ?? ""}`
            : "Chart of journal accounts"
      }
      footerLActions={footerLActions}
      footerRActions={footerRActions}
    >
      {/* Date filter shown before the report opens */}
      <LedgerFilterModal
        open={filterOpen}
        onClose={() => setReportFilterOpen(false)}
        value={reportDateRange}
        onApply={openReport}
      />

      {showJevUpdate ? (
        /* The updater content — same component the /jev-update page
           shows, fed by the hook driven by this view's own state. */
        <JEVUpdatePanel
          loading={loadingJevUpdate}
          jev={jevUpdate}
          jevId={jevUpdateHookId}
          jev_types={jevUpdateTypes}
          jev_status={jevUpdateStatus}
          jevPendingKey={jevUpdatePendingKey}
          canManage={jevUpdateCanManage}
          canNavigate={isFinanceOfficer || isManagement}
          isManagement={isManagement}
          isFinanceOfficer={isFinanceOfficer}
          showParticulars={showParticulars}
          isAssigneeType={isAssigneeType}
          assigneeLinks={assigneeLinks}
          supplierLinks={supplierLinks}
          voucher={voucher}
          voucherNumber={voucherNumber}
          supplierNickName={supplierNickName}
          supplierAddress={supplierAddress}
          supplierTIN={supplierTIN}
          itemRows={itemRows}
          itemsTotal={itemsTotal}
          sellingPrices={sellingPrices}
          isReceivedSide={isReceivedSide}
          balance={balance}
          showBalanceBanner={showBalanceBanner}
          dismissBalanceMsg={dismissBalanceMsg}
          willDemoteOnLeave={willDemoteOnLeave}
          isPendingJev={isPendingJev}
          openVoucher={undefined}
          openTransactionForPurchase={undefined}
          openInventoryRowTransaction={undefined}
        />
      ) : showReport ? (
        <LedgerPanel
          account={reportTarget}
          allAccounts={journalAccounts}
          jevEntries={jevEntries}
          jevTypeOptions={jevTypeOptions}
          jevActiveKey={jevActiveKey}
          jevReceivedPurchasesKey={jevReceivedPurchasesKey}
          dateRange={reportDateRange}
          onEditRange={editRange}
          isManagement={isManagement}
          isFinanceOfficer={isFinanceOfficer}
          // A JEV number click swaps the ledger for the updater panel
          // right here instead of leaving the page.
          onOpenJevPage={openJevInPlace}
        />
      ) : (
        <JournalAccountPanel
          {...panelProps}
          /* The view's destructuring ate these out of panelProps — without
             them the panel's canMaintain gate can never see finance, and
             the Add / Edit / Delete / drag actions stay visible. */
          isManagement={isManagement}
          isFinanceOfficer={isFinanceOfficer}
          jevEntries={jevEntries}
          jevActiveKey={jevActiveKey}
        />
      )}
    </PageLayout>
  );
}
