import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  StoreOutlined,
  BusinessOutlined,
  DoubleArrowOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import AccountChainSelect from "../components/AccountChainSelect.jsx";
import {
  AmountPickContext,
} from "../../../../components/ui/form/AmountPick.jsx";
import POListPanel from "../../voucher/components/POListPanel.jsx";
import AssigneeListPanel from "../../voucher/components/AssigneeListPanel.jsx";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";

// ── Helpers ────────────────────────────────────────────────────────────
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const useColors = (c) => ({
  gray: {
    textPrimary: c.gray.textPrimary,
    textMuted: c.gray.textMuted,
  },
  slate: { btnBg: c.slate.btnBg },
  orange: { text: c.orange.text, border: c.orange.border },
  // Red is saveError's ink and the From balance-gate banner.
  red: { text: c.red.text, bg: c.red.bg, border: c.red.border },
});

const ARROW_INDEXES = [0, 1, 2, 3, 4];

function SupplierCompanyBreadcrumb({
  supplierName,
  companyName,
  clientName,
  flowType = "received",
  c,
}) {
  const isDelivered = flowType === "delivered";
  const isVoucher = flowType === "voucher";

  // Left >>> right per flow:
  //   voucher    : Company >>> Supplier / Assignee
  //   received   : Supplier >>> Company  (For Delivery batches)
  //   delivered  : Company >>> Client
  const leftLabel =
    isDelivered || isVoucher ? (companyName ?? "—") : (supplierName ?? "—");
  const rightLabel = isDelivered
    ? (clientName ?? "—")
    : isVoucher
      ? (supplierName ?? "—")
      : (companyName ?? "—");

  const iconSx = { fontSize: "0.85rem", color: c.pendingText, flexShrink: 0 };
  const LeftIcon = isDelivered ? BusinessOutlined : StoreOutlined;
  const RightIcon = isDelivered || isVoucher ? StoreOutlined : BusinessOutlined;

  const labelSx = {
    flex: 1,
    fontSize: "0.58rem",
    fontWeight: 700,
    color: c.pendingText,
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 0.75,
        mb: 1,
        borderRadius: "8px",
        background: c.btnBgDisabled,
        border: `0.5px solid ${c.pendingBorder}`,
        borderLeft: `3px solid ${c.pendingBorder}`,
      }}
    >
      <LeftIcon sx={iconSx} />
      <Typography noWrap sx={labelSx}>
        {leftLabel}
      </Typography>

      <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {ARROW_INDEXES.map((i) => (
          <DoubleArrowOutlined
            key={i}
            sx={{
              fontSize: "0.75rem",
              color: c.pendingText,
              animation: `arrowPulse 1s ease-in-out ${i * 0.15}s infinite`,
              "@keyframes arrowPulse": {
                "0%, 100%": { opacity: 0.15 },
                "50%": { opacity: 1 },
              },
            }}
          />
        ))}
      </Box>

      <Typography noWrap sx={{ ...labelSx, textAlign: "right" }}>
        {rightLabel}
      </Typography>
      <RightIcon sx={iconSx} />
    </Box>
  );
}

/**
 * The JEV entry form — Add Entry / Edit Entry, one journal-account line.
 *
 * Opening contexts (every one hands in its own context):
 *   • JEV entry CRUD — the caller supplies supplierLinks/supplierInfo
 *     (V / C JEVs), itemsPanel (R / D JEVs), logsPanel or assigneeLinks.
 *   • Other JEV (N) — no voucher stands behind it, so no particulars
 *     list is rendered above the fields.
 */
