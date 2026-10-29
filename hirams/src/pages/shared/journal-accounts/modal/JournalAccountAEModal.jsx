import React, { useState, useEffect, useMemo } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Typography,
  CircularProgress,
  Divider,
  useTheme,
} from "@mui/material";
import {
  SearchOutlined,
  LinkOutlined,
  LinkOffOutlined,
} from "@mui/icons-material";
import JournalAccountAPI from "../../../../api/endpoints/journal-account.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const LINK_TYPES = ["C", "S"]; // Client / Supplier accounts can be linked to a record
// Account name filled in when a client / supplier is picked
const buildLinkedName = (r) =>
  `Receivables from ${r.strNickName || r.strName}`.slice(0, 50);
const listColors = (c) => ({
  border: c.slate.border,
  headerBg: c.slate.itemHeaderBg ?? c.slate.mutedBg,
  hoverBg: c.slate.hover,
  chipBg: c.blue.bg,
  chipText: c.blue.text,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
});

// Nothing picked → searchable list of unlinked records.
// A record picked → only that record, with an Unlink button on the right.
function RecordLinkList({
  type,
  records,
  loading,
  selectedId,
  onPick,
  onUnlink,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);
  const [search, setSearch] = useState("");

  const noun = type === "C" ? "client" : "supplier";
  const hasSelection = selectedId !== "" && selectedId != null;

  const selectedRecord = useMemo(
    () =>
      hasSelection
        ? (records.find((r) => String(r.nRecordId) === String(selectedId)) ??
          null)
        : null,
    [records, selectedId, hasSelection],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.strName || "").toLowerCase().includes(q) ||
        (r.strNickName || "").toLowerCase().includes(q),
    );
  }, [records, search]);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          mb: 0.75,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {hasSelection ? `Linked ${noun}` : `Link to a ${noun}`}
        </Typography>
        {!hasSelection && (
          <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
            {`Optional · ${records.length} not linked yet`}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          border: `1px solid ${colors.border}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : hasSelection ? (
          /* ── Linked record + Unlink ─────────────────────────────── */
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              py: 1,
              bgcolor: colors.chipBg,
            }}
          >
            <LinkOutlined sx={{ fontSize: "1rem", color: colors.chipText }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                }}
              >
                {selectedRecord?.strName ?? `${noun} #${selectedId}`}
              </Typography>
              {selectedRecord?.strNickName && (
                <Typography
                  noWrap
                  sx={{ fontSize: "0.66rem", color: colors.textMuted }}
                >
                  {selectedRecord.strNickName}
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkOffOutlined sx={{ fontSize: "0.9rem" }} />}
              onClick={onUnlink}
              sx={{
                flexShrink: 0,
                textTransform: "none",
                fontSize: "0.68rem",
                fontWeight: 600,
                py: 0.2,
              }}
            >
              Unlink
            </Button>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
              All {noun}s are already linked.
            </Typography>
          </Box>
        ) : (
          /* ── Unlinked records ───────────────────────────────────── */
          <>
            <Box
              sx={{
                px: 1.25,
                py: 1,
                bgcolor: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "7px",
                  px: 1,
                  height: 32,
                }}
              >
                <SearchOutlined
                  sx={{ fontSize: "0.85rem", color: colors.textMuted }}
                />
                <Box
                  component="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${noun}s…`}
                  sx={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "0.75rem",
                    color: colors.textPrimary,
                    "::placeholder": { color: colors.textMuted },
                  }}
                />
              </Box>
            </Box>

            {filtered.length === 0 ? (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: "0.72rem", color: colors.textMuted }}
                >
                  No {noun}s match "{search}"
                </Typography>
              </Box>
            ) : (
              <List
                dense
                disablePadding
                sx={{ maxHeight: 260, overflowY: "auto" }}
              >
                {filtered.map((r, idx) => (
                  <React.Fragment key={r.nRecordId}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => onPick(r)}
                        sx={{
                          px: 1.25,
                          py: 0.75,
                          "&:hover": { bgcolor: colors.hoverBg },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34 }}>
                          <Radio
                            edge="start"
                            checked={false}
                            tabIndex={-1}
                            disableRipple
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={r.strName}
                          secondary={r.strNickName || null}
                          primaryTypographyProps={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: colors.textPrimary,
                          }}
                          secondaryTypographyProps={{
                            fontSize: "0.66rem",
                            color: colors.textMuted,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                    {idx < filtered.length - 1 && (
                      <Divider sx={{ borderColor: colors.border }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
function JournalAccountAEModal({ open, onClose, initialData = null, onSaved }) {
  const isEditMode = Boolean(initialData?.id);
  const isAddChildMode = !isEditMode && Boolean(initialData?.nParentAccountId);
  const [formData, setFormData] = useState({
    accountName: "",
    nParentAccountId: "",
    cAccountType: "",
    nRecordId: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [parentAccounts, setParentAccounts] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [parentAccountsLoading, setParentAccountsLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditMode && initialData) {
        const type = ["C", "S", "F"].includes(initialData.cAccountType)
          ? initialData.cAccountType
          : "";
        setFormData({
          accountName:
            initialData.strAccountName || initialData.accountName || "",
          nParentAccountId: initialData.nParentAccountId ?? "",
          cAccountType: type,
          nRecordId: initialData.nRecordId ?? "",
        });
      } else if (isAddChildMode) {
        setFormData({
          accountName: "",
          nParentAccountId: initialData.nParentAccountId,
          cAccountType: "",
          nRecordId: "",
        });
      } else {
        setFormData({
          accountName: "",
          nParentAccountId: "",
          cAccountType: "",
          nRecordId: "",
        });
      }
      setErrors({});
    }
  }, [initialData, open, isEditMode, isAddChildMode]);

  useEffect(() => {
    if (!open) return;
    setParentAccountsLoading(true);
    const fetcher = isEditMode
      ? JournalAccountAPI.getExcludingDescendantsOf(initialData.id)
      : JournalAccountAPI.getAll();

    fetcher
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setAllAccounts(list);
        // Only top-level accounts can be parents (and never the account itself)
        const parentsOnly = list.filter(
          (a) =>
            !a.nParentAccountId &&
            (!isEditMode || a.nJournalAccountId !== initialData.id),
        );
        // …but the preselected parent must always be an option, otherwise the
        // select renders blank: a sub-account can itself be a parent (drag &
        // drop allows nesting deeper than one level).
        const preselectedId = initialData?.nParentAccountId;
        if (
          preselectedId &&
          !parentsOnly.some((a) => a.nJournalAccountId === preselectedId)
        ) {
          const found = list.find((a) => a.nJournalAccountId === preselectedId);
          if (found) parentsOnly.push(found);
        }
        setParentAccounts(parentsOnly);
      })
      .catch((err) => {
        console.error("Failed to fetch parent accounts:", err);
        setParentAccounts([]);
      })
      .finally(() => setParentAccountsLoading(false));
  }, [open, isEditMode, isAddChildMode, initialData]);

  // Clients / suppliers that aren't linked yet — refetched whenever the type
  // changes. In edit mode the account's own record is kept in the list.
  useEffect(() => {
    const type = formData.cAccountType;
    if (!open || !LINK_TYPES.includes(type)) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    setRecordsLoading(true);
    JournalAccountAPI.getUnlinkedRecords(
      type,
      isEditMode ? initialData.id : null,
    )
      .then((res) => {
        if (cancelled) return;
        setRecords(Array.isArray(res) ? res : (res?.data ?? []));
      })
      .catch((err) => {
        console.error("Failed to fetch unlinked records:", err);
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setRecordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, formData.cAccountType, isEditMode, initialData?.id]);

  // NOTE: all hooks above this line — early return must come after every hook.
  if (!open) return null;

  // True when the chosen parent, or any ancestor above it, is a Fund account
  const isUnderFund = (() => {
    const seen = new Set();
    let id = Number(formData.nParentAccountId) || null;
    while (id && !seen.has(id)) {
      seen.add(id);
      const p = allAccounts.find((a) => a.nJournalAccountId === id);
      if (!p) return false;
      if (p.cAccountType === "F") return true;
      id = p.nParentAccountId ? Number(p.nParentAccountId) : null;
    }
    return false;
  })();

  // Client / Supplier type (and not under a fund) → show the record list
  const isLinkType = !isUnderFund && LINK_TYPES.includes(formData.cAccountType);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // a different type means a different kind of record — clear the pick
      ...(name === "cAccountType" ? { nRecordId: "" } : {}),
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  // Picking a client / supplier links it and fills the account name
  const handlePickRecord = (record) => {
    setFormData((prev) => ({
      ...prev,
      nRecordId: record.nRecordId,
      accountName: buildLinkedName(record),
    }));
    setErrors((prev) => ({ ...prev, accountName: "" }));
  };

  // Unlink keeps the name as it is and brings the list back
  const handleUnlinkRecord = () =>
    setFormData((prev) => ({ ...prev, nRecordId: "" }));
  const validateForm = () => {
    const newErrors = {};

    if (!formData.accountName.trim()) {
      newErrors.accountName = "Name is required.";
    } else if (formData.accountName.length > 50) {
      newErrors.accountName = "Name must not exceed 50 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const entity = formData.accountName.trim();
    const action = isEditMode ? "updated" : "added";

    try {
      setLoading(true);
      onClose();

      await withSpinner(entity, async () => {
        const payload = {
          strAccountName: formData.accountName.trim(),
          nParentAccountId: formData.nParentAccountId || null,
          cAccountType: isUnderFund ? null : formData.cAccountType || null,
          nRecordId:
            isLinkType && formData.nRecordId ? formData.nRecordId : null,
        };
        if (isEditMode) {
          await JournalAccountAPI.update(initialData.id, payload);
        } else {
          await JournalAccountAPI.create(payload);
        }
      });

      await showSwal("SUCCESS", {}, { entity, action });
      onSaved?.();
    } catch (err) {
      console.error(`❌ Error ${action} journal account:`, err);
      const serverMessage = err?.response?.data?.message ?? err?.data?.message;
      await showSwal("ERROR", {}, { entity, message: serverMessage });
    } finally {
      setLoading(false);
    }
  };

  // Keep the PRESELECTED parent selectable even when the (edit-mode) list
  // hasn't loaded — otherwise the Select briefly renders a value that isn't
  // an option and MUI logs an "out-of-range value" warning. The row's parent
  // relation supplies the label until the fetched list takes over.
  const parentPreselected = formData.nParentAccountId;
  const parentOptions = [
    { value: "", label: "None — this will be a parent account" },
    ...parentAccounts.map((a) => ({
      value: a.nJournalAccountId,
      label: a.strAccountName ?? a.display_name,
    })),
    ...(parentPreselected &&
    !parentAccounts.some(
      (a) => a.nJournalAccountId === parentPreselected,
    )
      ? [
          {
            value: parentPreselected,
            label: initialData?.parent?.strAccountName ?? "Current parent…",
          },
        ]
      : []),
  ];

  const fields = [
    {
      name: "accountName",
      label: "Account Name",
      type: "text",
      xs: 12,
      placeholder: "Enter journal account name",
    },
    {
      name: "nParentAccountId",
      label: "Parent Account",
      type: "select",
      xs: 12,
      placeholder: parentAccountsLoading
        ? "Loading…"
        : "None — this will be a parent account",
      disabled: parentAccountsLoading,
      options: parentOptions,
    },
    ...(isUnderFund
      ? []
      : [
          {
            name: "cAccountType",
            label: "Account Type",
            type: "select",
            xs: 12,
            placeholder: "Default — standard account",
            options: [
              { value: "", label: "Default — standard account" },
              { value: "C", label: "Client (link to a client)" },
              { value: "S", label: "Supplier (link to a supplier)" },
              { value: "F", label: "Fund" },
            ],
          },
        ]),
  ];

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={isEditMode ? "Edit Journal Account" : "Add Journal Account"}
      subTitle={
        formData.accountName?.trim() ? `${formData.accountName.trim()}` : ""
      }
      onSave={handleSave}
      saveLabel={isEditMode ? "Save Changes" : "Add"}
      loading={loading}
    >
      <Box sx={{ mt: 1 }}>
        <FormGrid
          fields={fields}
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          onLastFieldTab={handleSave}
          autoFocus={true}
        />
        {isLinkType && (
          <RecordLinkList
            key={formData.cAccountType}
            type={formData.cAccountType}
            records={records}
            loading={recordsLoading}
            selectedId={formData.nRecordId}
            onPick={handlePickRecord}
            onUnlink={handleUnlinkRecord}
          />
        )}
      </Box>
    </ModalContainer>
  );
}

export default JournalAccountAEModal;
