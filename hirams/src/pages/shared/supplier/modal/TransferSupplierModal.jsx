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
import SupplierAPI from "../../../../api/endpoints/supplier.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferSupplierModal — the stand-in for Delete on a supplier that still
 * carries purchase options (canvass results).
 *
 * A supplier with options cannot simply be removed: the options would be
 * left pointing at nothing. Instead they are MOVED to another supplier —
 * so the modal lists the options that name this supplier, lets the user
 * pick which of them travel, and picks the active supplier they go to.
 *
 *   <TransferSupplierModal
 *     open={openTransferModal}
 *     handleClose={handleCloseTransferModal}
 *     supplier={selectedSupplier}
 *     onTransfer={handleTransferOptions}  // from useSupplier
 *   />
 *
 * The move itself belongs to `onTransfer` (useSupplier's
 * handleTransferOptions): it sends the request, runs it behind the spinner
 * and refetches the supplier list. This modal only picks what moves and
 * where it goes; a refusal from the API is shown with its own message so
 * it explains itself.
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
  amberText: c.amber.textDark,
  amberBg: c.amber.bg,
  greenText: c.green.textDark,
  greenBg: c.green.bg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
});

// Raw API row → { id, name }
const rowId = (s) => s?.nSupplierId;
const rowName = (s) => s?.strSupplierName ?? "";
const rowNickName = (s) => s?.strSupplierNickName ?? "";
// The menu field shows the NICKNAME only — it is the short handle the
// office actually uses ("BOBO"). The full name is the fallback for the
// rare supplier that carries no nickname at all.
const rowLabel = (s) => rowNickName(s).trim() || rowName(s);

function TransferSupplierModal({
  open,
  handleClose,
  supplier = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const supplierId = supplier?.nSupplierId ?? null;
  const supplierName = supplier?.supplierName ?? "";
  const supplierNickName = supplier?.supplierNickName ?? "";

  const [options, setOptions] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // A fresh option list, a fresh destination list and a clean pick every
  // time the modal opens — the supplier may have changed since last visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    if (!open || supplierId == null) {
      setOptions([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    // ── The options that name this supplier ──────────────────────
    setLoadingOptions(true);
    SupplierAPI.getOptions(supplierId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.options ?? []);
        setOptions(list);
        // Everything is picked by default — the common case is a clean
        // hand-over of the whole supplier.
        setSelectedIds(list.map((o) => o.nPurchaseItemId));
      })
      .catch((err) => {
        console.error("Failed to load supplier options:", err);
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    // ── The active suppliers it can be handed over to ────────────
    setLoadingDestinations(true);
    SupplierAPI.getAll()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.suppliers ?? []);
        setDestinations(
          list.filter((s) => String(rowId(s)) !== String(supplierId)),
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
  }, [open, supplierId]);

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (s) =>
        rowName(s).toLowerCase().includes(q) ||
        rowNickName(s).toLowerCase().includes(q),
    );
  }, [destinations, destinationSearch]);

  const selected = useMemo(
    () => destinations.find((s) => String(rowId(s)) === String(targetId)) ?? null,
    [destinations, targetId],
  );

  const allSelected =
    options.length > 0 && selectedIds.length === options.length;

  const toggleOption = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === options.length ? [] : options.map((o) => o.nPurchaseItemId),
    );
  }, [options]);

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
      console.error("TransferSupplierModal: an `onTransfer` handler is required.");
      return;
    }

    const entity = supplierName || "Supplier";
    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear. The parent's close is
    // called directly here, so the "saving" guard cannot hold it back.
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        // The source supplier travels with the call, so closing the modal
        // (and dropping the selection) does not lose it.
        await onTransfer(supplierId, rowId(selected), selectedIds);
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
  if (!open || !supplier) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Transfer Supplier Options"
      subTitle={supplierName}
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
        {/* ── The supplier being handed over ──────────────────────── */}
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
              title={supplierName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {supplierNickName || supplierName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {supplierNickName ? `${supplierName} · ` : ""}
              {loadingOptions
                ? "Loading options…"
                : `${options.length} option${options.length === 1 ? "" : "s"} use this supplier`}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination: ONE menu field, above the options ─────── */}
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
                // With many active suppliers the menu carries its own
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
                (s) => String(rowId(s)) === String(value),
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
                  placeholder="Search supplier…"
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
            {filteredDestinations.map((s) => (
              <MenuItem key={rowId(s)} value={rowId(s)}>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {rowLabel(s)}
                </Typography>
              </MenuItem>
            ))}
            {filteredDestinations.length === 0 && (
              <MenuItem disabled>
                <Typography sx={{ fontSize: "0.78rem", color: colors.textMuted }}>
                  No supplier matches “{destinationSearch.trim()}”
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
              No other active supplier is available to transfer to.
            </Typography>
          )}
        </Box>

        {/* ── The options that travel ─────────────────────────────── */}
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
            Items to transfer
          </Typography>
          {!loadingOptions && options.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selectedIds.length} of {options.length} selected
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
          {loadingOptions ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : options.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This supplier has no purchase options.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all — kept OUT of the scrolling area, so it stays
                  reachable no matter how many options there are. */}
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
                        indeterminate={
                          selectedIds.length > 0 && !allSelected
                        }
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

              {/* The options — capped height, so a supplier with dozens of
                  them scrolls inside the modal instead of stretching it. */}
              <Box
                sx={{
                  maxHeight: { xs: 200, sm: 260 },
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <List dense disablePadding>
                  {options.map((option, idx) => {
                    const checked = selectedIds.includes(option.nPurchaseItemId);
                    const label = [option.strBrand, option.strModel]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <React.Fragment key={option.nPurchaseItemId}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => toggleOption(option.nPurchaseItemId)}
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
                              primary={label || option.strItemName || "Option"}
                              secondary={
                                option.strTransactionCode ||
                                option.strTransactionTitle ||
                                option.strItemName ||
                                ""
                              }
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
                              {option.bIncluded && (
                                <Box
                                  sx={{
                                    px: 0.75,
                                    py: 0.15,
                                    borderRadius: "9999px",
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    background: colors.greenBg,
                                    color: colors.greenText,
                                  }}
                                >
                                  Included
                                </Box>
                              )}
                              {option.bAddOn && (
                                <Box
                                  sx={{
                                    px: 0.75,
                                    py: 0.15,
                                    borderRadius: "9999px",
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    background: colors.amberBg,
                                    color: colors.amberText,
                                  }}
                                >
                                  Add-on
                                </Box>
                              )}
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  color: colors.textSecondary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmtQty(option.nQuantity)} {option.strUOM || ""} ·{" "}
                                {fmtPHP(option.dUnitPrice)}
                              </Typography>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                        {idx < options.length - 1 && (
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
          Only the selected options change supplier — their prices, quantities
          and purchase-order links stay exactly as they are. The contact of
          each option is cleared, since it belongs to the supplier being left
          behind.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferSupplierModal;
