import React, { useMemo, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  Visibility,
  ReceiptLongOutlined,
  WarningAmberOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import CustomTable from "../../../../components/ui/form/Table";
import CustomSearchField from "../../../../components/ui/form/SearchField";
import SyncMenu from "../../../../components/ui/form/SyncMenu";
import BaseButton from "../../../../components/ui/form/BaseButton";
import FormControlFilter from "../../../../components/ui/form/FormControlFilter";
import JevViewPanel from "../../jev/components/JevViewPanel.jsx";
import ItemsTable from "./ItemsTable.jsx";
import { itemTotal } from "../itemRows.js";
import useSellingPrices from "../useSellingPrices.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // standard list card — same shell as the Received / Delivered tables
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  // colour only — geometry stays at the usage site
  shadowColor: c.shadow.hairline,
  rounded: "0.5rem",
  // voucher particulars shell — used by the group's item list only
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  hover: c.slate.hover,
  outerBg: c.slate.outerBg,
  scrollbarThumb: c.slate.scrollbarThumb,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
  purple: { bg: c.purple.bg, border: c.purple.border, text: c.purple.text },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  green: { bg: c.green.bg, border: c.green.border, text: c.green.text },
  orange: { text: c.orange.text },
  // Balance banner — same amber wash the voucher page uses
  amber: {
    warnBg: c.amber.warnBg,
    warnBorder: c.amber.warnBorder,
    warnText: c.amber.warnText,
  },
});

const TypeBadge = ({ label, tint }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      px: 0.75,
      py: 0.35,
      borderRadius: "99px",
      background: tint.bg,
      border: `1px solid ${tint.border}`,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: tint.text,
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const EmptyBox = ({ colors, message }) => (
  <Box
    sx={{
      mb: 1.5,
      borderRadius: "10px",
      border: `0.5px solid ${colors.border}`,
      px: 2,
      py: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Typography sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}>
      {message}
    </Typography>
  </Box>
);

// Uppercase title + hairline rule — same shell as the voucher page's
// "Journal Entry Voucher" section label.
const SectionLabel = ({ children, colors }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    <Typography
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        color: colors.gray.textMuted,
      }}
    >
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", background: colors.divider }} />
  </Box>
);

// ─────────────────────────────────────────────────────────────────────
// DIRECTION OF A ROW — decided by the SIGN of nQuantity on the raw item
// (tableRows carries Math.abs, so always read _raw):
//   qty > 0 → received / For Delivery → belongs to a SUPPLIER group
//   qty < 0 → delivered               → belongs to a CLIENT group
// Matching a group by nickname alone is not enough: a client can have
// both delivered batches and not-yet-delivered ones, and both carry the
// same client nickname + company.
// ─────────────────────────────────────────────────────────────────────
const isScopeRow = (r, scope) => {
  const qty = Number(r._raw?.nQuantity ?? 0);
  return scope === "supplier" ? qty > 0 : qty < 0;
};

