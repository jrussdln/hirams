import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import icons from "../../../utils/style/iconFormatStyles";
import JournalAccountPanel from "./components/JournalAccountPanel";
import AccountReportPanel from "./components/AccountReportPanel";
import AccountReportiFilterModal from "./modal/AccountReportiFilterModal";

/* ─── View ──────────────────────────────────────────────────────────── */
// Page chrome only: holds the title and footer, and swaps the body between
// the two panels. Clicking "View report" on an account row asks the hook
// for a date range (AccountReportiFilterModal) — only Apply opens
// AccountReportPanel for that account; the footer's "Back" button returns
// to the list.
//
// Everything not listed below is forwarded straight to JournalAccountPanel
// (search, tree, drag & drop, AEModal / delete / flash-import state…).
export default function JournalAccountsView({
  // ── owned by AccountReportPanel ──
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

  // The list itself needs no footer; only the report has somewhere to go back
  // from, so the bar (and its Back button) appears with it.
  const footerLActions = showReport ? (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={closeReport}
      actionColor="back"
    />
  ) : null;

  return (
    // REPLACE the PageLayout title/subtitle props
    <PageLayout
      title="Journal Accounts"
      subtitle={
        showReport
          ? `Report / ${reportTarget?.accountName ?? ""}`
          : "Chart of journal accounts"
      }
      footerLActions={footerLActions}
    >
      {/* Date filter shown before the report opens */}
      <AccountReportiFilterModal
        open={filterOpen}
        onClose={() => setReportFilterOpen(false)}
        value={reportDateRange}
        onApply={openReport}
      />

      {showReport ? (
        <AccountReportPanel
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
        />
      ) : (
        <JournalAccountPanel
          {...panelProps}
          jevEntries={jevEntries}
          jevActiveKey={jevActiveKey}
        />
      )}
    </PageLayout>
  );
}
