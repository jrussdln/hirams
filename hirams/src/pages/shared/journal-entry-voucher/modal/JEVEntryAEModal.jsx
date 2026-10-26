import { useEffect, useCallback, useMemo, useRef } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  StoreOutlined,
  BusinessOutlined,
  DoubleArrowOutlined,
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

// ── Helpers ────────────────────────────────────────────────────────────
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const useColors = (c) => ({
  gray: {
    textPrimary: c.gray.textPrimary,
    textMuted: c.gray.textMuted,
  },
  slate: { btnBg: c.slate.btnBg },
  orange: { text: c.orange.text, border: c.orange.border },
  // To/From balance line: red while the sides differ, green once they match
  red: { text: c.red.text },
  green: { text: c.green.text },
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
  oppositeSideAccountIds = [],
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
  // Non-voucher callers (the inventory Pending JEV screen) hand over
  // their own panel — the items or the logs.
  itemsPanel = null,
  // To/From state for R/D JEVs — informational only. It is deliberately
  // NOT written into formErrors, so Save Entry is never blocked by it.
  balanceHint = null,
  // Save failure, shown under the fields: there is no SUCCESS/ERROR Swal
  // on this save anymore, so the form carries its own message.
  saveError = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => useColors(getThemeColors(isDark)), [isDark]);

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
        return "This account is already used — please choose a different one.";

      if (oppositeSideAccountIds.some((o) => Number(o) === id))
        return "This account already exists on the other side — cannot use same account.";

      return "";
    },
    [usedAccountIds, oppositeSideAccountIds, editingEntry],
  );

  useEffect(() => {
    const accountId = formData.nJournalAccountId;
    setFormErrors?.((prev) => ({
      ...prev,
      nJournalAccountId: accountId ? validateAccountIsUnique(accountId) : "",
    }));
  }, [formData.nJournalAccountId, validateAccountIsUnique, setFormErrors]);

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
        setFormData((prev) => ({ ...prev, amount: s }));
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [setFormData],
  );

  // Account picked
  const handleAccountChange = useCallback(
    (id) => {
      setFormData((prev) => ({ ...prev, nJournalAccountId: id }));
    },
    [setFormData],
  );

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

  // ── Fields ───────────────────────────────────────────────────────────
  const accountError = formErrors.nJournalAccountId;

  const formFields = [
    {
      name: "account_wrapper",
      type: "custom",
      label: "Account Title",
      xs: 12,
      render: () => (
        <Box sx={{ mb: 0.5 }}>
          <AccountChainSelect
            value={formData.nJournalAccountId}
            preloadedAccount={formData.journalAccount}
            jevActiveKey={jevActiveKey}
            side={side}
            onChange={handleAccountChange}
            error={accountError}
            // This modal never reads { isFund, balance }, so skip the fund
            // lookup: the account is committed the moment it is picked.
            resolveFundInfo={false}
          />
        </Box>
      ),
    },
    {
      name: "amount",
      label: "Amount",
      type: "peso",
      xs: 12,
      placeholder: "0.00",
    },
  ];

  const errors = { ...formErrors };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={editingEntry ? "Edit Entry" : "Add Entry"}
      subTitle={side === "from" ? "From" : "To"}
      saveLabel={editingEntry ? "Update Entry" : "Save Entry"}
      onSave={onSave}
      cancelLabel="Back"
      onCancel={onClose}
      loading={saving}
      disableSave={!!formErrors.nJournalAccountId}
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
            <FormGrid
              fields={formFields}
              switches={[]}
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              autoFocus={true}
            />

            {/* ── To / From state (R and D JEVs) ──────────────────────────
                Shown in the wording of the old cap but purely informative:
                it never lands in `errors`, so Save Entry is never blocked.
                The Finalize button is what refuses an unbalanced JEV. */}
            {balanceHint && (
              <Typography
                sx={{
                  px: 0.5,
                  mt: 0.75,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  color: balanceHint.balanced
                    ? colors.green.text
                    : colors.red.text,
                }}
              >
                {balanceHint.text}
              </Typography>
            )}

            {/* Save failure — the only feedback now that there is no Swal */}
            {saveError && (
              <Typography
                sx={{
                  px: 0.5,
                  mt: 0.75,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  color: colors.red.text,
                }}
              >
                {saveError}
              </Typography>
            )}
          </Box>
        </Box>
      </AmountPickContext.Provider>
    </ModalContainer>
  );
}
