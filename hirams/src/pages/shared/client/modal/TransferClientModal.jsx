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
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferClientModal — the stand-in for Delete on a client that still
 * carries transactions.
 *
 * A client with transactions cannot simply be removed: the transactions
 * would be left pointing at nothing. Instead they are MOVED to another
 * client — so the modal lists the transactions that name this client, lets
 * the user pick which of them travel, and picks the active client they go
 * to.
 *
 *   <TransferClientModal
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

function TransferClientModal({
  open,
  handleClose,
  client = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

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
  const [saving, setSaving] = useState(false);

  // A fresh transaction list, a fresh destination list and a clean pick
  // every time the modal opens — the client may have changed since the
  // last visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
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
      console.error("TransferClientModal: an `onTransfer` handler is required.");
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
      title="Transfer Client Transactions"
      subTitle={clientName}
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
              }}
            >
              Transferring from
            </Typography>
            <Typography
              title={clientName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {clientNickName || clientName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {clientNickName ? `${clientName} · ` : ""}
              {loadingRows
                ? "Loading transactions…"
                : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} use this client`}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination: ONE menu field, above the transactions ─── */}
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
                // With many active clients the menu carries its own search
                // field at the top — it is focused on open.
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
                (c) => String(rowId(c)) === String(value),
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
                    fontSize: "0.82rem",
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
                <Typography sx={{ fontSize: "0.78rem", color: colors.textMuted }}>
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

        {/* ── The transactions that travel ─────────────────────────── */}
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
            Transactions to transfer
          </Typography>
          {!loadingRows && transactions.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selectedIds.length} of {transactions.length} selected
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
          ) : transactions.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This client has no transactions.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all — kept OUT of the scrolling area, so it stays
                  reachable no matter how many transactions there are. */}
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
                  {transactions.map((transaction, idx) => {
                    const checked = selectedIds.includes(transaction.nTransactionId);

                    return (
                      <React.Fragment key={transaction.nTransactionId}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => toggleRow(transaction.nTransactionId)}
                            selected={checked}
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
                            <ListItemText
                              primary={transaction.strCode || "Transaction"}
                              secondary={transaction.strTitle || ""}
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
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                flexShrink: 0,
                              }}
                            >
                              {transaction.current_status_label && (
                                <Box
                                  sx={{
                                    px: 0.75,
                                    py: 0.15,
                                    borderRadius: "9999px",
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    background: colors.blueBg,
                                    color: colors.blueText,
                                  }}
                                >
                                  {transaction.current_status_label}
                                </Box>
                              )}
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  color: colors.textSecondary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmtPHP(transaction.dTotalABC)}
                              </Typography>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                        {idx < transactions.length - 1 && (
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
          Only the selected transactions change client — their items, prices,
          JEV and purchase orders stay exactly as they are.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferClientModal;
