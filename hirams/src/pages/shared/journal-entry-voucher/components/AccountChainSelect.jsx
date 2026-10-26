import { useState, useEffect, useMemo, useRef } from "react";
import { Box, Typography, Skeleton, Popper, useTheme } from "@mui/material";
import { KeyboardArrowDown, SearchOutlined } from "@mui/icons-material";
import JournalAccountAPI from "../../../../api/endpoints/journal-account.api.js";
import JevEntriesAPI from "../../../../api/endpoints/jev-entries.api.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Shared caches for the journal account lists ──────────────────────────
// Several selectors on screen (From / To) reuse one request instead of each
// downloading the full list, and the JEV view panel can preload them so the
// Add Entry / Edit Entry modal opens without waiting on the network.
const CACHE_MS = 60_000;
const allAccountsCache = { data: null, promise: null, at: 0 };
const parentsCache = { data: null, promise: null, at: 0 };

// Kicks off a request only when nothing is already in flight, and keeps the
// resolved payload around for reuse.
const requestOnce = (cache, run) => {
  if (!cache.promise) {
    cache.at = Date.now();
    cache.promise = run()
      .then((res) => {
        cache.data = res;
        return res;
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next call
        throw err;
      });
  }
  return cache.promise;
};

// Stale-while-revalidate: answer immediately from the cached payload and
// refresh it in the background, so opening Add/Edit Entry never waits on the
// network while still picking up new accounts on the next open.
const serve = (cache, run) => {
  if (cache.data) {
    const stale = Date.now() - cache.at > CACHE_MS;
    if (stale && !cache.promise) requestOnce(cache, run).catch(() => {});
    return Promise.resolve(cache.data);
  }
  return requestOnce(cache, run);
};

export const fetchAllAccounts = () =>
  serve(allAccountsCache, () => JournalAccountAPI.getAll());

export const fetchParents = () =>
  serve(parentsCache, () => JournalAccountAPI.getParents());

// Fire-and-forget warm-up: both lists start downloading while the panel
// loads, so by the time Add Entry / Edit Entry is clicked they are already
// sitting in cache.
export const warmAccountCache = () => {
  fetchParents().catch(() => {});
  fetchAllAccounts().catch(() => {});
};

const MAX_DEPTH = 15;
const SEARCH_THRESHOLD = 5;
const DROPDOWN_MAX_HEIGHT = 180;

// ── Fund lookup ────────────────────────────────────────────────────────
// Fund = the account or any ancestor has cAccountType "F" (same rule as
// LedgerPanel). Balance = ACTIVE JEV entries of the account plus all
// its descendants. Entries are NOT cached so the balance is always fresh.
const resolveFundMeta = async (accountId, jevActiveKey) => {
  try {
    const [allRes, entRes] = await Promise.all([
      fetchAllAccounts(),
      JevEntriesAPI.getAll(),
    ]);
    const accounts = Array.isArray(allRes) ? allRes : (allRes?.data ?? []);
    const entries = Array.isArray(entRes) ? entRes : (entRes?.data ?? []);
    const byId = new Map(accounts.map((a) => [Number(a.nJournalAccountId), a]));

    let isFund = false;
    let cur = byId.get(Number(accountId));
    for (let d = 0; cur && d < MAX_DEPTH; d++) {
      if (cur.cAccountType === "F") {
        isFund = true;
        break;
      }
      cur = byId.get(Number(cur.nParentAccountId));
    }
    if (!isFund) return { isFund: false, balance: null };

    const childrenOf = {};
    accounts.forEach((a) => {
      const p = Number(a.nParentAccountId);
      if (p) (childrenOf[p] ||= []).push(Number(a.nJournalAccountId));
    });
    const ids = new Set();
    const stack = [Number(accountId)];
    while (stack.length) {
      const id = stack.pop();
      if (ids.has(id)) continue;
      ids.add(id);
      (childrenOf[id] || []).forEach((c) => stack.push(c));
    }

    const active = String(jevActiveKey ?? "").trim() || "A";
    const balance = entries.reduce((sum, e) => {
      if (String(e?.jev?.cStatus ?? "").trim() !== active) return sum;
      if (!ids.has(Number(e.nJournalAccountId))) return sum;
      return sum + (Number(e.dAmount) || 0);
    }, 0);

    return {
      isFund: true,
      balance: Math.round((balance + Number.EPSILON) * 100) / 100,
    };
  } catch (err) {
    console.error("Fund balance lookup failed:", err);
    return { isFund: false, balance: null };
  }
};

