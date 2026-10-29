import React, { useState, useEffect, useMemo } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import AssigneeAPI from "../../../../api/endpoints/assignee.api.js";
import VoucherAPI from "../../../../api/endpoints/voucher.api.js";
import VoucherAssigneeAPI from "../../../../api/endpoints/voucher-assignee.api.js";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import { PersonAdd, PersonSearch } from "@mui/icons-material";
import {
  formatTIN,
  tinToStorage,
  tinToDisplay,
  fmtPHP,
} from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  border: c.slate.border,
  text: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  blue: {
    bg: c.blue.bg,
    border: c.blue.border,
    text: c.blue.text,
    textStrong: c.blue.textStrong,
  },
});

const VIEW = {
  SEARCH: "SEARCH",
  ADD_ASSIGNEE: "ADD_ASSIGNEE",
  LOADING: "LOADING",
  VOUCHER_FORM: "VOUCHER_FORM",
  // The voucher INFO edit (an existing voucher): company, assignee and
  // payment terms — no particulars here, those live on their own modal.
  EDIT_INFO: "EDIT_INFO",
};

const initialAssigneeForm = {
  strAssigneeName: "",
  strAssigneeNickName: "",
  strAddress: "",
  strTIN: "",
};
const initialVoucherForm = {
  particular: "",
  amount: "",
  quantity: 1,
  strUOM: "",
  ewt: "", // ← add
  cPaymentTerms: "",
};

/**
 * The payment terms tiles — identical in the create flow and the voucher
 * info edit, so both stay in step by construction.
 */
