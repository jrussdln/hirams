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
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on a supplier that still
 * carries purchase options (canvass results).
 *
 * A supplier with options cannot simply be removed: the options would be
 * left pointing at nothing. Instead they are MOVED to another supplier —
 * so the modal lists the options that name this supplier, lets the user
 * pick which of them travel, and picks the active supplier they go to.
 *
 *   <RecordConnectionModal
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

function RecordConnectionModal({
  open,
  handleClose,
  supplier = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  // The status maps the client modal resolves its rows with: workflow
  // codes live in `statusTransaction`, end-of-life codes (Archived / Lost
  // / Completed) in `archiveStatus` — this way the status shows even when
  // the API carries no label.
  const { statusTransaction, archiveStatus, voucherStatus } = useKeysLabels();

  // Status label of an option row — the same resolution order the client
  // modal applies: the API's label first, then the maps by code.
  const rowStatus = useCallback(
    (option) => {
      const code = String(option?.status_code ?? "");
      return (
        option?.status ??
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
    (option) => {
      const code = String(option?.status_code ?? "");
      return !!archiveStatus?.[code] && !statusTransaction?.[code];
    },
    [statusTransaction, archiveStatus],
  );

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
  const [optionSearch, setOptionSearch] = useState("");
  const [saving, setSaving] = useState(false);
  // "view" — the records list is read-only, nothing selectable yet.
  // "configure" — the Transfer Records step: destination + which records.
  const [mode, setMode] = useState("view");

  // A fresh option list, a fresh destination list and a clean pick every
  // time the modal opens — the supplier may have changed since last visit.
  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setOptionSearch("");
    setMode("view");
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

  // The options narrowed by the header search — matches the item name,
  // brand, model or transaction code, the same substring rule the
  // destination filter applies.
  const filteredOptions = useMemo(() => {
    const q = optionSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const [brand = "", model = ""] = [o.strBrand, o.strModel];
      return (
        String(o.strItemName || "").toLowerCase().includes(q) ||
        String(brand).toLowerCase().includes(q) ||
        String(model).toLowerCase().includes(q) ||
        String(o.strTransactionCode || "")
          .toLowerCase()
          .includes(q) ||
        String(o.strTransactionTitle || "")
          .toLowerCase()
          .includes(q) ||
        String(o.strDVNumber || "").toLowerCase().includes(q)
      );
    });
  }, [options, optionSearch]);

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
      console.error("RecordConnectionModal: an `onTransfer` handler is required.");
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
      title="Supplier Record Connections"
      subTitle={supplierName}
      // Footer follows the step: viewing offers "Transfer Records" (which
      // enters the configure step), configuring offers the actual transfer.
      showSave
      onSave={mode === "view" ? () => setMode("configure") : handleTransfer}
      saveLabel={mode === "view" ? "Transfer Records" : "Transfer"}
      disabled={
        mode === "view"
          ? loadingOptions || options.length === 0
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
                lineHeight: 1.3,
              }}
            >
              Current
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
                lineHeight: 1.2,
              }}
            >
              {supplierNickName || supplierName || "—"}
            </Typography>
            {/* With a nickname on top, the full name is the quiet echo
                underneath — no option count, no loading note. */}
            {supplierNickName && (
              <Typography
                title={supplierName}
                sx={{
                  fontSize: "0.64rem",
                  color: colors.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {supplierName}
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
              placeholder="Search option…"
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
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
          {filteredOptions.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: colors.textMuted }}>
                No option matches “{optionSearch.trim()}”
              </Typography>
            </Box>
          )}

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
              {filteredOptions.map((option, idx) => {
                const checked = selectedIds.includes(option.nPurchaseItemId);
                const statusLabel = rowStatus(option);
                const archived = rowIsArchived(option);
                // "Vouchered" — the transaction has a DV on its journal.
                // Its number then becomes the echo-line below
                // brand · model.
                const dvNumber = option.strDVNumber || "";
                // The DV's own status — its voucher's label from the
                // voucherStatus map, joined to the number on the
                // echo-line ("DV2026-0001 — CLOSED").
                const dvStatusLabel =
                  voucherStatus?.[String(option.voucher_status ?? "")] ?? "";
                // Which tag the option carries, by precedence: a purchase
                // price that counts wins, then the included flag, then
                // the add-on one. Nothing true → no label.
                const tagLabel = option.bPurchaseIncluded
                  ? "Purchase Included"
                  : option.bIncluded
                    ? "Included"
                    : option.bAddOn
                      ? "Add-ons"
                      : "";

                return (
                  <React.Fragment key={option.nPurchaseItemId}>
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
                            ? () => toggleOption(option.nPurchaseItemId)
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
                            // carry, above all the `margin: 6px 0` the
                            // multiline root gets (both primary AND
                            // secondary present) — that 6px is the whole
                            // reason the DV line sat too far below
                            // brand · model.
                            "& .MuiListItemText-root": { my: 0 },
                            "& .MuiListItemText-primary": { my: 0 },
                            "& .MuiListItemText-secondary": { my: 0 },
                          }}
                        >
                          <ListItemText
                            // Trans code on top; brand · model is the quiet
                            // uppercased echo below — same styling as the
                            // client modal's rows.
                            primary={
                              option.strTransactionCode ||
                              option.strTransactionTitle ||
                              option.strItemName ||
                              "Option"
                            }
                            secondary={
                              [option.strBrand, option.strModel]
                                .filter(Boolean)
                                .join(" · ") ||
                              option.strItemName ||
                              ""
                            }
                            primaryTypographyProps={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: colors.textPrimary,
                              noWrap: true,
                              lineHeight: 1.25,
                            }}
                            secondaryTypographyProps={{
                              fontSize: "0.68rem",
                              fontWeight: 500,
                              color: colors.textMuted,
                              textTransform: "uppercase",
                              // Wraps freely — long titles take a second
                              // line instead of vanishing into an ellipsis.
                              noWrap: false,
                              lineHeight: 1.25,
                            }}
                          />
                          {/* Vouchered — the DV number sits below
                              brand · model as the row's last echo line. */}
                          {dvNumber && (
                            <Typography
                              title={dvNumber}
                              sx={{
                                fontSize: "0.62rem",
                                fontWeight: 600,
                                fontStyle: "italic",
                                color: colors.textSecondary,
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                // Same tight leading as the code and
                                // brand · model lines above it.
                                lineHeight: 1.25,
                              }}
                            >
                              {dvStatusLabel && `${dvStatusLabel} `}
                              {dvNumber}
                            </Typography>
                          )}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 0.25,
                            flexShrink: 0,
                          }}
                        >
                          {/* Status — the client modal's dot-pill chip, in
                              caps. Always present: an unknown status
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
                              fontSize: "0.62rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              color: colors.textSecondary,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtQty(option.nQuantity)} {option.strUOM || ""} ·{" "}
                            {fmtPHP(option.dUnitPrice)}
                          </Typography>
                          {/* The option's tag — PURCHASE INCLUDED beats
                              INCLUDED beats ADD-ONS, one quiet caps line
                              under the amount. */}
                          {tagLabel && (
                            <Typography
                              sx={{
                                fontSize: "0.52rem",
                                fontWeight: 700,
                                letterSpacing: "0.02em",
                                textTransform: "uppercase",
                                color: colors.textMuted,
                                lineHeight: 1,
                              }}
                            >
                              {tagLabel}
                            </Typography>
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                    {idx < filteredOptions.length - 1 && (
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
                // Nothing picked yet → the label doubles as the
                // placeholder; once picked, the nickname only.
                renderValue={(value) => {
                  const picked = destinations.find(
                    (s) => String(rowId(s)) === String(value),
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
                        fontSize: "0.78rem",
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
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textMuted }}
                    >
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
          )}
          </>
          )}
        </Box>
      </Box>
    </ModalContainer>
  );
}

export default RecordConnectionModal;
