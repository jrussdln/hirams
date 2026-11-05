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
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on a direct cost
 * option whose option name still appears in a transaction.
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

function RecordConnectionModal({
  open,
  handleClose,
  option = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const { statusTransaction, archiveStatus } = useKeysLabels();

  const rowStatus = useCallback(
    (cost) => {
      const code = String(cost?.status_code ?? "");
      return (
        cost?.status ??
        statusTransaction?.[code] ??
        archiveStatus?.[code] ??
        ""
      );
    },
    [statusTransaction, archiveStatus],
  );

  const rowIsArchived = useCallback(
    (cost) => {
      const code = String(cost?.status_code ?? "");
      return !!archiveStatus?.[code] && !statusTransaction?.[code];
    },
    [statusTransaction, archiveStatus],
  );

  const optionId = option?.id ?? null;
  const optionName = option?.costName ?? option?.strName ?? "";

  const [costs, setCosts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [costSearch, setCostSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
    setTargetId(null);
    setDestinationSearch("");
    setCostSearch("");
    if (!open || optionId == null) {
      setCosts([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    setLoadingRows(true);
    DirectCostOptionAPI.getCosts(optionId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.data ?? res?.costs ?? []);
        setCosts(list);
        setSelectedIds(list.map((c) => c.id));
      })
      .catch((err) => {
        console.error("Failed to load direct cost entries:", err);
        if (!cancelled) setCosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

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

  const filteredCosts = useMemo(() => {
    const q = costSearch.trim().toLowerCase();
    if (!q) return costs;
    return costs.filter(
      (c) =>
        String(c.code || "").toLowerCase().includes(q) ||
        String(c.label || "").toLowerCase().includes(q),
    );
  }, [costs, costSearch]);

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
      console.error(
        "RecordConnectionModal: an `onTransfer` handler is required.",
      );
      return;
    }

    const entity = optionName || "Direct Cost Option";
    setSaving(true);
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
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

  const rowRender = useCallback(
    (cost, idx, checked, statusLabel, archived) => (
      <>
        <ListItemText
          primary={cost.code || "Transaction"}
          secondary={cost.label || ""}
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
              fontSize: "0.78rem",
              fontWeight: 700,
              color: colors.textSecondary,
              whiteSpace: "nowrap",
            }}
          >
            {fmtPHP(cost.amount)}
          </Typography>
        </Box>
      </>
    ),
    [colors],
  );

  if (!open || !option) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Direct Cost Record Connections"
      subTitle={optionName}
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
                lineHeight: 1.3,
              }}
            >
              Current
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
                lineHeight: 1.2,
              }}
            >
              {optionName || "—"}
            </Typography>
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
            records={costs}
            filteredRecords={filteredCosts}
            searchValue={costSearch}
            onSearchChange={setCostSearch}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            colors={colors}
            emptyMessage="This option has no entries in any transaction."
            emptySearchMessage={(q) => `No transaction matches “${q}”`}
            searchPlaceholder="Search transaction…"
            rowRender={rowRender}
            rowId={(c) => c.id}
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
                      (o) => String(rowId(o)) === String(value),
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
                        {rowName(picked)}
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
                          fontSize: "0.78rem",
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
                      <Typography
                        sx={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
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
            }
          />
        </Box>
      </Box>
    </ModalContainer>
  );
}

export default RecordConnectionModal;
