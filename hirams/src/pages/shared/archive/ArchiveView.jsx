import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import {
  History,
  Visibility,
  Unarchive,
  Storefront,
} from "@mui/icons-material";
import TransactionHistoryModal from "../transactions/modal/TransactionHistoryModal";
import ArchiveModal from "./modal/ArchiveModal";
import useArchive from "./useArchive";
import getThemeColors from "../../../utils/style/getThemeColors";
import OfficerCell from "../transactions/components/OfficerCell";
import { DEFAULT_FALLBACK } from "../../../constants/tableDataFallbacks";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — consistent with BankModal & ContactModal pattern
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  blue: { bg: c.blue.bg, text: c.blue.text },
  border: c.slate.border,
  textMuted: c.gray.textMuted,
  blueBg: c.blue.bg,
  blueHover: c.blue.hover,
  blueBorder: c.blue.border,
  blueText: c.blue.text,
  slateBtnBg: c.slate.btnBg,
  slateHover: c.slate.hover,
  whiteBg: c.slate.outerBgSolid,
  grayTextPrimary: c.gray.textPrimary,
  grayTextSecondary: c.gray.textSecondary,
});

export default function ArchiveView() {
  // ✅ STANDARD THEME WIRING
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredTransactions,
    loading,
    initialLoading,
    selectedArchiveStatusCode,
    selectedTransaction,
    setSelectedTransaction,
    archiveModalTransaction,
    setArchiveModalTransaction,
    archiveModalMode,
    setArchiveModalMode,
    isArchiveModalOpen,
    setIsArchiveModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    archiveStatus,
    isManagement,
    userId,
    lostKey,
    completedKey,
    fetchTransactions,
    handleRowClick,
  } = useArchive();

  const columns = [
    {
      key: "transactionName",
      label: "Transaction",
      // Completed now mirrors the transactions page's DRAFT layout: the code
      // carries the client ➟ company badge on the wider share, with an ABC
      // column and the PO block beside it.
      xs: selectedArchiveStatusCode === completedKey ? 6 : 4,
      title: true,
      render: (val, row) => {
        const hasClient = Boolean(row.clientName?.trim());
        const hasCompany = Boolean(row.companyName?.trim());

        return (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[0.625rem] font-medium leading-tight text-gray-500 dark:text-gray-400">
                {row.transactionId}
              </span>
              {(hasClient || hasCompany) && (
                <span
                  className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                  style={{
                    backgroundColor: colors.blue.bg,
                    color: colors.blue.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {hasClient ? row.clientName : ""}
                  {hasClient && hasCompany ? " ➟ " : ""}
                  {hasCompany ? row.companyName : ""}
                </span>
              )}
            </div>
            {/* It may take a second line — but never a third. line-clamp-2 caps
                it there with an ellipsis; whitespace-normal is needed because
                the table cell inherits white-space: nowrap. */}
            <span className="line-clamp-2 whitespace-normal text-[0.75rem] font-normal leading-[1.1] mt-px">
              {val}
            </span>
            {/* No PREVIOUS caption on Transaction Completed — the draft-like
                layout keeps its rows clean, and the stage it completed from
                is already obvious from the workspace it opens. */}
            {selectedArchiveStatusCode !== lostKey &&
              selectedArchiveStatusCode !== completedKey && (
              // The caption and the status now read as one label: upright and
              // the same weight, so the whole line is legible at this size.
              <span className="block truncate text-[0.5625rem] font-medium not-italic leading-tight text-gray-500 dark:text-gray-400 mt-px">
                PREVIOUS: {row.previous_status_label || "—"}
              </span>
            )}
          </div>
        );
      },
    },
    // { key: "clientName", label: "Client" },
    // { key: "companyName", label: "Company" },

    // Transaction Completed reads like the transactions page's DRAFT layout
    // now: an ABC column beside the title — NOT the Collection Amount figure
    // the live For Collection stage carries (that figure only exists while
    // the transaction is still running).
    ...(selectedArchiveStatusCode === completedKey
      ? [
          {
            // Transaction-level ABC (dTotalABC) — optional, so completed
            // transactions without one fall back to the shared placeholder,
            // same as the Draft view.
            key: "dTotalABC",
            label: "ABC",
            align: "right",
            xs: 1.5,
            render: (val) =>
              val == null || val === "" ? (
                <span
                  className="text-xs font-light italic"
                  style={{ color: colors.textMuted }}
                >
                  {DEFAULT_FALLBACK}
                </span>
              ) : (
                `₱ ${Number(val).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              ),
          },
        ]
      : []),
    // The OFFICER column is shared by EVERY archive status — who owns the
    // transaction (AO) over who raised it (PO), the same cell the For
    // Collection view prints. Spread it: CustomTable maps over columns
    // directly, so a nested array would be read as ONE broken column
    // (undefined key/label/xs) instead of a real one.
    ...[
      {
        key: "createdBy",
        label: "OFFICER",
        align: "left",
        xs: 1,
        render: (_, row) => (
          <OfficerCell
            aoName={row.aoName}
            createdBy={row.createdBy}
            mutedColor={colors.textMuted}
          />
        ),
      },
      // { key: "previous_status_label", label: "Previous", align: "center" },
    ],
    {
      key: "actions",
      label: "Actions",
      align: "center",
      xs: 1,
      render: (_, row) => (
        <div className="flex justify-center gap-0">
          <BaseButton
            icon={<Visibility />}
            tooltip="View Transaction"
            size="small"
            actionColor="view"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row);
            }}
          />
          {selectedArchiveStatusCode !== completedKey && (
            <BaseButton
              icon={<Unarchive />}
              tooltip="Unarchive Transaction"
              size="small"
              actionColor="revert"
              onClick={(e) => {
                e.stopPropagation();
                setArchiveModalTransaction(row);
                setArchiveModalMode("unarchive");
                setIsArchiveModalOpen(true);
              }}
            />
          )}
          {isManagement && (
            <BaseButton
              icon={<History />}
              tooltip="View Transaction History"
              size="small"
              actionColor="deactivate"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTransaction(row);
                setIsHistoryModalOpen(true);
              }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Transaction Archive"
      subtitle={
        selectedArchiveStatusCode && archiveStatus?.[selectedArchiveStatusCode]
          ? `${archiveStatus[selectedArchiveStatusCode]}`
          : ""
      }
      loading={initialLoading || loading}
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Transaction"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => fetchTransactions({ silent: true })} />
      </section>

      <section
        className="shadow-sm rounded-lg overflow-hidden"
        style={{
          backgroundColor: isDark ? colors.blueBg : colors.whiteBg,
          transition: "background-color 0.2s ease",
        }}
      >
        <CustomTable
          columns={columns}
          rows={filteredTransactions}
          page={page}
          loading={initialLoading || loading}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          onRowClick={handleRowClick}
        />
      </section>

      {isHistoryModalOpen && selectedTransaction && (
        <TransactionHistoryModal
          open={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          transactionId={selectedTransaction.id}
          transactionCode={selectedTransaction.transactionId}
          isManagement={isManagement}
          currentUserId={userId}
        />
      )}

      {isArchiveModalOpen && archiveModalTransaction && (
        <ArchiveModal
          open={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setArchiveModalTransaction(null);
          }}
          transaction={archiveModalTransaction}
          transactionId={archiveModalTransaction.id}
          transactionCode={archiveModalTransaction.transactionId}
          mode={archiveModalMode}
          archiveStatus={archiveStatus}
          onSuccess={() => {
            setIsArchiveModalOpen(false);
            setArchiveModalTransaction(null);
            fetchTransactions({ silent: true });
          }}
        />
      )}
    </PageLayout>
  );
}