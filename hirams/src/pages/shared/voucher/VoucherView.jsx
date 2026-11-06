import { useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import CustomSearchField from "../../../components/ui/form/SearchField";
import CustomTable from "../../../components/ui/form/Table";
import PageLayout from "../../../components/layouts/page/content-page";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import BaseButton from "../../../components/ui/form/BaseButton";
import FormControlFilter from "../../../components/ui/form/FormControlFilter";
import CreateVoucherModal from "./modal/CreateVoucherModal";
import VoucherAPI from "../../../api/endpoints/voucher.api.js";
import getThemeColors from "../../../utils/style/getThemeColors";
import icons from "../../../utils/style/iconFormatStyles";
import SettingsConfirmationModal from "../../../pages/utility/settings/modal/SettingsConfirmationModal.jsx";
import { VOUCHER_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import { NO_NAME, NO_ADDRESS, NO_TIN, NO_ADDRESS_TIN, NO_CREATOR, NO_VOUCHER_NO, OPEN_DATE } from "../../../constants/tableDataFallbacks";
import { Tooltip } from "@mui/material";
import PersonIcon from "@mui/icons-material/PersonOutline";
import EventIcon from "@mui/icons-material/Event";
import PaymentOutlined from "@mui/icons-material/PaymentOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import { fmtPHP } from "../../../utils/formatters/formatter.js";

// ── Created-column helper — mirrors TransactionView's Account Officer style
// Tiny icons stand in for the row labels ("BY:", the date) — the full value
// rides in the tooltip and the shared grid keeps rows aligned down the column.
const OFFICER_GRID_CLASS =
  "grid w-fit max-w-full min-w-0 grid-cols-[auto_minmax(0,9.5rem)] items-baseline gap-x-1";

const LabelIcon = (props) => {
  const { icon: Icon, title, className = "" } = props;
  return (
    <Tooltip title={title} arrow placement="top">
      <span
        className={`inline-flex items-center justify-center text-gray-500 dark:text-gray-400 ${className}`}
        style={{ lineHeight: 0 }}
      >
        <Icon sx={{ fontSize: "0.7rem" }} />
      </span>
    </Tooltip>
  );
};

// ── Local Color Map — only tokens used in this component ──────────────
const useColors = (c) => ({
  border: c.slate.border,
  violet: { bg: c.violet.bg, text: c.violet.text },
  blue: { bg: c.blue.bg, text: c.blue.text, textDark: c.blue.textStrong },
  green: { bg: c.green.bg, text: c.green.text, textDark: c.green.textDark },
  amber: { bg: c.amber.bg, text: c.amber.text, textDark: c.amber.textDark },
});

// Next-action hints for CLOSED vouchers, keyed by the JEV stage the API
// computes (strJevStage). Printed under the payee name in the Voucher
// column — the finance workflow reads top-down: journal it, balance it,
// finalize it, then mark the voucher paid.
const JEV_STAGE_LABELS = {
  "no-jev": "Add JEV now!",
  "no-entries": "No Entries at this moment.",
  unbalanced: "JEV Entries not yet balanced.",
  "pending-finalize": "Pending JEV Finalize",
  "pending-paid": "Pending Mark as Paid",
};

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
  voucherPaidKey,
  voucherCancelledKey,
  voucherSupplierTypeKey,
  voucherAssigneeTypeKey,
  closeCartKey,
  cancelCartKey,
  cancelledPOKey,
  forPurchaseKey,
  paidKey,
  forDeliveryKey,
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

  // Which voucher the "Edit" button is currently opening in the update modal.
  // Null while the Create flow is the one in charge of the modal.
  const [editingVoucher, setEditingVoucher] = useState(null);
  // Mark as Paid / Unpaid confirmation — stores the row and target status.
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
      xs: 1.5,
      render: (_, row) => {
        const hasNumber = Boolean(row.strNumber?.trim());
        const hasName = Boolean(row.displayName?.trim());
        // With a type filter active every row is the same type, so the
        // badge only appears on the unfiltered list — except for Supplier
        // vouchers when filtered to Supplier type, where we show the AO
        // name alone instead of repeating "Supplier" on every row.
        const showTypeBadge = typeFilter === "all" || typeFilter === "supplier";
        const typeColor = row.isAssigneeType
          ? typeBadgeColors.assignee
          : typeBadgeColors.supplier;
        const badgeText =
          row.isAssigneeType
            ? row.voucherTypeLabel
            : typeFilter === "supplier"
              ? row.aoNickname
                ? `(AO: ${row.aoNickname.toUpperCase()})`
                : null
              : `SUPPLIER${row.aoNickname ? ` - AO: ${row.aoNickname.toUpperCase()}` : ""}`;

        return (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[0.625rem] font-medium uppercase tracking-wide leading-tight text-gray-500 dark:text-gray-400">
                {hasNumber ? row.strNumber : NO_VOUCHER_NO}
              </span>
              {showTypeBadge && badgeText && (
                <span
                  className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                  style={{
                    backgroundColor: typeColor.bg,
                    color: typeColor.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {badgeText}
                </span>
              )}
            </div>
            <span
              className={`block truncate tracking-wide leading-tight -mt-0.5 ${
                hasName ? "text-[0.8125rem] font-medium" : "text-xs font-light italic"
              }`}
            >
              {hasName ? row.displayName : NO_NAME}
            </span>
            {/* Closed vouchers are mid-workflow: say which JEV step comes
                next. Same font color as the DV number line above. */}
            {String(row.cStatus) === String(voucherClosedKey) && row.jevStage && (
              <span className="block truncate text-[0.55rem] font-medium italic uppercase tracking-wide leading-tight -mt-0.5 text-gray-500 dark:text-gray-400">
                {JEV_STAGE_LABELS[row.jevStage]}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      xs: 0.75,
      // The voucher's total (gross), not the net of EWT — with the EWT and the
      // freight under it, in the same small italic as the PO panels.
      render: (_, row) => {
        const subLine =
          "block text-[0.55rem] font-medium italic tabular-nums leading-tight text-gray-500 dark:text-gray-400";
        return (
          <div className="min-w-0 text-right leading-tight">
            <span className="block text-xs font-medium tabular-nums leading-tight">
              {fmtPHP(row.amount)}
            </span>
            {row.ewt > 0 && <span className={subLine}>EWT: {fmtPHP(row.ewt)}</span>}
            {row.freight > 0 && (
              <span className={subLine}>Freight: {fmtPHP(row.freight)}</span>
            )}
          </div>
        );
      },
      title: (_, row) =>
        [
          `Total: ${fmtPHP(row.amount)}`,
          row.ewt > 0 ? `EWT: ${fmtPHP(row.ewt)}` : null,
          row.freight > 0 ? `Freight: ${fmtPHP(row.freight)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
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
    {
      key: "dtCreated",
      label: "Created",
      align: "right",
      render: (_, row) => {
        // Same icon-label grid style as TransactionView's Account Officer
        // column: tiny label icons, uppercase small values, ONE shared grid
        // so rows line up down the column. Missing nicknames (pre-existing
        // rows) read the shared dash.
        const hasName = Boolean(row.strCreatedByName?.trim());
        const hasDate = Boolean(row.dtCreated);
        const lineClass =
          "truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight";
        const valueClass = "text-left truncate";

        if (!hasName && !hasDate) {
          return (
            <span
              className="text-xs font-light italic"
              style={{ color: colors.textMuted }}
            >
              {NO_CREATOR}
            </span>
          );
        }

        return (
          <div className="flex min-w-0 justify-end">
            <div className={`${OFFICER_GRID_CLASS} ${lineClass}`}>
              <LabelIcon icon={PersonIcon} title="Created by" />
              <span className={valueClass}>
                {hasName ? row.strCreatedByName : NO_CREATOR}
              </span>
              <LabelIcon icon={EventIcon} title="Created at" className="-mt-0.5" />
              <span className={`${valueClass} -mt-0.5`}>
                {hasDate ? row.dtCreated : OPEN_DATE}
              </span>
            </div>
          </div>
        );
      },
      title: (row) => row.dtCreated,
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      xs: 1.75,
      // The pay icon's enable/disable mirrors the update page's Mark as
      // Paid / Unpaid buttons exactly (gates computed in useVoucher):
      //   Mark as Paid   → Closed + finalized JEV + Finance Officer / Mgmt
      //   Mark as Unpaid → Paid + finalized JEV + nothing received yet —
      // Edit stays on Active / Closed as before.
      render: (_, row) => {
        const isClosed = String(row.cStatus) === String(voucherClosedKey);
        const isPaidStatus = String(row.cStatus) === String(voucherPaidKey);
        // Same enable/disable gates as the update page's Mark as Paid /
        // Unpaid buttons, computed per row in useVoucher.
        const canMarkPaid = Boolean(row.canMarkPaid);
        const canMarkUnpaid = Boolean(row.canMarkUnpaid);
        const payBlocked = row.payBlockedReason;

        return (
          <div className="flex justify-center gap-0">
            {(
              String(row.cStatus) === String(voucherActiveKey) ||
              String(row.cStatus) === String(voucherClosedKey)
            ) && (
              <BaseButton
                icon={icons.edit}
                tooltip="Edit Voucher"
                size="small"
                actionColor="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingVoucher(row._raw);
                  setVoucherModalOpen(true);
                }}
              />
            )}
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
            {isClosed || isPaidStatus ? (
              <BaseButton
                icon={
                  isPaidStatus ? (
                    <CheckCircleOutline sx={{ fontSize: "0.85rem" }} />
                  ) : (
                    <PaymentOutlined sx={{ fontSize: "0.85rem" }} />
                  )
                }
                tooltip={
                  isPaidStatus
                    ? canMarkUnpaid
                      ? "Mark as Unpaid"
                      : `Cannot unpay — ${payBlocked}`
                    : canMarkPaid
                      ? "Mark as Paid"
                      : `Cannot mark as paid — ${payBlocked}`
                }
                size="small"
                actionColor={isPaidStatus ? "default" : "approve"}
                disabled={isPaidStatus ? !canMarkUnpaid : !canMarkPaid}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmRow(row);
                  setConfirmAction(isPaidStatus ? "unpaid" : "paid");
                }}
              />
            ) : null}
          </div>
        );
      },
    },
  ];

  // ── Mark as Paid / Unpaid confirmation ──────────────────────────────
  const handleConfirmMark = async () => {
    if (!confirmRow || !confirmAction) return;
    setConfirmLoading(true);
    try {
      const targetStatus =
        confirmAction === "paid" ? voucherPaidKey : voucherClosedKey;
      await VoucherAPI.updateVoucherStatus(confirmRow.id, targetStatus);
      await fetchVouchers({ silent: true });
      window.dispatchEvent(new CustomEvent("voucher_data_updated"));
    } catch (err) {
      console.error("Failed to update voucher status:", err);
    } finally {
      setConfirmAction(null);
      setConfirmRow(null);
      setConfirmLoading(false);
    }
  };

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
            onClick={() => {
              setEditingVoucher(null);
              setVoucherModalOpen(true);
            }}
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
        onClose={() => {
          setVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        onSuccess={() => {
          setVoucherModalOpen(false);
          setEditingVoucher(null);
          fetchVouchers({ bustCache: true });
          window.dispatchEvent(new CustomEvent("voucher_data_updated"));
        }}
        voucherActiveKey={voucherActiveKey}
        voucherClosedKey={voucherClosedKey}
        voucherCancelledKey={voucherCancelledKey}
        voucherSupplierTypeKey={voucherSupplierTypeKey}
        voucherAssigneeTypeKey={voucherAssigneeTypeKey}
        paymentTerms={paymentTerms} // ← add, sourced from useKeysLabels()
        editVoucher={editingVoucher}
      />

      {/* Mark as Paid / Unpaid confirmation — same shell as Settings panels */}
      <SettingsConfirmationModal
        open={!!confirmAction}
        style={
          confirmAction
            ? VOUCHER_CONFIRM_STYLES[confirmAction]
            : null
        }
        badge={confirmRow?.strNumber ?? ""}
        loading={confirmLoading}
        onConfirm={handleConfirmMark}
        onClose={() => {
          setConfirmAction(null);
          setConfirmRow(null);
        }}
      />
    </PageLayout>
  );
}