const useColors = (c) => ({
  gray: {
    textPrimary: c.gray.textPrimary,
    textHeading: c.gray.textHeading,
    textMuted: c.gray.textMuted,
    inputBg: c.gray.inputBg,
  },
  slate: {
    btnBorder: c.slate.btnBorder,
    border: c.slate.border,
    hover: c.slate.hover,
  },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  red: { text: c.red.text },
  amber: { warnText: c.amber.warnText },
  skeleton: { overlay: c.skeleton.overlay },
  // colour only — geometry stays at the usage site
  dropdownShadow: c.shadow.dropdown,
});

const resolveAccountLabel = (account) => {
  if (account?.strAccountName) return account.strAccountName;
  if (account?.client) {
    return `Receivables from ${
      account.client.strClientNickName || account.client.strClientName
    }`;
  }
  if (account?.supplier) {
    return `Receivables from ${
      account.supplier.strSupplierNickName || account.supplier.strSupplierName
    }`;
  }
  return "—";
};

// One label source for the field, the option rows and the search filter
const getLabel = (acc) => acc?.display_name || resolveAccountLabel(acc);

// ── Custom dropdown for a single chain level ───────────────────────────
// Renders like a <select>, but with a capped, scrollable menu height and
// (once there are more than SEARCH_THRESHOLD options) a search field to
// filter the list. The menu renders in a portal on document.body so it
// overlays the modal instead of being clipped by its overflow.
function ChainLevelSelect({
  options,
  value,
  placeholder,
  hasError,
  colors,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const showSearch = options.length > SEARCH_THRESHOLD;

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    if (showSearch) {
      const id = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const inField = containerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inField && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find(
    (a) => Number(a.nJournalAccountId) === Number(value),
  );

  const filteredOptions = useMemo(() => {
    if (!showSearch) return options;
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((a) => getLabel(a).toLowerCase().includes(q));
  }, [options, search, showSearch]);

  const handlePick = (accountId) => {
    onChange(accountId);
    setOpen(false);
  };

  const fieldSx = {
    width: "100%",
    px: 1.25,
    py: 0.875,
    fontSize: "0.75rem",
    borderRadius: "8px",
    outline: "none",
    fontFamily: "inherit",
    color: colors.gray.textPrimary,
    background: colors.gray.inputBg,
    boxSizing: "border-box",
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <Box
        ref={anchorRef}
        onClick={() => setOpen((o) => !o)}
        sx={{
          ...fieldSx,
          border: `0.5px solid ${hasError ? colors.red.text : colors.slate.btnBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0.5,
          cursor: "pointer",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: "0.75rem",
              color: selected ? colors.gray.textPrimary : colors.gray.textMuted,
            }}
          >
            {selected ? getLabel(selected) : placeholder}
          </Typography>
        </Box>
        <KeyboardArrowDown
          sx={{
            fontSize: "1rem",
            color: colors.gray.textMuted,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </Box>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        ref={menuRef}
        placement="bottom-start"
        modifiers={[
          { name: "offset", options: { offset: [0, 4] } },
          { name: "flip", enabled: true },
          {
            name: "preventOverflow",
            options: { boundary: "viewport", padding: 8 },
          },
        ]}
        style={{
          zIndex: 2000,
          width: anchorRef.current?.getBoundingClientRect().width,
          minWidth: 180,
        }}
      >
        <Box
          sx={{
            bgcolor: colors.gray.inputBg,
            border: `1px solid ${colors.slate.border}`,
            borderRadius: "8px",
            boxShadow: `0 4px 16px ${colors.dropdownShadow}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {showSearch && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                m: 0.75,
                mb: 0.5,
                px: 1,
                height: 30,
                borderRadius: "6px",
                border: `1px solid ${colors.slate.border}`,
                flexShrink: 0,
              }}
            >
              <SearchOutlined
                sx={{ fontSize: "0.8rem", color: colors.gray.textMuted }}
              />
              <Box
                component="input"
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.stopPropagation();
                }}
                placeholder="Search…"
                sx={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.72rem",
                  color: colors.gray.textPrimary,
                  fontFamily: "inherit",
                  "::placeholder": { color: colors.gray.textMuted },
                }}
              />
            </Box>
          )}

          <Box sx={{ maxHeight: DROPDOWN_MAX_HEIGHT, overflowY: "auto" }}>
            <Box
              onClick={() => handlePick("")}
              sx={{
                px: 1.25,
                py: 0.75,
                fontSize: "0.72rem",
                color: colors.gray.textMuted,
                cursor: "pointer",
                "&:hover": { bgcolor: colors.slate.hover },
              }}
            >
              {placeholder}
            </Box>

            {filteredOptions.length === 0 ? (
              <Box sx={{ px: 1.25, py: 1, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: "0.7rem", color: colors.gray.textMuted }}
                >
                  No matches
                </Typography>
              </Box>
            ) : (
              filteredOptions.map((acc) => {
                const isSelected =
                  Number(acc.nJournalAccountId) === Number(value);
                return (
                  <Box
                    key={acc.nJournalAccountId}
                    onClick={() => handlePick(acc.nJournalAccountId)}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected
                        ? colors.blue.text
                        : colors.gray.textPrimary,
                      bgcolor: isSelected ? colors.blue.bg : "transparent",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: isSelected
                          ? colors.blue.bg
                          : colors.slate.hover,
                      },
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "inherit",
                        fontWeight: "inherit",
                        color: "inherit",
                      }}
                    >
                      {getLabel(acc)}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Popper>
    </Box>
  );
}

