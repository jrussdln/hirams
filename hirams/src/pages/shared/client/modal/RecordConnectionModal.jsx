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
import ClientAPI from "../../../../api/endpoints/client.api.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on a client that still
 * carries transactions.
 *
 * A client with transactions cannot simply be removed: the transactions
 * would be left pointing at nothing. Instead they are MOVED to another
 * client — so the modal lists the transactions that name this client, lets
 * the user pick which of them travel, and picks the active client they go
 * to.
 *
 *   <RecordConnectionModal
 *     open={openTransferModal}
 *     handleClose={handleCloseTransferModal}
 *     client={selectedClient}
 *     onTransfer={handleTransferTransactions}  // from useClient
 *   />
 *
 * The move itself belongs to `onTransfer` (useClient's
 * handleTransferTransactions): it sends the request, runs it behind the
 * spinner and refetches the client list. This modal only picks what moves
 * and where it goes; a refusal from the API is shown with its own message
 * so it explains itself.
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
const rowId = (c) => c?.nClientId;
const rowName = (c) => c?.strClientName ?? "";
const rowNickName = (c) => c?.strClientNickName ?? "";
// The menu field shows the NICKNAME only — it is the short handle the
// office actually uses. The full name is the fallback for the rare client
// that carries no nickname at all.
const rowLabel = (c) => rowNickName(c).trim() || rowName(c);

