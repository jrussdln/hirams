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
  SearchOutlined,
} from "@mui/icons-material";
import JournalAccountAPI from "../../../../api/endpoints/journal-account.api.js";
import JevEntriesAPI from "../../../../api/endpoints/jev-entries.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * TransferEntryModal — re-assign a single JEV entry line to a different
 * journal account. Unlike TransferAccountModal (which re-homes a whole
 * account subtree), this only updates the entry's nJournalAccountId —
 * the account tree stays exactly as it is.
 *
 *   <TransferEntryModal
 *     open={!!transferEntry}
 *     onClose={() => setTransferEntry(null)}
 *     entry={transferEntry}          // { nJEVEntryId, nJEVId, nJournalAccountId, dAmount, jevNo }
 *     onTransferred={() => refetch()} // refresh the report
 *   />
 *
 * Destinations come from GET journal-accounts (every account). The entry's
 * own current account is dropped from the list — picking it would be a
 * no-op move.
 *
 * The update itself is JevEntriesAPI.update(entryId, { nJEVId,
 * nJournalAccountId, dAmount }) — the same call JevViewPanel's edit form
 * makes. On success the "jev_entry_data_updated" event is dispatched so
 * every mounted journal-accounts view refetches its entries.
 */
const listColors = (c) => ({
  border: c.slate.border,
  headerBg: c.slate.itemHeaderBg ?? c.slate.mutedBg,
  hoverBg: c.slate.hover,
  mutedBg: c.slate.mutedBg,
  blueText: c.blue.text,
  blueBg: c.blue.bg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
  redText: c.red?.text ?? c.red,
  greenText: c.green?.text ?? c.green,
});

// Raw API row → { id, name } (the list is flat, names live on strAccountName)
const rowId = (a) => a?.nJournalAccountId;
const rowName = (a) => a?.strAccountName ?? a?.display_name ?? "";

