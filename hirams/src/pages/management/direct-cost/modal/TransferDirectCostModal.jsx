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
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferDirectCostModal — the stand-in for Delete on a direct cost
 * option whose option name still appears in a transaction.
 *
 * An option used in a transaction cannot simply be removed: its entries
 * would be left pointing at nothing. Instead they are MOVED to another
 * option — so the modal lists the transactions that charge a cost to this
 * option, lets the user pick which of them travel, and picks the option
 * they go to.
 *
 *   <TransferDirectCostModal
 *     open={openTransferModal}
 *     handleClose={handleCloseTransferModal}
 *     option={selectedCost}
 *     onTransfer={handleTransferCosts}  // from useDirectCost
 *   />
 *
 * The move itself belongs to `onTransfer` (useDirectCost's
 * handleTransferCosts): it sends the request, runs it behind the spinner
 * and refetches the option list (refreshing the session cache). This modal
 * only picks what moves and where it goes; a refusal from the API is shown
 * with its own message so it explains itself.
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
const rowId = (o) => o?.nDirectCostOptionID ?? o?.id;
const rowName = (o) => o?.strName ?? o?.name ?? "";

function TransferDirectCostModal({
  open,
  handleClose,
  option = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const optionId = option?.id ?? null;
  const optionName = option?.costName ?? option?.strName ?? "";

  const [costs, setCosts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // A fresh entry list, a fresh destination list and a clean pick every
  // time the modal opens — the option may have changed since the last
  // visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    if (!open || optionId == null) {
      setCosts([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    // ── The transactions charging a cost to this option ───────────
    setLoadingRows(true);
    DirectCostOptionAPI.getCosts(optionId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.data ?? res?.costs ?? []);
        setCosts(list);
        // Everything is picked by default — the common case is a clean
        // hand-over of the whole option.
        setSelectedIds(list.map((c) => c.id));
      })
      .catch((err) => {
        console.error("Failed to load direct cost entries:", err);
        if (!cancelled) setCosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    // ── The options it can be handed over to ──────────────────────
    setLoadingDestinations(true);
    DirectCostOptionAPI.getDirectCostOptions()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.data ?? res ?? []);
        setDestinations(
          list.filter((o) => String(rowId(o)) !== String(optionId)),
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
  }, [open, optionId]);

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter((o) => rowName(o).toLowerCase().includes(q));
  }, [destinations, destinationSearch]);

  const selected = useMemo(
    () =>
      destinations.find((o) => String(rowId(o)) === String(targetId)) ?? null,
    [destinations, targetId],
  );

  const allSelected = costs.length > 0 && selectedIds.length === costs.length;

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === costs.length ? [] : costs.map((c) => c.id),
    );
  }, [costs]);

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
      console.error(
        "TransferDirectCostModal: an `onTransfer` handler is required.",
      );
      return;
    }

    const entity = optionName || "Direct Cost Option";
    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear. The parent's close is
    // called directly here, so the "saving" guard cannot hold it back.
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        // The source option travels with the call, so closing the modal
        // (and dropping the selection) does not lose it.
        await onTransfer(optionId, rowId(selected), selectedIds);
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
  if (!open || !option) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Transfer Direct Cost Entries"
      subTitle={optionName}
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
        {/* ── The option being handed over ─────────────────────────── */}
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
              title={optionName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {optionName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {loadingRows
                ? "Loading entries…"
                : `${costs.length} entr${costs.length === 1 ? "y" : "ies"} use this option`}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination: ONE menu field, above the entries ───────── */}
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
                // With many options the menu carries its own search field
                // at the top — it is focused on open.
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
            // once picked, the field shows the option name.
            renderValue={(value) => {
              const picked = destinations.find(
                (o) => String(rowId(o)) === String(value),
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
                  {rowName(picked)}
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
                  placeholder="Search option…"
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
            {filteredDestinations.map((o) => (
              <MenuItem key={rowId(o)} value={rowId(o)}>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {rowName(o)}
                </Typography>
              </MenuItem>
            ))}
            {filteredDestinations.length === 0 && (
              <MenuItem disabled>
                <Typography sx={{ fontSize: "0.78rem", color: colors.textMuted }}>
                  No option matches “{destinationSearch.trim()}”
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
              No other direct cost option is available to transfer to.
            </Typography>
          )}
        </Box>

        {/* ── The entries that travel ──────────────────────────────── */}
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
            Entries to transfer
          </Typography>
          {!loadingRows && costs.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selectedIds.length} of {costs.length} selected
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
          ) : costs.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This option has no entries in any transaction.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all — kept OUT of the scrolling area, so it stays
                  reachable no matter how many entries there are. */}
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

              {/* The entries — capped height, so an option charged in many
                  transactions scrolls inside the modal instead of
                  stretching it. */}
              <Box
                sx={{
                  maxHeight: { xs: 200, sm: 260 },
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <List dense disablePadding>
                  {costs.map((cost, idx) => {
                    const checked = selectedIds.includes(cost.id);

                    return (
                      <React.Fragment key={cost.id}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => toggleRow(cost.id)}
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
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              {/* The transaction code — the small uppercase
                                  style the code labels use everywhere. */}
                              <Typography
                                sx={{
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  lineHeight: 1.1,
                                  color: colors.textMuted,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {cost.code || "Transaction"}
                              </Typography>
                              {cost.label && (
                                <Typography
                                  title={cost.label}
                                  sx={{
                                    fontSize: "0.66rem",
                                    color: colors.textMuted,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {cost.label}
                                </Typography>
                              )}
                            </Box>
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                color: colors.textSecondary,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                ml: 1,
                              }}
                            >
                              {fmtPHP(cost.amount)}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                        {idx < costs.length - 1 && (
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
          Only this option&apos;s charge changes — the entries keep their
          amounts and their transactions exactly as they are.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferDirectCostModal;
