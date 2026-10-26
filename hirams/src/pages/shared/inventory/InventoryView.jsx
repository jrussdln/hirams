import React, { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import { ArrowBackOutlined, BadgeOutlined, ReceiptLongOutlined, Visibility } from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import BaseButton from "../../../components/ui/form/BaseButton";
import FormControlFilter from "../../../components/ui/form/FormControlFilter";
import InventoryDetailsPanel from "./component/InventoryDetailsPanel";
import PendingInventory from "./component/PendingInventory";
import InventoryConfirmModal from "./modal/InventoryConfirmModal";
import { mapInventoryItems } from "./itemRows.js";
import { INVENTORY_CONFIRM_STYLES } from "../../../utils/style/sharedConfirmStyles.jsx";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { fmtQty } from "../../../utils/formatters/formatter.js";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  // ✅ matches table header bg
  stripe: c.slate.itemHeaderBgSolid,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  // inline company badge on the Item column
  blue: { bg: c.blue.bg, text: c.blue.text },
  // colour only — geometry stays at the usage site
  shadowColor: c.shadow.hairline,
  rounded: "0.5rem",
});

export default function InventoryView({
  itemsLoading,
  items,
  companies,
  search,
  setSearch,
  companyFilter,
  directionFilter,
  handleDirectionFilterChange,
  groupView,
  openGroupView,
  closeGroupView,
  creatingJev,
  finalizingJev,
  jevPendingCount,
  groupHasJev,
  pendingJevs,
  canFinalizeJevs,
  jevBalanceMessage,
  jevBalanceLoading,
  jevBalances,
  confirmAction,
  setConfirmAction,
  handleConfirmAction,
  jev_types,
  jev_status,
  jevPendingKey,
  isManagement,
  isFinanceOfficer,
  selectedItemId,
  detailsOpen,
  page,
  rowsPerPage,
  groupListPage,
  handleGroupListPageChange,
  selectedStatusCode,
  inventoryStatus,
  inventoryReceivedKey,
  inventoryDeliveredKey,
  inventoryPendingKey,
  inventoryCancelledKey,
  inventoryReceivedLabel,
  inventoryDeliveredLabel,
  inventoryPendingLabel,
  inventoryCancelledLabel,
  filteredItems,
  fetchItems,
  handlePageChange,
  handleRowsPerPageChange,
  handleRowClick,
  handleCompanyFilterChange,
  closeDetails,
}) {
  // ✅ Standardized color wiring
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const selectedItem = useMemo(
    () => items.find((i) => i.nInventoryId === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const showDetails = Boolean(detailsOpen && selectedItem);

  // ── Pending status shows GROUPS only — never individual items ───────
  const isPendingStatus =
    Boolean(inventoryPendingKey) &&
    String(selectedStatusCode) === String(inventoryPendingKey);
  const showGroupList = Boolean(groupView) && !showDetails;

  // Stock awaiting pickup (For Delivery) is still the supplier's; once it has
  // gone out (Delivered) the only party left on it is the client. Each tab
  // shows just that one counterparty.
  const isForDeliveryTab =
    Boolean(inventoryReceivedKey) &&
    String(selectedStatusCode) === String(inventoryReceivedKey);
  const isDeliveredTab =
    Boolean(inventoryDeliveredKey) &&
    String(selectedStatusCode) === String(inventoryDeliveredKey);

  // Page-layout subtitle: the status tab while browsing the list,
  // "Status / Received / Supplier" inside a group's item list, and
  // "Status / Brand · Model" while a single item's details are open.
  const subtitle = useMemo(() => {
    const tabLabel =
      selectedStatusCode && inventoryStatus?.[selectedStatusCode]
        ? inventoryStatus[selectedStatusCode]
        : "";
    // The details panel covers whatever list sits underneath it
    // (including a group's item list), so it wins the subtitle.
    if (showDetails && selectedItem) {
      const statusKind =
        selectedItem.cStatus === inventoryDeliveredKey
          ? "delivered"
          : selectedItem.cStatus === inventoryPendingKey
            ? "pending"
            : selectedItem.cStatus === inventoryCancelledKey
              ? "cancelled"
              : "received";
      const statusLabel =
        {
          received: inventoryReceivedLabel,
          delivered: inventoryDeliveredLabel,
          pending: inventoryPendingLabel,
          cancelled: inventoryCancelledLabel,
        }[statusKind] || tabLabel;

      const brandModel = [
        selectedItem.purchaseOption?.strBrand,
        selectedItem.purchaseOption?.strModel,
      ]
        .map((v) => v?.trim())
        .filter(Boolean)
        .join(" · ");

      return [statusLabel, brandModel].filter(Boolean).join(" / ");
    }

    if (groupView) {
      // Pending / Received / ACME Trading · Company
      const scopeLabel =
        groupView.scope === "supplier"
          ? inventoryReceivedLabel
          : inventoryDeliveredLabel;
      const groupName = groupView.company
        ? `${groupView.name} · ${groupView.company}`
        : groupView.name;
      return [tabLabel, scopeLabel, groupName]
        .filter(Boolean)
        .join(" / ");
    }

    return tabLabel;
  }, [
    showDetails,
    groupView,
    selectedItem,
    selectedStatusCode,
    inventoryStatus,
    inventoryDeliveredKey,
    inventoryPendingKey,
    inventoryCancelledKey,
    inventoryReceivedLabel,
    inventoryDeliveredLabel,
    inventoryPendingLabel,
    inventoryCancelledLabel,
  ]);

  // One mapper for every consumer of an inventory row — the group table,
  // the drill-down Items table and the shared JEV viewer — so their row
  // shapes can never drift apart (see ItemsTable.jsx).
  const tableRows = useMemo(
    () => mapInventoryItems(filteredItems),
    [filteredItems],
  );

  const columns = useMemo(
    () => [
      // The counterparty a batch belongs to is only ever one on these tabs —
      // supplier on the way in, client on the way out — so it rides along with
      // the item instead of taking a column of its own. The company badge
      // only appears under "All Companies"; picking one filters the list down
      // to that company and would just repeat the filter back at you.
      ...(isPendingStatus
        ? [{ key: "strBrandModel", label: "Brand / Model", xs: 2 }]
        : [
            {
              key: "strBrandModel",
              label: "Item",
              xs: 3,
              render: (val, row) => (
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight text-gray-500 dark:text-gray-400">
                      {isDeliveredTab
                        ? row.strClientNickName
                        : row.strSupplierNickName}
                    </span>
                    {companyFilter === "all" && (
                      <span
                        className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                        style={{
                          backgroundColor: colors.blue.bg,
                          color: colors.blue.text,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {row.strCompanyNickName}
                      </span>
                    )}
                  </div>
                  <span className="block truncate italic tracking-wide text-[0.8125rem] font-medium leading-tight -mt-0.5">
                    {val}
                  </span>
                </div>
              ),
            },
          ]),
      {
        key: "nQuantity",
        label: "Quantity",
        align: "center",
        render: (val, row) => `${fmtQty(val)} ${row.strUOM}`,
      },
      {
        key: "dUnitPrice",
        label: "Unit Price",
        align: "right",
        render: (val) => `₱${val}`,
      },
      // Pending JEV groups batches by whichever counterparty owns them —
      // received (positive qty) by supplier, delivered (negative) by client —
      // so that tab gets one column showing the nickname it grouped on.
      ...(isPendingStatus
        ? [
            {
              key: "counterparty",
              label: "Supplier / Client",
              align: "center",
              xs: 2,
              render: (_, row) =>
                Number(row.nQuantity) > 0
                  ? row.strSupplierNickName
                  : row.strClientNickName,
            },
          ]
        : []),
      { key: "dtLog", label: "Occurred", align: "right", xs: 1.5 },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => (
          <div className="flex justify-center">
            <BaseButton
              icon={<Visibility fontSize="small" />}
              tooltip="View"
              size="small"
              actionColor="view"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(row);
              }}
            />
          </div>
        ),
      },
    ],
    [
      handleRowClick,
      colors,
      companyFilter,
      isPendingStatus,
      isForDeliveryTab,
      isDeliveredTab,
    ],
  );

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.strCompanyNickName,
        label: c.strCompanyNickName,
      })),
    [companies],
  );

  return (
    <PageLayout
      title="Inventory"
      subtitle={subtitle}
      footer={false}
      footerLActions={
        showDetails || showGroupList ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BaseButton
              label="Back"
              icon={<ArrowBackOutlined fontSize="small" />}
              actionColor="back"
              onClick={showDetails ? closeDetails : closeGroupView}
            />
          </Box>
        ) : null
      }
      // Pending JEV screen — only inside a group's item list: creates the
      // JEV(s) for the batches on screen (For Delivery → 'R', Delivered →
      // 'D', both saved as status 'P') and finalizes them once they balance.
      footerRActions={
        isPendingStatus && showGroupList ? (
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              gap: 0.75,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Confirms first — same dialog flow as the voucher page.
                Hidden altogether once the group already carries a JEV:
                there is nothing left to create. */}
            {!groupHasJev && (
              <BaseButton
                label={creatingJev ? "Creating…" : "Create JEV"}
                icon={<ReceiptLongOutlined fontSize="small" />}
                actionColor="add"
                disabled={creatingJev || jevPendingCount === 0}
                tooltip="Create JEV for the pending batches of this group"
                onClick={() => setConfirmAction("create_jev")}
              />
            )}

            {/* Finalize — shown only while the group still has pending
                JEV(s), and enabled only while every one of them balances */}
            {(isManagement || isFinanceOfficer) &&
              (pendingJevs?.length ?? 0) > 0 && (
                <BaseButton
                  label={finalizingJev ? "Finalizing…" : "Finalize"}
                  icon={<BadgeOutlined fontSize="small" />}
                  actionColor="approve"
                  disabled={
                    finalizingJev || jevBalanceLoading || !canFinalizeJevs
                  }
                  tooltip={jevBalanceMessage || "Finalize this JEV"}
                  onClick={() => setConfirmAction("finalize_jev")}
                />
              )}
          </Box>
        ) : null
      }
    >
      {showDetails ? (
        <InventoryDetailsPanel
          item={selectedItem}
          inventoryDeliveredKey={inventoryDeliveredKey}
          inventoryPendingKey={inventoryPendingKey}
          inventoryCancelledKey={inventoryCancelledKey}
          inventoryReceivedLabel={inventoryReceivedLabel}
          inventoryDeliveredLabel={inventoryDeliveredLabel}
          inventoryPendingLabel={inventoryPendingLabel}
          inventoryCancelledLabel={inventoryCancelledLabel}
        />
      ) : isPendingStatus ? (
        // Pending never lists single items — supplier / client groups only
        <PendingInventory
          itemsLoading={itemsLoading}
          tableRows={tableRows}
          columns={columns}
          search={search}
          setSearch={setSearch}
          directionFilter={directionFilter}
          handleDirectionFilterChange={handleDirectionFilterChange}
          groupView={groupView}
          openGroupView={openGroupView}
          handleRowClick={handleRowClick}
          groupListPage={groupListPage}
          handleGroupListPageChange={handleGroupListPageChange}
          page={page}
          rowsPerPage={rowsPerPage}
          handlePageChange={handlePageChange}
          handleRowsPerPageChange={handleRowsPerPageChange}
          fetchItems={fetchItems}
          inventoryReceivedLabel={inventoryReceivedLabel}
          inventoryDeliveredLabel={inventoryDeliveredLabel}
          jevList={pendingJevs}
          jevBalances={jevBalances}
          jev_types={jev_types}
          jev_status={jev_status}
          jevPendingKey={jevPendingKey}
          isManagement={isManagement}
          isFinanceOfficer={isFinanceOfficer}
        />
      ) : (
        <>
          <section className="flex items-center gap-2 mb-3">
            <div className="flex-grow">
              <CustomSearchField
                label="Search Brand / Model / Supplier / Client / Company"
                value={search}
                onChange={setSearch}
              />
            </div>
            <SyncMenu onSync={() => fetchItems({ bustCache: true })} />
            <FormControlFilter
              value={companyFilter}
              onChange={handleCompanyFilterChange}
              options={companyOptions}
              allLabel="All Companies"
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
              rows={tableRows}
              page={page}
              loading={itemsLoading}
              rowsPerPage={rowsPerPage}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              onRowClick={handleRowClick}
            />
          </section>
        </>
      )}

      {/* Create JEV / Finalize JEV confirmations (Pending JEV screen) */}
      <InventoryConfirmModal
        open={!!confirmAction}
        style={confirmAction ? INVENTORY_CONFIRM_STYLES[confirmAction] : null}
        badge={groupView?.name}
        loading={creatingJev || finalizingJev}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </PageLayout>
  );
}
