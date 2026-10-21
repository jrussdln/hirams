import React, { useEffect, useMemo, useState } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import getThemeColors from "../../../../utils/style/getThemeColors";
import { fmtPHP } from "../../../../utils/formatters/formatter";
import TransactionAPI from "../../../../api/endpoints/transaction.api";

import useTransaction from "../useTransaction";
import useArchive from "../../archive/useArchive";
import { setItem } from "../../../../utils/storage/localStorage";

const ITEM_ABC_CACHE = new Map();

export const LOOKUP_SEARCH_BY = ["Default", "Client"];

const useColors = (c) => ({
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  blueText: c.blue.text,
  blueBgSoft: c.blue.bgSoft,
  hoverBg: c.slate.hover,
  chipBg: c.slate.mutedBg,
  bandBg: c.slate.outerBgSolid,
  amber: { bg: c.amber.bg, text: c.amber.text },
});

const includesQuery = (value, q) =>
  String(value ?? "")
    .toLowerCase()
    .includes(q);

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wrap every case-insensitive occurrence of the lookup query in <mark> so the
 * user can see which part of a row actually matched. The query is a plain
 * substring (see includesQuery), so partial words highlight too. Fields that
 * didn't match — a row qualifies on any one field, not all of them — are
 * returned untouched.
 */
