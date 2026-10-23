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
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferCompanyModal — the stand-in for Delete on a company that still
 * carries transactions or vouchers.
 *
 * A company with records cannot simply be removed: the transactions and
 * vouchers would be left pointing at nothing. Instead they are MOVED to
 * another company — so the modal lists everything this company carries,
 * lets the user pick which of it travels, and picks the company it goes to.
 *
 * Companies carry no active/inactive status, so every other company is a
 * valid destination.
 *
 *   <TransferCompanyModal
 *     open={openTransferModal}
 *     handleClose={handleCloseTransferModal}
 *     company={selectedCompany}
 *     onTransfer={handleTransferLinks}  // from useCompany
 *   />
 *
 * The move itself belongs to `onTransfer` (useCompany's
 * handleTransferLinks): it sends the request, runs it behind the spinner
 * and refetches the company list. This modal only picks what moves and
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
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
});

// Raw API row → { id, name }
const rowId = (c) => c?.nCompanyId;
const rowName = (c) => c?.strCompanyName ?? "";
const rowNickName = (c) => c?.strCompanyNickName ?? "";
// The menu field shows the NICKNAME only — it is the short handle the
// office actually uses. The full name is the fallback for the rare
// company that carries no nickname at all.
const rowLabel = (c) => rowNickName(c).trim() || rowName(c);

// A link row is a transaction OR a voucher — the two kinds share one list,
// so the selection key has to carry the type or the two id spaces collide.
const linkKey = (link) => `${link.type}-${link.id}`;
const isTransaction = (link) => link.type === "transaction";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// A voucher carries no amount of its own — it shows the day it was raised,
// kept to a short date so the rows stay the same width as the amounts.
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

function TransferCompanyModal({
  open,
  handleClose,
  company = null,
  onTransfer,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

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
  const [saving, setSaving] = useState(false);

  // A fresh record list, a fresh destination list and a clean pick every
  // time the modal opens — the company may have changed since the last
  // visit.
  useEffect(() => {
    setSelectedKeys([]);
    setTargetId(null);
    setDestinationSearch("");
    if (!open || companyId == null) {
      setLinks([]);
      setDestinations([]);
      return;
    }

    let cancelled = false;

    // ── The transactions and vouchers this company carries ────────
    setLoadingRows(true);
    CompanyAPI.getLinks(companyId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.links ?? []);
        setLinks(list);
        // Everything is picked by default — the common case is a clean
        // hand-over of the whole company.
        setSelectedKeys(list.map(linkKey));
      })
      .catch((err) => {
        console.error("Failed to load company records:", err);
        if (!cancelled) setLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    // ── The companies it can be handed over to ────────────────────
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

  const transactionCount = useMemo(
    () => links.filter(isTransaction).length,
    [links],
  );
  const voucherCount = links.length - transactionCount;

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
      // Without the transfer handler there is nowhere to send the request —
      // say so in the console instead of failing silently on click.
      console.error("TransferCompanyModal: an `onTransfer` handler is required.");
      return;
    }

    // The mixed list goes back as two plain id lists — one per kind.
    const picked = links.filter((link) => selectedKeys.includes(linkKey(link)));
    const transactionIds = picked
      .filter(isTransaction)
      .map((link) => link.id);
    const voucherIds = picked.filter((link) => !isTransaction(link)).map((l) => l.id);

    const entity = companyNickName || companyName || "Company";
    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear. The parent's close is
    // called directly here, so the "saving" guard cannot hold it back.
    handleClose?.();

    try {
      await withSpinner(entity, async () => {
        // The source company travels with the call, so closing the modal
        // (and dropping the selection) does not lose it.
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

  // NOTE: all hooks above this line — the early return must come after them.
  if (!open || !company) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Transfer Company Records"
      subTitle={companyName}
      onSave={handleTransfer}
      saveLabel="Transfer"
      cancelLabel="Cancel"
      onCancel={closeModal}
      loading={saving}
      disabled={!selected || selectedKeys.length === 0}
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
              }}
            >
              Transferring from
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
              }}
            >
              {companyNickName || companyName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {companyNickName ? `${companyName} · ` : ""}
              {loadingRows
                ? "Loading records…"
                : `${links.length} record${links.length === 1 ? "" : "s"} use this company`}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination: ONE menu field, above the records ──────── */}
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
                // With many companies the menu carries its own search field
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

        {/* ── The records that travel ─────────────────────────────── */}
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
            Records to transfer
          </Typography>
          {!loadingRows && links.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selectedKeys.length} of {links.length} selected
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
          ) : links.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                This company has no transactions or vouchers.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all — kept OUT of the scrolling area, so it stays
                  reachable no matter how many records there are. */}
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
                        indeterminate={selectedKeys.length > 0 && !allSelected}
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

              {/* The records — capped height, so a company with hundreds of
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
                  {links.map((link, idx) => {
                    const key = linkKey(link);
                    const checked = selectedKeys.includes(key);
                    const transaction = isTransaction(link);
                    const detail = transaction
                      ? link.label || link.status || ""
                      : link.status || "Voucher";

                    return (
                      <React.Fragment key={key}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => toggleRow(key)}
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
                              primary={link.code || (transaction ? "Transaction" : "Voucher")}
                              secondary={
                                detail
                                  ? `${transaction ? "Transaction" : "Voucher"} · ${detail}`
                                  : transaction
                                    ? "Transaction"
                                    : "Voucher"
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
                            <Typography
                              sx={{
                                fontSize: "0.68rem",
                                color: colors.textSecondary,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                ml: 1,
                              }}
                            >
                              {/* A transaction carries its approved budget; a
                                  voucher carries no amount of its own, so it
                                  shows when it was raised. */}
                              {transaction && link.amount != null
                                ? fmtPHP(link.amount)
                                : fmtDay(link.dtCreated)}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                        {idx < links.length - 1 && (
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

        {!loadingRows && links.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.65rem",
              color: colors.textMuted,
              mt: 0.75,
            }}
          >
            {plural(transactionCount, "transaction")} ·{" "}
            {plural(voucherCount, "voucher")} in this list
          </Typography>
        )}

        <Typography
          sx={{ fontSize: "0.64rem", color: colors.textMuted, mt: 1, lineHeight: 1.5 }}
        >
          Only the company changes: the selected transactions keep their items,
          prices and JEV, and the selected vouchers keep their lines exactly as
          they are.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferCompanyModal;
