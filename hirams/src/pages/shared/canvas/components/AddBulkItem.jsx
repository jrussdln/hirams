import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, TextField, Alert } from "@mui/material";
import { ArrowBack, Save, DeleteOutline, Add } from "@mui/icons-material";
import PageLayout from "../../../../components/layouts/page/content-page";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import { validateFormData } from "../../../../utils/form/validation";
import TransactionAPI from "../../../../api/endpoints/transaction.api.js";
import TransactionItemAPI from "../../../../api/endpoints/transaction-item.api.js";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal";
import DataTable from "../../../../components/ui/form/DataTable";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ─────────────────────────────────────────────────────────────────
// INLINE COLOR MAP — per-file useColors pattern (PROMPT 1)
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Input field states
  inputBg: c.gray.inputBg,
  inputFocusBg: c.gray.inputFocusBg,

  // Error state
  errorBg: c.red.bg,
  errorBorder: c.red.border,
  errorBorderStrong: c.red.borderStrong,
  errorText: c.red.text,
  errorTextStrong: c.red.textDark,

  // Filled/valid state (amber)
  filledBg: c.amber.bg,
  filledBorder: c.amber.border,
  filledBorderStrong: c.amber.borderStrong,
  filledText: c.amber.text,
  filledTextStrong: c.amber.textDark,

  // ABC field — teal
  abcBg: c.teal.bg,
  abcBorder: c.teal.border,
  abcBorderStrong: c.teal.borderStrong,
  abcText: c.teal.text,
  abcTextStrong: c.teal.textStrong,

  // Neutral text hierarchy
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  textDisabled: c.gray.textDisabled,

  // Slate — borders, rows, hovers
  border: c.slate.border,
  borderLight: c.slate.borderLight,
  rowBgFilled: c.amber.bgSoft,
  rowBgEmpty: c.slate.outerBg,

  // Delete button
  deleteHoverBg: c.red.bgSoft,
  deleteHoverBorder: c.red.border,

  // Summary text
  tealTextStrong: c.teal.textStrong,
  blueTextStrong: c.blue.textStrong,
});

/* ── Helpers ── */
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const EMPTY_ROW = () => ({
  id: genId(),
  name: "",
  qty: "",
  uom: "",
  abc: "",
  specs: "",
});

/* ── Field styles ── */
// autoHeight: for the multiline fields (Item Name / Specifications).
// The fixed 30px below is fine for single-line inputs, but it would clip a
// wrapped value — those two fields have to grow with their text instead.
const fieldSx = ({ hasValue, isError, colors, autoHeight = false }) => ({
  width: "100%",
  minWidth: 0,
  "& .MuiInputBase-root": {
    fontSize: "0.75rem",
    ...(autoHeight
      ? { height: "auto", alignItems: "flex-start" }
      : { height: "30px" }),
    borderRadius: "5px",
    backgroundColor: isError
      ? colors.errorBg
      : hasValue
        ? colors.filledBg
        : colors.inputBg,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: isError
      ? colors.errorBorder
      : hasValue
        ? colors.filledBorder
        : colors.borderLight,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: isError
      ? colors.errorBorderStrong
      : hasValue
        ? colors.filledBorderStrong
        : colors.blueTextStrong,
  },
  "& .MuiInputBase-input": {
    padding: "4px 7px",
    fontWeight: hasValue ? 600 : 400,
    fontSize: "0.75rem",
    color: isError
      ? colors.errorTextStrong
      : hasValue
        ? colors.filledTextStrong
        : colors.textSecondary,
  },
});

const abcFieldSx = ({ hasValue, isError = false, colors }) => ({
  width: "100%",
  "& .MuiInputBase-root": {
    fontSize: "0.75rem",
    height: "30px",
    borderRadius: "5px",
    backgroundColor: isError
      ? colors.errorBg
      : hasValue
        ? colors.abcBg
        : colors.inputBg,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: isError
      ? colors.errorBorder
      : hasValue
        ? colors.abcBorder
        : colors.borderLight,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: isError
      ? colors.errorBorderStrong
      : hasValue
        ? colors.abcBorderStrong
        : colors.blueTextStrong,
  },
  "& .MuiInputBase-input": {
    padding: "4px 7px",
    fontWeight: hasValue ? 600 : 400,
    fontSize: "0.75rem",
    color: isError
      ? colors.errorTextStrong
      : hasValue
        ? colors.abcTextStrong
        : colors.textSecondary,
    textAlign: "right",
  },
});

