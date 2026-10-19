import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import CustomSearchField from "../../../components/ui/form/SearchField";
import CustomTable from "../../../components/ui/form/Table";
import PageLayout from "../../../components/layouts/page/content-page";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import FormControlFilter from "../../../components/ui/form/FormControlFilter";
import BaseButton from "../../../components/ui/form/BaseButton";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import JevEntriesViewModal from "../jev/modal/JevEntriesViewModal";
import JevConfirmationModal from "../jev/modal/JevConfirmationModal";
import JevStatusUpdateTooltip from "../jev/tooltip/JevStatusUpdateTooltip";
import { NO_TYPE_CODE } from "./useJevList";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { JEV_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import icons from "../../../utils/style/iconFormatStyles";

// Named `makeColors`, not `useColors`, so calling it inside useMemo
// doesn't trip react-hooks/rules-of-hooks.
const makeColors = (c) => ({
  border: c.slate.border,
  blue: { bg: c.blue.bg, text: c.blue.text },
  green: { bg: c.green.bg, text: c.green.text },
  amber: { bg: c.amber.bg, text: c.amber.text },
  red: { bg: c.red.bg, text: c.red.text },
});

// Same pill shape VoucherView uses for its Type / paid badges.
const badgeStyle = (c, colors) => ({
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 500,
  borderRadius: "9999px",
  backgroundColor: c.bg,
  color: c.text,
  border: `1px solid ${colors.border}`,
});

// JEV listing — the type comes from the sidebar (see useJevList).
//   • Row click / View → shared JEV viewer (entries managed there).
//   • Add JEV          → creates a No Type JEV and opens it in the viewer.
//   • Delete           → enabled for Pending / Cancelled, disabled for Active.
export default function JevListView({
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
  // Viewer (also used for create mode)
  closeJevModal,
  jevModal,
  jevModalOpen,
  jevSubTitle,
  jevCreateMode,
  handleJevCreated,
  handleJevInfoSaved,
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

  const columns = useMemo(
    () => [
      { key: "strJEVNumber", label: "JEV No.", align: "center" },
      // The title is a No Type JEV's only name — no voucher, purchase or
      // inventory stands behind it — so it is printed on that list alone.
      ...(isNoTypeList
        ? [
            {
              key: "strTitle",
              label: "Title",
              render: (val) => val || "—",
            },
          ]
        : []),
      {
        key: "totalLabel",
        label: "Amount",
        align: "right",
        render: (val) => `₱${val}`,
      },
      {
        key: "statusLabel",
        label: "Status",
        align: "center",
        render: (val, row) => (
          <span
            style={badgeStyle(statusColors[row.cStatus] ?? colors.blue, colors)}
          >
            {val}
          </span>
        ),
      },
      { key: "dtOccur", label: "Occurred", align: "center" },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => {
          const isDeletable =
            row.cStatus === jevPendingKey || row.cStatus === jevCancelledKey;

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
                tooltip="Delete JEV"
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
      isNoTypeList,
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

      {/* Viewer + create mode. Entry CRUD is enabled only on this page. */}
      <JevEntriesViewModal
        open={jevModalOpen}
        onClose={closeJevModal}
        jev={jevModal}
        subTitle={jevSubTitle}
        entryCrud={{ isManagement, isFinanceOfficer }}
        createMode={jevCreateMode}
        createLinkType={NO_TYPE_CODE}
        onCreated={handleJevCreated}
        onInfoSaved={handleJevInfoSaved}
      />

      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />

      <JevConfirmationModal
        open={!!confirmAction}
        style={confirmAction ? JEV_CONFIRM_STYLES[confirmAction] : null}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
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