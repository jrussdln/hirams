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
import AssigneeAPI from "../../../../api/endpoints/assignee.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferAssigneeModal — the stand-in for Delete on an assignee that
 * still carries vouchers.
 *
 * An assignee on a voucher cannot simply be removed: the voucher lines
 * would be left pointing at nothing. Instead they are MOVED to another
 * assignee — so the modal lists the vouchers this assignee is on, lets the
 * user pick which of them travel, and picks the active assignee they go
 * to.
 *
 *   <TransferAssigneeModal
 *     open={openTransferModal}
 *     handleClose={handleCloseTransferModal}
 *     assignee={selectedAssignee}
 *     activeStatusKey={activeStatusKey}
 *     onTransfer={handleTransferVouchers}  // from useAssignee
 *   />
 *
 * The move itself belongs to `onTransfer` (useAssignee's
 * handleTransferVouchers): it sends the request, runs it behind the
 * spinner and refetches the assignee list. This modal only picks what
 * moves and where it goes; a refusal from the API is shown with its own
 * message so it explains itself.
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
// The menu field shows the NICKNAME only — it is the short handle the
// office actually uses. The full name is the fallback for the rare
// assignee that carries no nickname at all.
const rowLabel = (a) => rowNickName(a).trim() || rowName(a);

function TransferAssigneeModal({
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
  const [saving, setSaving] = useState(false);

  // A fresh voucher list, a fresh destination list and a clean pick every
  // time the modal opens — the assignee may have changed since the last
  // visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    if (!open || assigneeId == null) {
      setVouchers([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    // ── The vouchers this assignee is on ────────────────────────
    setLoadingRows(true);
    AssigneeAPI.getVouchers(assigneeId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.vouchers ?? []);
        setVouchers(list);
        // Everything is picked by default — the common case is a clean
        // hand-over of the whole assignee.
        setSelectedIds(list.map((v) => v.nVoucherId));
      })
      .catch((err) => {
        console.error("Failed to load assignee vouchers:", err);
        if (!cancelled) setVouchers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    // ── The active assignees it can be handed over to ───────────
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
      // Without the transfer handler there is nowhere to send the request —
      // say so in the console instead of failing silently on click.
      console.error("TransferAssigneeModal: an `onTransfer` handler is required.");
      return;
    }

    const entity = assigneeNickName || assigneeName || "Assignee";
    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear. The parent's close is
    // called directly here, so the "saving" guard cannot hold it back.
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        // The source assignee travels with the call, so closing the modal
        // (and dropping the selection) does not lose it.
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

  // NOTE: all hooks above this line — the early return must come after them.
  if (!open || !assignee) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Transfer Assignee Vouchers"
      subTitle={assigneeName}
      onSave={handleTransfer}
      saveLabel="Transfer"
      cancelLabel="Cancel"
      onCancel={closeModal}
      loading={saving}
      disabled={!selected || selectedIds.length === 0}
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
              }}
            >
              Transferring from
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
              }}
            >
              {assigneeNickName || assigneeName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {assigneeNickName ? `${assigneeName} · ` : ""}
              {loadingRows
                ? "Loading vouchers…"
                : `${vouchers.length} voucher${vouchers.length === 1 ? "" : "s"} use this assignee`}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination: ONE menu field, above the vouchers ────── */}
        <Box sx={{ mt: 2 }}>
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
                // With many active assignees the menu carries its own
                // search field at the top — it is focused on open.
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
            // Nothing picked yet → the label doubles as the placeholder;
            // once picked, the field shows the nickname only.
            renderValue={(value) => {
              const picked = destinations.find(
                (a) => String(rowId(a)) === String(value),
              );
              if (!picked) return null;
              return (
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    lineHeight: 1.25,
                    color: colors.textPrimary,
                  }}
                >
                  {rowLabel(picked)}
                </Typography>
              );
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
                    fontSize: "0.82rem",
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
                <Typography sx={{ fontSize: "0.78rem", color: colors.textMuted }}>
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

        {/* ── The vouchers that travel ────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 1,
            mt: 2,
            mb: 0.75,
          }}
        >
          <Typography
            sx={{ fontSize: "0.75rem", fontWeight: 700, color: colors.textPrimary }}
          >
            Vouchers to transfer
          </Typography>
          {!loadingRows && vouchers.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selectedIds.length} of {vouchers.length} selected
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
          {loadingRows ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : vouchers.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This assignee has no vouchers.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all — kept OUT of the scrolling area, so it stays
                  reachable no matter how many vouchers there are. */}
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={toggleAll}
                    sx={{
                      pl: 1.5,
                      pr: 1.25,
                      py: 0.6,
                      bgcolor: colors.headerBg,
                      "&:hover": { bgcolor: colors.hoverBg },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <Checkbox
                        edge="start"
                        checked={allSelected}
                        indeterminate={selectedIds.length > 0 && !allSelected}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Select all"
                      primaryTypographyProps={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
              <Divider sx={{ borderColor: colors.border }} />

              {/* The vouchers — capped height, so an assignee with dozens
                  of them scrolls inside the modal instead of stretching it. */}
              <Box
                sx={{
                  maxHeight: { xs: 200, sm: 260 },
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <List dense disablePadding>
                  {vouchers.map((voucher, idx) => {
                    const checked = selectedIds.includes(voucher.nVoucherId);

                    return (
                      <React.Fragment key={voucher.nVoucherId}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => toggleRow(voucher.nVoucherId)}
                            selected={checked}
                            title={
                              voucher.isRemoved
                                ? "This voucher was removed — only its lines are left behind."
                                : undefined
                            }
                            sx={{
                              pl: 2.25,
                              pr: 1.25,
                              py: 0.75,
                              "&.Mui-selected": { bgcolor: colors.blueBg },
                              "&:hover": { bgcolor: colors.hoverBg },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 34 }}>
                              <Checkbox
                                edge="start"
                                checked={checked}
                                tabIndex={-1}
                                disableRipple
                                size="small"
                              />
                            </ListItemIcon>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              {/* The DV code — the voucher's own number, in
                                  the same small uppercase style the voucher
                                  views use. */}
                              <Typography
                                sx={{
                                  fontSize: "0.62rem",
                                  textTransform: "uppercase",
                                  lineHeight: 1.1,
                                  color: colors.textMuted,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  // A voucher that no longer exists has no DV
                                  // number — its id stands in, in italics.
                                  fontStyle: voucher.isRemoved ? "italic" : "normal",
                                  fontWeight: voucher.isRemoved ? 500 : 700,
                                }}
                              >
                                {voucher.strNumber || "—"}
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                color: colors.textSecondary,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {fmtPHP(voucher.dAmount)}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                        {idx < vouchers.length - 1 && (
                          <Divider sx={{ borderColor: colors.border }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              </Box>
            </>
          )}
        </Box>

        <Typography
          sx={{ fontSize: "0.64rem", color: colors.textMuted, mt: 1, lineHeight: 1.5 }}
        >
          Only this assignee&apos;s lines on the selected vouchers move — the
          voucher, its amounts and the lines of any other assignee on it stay
          exactly as they are.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferAssigneeModal;
