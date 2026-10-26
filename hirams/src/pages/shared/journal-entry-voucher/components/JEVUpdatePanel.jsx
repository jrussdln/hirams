import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { WarningAmberOutlined, CloseOutlined } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import JevViewPanel from "./JEVViewPanel.jsx";
import Skeleton from "./Skeleton.jsx";
import POListPanel from "../../voucher/components/POListPanel.jsx";
import AssigneeListPanel from "../../voucher/components/AssigneeListPanel.jsx";
import ItemsTable from "../../inventory/component/ItemsTable.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const makeColors = (c) => ({
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  red: { text: c.red.text },
  // Amber warning tint for the unbalanced-JEV banner — the same trio
  // JevViewSection paints its balance banner with.
  amber: {
    warnBg: c.amber.warnBg,
    warnBorder: c.amber.warnBorder,
    warnText: c.amber.warnText,
  },
});

// ── JEVUpdatePanel — the /jev-update page's CONTENT, as a component ──────
// The full-page viewer (JEVUpdateView) consumes this, but so can any other
// host: feed it the return of useJEVUpdate() (that hook takes an optional
// jevId override, so a host does NOT need the /jev-update URL to use it) —
// or hand-build the props it names below.
//
// What it renders, top to bottom:
//   • the loading skeleton / the could-not-load note,
//   • the unbalanced-JEV banner (dismissable, with the Pending-on-leave
//     note when its kind of JEV demotes),
//   • the voucher's Particulars (V / C types) or the inventory Items
//     table (R / D types) — JEVEntryAEModal's very same blocks,
//   • JevViewPanel, the journal's entries with its own built-in entry
//     form path.
//
// NOT in here: the PageLayout chrome and the Back / Finalize buttons —
// those belong to the page that hosts the panel (see JEVUpdateView).
export default function JEVUpdatePanel({
  // The hook's state — page-level loading (JEV + voucher + inventory).
  loading,
  jev,
  jevId,
  // Mappings for the panel header (keys → words).
  jev_types,
  jev_status,
  jevPendingKey,
  // Roles — entry CRUD (Management / Finance Officer) and the blue
  // navigation links (DV code, brand · model).
  canManage,
  canNavigate,
  isManagement,
  isFinanceOfficer,
  // Voucher particulars (V / C types).
  showParticulars,
  isAssigneeType,
  assigneeLinks,
  supplierLinks,
  voucher,
  voucherNumber,
  supplierNickName,
  supplierAddress,
  supplierTIN,
  itemRows,
  itemsTotal,
  sellingPrices,
  isReceivedSide,
  // Balance banner state.
  balance,
  showBalanceBanner,
  dismissBalanceMsg,
  willDemoteOnLeave,
  // Finalize state — entry controls are withheld once the JEV left Pending.
  isPendingJev,
  // Navigations.
  openVoucher,
  openTransactionForPurchase,
  openInventoryRowTransaction,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => makeColors(getThemeColors(isDark)), [isDark]);

  // ── The Items block — the batches an inventory JEV covers ────────────
  // Built once, shown twice: on the page itself, and handed to
  // JevViewPanel as itemsPanel so the Add / Edit Entry modal shows the
  // SAME table for R/D JEVs (Received Purchases / Delivered Items)
  // instead of an empty particulars list.
  const itemsTable =
    itemRows.length > 0 ? (
      <ItemsTable
        rows={itemRows}
        total={itemsTotal}
        sellingPrices={sellingPrices}
        // Received batches are priced at COST: a batch that has since gone
        // out still belongs in this table, but the selling columns stay
        // the delivered side's own.
        showSellingOverride={isReceivedSide ? false : null}
        /* The PO code (header card AND every delivered row) follows the
           same rule as the PO list above: management clicks, finance reads
           plain text. */
        poNavigable={isManagement}
        // The brand · model opens the transaction the batch was bought on
        // — management only (finance reads plain text, same as the PO
        // card above).
        onBrandClick={isManagement ? openInventoryRowTransaction : undefined}
      />
    ) : null;

  return (
    <>
      {/* ── Loading — the panel sketched before its data lands ──────────
          Dressed as the JEV panel itself (header strip, From / To
          columns, total band), so the page never reads as an opaque
          label. Renders only while the initial fetches run AND the JEV
          itself has not landed yet; gathered blocks (voucher
          particulars, items, entries) then appear as each one arrives. */}
      {loading && !jev && jevId && <Skeleton />}

      {!jev && !loading && (
        <Typography
          sx={{
            py: 4,
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.red.text,
          }}
        >
          That JEV could not be loaded. It may have been deleted — go back
          and try again.
        </Typography>
      )}

      {jev && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* ── Unbalanced JEV ──────────────────────────────────────
              Flagged the moment this JEV's From and To sides don't
              square, whichever way it was opened. Sits above everything
              so it is the first thing seen, and clears itself as soon
              as an entry lands (the hook re-checks on every entry
              event). */}
          {showBalanceBanner && (
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 4,
                py: 0.75,
                mb: 1,
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
                }}
              >
                <strong>{balance.message}</strong>
                {/* The rule in the reader's face: only an ACTIVE JEV is
                    ever demoted, so the note is printed for that status
                    alone — the same `willDemoteOnLeave` check the Back
                    button runs. */}
                {willDemoteOnLeave && (
                  <Box
                    component="span"
                    sx={{ display: "block", mt: 0.5, fontWeight: 500 }}
                  >
                    Leaving this page while its entries stay unbalanced will
                    automatically set its status to{" "}
                    <strong>Pending</strong>.
                  </Box>
                )}
              </Box>
              <Box
                component="button"
                onClick={dismissBalanceMsg}
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
          )}

          {/* ── Particulars — same block as VoucherUpdateView. No label
              here: the list carries its own header (voucher number ·
              supplier) and its own grand total. */}
          {showParticulars && (
            <Box>
              {isAssigneeType ? (
                <AssigneeListPanel
                  assigneeLinks={assigneeLinks}
                  voucher={voucher}
                  // The DV code opens the voucher itself — the same link
                  // the supplier's PO card carries.
                  onVoucherClick={
                    canNavigate && voucher?.nVoucherId ? openVoucher : undefined
                  }
                />
              ) : (
                /* The same particulars the voucher page shows — the
                   voucher's number, the supplier's name, its address and
                   its TIN, so the card reads the same here (and a voucher
                   with several POs collapses into its compact list,
                   exactly as it does there). */
                <POListPanel
                  supplierLinks={supplierLinks}
                  voucherNumber={voucherNumber}
                  supplierNickName={supplierNickName}
                  supplierAddress={supplierAddress}
                  supplierTIN={supplierTIN}
                  // The DV code opens the voucher itself — finance and
                  // management only, like every navigation.
                  onVoucherClick={
                    canNavigate && voucher?.nVoucherId ? openVoucher : undefined
                  }
                  // The brand · model opens the transaction the item
                  // belongs to — like the PO number it now follows the
                  // voucher page's rule: management clicks, finance and
                  // the rest read plain text.
                  onBrandClick={
                    isManagement ? openTransactionForPurchase : undefined
                  }
                  navigable={isManagement}
                />
              )}
            </Box>
          )}

          {/* ── Items — the batches an inventory JEV covers (a D JEV:
              its whole delivered group, as the entry modal shows). No
              label: the table carries its own header card and its own
              grand total. ── */}
          {itemRows.length > 0 && <Box>{itemsTable}</Box>}

          {/* ── The JEV itself ────────────────────────────────────── */}
          <Box>
            {/* The panel below carries its own header (JEV number ·
                status · JOURNAL ENTRY VOUCHER · type), so no label here. */}
            <JevViewPanel
              key={jev.nJEVId}
              jev={jev}
              // The type and status, in words — the header must never
              // print the raw "V" / "A" codes.
              jev_types={jev_types}
              jev_status={jev_status}
              jevPendingKey={jevPendingKey}
              // The amount this JEV's entries must reconcile against —
              // the same figure the Items block prints as its total
              // (for a D JEV: the delivered group's, which the panel
              // never caps an R/D entry with anyway).
              particularsGrandTotal={itemsTotal}
              // Entry CRUD, Management / Finance Officer only. With the
              // roles off the panel renders no Add / Edit / Delete
              // Entry at all.
              isManagement={canManage ? isManagement : undefined}
              isFinanceOfficer={canManage ? isFinanceOfficer : undefined}
              // …and only while the journal is still PENDING: the moment
              // it is finalized (Active) the gate is withheld, the panel's
              // own pending-only rule kicks in, and the journal renders
              // read-only — no Add / Edit / Delete Entry, no EDIT TITLE.
              // Undo Finalize on this page returns the controls.
              entryStatusGate={canManage && isPendingJev ? "all" : undefined}
              // The voucher's own particulars, loaded in the hook —
              // handed on so the Add / Edit Entry form shows the real
              // thing instead of an empty panel.
              isAssigneeType={isAssigneeType}
              assigneeLinks={assigneeLinks}
              supplierLinks={supplierLinks}
              // The voucher's identity, handed on so the Add / Edit
              // Entry form's particulars card reads the same as the
              // block above (voucher number · supplier · address · TIN).
              voucherNumber={voucherNumber}
              supplierInfo={
                isAssigneeType
                  ? null
                  : {
                      strSupplierNickName: supplierNickName,
                      strAddress: supplierAddress,
                      strTIN: supplierTIN,
                    }
              }
              // The Items table above, handed on: for R/D JEVs the Add /
              // Edit Entry modal shows the same blocks the page shows.
              itemsPanel={itemsTable}
            />
          </Box>
        </Box>
      )}
    </>
  );
}
