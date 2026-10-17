import React, { useEffect, useMemo, useState } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AccountBalanceOutlined,
  DriveFileMoveOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import JournalAccountAPI from "../../../../api/endpoints/journal-account.api.js";
import { showSwal } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferAccountModal — re-home an account (everything linked under it
 * travels with it) under a different parent.
 *
 * It is the stand-in for Delete exactly where Delete is withheld: an
 * account carrying linked accounts or JEV lines can't be removed, but it
 * can be moved, so JournalAccountPanel shows Transfer in that spot instead
 * (see AccountTreeNode — `!hasChildren && !hasEntries` picks between them).
 *
 *   <TransferAccountModal
 *     open={!!transferTarget}
 *     onClose={() => setTransferTarget(null)}
 *     account={transferTarget}
 *     onMove={handleMoveAccount}   // from useJournalAccounts
 *   />
 *
 * Destinations come from GET journal-accounts?excludeDescendantsOf={id},
 * which the API answers with every account EXCEPT the one being moved and
 * its own descendants — precisely the set that cannot create a loop. The
 * account's current parent is dropped on this side too: picking it would
 * be a no-op move.
 *
 * The move itself belongs to `onMove` (useJournalAccounts'
 * handleMoveAccount): it runs the request behind the spinner, opens the
 * destination in the tree and refetches — the same path drag & drop takes.
 * This modal only picks the target and reports the outcome; a refusal from
 * the loop guard is shown with the API's own message so it explains itself.
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

// Raw API row → { id, name } (the list is flat, names live on strAccountName)
const rowId = (a) => a?.nJournalAccountId;
const rowName = (a) => a?.strAccountName ?? a?.display_name ?? "";

