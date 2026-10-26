import React from "react";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import AssigneeAEModal from "./modal/AssigneeAEModal";
import InfoAssigneeModal from "./modal/InfoAssigneeModal";
import RecordConnectionModal from "./modal/RecordConnectionModal";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import {
  Add,
  Edit,
  Delete,
  PersonOff,
  PersonAdd,
  HowToReg,
  DriveFileMoveOutlined,
} from "@mui/icons-material";
import {
  NO_NAME,
  NO_NICKNAME,
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
} from "../../../constants/tableDataFallbacks";

export default function AssigneeView({
  search,
  setSearch,
  page,
  rowsPerPage,
  openAEModal,
  openInfoModal,
  openDeleteModal,
  openTransferModal,
  selectedAssignee,
  entityToDelete,
  assignees,
  loading,
  selectedStatusCode,
  statuses,
  activeStatusKey,
  inactiveStatusKey,
  forApprovalStatusKey,
  activeStatusLabel,
  inactiveStatusLabel,
  forApprovalStatusLabel,
  refreshAssignees,
  handleAddClick,
  handleEditClick,
  handleInfoClick,
  handleDeleteClick,
  handleCloseAEModal,
  handleCloseInfoModal,
  handleCloseDeleteModal,
  handleTransferClick,
  handleCloseTransferModal,
  handleTransferVouchers,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  handleSetActive,
  handleSetInactive,
  handleApprove,
}) {
  const columns = React.useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        xs: 3,
        render: (_, row) => {
          const hasName = Boolean(row.name?.trim());
          const hasNickname = Boolean(row.nickname?.trim());
          const voucherCount = Number(row.vouchersCount ?? 0);

          return (
            <div className="min-w-0 text-left">
              {hasName ? (
                <span className="block text-xs font-medium leading-tight">
                  {row.name}
                </span>
              ) : (
                <span className="block text-xs font-light italic leading-tight">
                  {NO_NAME}
                </span>
              )}
              <span className="flex items-center gap-1 min-w-0">
                <span className="block text-xs font-light italic leading-tight -mt-0.5 truncate">
                  {hasNickname ? row.nickname : NO_NICKNAME}
                </span>
                {/* How many vouchers still name this assignee — the same
                    count that decides whether Delete or Transfer is offered. */}
                {voucherCount > 0 && (
                  <span className="truncate text-[0.5625rem] font-light italic leading-tight text-gray-500 dark:text-gray-400 -mt-0.5">
                    · {voucherCount} voucher{voucherCount === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </div>
          );
        },
      },
      {
        key: "address",
        label: "Address/TIN",
        xs: 2,
        render: (_, row) => {
          const hasAddress = Boolean(row.address?.trim());
          const hasTin = Boolean(row.tin?.trim());

          if (!hasAddress && !hasTin) {
            return (
              <span className="block text-xs font-light italic leading-tight">
                {NO_ADDRESS_TIN}
              </span>
            );
          }

          return (
            <div className="min-w-0 text-left">
              {hasAddress ? (
                <span className="block text-xs font-medium leading-tight">
                  {row.address}
                </span>
              ) : (
                <span className="block text-xs font-light italic leading-tight">
                  {NO_ADDRESS}
                </span>
              )}
              <span className="block text-xs font-light italic leading-tight -mt-0.5">
                TIN: {hasTin ? row.tin : NO_TIN}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        xs: 1,
        render: (_, row) => {
          const isActive = row.statusCode === activeStatusKey;
          const isInactive = row.statusCode === inactiveStatusKey;
          const isPending = row.statusCode === forApprovalStatusKey;
          return (
            <div className="flex justify-center gap-1">
              {isActive && (
                <BaseButton
                  icon={<Edit fontSize="small" />}
                  tooltip="Edit Assignee"
                  actionColor="edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(row);
                  }}
                />
              )}
              {isActive && (
                <BaseButton
                  icon={<PersonOff fontSize="small" />}
                  tooltip="Deactivate Assignee"
                  actionColor="deactivate"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoClick(row);
                  }}
                />
              )}
              {isInactive && (
                <BaseButton
                  icon={<PersonAdd fontSize="small" />}
                  tooltip="Activate Assignee"
                  actionColor="revert"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoClick(row);
                  }}
                />
              )}
              {row.vouchersCount > 0 && (
                // An assignee that still carries vouchers cannot be deleted
                // — the voucher lines would be left pointing at nothing.
                // Transfer moves them to another assignee instead.
                <BaseButton
                  icon={<DriveFileMoveOutlined fontSize="small" />}
                  tooltip={`Transfer Vouchers (${row.vouchersCount})`}
                  actionColor="reassign"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTransferClick(row);
                  }}
                />
              )}
              {isInactive && !row.vouchersCount && (
                <BaseButton
                  icon={<Delete fontSize="small" />}
                  tooltip="Delete Assignee"
                  actionColor="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(row);
                  }}
                />
              )}
              {isPending && (
                <BaseButton
                  icon={<HowToReg fontSize="small" />}
                  tooltip="Approve Assignee"
                  actionColor="approve"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoClick(row);
                  }}
                />
              )}
            </div>
          );
        },
      },
    ],
    [
      activeStatusKey,
      inactiveStatusKey,
      forApprovalStatusKey,
      handleEditClick,
      handleInfoClick,
      handleDeleteClick,
      handleTransferClick,
    ],
  );

  return (
    <PageLayout
      title="Assignees"
      subtitle={
        selectedStatusCode && statuses[selectedStatusCode]
          ? `${statuses[selectedStatusCode]}`
          : ""
      }
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Assignee"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={refreshAssignees} />
        <BaseButton
          label="Assignee"
          tooltip="Add Assignee"
          icon={<Add fontSize="small" />}
          onClick={handleAddClick}
          actionColor="approve"
          variant="contained"
        />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={assignees}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleRowClick}
        />
      </section>

      <AssigneeAEModal
        open={openAEModal}
        handleClose={handleCloseAEModal}
        assignee={selectedAssignee}
        activeStatusKey={activeStatusKey}
        onAssigneeSaved={refreshAssignees}
      />
      <InfoAssigneeModal
        open={openInfoModal}
        handleClose={handleCloseInfoModal}
        assigneeData={selectedAssignee}
        onActive={handleSetActive}
        onInactive={handleSetInactive}
        onApprove={handleApprove}
        activeStatusKey={activeStatusKey}
        inactiveStatusKey={inactiveStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        activeStatusLabel={activeStatusLabel}
        inactiveStatusLabel={inactiveStatusLabel}
        forApprovalStatusLabel={forApprovalStatusLabel}
      />
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={refreshAssignees}
      />
      <RecordConnectionModal
        open={openTransferModal}
        handleClose={handleCloseTransferModal}
        assignee={selectedAssignee}
        activeStatusKey={activeStatusKey}
        onTransfer={handleTransferVouchers}
      />
    </PageLayout>
  );
}