const FieldError = ({ msg, colors }) =>
  msg ? (
    <Typography
      sx={{
        fontSize: "0.6rem",
        color: colors.errorTextStrong,
        mt: 0.3,
        lineHeight: 1.2,
      }}
    >
      {msg}
    </Typography>
  ) : null;

// ── Scenario-aware row validation ──────────────────────────────────────────
const validateRow = (row, transactionHasABC, totalItemsABC) => {
  const result = validateFormData(
    { name: row.name, qty: row.qty, uom: row.uom, specs: row.specs },
    "TRANSACTION_ITEM",
  );
  delete result.abc;

  const itemABC = Number(row.abc || 0);

  // Scenario 2: No transaction ABC → each item MUST have ABC
  if (!transactionHasABC) {
    if (!row.abc || itemABC <= 0)
      result.abc = "ABC is required when transaction has no total ABC";
  }

  // Scenario 1: Has transaction ABC AND other items already have ABC → this item must also have ABC
  if (transactionHasABC && totalItemsABC > 0) {
    if (!row.abc || itemABC <= 0)
      result.abc = "ABC is required since other items have ABC values";
  }

  // Scenario 3: Has transaction ABC + no item ABC → abc is optional, no error

  return result;
};

/* ── Main Component ── */
function AddBulkItem() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const { state } = useLocation();
  const navigate = useNavigate();
  const { currentStatusLabel, transaction } = state || {};

  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);
  const [existingItemsABC, setExistingItemsABC] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [rowErrors, setRowErrors] = useState({});

  const transactionHasABC =
    transaction?.dTotalABC && Number(transaction.dTotalABC) > 0;

  const handleChange = useCallback(
    (id, field, value) => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === id);
        const updated = prev.map((r) =>
          r.id === id ? { ...r, [field]: value } : r,
        );
        if (idx === prev.length - 1 && value.trim() !== "")
          return [...updated, EMPTY_ROW()];
        return updated;
      });
      if (submitted) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: { ...(prev[id] || {}), [field]: undefined },
        }));
      }
    },
    [submitted],
  );

  const handleDelete = useCallback((id) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      const last = filtered[filtered.length - 1];
      const lastHasValue =
        last && (last.name || last.qty || last.uom || last.abc || last.specs);
      return filtered.length === 0 || lastHasValue
        ? [...filtered, EMPTY_ROW()]
        : filtered;
    });
    setRowErrors((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
  }, []);

  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    TransactionAPI.getItems(transaction.nTransactionId)
      .then((res) => {
        const sum = (res.items || []).reduce(
          (s, item) => s + Number(item.abc || 0),
          0,
        );
        setExistingItemsABC(sum);
      })
      .catch(() => {});
  }, [transaction?.nTransactionId]);

  const filledRows = rows.filter(
    (r) => r.name || r.qty || r.uom || r.abc || r.specs,
  );

  const newItemsABC = filledRows.reduce((s, r) => s + (Number(r.abc) || 0), 0);
  const totalABC = existingItemsABC + newItemsABC;
  const txnABC = Number(transaction?.dTotalABC || 0);

  // Exceeds check — over is always bad, blocks save
  const abcExceedsTransaction = transactionHasABC && totalABC > txnABC;

  // Scenario 1: Has txn ABC + items have ABC → warn if under, but still allow save
  const abcUnderTransaction =
    transactionHasABC && totalABC > 0 && totalABC < txnABC;

  // Scenario 2: No txn ABC → all filled rows must have ABC
  const missingItemABC =
    !transactionHasABC && filledRows.some((r) => !r.abc || Number(r.abc) <= 0);

  // ABC required when: no txn ABC (scenario 2) OR txn ABC exists but items already have ABC (scenario 1)
  const abcIsRequired = !transactionHasABC || existingItemsABC > 0;

  const runValidation = () => {
    const newErrors = {};
    let allValid = true;
    for (const row of filledRows) {
      const errs = validateRow(row, transactionHasABC, existingItemsABC);
      if (Object.keys(errs).length > 0) {
        newErrors[row.id] = errs;
        allValid = false;
      }
    }
    setRowErrors(newErrors);
    return allValid;
  };

  const hasAnyRowError = Object.values(rowErrors).some(
    (e) => e && Object.keys(e).filter((k) => e[k]).length > 0,
  );

  const handleSave = async () => {
    setSubmitted(true);
    if (filledRows.length === 0 || !runValidation()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await withSpinner("Bulk Items", async () => {
        await TransactionItemAPI.createBulk(transaction?.nTransactionId, {
          items: filledRows.map((r) => ({
            strName: r.name,
            nQuantity: Number(r.qty),
            strUOM: r.uom,
            dUnitABC: r.abc ? Number(r.abc) : 0,
            strSpecs: r.specs,
          })),
        });
      });
      await showSwal("SUCCESS", {}, { entity: "Bulk Items", action: "added" });
      navigate(-1);
    } catch {
      setSaveError("Failed to save items. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Save button disable + tooltip ──────────────────────────────────────
  const saveIsDisabled =
    saving ||
    filledRows.length === 0 ||
    abcExceedsTransaction ||
    missingItemABC;

  const saveTooltip =
    filledRows.length === 0
      ? "Add at least one item before saving"
      : abcExceedsTransaction
        ? `Total ABC (${fmtPHP(totalABC)}) exceeds Transaction ABC (${fmtPHP(txnABC)})`
        : missingItemABC
          ? "All items must have an ABC value when transaction has no total ABC"
          : submitted && hasAnyRowError
            ? "Fix validation errors before saving"
            : "";

  /* ── Column definitions for DataTable ── */
  const columns = [
    {
      key: "index",
      label: "#",
      xs: 0.5,
      headerAlign: "center",
      align: "center",
      hideBorder: false,
      render: (row, i) => {
        const isLast = i === rows.length - 1;
        return isLast ? (
          <Add sx={{ fontSize: "0.85rem", color: colors.textDisabled }} />
        ) : (
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: colors.textMuted,
            }}
          >
            {i + 1}
          </Typography>
        );
      },
    },
    {
      key: "name",
      label: "Item Name *",
      xs: 3,
      required: true,
      align: "left",
      cellSxExtra: { px: 0.5, alignItems: "flex-start", py: 0.75 },
      render: (row, i) => {
        const e = rowErrors[row.id] || {};
        return (
          <Box sx={{ width: "100%", minWidth: 0 }}>
            <TextField
              size="small"
              // Long names wrap onto the next line and the field grows
              // with them instead of hiding the value in a single line.
              multiline
              minRows={1}
              maxRows={8}
              placeholder="Item name..."
              value={row.name}
              autoFocus={i === 0}
              onChange={(ev) => handleChange(row.id, "name", ev.target.value)}
              error={submitted && !!e.name}
              sx={fieldSx({
                hasValue: !!row.name,
                isError: submitted && !!e.name,
                colors,
                autoHeight: true,
              })}
            />
            {submitted && <FieldError msg={e.name} colors={colors} />}
          </Box>
        );
      },
    },
    {
      key: "qty",
      label: "Qty *",
      xs: 1,
      required: true,
      align: "right",
      cellSxExtra: { px: 0.5, alignItems: "flex-start", py: 0.75 },
      render: (row) => {
        const e = rowErrors[row.id] || {};
        return (
          <Box sx={{ width: "100%" }}>
            <TextField
              size="small"
              placeholder="0"
              value={row.qty}
              onChange={(ev) =>
                handleChange(
                  row.id,
                  "qty",
                  ev.target.value.replace(/[^0-9.]/g, ""),
                )
              }
              error={submitted && !!e.qty}
              sx={{
                ...fieldSx({
                  hasValue: !!row.qty,
                  isError: submitted && !!e.qty,
                  colors,
                }),
                "& .MuiInputBase-input": {
                  textAlign: "right",
                },
              }}
            />
            {submitted && <FieldError msg={e.qty} colors={colors} />}
          </Box>
        );
      },
    },
    {
      key: "uom",
      label: "UOM *",
      xs: 1,
      required: true,
      align: "center",
      cellSxExtra: { px: 0.5, alignItems: "flex-start", py: 0.75 },
      render: (row) => {
        const e = rowErrors[row.id] || {};
        return (
          <Box sx={{ width: "100%" }}>
            <TextField
              size="small"
              placeholder="unit"
              value={row.uom}
              onChange={(ev) => handleChange(row.id, "uom", ev.target.value)}
              error={submitted && !!e.uom}
              sx={fieldSx({
                hasValue: !!row.uom,
                isError: submitted && !!e.uom,
                colors,
              })}
            />
            {submitted && <FieldError msg={e.uom} colors={colors} />}
          </Box>
        );
      },
    },
    {
      key: "abc",
      label: abcIsRequired ? "ABC *" : "ABC",
      xs: 1.5,
      required: abcIsRequired,
      align: "right",
      cellSxExtra: { px: 0.5, alignItems: "flex-start", py: 0.75 },
      render: (row) => {
        const e = rowErrors[row.id] || {};
        return (
          <Box sx={{ width: "100%" }}>
            <TextField
              size="small"
              placeholder="0.00"
              value={row.abc}
              onChange={(ev) =>
                handleChange(
                  row.id,
                  "abc",
                  ev.target.value.replace(/[^0-9.]/g, ""),
                )
              }
              error={submitted && !!e.abc}
              sx={abcFieldSx({
                hasValue: !!row.abc,
                isError: submitted && !!e.abc,
                colors,
              })}
              InputProps={{
                startAdornment: (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color:
                        submitted && e.abc
                          ? colors.errorText
                          : row.abc
                            ? colors.abcText
                            : colors.borderLight,
                      marginRight: "2px",
                      flexShrink: 0,
                    }}
                  >
                    ₱
                  </span>
                ),
              }}
            />
            {submitted && <FieldError msg={e.abc} colors={colors} />}
          </Box>
        );
      },
    },
    {
      key: "specs",
      label: "Specifications",
      xs: 4.5,
      align: "left",
      cellSxExtra: { px: 0.5, alignItems: "flex-start", py: 0.75 },
      render: (row) => (
        <TextField
          size="small"
          // Long specifications wrap and the field grows with them —
          // a one-line input scrolls the value out of sight.
          multiline
          minRows={1}
          maxRows={8}
          placeholder="Specifications (optional)..."
          value={row.specs}
          onChange={(ev) => handleChange(row.id, "specs", ev.target.value)}
          sx={fieldSx({
            hasValue: !!row.specs,
            isError: false,
            colors,
            autoHeight: true,
          })}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      xs: 0.5,
      hideBorder: true,
      align: "center",
      render: (row, i) => {
        const isLast = i === rows.length - 1;
        return !isLast && rows.length > 1 ? (
          <Box
            onClick={() => handleDelete(row.id)}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "4px",
              color: colors.textDisabled,
              border: `1px solid ${colors.borderLight}`,
              "&:hover": {
                color: colors.errorTextStrong,
                backgroundColor: colors.deleteHoverBg,
                borderColor: colors.deleteHoverBorder,
              },
              transition: "all 0.15s ease",
            }}
          >
            <DeleteOutline sx={{ fontSize: "1rem" }} />
          </Box>
        ) : null;
      },
    },
  ];

  /* ── Summary columns ── */
  const summaryColumns = columns.map((col) => {
    if (col.key === "index")
      return {
        ...col,
        summaryColSpan: 4,
        summaryRender: () => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: colors.textPrimary,
              }}
            >
              Total
            </Typography>
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: colors.textSecondary,
              }}
            >
              {filledRows.length} item{filledRows.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        ),
      };
    if (col.key === "qty")
      return {
        ...col,
        summaryValue: () =>
          filledRows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
      };
    if (col.key === "abc")
      return {
        ...col,
        summaryRender: () => (
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 800,
              color: colors.tealTextStrong,
              whiteSpace: "nowrap",
            }}
          >
            {fmtPHP(newItemsABC)}
          </Typography>
        ),
      };
    return col;
  });

  return (
    <PageLayout
      title="Transaction"
      subtitle={`${currentStatusLabel || ""} / ${transaction?.strCode || ""} / Add Bulk Item`}
      loading={false}
      footer={
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <BaseButton
            label="Back"
            icon={<ArrowBack />}
            onClick={() => navigate(-1)}
            actionColor="back"
            disabled={saving}
          />
          <BaseButton
            label={
              saving
                ? "Saving..."
                : `Save ${filledRows.length > 0 ? `(${filledRows.length})` : ""} Items`
            }
            icon={<Save />}
            variant="contained"
            actionColor="approve"
            onClick={handleSave}
            disabled={saveIsDisabled}
            tooltip={saveIsDisabled ? saveTooltip : ""}
          />
        </Box>
      }
    >
      <Box>
        {/* Section label */}
        <Box
          sx={{
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              color: colors.blueTextStrong,
              textTransform: "uppercase",
            }}
          >
            Bulk Items Entry
          </Typography>
          {filledRows.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: colors.textSecondary,
                fontSize: "0.72rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <span>
                {filledRows.length} item{filledRows.length !== 1 ? "s" : ""}
              </span>
              {transactionHasABC && (
                <>
                  <span style={{ color: colors.textDisabled }}>•</span>
                  <span>
                    Transaction ABC:
                    <span
                      style={{
                        color: colors.blueTextStrong,
                        fontWeight: 600,
                        marginLeft: 2,
                      }}
                    >
                      {fmtPHP(txnABC)}
                    </span>
                  </span>
                </>
              )}
              <span style={{ color: colors.textDisabled }}>•</span>
              <span>
                Total Item ABC:
                <span
                  style={{
                    color: colors.tealTextStrong,
                    fontWeight: 600,
                    marginLeft: 2,
                  }}
                >
                  {fmtPHP(totalABC)}
                </span>
                {existingItemsABC > 0 && newItemsABC > 0 && (
                  <span
                    style={{
                      color: colors.textDisabled,
                      fontSize: "0.65rem",
                      marginLeft: 3,
                    }}
                  >
                    (existing {fmtPHP(existingItemsABC)} + new {fmtPHP(newItemsABC)})
                  </span>
                )}
              </span>
            </Typography>
          )}
        </Box>

        {/* ── Alerts ── */}
        {saveError && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
            {saveError}
          </Alert>
        )}

        {abcUnderTransaction && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
            Items ABC total ({fmtPHP(totalABC)}) is under Transaction ABC ({fmtPHP(txnABC)}). You can still save, but consider adjusting your
            item ABC values.
          </Alert>
        )}

        {abcExceedsTransaction && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
            Total Item ABC ({fmtPHP(totalABC)}) exceeds Transaction ABC ({fmtPHP(txnABC)}). Please adjust your item ABC values.
          </Alert>
        )}

        {missingItemABC && submitted && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
            All items must have an ABC value when the transaction has no total
            ABC.
          </Alert>
        )}

        {submitted && hasAnyRowError && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
            Please fix the highlighted fields before saving.
          </Alert>
        )}

        <DataTable
          columns={summaryColumns}
          rows={rows}
          rowKey={(row) => row.id}
          summaryRow={filledRows.length > 0 ? {} : null}
          minWidth="700px"
          rowSx={(row) => ({
            background:
              row.name || row.qty || row.uom || row.abc || row.specs
                ? colors.rowBgFilled
                : colors.rowBgEmpty,
          })}
          footer={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Add
                sx={{
                  fontSize: "0.85rem",
                  color: colors.textDisabled,
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: colors.textSecondary,
                  fontStyle: "italic",
                }}
              >
                Start typing in any field to automatically add a new row. * =
                required
              </Typography>
            </Box>
          }
        />
      </Box>
    </PageLayout>
  );
}

export default AddBulkItem;
