import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  GroupRemoveOutlined,
  RefreshOutlined,
  Circle,
  ExpandMore,
  ExpandLess,
  HelpOutline,
  SettingsOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import { getItem } from "../../../../utils/storage/localStorage.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import MediaRoute from "../../../../routes/MediaRoute.jsx";
import SettingsConfirmationModal from "../modal/SettingsConfirmationModal.jsx";
import { SETTINGS_CONFIRM_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import AuthAPI from "../../../../api/endpoints/auth.api.js";
import UserAPI from "../../../../api/endpoints/user.api.js";

// Everything this panel needs, from the shared theme tokens.
const useColors = (c) => ({
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  rowHover: c.slate.hover,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textSecondary,
  shadow: `0 1px 2px ${c.shadow.hairline}`,
  rounded: "0.5rem",
  iconBoxBg: c.account.iconBoxBg,
  blueBg: c.blue?.bg || "rgba(37,99,235,0.1)",
  blueText: c.blue?.text || "#2563EB",
  red: {
    surface: c.red.surface,
    border: c.red.signalBorder,
    text: c.red.signalText,
  },
  green: {
    text: c.green.text,
  },
});

const buildName = (u) =>
  [u?.strFName, u?.strLName].filter(Boolean).join(" ").trim() ||
  u?.strNickName ||
  "Unknown User";

/* ── Management card — management users only ───────────────────── */

function ManagementCard({ colors, isDark }) {
  const { isManagement, userTypes, defaultUserType } = useKeysLabels();
  const me = useMemo(() => getItem("user", {}), []);
  const myUserId = me?.nUserId;

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchOnline = useCallback(async () => {
    try {
      setLoadingOnline(true);
      const res = await UserAPI.getAllUsers();
      const users = Array.isArray(res?.users) ? res.users : [];
      // bIsActive === 0 means online (same contract Layout2 uses).
      setOnlineUsers(
        users.filter((u) => Number(u?.bIsActive ?? 1) === 0),
      );
    } catch (err) {
      console.error("Failed to load online users:", err);
      setOnlineUsers([]);
    } finally {
      setLoadingOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!isManagement) return;
    fetchOnline();
    // Presence flips reach the app as `user_data_updated` broadcasts on the
    // "users" channel (and occasionally as the local user_status_changed
    // event). Debounce so a bulk sign-out fires one rescan, not N.
    let timer = null;
    const scheduleFetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchOnline, 400);
    };
    window.addEventListener("user_data_updated", scheduleFetch);
    window.addEventListener("user_data_deleted", scheduleFetch);
    window.addEventListener("user_status_changed", scheduleFetch);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("user_data_updated", scheduleFetch);
      window.removeEventListener("user_data_deleted", scheduleFetch);
      window.removeEventListener("user_status_changed", scheduleFetch);
    };
  }, [isManagement, fetchOnline]);

  // Who will actually be signed out by the action — everyone online
  // except the management user pressing the button.
  const othersOnline = useMemo(
    () =>
      onlineUsers.filter(
        (u) => String(u?.nUserId) !== String(myUserId ?? ""),
      ),
    [onlineUsers, myUserId],
  );
  const canSignOut = othersOnline.length > 0 && !loggingOut;

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoggingOut(true);
    try {
      const count = await withSpinner("Signing out users", async () => {
        const res = await AuthAPI.logoutAll();
        return Number(res?.count) || 0;
      });
      await fetchOnline();
      await showSwal(
        "SUCCESS",
        {},
        {
          entity: count === 1 ? "1 online user" : `${count} online users`,
          action: "logged out",
        },
      );
    } catch (err) {
      console.error("Failed to log out online users:", err);
      await showSwal(
        "ERROR",
        {},
        { entity: "online users", action: "log out" },
      );
    } finally {
      setLoggingOut(false);
    }
  };

  if (!isManagement) return null;

  return (
    <section
      className="p-5 flex flex-col gap-4"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${isDark ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.3)"}`,
        borderRadius: "0.5rem",
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="p-2.5 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: colors.red.surface,
              color: colors.red.text,
              border: `1px solid ${colors.red.border}`,
            }}
          >
            <GroupRemoveOutlined sx={{ fontSize: 22 }} />
          </div>
          <div className="min-w-0">
            <h3
              className="text-[14px] font-semibold mb-0.5"
              style={{ color: colors.textPrimary }}
            >
              Management
            </h3>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              Immediately end the session of every user that is currently
              online. They will be asked to log back in; your own session
              stays active.
            </p>
          </div>
        </div>
        <BaseButton
          label={loggingOut ? "Signing out…" : "Sign Out All Users"}
          tooltip={
            othersOnline.length > 0
              ? `Sign out ${othersOnline.length} online user${othersOnline.length === 1 ? "" : "s"}`
              : "No other online users"
          }
          icon={
            loggingOut ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <GroupRemoveOutlined />
            )
          }
          onClick={() => setConfirmOpen(true)}
          disabled={!canSignOut}
          actionColor="danger"
          variant="outlined"
          size="small"
          sx={{
            flexShrink: 0,
            alignSelf: { xs: "flex-end", sm: "center" },
          }}
        />
      </div>

      {/* The people online right now */}
      <div
        className="rounded-lg"
        style={{
          border: `1px solid ${colors.border}`,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show online users" : "Hide online users"}
          onClick={() => setCollapsed((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCollapsed((v) => !v);
            }
          }}
          className="flex items-center gap-2 px-3 py-2 select-none"
          sx={{
            cursor: "pointer",
            transition: "background-color 0.15s",
            borderBottom: collapsed ? "none" : `1px solid ${colors.border}`,
            "&:hover": { backgroundColor: colors.rowHover },
            "&:focus-visible": {
              outline: `2px solid ${colors.blueText}`,
              outlineOffset: -2,
            },
          }}
        >
          <Circle
            sx={{
              fontSize: 8,
              color: colors.green.text,
              animation: "pulse 2s infinite",
            }}
          />
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.textMuted,
            }}
          >
            Online Now
          </Typography>
          <Box
            component="span"
            sx={{
              minWidth: 18,
              textAlign: "center",
              px: 0.6,
              py: 0.125,
              borderRadius: 1,
              fontSize: 10.5,
              fontWeight: 700,
              color: colors.textPrimary,
              backgroundColor: colors.border,
            }}
          >
            {loadingOnline ? "…" : onlineUsers.length}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Rescan online users">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchOnline();
                }}
                disabled={loadingOnline}
                aria-label="Rescan online users"
              >
                <RefreshOutlined
                  sx={{
                    fontSize: 15,
                    color: colors.textMuted,
                    ...(loadingOnline && {
                      animation: "spin 1s linear infinite",
                    }),
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={collapsed ? "Show online users" : "Hide online users"}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((v) => !v);
              }}
              aria-label={collapsed ? "Show online users" : "Hide online users"}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ExpandMore sx={{ fontSize: 15, color: colors.textMuted }} />
              ) : (
                <ExpandLess sx={{ fontSize: 15, color: colors.textMuted }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Hide/show the online users list (the count stays visible) */}
        {!collapsed && (
          <>
        {loadingOnline && onlineUsers.length === 0 ? (
          <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={18} sx={{ color: colors.textMuted }} />
          </Box>
        ) : onlineUsers.length === 0 ? (
          <Typography
            sx={{
              px: 3,
              py: 2,
              fontSize: 12,
              fontStyle: "italic",
              color: colors.textMuted,
            }}
          >
            No one is online right now.
          </Typography>
        ) : (
          <Box
            sx={{
              maxHeight: 150,
              overflowY: "auto",
              p: 0.5,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {onlineUsers.map((u) => {
              const isMe = String(u?.nUserId) === String(myUserId ?? "");
              const role =
                userTypes?.[u?.cUserType] ??
                defaultUserType?.[u?.cUserType] ??
                "";
              return (
                <Box
                  key={u?.nUserId ?? u?.strUserName}
                  title={`Last seen ${u?.dtLastSeen ? new Date(u.dtLastSeen).toLocaleString() : "—"}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 1.5,
                    transition: "background-color 0.15s",
                    "&:hover": { backgroundColor: colors.rowHover },
                  }}
                >
                  <Avatar
                    src={MediaRoute.resolveProfileImage(u)}
                    alt={buildName(u)}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 12,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {buildName(u).charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: colors.textPrimary,
                        lineHeight: 1.2,
                      }}
                    >
                      {buildName(u)}
                      {isMe && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.75,
                            fontSize: 10,
                            fontWeight: 600,
                            color: colors.textMuted,
                          }}
                        >
                          (you)
                        </Box>
                      )}
                    </Typography>
                    {role && (
                      <Typography
                        noWrap
                        sx={{
                          fontSize: 10.5,
                          color: colors.textMuted,
                          lineHeight: 1.3,
                        }}
                      >
                        {role}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <SettingsConfirmationModal
        open={confirmOpen}
        style={SETTINGS_CONFIRM_STYLES.force_logout_all}
        loading={loggingOut}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}

/* ── Help & Support Center — everyone ───────────────────────────── */

function HelpSupportCard({ colors }) {
  const navigate = useNavigate();

  return (
    <section
      className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.shadow,
        borderRadius: colors.rounded,
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="p-2.5 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: colors.blueBg,
            color: colors.blueText,
          }}
        >
          <HelpOutline sx={{ fontSize: 22 }} />
        </div>
        <div>
          <h3
            className="text-[14px] font-semibold mb-0.5"
            style={{ color: colors.textPrimary }}
          >
            Help &amp; Support Center
          </h3>
          <p
            className="text-[12px] leading-relaxed max-w-2xl"
            style={{ color: colors.textSecondary }}
          >
            Need assistance with system workflows, user roles, or troubleshooting? Access documentation, guides, and support resources to help you navigate HIRAMS efficiently.
          </p>
        </div>
      </div>
      <BaseButton
        label="View Documentation"
        onClick={() => navigate("/help")}
        variant="outlined"
        size="small"
      />
    </section>
  );
}

/**
 * Settings > General — the welcome content.
 * Everyone sees Help & Support Center; the Management card only shows
 * for management users (it self-gates).
 */
export default function GeneralPanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(base);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* ── Page header — same content header as the Account & Storage panels ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: 2,
            backgroundColor: colors.iconBoxBg,
            color: colors.blueText,
            display: "flex",
          }}
        >
          <SettingsOutlined />
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
            General
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: colors.textSecondary }}>
            System-wide settings and support.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ManagementCard colors={colors} isDark={isDark} />
        <HelpSupportCard colors={colors} />
      </Box>
    </Box>
  );
}
