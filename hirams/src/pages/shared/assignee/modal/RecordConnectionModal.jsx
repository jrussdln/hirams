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
 * RecordConnectionModal — the stand-in for Delete on an assignee that
 * still carries vouchers.
 *
 * An assignee on a voucher cannot simply be removed: the voucher lines
 * would be left pointing at nothing. Instead they are MOVED to another
 * assignee — so the modal lists the vouchers this assignee is on, lets the
 * user pick which of them travel, and picks the active assignee they go
 * to.
 *
 *   <RecordConnectionModal
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
  // "view" — the records list is read-only, nothing selectable yet.
  // "configure" — the Transfer Records step: destination + which records.
  const [mode, setMode] = useState("view");

  // A fresh voucher list, a fresh destination list and a clean pick every
  // time the modal opens — the assignee may have changed since the last
  // visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setVoucherSearch("");
    setMode("view");
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

  // The vouchers narrowed by the header search — matches the DV number,
  // the same substring rule the destination filter applies.
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
      // Without the transfer handler there is nowhere to send the request —
      // say so in the console instead of failing silently on click.
      console.error("RecordConnectionModal: an `onTransfer` handler is required.");
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
      title="Assignee Record Connections"
      subTitle={assigneeName}
      // Footer follows the step: viewing offers "Transfer Records" (which
      // enters the configure step), configuring offers the actual transfer.
      showSave
      onSave={mode === "view" ? () => setMode("configure") : handleTransfer}
      saveLabel={mode === "view" ? "Transfer Records" : "Transfer"}
      disabled={
        mode === "view"
          ? loadingRows || vouchers.length === 0
          : !selected || selectedIds.length === 0
      }
      cancelLabel={mode === "view" ? "Close" : "Back"}
      onCancel={
        mode === "view" ? closeModal : () => setMode("view")
      }
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
            {/* With a nickname on top, the full name is the quiet echo
                underneath — no voucher count, no loading note. */}
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

        {/* ── The records (header removed — the list box opens directly) ─ */}
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            mt: 2,
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
          <Box
            sx={{
              bgcolor: colors.headerBg,
              // Right: the shared 19px gutter after the search field.
              // Left: 4px in configure (the checkbox pads out to the shared
              // 19px line); 19px in view, where the search field itself is
              // the first element and needs the full gutter.
              pl: mode === "configure" ? 0.5 : "19px",
              pr: "19px",
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {/* Select-all — checkbox-only, at the left edge of the
                search header. A configure-step control only: plain
                viewing has no picks, so the search takes the full row. */}
            {mode === "configure" && (
              <Checkbox
                checked={allSelected}
                indeterminate={selectedIds.length > 0 && !allSelected}
                onChange={toggleAll}
                tabIndex={-1}
                disableRipple
                size="small"
                // Header box pad (4px) + 15px left padding = svg at 19px —
                // the same start line as the row checkboxes (10px button
                // pad + 9px checkbox pad). Right/top/bottom padding keeps
                // the header bar from growing taller.
                sx={{
                  flexShrink: 0,
                  p: "9px 9px 9px 15px",
                }}
              />
            )}
            <TextField
              size="small"
              fullWidth
              hiddenLabel
              placeholder="Search voucher…"
              value={voucherSearch}
              onChange={(e) => setVoucherSearch(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: colors.inputBg,
                  fontSize: "0.72rem",
                  "& fieldset": { borderColor: colors.border },
                },
                "& .MuiOutlinedInput-input": {
                  py: 0.5,
                },
                "& .MuiInputAdornment-root svg": {
                  fontSize: "0.9rem",
                  color: colors.textMuted,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {filteredVouchers.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: colors.textMuted }}>
                No voucher matches “{voucherSearch.trim()}”
              </Typography>
            </Box>
          )}

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
              {filteredVouchers.map((voucher, idx) => {
                const checked = selectedIds.includes(voucher.nVoucherId);

                return (
                  <React.Fragment key={voucher.nVoucherId}>
                    <ListItem disablePadding>
                      <ListItemButton
                        disableRipple={mode === "view"}
                        title={
                          voucher.isRemoved
                            ? "This voucher was removed — only its lines are left behind."
                            : undefined
                        }
                        sx={{
                          // The checkbox leads with real breathing room —
                          // 10px button pad + 9px checkbox pad puts the
                          // svg at 19px, exactly where the header's
                          // select-all checkbox sits (see its padding).
                          pl: 1.25,
                          pr: 1.25,
                          py: 0.4,
                          "&.Mui-selected": { bgcolor: colors.blueBg },
                          "&:hover": { bgcolor: colors.hoverBg },
                          ...(mode === "view" && {
                            cursor: "default",
                            "&:hover": { bgcolor: "transparent" },
                          }),
                        }}
                        onClick={
                          mode === "configure"
                            ? () => toggleRow(voucher.nVoucherId)
                            : undefined
                        }
                        selected={mode === "configure" && checked}
                      >
                        {/* Numbering — view mode only: it leads the row
                            there, since the checkbox column (and its
                            alignment) belongs to the configure step. */}
                        {mode === "view" && (
                          <Typography
                            component="span"
                            sx={{
                              width: 20,
                              flexShrink: 0,
                              textAlign: "right",
                              mr: 1,
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: colors.textMuted,
                              lineHeight: 1,
                            }}
                          >
                            {idx + 1}.
                          </Typography>
                        )}
                        {mode === "configure" && (
                          <ListItemIcon
                            sx={{
                              minWidth: 34,
                              // No stray margins — the checkbox inside
                              // places itself.
                              mr: 0,
                              ml: 0,
                            }}
                          >
                            <Checkbox
                              // No `edge="start"` — it applies a -3px
                              // left margin that breaks the alignment
                              // with the header's select-all checkbox.
                              checked={checked}
                              disableRipple
                              size="small"
                              sx={{ p: "9px" }}
                            />
                          </ListItemIcon>
                        )}
                        <Box
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            // Kill the margins the ListItemText variants
                            // carry — including the `margin: 6px 0` the
                            // multiline root gets — so the DV code and the
                            // status line below it hug.
                            "& .MuiListItemText-root": { my: 0 },
                            "& .MuiListItemText-primary": { my: 0 },
                            "& .MuiListItemText-secondary": { my: 0 },
                          }}
                        >
                          <ListItemText
                            // The DV code on top — the voucher's own number,
                            // bold like the client's trans code. A voucher
                            // that no longer exists has no DV number — its id
                            // stands in, in italics.
                            primary={voucher.strNumber || "—"}
                            primaryTypographyProps={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: colors.textPrimary,
                              noWrap: true,
                              fontStyle:
                                voucher.isRemoved ? "italic" : "normal",
                              lineHeight: 1.25,
                            }}
                          />
                          {/* The voucher's own status — italicized, the
                              DV's counterpart to the supplier rows' DV
                              echo line. */}
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
                      </ListItemButton>
                    </ListItem>
                    {idx < filteredVouchers.length - 1 && (
                      <Divider sx={{ borderColor: colors.border }} />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          </Box>

          {/* ── List footer: the Transfer to picker ──────────────
              Pinned below the scrolling rows, so the hand-over
              target is always reachable. Configure step only. */}
          {mode === "configure" && (
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
                // Nothing picked yet → the label doubles as the
                // placeholder; once picked, the nickname only.
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
                  // A little air between the scrolling rows above and
                  // the picker itself — plus the label/field sizes that
                  // must stay in sync to avoid the notch overlapping.
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
          )}
          </>
          )}
        </Box>
      </Box>
    </ModalContainer>
  );
}

export default RecordConnectionModal;