function TransferAccountModal({ open, onClose, account = null, onMove }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  // The account being moved: tree nodes carry `id` / `accountName`,
  // a raw record would carry nJournalAccountId / strAccountName.
  const accountId = account?.id ?? account?.nJournalAccountId ?? null;
  const accountName = account?.accountName ?? account?.strAccountName ?? "";
  const linkedCount = account?.children?.length ?? 0;
  const currentParentId = account?.nParentAccountId ?? null;

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // A fresh candidate list (and a clean pick) every time it opens —
  // the tree it was opened from may have changed since the last visit.
  useEffect(() => {
    setSelectedId(null);
    setSearch("");
    if (!open || accountId == null) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    JournalAccountAPI.getExcludingDescendantsOf(accountId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setCandidates(
          list.filter((a) => String(rowId(a)) !== String(currentParentId)),
        );
      })
      .catch((err) => {
        console.error("Failed to load transfer destinations:", err);
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, accountId, currentParentId]);

  // Ancestor chain of each destination, JEV-entry style: "Fund / Cash /".
  // The account's own name is left out — it is already the row's primary
  // text — so the line reads as "sits under: …". The list is flat
  // (nParentAccountId only), but a candidate's parent can never be a
  // descendant of the account being moved, so every ancestor name is in
  // this list — the walk always reaches the top.
  const chainPathOf = useMemo(() => {
    const byId = new Map(candidates.map((a) => [String(rowId(a)), a]));
    const build = (account) => {
      const parts = [];
      let cur = account?.nParentAccountId
        ? byId.get(String(account.nParentAccountId))
        : null;
      let guard = 0;
      while (cur && guard < 15) {
        parts.unshift(rowName(cur));
        const pid = cur?.nParentAccountId;
        cur = pid ? byId.get(String(pid)) : null;
        guard++;
      }
      return parts.length ? `${parts.join(" / ")} /` : "";
    };
    return build;
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((a) => rowName(a).toLowerCase().includes(q));
  }, [candidates, search]);

  const selected = useMemo(
    () => candidates.find((a) => String(rowId(a)) === String(selectedId)) ?? null,
    [candidates, selectedId],
  );

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleTransfer = async () => {
    if (!selected || saving) return;
    if (typeof onMove !== "function") {
      // Without the move handler there is nowhere to send the request —
      // say so in the console instead of failing silently on click.
      console.error("TransferAccountModal: an `onMove` handler is required.");
      return;
    }

    setSaving(true);
    try {
      await onMove(accountId, rowId(selected));
      await showSwal("SUCCESS", {}, { entity: accountName, action: "transferred" });
      onClose?.();
    } catch (err) {
      // The API refuses loops and unknown parents with its own sentence —
      // show it verbatim so the refusal makes sense to the reader.
      const serverMessage = err?.response?.data?.message ?? err?.message;
      if (
        serverMessage &&
        !serverMessage.toLowerCase().includes("something went wrong")
      ) {
        await showSwal("ERROR", { text: serverMessage });
      } else {
        await showSwal("ERROR", {}, { entity: accountName, action: "transfer" });
      }
    } finally {
      setSaving(false);
    }
  };

  // NOTE: all hooks above this line — the early return must come after them.
  if (!open || !account) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title="Transfer Account"
      subTitle={accountName}
      onSave={handleTransfer}
      saveLabel="Transfer"
      cancelLabel="Cancel"
      onCancel={handleClose}
      loading={saving}
      disabled={!selected}
      width={{ xs: "95%", sm: 520, md: 640 }}
      contentPadding={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ mt: 0.5 }}>
        {/* ── The account being moved ─────────────────────────────── */}
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
              Moving
            </Typography>
            <Typography
              title={accountName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {accountName || "—"}
            </Typography>
            <Typography sx={{ fontSize: "0.64rem", color: colors.textSecondary }}>
              {linkedCount > 0
                ? `${linkedCount} linked account${linkedCount === 1 ? "" : "s"} move with it`
                : "No linked accounts of its own"}
            </Typography>
          </Box>
        </Box>

        {/* ── Destination picker ──────────────────────────────────── */}
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
            Transfer to
          </Typography>
          {!loading && candidates.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selected ? "1 selected" : `${candidates.length} available`}
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
          {/* Search */}
          <Box
            sx={{
              px: 1.25,
              py: 1,
              bgcolor: colors.headerBg,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                bgcolor: colors.inputBg,
                border: `1px solid ${colors.border}`,
                borderRadius: "7px",
                px: 1,
                height: 32,
              }}
            >
              <SearchOutlined sx={{ fontSize: "0.85rem", color: colors.textMuted }} />
              <Box
                component="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts…"
                aria-label="Search transfer destinations"
                sx={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.75rem",
                  color: colors.textPrimary,
                  "::placeholder": { color: colors.textMuted },
                }}
              />
            </Box>
          </Box>

          {/* Destinations */}
          {loading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : candidates.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                No other account is available to transfer to.
              </Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: colors.textMuted }}>
                No accounts match “{search.trim()}”
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding sx={{ maxHeight: "none", overflowY: "visible" }}>
              {filtered.map((a, idx) => {
                const id = rowId(a);
                const checked = String(selectedId) === String(id);
                return (
                  <React.Fragment key={id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => setSelectedId(id)}
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
                          <Radio
                            edge="start"
                            checked={checked}
                            tabIndex={-1}
                            disableRipple
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <AccountBalanceOutlined
                            sx={{ fontSize: "0.95rem", color: colors.blueText }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={rowName(a)}
                          secondary={chainPathOf(a)}
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
                      </ListItemButton>
                    </ListItem>
                    {idx < filtered.length - 1 && (
                      <Divider sx={{ borderColor: colors.border }} />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        <Typography
          sx={{ fontSize: "0.64rem", color: colors.textMuted, mt: 1, lineHeight: 1.5 }}
        >
          The account itself and everything linked under it can’t be picked —
          that would create a loop. Its current place is left out too, since
          moving it there would change nothing.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferAccountModal;