// ─────────────────────────────────────────────────────────────────────
// PENDING STATUS — never lists single items on its own: every row is a
// GROUP (same supplier / same client WITHIN the same company). The group
// table uses the same CustomTable as Received / Delivered; drilling into
// a group shows that group's items in the voucher particulars layout.
// ─────────────────────────────────────────────────────────────────────
export default function PendingInventory({
  itemsLoading,
  tableRows,
  search,
  setSearch,
  directionFilter,
  handleDirectionFilterChange,
  groupView,
  openGroupView,
  handleRowClick,
  page,
  rowsPerPage,
  handlePageChange,
  handleRowsPerPageChange,
  fetchItems,
  inventoryReceivedLabel,
  inventoryDeliveredLabel,
  // Pending JEVs of the open group (cStatus 'P' only) — fetched and
  // balance-checked by useInventory, which also drives the Finalize button.
  jevList = [],
  // { [nJEVId]: { balanced, loading, message } } — feeds the banner
  jevBalances = {},
  jev_types = {},
  jev_status = {},
  jevPendingKey = "",
  isManagement = false,
  isFinanceOfficer = false,
}) {
  // ✅ Standardized color wiring
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // Last balance message dismissed, per JEV — the banner reappears on its
  // own as soon as that JEV's message changes (same rule as the voucher).
  const [dismissedBal, setDismissedBal] = useState({});

  const cardStyle = {
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.border}`,
    boxShadow: `0 1px 2px ${colors.shadowColor}`,
    borderRadius: colors.rounded,
    overflow: "hidden",
  };
  // JEV fallback — same dashed shell the voucher page uses when a
  // voucher has no journal entry yet.
  const jevEmptySx = {
    py: 3,
    textAlign: "center",
    fontSize: "0.75rem",
    fontStyle: "italic",
    color: colors.gray.textSecondary,
    border: `1px dashed ${colors.border}`,
    borderRadius: "10px",
  };
  const directionOptions = useMemo(
    () => [
      { value: "received", label: inventoryReceivedLabel || "Received" },
      { value: "delivered", label: inventoryDeliveredLabel || "Delivered" },
    ],
    [inventoryReceivedLabel, inventoryDeliveredLabel],
  );

  // One row per supplier (Received) / per client (Delivered),
  // scoped to the COMPANY: same nickname under two companies = two groups.
  // "All" lists every supplier group first, then every client group.
  const groupRows = useMemo(() => {
    const scopes =
      directionFilter === "received"
        ? ["supplier"]
        : directionFilter === "delivered"
          ? ["client"]
          : ["supplier", "client"];

    const rows = [];
    scopes.forEach((scope) => {
      const field =
        scope === "supplier" ? "strSupplierNickName" : "strClientNickName";
      const byKey = new Map();

      tableRows.forEach((r) => {
        // Same nickname, same company — but it also has to be a batch of
        // THIS direction (received rows in a supplier group, delivered
        // rows in a client group) or the group lists foreign items.
        if (!isScopeRow(r, scope)) return;
        const name = r[field] || "—";
        const company = r.strCompanyNickName || "—";
        const key = `${name}\u0000${company}`;
        const qty = Math.abs(Number(r._raw?.nQuantity ?? 0));
        const unitPrice = Number(r._raw?.purchaseOption?.dUnitPrice ?? 0);
        const entry = byKey.get(key) ?? {
          id: `${scope}:${key}`,
          name,
          company,
          scope,
          total: 0,
        };
        entry.total += qty * unitPrice;
        byKey.set(key, entry);
      });

      [...byKey.values()]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) || a.company.localeCompare(b.company),
        )
        .forEach((entry) => rows.push(entry));
    });

    return rows;
  }, [directionFilter, tableRows]);

  const groupColumns = useMemo(() => {
    const nicknameLabel =
      directionFilter === "received"
        ? "Supplier"
        : directionFilter === "delivered"
          ? "Client"
          : "Supplier / Client";

    return [
      {
        key: "name",
        label: nicknameLabel,
        xs: 2.5,
        render: (val, row) => {
          // "All" mixes supplier and client groups, so the badge is the only
          // thing telling the two apart — it rides along with the company.
          const isReceived = row.scope === "supplier";
          const tint = isReceived ? colors.blue : colors.green;

          return (
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight text-gray-500 dark:text-gray-400">
                  {row.company || "—"}
                </span>
                {directionFilter === "all" && (
                  <span
                    className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                    style={{
                      backgroundColor: tint.bg,
                      color: tint.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {isReceived
                      ? inventoryReceivedLabel
                      : inventoryDeliveredLabel}
                  </span>
                )}
              </div>
              <span className="block truncate uppercase tracking-wide text-[0.8125rem] font-medium leading-tight -mt-0.5">
                {val || "—"}
              </span>
            </div>
          );
        },
      },
      {
        key: "total",
        label: "Total Unit Price",
        align: "right",
        render: (val) =>
          `₱${Number(val).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })}`,
      },
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
                openGroupView(row.scope, row.name, row.company);
              }}
            />
          </div>
        ),
      },
    ];
  }, [
    directionFilter,
    colors,
    inventoryReceivedLabel,
    inventoryDeliveredLabel,
    openGroupView,
  ]);

  // Items of the group (same supplier/client AND same company)
  const groupListRows = useMemo(() => {
    if (!groupView) return [];
    const field =
      groupView.scope === "supplier"
        ? "strSupplierNickName"
        : "strClientNickName";
    const company = groupView.company ?? "—";
    return tableRows.filter(
      (r) =>
        // Direction first: a delivered (client) group must not show the
        // received batches that merely share the same client nickname.
        isScopeRow(r, groupView.scope) &&
        (r[field] || "—") === groupView.name &&
        (r.strCompanyNickName || "—") === company,
    );
  }, [groupView, tableRows]);

  const groupListTotal = groupListRows.reduce(
    (sum, r) => sum + itemTotal(r),
    0,
  );

  // Expected total of ONE JEV = the group rows stamped with its nJEVId.
  // bulkCreateJev books the whole group on ONE JEV per direction, so this
  // is normally a single entry covering every row — but it stays keyed by
  // nJEVId so a group with both directions (or legacy per-item JEVs) still
  // caps each JEV against ITS OWN rows, never the whole grand total.
  const jevExpectedTotals = {};
  groupListRows.forEach((r) => {
    const id = r._raw?.nJEVId;
    if (id == null) return;
    const key = String(id);
    jevExpectedTotals[key] = (jevExpectedTotals[key] ?? 0) + itemTotal(r);
  });

  // ── Unit selling prices — delivered groups only ─────────────────────
  // One lookup feeds everything built below: the drill-down table AND the
  // read-only panel inside the entry modal, so opening one after the
  // other never refetches (see useSellingPrices.js — it fetches nothing
  // unless these rows include the delivered side).
  const sellingPrices = useSellingPrices(groupListRows);

  // ── The Items table ─────────────────────────────────────────────────
  // ONE component, three homes (see ItemsTable.jsx):
  //   • the group drill-down — rows open the details panel, ACTIONS shown;
  //   • the JEV entry modal — read-only (a click there would unmount the
  //     very form being filled in) and scoped to THIS JEV's rows, so its
  //     total is exactly what the entries have to square against.
  // The table paints its own colours; this only picks the rows + total.
  const buildItemsTable = ({
    rows = groupListRows,
    total = groupListTotal,
    readonly = false,
  } = {}) => (
    <ItemsTable
      rows={rows}
      total={total}
      readonly={readonly}
      onRowClick={handleRowClick}
      sellingPrices={sellingPrices}
    />
  );

  const filterRow = (
    <section className="flex items-center gap-2 mb-3">
      <div className="flex-grow">
        <CustomSearchField
          label="Search Supplier / Client Nickname"
          value={search}
          onChange={setSearch}
        />
      </div>
      <SyncMenu onSync={() => fetchItems({ bustCache: true })} />
      <FormControlFilter
        value={directionFilter}
        onChange={handleDirectionFilterChange}
        options={directionOptions}
        allLabel="All Type"
      />
    </section>
  );

  // ── The balance banner of ONE JEV ───────────────────────────────────
  // Amber wash, dashed rule, warning icon, message + dismiss — the same
  // banner the voucher page shows. One per JEV, so a group holding several
  // says which one is short and why.
  //
  // It is printed at the VERY TOP of the content (above the items table),
  // not down with its own JEV panel: a balance problem is the first thing
  // to read, whatever else the group holds.
  const balanceBannerFor = (j) => {
    const bal = jevBalances[String(j.nJEVId)];
    const balanceMsg = bal?.message || "";
    if (!balanceMsg || bal.loading) return null;
    if (dismissedBal[String(j.nJEVId)] === balanceMsg) return null;

    return (
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 0.75,
          borderRadius: "8px",
          bgcolor: colors.amber.warnBg,
          border: `1px dashed ${colors.amber.warnBorder}`,
        }}
      >
        <WarningAmberOutlined
          sx={{
            fontSize: "1rem",
            color: colors.amber.warnText,
            flexShrink: 0,
          }}
        />
        <Box
          sx={{
            fontSize: "0.72rem",
            color: colors.amber.warnText,
            lineHeight: 1.4,
            pr: 3,
          }}
        >
          <strong>{balanceMsg}</strong>
        </Box>
        <Box
          component="button"
          onClick={() =>
            setDismissedBal((d) => ({
              ...d,
              [String(j.nJEVId)]: balanceMsg,
            }))
          }
          aria-label="Dismiss banner"
          sx={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            p: 0.4,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: colors.amber.warnText,
          }}
        >
          <CloseOutlined sx={{ fontSize: "0.9rem" }} />
        </Box>
      </Box>
    );
  };

  // ── Group drill-down: every item of this supplier / client
  //    WITHIN this company ────────────────────────────────────────────
  // Voucher particulars layout (sticky header, scroll, Grand Total bar).
  // No toolbar here — search / sync / filters stay on the group list.
  if (groupView) {
    // The banners that have something to say (no message, still loading, or
    // already dismissed → no banner at all).
    const banners = jevList.map((j) => balanceBannerFor(j)).filter(Boolean);

    return (
      <>
        {/* No section labels here — the items table carries its own header
            row and each JEV panel its own header, the same as the voucher
            page. */}

        {/* BALANCE BANNERS — at the very top of the content, above the
            items table. */}
        {banners.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1 }}>
            {banners}
          </Box>
        )}

        {groupListRows.length === 0 ? (
          <EmptyBox colors={colors} message="No items found." />
        ) : (
          buildItemsTable()
        )}

        {/* JEV SECTION — below the item table (voucher-page shell) */}
        {groupListRows.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {jevList.length === 0 ? (
              <Box sx={jevEmptySx}>No JEV Entries</Box>
            ) : (
              jevList.map((j) => {
                // Key of THIS JEV. Its own rows' total is what the Amount
                // field gets prefilled with (particularsGrandTotal below) —
                // but the modal's Items table shows the WHOLE group, never
                // just the rows stamped with this id: a group can hold more
                // than one JEV (one per direction, or legacy per-item ones),
                // so a table scoped to this id could hide a batch the
                // drill-down above it just listed. R/D JEVs are not capped
                // by that figure (see JevViewPanel's handleSaveEntry), so
                // widening the table cannot over-fill anything.
                const jevKey = String(j.nJEVId);

                return (
                <Box
                  key={j.nJEVId}
                  sx={{ mb: 1.5, "&:last-of-type": { mb: 0 } }}
                >
                  {/* No strip here — the JEV panel below carries its own
                      header (number · type · status · toggle), the same one
                      the voucher page shows. The balance banner lives at the
                      TOP of the content, above the items table. */}

                  {/* Same panel the voucher page renders */}
                  <JevViewPanel
                    // entries stripped so the panel reloads them with the
                    // full journal-account paths
                    jev={{ ...j, entries: undefined }}
                    // The cap this JEV's entries may reach — its own rows'
                    // total, which is exactly what the Finalize balance
                    // check holds it against.
                    particularsGrandTotal={
                      jevExpectedTotals[jevKey] ?? groupListTotal
                    }
                    // The entry modal's body is the SAME Items table the
                    // drill-down above renders — every item of this group,
                    // read-only (a row click inside the modal would unmount
                    // the form being filled in). Scoping it to this JEV's
                    // own rows hid the group's other item, which is exactly
                    // what the user had just seen in the table.
                    // The voucher particulars it would fall back to are
                    // always empty outside a voucher.
                    panelTitle="Items"
                    itemsPanel={buildItemsTable({ readonly: true })}
                    jev_types={jev_types}
                    jev_status={jev_status}
                    jevPendingKey={jevPendingKey}
                    isManagement={isManagement}
                    isFinanceOfficer={isFinanceOfficer}
                    isAssigneeType={false}
                    assigneeLinks={[]}
                    supplierLinks={[]}
                    companyName={
                      groupView?.company && groupView.company !== "—"
                        ? groupView.company
                        : null
                    }
                    // The entry modal's horizontal strip (the one the
                    // voucher page shows as Company >>> Supplier) names this
                    // group's two sides:
                    //   For Delivery (supplier scope) : Supplier >>> Company
                    //   Delivered    (client scope)   : Company >>> Client
                    supplierInfo={
                      groupView?.scope === "supplier"
                        ? { strSupplierNickName: groupView.name }
                        : null
                    }
                    clientName={
                      groupView?.scope === "client" ? groupView.name : null
                    }
                    flowType={
                      groupView?.scope === "supplier" ? "received" : "delivered"
                    }
                  />
                </Box>
                );
              })
            )}
          </Box>
        )}
      </>
    );
  }

  // ── Group table — same CustomTable as Received / Delivered ─────────
  return (
    <>
      {filterRow}

      <section style={cardStyle}>
        <CustomTable
          columns={groupColumns}
          rows={groupRows}
          page={page}
          loading={itemsLoading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={(row) =>
            openGroupView(row.scope, row.name, row.company)
          }
          enableSorting={directionFilter !== "all"}
        />
      </section>
    </>
  );
}
