import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import CustomSearchField from "../../../components/ui/form/SearchField";
import CustomTable from "../../../components/ui/form/Table";
import PageLayout from "../../../components/layouts/page/content-page";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import FormControlFilter from "../../../components/ui/form/FormControlFilter";
import BaseButton from "../../../components/ui/form/BaseButton";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import JEVConfirmationModal from "./modal/JEVConfirmationModal";
import JEVAEModal from "./modal/JEVAEModal";
import JevStatusUpdateTooltip from "./tooltip/JevStatusUpdateTooltip";
import PendingClearancePanel from "./components/PendingClearancePanel";
import { NO_TYPE_CODE } from "./useJournalEntryVoucher";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { JEV_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import icons from "../../../utils/style/iconFormatStyles";
import { DEFAULT_FALLBACK } from "../../../constants/tableDataFallbacks";
import { Box, Tooltip } from "@mui/material";
import PersonIcon from "@mui/icons-material/PersonOutline";
import EventIcon from "@mui/icons-material/Event";

// ── Created-column helper — mirrors TransactionView's Account Officer style
// Tiny icons stand in for the row labels ("BY:", the date) — the full value
// rides in the tooltip and the shared grid keeps rows aligned down the column.
const OFFICER_GRID_CLASS =
  "grid w-fit max-w-full min-w-0 grid-cols-[auto_minmax(0,9.5rem)] items-baseline gap-x-1";

const LabelIcon = (props) => {
  const { icon: Icon, title, className = "" } = props;
  return (
    <Tooltip title={title} arrow placement="top">
      <span
        className={`inline-flex items-center justify-center text-gray-500 dark:text-gray-400 ${className}`}
        style={{ lineHeight: 0 }}
      >
        <Icon sx={{ fontSize: "0.7rem" }} />
      </span>
    </Tooltip>
  );
};

// Named `makeColors`, not `useColors`, so calling it inside useMemo
// doesn't trip react-hooks/rules-of-hooks.
const makeColors = (c) => ({
  border: c.slate.border,
  blue: { bg: c.blue.bg, text: c.blue.text },
  green: { bg: c.green.bg, text: c.green.text },
  amber: { bg: c.amber.bg, text: c.amber.text },
  red: { bg: c.red.bg, text: c.red.text, solid: c.red.danger },
  onFill: c.gray.textOnFill,
});

// Inline status pill — sits beside the JEV number, so it is scaled down to
// fit. Same shape VoucherView uses for its inline Type badge.
const inlineBadgeStyle = (c, colors) => ({
  padding: "1px 4px",
  fontSize: "8px",
  fontWeight: 500,
  lineHeight: 1.3,
  textTransform: "uppercase",
  borderRadius: "9999px",
  backgroundColor: c.bg,
  color: c.text,
  border: `1px solid ${colors.border}`,
});

// JEV listing — the type comes from the sidebar (see useJournalEntryVoucher).
//   • Row click / View → shared JEV viewer (entries managed there).
//   • Add JEV          → creates a No Type JEV and opens it in the viewer.
//   • Delete           → enabled for Draft / Cancelled, disabled once the
//                        JEV is finalized (Pending Clearance / Active).
export default function JournalEntryVoucherView({
  // Listing
  itemsLoading,
  search,
  setSearch,
  page,
  rowsPerPage,
  selectedTypeCode,
  jev_types,
  jev_status,
  jev_status_common,
  statusFilter,
  handleStatusFilterChange,
  jevActiveKey,
  jevPendingClearanceKey,
  jevPendingKey,
  jevCancelledKey,
  jevPendingClearanceLabel,
  isCollectionType,
  isPendingClearanceView,
  pendingClearanceCount,
  toggleCollectionPendingClearance,
  tableRows,
  fetchJevs,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  // Roles
  isManagement,
  isFinanceOfficer,
  // Delete
  openDeleteModal,
  entityToDelete,
  handleDeleteClick,
  handleCloseDeleteModal,
  handleDeleteSuccess,
  // Status
  statusTarget,
  setStatusTarget,
  statusAnchorEl,
  setStatusAnchorEl,
  // Confirmation - create_jev
  confirmAction,
  setConfirmAction,
  handleConfirmAction,
  // Add JEV — the naming modal opened by the confirmation dialog
  openAddJev,
  createJevOpen,
  createTitle,
  createDate,
  setCreateTitle,
  setCreateDate,
  createTitleError,
  createDateError,
  setCreateTitleError,
  setCreateDateError,
  createTitleRef,
  handleCreateJev,
  handleCloseCreateJev,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => makeColors(base), [base]);

  const statusColors = useMemo(
    () => ({
      [jevPendingKey]: colors.amber,
      [jevPendingClearanceKey]: colors.blue,
      [jevActiveKey]: colors.green,
      [jevCancelledKey]: colors.red,
    }),
    [
      colors,
      jevPendingKey,
      jevPendingClearanceKey,
      jevActiveKey,
      jevCancelledKey,
    ],
  );

  // Draft → Active → Cancelled. Pending Clearance is accessed via the
  // Collection footer button, not the status filter.
  const statusOptions = useMemo(() => {
    const order = {
      [jevPendingKey]: 0,
      [jevActiveKey]: 2,
      [jevCancelledKey]: 3,
    };
    return Object.entries(jev_status_common || jev_status || {})
      .filter(([value]) => String(value) !== String(jevPendingClearanceKey))
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => (order[a.value] ?? 9) - (order[b.value] ?? 9));
  }, [
    jev_status_common,
    jev_status,
    jevPendingKey,
    jevActiveKey,
    jevCancelledKey,
    jevPendingClearanceKey,
  ]);

  // Add belongs to the No Type list alone — every other type is written by
  // the voucher, purchase or inventory flow that owns it — and only for the
  // roles that may write here at all.
  const canManage = Boolean(isManagement || isFinanceOfficer);
  const isNoTypeList = String(selectedTypeCode) === NO_TYPE_CODE;
  const showAddJev = canManage && isNoTypeList;
  const isAllStatus = !isPendingClearanceView && statusFilter === "all";
  const selectedTypeLabel =
    selectedTypeCode && jev_types?.[selectedTypeCode]
      ? jev_types[selectedTypeCode]
      : "";
  const pageSubtitle = isPendingClearanceView
    ? `${selectedTypeLabel} / ${jevPendingClearanceLabel || "Pending Clearance"}`
    : selectedTypeLabel;

  const columns = useMemo(
    () => [
      // The name lines under the number: the row's primary line is the
      // JEV's own strTitle (every link type carries one now), and the
      // counterparty the API derives for the type — the supplier nickname
      // for Received, the client for Delivered, the voucher's payee for
      // DV and Collection — rides underneath it.
      {
        key: "strJEVNumber",
        label: "JEV",
        xs: 2,
        render: (_, row) => {
          const hasNumber = Boolean(row.strJEVNumber?.trim());
          const title = row.strTitle?.trim();
          // A No Type JEV's derived name IS its own title — printing both
          // would show the same words twice.
          const counterparty =
            row.cJEVLinkType === NO_TYPE_CODE ? "" : (row.strPayee?.trim() ?? "");
          const hasCounterparty = Boolean(counterparty);
          const statusColor = statusColors[row.cStatus] ?? colors.blue;

          return (
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[0.625rem] font-medium uppercase tracking-wide leading-tight text-gray-500 dark:text-gray-400">
                  {hasNumber ? row.strJEVNumber : DEFAULT_FALLBACK}
                </span>
                {/* Every row shares one status once a status filter is
                    active, so the badge only shows unfiltered. */}
                {isAllStatus && (
                  <span
                    className="shrink-0"
                    style={inlineBadgeStyle(statusColor, colors)}
                  >
                    {row.statusLabel}
                  </span>
                )}
              </div>
              <span className="block truncate tracking-wide text-[0.8125rem] font-medium leading-tight -mt-0.5">
                {title || "—"}
              </span>
              {hasCounterparty && (
                <span className="block truncate uppercase text-[0.625rem] font-medium tracking-wide leading-tight text-gray-500 dark:text-gray-400">
                  {counterparty}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "totalLabel",
        label: "Amount",
        align: "right",
        render: (val) => val,
      },
      {
        key: "dtOccur",
        label: "Created",
        align: "right",
        render: (_, row) => {
          // Same icon-label grid style as TransactionView's Account Officer
          // column: tiny label icons, uppercase small values, ONE shared
          // grid so rows line up down the column. Missing nicknames
          // (pre-existing rows) read the shared dash.
          const hasName = Boolean(row.strCreatedByName?.trim());
          const hasDate = Boolean(row.dtOccur);
          const lineClass =
            "truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight";
          const valueClass = "text-left truncate";

          if (!hasName && !hasDate) {
            return (
              <span
                className="text-xs font-light"
                style={{ color: colors.textMuted }}
              >
                {DEFAULT_FALLBACK}
              </span>
            );
          }

          return (
            <div className="flex min-w-0 justify-end">
              <div className={`${OFFICER_GRID_CLASS} ${lineClass}`}>
                <LabelIcon icon={PersonIcon} title="Created by" />
                <span className={valueClass}>
                  {hasName ? row.strCreatedByName : DEFAULT_FALLBACK}
                </span>
                <LabelIcon icon={EventIcon} title="Created at" className="-mt-0.5" />
                <span className={`${valueClass} -mt-0.5`}>
                  {hasDate ? row.dtOccur : DEFAULT_FALLBACK}
                </span>
              </div>
            </div>
          );
        },
        title: (row) => row.dtOccur,
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => {
          const isDeletable =
            (row.cStatus === jevPendingKey || row.cStatus === jevCancelledKey) &&
            row.bDeletable !== false;

          return (
            <div className="flex justify-center gap-0">
              <BaseButton
                icon={icons.view}
                tooltip="View JEV"
                size="small"
                actionColor="view"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(row);
                }}
              />
              {/* Pending Clearance is managed from the Collection footer
                  button, so the status switcher is not offered here. */}
              {!isPendingClearanceView && (
                <BaseButton
                  icon={icons.statusChange}
                  tooltip="Change Status"
                  size="small"
                  actionColor="reassign"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusTarget(row);
                    // Anchors the status panel to this exact button — a
                    // tooltip opens where you clicked, not mid-screen.
                    setStatusAnchorEl(e.currentTarget);
                  }}
                />
              )}
              <BaseButton
                icon={icons.delete}
                // A disabled Delete says WHY it is disabled: the API
                // sends the reason back with the row.
                tooltip={isDeletable ? "Delete JEV" : row.strDeleteBlockReason || "Delete JEV"}
                size="small"
                actionColor="delete"
                disabled={!isDeletable}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDeletable) handleDeleteClick(row);
                }}
              />
            </div>
          );
        },
      },
    ],
    [
      colors,
      statusColors,
      isAllStatus,
      isPendingClearanceView,
      handleRowClick,
      setStatusTarget,
      setStatusAnchorEl,
      handleDeleteClick,
      jevPendingKey,
      jevCancelledKey,
    ],
  );

  const collectionFooter = !isCollectionType ? null : isPendingClearanceView ? (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <BaseButton
        label="Back"
        icon={icons.back}
        actionColor="back"
        tooltip="Back to all Collection statuses"
        onClick={toggleCollectionPendingClearance}
      />
    </div>
  ) : (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <BaseButton
          label="Pending Clearance"
          icon={icons.filter}
          actionColor="view"
          tooltip="Show Pending Clearance Collection JEVs only"
          onClick={toggleCollectionPendingClearance}
        />
        {pendingClearanceCount > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              px: 0.4,
              borderRadius: "9px",
              background: colors.red.solid,
              color: colors.onFill,
              border: `1px solid ${colors.border}`,
              fontSize: "0.6rem",
              fontWeight: 700,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {pendingClearanceCount}
          </Box>
        )}
      </Box>
    </div>
  );

  return (
    <PageLayout
      title="Journal Entry Voucher"
      subtitle={pageSubtitle}
      footer={collectionFooter ?? false}
    >
      {isPendingClearanceView ? (
        <PendingClearancePanel
          search={search}
          onSearchChange={setSearch}
          onSync={() => fetchJevs()}
          columns={columns}
          rows={tableRows}
          page={page}
          loading={itemsLoading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleRowClick}
        />
      ) : (
        <>
          <section className="flex items-center gap-2 mb-3">
            <div className="flex-grow">
              <CustomSearchField
                label={
                  isNoTypeList
                    ? "Search JEV No. / Title / Payee / Company"
                    : "Search JEV No. / Payee / Company"
                }
                value={search}
                onChange={setSearch}
              />
            </div>
            <SyncMenu onSync={() => fetchJevs()} />
            <FormControlFilter
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={statusOptions}
              allLabel="All Status"
            />
            {showAddJev && (
              <BaseButton
                label="Add JEV"
                icon={icons.add}
                actionColor="add"
                tooltip="Add a No Type JEV"
                onClick={openAddJev}
              />
            )}
          </section>

          <section>
            <CustomTable
              columns={columns}
              rows={tableRows}
              page={page}
              loading={itemsLoading}
              rowsPerPage={rowsPerPage}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              onRowClick={handleRowClick}
            />
          </section>
        </>
      )}

      {/* Viewers open the full-page /jev-update now — no modal here. */}

      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />

      <JEVConfirmationModal
        open={!!confirmAction}
        style={confirmAction ? JEV_CONFIRM_STYLES[confirmAction] : null}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />

      {/* Add JEV — the naming card (Title already focused). Save creates
          the No Type JEV with that title + today's date and opens it on
          /jev-update?id=…; Close discards without creating anything. */}
      <JEVAEModal
        open={createJevOpen}
        titleValue={createTitle}
        dateValue={createDate}
        onTitleChange={(e) => {
          setCreateTitle(e.target.value);
          if (createTitleError) setCreateTitleError("");
        }}
        onDateChange={(e) => {
          setCreateDate(e.target.value);
          if (createDateError) setCreateDateError("");
        }}
        titleError={createTitleError}
        dateError={createDateError}
        titleInputRef={createTitleRef}
        onSave={handleCreateJev}
        onClose={handleCloseCreateJev}
      />

      {/* Status — common statuses for all JEVs; Pending Clearance is
          Collection-only. Self-sufficient: it dispatches jev_data_updated on
          save, which the hook's listener turns into a refetch, and closes
          itself through onClose. Anchored to the button that opened it. */}
      <JevStatusUpdateTooltip
        open={!!statusTarget}
        anchorEl={statusAnchorEl}
        jev={statusTarget?._raw ?? statusTarget}
        // Common statuses only — Pending Clearance is Collection-only and is
        // managed from the footer button, so it never appears here.
        jevStatus={jev_status_common}
        onClose={() => {
          setStatusTarget(null);
          setStatusAnchorEl(null);
        }}
      />
    </PageLayout>
  );
}