const Highlight = ({ text, query, colors }) => {
  const value = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return value;

  const parts = value.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  if (parts.length === 1) return value;

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Box
            key={i}
            component="mark"
            sx={{
              bgcolor: colors.amber.bg,
              color: colors.amber.text,
              borderRadius: "2px",
              px: "1px",
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

const LookUpTransactions = ({ query = "", searchBy = "Default", onSelect }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const {
    transactions,
    loading,
    handleRowClick,
    archiveStatus,
    statusTransaction,
  } = useTransaction();
  const {
    transactions: archivedTransactions,
    loading: archiveLoading,
    handleRowClick: handleArchivedRowClick,
  } = useArchive();

  const q = query.trim().toLowerCase();

  const pool = useMemo(() => {
    const byId = new Map();
    const put = (t, fromArchive) => {
      const key = String(t?.id ?? "");
      if (!key) return;
      const code = t.status_code;
      const archiveLabel = archiveStatus?.[code];
      const status =
        t.status ?? archiveLabel ?? statusTransaction?.[code] ?? "";
      const row = {
        ...t,
        status,
        isArchived: fromArchive || (!t.status && !!archiveLabel),
      };
      if (fromArchive || !byId.has(key)) byId.set(key, row);
    };
    transactions.forEach((t) => put(t, false));
    archivedTransactions.forEach((t) => put(t, true));
    return [...byId.values()];
  }, [transactions, archivedTransactions, archiveStatus, statusTransaction]);

  const results = useMemo(() => {
    if (!q) return [];
    const matches = pool.filter((t) => {
      if (searchBy === "Client") return includesQuery(t.clientName, q);
      return (
        includesQuery(t.transactionId, q) ||
        includesQuery(t.transactionName, q) ||
        includesQuery(t.clientName, q) ||
        includesQuery(t.companyName, q) ||
        includesQuery(t.aoName, q) ||
        includesQuery(t.status, q)
      );
    });
    return matches.slice(0, 100);
  }, [pool, q, searchBy]);

  const { groups, activeCount, archivedCount } = useMemo(() => {
    const active = [];
    const archived = [];
    results.forEach((r) => (r.isArchived ? archived : active).push(r));
    return {
      groups: [
        { key: "active", label: "Active", rows: active },
        {
          key: "archived",
          label: "Archived",
          hint: "Archived · Lost · Completed",
          rows: archived,
        },
      ].filter((g) => g.rows.length > 0),
      activeCount: active.length,
      archivedCount: archived.length,
    };
  }, [results]);

  const isLoading = loading || archiveLoading;

  // Amount: transaction ABC, else sum of item ABC.
  const [, setAbcTick] = useState(0);
  const getAmount = (row) => {
    const dTotal = Number(row.dTotalABC || 0);
    if (dTotal > 0) return dTotal;
    const key = String(row.id);
    if (ITEM_ABC_CACHE.has(key)) return ITEM_ABC_CACHE.get(key);
    return undefined;
  };

  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
    };
    const pending = results.filter(
      (r) => Number(r.dTotalABC || 0) <= 0 && !ITEM_ABC_CACHE.has(String(r.id)),
    );
    if (!pending.length) return cleanup;

    (async () => {
      const BATCH = 6;
      for (let i = 0; i < pending.length; i += BATCH) {
        if (cancelled) return;
        await Promise.all(
          pending.slice(i, i + BATCH).map(async (r) => {
            const key = String(r.id);
            if (ITEM_ABC_CACHE.has(key)) return;
            try {
              const res = await TransactionAPI.getItems(r.id);
              const sum = (res.items || []).reduce(
                (s, it) => s + Number(it.abc || 0),
                0,
              );
              ITEM_ABC_CACHE.set(key, sum);
            } catch {
              ITEM_ABC_CACHE.set(key, null);
            }
          }),
        );
        if (!cancelled) setAbcTick((t) => t + 1);
      }
    })();
    return cleanup;
  }, [results]);

  const handleSelect = (row) => {
    if (row.isArchived) {
      // Point the Archive sidebar at this row's status (Archived / Lost / Completed).
      const code = String(row.status_code ?? "");
      if (code) {
        setItem("selectedArchiveStatusCode", code);
        window.dispatchEvent(
          new CustomEvent("archive_status_changed", { detail: { code } }),
        );
      }
      handleArchivedRowClick(row);
    } else {
      handleRowClick(row, { fromLookup: true });
    }
    onSelect?.();
  };

  const [collapsed, setCollapsed] = useState({
    active: false,
    archived: false,
  });
  const toggleGroup = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const renderRow = (row) => {
    const amount = getAmount(row);
    const meta =
      searchBy === "Client"
        ? []
        : [row.clientNickname || row.clientName].filter(Boolean);

    return (
      <Box
        key={row.id}
        onClick={() => handleSelect(row)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 2,
          py: 1,
          borderBottom: `1px solid ${colors.border}`,
          cursor: "pointer",
          "&:hover": { bgcolor: colors.hoverBg },
        }}
      >
        {/* Left: title, then code · client · AO */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontSize: "13.5px",
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            <Highlight
              text={row.transactionName || "--"}
              query={q}
              colors={colors}
            />
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: "12px", color: colors.textSecondary, mt: 0.25 }}
          >
            <Box
              component="span"
              sx={{ color: colors.blueText, fontWeight: 600 }}
            >
              <Highlight
                text={row.transactionId || "--"}
                query={q}
                colors={colors}
              />
            </Box>
            {meta.length > 0 && (
              <>
                {" · "}
                {meta.map((name, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && " · "}
                    <Highlight text={name} query={q} colors={colors} />
                  </React.Fragment>
                ))}
              </>
            )}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: "11px", color: colors.textDisabled, mt: 0.25 }}
          >
            Procurement:{" "}
            <Highlight
              text={row.createdBy || "--"}
              query={q}
              colors={colors}
            />{" "}
            - AO:{" "}
            <Highlight text={row.aoName || "--"} query={q} colors={colors} />
          </Typography>
        </Box>

        {/* Right: amount, then status */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 0.5,
            flexShrink: 0,
            maxWidth: 170,
          }}
        >
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: ".06em",
                lineHeight: 1.2,
                color: colors.textDisabled,
              }}
            >
              ABC
            </Typography>
            <Typography
              title={
                amount === undefined
                  ? "Loading amount…"
                  : amount === null
                    ? "Amount unavailable"
                    : undefined
              }
              sx={{
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.3,
                fontVariantNumeric: "tabular-nums",
                color:
                  amount === undefined || amount === null
                    ? colors.textDisabled
                    : colors.textPrimary,
              }}
            >
              {amount === undefined
                ? "…"
                : amount === null
                  ? "—"
                  : `₱ ${fmtPHP(amount)}`}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              maxWidth: "100%",
              fontSize: "11px",
              fontWeight: 600,
              color: colors.textSecondary,
              bgcolor: colors.chipBg,
              borderRadius: "9999px",
              px: 1,
              lineHeight: "18px",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: row.isArchived ? colors.textDisabled : colors.blueText,
              }}
            />
            <Box
              component="span"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Highlight text={row.status || "—"} query={q} colors={colors} />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const emptyState = (title, sub) => (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        py: 4,
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography
        sx={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: "12px", color: colors.textDisabled }}>
        {sub}
      </Typography>
    </Box>
  );
  if (isLoading) {
    return (
      <Box>
        {/* Group band */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 0.75,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <Skeleton variant="text" width={50} height={16} />
          <Skeleton variant="circular" width={18} height={18} />
        </Box>

        {/* Rows — same layout as the real rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 2,
              py: 1,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton
                variant="text"
                width={`${55 + ((i * 13) % 30)}%`}
                height={20}
              />
              <Skeleton
                variant="text"
                width={`${28 + ((i * 7) % 20)}%`}
                height={16}
              />
              <Skeleton
                variant="text"
                width={`${34 + ((i * 11) % 22)}%`}
                height={14}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 0.5,
              }}
            >
              <Skeleton variant="text" width={90} height={18} />
              <Skeleton
                variant="rounded"
                width={72}
                height={18}
                sx={{ borderRadius: "9999px" }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (!q)
    return emptyState(
      "Look up a transaction",
      "Search by code, title, client, company, AO or status.",
    );
  if (results.length === 0)
    return emptyState(
      "No matching transactions",
      `Nothing matches "${query.trim()}" under ${searchBy}.`,
    );

  return (
    <Box>
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key];
        return (
          <Box key={group.key}>
            <Box
              onClick={() => toggleGroup(group.key)}
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                bgcolor: colors.bandBg,
                borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: colors.textSecondary,
                }}
              >
                {group.label}
              </Typography>
              <Box
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  px: 0.75,
                  borderRadius: "9999px",
                  lineHeight: "18px",
                  bgcolor:
                    group.key === "active" ? colors.blueBgSoft : colors.chipBg,
                  color:
                    group.key === "active"
                      ? colors.blueText
                      : colors.textSecondary,
                }}
              >
                {group.rows.length}
              </Box>
              {group.hint && (
                <Typography
                  sx={{ fontSize: "11px", color: colors.textDisabled }}
                >
                  {group.hint}
                </Typography>
              )}
              <KeyboardArrowDownIcon
                sx={{
                  ml: "auto",
                  fontSize: 18,
                  color: colors.textSecondary,
                  transform: isCollapsed ? "rotate(-90deg)" : "none",
                  transition: "transform .15s",
                }}
              />
            </Box>
            {!isCollapsed && group.rows.map(renderRow)}
          </Box>
        );
      })}

      <Typography
        sx={{ px: 2, py: 1.5, fontSize: "11px", color: colors.textDisabled }}
      >
        {`${activeCount} active · ${archivedCount} archived · ${results.length} of ${pool.length} shown`}
      </Typography>
    </Box>
  );
};

export default LookUpTransactions;
