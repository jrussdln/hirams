import { useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import CustomSearchField from "../../../components/ui/form/SearchField";
import CustomTable from "../../../components/ui/form/Table";
import PageLayout from "../../../components/layouts/page/content-page";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import BaseButton from "../../../components/ui/form/BaseButton";
import FormControlFilter from "../../../components/ui/form/FormControlFilter";
import CreateVoucherModal from "./modal/CreateVoucherModal";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
import {
  NO_NAME,
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
  NO_VOUCHER_NO,
} from "../../../constants/tableDataFallbacks";

// ── Local Color Map — only tokens used in this component ──────────────
const useColors = (c) => ({
  border: c.slate.border,
  violet: { bg: c.violet.bg, text: c.violet.text },
  blue: { bg: c.blue.bg, text: c.blue.text, textDark: c.blue.textStrong },
  green: { bg: c.green.bg, text: c.green.text, textDark: c.green.textDark },
  amber: { bg: c.amber.bg, text: c.amber.text, textDark: c.amber.textDark },
});

export default function VoucherView({
  itemsLoading,
  search,
  setSearch,
  typeFilter,
  voucherModalOpen,
  page,
  rowsPerPage,
  selectedStatusCode,
  isAOTL,
  isManagement,
  isFinanceOfficer,
  currentUserId,
  voucherStatus,
  voucherActiveKey,
  voucherClosedKey,
  voucherCancelledKey,
  voucherSupplierTypeKey,
  voucherAssigneeTypeKey,
  closeCartKey,
  cancelCartKey,
  cancelledPOKey,
  forPurchaseKey,
  paidKey,
  receivedKey,
  deliveredKey,
  chequeKey,
  jevDisbursementVoucherKey,
  tableRows,
  handleViewClick,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  handleTypeFilterChange,
  fetchVouchers,
  setVoucherModalOpen,
  paymentTerms,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const typeBadgeColors = useMemo(
    () => ({
      assignee: colors.violet,
      supplier: colors.blue,
    }),
    [colors],
  );

  const statusBadgeColors = useMemo(
    () => ({
      paid: colors.green,
      unpaid: colors.amber,
    }),
    [colors],
  );

  const typeFilterOptions = [
    { value: "supplier", label: "Supplier" },
    { value: "assignee", label: "Assignee" },
  ];

  const columns = [
    {
      key: "strNumber",
      label: "Voucher",
      xs: 2,
      render: (_, row) => {
        const hasNumber = Boolean(row.strNumber?.trim());
        const hasName = Boolean(row.displayName?.trim());
        // With a type filter active every row is the same type, so the
        // badge only appears on the unfiltered list.
        const showType = typeFilter === "all";
        const typeColor = row.isAssigneeType
          ? typeBadgeColors.assignee
          : typeBadgeColors.supplier;

        return (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[0.625rem] font-medium uppercase tracking-wide leading-tight text-gray-500 dark:text-gray-400">
                {hasNumber ? row.strNumber : NO_VOUCHER_NO}
              </span>
              {showType && (
                <span
                  className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                  style={{
                    backgroundColor: typeColor.bg,
                    color: typeColor.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {row.voucherTypeLabel}
                </span>
              )}
            </div>
            <span
              className={`block truncate uppercase tracking-wide leading-tight -mt-0.5 ${
                hasName ? "text-[0.8125rem] font-medium" : "text-xs font-light italic"
              }`}
            >
              {hasName ? row.displayName : NO_NAME}
            </span>
          </div>
        );
      },
    },
    {
      key: "displayAddress",
      label: "Address/TIN",
      xs: 2,
      render: (_, row) => {
        const hasAddress = Boolean(row.displayAddress?.trim());
        const hasTin = Boolean(row.displayTIN?.trim());

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
                {row.displayAddress}
              </span>
            ) : (
              <span className="block text-xs font-light italic leading-tight">
                {NO_ADDRESS}
              </span>
            )}
            <span className="block text-xs font-light italic leading-tight -mt-0.5">
              TIN: {hasTin ? row.displayTIN : NO_TIN}
            </span>
          </div>
        );
      },
    },
    { key: "dtCreated", label: "Created", align: "right" },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: (_, row) => (
        <div className="flex justify-center gap-0">
          <BaseButton
            icon={icons.view}
            tooltip="View Voucher"
            size="small"
            actionColor="view"
            onClick={(e) => {
              e.stopPropagation();
              handleViewClick(row._raw);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Vouchers"
      subtitle={
        selectedStatusCode && voucherStatus?.[selectedStatusCode]
          ? `${voucherStatus[selectedStatusCode]}`
          : ""
      }
      footer={false}
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Vouchers"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => fetchVouchers({ bustCache: true })} />
        {(isFinanceOfficer || isManagement) && (
          <FormControlFilter
            value={typeFilter}
            onChange={handleTypeFilterChange}
            options={typeFilterOptions}
            allLabel="All Types"
            allValue="all"
          />
        )}
        {(isFinanceOfficer || isManagement) && (
          <BaseButton
            label="Create Voucher"
            tooltip="Create Voucher"
            icon={icons.add}
            variant="contained"
            actionColor="approve"
            onClick={() => setVoucherModalOpen(true)}
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
      <CreateVoucherModal
        open={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        onSuccess={() => {
          setVoucherModalOpen(false);
          fetchVouchers({ bustCache: true });
          window.dispatchEvent(new CustomEvent("voucher_data_updated"));
        }}
        voucherActiveKey={voucherActiveKey}
        voucherClosedKey={voucherClosedKey}
        voucherCancelledKey={voucherCancelledKey}
        voucherSupplierTypeKey={voucherSupplierTypeKey}
        voucherAssigneeTypeKey={voucherAssigneeTypeKey}
        paymentTerms={paymentTerms} // ← add, sourced from useKeysLabels()
      />
    </PageLayout>
  );
}