export default function JEVEntryAEModal({
  open,
  onClose,
  side,
  jevActiveKey = "A",
  jevStatus = "",
  editingEntry,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  saving,
  onSave,
  particularsGrandTotal = 0,
  sideTotal = 0,
  equivalentValue = 0,
  usedAccountIds = [],
  isAssigneeType,
  assigneeLinks = [],
  supplierLinks = [],
  logsPanel = null,
  supplierInfo = null,
  // The company behind the voucher — the particulars panel prints it on the
  // same row as the assignee's name.
  companyName = "",
  // The voucher's own number — the particulars panel prints it above the
  // list, exactly as the voucher page does.
  voucherNumber = "",
  flowType = "received",
  // For Collection: the FULL receipt (a CollectionReceiptCard element)
  // printed as the reference panel above the fields while entries are
  // typed in.
  collectionDetailsPanel = null,
  // Non-voucher callers (the inventory Pending JEV screen) hand over
  // their own panel — the items or the logs.
  itemsPanel = null,
  // Save failure, shown under the fields: there is no SUCCESS/ERROR Swal
  // on this save anymore, so the form carries its own message.
  saveError = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => useColors(getThemeColors(isDark)), [isDark]);

  // Latest { isFund, balance, bAllowNegative } reported by AccountChainSelect
  // for the From side. The id is stamped so a lookup from a previously
  // selected/previous-open account can never guard the current one.
  const [accountMeta, setAccountMeta] = useState(null);

  // Drop the previous open's guard metadata while the modal is closed, so
  // reopening the same account cannot show a stale balance for a frame.
  useEffect(() => {
    if (!open) setAccountMeta(null);
  }, [open]);

  // The clickable navigations (the PO numbers in the particulars list) are
  // finance / management only — every other role reads them as plain text.
  const { isManagement, isFinanceOfficer } = useKeysLabels();
  const canNavigate = isFinanceOfficer || isManagement;

  // ── Remaining on this side — only used to pre-fill the Amount field ──
  // Amounts are never capped and nothing is shown in the label: the single
  // rule for finalizing a JEV is that the particulars total, the "From"
  // total and the "To" total are all equal.
  const remainingAmount = useMemo(() => {
    const grandTotal = Number(particularsGrandTotal) || 0;
    const currentTotal = Number(sideTotal) || 0;
    const editingAmount = editingEntry
      ? Math.abs(Number(editingEntry.dAmount || 0))
      : 0;
    return Math.max(0, round2(grandTotal - (currentTotal - editingAmount)));
  }, [particularsGrandTotal, sideTotal, editingEntry]);

  // ── Reset on open (new entry) ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editingEntry) return;

    const eq = Number(equivalentValue) || 0; // Cost of Goods
    const current = Number(sideTotal) || 0;
    const isDelivered = flowType === "delivered";

    // Cost of Goods goes first, then the remainder (Sales Revenue).
    // Delivered: both sides. Other flows: "from" side only.
    const splitFirst =
      eq > 0 && current < eq && (side === "from" || isDelivered);

    const firstChunk = splitFirst ? round2(eq - current) : remainingAmount;
    const initialValue = Math.max(0, Math.min(firstChunk, remainingAmount));

    setFormData({
      nJournalAccountId: "",
      journalAccount: null,
      amount: initialValue > 0 ? initialValue.toFixed(2) : "",
    });
  }, [
    open,
    editingEntry,
    remainingAmount,
    equivalentValue,
    sideTotal,
    side,
    flowType,
    setFormData,
  ]);

  const formRef = useRef(null);

  // ── Account uniqueness ───────────────────────────────────────────────
  // Only ONE usage per side: an account already on this side is rejected,
  // but the same account may be used again on the opposite side.
  const validateAccountIsUnique = useCallback(
    (accountId) => {
      if (!accountId) return "";
      const id = Number(accountId);
      const editingId = editingEntry?.nJournalAccountId
        ? Number(editingEntry.nJournalAccountId)
        : null;

      if (
        usedAccountIds.some((u) => Number(u) === id && Number(u) !== editingId)
      )
        return "This account is already used on this side — please choose a different one.";

      return "";
    },
    [usedAccountIds, editingEntry],
  );

  useEffect(() => {
    const accountId = formData.nJournalAccountId;
    setFormErrors?.((prev) => ({
      ...prev,
      nJournalAccountId: accountId ? validateAccountIsUnique(accountId) : "",
    }));
  }, [formData.nJournalAccountId, validateAccountIsUnique, setFormErrors]);

  // ── Click-to-fill ─────────────────────────────────────────────────────
  // Any money figure in the panel above (particulars / items / assignees)
  // can be clicked into Amount — same digits the field accepts itself, so
  // its own validation still has the last word. A stale "Amount must be >
  // 0" from an earlier save attempt goes away with the fill that fixes it.
  const pickAmount = useCallback(
    (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      setFormData((prev) => ({
        ...prev,
        amount: (Math.round(n * 100) / 100).toFixed(2),
      }));
      setFormErrors?.((prev) => (prev?.amount ? { ...prev, amount: "" } : prev));
    },
    [setFormData, setFormErrors],
  );

  // ── From balance gate ────────────────────────────────────────────────
  // The From side may only spend a fund branch's ACTIVE balance when the
  // fund's bAllowNegative is true/1 (per the business rule: that switch is
  // the gate). To entries never guard. The id stamp in accountMeta keeps a
  // lookup for a previous account from ever guarding the current one.
  const selectedAccountId = Number(formData.nJournalAccountId) || 0;
  const currentAccountMeta =
    accountMeta && accountMeta.nJournalAccountId === selectedAccountId
      ? accountMeta
      : null;
      
  // Only guard account if bAllowNegative is explicitly false.
  // If bAllowNegative is true (or undefined), it's allowed.
  const fromGuardAccount =
    side === "from" &&
    selectedAccountId > 0 &&
    currentAccountMeta?.isFund === true &&
    currentAccountMeta?.bAllowNegative === false;

  // The balance already contains an ACTIVE entry being edited, so add that
  // entry's amount back before comparing. A pending/cancelled JEV is not in
  // the balance, so its old amount must stay out of the available figure.
  const currentJevIsActive =
    String(editingEntry?.jev?.cStatus ?? jevStatus ?? "").trim() ===
    String(jevActiveKey ?? "").trim();

  // If we are editing, we are "releasing" the current amount back into the balance
  // for the purpose of this check.
  const editingAmount = editingEntry && currentJevIsActive 
    ? Math.abs(Number(editingEntry.dAmount) || 0) 
    : 0;

  // Enforce strict balance: if currentAccountMeta.balance is negative, available balance is 0.
  const availableFromBalance = !fromGuardAccount
    ? null
    : round2(
        Math.max(0, (Number(currentAccountMeta.balance) || 0) + editingAmount)
      );

  const amountValue = Number(formData.amount) || 0;
  
  // The threshold is the available balance PLUS the amount currently being edited 
  // (which we already added to availableFromBalance).
  // If the user inputs more than availableFromBalance, it's invalid.
  const insufficientFromBalance =
    availableFromBalance != null &&
    amountValue > 0 &&
    Math.round(amountValue * 100) > Math.round(availableFromBalance * 100);

  // Block the save if the balance is insufficient
  const isBalanceInvalid = fromGuardAccount && insufficientFromBalance;

  // ── Input handling ───────────────────────────────────────────────────
  const handleChange = useCallback(
    ({ target: { name, value } }) => {
      if (name === "amount") {
        // digits + one decimal point, max 2 decimals (no upper limit)
        let s = String(value ?? "").replace(/[^0-9.]/g, "");
        const parts = s.split(".");
        if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
        const [int, dec] = s.split(".");
        if (dec !== undefined) s = `${int}.${dec.slice(0, 2)}`;

        // Only enforce clamping if it's a guarded account
        // if (fromGuardAccount && availableFromBalance != null) {
        //   const numVal = Number(s) || 0;
        //   // If balance is negative, force amount to 0
        //   const limit = Math.max(0, availableFromBalance);
        //   if (numVal > limit) {
        //     s = limit.toFixed(2);
        //   }
        // }

        setFormData((prev) => ({ ...prev, amount: s }));
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [setFormData, fromGuardAccount, availableFromBalance],
  );

  // ── Fields ───────────────────────────────────────────────────────────
  const accountError = formErrors.nJournalAccountId;

  const handleAccountChange = useCallback(
    (id, meta) => {
      setFormData((prev) => ({ ...prev, nJournalAccountId: id }));
      setAccountMeta(
        meta && id ? { ...meta, nJournalAccountId: Number(id) } : null,
      );
    },
    [setFormData],
  );

  // We need to inject the insufficient balance warning into the form
  // when FormGrid is used. Since FormGrid doesn't have an "alert" slot,
  // we add it to the formFields as a custom component if it exists.
  const formFields = useMemo(() => {
    const fields = [
      {
        name: "nJournalAccountId",
        label: "Account Title",
        type: "custom",
        xs: 12,
        render: () => (
          <AccountChainSelect
            value={formData.nJournalAccountId}
            preloadedAccount={formData.journalAccount}
            jevActiveKey={jevActiveKey}
            side={side}
            onChange={handleAccountChange}
            error={accountError}
            resolveFundInfo={side === "from"}
            autoFocusMenu
          />
        ),
      },
      {
        name: "amount",
        label: "Amount",
        type: "peso",
        xs: 12,
      },
    ];

    if (insufficientFromBalance) {
      fields.splice(1, 0, {
        name: "balance_alert",
        type: "custom",
        xs: 12,
        render: () => (
          <Box
            role="alert"
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0.75,
              px: 1,
              py: 0.75,
              mb: 0.75,
              borderRadius: "8px",
              background: colors.red.bg,
              border: `0.5px solid ${colors.red.border}`,
            }}
          >
            <WarningAmberOutlined
              sx={{
                fontSize: "0.9rem",
                color: colors.red.text,
                flexShrink: 0,
                mt: "1px",
              }}
            />
            <Typography
              sx={{
                fontSize: "0.62rem",
                fontWeight: 600,
                lineHeight: 1.45,
                color: colors.red.text,
              }}
            >
              {availableFromBalance >= 0
                ? `Insufficient fund balance — ${fmtPHP(availableFromBalance)} available`
                : `Insufficient fund balance — Negative limit exceeded — ${fmtPHP(Math.abs(availableFromBalance))} available`
              }
            </Typography>
          </Box>
        ),
      });
    }

    return fields;
  }, [formData.nJournalAccountId, formData.journalAccount, jevActiveKey, side, handleAccountChange, accountError, insufficientFromBalance, availableFromBalance, amountValue, colors.red.bg, colors.red.border, colors.red.text]);

  // A From account whose metadata is still resolving cannot be checked yet —
  // keep its save button closed until the answer arrives.
  const fromGuardPending =
    side === "from" && selectedAccountId > 0 && currentAccountMeta == null;

  const errors = { ...formErrors };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={editingEntry ? "Edit Entry" : "Add Entry"}
      subTitle={side === "from" ? "Debit" : "Credit"}
      saveLabel={editingEntry ? "Update Entry" : "Save Entry"}
      onSave={onSave}
      cancelLabel="Back"
      onCancel={onClose}
      loading={saving}
      disabled={
        !!formErrors.nJournalAccountId ||
        fromGuardPending ||
        insufficientFromBalance
      }
    >
      <AmountPickContext.Provider value={pickAmount}>
        <Box sx={{ px: 0.5, py: 0.5 }}>
          {/* No flow guide (the company ➜ supplier strip) and no section
              label here — the particulars below already say who this is and
              what it covers. */}
          {logsPanel ? (
            <Box sx={{ mb: 1 }}>{logsPanel}</Box>
          ) : itemsPanel ? (
            <Box sx={{ mb: 1 }}>{itemsPanel}</Box>
          ) : collectionDetailsPanel ? (
            /* For Collection — the full receipt (company header, amount in
               words, deduction ledger, client info and the payment-for
               line) so the figures are visible while the entry amounts are
               typed in. */
            <Box sx={{ mb: 1 }}>
              {collectionDetailsPanel}
            </Box>
          ) : isAssigneeType ? (
            <AssigneeListPanel
              assigneeLinks={assigneeLinks}
              voucher={{ strNumber: voucherNumber }}
              companyName={companyName}
            />
          ) : supplierLinks.length > 0 ? (
            /* The same particulars the voucher page shows — the supplier's
               name, address and TIN travel with the links, so the list is
               not a bare list of PO numbers here.

               An Other JEV (N) has NO voucher behind it, so it gets
               nothing here — an empty "No purchase orders linked."
               panel would only confuse. */
            <POListPanel
              supplierLinks={supplierLinks}
              isJEVPage
              voucherNumber={voucherNumber}
              // The PO numbers only jump to purchasing for finance and
              // management — the same rule the viewer modal applies.
              navigable={canNavigate}
              supplierNickName={
                supplierInfo?.strSupplierNickName ??
                supplierInfo?.strSupplierName ??
                ""
              }
              supplierAddress={supplierInfo?.strAddress ?? ""}
              supplierTIN={supplierInfo?.strTIN ?? ""}
            />
          ) : null}
          <Box ref={formRef}>
            {/* Error banner for balance/total cap issues moved from FormGrid render */}
            {/* The individual field error message (formErrors.amount) remains visible */}

            <FormGrid
              fields={formFields}
              switches={[]}
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              // The Account Title menu focuses itself on open — don't let
              // FormGrid pull focus to the Amount field 300ms later.
              autoFocus={false}
            />
          </Box>
        </Box>
      </AmountPickContext.Provider>
    </ModalContainer>
  );
}
