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
import SupplierAPI from "../../../../api/endpoints/supplier.api.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on a supplier that still
 * carries purchase options (canvass results).
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

  const { statusTransaction, archiveStatus, voucherStatus } = useKeysLabels();

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

  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setOptionSearch("");
    if (!open || supplierId == null) {
      setOptions([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    setLoadingOptions(true);
    SupplierAPI.getOptions(supplierId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.options ?? []);
        setOptions(list);
        setSelectedIds(list.map((o) => o.nPurchaseItemId));
      })
      .catch((err) => {
        console.error("Failed to load supplier options:", err);
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

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
      console.error("RecordConnectionModal: an `onTransfer` handler is required.");
      return;
    }

    const entity = supplierName || "Supplier";
    setSaving(true);
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
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

  const rowRender = useCallback(
    (option, idx, checked, statusLabel, archived) => {
      const dvNumber = option.strDVNumber || "";
      const dvStatusLabel =
        voucherStatus?.[String(option.voucher_status ?? "")] ?? "";
      const tagLabel = option.bPurchaseIncluded
        ? "Purchase Included"
        : option.bIncluded
          ? "Included"
          : option.bAddOn
            ? "Add-ons"
            : "";

      return (
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
                noWrap: false,
                lineHeight: 1.25,
              }}
            />
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
                  bgcolor: archived ? colors.textMuted : colors.blueText,
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
        </>
      );
    },
    [colors, voucherStatus],
  );

  if (!open || !supplier) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Supplier Record Connections"
      subTitle={supplierNickName || supplierName}
      showSave
      onSave={handleTransfer}
      saveLabel="Transfer"
      disabled={
        !selected || selectedIds.length === 0 || loadingOptions || loadingDestinations
      }
      cancelLabel="Close"
      onCancel={closeModal}
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
            loading={loadingOptions}
            records={options}
            filteredRecords={filteredOptions}
            searchValue={optionSearch}
            onSearchChange={setOptionSearch}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            selectedIds={selectedIds}
            onToggleRow={toggleOption}
            colors={colors}
            emptyMessage="This supplier has no purchase options."
            emptySearchMessage={(q) => `No option matches “${q}”`}
            searchPlaceholder="Search option…"
            rowRender={rowRender}
            rowId={(o) => o.nPurchaseItemId}
            rowStatus={rowStatus}
            rowIsArchived={rowIsArchived}
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
            }
          />
        </Box>
      </Box>
    </ModalContainer>
  );
}

export default RecordConnectionModal;
