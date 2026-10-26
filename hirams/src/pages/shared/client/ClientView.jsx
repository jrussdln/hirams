import React from "react";
import { useTheme } from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  HowToReg,
  PersonOff,
  PersonAdd,
  DriveFileMoveOutlined,
} from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import BaseButton from "../../../components/ui/form/BaseButton";
import ClientAEModal from "./modal/ClientAEModal";
import InfoClientModal from "./modal/InfoClientModal";
import RecordConnectionModal from "./modal/RecordConnectionModal";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import getThemeColors from "../../../utils/style/getThemeColors";
import {
  NO_NAME,
  NO_NICKNAME,
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
  NO_CONTACT_PERSON,
  NO_CONTACT_NUMBER,
} from "../../../constants/tableDataFallbacks";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  pageBg: c.slate.outerBg,
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  shadowColor: c.shadow.hairline,
  rounded: "0.5rem",
});

export default function ClientView({
  search,
  setSearch,
  page,
  rowsPerPage,
  selectedClient,
  openAEModal,
  openInfoModal,
  openDeleteModal,
  openTransferModal,
  entityToDelete,
  clients,
  loading,
  selectedStatusCode,
  clientstatus,
  isManagement,
  activeStatusKey,
  inactiveStatusKey,
  forApprovalStatusKey,
  activeStatusLabel,
  inactiveStatusLabel,
  forApprovalStatusLabel,
  fetchClients,
  handleAddClick,
  handleEditClick,
  handleInfoClick,
  handleDeleteClick,
  handleCloseAEModal,
  handleCloseInfoModal,
  handleCloseDeleteModal,
  handleTransferClick,
  handleCloseTransferModal,
  handleTransferTransactions,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  handleApproveOrActivate,
  handleDeactivate,
  handleRedirect,
}) {
  // ✅ Standardized color wiring
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const columns = React.useMemo(() => {
    const baseCols = [
      {
        key: "name",
        label: "Name",
        xs: 2,
        render: (_, row) => {
          const hasName = Boolean(row.name?.trim());
          const hasNickname = Boolean(row.nickname?.trim());
          const transactionCount = Number(row.transactionsCount ?? 0);

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
                {/* How many transactions still name this client — the same
                    count that decides whether Delete or Transfer is offered. */}
                {transactionCount > 0 && (
                  <span className="truncate text-[0.5625rem] font-light italic leading-tight text-gray-500 dark:text-gray-400 -mt-0.5">
                    · {transactionCount} transaction
                    {transactionCount === 1 ? "" : "s"}
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
        key: "contactPerson",
        label: "Contact Person",
        align: "left",
        render: (_, row) => {
          const hasContactPerson = Boolean(row.contactPerson?.trim());
          const hasContactNumber = Boolean(row.contactNumber?.trim());

          if (!hasContactPerson && !hasContactNumber) {
            return (
              <span className="block text-xs font-light italic leading-tight">
                {NO_CONTACT_PERSON}
              </span>
            );
          }

          return (
            <div className="min-w-0 text-left">
              {hasContactPerson ? (
                <span className="block text-xs font-medium leading-tight">
                  {row.contactPerson}
                </span>
              ) : (
                <span className="block text-xs font-light italic leading-tight">
                  {NO_CONTACT_PERSON}
                </span>
              )}
              <span className="block text-xs font-light italic leading-tight -mt-0.5">
                {hasContactNumber ? row.contactNumber : NO_CONTACT_NUMBER}
              </span>
            </div>
          );
        },
      },
    ];

    const actionsColumn = {
      key: "actions",
      label: "Actions",
      align: "center",
      xs: 1,
      render: (_, row) => {
        const isActive = row.statusCode === activeStatusKey;
        const isPending = row.statusCode === forApprovalStatusKey;
        const isInactive = row.statusCode === inactiveStatusKey;

        return (
          <div className="flex gap-1 justify-center">
            <BaseButton
              icon={<Edit fontSize="small" />}
              tooltip="Edit Client"
              actionColor="edit"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(row);
              }}
            />
            {isManagement && (
              <>
                {isPending && (
                  <BaseButton
                    icon={<HowToReg fontSize="small" />}
                    tooltip="Approve Client"
                    actionColor="approve"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInfoClick(row);
                    }}
                  />
                )}
                {isActive && (
                  <BaseButton
                    icon={<PersonOff fontSize="small" />}
                    tooltip="Deactivate Client"
                    actionColor="deactivate"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInfoClick(row);
                    }}
                  />
                )}
                {isInactive && (
                  <BaseButton
                    icon={<PersonAdd fontSize="small" />}
                    tooltip="Activate Client"
                    actionColor="revert"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInfoClick(row);
                    }}
                  />
                )}
                {row.transactionsCount > 0 && (
                  // A client that still carries transactions cannot be
                  // deleted — the transactions would be left pointing at
                  // nothing. Transfer moves them to another client instead.
                  <BaseButton
                    icon={<DriveFileMoveOutlined fontSize="small" />}
                    tooltip={`Transfer Transactions (${row.transactionsCount})`}
                    actionColor="reassign"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransferClick(row);
                    }}
                  />
                )}
                {!isActive && !row.transactionsCount && (
                  <BaseButton
                    icon={<Delete fontSize="small" />}
                    tooltip="Delete Client"
                    actionColor="delete"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(row);
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      },
    };

    return [...baseCols, actionsColumn];
  }, [
    isManagement,
    activeStatusKey,
    forApprovalStatusKey,
    inactiveStatusKey,
    handleEditClick,
    handleInfoClick,
    handleDeleteClick,
    handleTransferClick,
  ]);

  return (
    <PageLayout
      title="Clients"
      subtitle={
        selectedStatusCode && clientstatus[selectedStatusCode]
          ? `${clientstatus[selectedStatusCode]}`
          : ""
      }
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Client"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchClients} />
        <BaseButton
          label="Add Client"
          icon={<Add />}
          onClick={handleAddClick}
          actionColor="approve"
          variant="contained"
          size="medium"
        />
      </section>

      {/* ✅ Hardcoded bg-white → theme token */}
      <section
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 1px 2px ${colors.shadowColor}`,
          borderRadius: colors.rounded,
          overflow: "hidden",
        }}
      >
        <CustomTable
          columns={columns}
          rows={clients}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleRowClick}
        />
      </section>

      <ClientAEModal
        open={openAEModal}
        handleClose={handleCloseAEModal}
        clientData={selectedClient}
        onClientSaved={fetchClients}
        activeStatusKey={activeStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        isManagement={isManagement}
      />
      <InfoClientModal
        open={openInfoModal}
        handleClose={handleCloseInfoModal}
        clientData={selectedClient}
        onApprove={handleApproveOrActivate}
        onActive={handleApproveOrActivate}
        onInactive={handleDeactivate}
        onRedirect={handleRedirect}
        activeStatusKey={activeStatusKey}
        inactiveStatusKey={inactiveStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        activeStatusLabel={activeStatusLabel}
        inactiveStatusLabel={inactiveStatusLabel}
        forApprovalStatusLabel={forApprovalStatusLabel}
        isManagement={isManagement}
      />
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={fetchClients}
      />
      <RecordConnectionModal
        open={openTransferModal}
        handleClose={handleCloseTransferModal}
        client={selectedClient}
        onTransfer={handleTransferTransactions}
      />
    </PageLayout>
  );
}