export default function AccountChainSelect({
  value,
  preloadedAccount,
  onChange, // (id, { isFund, balance }) => void
  error,
  jevActiveKey = "A",
  // Set false when the caller ignores the { isFund, balance } payload: the
  // lookup costs extra requests, so skipping it keeps the form instant.
  resolveFundInfo = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [chainOptions, setChainOptions] = useState([]);
  const [chainSelected, setChainSelected] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [parentsLoaded, setParentsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const skipRebuildRef = useRef(false);
  const emitSeqRef = useRef(0);
  const showSkeleton = !isReady;

  // Reports the final selection together with its fund info.
  // The fund lookup needs its own requests, so callers never wait on it:
  // only the newest emit may report (a slower, older lookup must not
  // overwrite a selection the user already made).
  const emitChange = async (id, skipRebuild = false) => {
    const seq = ++emitSeqRef.current;
    if (!id) {
      if (skipRebuild) skipRebuildRef.current = true;
      onChange("", { isFund: false, balance: null });
      return;
    }
    if (!resolveFundInfo) {
      // Nothing to wait for — hand the selection straight back.
      if (skipRebuild) skipRebuildRef.current = true;
      onChange(id, { isFund: false, balance: null });
      return;
    }
    const meta = await resolveFundMeta(id, jevActiveKey);
    if (seq !== emitSeqRef.current) return;
    if (skipRebuild) skipRebuildRef.current = true;
    onChange(id, meta);
  };

  useEffect(() => {
    let active = true;

    // Warm the full list in parallel when a nested account is preselected
    if (Number(value)) fetchAllAccounts().catch(() => {});

    fetchParents()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setParentsList(list);
        setParentsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to fetch parents:", err);
        if (!active) return;
        setParentsList([]);
        setParentsLoaded(true);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipRebuildRef.current) {
      skipRebuildRef.current = false;
      return;
    }

    const targetId = Number(value);

    if (!targetId) {
      if (parentsLoaded) {
        setChainOptions([parentsList]);
        setChainSelected([]);
        setIsReady(true);
      }
      return;
    }

    if (!parentsLoaded) return;

    const buildChain = async () => {
      setIsReady(false);

      try {
        const directTop = parentsList.find(
          (p) => Number(p.nJournalAccountId) === targetId,
        );
        if (directTop) {
          setChainOptions([parentsList]);
          setChainSelected([targetId]);
          emitChange(targetId); // fund meta resolves in the background
          setIsReady(true);
          return;
        }

        const all = await fetchAllAccounts();
        const list = [...(Array.isArray(all) ? all : (all?.data ?? []))];
        const byId = new Map(list.map((a) => [Number(a.nJournalAccountId), a]));

        // Fallback: the account being edited (and its ancestors) may be missing
        // from the cached list — e.g. client/supplier "Receivables from …" accounts.
        const pre =
          preloadedAccount &&
          Number(preloadedAccount.nJournalAccountId) === targetId
            ? preloadedAccount
            : null;
        for (
          let cur = pre, g = 0;
          cur && g < MAX_DEPTH;
          cur = cur.parent, g++
        ) {
          const id = Number(cur.nJournalAccountId);
          if (!byId.has(id)) {
            byId.set(id, cur);
            list.push(cur);
          }
        }

        const childrenOf = (pid) =>
          pid
            ? list.filter((a) => Number(a.nParentAccountId) === pid)
            : parentsList;

        const account = byId.get(targetId);
        if (!account) {
          setChainOptions([parentsList]);
          setIsReady(true);
          return;
        }

        const path = [targetId];
        const levels = [];
        let pid = Number(account.nParentAccountId) || 0;
        levels.unshift(childrenOf(pid));

        let depth = 0;
        while (pid && depth < MAX_DEPTH) {
          depth++;
          const parent = byId.get(pid);
          if (!parent) break;
          path.unshift(pid);
          const next = Number(parent.nParentAccountId) || 0;
          levels.unshift(childrenOf(next));
          pid = next;
        }

        setChainOptions(levels);
        setChainSelected(path);
        emitChange(targetId); // fund meta resolves in the background
      } catch (err) {
        console.error("Build chain failed:", err);
        setChainOptions([parentsList]);
      } finally {
        setIsReady(true);
      }
    };

    buildChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, preloadedAccount, parentsList, parentsLoaded]);

  const handleSelectAt = async (levelIdx, rawValue) => {
    const accountId = rawValue ? Number(rawValue) : "";
    const newSelected = chainSelected.slice(0, levelIdx + 1);
    newSelected[levelIdx] = accountId;
    setChainSelected(newSelected);
    setChainOptions((prev) => prev.slice(0, levelIdx + 1));

    if (!accountId) {
      await emitChange("", true);
      return;
    }

    try {
      const res = await JournalAccountAPI.getChildren(accountId);
      const children = Array.isArray(res) ? res : (res?.data ?? []);

      if (children.length > 0) {
        setChainOptions((prev) => {
          const next = [...prev.slice(0, levelIdx + 1)];
          next[levelIdx + 1] = children;
          return next;
        });
      } else {
        await emitChange(accountId, true);
      }
    } catch (err) {
      console.error("Failed to fetch children:", err);
      await emitChange(accountId, true);
    }
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Typography
        sx={{
          fontSize: "0.6rem",
          fontWeight: 600,
          color: colors.gray.textHeading,
          mb: 0.4,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Account Title
      </Typography>

      {showSkeleton ? (
        <Skeleton
          variant="rounded"
          height={34}
          sx={{ borderRadius: "8px", bgcolor: colors.skeleton.overlay }}
        />
      ) : (
        chainOptions.map((options, idx) => {
          const isLastLevel = idx === chainOptions.length - 1;
          const selectedId = chainSelected[idx] ?? "";
          const selectedAcc = options.find(
            (a) => Number(a.nJournalAccountId) === Number(selectedId),
          );
          const hasChildren =
            selectedAcc &&
            chainOptions.length > idx + 1 &&
            chainOptions[idx + 1]?.length > 0 &&
            !chainSelected[idx + 1];

          return (
            <Box key={idx} sx={{ mb: !isLastLevel ? 0.6 : 0 }}>
              <ChainLevelSelect
                options={options}
                value={selectedId}
                placeholder={
                  idx === 0 ? "Select account…" : "Select linked account…"
                }
                hasError={error && isLastLevel && !hasChildren}
                colors={colors}
                onChange={(newValue) => handleSelectAt(idx, newValue)}
              />

              {hasChildren && (
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    color: colors.amber.warnText,
                    mt: 0.3,
                  }}
                >
                  ⓘ Please select a linked account below.
                </Typography>
              )}
            </Box>
          );
        })
      )}

      {error && !showSkeleton && (
        <Typography
          sx={{ fontSize: "0.58rem", color: colors.red.text, mt: 0.3 }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