function RecordConnectionModal({
  open,
  handleClose,
  client = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  // The status maps the search lookup uses (LookUpTransactions): workflow
  // codes live in `statusTransaction`, end-of-life codes (Archived / Lost /
  // Completed) in `archiveStatus`. One row can sit at either, so both are
  // checked — this way the status shows even when the API carries no label.
  const { statusTransaction, archiveStatus } = useKeysLabels();

  // Status label of a transaction row — the same resolution order the
  // lookup applies: the API's own label first, then the workflow map,
  // then the archive map.
  // Status label of a transaction row — the same resolution order the
  // lookup applies: the API's own label first, then the workflow map,
  // then the archive map.
  const rowStatus = useCallback(
    (t) => {
      const code = String(t?.current_status ?? "");
      return (
        t?.current_status_label ??
        statusTransaction?.[code] ??
        archiveStatus?.[code] ??
        ""
      );
    },
    [statusTransaction, archiveStatus],
  );

  // TRUE when the row sits at an end-of-life status — the lookup paints
  // those rows' dot gray instead of blue.
  const rowIsArchived = useCallback(
    (t) => {
      const code = String(t?.current_status ?? "");
      return !!archiveStatus?.[code] && !statusTransaction?.[code];
    },
    [statusTransaction, archiveStatus],
  );

  const clientId = client?.id ?? null;
  const clientName = client?.name ?? "";
  const clientNickName = client?.nickname ?? "";

  const [transactions, setTransactions] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [saving, setSaving] = useState(false);
  // "view" — the records list is read-only, nothing selectable yet.
  // "configure" — the Transfer Records step: destination + which records.
  const [mode, setMode] = useState("view");

  // A fresh transaction list, a fresh destination list and a clean pick
  // every time the modal opens — the client may have changed since the
  // last visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setTransactionSearch("");
    setMode("view");
    if (!open || clientId == null) {
      setTransactions([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    // ── The transactions that name this client ───────────────────
    setLoadingRows(true);
    ClientAPI.getTransactions(clientId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.transactions ?? []);
        setTransactions(list);
        // Everything is picked by default — the common case is a clean
        // hand-over of the whole client.
        setSelectedIds(list.map((t) => t.nTransactionId));
      })
      .catch((err) => {
        console.error("Failed to load client transactions:", err);
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    // ── The active clients it can be handed over to ──────────────
    setLoadingDestinations(true);
    ClientAPI.getActiveClients()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.clients ?? []);
        setDestinations(
          list.filter((c) => String(rowId(c)) !== String(clientId)),
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
  }, [open, clientId]);

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (c) =>
        rowName(c).toLowerCase().includes(q) ||
        rowNickName(c).toLowerCase().includes(q),
    );
  }, [destinations, destinationSearch]);

  // The transactions narrowed by the header search — matches the code
  // or the title, same substring rule the destination filter applies.
  const filteredTransactions = useMemo(() => {
    const q = transactionSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        String(t.strCode || "").toLowerCase().includes(q) ||
        String(t.strTitle || "").toLowerCase().includes(q),
    );
  }, [transactions, transactionSearch]);

  const selected = useMemo(
    () => destinations.find((c) => String(rowId(c)) === String(targetId)) ?? null,
    [destinations, targetId],
  );

  const allSelected =
    transactions.length > 0 && selectedIds.length === transactions.length;

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === transactions.length
        ? []
        : transactions.map((t) => t.nTransactionId),
    );
  }, [transactions]);

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

    const entity = clientNickName || clientName || "Client";
    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear. The parent's close is
    // called directly here, so the "saving" guard cannot hold it back.
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        // The source client travels with the call, so closing the modal
        // (and dropping the selection) does not lose it.
        await onTransfer(clientId, rowId(selected), selectedIds);
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
  if (!open || !client) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Client Record Connections"
      subTitle={clientName}
      // Footer follows the step: viewing offers "Transfer Records" (which
      // enters the configure step), configuring offers the actual transfer.
      showSave
      onSave={mode === "view" ? () => setMode("configure") : handleTransfer}
      saveLabel={mode === "view" ? "Transfer Records" : "Transfer"}
      disabled={
        mode === "view"
          ? loadingRows || transactions.length === 0
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
        {/* ── The client being handed over ────────────────────────── */}
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
              title={clientName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {clientNickName || clientName || "—"}
            </Typography>
            {/* With a nickname on top, the full name is the quiet echo
                underneath — no transaction count, no loading note. */}
            {clientNickName && (
              <Typography
                title={clientName}
                sx={{
                  fontSize: "0.64rem",
                  color: colors.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {clientName}
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── The "Transfer to" picker now lives in the list footer ── */}

        {/* ── The records (header removed — the list box opens directly) ─ */}
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            mt: 2,
          }}
        >
          {/* ── List header: the search field ─────────────────────────
              Sits above the rows (and the select-all bar), outside the
              scrolling area, so it stays reachable however long the
              list is. The loading / empty states keep the box as-is. */}
          {loadingRows ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : transactions.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This client has no transactions.
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
            {/* Select-all — checkbox-only now, at the left edge of the
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
              placeholder="Search transaction…"
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 0,
                // Compact field — the small size, tighter paddings
                // and the header background keep it in scale with
                // the 0.7x rows underneath.
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
          {filteredTransactions.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: colors.textMuted }}>
                No transaction matches “{transactionSearch.trim()}”
              </Typography>
            </Box>
          )}

          {/* The transactions — capped height, so a client with dozens
              of them scrolls inside the modal instead of stretching it. */}
              <Box
                sx={{
                  maxHeight: { xs: 200, sm: 260 },
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <List dense disablePadding>
                  {filteredTransactions.map((transaction, idx) => {
                    const checked = selectedIds.includes(transaction.nTransactionId);
                    const statusLabel = rowStatus(transaction);
                    const archived = rowIsArchived(transaction);

                    return (
                      <React.Fragment key={transaction.nTransactionId}>
                        <ListItem disablePadding>
                          <ListItemButton
                            disableRipple={mode === "view"}
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
                                ? () => toggleRow(transaction.nTransactionId)
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
                            {/* Checkbox — vertically aligned with the
                                select-all checkbox in the header row. */}
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
                                  // 9px padding → the svg starts at 10px
                                  // (button pad) + 9px = 19px, on the same
                                  // vertical line as the select-all checkbox.
                                  sx={{ p: "9px" }}
                                />
                              </ListItemIcon>
                            )}
                            {/* The title block */}
                            <ListItemText
                              primary={transaction.strCode || "Transaction"}
                              secondary={transaction.strTitle || ""}
                              primaryTypographyProps={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: colors.textPrimary,
                                noWrap: true,
                              }}
                              secondaryTypographyProps={{
                                fontSize: "0.68rem",
                                fontWeight: 500,
                                color: colors.textMuted,
                                textTransform: "uppercase",
                                // Wraps freely — long titles take a second
                                // line instead of vanishing into an ellipsis.
                                noWrap: false,
                              }}
                            />
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 0.25,
                                flexShrink: 0,
                              }}
                            >
                              {/* Status — the lookup's dot-pill chip, but the
                                  text kept uppercase (caps) like the trans
                                  code. Always present: an unknown status
                                  reads as "—". */}
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  maxWidth: "100%",
                                  flexShrink: 0,
                                  fontSize: "0.52rem",
                                  fontWeight: 700,
                                  color: colors.textPrimary,
                                  textTransform: "uppercase",
                                  bgcolor: colors.mutedBg,
                                  borderRadius: "9999px",
                                  px: 1,
                                  lineHeight: "15px",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 5,
                                    height: 5,
                                    flexShrink: 0,
                                    borderRadius: "50%",
                                    bgcolor: archived
                                      ? colors.textMuted
                                      : colors.blueText,
                                  }}
                                />
                                <Box
                                  component="span"
                                  title={statusLabel || "No status yet"}
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {statusLabel || "—"}
                                </Box>
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  color: colors.textSecondary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmtPHP(transaction.dTotalABC)}
                              </Typography>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                        {idx < filteredTransactions.length - 1 && (
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
                    // Nothing picked yet → the label doubles as the
                    // placeholder; once picked, the nickname only.
                    SelectProps={{
                      MenuProps: {
                        PaperProps: { sx: { maxHeight: 320 } },
                        autoFocus: false,
                      },
                      onOpen: () => {
                        // With many active clients the menu carries its own
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
                    renderValue={(value) => {
                      const picked = destinations.find(
                        (c) => String(rowId(c)) === String(value),
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
                          placeholder="Search client…"
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
                    {filteredDestinations.map((c) => (
                      <MenuItem key={rowId(c)} value={rowId(c)}>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: colors.textPrimary,
                          }}
                        >
                          {rowLabel(c)}
                        </Typography>
                      </MenuItem>
                    ))}
                    {filteredDestinations.length === 0 && (
                      <MenuItem disabled>
                        <Typography
                          sx={{ fontSize: "0.75rem", color: colors.textMuted }}
                        >
                          No client matches “{destinationSearch.trim()}”
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
                      No other active client is available to transfer to.
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
