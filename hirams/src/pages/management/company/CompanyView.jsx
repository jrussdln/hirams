import React from "react";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import CompanyAEModal from "./modal/CompanyAEModal";
import TransferCompanyModal from "./modal/TransferCompanyModal";
import DeleteVerificationModal from "../../shared/transactions/modal/DeleteVerificationModal";
import { Add, Edit, Delete, Phone, Email, DriveFileMoveOutlined } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";
import {
  NO_NAME,
  NO_NICKNAME,
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
  NO_TAX_VAT,
  NO_TAX_EWT,
  NO_PHONE,
  NO_EMAIL,
} from "../../../constants/tableDataFallbacks";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — only tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  activeBg: c.green.bg,
  activeText: c.green.textDark,
  inactiveBg: c.red.bg,
  inactiveText: c.red.textDark,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
});

export default function CompanyView({
  search,
  setSearch,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
  openModal,
  selectedCompany,
  companies,
  loading,
  openDeleteModal,
  setOpenDeleteModal, // ✅ ADDED
  entityToDelete,
  setEntityToDelete, // ✅ ADDED
  fetchCompanies,
  handleAddClick,
  handleEditClick,
  handleDeleteClick,
  handleDeleteSuccess,
  openTransferModal,
  handleTransferClick,
  handleCloseTransferModal,
  handleTransferLinks,
  handleModalClose,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const columns = React.useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        xs: 3,
        render: (_, row) => {
          const hasName = Boolean(row.name?.trim());
          const hasNickname = Boolean(row.nickname?.trim());
          const transactionCount = Number(row.transactionsCount ?? 0);
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
                {/* What still names this company — the same counts that
                    decide whether Delete or Transfer is offered. */}
                {transactionCount > 0 && (
                  <span className="truncate text-[0.5625rem] font-light italic leading-tight text-gray-500 dark:text-gray-400 -mt-0.5">
                    · {transactionCount} transaction
                    {transactionCount === 1 ? "" : "s"}
                  </span>
                )}
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
        key: "phone",
        label: "Contact",
        xs: 2,
        render: (_, row) => (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <Phone sx={{ fontSize: 12, color: colors.textPrimary }} />
              <span
                className="text-xs font-light italic leading-tight"
                style={{ color: colors.textPrimary }}
              >
                {row.phone?.trim() ? row.phone : NO_PHONE}
              </span>
            </div>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <Email sx={{ fontSize: 12, color: colors.textSecondary }} />
              <span
                className="text-xs font-light italic leading-tight"
                style={{ color: colors.textSecondary }}
              >
                {row.email?.trim() ? row.email : NO_EMAIL}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "tax",
        label: "TAX",
        align: "center",
        xs: 2,
        render: (_, row) => (
          <div className="flex items-center justify-center gap-1.5">
            <span
              style={{
                padding: "0.125rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                lineHeight: 1.25,
                borderRadius: "9999px",
                background: row.vatActive ? colors.activeBg : colors.inactiveBg,
                color: row.vatActive ? colors.activeText : colors.inactiveText,
              }}
            >
              {row.vat?.trim() ? row.vat : NO_TAX_VAT}
            </span>
            <span>-</span>
            <span
              style={{
                padding: "0.125rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                lineHeight: 1.25,
                borderRadius: "9999px",
                background: row.ewtActive ? colors.activeBg : colors.inactiveBg,
                color: row.ewtActive ? colors.activeText : colors.inactiveText,
              }}
            >
              {row.ewt?.trim() ? row.ewt : NO_TAX_EWT}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        xs: 1,
        render: (_, row) => {
          const transactionCount = Number(row.transactionsCount ?? 0);
          const voucherCount = Number(row.vouchersCount ?? 0);
          const hasLinks = transactionCount + voucherCount > 0;

          const linkParts = [];
          if (transactionCount > 0) {
            linkParts.push(
              `${transactionCount} transaction${transactionCount === 1 ? "" : "s"}`,
            );
          }
          if (voucherCount > 0) {
            linkParts.push(`${voucherCount} voucher${voucherCount === 1 ? "" : "s"}`);
          }

          return (
            <div className="flex gap-1 justify-center">
              <BaseButton
                icon={<Edit fontSize="small" />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(row);
                }}
                actionColor="edit"
                size="small"
                tooltip="Edit Company"
              />
              {hasLinks ? (
                // A company that still carries transactions or vouchers
                // cannot be deleted — they would be left pointing at
                // nothing. Transfer moves them to another company instead.
                <BaseButton
                  icon={<DriveFileMoveOutlined fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTransferClick(row);
                  }}
                  actionColor="reassign"
                  size="small"
                  tooltip={`Transfer Records (${linkParts.join(", ")})`}
                />
              ) : (
                <BaseButton
                  icon={<Delete fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(row);
                  }}
                  actionColor="delete"
                  size="small"
                  tooltip="Delete Company"
                />
              )}
            </div>
          );
        },
      },
    ],
    [colors, handleEditClick, handleDeleteClick, handleTransferClick],
  );

  return (
    <PageLayout
      title={"Companies"}
      subtitle={"Browse and manage all company profiles"}
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Company"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchCompanies} />
        <BaseButton
          label="Company"
          tooltip="Add Company"
          icon={<Add />}
          onClick={handleAddClick}
          actionColor="approve"
        />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={companies}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          onRowClick={handleEditClick}
        />
      </section>

      <CompanyAEModal
        open={openModal}
        handleClose={handleModalClose}
        company={selectedCompany}
        onCompanySubmitted={fetchCompanies}
      />

      {/* ✅ DELETE MODAL — NOW ACTUALLY CLOSES + CLEARS STATE */}
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false); // ✅ Close modal
          setEntityToDelete(null); // ✅ Clear selected data
        }}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />

      {/* Transfer — the stand-in for Delete on a company that still
          carries transactions or vouchers. */}
      <TransferCompanyModal
        open={openTransferModal}
        handleClose={handleCloseTransferModal}
        company={selectedCompany}
        onTransfer={handleTransferLinks}
      />
    </PageLayout>
  );
}
