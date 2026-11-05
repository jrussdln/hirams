import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  DriveFileMoveOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import RecordConnectionStructure from "../../../../components/ui/structure/RecordConnectionStructure.jsx";
import AssigneeAPI from "../../../../api/endpoints/assignee.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on an assignee that
 * still carries vouchers.
 */
const listColors = (c) => ({
  border: c.slate.border,
  headerBg: c.slate.itemHeaderBg ?? c.slate.mutedBg,
  hoverBg: c.slate.hover,
  mutedBg: c.slate.mutedBg,
  blueText: c.blue.text,
  blueBg: c.blue.bg,
  violetText: c.violet.text,
  violetBg: c.violet.bg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
});

// Raw API row → { id, name }
const rowId = (a) => a?.nAssigneeId;
const rowName = (a) => a?.strAssigneeName ?? "";
const rowNickName = (a) => a?.strAssigneeNickName ?? "";
const rowLabel = (a) => rowNickName(a).trim() || rowName(a);

function RecordConnectionModal({
  open,
  handleClose,
  assignee = null,
  activeStatusKey,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const assigneeId = assignee?.id ?? null;
  const assigneeName = assignee?.name ?? "";
  const assigneeNickName = assignee?.nickname ?? "";

  const [vouchers, setVouchers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [voucherSearch, setVoucherSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setVoucherSearch("");
    if (!open || assigneeId == null) {
      setVouchers([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    setLoadingRows(true);
    AssigneeAPI.getVouchers(assigneeId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.vouchers ?? []);
        setVouchers(list);
        setSelectedIds(list.map((v) => v.nVoucherId));
      })
      .catch((err) => {
        console.error("Failed to load assignee vouchers:", err);
        if (!cancelled) setVouchers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    setLoadingDestinations(true);
    AssigneeAPI.getAssignees()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.assignees ?? []);
        setDestinations(
          list.filter(
            (a) =>
              String(rowId(a)) !== String(assigneeId) &&
              (!activeStatusKey || a.cStatus === activeStatusKey),
          ),
        );
      })
      .catch((err) => {
        console.error("Failed to load transfer destinations:", err);
        if (!cancelled) setDestinations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDestinations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, assigneeId, activeStatusKey]);

  const filteredVouchers = useMemo(() => {
    const q = voucherSearch.trim().toLowerCase();
    if (!q) return vouchers;
    return vouchers.filter((v) =>
      String(v.strNumber || "").toLowerCase().includes(q),
    );
  }, [vouchers, voucherSearch]);

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (a) =>
        rowName(a).toLowerCase().includes(q) ||
        rowNickName(a).toLowerCase().includes(q),
    );
  }, [destinations, destinationSearch]);

  const selected = useMemo(
    () => destinations.find((a) => String(rowId(a)) === String(targetId)) ?? null,
    [destinations, targetId],
  );

  const allSelected =
    vouchers.length > 0 && selectedIds.length === vouchers.length;

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === vouchers.length ? [] : vouchers.map((v) => v.nVoucherId),
    );
  }, [vouchers]);

  const closeModal = () => {
    if (saving) return;
    handleClose?.();
  };

  const handleTransfer = async () => {
    if (!selected || saving) return;
    if (selectedIds.length === 0) return;
    if (typeof onTransfer !== "function") {
      console.error("RecordConnectionModal: an `onTransfer` handler is required.");
      return;
    }

    const entity = assigneeNickName || assigneeName || "Assignee";
    setSaving(true);
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        await onTransfer(assigneeId, rowId(selected), selectedIds);
      });

      await showSwal("SUCCESS", {}, { entity, action: "transferred" });
    } catch (err) {
      const serverMessage = err?.response?.data?.message ?? err?.message;
      if (
        serverMessage &&
        !serverMessage.toLowerCase().includes("something went wrong")
      ) {
        await showSwal("ERROR", { text: serverMessage });
      } else {
        await showSwal("ERROR", {}, { entity, action: "transfer" });
      }
    } finally {
      setSaving(false);
    }
  };

  const rowRender = useCallback(
    (voucher, idx, checked, statusLabel, archived) => (
      <>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            "& .MuiListItemText-root": { my: 0 },
            "& .MuiListItemText-primary": { my: 0 },
            "& .MuiListItemText-secondary": { my: 0 },
          }}
        >
          <ListItemText
            primary={voucher.strNumber || "—"}
            primaryTypographyProps={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: colors.textPrimary,
              noWrap: true,
              fontStyle: voucher.isRemoved ? "italic" : "normal",
              lineHeight: 1.25,
            }}
          />
          <Typography
            sx={{
              fontSize: "0.62rem",
              fontWeight: 600,
              fontStyle: "italic",
              textTransform: "uppercase",
              color: colors.textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.25,
            }}
          >
            {voucher.cStatusLabel || "—"}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: colors.textSecondary,
            whiteSpace: "nowrap",
          }}
        >
          {fmtPHP(voucher.dAmount)}
        </Typography>
      </>
    ),
    [colors],
  );

  if (!open || !assignee) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Assignee Record Connections"
      subTitle={assigneeNickName || assigneeName}
      showSave
      onSave={handleTransfer}
      saveLabel="Transfer"
      disabled={
        !selected || selectedIds.length === 0 || loadingRows || loadingDestinations
      }
      cancelLabel="Close"
      onCancel={closeModal}
      loading={saving}
      width={{ xs: "95%", sm: 560, md: 720 }}
      contentPadding={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ mt: 0.5 }}>
        {/* ── The assignee being handed over ──────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 1.25,
            py: 1,
            borderRadius: "10px",
            background: colors.violetBg,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "7px",
              background: colors.mutedBg,
              border: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: colors.violetText,
            }}
          >
            <DriveFileMoveOutlined sx={{ fontSize: "1rem" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.textMuted,
                lineHeight: 1.3,
              }}
            >
              Current
            </Typography>
            <Typography
              title={assigneeName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {assigneeNickName || assigneeName || "—"}
            </Typography>
            {assigneeNickName && (
              <Typography
                title={assigneeName}
                sx={{
                  fontSize: "0.64rem",
                  color: colors.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {assigneeName}
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── Record Connection Structure ─────────────────────────── */}
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            mt: 2,
          }}
        >
          <RecordConnectionStructure
            loading={loadingRows}
            records={vouchers}
            filteredRecords={filteredVouchers}
            searchValue={voucherSearch}
            onSearchChange={setVoucherSearch}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            colors={colors}
            emptyMessage="This assignee has no vouchers."
            emptySearchMessage={(q) => `No voucher matches “${q}”`}
            searchPlaceholder="Search voucher…"
            rowRender={rowRender}
            rowId={(v) => v.nVoucherId}
            rowStatus={() => ""}
            rowIsArchived={() => false}
            rowTitle={(v) =>
              v.isRemoved
                ? "This voucher was removed — only its lines are left behind."
                : undefined
            }
            destinationPicker={
              <Box
                sx={{
                  bgcolor: colors.headerBg,
                  px: 1,
                  py: 0.75,
                  borderTop: `1px solid ${colors.border}`,
                }}
              >
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Transfer to"
                  value={targetId ?? ""}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={loadingDestinations || destinations.length === 0}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: { sx: { maxHeight: 320 } },
                      autoFocus: false,
                    },
                    onOpen: () => {
                      if (destinations.length > 8) {
                        setTimeout(() => {
                          document
                            .getElementById("transfer-destination-search")
                            ?.focus();
                        }, 50);
                      }
                    },
                    onClose: () => setDestinationSearch(""),
                  }}
                  renderValue={(value) => {
                    const picked = destinations.find(
                      (a) => String(rowId(a)) === String(value),
                    );
                    if (!picked) return null;
                    return (
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          lineHeight: 1.25,
                          color: colors.textPrimary,
                        }}
                      >
                        {rowLabel(picked)}
                      </Typography>
                    );
                  }}
                  sx={{
                    mt: 0.75,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: colors.inputBg,
                      fontSize: "0.78rem",
                      "& fieldset": { borderColor: colors.border },
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.78rem",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "0.78rem",
                    },
                  }}
                >
                  {destinations.length > 8 && (
                    <MenuItem
                      disableRipple
                      disableTouchRipple
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{
                        p: 0,
                        "&:hover": { backgroundColor: "transparent" },
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <TextField
                        id="transfer-destination-search"
                        size="small"
                        placeholder="Search assignee…"
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ width: "100%" }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchOutlined fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </MenuItem>
                  )}
                  {filteredDestinations.map((a) => (
                    <MenuItem key={rowId(a)} value={rowId(a)}>
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: colors.textPrimary,
                        }}
                      >
                        {rowLabel(a)}
                      </Typography>
                    </MenuItem>
                  ))}
                  {filteredDestinations.length === 0 && (
                    <MenuItem disabled>
                      <Typography
                        sx={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
                        No assignee matches “{destinationSearch.trim()}”
                      </Typography>
                    </MenuItem>
                  )}
                </TextField>

                {!loadingDestinations && destinations.length === 0 && (
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      color: colors.textMuted,
                      mt: 0.5,
                      fontStyle: "italic",
                    }}
                  >
                    No other active assignee is available to transfer to.
                  </Typography>
                )}
              </Box>
            }
          />
        </Box>
      </Box>
    </ModalContainer>
  );
}

export default RecordConnectionModal;
