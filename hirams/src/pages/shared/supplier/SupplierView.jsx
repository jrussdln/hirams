import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Contacts,
  AccountBalance,
  HowToReg,
  PersonOff,
  PersonAdd,
} from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import SupplierAEModal from "./modal/SupplierAEModal";
import ContactModal from "./modal/ContactModal";
import BankModal from "./modal/BankModal";
import InfoSupplierModal from "./modal/InfoSupplierModal";
import DeleteVerificationModal from "../transactions/modal/DeleteVerificationModal";
import getThemeColors from "../../../utils/style/getThemeColors";
import {
  NO_NAME,
  NO_NICKNAME,
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
  NO_TAX_VAT,
  NO_TAX_EWT,
} from "../../../constants/tableDataFallbacks";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  activeBg: c.green.bg,
  activeText: c.green.textDark,
  inactiveBg: c.red.bg,
  inactiveText: c.red.textDark,
});

export default function SupplierView({
  search,
  setSearch,
  page,
  rowsPerPage,
  openModal,
  openContactModal,
  openBankModal,
  openInfoModal,
  openDeleteModal,
  selectedSupplier,
  entityToDelete,
  suppliers,
  loading,
  selectedStatusCode,
  clientstatus,
  activeStatusKey,
  inactiveStatusKey,
  forApprovalStatusKey,
  activeStatusLabel,
  inactiveStatusLabel,
  forApprovalStatusLabel,
  vatLabel,
  ewtLabel,
  isManagement,
  isFinanceOfficer,
  isAccountOfficer,
  fetchSuppliers,
  handleAddClick,
  handleEditClick,
  handleInfoClick,
  handleDeleteClick,
  handleContactsClick,
  handleBankClick,
  handleCloseModal,
  handleCloseContactModal,
  handleCloseBankModal,
  handleCloseInfoModal,
  handleCloseDeleteModal,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  handleApprove,
  handleActivate,
  handleDeactivate,
  handleRedirect,
  handleDeleteSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const columns = React.useMemo(
    () => [
      {
        key: "supplierName",
        label: "Name",
        xs: 3,
        render: (_, row) => {
          const hasName = Boolean(row.supplierName?.trim());
          const hasNickname = Boolean(row.supplierNickName?.trim());

          return (
            <div className="min-w-0 text-left">
              {hasName ? (
                <span className="block text-xs font-medium leading-tight">
                  {row.supplierName}
                </span>
              ) : (
                <span className="block text-xs font-light italic leading-tight">
                  {NO_NAME}
                </span>
              )}
              <span className="block text-xs font-light italic leading-tight -mt-0.5">
                {hasNickname ? row.supplierNickName : NO_NICKNAME}
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
          const hasTin = Boolean(row.supplierTIN?.trim());

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
                TIN: {hasTin ? row.supplierTIN : NO_TIN}
              </span>
            </div>
          );
        },
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
          const isActive = row.statusCode === activeStatusKey;
          const isPending = row.statusCode === forApprovalStatusKey;
          const isInactive = !isActive && !isPending;

          const actions = [
            isActive &&
              (isFinanceOfficer || isManagement || isAccountOfficer) && (
                <BaseButton
                  key="edit"
                  icon={<Edit fontSize="small" />}
                  tooltip="Edit Supplier"
                  actionColor="edit"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(row);
                  }}
                />
              ),
            isPending && (
              <BaseButton
                key="approve"
                icon={<HowToReg fontSize="small" />}
                tooltip="Approve Supplier"
                actionColor="approve"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInfoClick(row);
                }}
              />
            ),
            isActive && (
              <BaseButton
                key="deactivate"
                icon={<PersonOff fontSize="small" />}
                tooltip="Deactivate Supplier"
                actionColor="deactivate"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInfoClick(row);
                }}
              />
            ),
            isInactive && (
              <BaseButton
                key="activate"
                icon={<PersonAdd fontSize="small" />}
                tooltip="Activate Supplier"
                actionColor="revert"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInfoClick(row);
                }}
              />
            ),
            !isPending && (
              <BaseButton
                key="contacts"
                icon={<Contacts fontSize="small" />}
                tooltip="Manage Contacts"
                actionColor="apply"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContactsClick(row);
                }}
              />
            ),
            !isPending && (
              <BaseButton
                key="bank"
                icon={<AccountBalance fontSize="small" />}
                tooltip="Manage Bank Info"
                actionColor="markup"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBankClick(row);
                }}
              />
            ),
            !isActive && isManagement && (
              <BaseButton
                key="delete"
                icon={<Delete fontSize="small" />}
                tooltip="Delete Supplier"
                actionColor="delete"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(row);
                }}
              />
            ),
          ].filter(Boolean);

          return (
            <div className="flex items-center justify-center gap-1">
              {actions}
            </div>
          );
        },
      },
    ],
    [
      activeStatusKey,
      forApprovalStatusKey,
      isManagement,
      isFinanceOfficer,
      isAccountOfficer,
      vatLabel,
      ewtLabel,
      colors,
      handleEditClick,
      handleInfoClick,
      handleContactsClick,
      handleBankClick,
      handleDeleteClick,
    ],
  );

  return (
    <PageLayout
      title="Suppliers"
      subtitle={
        selectedStatusCode && clientstatus[selectedStatusCode]
          ? `${clientstatus[selectedStatusCode]}`
          : ""
      }
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Supplier"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchSuppliers} />
        <BaseButton
          label="Supplier"
          tooltip="Add Supplier"
          onClick={handleAddClick}
          variant="contained"
          actionColor="approve"
          icon={<Add />}
          size="medium"
        />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={suppliers}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleRowClick}
        />
      </section>

      <SupplierAEModal
        open={openModal}
        handleClose={handleCloseModal}
        supplier={selectedSupplier}
        onSupplierSubmitted={fetchSuppliers}
        activeStatusKey={activeStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        isManagement={isManagement}
        vatLabel={vatLabel}
        ewtLabel={ewtLabel}
      />
      <ContactModal
        open={openContactModal}
        handleClose={handleCloseContactModal}
        supplier={selectedSupplier}
        supplierId={selectedSupplier?.nSupplierId || null}
        isManagement={isManagement}
        isFinanceOfficer={isFinanceOfficer}
        isAccountOfficer={isAccountOfficer}
      />
      <BankModal
        open={openBankModal}
        handleClose={handleCloseBankModal}
        supplier={selectedSupplier}
        isManagement={isManagement}
        isFinanceOfficer={isFinanceOfficer}
        isAccountOfficer={isAccountOfficer}
      />
      <InfoSupplierModal
        open={openInfoModal}
        handleClose={handleCloseInfoModal}
        supplierData={selectedSupplier}
        onApprove={handleApprove}
        onActive={handleActivate}
        onInactive={handleDeactivate}
        onRedirect={handleRedirect}
        activeStatusKey={activeStatusKey}
        inactiveStatusKey={inactiveStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        activeStatusLabel={activeStatusLabel}
        inactiveStatusLabel={inactiveStatusLabel}
        forApprovalStatusLabel={forApprovalStatusLabel}
        isManagement={isManagement}
        isFinanceOfficer={isFinanceOfficer}
      />
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </PageLayout>
  );
}
