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
import { NO_TYPE_CODE } from "./useJournalEntryVoucher";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { JEV_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import icons from "../../../utils/style/iconFormatStyles";
import { NO_JEV_NO } from "../../../constants/tableDataFallbacks";

// Named `makeColors`, not `useColors`, so calling it inside useMemo
// doesn't trip react-hooks/rules-of-hooks.
const makeColors = (c) => ({
  border: c.slate.border,
  blue: { bg: c.blue.bg, text: c.blue.text },
  green: { bg: c.green.bg, text: c.green.text },
  amber: { bg: c.amber.bg, text: c.amber.text },
  red: { bg: c.red.bg, text: c.red.text },
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
//   • Delete           → enabled for Pending / Cancelled, disabled for Active.
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
  statusFilter,
  handleStatusFilterChange,
  jevActiveKey,
  jevPendingKey,
  jevCancelledKey,
  tableRows,
  fetchJevs,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  openJevModal,
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
  createJevOpen,
  createTitle,
  createDate,
  setCreateTitle,
  setCreateDate,
  createTitleError,
  createDateError,
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
      [jevActiveKey]: colors.green,
      [jevPendingKey]: colors.amber,
      [jevCancelledKey]: colors.red,
    }),
    [colors, jevActiveKey, jevPendingKey, jevCancelledKey],
  );

  // Active / Cancelled / Pending — straight from the jev_status mapping.
  const statusOptions = useMemo(
    () =>
      Object.entries(jev_status || {}).map(([value, label]) => ({
        value,
        label,
      })),
    [jev_status],
  );

  // Add belongs to the No Type list alone — every other type is written by
  // the voucher, purchase or inventory flow that owns it — and only for the
  // roles that may write here at all.
  const canManage = Boolean(isManagement || isFinanceOfficer);
  const isNoTypeList = String(selectedTypeCode) === NO_TYPE_CODE;
  const showAddJev = canManage && isNoTypeList;
  const isAllStatus = statusFilter === "all";

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
                  {hasNumber ? row.strJEVNumber : NO_JEV_NO}
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
              {/* No stored title yet — say so explicitly instead of
                  collapsing the line entirely. */}
              <span className="block truncate italic tracking-wide text-[0.8125rem] font-medium leading-tight -mt-0.5">
                {title || "Title is not yet added."}
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
        render: (val) => `₱${val}`,
      },
      { key: "dtOccur", label: "Created", align: "right" },
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
      handleRowClick,
      setStatusTarget,
      setStatusAnchorEl,
      handleDeleteClick,
      jevPendingKey,
      jevCancelledKey,
    ],
  );

  return (
    <PageLayout
      title="Journal Entry Voucher"
      subtitle={
        selectedTypeCode && jev_types?.[selectedTypeCode]
          ? jev_types[selectedTypeCode]
          : ""
      }
      footer={false}
    >
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
            onClick={() => setConfirmAction("create_jev")}
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

      {/* Status — any of A / P / C. Self-sufficient: it dispatches
          jev_data_updated on save, which the hook's listener turns into
          a refetch, and closes itself through onClose. Anchored to the
          button that opened it (statusAnchorEl), not centered. */}
      <JevStatusUpdateTooltip
        open={!!statusTarget}
        anchorEl={statusAnchorEl}
        jev={statusTarget?._raw ?? statusTarget}
        jevStatus={jev_status}
        onClose={() => {
          setStatusTarget(null);
          setStatusAnchorEl(null);
        }}
      />
    </PageLayout>
  );
}