function PaymentTermsPicker({ paymentTerms, value, onChange, error, colors }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
      <Typography
        sx={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: colors.text,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        Payment Terms
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75 }}>
        {Object.entries(paymentTerms || {}).map(([key, lbl]) => {
          const selected = value === key;
          return (
            <Box
              key={key}
              onClick={() => onChange(key)}
              sx={{
                flex: 1,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9px",
                border: selected
                  ? `1.5px solid ${colors.blue.text}`
                  : `0.5px solid ${colors.border}`,
                background: selected ? colors.blue.bg : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: colors.blue.border },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: selected ? 700 : 500,
                  color: selected
                    ? colors.blue.textStrong
                    : colors.textSecondary,
                }}
              >
                {lbl}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {error && (
        <Typography sx={{ fontSize: "0.6rem", color: "error.main" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

function CreateVoucherModal({
  open,
  onClose,
  onSuccess,
  voucherActiveKey,
  voucherClosedKey,
  voucherCancelledKey,
  voucherSupplierTypeKey,
  voucherAssigneeTypeKey,
  paymentTerms, // ← add this prop
  // When set, the modal opens straight into EDIT mode over this voucher's
  // info (company / assignee / payment terms) instead of the create flow.
  editVoucher = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [view, setView] = useState(VIEW.SEARCH);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [assigneeForm, setAssigneeForm] = useState(initialAssigneeForm);
  const [assigneeErrors, setAssigneeErrors] = useState({});
  const [assigneeSaving, setAssigneeSaving] = useState(false);
  const [voucherForm, setVoucherForm] = useState(initialVoucherForm);
  const [voucherErrors, setVoucherErrors] = useState({});
  const [voucherTitle, setVoucherTitle] = useState("");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [searchErrors, setSearchErrors] = useState({});
  // EDIT mode — the assignee card vs the search field never show together:
  // the card sits with a Change button, and Change swaps it for the search.
  const [changingAssignee, setChangingAssignee] = useState(false);
  useEffect(() => {
    if (open) {
      if (editVoucher) {
        // EDIT mode — prefill the voucher's own info: the payee comes off
        // the loaded links first, the direct assignee relation second.
        setView(VIEW.EDIT_INFO);
        setChangingAssignee(false);
        setSelectedCompanyId(
          editVoucher.nCompanyId != null ? String(editVoucher.nCompanyId) : "",
        );
        setSelectedAssignee(
          editVoucher.voucher_assignees?.[0]?.assignee ??
            editVoucher.assignee ??
            null,
        );
        setSearchQuery("");
        setAssignees([]);
        setVoucherForm({
          ...initialVoucherForm,
          cPaymentTerms: editVoucher.cPaymentTerms || "",
        });
        setVoucherErrors({});
        setSearchErrors({});
        setAssigneeErrors({});
        return;
      }
      setView(VIEW.SEARCH);
      setSearchQuery("");
      setAssignees([]);
      setSelectedAssignee(null);
      setAssigneeForm(initialAssigneeForm);
      setAssigneeErrors({});
      setVoucherForm(initialVoucherForm);
      setVoucherErrors({});
      setVoucherTitle("");
      setSelectedCompanyId("");
      setSearchErrors({}); // ← add
    }
  }, [open, editVoucher]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const companiesData = await CompanyAPI.getAll();
        setCompanyOptions(
          (companiesData.companies || []).map((c) => ({
            label: c.strCompanyNickName,
            value: c.nCompanyId,
          })),
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (view !== VIEW.SEARCH && view !== VIEW.EDIT_INFO) return;
    const q = searchQuery.trim();
    if (!q) {
      setAssignees([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await AssigneeAPI.getAssignees(
          `search=${encodeURIComponent(q)}&cStatus=A`,
        );
        setAssignees(
          Array.isArray(res) ? res : (res.assignees ?? res.data ?? []),
        );
      } catch {
        setAssignees([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, view]);
  const validateCompany = () => {
    if (!selectedCompanyId) {
      setSearchErrors({ nCompanyId: "Company is required" });
      return false;
    }
    setSearchErrors({});
    return true;
  };

  const handleSelectAssignee = (assignee) => {
    if (!validateCompany()) return; // ← add
    setSelectedAssignee(assignee);
    setView(VIEW.VOUCHER_FORM);
  };

  const handleGoAddAssignee = () => {
    if (!validateCompany()) return; // ← add
    setAssigneeForm({
      strAssigneeName: searchQuery.trim(),
      strAssigneeNickName: "",
      strAddress: "",
      strTIN: "",
    });
    setView(VIEW.ADD_ASSIGNEE);
  };
  const handleAssigneeFormChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === "strTIN" ? formatTIN(value) : value;
    setAssigneeForm((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const validateAssignee = () => {
    const errs = {};
    if (!assigneeForm.strAssigneeName?.trim())
      errs.strAssigneeName = "Assignee name is required";
    if (!assigneeForm.strAssigneeNickName?.trim())
      errs.strAssigneeNickName = "Nickname is required";
    setAssigneeErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAssignee = async () => {
    if (!validateAssignee()) return;
    setAssigneeSaving(true);
    setView(VIEW.LOADING);
    try {
      await AssigneeAPI.createAssignee({
        ...assigneeForm,
        strTIN: tinToStorage(assigneeForm.strTIN) || null,
        cStatus: voucherActiveKey,
      });
      const res = await AssigneeAPI.getAssignees(
        `search=${encodeURIComponent(assigneeForm.strAssigneeName.trim())}&cStatus=A`,
      );
      const list = Array.isArray(res) ? res : (res.assignees ?? res.data ?? []);
      const created = list.find(
        (a) =>
          a.strAssigneeName.trim().toLowerCase() ===
          assigneeForm.strAssigneeName.trim().toLowerCase(),
      );
      if (!created?.nAssigneeId) {
        await showSwal("ERROR", {}, { entity: "Assignee" });
        setView(VIEW.ADD_ASSIGNEE);
        return;
      }
      setSelectedAssignee(created);
      setView(VIEW.VOUCHER_FORM);
    } catch {
      await showSwal("ERROR", {}, { entity: "Assignee" });
      setView(VIEW.ADD_ASSIGNEE);
    } finally {
      setAssigneeSaving(false);
    }
  };

  const handleVoucherFormChange = (e) => {
    const { name, value } = e.target;
    setVoucherForm((prev) => ({ ...prev, [name]: value }));
  };
  const validateVoucher = () => {
    const errs = {};
    if (!voucherForm.particular?.trim())
      errs.particular = "Particular is required";
    if (!voucherForm.cPaymentTerms)
      errs.cPaymentTerms = "Payment terms is required";
    if (!voucherForm.amount || Number(voucherForm.amount) <= 0)
      errs.amount = "Amount must be greater than 0";
    if (!voucherForm.quantity || Number(voucherForm.quantity) <= 0)
      errs.quantity = "Quantity must be greater than 0";

    // EWT is optional, but it can never be negative or exceed the line total.
    const ewt = Number(voucherForm.ewt || 0);
    if (!Number.isFinite(ewt) || ewt < 0) errs.ewt = "EWT must be 0 or more";
    else if (
      ewt >
      Number(voucherForm.amount || 0) * Number(voucherForm.quantity || 1)
    )
      errs.ewt = "EWT cannot exceed the line total";

    setVoucherErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSaveVoucher = async () => {
    if (!validateVoucher()) return;
    const entity = "Voucher";
    try {
      onClose();
      await withSpinner(entity, async () => {
        const voucherRes = await VoucherAPI.createVoucher({
          cType: voucherAssigneeTypeKey,
          nTypeId: selectedAssignee.nAssigneeId,
          cStatus: voucherActiveKey,
          strTitle: voucherTitle.trim() || null,
          nCompanyId: selectedCompanyId || null,
          cPaymentTerms: voucherForm.cPaymentTerms || null, // ← add
        });
        const nVoucherId =
          voucherRes?.data?.nVoucherId ?? voucherRes?.nVoucherId;
        await VoucherAssigneeAPI.create({
          nVoucherId,
          nAssigneeId: selectedAssignee.nAssigneeId,
          strParticular: voucherForm.particular,
          dAmount: Number(voucherForm.amount),
          nQuantity: Number(voucherForm.quantity),
          strUOM: voucherForm.strUOM || null,
          dEWT: Number(voucherForm.ewt || 0), // ← add
        });
        await onSuccess();
      });
      await showSwal("SUCCESS", {}, { entity, action: "created" });
    } catch {
      await showSwal("ERROR", {}, { entity });
    }
  };

  const handleUpdateVoucher = async () => {
    // Company is the one hard requirement — payee and terms may stay as
    // they are (they are only validated when the caller changed them).
    if (!validateCompany()) return;
    if (!selectedAssignee?.nAssigneeId && editVoucher?.nTypeId == null) {
      setSearchErrors((e) => ({ ...e, nTypeId: "Assignee is required" }));
      return;
    }
    if (!voucherForm.cPaymentTerms) {
      setVoucherErrors({ cPaymentTerms: "Payment terms is required" });
      return;
    }
    const entity = "Voucher";
    try {
      onClose();
      await withSpinner(entity, async () => {
        // The update endpoint nulls every omitted column — the untouched
        // fields ride along with their current values (status, type,
        // number, title, dtCreated) so nothing else on the voucher moves.
        await VoucherAPI.updateVoucher(editVoucher.nVoucherId, {
          strTitle: editVoucher.strTitle ?? null,
          cType: editVoucher.cType ?? null,
          strNumber: editVoucher.strNumber ?? null,
          cStatus: editVoucher.cStatus,
          dtCreated: editVoucher.dtCreated ?? null,
          nCompanyId: selectedCompanyId || null,
          // The current payee unless the search picked a replacement.
          nTypeId: selectedAssignee?.nAssigneeId ?? editVoucher.nTypeId,
          cPaymentTerms: voucherForm.cPaymentTerms || null,
        });
        await onSuccess();
      });
      await showSwal("SUCCESS", {}, { entity, action: "updated" });
    } catch {
      await showSwal("ERROR", {}, { entity });
    }
  };

  const titleMap = {
    [VIEW.SEARCH]: "Create Voucher",
    [VIEW.ADD_ASSIGNEE]: "Create Voucher",
    [VIEW.LOADING]: "Create Voucher",
    [VIEW.VOUCHER_FORM]: "Create Voucher",
    [VIEW.EDIT_INFO]: "Edit Voucher",
  };
  const subTitleMap = {
    [VIEW.SEARCH]: "Select Assignee",
    [VIEW.ADD_ASSIGNEE]: "New Assignee",
    [VIEW.LOADING]: "Saving...",
    [VIEW.VOUCHER_FORM]: `${selectedAssignee?.strAssigneeNickName ?? selectedAssignee?.strAssigneeName ?? ""}`,
    [VIEW.EDIT_INFO]: `${selectedAssignee?.strAssigneeNickName ?? selectedAssignee?.strAssigneeName ?? ""}`,
  };
  const handleSave =
    view === VIEW.ADD_ASSIGNEE
      ? handleSaveAssignee
      : view === VIEW.VOUCHER_FORM
        ? handleSaveVoucher
        : view === VIEW.EDIT_INFO
          ? handleUpdateVoucher
          : undefined;

  if (!open) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      onSave={handleSave}
      title={titleMap[view]}
      subTitle={subTitleMap[view]}
      hideSave={view === VIEW.SEARCH || view === VIEW.LOADING}
      showSave={view !== VIEW.SEARCH && view !== VIEW.LOADING}
      saveLabel={view === VIEW.EDIT_INFO ? "Save Changes" : undefined}
      cancelLabel={
        view === VIEW.ADD_ASSIGNEE || view === VIEW.VOUCHER_FORM
          ? "Back"
          : "Cancel"
      }
      onCancel={
        view === VIEW.ADD_ASSIGNEE || view === VIEW.VOUCHER_FORM
          ? () => setView(VIEW.SEARCH)
          : onClose
      }
    >
      {view === VIEW.LOADING && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
            gap: 2,
          }}
        >
          <CircularProgress
            size={32}
            thickness={4}
            sx={{ color: colors.blue.text }}
          />
          <Typography
            sx={{
              fontSize: "0.8rem",
              color: "text.secondary",
              fontWeight: 500,
            }}
          >
            Saving assignee...
          </Typography>
        </Box>
      )}

      {view === VIEW.SEARCH && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <FormGrid
              fields={[
                {
                  name: "nCompanyId",
                  label: "Company",
                  type: "select",
                  options: companyOptions,
                  xs: 12,
                  required: true, // ← optional, if your FormGrid renders an asterisk for this
                },
              ]}
              formData={{
                strTitle: voucherTitle,
                nCompanyId: selectedCompanyId,
              }}
              handleChange={(e) => {
                const { name, value } = e.target;
                if (name === "strTitle") setVoucherTitle(value);
                if (name === "nCompanyId") {
                  setSelectedCompanyId(value);
                  if (searchErrors.nCompanyId) setSearchErrors({}); // clear error once fixed
                }
              }}
              errors={searchErrors} // ← was {} before, now wired up
            />
          </Box>

          {assigneeSaving && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={20} sx={{ color: colors.blue.text }} />
            </Box>
          )}

          <FormGrid
            fields={[
              {
                name: "searchQuery",
                label: "Assignee Name or Nickname",
                xs: 12,
                placeholder: "Type to search...",
              },
            ]}
            formData={{ searchQuery }}
            handleChange={(e) => setSearchQuery(e.target.value)}
            errors={{}}
          />

          {searchLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <CircularProgress size={20} sx={{ color: colors.blue.text }} />
            </Box>
          )}

          {!searchLoading && searchQuery.trim() && (
            <Box
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              {assignees.map((a) => (
                <Box
                  key={a.nAssigneeId}
                  onClick={() => handleSelectAssignee(a)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    "&:hover": {
                      background: colors.blue.bg,
                      borderColor: colors.blue.border,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: colors.text,
                    }}
                  >
                    {a.strAssigneeName}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.7rem", color: colors.textSecondary }}
                  >
                    {a.strAssigneeNickName}{" "}
                    {a.strTIN ? `· TIN: ${tinToDisplay(a.strTIN)}` : ""}
                  </Typography>
                </Box>
              ))}

              {assignees.length === 0 && (
                <Box
                  onClick={handleGoAddAssignee}
                  sx={{
                    px: 1.5,
                    py: 1,
                    border: `0.5px dashed ${colors.blue.border}`,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: colors.blue.text,
                    "&:hover": { background: colors.blue.bg },
                  }}
                >
                  <PersonAdd sx={{ fontSize: "1rem" }} />
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    Add "{searchQuery.trim()}" as new assignee
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {view === VIEW.ADD_ASSIGNEE && (
        <FormGrid
          fields={[
            { name: "strAssigneeName", label: "Assignee Name", xs: 12 },
            { name: "strAssigneeNickName", label: "Nickname", xs: 6 },
            { name: "strTIN", label: "TIN", type: "tin", xs: 6 },
            {
              label: "Address",
              name: "strAddress",
              xs: 12,
              multiline: true,
              plainMultiline: true,
              minRows: 2,
              sx: { "& textarea": { resize: "vertical" } },
            },
          ]}
          formData={assigneeForm}
          handleChange={handleAssigneeFormChange}
          errors={assigneeErrors}
        />
      )}

      {view === VIEW.EDIT_INFO && editVoucher && (
        <Box>
          {/* COMPANY — the one hard requirement of the edit */}
          <FormGrid
            fields={[
              {
                name: "nCompanyId",
                label: "Company",
                type: "select",
                options: companyOptions,
                xs: 12,
                required: true,
              },
            ]}
            formData={{ nCompanyId: selectedCompanyId }}
            handleChange={(e) => {
              const { name, value } = e.target;
              if (name === "nCompanyId") {
                setSelectedCompanyId(value);
                if (searchErrors.nCompanyId) setSearchErrors({});
              }
            }}
            errors={searchErrors}
          />

          {/* ASSIGNEE — the card and the search field never show together:
              the card sits with a Change button on its right, and Change
              swaps the card for the search. "Keep current assignee" closes
              the search without touching the payee. */}
          <Box sx={{ mt: 2, mb: 2 }}>
            {changingAssignee ? (
            <>
              <FormGrid
                fields={[
                  {
                    name: "searchQuery",
                    label: "Search Assignee",
                    xs: 12,
                    placeholder: "Type to search...",
                  },
                ]}
                formData={{ searchQuery }}
                handleChange={(e) => setSearchQuery(e.target.value)}
                errors={{}}
              />

              {searchLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                  <CircularProgress
                    size={20}
                    sx={{ color: colors.blue.text }}
                  />
                </Box>
              )}

              {!searchLoading && searchQuery.trim() && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {assignees.map((a) => (
                    <Box
                      key={a.nAssigneeId}
                      onClick={() => {
                        setSelectedAssignee(a);
                        setSearchQuery("");
                        setChangingAssignee(false);
                      }}
                      sx={{
                        px: 1.5,
                        py: 1,
                        border: `0.5px solid ${colors.border}`,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        "&:hover": {
                          background: colors.blue.bg,
                          borderColor: colors.blue.border,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: colors.text,
                        }}
                      >
                        {a.strAssigneeName}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.7rem", color: colors.textSecondary }}
                      >
                        {a.strAssigneeNickName}{" "}
                        {a.strTIN ? `· TIN: ${tinToDisplay(a.strTIN)}` : ""}
                      </Typography>
                    </Box>
                  ))}

                  {assignees.length === 0 && (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                        color: colors.textSecondary,
                        px: 0.5,
                        py: 0.5,
                      }}
                    >
                      No assignee matches — keep the current one instead.
                    </Typography>
                  )}
                </Box>
              )}

              <Box
                component="button"
                onClick={() => {
                  setSearchQuery("");
                  setChangingAssignee(false);
                }}
                sx={{
                  mt: 1.5,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: colors.blue.text,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Keep current assignee
              </Box>
            </>
          ) : (
            selectedAssignee && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  background: colors.blue.bg,
                  border: `0.5px solid ${colors.blue.border}`,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <PersonSearch
                  sx={{ fontSize: "0.9rem", color: colors.blue.text }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: colors.blue.textStrong,
                    }}
                  >
                    {selectedAssignee.strAssigneeName}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.65rem", color: colors.blue.text }}
                  >
                    {selectedAssignee.strAssigneeNickName}
                    {selectedAssignee.strTIN
                      ? ` · TIN: ${tinToDisplay(selectedAssignee.strTIN)}`
                      : ""}
                  </Typography>
                </Box>
                <Box
                  component="button"
                  onClick={() => setChangingAssignee(true)}
                  sx={{
                    px: 1,
                    py: 0.3,
                    borderRadius: "7px",
                    border: `0.5px solid ${colors.blue.border}`,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: colors.blue.textStrong,
                    flexShrink: 0,
                    transition: "all 0.15s",
                    "&:hover": {
                      background: colors.blue.hover,
                      borderColor: colors.blue.text,
                    },
                  }}
                >
                  Change
                </Box>
              </Box>
            )
          )}
          </Box>

          {/* PAYMENT TERMS — the same tiles the create flow shows */}
          <PaymentTermsPicker
            paymentTerms={paymentTerms}
            value={voucherForm.cPaymentTerms}
            onChange={(key) =>
              setVoucherForm((p) => ({ ...p, cPaymentTerms: key }))
            }
            error={voucherErrors?.cPaymentTerms}
            colors={colors}
          />
        </Box>
      )}

      {view === VIEW.VOUCHER_FORM && (
        <Box>
          {/* Assignee banner */}
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 0.75,
              background: colors.blue.bg,
              border: `0.5px solid ${colors.blue.border}`,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PersonSearch
              sx={{ fontSize: "0.9rem", color: colors.blue.text }}
            />
            <Box>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: colors.blue.textStrong,
                }}
              >
                {selectedAssignee?.strAssigneeName}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: colors.blue.text }}>
                {selectedAssignee?.strAssigneeNickName}
                {selectedAssignee?.strTIN
                  ? ` · TIN: ${tinToDisplay(selectedAssignee.strTIN)}`
                  : ""}
              </Typography>
            </Box>
          </Box>

          {/* Payment Terms — now above the particulars */}
          <PaymentTermsPicker
            paymentTerms={paymentTerms}
            value={voucherForm.cPaymentTerms}
            onChange={(key) =>
              setVoucherForm((p) => ({ ...p, cPaymentTerms: key }))
            }
            error={voucherErrors?.cPaymentTerms}
            colors={colors}
          />
          {/* Particulars label */}
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: colors.text,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              mb: 1,
            }}
          >
            Items
          </Typography>

          {/* Form fields */}
          <FormGrid
            fields={[
              { name: "particular", label: "Particular", xs: 12 },
              {
                name: "quantity",
                label: "Quantity",
                type: "number",
                xs: 3,
                numberOnly: true,
              },
              {
                name: "strUOM",
                label: "UOM",
                placeholder: "e.g. pcs, kg",
                xs: 3,
              },
              {
                name: "amount",
                label: "Unit Amount",
                type: "peso",
                xs: 3,
                numberOnly: true,
                required: true,
              },
              {
                name: "ewt",
                label: "EWT",
                type: "peso",
                placeholder: "0.00",
                xs: 3,
                numberOnly: true,
              },
            ]}
            formData={voucherForm}
            handleChange={handleVoucherFormChange}
            errors={voucherErrors}
          />

          {/* Total / Net summary */}
          <Box
            sx={{
              mt: 2,
              px: 1.25,
              py: 0.75,
              borderRadius: "8px",
              background: colors.blue.bg,
              border: `0.5px solid ${colors.blue.border}`,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: colors.blue.textStrong,
                }}
              >
                Total
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: colors.blue.text,
                }}
              >
                {fmtPHP(
                  Number(voucherForm.amount || 0) *
                    Number(voucherForm.quantity || 1),
                )}
              </Typography>
            </Box>

            {Number(voucherForm.ewt || 0) > 0 && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      fontStyle: "italic",
                      color: colors.blue.textStrong,
                    }}
                  >
                    Less: EWT
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: "error.main",
                    }}
                  >
                    -{fmtPHP(Number(voucherForm.ewt))}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 0.25,
                    pt: 0.5,
                    borderTop: `0.5px solid ${colors.blue.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: colors.blue.textStrong,
                    }}
                  >
                    Net
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: colors.blue.text,
                    }}
                  >
                    {fmtPHP(
                      Number(voucherForm.amount || 0) *
                        Number(voucherForm.quantity || 1) -
                        Number(voucherForm.ewt || 0),
                    )}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}
    </ModalContainer>
  );
}

export default CreateVoucherModal;
