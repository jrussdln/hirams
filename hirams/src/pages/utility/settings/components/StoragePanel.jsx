import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  InputBase,
  Chip,
  Collapse,
} from "@mui/material";
import {
  Storage as StorageIcon,
  DeleteOutline,
  Refresh,
  CleaningServices,
  Search,
  LockOutlined,
  KeyboardArrowDown,
  WarningAmberRounded,
} from "@mui/icons-material";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import SettingsConfirmationModal from "../modal/SettingsConfirmationModal.jsx";
import { SETTINGS_CONFIRM_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";

const useColors = (c) => ({
  cardBg: c.account.cardBg,
  cardBorder: c.account.cardBorder,
  textPrimary: c.account.textPrimary,
  textSecondary: c.account.textSecondary,
  textMuted: c.account.textMuted,
  divider: c.account.divider,
  rowHover: c.account.rowHover,
  iconBoxBg: c.account.iconBoxBg,
  dangerText: c.red.alertText,
});

const ACCENT = "#2563EB";
const WARN = "#F59E0B";
const DANGER = "#EF4444";
const QUOTA_BYTES = 5 * 1024 * 1024;
const PROTECTED_RE = /user|token|role/i;

const getStore = (type) =>
  type === "local" ? window.localStorage : window.sessionStorage;

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const gaugeColor = (pct) => (pct > 80 ? DANGER : pct > 50 ? WARN : ACCENT);

/* ── Small presentational pieces ── */
function StatTile({ label, value, sub, colors }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.75,
        py: 1.25,
        borderRadius: 2,
        border: `1px solid ${colors.cardBorder}`,
        backgroundColor: colors.iconBoxBg,
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: colors.textMuted,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        noWrap
        sx={{
          fontSize: 17,
          fontWeight: 700,
          color: colors.textPrimary,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          noWrap
          sx={{ fontSize: 11, color: colors.textSecondary, mt: 0.25 }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default function StoragePanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [storageType, setStorageType] = useState("local"); // "local" | "session"
  const [storageItems, setStorageItems] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | cache | protected
  const [expandedKey, setExpandedKey] = useState(null);
  // The account-panel style confirmation for the wipe / cache-clear actions —
  // the chosen action runs from handleConfirmAction once the dialog is confirmed.
  const [confirmAction, setConfirmAction] = useState(null);
  const [wiping, setWiping] = useState(false);
  const [clearing, setClearing] = useState(false);

  const storageLabel =
    storageType === "local" ? "Local Storage" : "Session Storage";

  const scanStorage = useCallback(() => {
    try {
      const store = getStore(storageType);
      const items = [];
      let bytesSum = 0;
      for (let i = 0; i < store.length; i++) {
        const rawKey = store.key(i);
        if (!rawKey) continue;
        const val = store.getItem(rawKey) || "";
        const size = (rawKey.length + val.length) * 2;
        bytesSum += size;
        items.push({
          key: rawKey,
          isAppKey: rawKey.startsWith("hirams_"),
          isProtected: PROTECTED_RE.test(rawKey),
          sizeBytes: size,
          sizeFormatted: formatBytes(size),
          preview: val.length > 400 ? val.slice(0, 400) + "…" : val,
        });
      }
      items.sort((a, b) => b.sizeBytes - a.sizeBytes);
      setStorageItems(items);
      setTotalBytes(bytesSum);
    } catch (err) {
      console.error(`Failed to scan ${storageType}Storage:`, err);
    }
  }, [storageType]);

  useEffect(() => {
    setExpandedKey(null);
    setSearch("");
    setFilter("all");
    scanStorage();
  }, [scanStorage]);

  const usagePercent = Math.min(
    Math.round((totalBytes / QUOTA_BYTES) * 100),
    100,
  );
  const maxSize = storageItems[0]?.sizeBytes || 1;
  const protectedCount = storageItems.filter((i) => i.isProtected).length;

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return storageItems.filter((i) => {
      if (filter === "cache" && i.isProtected) return false;
      if (filter === "protected" && !i.isProtected) return false;
      return !q || i.key.toLowerCase().includes(q);
    });
  }, [storageItems, search, filter]);

  /* ── Actions ── */
  const handleDeleteItem = async (key) => {
    const confirm = await showSwal(
      "CONFIRM",
      {
        title: `Delete "${key}"?`,
        text: `This item will be permanently removed from ${storageLabel.toLowerCase()}.`,
      },
      { entity: "Storage item", action: "delete" },
    );
    if (!confirm.isConfirmed) return;
    try {
      getStore(storageType).removeItem(key);
      scanStorage();
      await showSwal(
        "SUCCESS",
        {},
        { entity: "Storage item", action: "deleted" },
      );
    } catch (err) {
      console.error("Failed to delete storage item:", err);
      await showSwal("ERROR", {}, { entity: "storage item", action: "delete" });
    }
  };

  const doClearCaches = async () => {
    setClearing(true);
    try {
      await withSpinner("Cleaning Storage", async () => {
        const store = getStore(storageType);
        const keysToRemove = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (!k || PROTECTED_RE.test(k)) continue;
          // localStorage: only this app's keys. sessionStorage: all non-protected keys.
          if (storageType === "local" && !k.startsWith("hirams_")) continue;
          keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => store.removeItem(k));
      });
      scanStorage();
      await showSwal(
        "SUCCESS",
        {},
        { entity: "App caches", action: "cleared" },
      );
    } catch (err) {
      console.error("Failed to clear caches:", err);
      await showSwal("ERROR", {}, { entity: "app caches", action: "clear" });
    } finally {
      setClearing(false);
    }
  };

  const doWipeStorage = async () => {
    setWiping(true);
    try {
      getStore(storageType).clear();
      scanStorage();
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear storage:", err);
      setWiping(false);
      await showSwal(
        "ERROR",
        {},
        { entity: storageLabel.toLowerCase(), action: "clear" },
      );
    }
  };

  // ── Confirmations ───────────────────────────────────────────────────
  const handleConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "wipe_storage") await doWipeStorage();
    else if (action === "clear_caches") await doClearCaches();
  };

  const cardSx = {
    borderRadius: 3,
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    overflow: "hidden",
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              backgroundColor: colors.iconBoxBg,
              color: ACCENT,
              display: "flex",
            }}
          >
            <StorageIcon />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.textPrimary,
                lineHeight: 1.2,
              }}
            >
              Storage Manager
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: colors.textSecondary }}>
              Monitor browser storage and clean up heavy caches.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={storageType}
            onChange={(_, v) => v && setStorageType(v)}
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontSize: 12.5,
                fontWeight: 600,
                px: 2,
                py: 0.5,
                color: colors.textSecondary,
                borderColor: colors.cardBorder,
              },
              "& .Mui-selected": {
                color: `${ACCENT} !important`,
                backgroundColor: `${isDark ? "rgba(37,99,235,0.18)" : "#EFF6FF"} !important`,
              },
            }}
          >
            <ToggleButton value="local">Local</ToggleButton>
            <ToggleButton value="session">Session</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Rescan storage">
            <IconButton
              onClick={scanStorage}
              size="small"
              sx={{
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 1.5,
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ── Left column: usage + danger zone ── */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.textMuted,
                mb: 2,
              }}
            >
              {storageLabel} usage
            </Typography>

            <Box
              sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2.5 }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "inline-flex",
                  flexShrink: 0,
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={96}
                  thickness={3.5}
                  sx={{
                    color: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                    position: "absolute",
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={usagePercent}
                  size={96}
                  thickness={3.5}
                  sx={{
                    color: gaugeColor(usagePercent),
                    "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      lineHeight: 1,
                    }}
                  >
                    {usagePercent}%
                  </Typography>
                  <Typography
                    sx={{ fontSize: 10, color: colors.textMuted, mt: 0.25 }}
                  >
                    used
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: colors.textPrimary,
                    lineHeight: 1.1,
                  }}
                >
                  {formatBytes(totalBytes)}
                </Typography>
                <Typography
                  sx={{ fontSize: 12, color: colors.textSecondary, mt: 0.5 }}
                >
                  of ~5 MB browser quota
                </Typography>
                {usagePercent > 80 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 1,
                      color: DANGER,
                    }}
                  >
                    <WarningAmberRounded sx={{ fontSize: 15 }} />
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>
                      {usagePercent >= 100
                        ? "Storage full — caches stop saving until cleared"
                        : "Nearly full, clear caches"}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1.25 }}>
              <StatTile
                label="Keys"
                value={storageItems.length}
                sub={`${protectedCount} protected`}
                colors={colors}
              />
              <StatTile
                label="Largest"
                value={storageItems[0] ? storageItems[0].sizeFormatted : "—"}
                sub={storageItems[0]?.key}
                colors={colors}
              />
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              ...cardSx,
              p: 3,
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderColor: isDark
                ? "rgba(239,68,68,0.35)"
                : "rgba(239,68,68,0.3)",
            }}
          >
            <div>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: colors.dangerText,
                  mb: 1,
                }}
              >
                Cleanup & Management
              </Typography>
              <Typography sx={{ fontSize: 12, color: colors.textSecondary, mb: 2, lineHeight: 1.5 }}>
                Manage browser storage and remove temporary caches. Clearing application caches is safe and keeps your login session active. 
              </Typography>
            </div>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              <BaseButton
                label="Clear App Caches (Keep Session)"
                icon={<CleaningServices />}
                onClick={() => setConfirmAction("clear_caches")}
                variant="outlined"
                size="small"
                sx={{ width: "100%", justifyContent: "center" }}
              />
              <BaseButton
                label={`Wipe ${storageLabel} (Log out)`}
                icon={<DeleteOutline />}
                onClick={() => setConfirmAction("wipe_storage")}
                actionColor="danger"
                variant="outlined"
                size="small"
                sx={{ width: "100%", justifyContent: "center" }}
              />
            </Box>
          </Paper>
        </div>

        {/* ── Right column: keys list ── */}
        <div className="lg:col-span-7 relative min-h-[360px]">
          <Paper
            elevation={0}
            sx={{
              ...cardSx,
              display: "flex",
              flexDirection: "column",
              // on desktop, pin to the grid cell so the left column sets the height
              position: { xs: "relative", lg: "absolute" },
              inset: { lg: 0 },
              height: { xs: 480, lg: "auto" },
            }}
          >
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5, flexShrink: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.textPrimary,
                  }}
                >
                  Stored keys
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colors.textMuted,
                    }}
                  >
                    {visibleItems.length} of {storageItems.length}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>
                  Sorted by size
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 2,
                  border: `1px solid ${colors.cardBorder}`,
                  backgroundColor: colors.iconBoxBg,
                  "&:focus-within": { borderColor: ACCENT },
                }}
              >
                <Search sx={{ fontSize: 18, color: colors.textMuted }} />
                <InputBase
                  placeholder="Search keys…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1, fontSize: 13, color: colors.textPrimary }}
                />
              </Box>

              <Box sx={{ display: "flex", gap: 0.75, mt: 1.25 }}>
                {[
                  ["all", "All"],
                  ["cache", "Cache"],
                  ["protected", "Protected"],
                ].map(([val, label]) => (
                  <Chip
                    key={val}
                    label={label}
                    size="small"
                    onClick={() => setFilter(val)}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      height: 24,
                      color: filter === val ? "#fff" : colors.textSecondary,
                      backgroundColor: filter === val ? ACCENT : "transparent",
                      border: `1px solid ${filter === val ? ACCENT : colors.cardBorder}`,
                      "&:hover": {
                        backgroundColor:
                          filter === val ? ACCENT : colors.rowHover,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box
              sx={{ borderTop: `1px solid ${colors.divider}`, flexShrink: 0 }}
            />

            {visibleItems.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <StorageIcon
                  sx={{
                    fontSize: 34,
                    color: colors.textMuted,
                    opacity: 0.5,
                    mb: 1,
                  }}
                />
                <Typography sx={{ fontSize: 13, color: colors.textSecondary }}>
                  {storageItems.length === 0
                    ? `${storageLabel} is empty.`
                    : "No keys match your filter."}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {visibleItems.map((item, idx) => {
                  const open = expandedKey === item.key;
                  const pct = Math.max((item.sizeBytes / maxSize) * 100, 2);
                  return (
                    <Box
                      key={item.key}
                      sx={{
                        borderBottom:
                          idx < visibleItems.length - 1
                            ? `1px solid ${colors.divider}`
                            : "none",
                      }}
                    >
                      <Box
                        onClick={() => setExpandedKey(open ? null : item.key)}
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          cursor: "pointer",
                          "&:hover": { backgroundColor: colors.rowHover },
                          transition: "background-color 0.15s",
                        }}
                      >
                        <KeyboardArrowDown
                          sx={{
                            fontSize: 18,
                            color: colors.textMuted,
                            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                            transition: "transform 0.2s",
                            flexShrink: 0,
                          }}
                        />

                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              mb: 0.75,
                            }}
                          >
                            <Typography
                              noWrap
                              sx={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: colors.textPrimary,
                                fontFamily: "monospace",
                              }}
                            >
                              {item.key}
                            </Typography>
                            {item.isAppKey && (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  px: 0.75,
                                  py: 0.125,
                                  borderRadius: 1,
                                  color: ACCENT,
                                  backgroundColor: isDark
                                    ? "rgba(37,99,235,0.2)"
                                    : "#EFF6FF",
                                  flexShrink: 0,
                                }}
                              >
                                HIRAMS
                              </Box>
                            )}
                            {item.isProtected && (
                              <Tooltip title="Session data, protected from cache cleanup">
                                <LockOutlined
                                  sx={{ fontSize: 13, color: colors.textMuted }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                          {/* size bar */}
                          <Box
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.05)",
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${pct}%`,
                                borderRadius: 2,
                                backgroundColor: item.isProtected
                                  ? colors.textMuted
                                  : ACCENT,
                                opacity: item.isProtected ? 0.5 : 0.85,
                                transition: "width 0.3s",
                              }}
                            />
                          </Box>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.textPrimary,
                            minWidth: 56,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {item.sizeFormatted}
                        </Typography>

                        <Tooltip
                          title={
                            item.isProtected ? "Protected key" : "Delete key"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={item.isProtected}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.key);
                              }}
                              sx={{
                                color: colors.textMuted,
                                "&:hover": {
                                  color: colors.dangerText,
                                  backgroundColor: "rgba(239,68,68,0.1)",
                                },
                              }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>

                      <Collapse in={open} unmountOnExit>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            mx: 2.5,
                            mb: 1.5,
                            p: 1.5,
                            maxHeight: 160,
                            overflow: "auto",
                            borderRadius: 1.5,
                            fontSize: 11,
                            lineHeight: 1.5,
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            color: colors.textSecondary,
                            backgroundColor: colors.iconBoxBg,
                            border: `1px solid ${colors.cardBorder}`,
                          }}
                        >
                          {item.preview || "(empty)"}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </div>
      </div>

      {/* Wipe Storage / Clear Caches confirmation — the Account Panel style dialog */}
      <SettingsConfirmationModal
        open={!!confirmAction}
        style={
          confirmAction === "wipe_storage"
            ? {
                ...SETTINGS_CONFIRM_STYLES.wipe_storage,
                title: `Clear Entire ${storageLabel}?`,
                desc: `WARNING: This wipes everything in ${storageLabel.toLowerCase()}, including your login session. You will need to log back in.`,
              }
            : confirmAction === "clear_caches"
              ? SETTINGS_CONFIRM_STYLES.clear_caches
              : null
        }
        loading={wiping || clearing}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </Box>
  );
}
