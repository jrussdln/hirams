import React from "react";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import DirectCostAEModal from "./modal/DirectCostAEModal";
import TransferDirectCostModal from "./modal/TransferDirectCostModal";
import DeleteVerificationModal from "../../shared/transactions/modal/DeleteVerificationModal";
import { Edit, Delete, Add, DriveFileMoveOutlined } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — only tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  cardBg: c.slate.outerBg,
  textPrimary: c.gray.textPrimary,
});

export default function DirectCostView({
  search,
  setSearch,
  page,
  rowsPerPage,
  directCosts,
  loading,
  isModalOpen,
  selectedCost,
  openDeleteModal,
  setOpenDeleteModal,
  entityToDelete,
  setEntityToDelete,
  openTransferModal,
  fetchDirectCosts,
  handleAdd,
  handleEdit,
  handleDelete,
  handleDeleteSuccess,
  handleTransferClick,
  handleCloseTransferModal,
  handleTransferCosts,
  handleModalClose,
  handleSaveSuccess,
  handlePageChange,
  handleRowsPerPageChange,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const columns = React.useMemo(
    () => [
      {
        key: "costName",
        label: "Description",
        render: (_, row) => {
          const costCount = Number(row.costsCount ?? 0);

          return (
            <div className="min-w-0 text-left">
              {/* The option name… */}
              <span
                className="block text-xs font-medium leading-tight truncate"
                style={{ color: colors.textPrimary }}
              >
                {row.costName}
              </span>
              {/* …with how many live transactions still charge a cost to it
                  BELOW it — the same count that decides whether Delete or
                  Transfer is offered. */}
              {costCount > 0 && (
                <span className="block text-[0.5625rem] font-light italic leading-tight text-gray-500 dark:text-gray-400 truncate">
                  {costCount} transaction{costCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => {
          const hasEntries = Number(row.costsCount ?? 0) > 0;

          return (
            <div className="flex justify-center space-x-2">
              <BaseButton
                icon={<Edit />}
                tooltip="Edit Direct Cost"
                size="small"
                actionColor="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
              />
              {hasEntries ? (
                // An option a live transaction still charges a cost to
                // cannot be deleted — its entries would be left pointing at
                // nothing. Transfer moves them to another option instead.
                <BaseButton
                  icon={<DriveFileMoveOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTransferClick(row);
                  }}
                  actionColor="reassign"
                  size="small"
                  tooltip={`Transfer Entries (${row.costsCount})`}
                />
              ) : (
                <BaseButton
                  icon={<Delete />}
                  tooltip="Delete Direct Cost"
                  size="small"
                  actionColor="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.id, row.costName);
                  }}
                />
              )}
            </div>
          );
        },
      },
    ],
    [colors, handleEdit, handleDelete, handleTransferClick],
  );

  const handleDeleteModalClose = React.useCallback(() => {
    setOpenDeleteModal(false);
    setEntityToDelete(null);
  }, [setOpenDeleteModal, setEntityToDelete]);

  return (
    <PageLayout
      title="Direct Cost Options"
      subtitle="Manage direct cost configurations"
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Direct Cost"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchDirectCosts} />
        <BaseButton
          label="Direct Cost Option"
          tooltip="Add Direct Cost Option"
          icon={<Add />}
          onClick={handleAdd}
          actionColor="approve"
          variant="contained"
        />
      </section>

      {/* ✅ bg-white → theme-aware cardBg */}
      <section
        className="shadow-sm rounded-lg overflow-hidden"
        style={{ backgroundColor: colors.cardBg }}
      >
        <CustomTable
          columns={columns}
          rows={directCosts}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleEdit}
        />
      </section>

      <DirectCostAEModal
        open={isModalOpen}
        onClose={handleModalClose}
        initialData={selectedCost}
        onSaved={handleSaveSuccess}
      />

      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleDeleteModalClose}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />

      {/* Transfer — the stand-in for Delete on an option that still has
          entries charged to it in a transaction. */}
      <TransferDirectCostModal
        open={openTransferModal}
        handleClose={handleCloseTransferModal}
        option={selectedCost}
        onTransfer={handleTransferCosts}
      />
    </PageLayout>
  );
}
