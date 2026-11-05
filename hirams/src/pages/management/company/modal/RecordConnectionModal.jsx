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
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * RecordConnectionModal — the stand-in for Delete on a company that still
 * carries transactions or vouchers.
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
const rowId = (c) => c?.nCompanyId;
const rowName = (c) => c?.strCompanyName ?? "";
const rowNickName = (c) => c?.strCompanyNickName ?? "";
const rowLabel = (c) => rowNickName(c).trim() || rowName(c);

const linkKey = (link) => `${link.type}-${link.id}`;
const isTransaction = (link) => link.type === "transaction";

const fmtDay = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d)
    ? val
    : d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

function RecordConnectionModal({
  open,
  handleClose,
  company = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const { statusTransaction, archiveStatus } = useKeysLabels();

  const rowStatus = useCallback(
    (link) => {
      const code = String(link?.status_code ?? "");
      return (
        link?.status ??
        statusTransaction?.[code] ??
        archiveStatus?.[code] ??
        ""
      );
    },
    [statusTransaction, archiveStatus],
  );

  const rowIsArchived = useCallback(
    (link) => {
      const code = String(link?.status_code ?? "");
      return !!archiveStatus?.[code] && !statusTransaction?.[code];
    },
    [statusTransaction, archiveStatus],
  );

  const companyId = company?.id ?? null;
  const companyName = company?.name ?? "";
  const companyNickName = company?.nickname ?? "";

  const [links, setLinks] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedKeys([]);
    setTargetId(null);
    setDestinationSearch("");
    setRecordSearch("");
    if (!open || companyId == null) {
      setLinks([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    setLoadingRows(true);
    CompanyAPI.getLinks(companyId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.links ?? []);
        setLinks(list);
        setSelectedKeys(list.map(linkKey));
      })
      .catch((err) => {
        console.error("Failed to load company records:", err);
        if (!cancelled) setLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    setLoadingDestinations(true);
    CompanyAPI.getAll()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.companies ?? []);
        setDestinations(
          list.filter((c) => String(rowId(c)) !== String(companyId)),
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
  }, [open, companyId]);

  const filteredLinks = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    if (!q) return links;
    return links.filter((link) => {
      const transaction = isTransaction(link);
      const detail = transaction
        ? link.label || link.status || ""
        : link.status || "Voucher";
      return (
        String(link.code || "").toLowerCase().includes(q) ||
        String(detail).toLowerCase().includes(q) ||
        (transaction ? "transaction" : "voucher").includes(q)
      );
    });
  }, [links, recordSearch]);

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
    () =>
      destinations.find((c) => String(rowId(c)) === String(targetId)) ?? null,
    [destinations, targetId],
  );

  const allSelected = links.length > 0 && selectedKeys.length === links.length;

  const toggleRow = useCallback((key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.length === links.length ? [] : links.map(linkKey),
    );
  }, [links]);

  const closeModal = () => {
    if (saving) return;
    handleClose?.();
  };

  const handleTransfer = async () => {
    if (!selected || saving) return;
    if (selectedKeys.length === 0) return;
    if (typeof onTransfer !== "function") {
      console.error("RecordConnectionModal: an `onTransfer` handler is required.");
      return;
    }

    const picked = links.filter((link) => selectedKeys.includes(linkKey(link)));
    const transactionIds = picked
      .filter(isTransaction)
      .map((link) => link.id);
    const voucherIds = picked.filter((link) => !isTransaction(link)).map((l) => l.id);

    const entity = companyNickName || companyName || "Company";
    setSaving(true);
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        await onTransfer(companyId, rowId(selected), transactionIds, voucherIds);
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
    (link, idx, checked, statusLabel, archived) => {
      const transaction = isTransaction(link);
      const secondary = transaction ? link.label || "" : "Voucher";

      return (
        <>
          <ListItemText
            primary={
              link.code ||
              (transaction ? "Transaction" : "Voucher")
            }
            secondary={secondary}
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
              {transaction && link.amount != null
                ? fmtPHP(link.amount)
                : fmtDay(link.dtCreated)}
            </Typography>
          </Box>
        </>
      );
    },
    [colors],
  );

  if (!open || !company) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Company Record Connections"
      subTitle={companyNickName || companyName}
      showSave
      onSave={handleTransfer}
      saveLabel="Transfer"
      disabled={
        !selected || selectedKeys.length === 0 || loadingRows || loadingDestinations
      }
      cancelLabel="Close"
      onCancel={closeModal}
      loading={saving}
      width={{ xs: "95%", sm: 560, md: 720 }}
      contentPadding={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ mt: 0.5 }}>
        {/* ── The company being handed over ────────────────────────── */}
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
              title={companyName}
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
              {companyNickName || companyName || "—"}
            </Typography>
            {companyNickName && (
              <Typography
                title={companyName}
                sx={{
                  fontSize: "0.64rem",
                  color: colors.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {companyName}
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
            records={links}
            filteredRecords={filteredLinks}
            searchValue={recordSearch}
            onSearchChange={setRecordSearch}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            selectedIds={selectedKeys}
            onToggleRow={toggleRow}
            colors={colors}
            emptyMessage="This company has no transactions or vouchers."
            emptySearchMessage={(q) => `No record matches “${q}”`}
            searchPlaceholder="Search record…"
            rowRender={rowRender}
            rowId={linkKey}
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
                        placeholder="Search company…"
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
                        No company matches “{destinationSearch.trim()}”
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
                    No other company is available to transfer to.
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
