import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import { History, Visibility, Unarchive } from "@mui/icons-material";
import { getDueDateColor } from "../../../utils/helpers/dueDateColor";
import TransactionHistoryModal from "../transactions/modal/TransactionHistoryModal";
import ArchiveModal from "./modal/ArchiveModal";
import useArchive from "./useArchive";
import getThemeColors from "../../../utils/style/getThemeColors";
import { OPEN_DATE } from "../../../constants/tableDataFallbacks";

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

// The label/value group. Fixed column widths (label 5rem + value 9.5rem) make
// every row's group the SAME size, so the labels line up down the column AND
// the whole group sits centered in the cell (the parent uses justify-center).
// Tune 9.5rem to the widest value (the date) if it truncates or leaves a gap.
const OfficerBlock = ({ children }) => (
  <div className="grid w-fit max-w-full min-w-0 grid-cols-[5rem_9.5rem] items-center gap-x-2 uppercase tracking-wide text-[0.625rem] font-medium leading-tight">
    {children}
  </div>
);

const OfficerLine = ({ label, value, valueStyle }) => (
  <>
    <span className="text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
      {label}
    </span>
    <span className="text-left truncate" style={valueStyle}>
      {value}
    </span>
  </>
);

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
    collectibleMap,
    fetchTransactions,
    handleRowClick,
  } = useArchive();

  const columns = [
    {
      key: "transactionName",
      label: "Transaction",
      // Completed mirrors the For Collection layout, where the title carries
      // the code and the client ➟ company pair and takes the wider share.
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
            <span className="block truncate text-[0.8125rem] font-medium leading-tight -mt-0.5">
              {val}
            </span>
            {selectedArchiveStatusCode !== lostKey && (
              <span className="block truncate text-[0.5625rem] font-light italic leading-tight text-gray-500 dark:text-gray-400 -mt-0.5">
                PREVIOUS: {row.previous_status_label || "—"}
              </span>
            )}
          </div>
        );
      },
    },
    // { key: "clientName", label: "Client" },
    // { key: "companyName", label: "Company" },

    // Transaction Completed mirrors the transactions page's For Collection
    // layout: the officer column is replaced by the Collection Amount block.
    ...(selectedArchiveStatusCode === completedKey
      ? [
          {
            key: "collectionAmount",
            label: "Collection Amount",
            align: "right",
            xs: 2.5,
            render: (_, row) => {
              const data = collectibleMap[row.id];
              if (!data)
                return (
                  <span
                    style={{ color: colors.textMuted, fontSize: "0.7rem" }}
                  >
                    —
                  </span>
                );

              const peso = (v) =>
                Number(v ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              // A zero deduction is noise — dropping the line keeps the
              // rows even instead of staggering on every transaction.
              const deductions = [
                ["Less EWT:", data.ewt],
                ["Less TAX:", data.tax],
                ["Less Retention:", data.retention],
              ].filter(([, v]) => Number(v ?? 0) !== 0);

              // Money lines read best with the figures on a common
              // right edge; the label sits left of each one.
              const labelClass =
                "text-left text-gray-500 dark:text-gray-400 whitespace-nowrap";
              const valueClass = "text-right whitespace-nowrap";
              const lineClass =
                "grid grid-cols-[auto_1fr] items-baseline gap-x-3 text-[0.5625rem] font-light italic leading-tight";
              const netLineClass =
                "grid grid-cols-[auto_1fr] items-baseline gap-x-3 text-[0.625rem] font-semibold leading-tight";

              // Same derivation as CollectionPaymentDetails.jsx's
              // netAmount: collectible less the three deductions.
              const net =
                Number(data.collectible ?? 0) -
                Number(data.ewt ?? 0) -
                Number(data.tax ?? 0) -
                Number(data.retention ?? 0);

              return (
                <div className="flex min-w-0 justify-center">
                  <div className="min-w-0">
                    <div className={netLineClass}>
                      <span className={labelClass}>Amount:</span>
                      <span className={valueClass}>
                        ₱ {peso(data.collectible)}
                      </span>
                    </div>
                    {deductions.map(([label, v]) => (
                      <div key={label} className={lineClass}>
                        <span className={labelClass}>{label}</span>
                        <span className={valueClass}>₱ {peso(v)}</span>
                      </div>
                    ))}
                    <div className={netLineClass}>
                      <span className="whitespace-nowrap">NET:</span>
                      <span className={valueClass}>₱ {peso(net)}</span>
                    </div>
                  </div>
                </div>
              );
            },
          },
        ]
      : [
          {
            key: "createdBy",
            label: "Account / Procurement Officer",
            align: "center",
            xs: 2,
            render: (_, row) => {
              const prevCode = Number(row.previous_status_code ?? 0);
              const isAoStage = prevCode >= 200 && prevCode <= 245;
              const isForPurchaseStage = prevCode === 340;

              if (isAoStage) {
                const hasName = Boolean(row.aoName?.trim());
                const secondDate = isForPurchaseStage
                  ? row.dtDelivery
                  : row.dtAODueDate || row.dtDocSubmission;
                const hasSecond = Boolean(secondDate);
                const formattedDate =
                  row.date && row.date !== "—" ? row.date : OPEN_DATE;

                return (
                  <div className="flex min-w-0 justify-center">
                    <OfficerBlock>
                      <OfficerLine
                        label="AO:"
                        value={hasName ? row.aoName : "—"}
                      />
                      <OfficerLine
                        label={isForPurchaseStage ? "DELIVERY:" : "DUE:"}
                        valueStyle={{ color: colors.textMuted }}
                        value={
                          hasSecond
                            ? isForPurchaseStage
                              ? row.deliveryDate || formattedDate
                              : row.aoDueDate || formattedDate
                            : OPEN_DATE
                        }
                      />
                    </OfficerBlock>
                  </div>
                );
              }

              const hasName = Boolean(row.createdBy?.trim());
              const formattedDate =
                row.date && row.date !== "—" ? row.date : OPEN_DATE;
              return (
                <div className="flex min-w-0 justify-center">
                  <OfficerBlock>
                    <OfficerLine
                      label="PO:"
                      value={hasName ? row.createdBy : "—"}
                    />
                    <OfficerLine
                      label="SUB. DATE:"
                      valueStyle={{ color: colors.textMuted }}
                      value={formattedDate}
                    />
                  </OfficerBlock>
                </div>
              );
            },
          },
          // { key: "previous_status_label", label: "Previous", align: "center" },
        ]),
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