// ₱1,234.56 — the amount chips across the modals share this shape.
const fmtAmount = (n) =>
  Math.abs(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// "Jan 9, 2025" — date lines here show the day only, no time.
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const fmtDate = (raw) => {
  const s = String(raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s || "—";
  return `${MONTH_SHORT[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
};

function TransferEntryModal({ open, onClose, entry = null, onTransferred }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  // The entry being moved: report rows carry nJEVEntryId / nJEVId /
  // nJournalAccountId / dAmount straight from the JEV entries feed.
  const entryId = entry?.nJEVEntryId ?? null;
  const jevId = entry?.nJEVId ?? null;
  const currentAccountId = entry?.nJournalAccountId ?? null;
  const amount = Number(entry?.dAmount) || 0;
  const jevNo = entry?.jevNo ?? "";

  const [accounts, setAccounts] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // A fresh account list (and a clean pick) every time it opens.
  useEffect(() => {
    setSelectedId(null);
    setSearch("");
    if (!open || entryId == null) {
      setAccounts([]);
      setAllAccounts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    JournalAccountAPI.getAll()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        // Keep the full list — the chain walk needs parents that are
        // filtered out of the destinations below.
        setAllAccounts(list);
        // Only leaf accounts can receive an entry — an account that already
        // has linked accounts under it is a grouping node, not a posting
        // target. The list is flat, so "has links" = someone's parent.
        const parentIds = new Set(
          list.map((a) => String(a?.nParentAccountId)).filter(Boolean),
        );
        setAccounts(
          list.filter(
            (a) =>
              // The entry's own account is a no-op destination — leave it out.
              String(rowId(a)) !== String(currentAccountId) &&
              // …and so is anything with accounts linked under it.
              !parentIds.has(String(rowId(a))),
          ),
        );
      })
      .catch((err) => {
        console.error("Failed to load transfer destinations:", err);
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, entryId, currentAccountId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => rowName(a).toLowerCase().includes(q));
  }, [accounts, search]);

  // Ancestor chain of each destination, JEV-entry style: "Fund / Cash /".
  // The account's own name is left out — it is already the row's primary
  // text — so the line reads as "sits under: …". The walk runs over the
  // FULL account list (parents with children are filtered out of the
  // destinations but still needed here), so it always reaches the top.
  const chainPathOf = useMemo(() => {
    const byId = new Map(allAccounts.map((a) => [String(rowId(a)), a]));
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
  }, [allAccounts]);

  const selected = useMemo(
    () => accounts.find((a) => String(rowId(a)) === String(selectedId)) ?? null,
    [accounts, selectedId],
  );

  // The account the entry currently posts to — the info card at the top
  // names it so the user always sees the "from" side before picking the
  // "to" side. Resolved over the FULL account list (the entry's own
  // account is filtered out of the destinations, not out of here).
  const currentAccountName = useMemo(() => {
    if (currentAccountId == null) return "—";
    const hit = allAccounts.find(
      (a) => String(rowId(a)) === String(currentAccountId),
    );
    return hit ? rowName(hit) : "—";
  }, [allAccounts, currentAccountId]);

  // The signed dAmount decides which side the entry sits on: negative
  // (From / money out) or positive (To / money in) — the same rule the
  // report's From / To cells follow.
  const isFrom = Number(entry?.dAmount) < 0;

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleTransfer = async () => {
    if (!selected || saving) return;

    const entity = jevNo || "Entry";
    setSaving(true);
    // Close the modal first — the spinner and swal play over the report,
    // not over a modal that is about to disappear.
    onClose?.();

    try {
      await withSpinner(entity, async () => {
        // Only the entry's journal account changes — the account tree,
        // the JEV, and every other entry stay exactly where they are.
        await JevEntriesAPI.update(entryId, {
          nJEVId: jevId,
          nJournalAccountId: rowId(selected),
          dAmount: amount,
        });
        // Tell every mounted journal-accounts view to refetch its entries.
        window.dispatchEvent(new CustomEvent("jev_entry_data_updated"));
      });

      await showSwal("SUCCESS", {}, { entity, action: "transferred" });
      onTransferred?.();
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
  if (!open || !entry) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title="Transfer Entry"
      subTitle={jevNo ? `JEV ${jevNo}` : "Journal entry"}
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
        {/* ── The entry being moved — at-a-glance info ──────────────── */}
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            bgcolor: colors.mutedBg,
            px: 1.25,
            py: 1,
            mt: 1,
            display: "flex",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: colors.textMuted,
                  lineHeight: 1.15,
                }}
              >
                {jevNo || "—"}
              </Typography>
            </Box>
            {/* The account the entry currently posts to — this is the "from"
                side of the move and the card's headline: no label, the name
                alone says it. */}
            <Typography
              title={currentAccountName}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                mt: 0.1,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentAccountName}
            </Typography>
          </Box>

          {/* Amount chip — red on From, green on To, like the report, with
              the entry's date under the figure. */}
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0,
              lineHeight: 1.15,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                color: colors.textMuted,
                lineHeight: 1.2,
              }}
            >
              {isFrom ? "From" : "To"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: isFrom ? colors.redText : colors.greenText,
                lineHeight: 1.2,
              }}
            >
              {isFrom ? "-" : ""}₱{fmtAmount(amount)}
            </Typography>
            <Typography
              title={entry?.date ?? ""}
              sx={{ fontSize: "0.62rem", color: colors.textMuted, lineHeight: 1.2 }}
            >
              {fmtDate(entry?.date)}
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
            mt: 1.75,
            mb: 0.75,
          }}
        >
          <Typography
            sx={{ fontSize: "0.75rem", fontWeight: 700, color: colors.textPrimary }}
          >
            Transfer to
          </Typography>
          {!loading && accounts.length > 0 && (
            <Typography sx={{ fontSize: "0.65rem", color: colors.textMuted }}>
              {selected ? "1 selected" : `${accounts.length} available`}
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
                aria-label="Search destination accounts"
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
          ) : accounts.length === 0 ? (
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
          Only this entry line moves — the account it leaves, the account it
          joins, and the JEV itself all stay exactly as they are.
        </Typography>
      </Box>
    </ModalContainer>
  );
}

export default TransferEntryModal;
