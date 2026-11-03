import React, { useMemo } from "react";
import { Box, useTheme } from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import CloseIcon from "@mui/icons-material/Close";

import { useNavigate } from "react-router-dom";

import getThemeColors from "../../../../utils/style/getThemeColors";
import useNotifications from "../../../../hooks/useNotifications";
import { NotificationSkeleton } from "../../loader/Skeleton";

/* ═════════════════════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────────────────────── */
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* Real rows live in tblnotifications — cNotificationType maps to a
   visual via the same letters the backend sends (notif_type). */
const getTypeConfig = (colors) => ({
  I: {
    icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
    bg: colors.blueSurface,
    color: colors.blueText,
  },
  W: {
    icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
    bg: colors.amberSurface,
    color: colors.amberSignalText,
  },
  S: {
    icon: <SecurityOutlinedIcon sx={{ fontSize: 18 }} />,
    bg: colors.redSurface,
    color: colors.redAlertText,
  },
});

/* ── Theme tokens ────────────────────────────────────────────── */
// INLINE COLOR MAP — per-file useColors pattern
const useColors = (c) => ({
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  textFaint: c.gray.textFaint,
  textOnFill: c.gray.textOnFill,
  blueText: c.blue.text,
  blueSurface: c.blue.surface,
  greenPaid: c.green.paid,
  greenSurface: c.green.surface,
  amberSignalText: c.amber.signalText,
  amberSurface: c.amber.surface,
  redAlertText: c.red.alertText,
  redSurface: c.red.surface,
  slateInnerBg: c.slate.innerBg,
  slateItemHeaderBg: c.slate.itemHeaderBg,
  slateHover: c.slate.hover,
  slateOuterBgSolid: c.slate.outerBgSolid,
  scrim: c.shadow.scrim,
});

/* ═════════════════════════════════════════════════════════════ */
/**
 * NotificationsBody — the header + list + footer INSIDE a notification
 * surface. One body, four surfaces: the bell dropdown (desktop), the
 * mobile bottom sheet, and the right-side panel next to the page
 * content (opened by “View all”, same pattern as the AI chatbot).
 *
 * Props:
 *  - variant: "dropdown" | "panel" ("dropdown" shows the View-all
 *    footer; "panel" owns its close X — the panel is a page-level column).
 *  - onClose: hide whatever surface hosts this body.
 *  - feed: an existing useNotifications() result. The bell menu passes
 *    its own so the badge and the dropdown list share ONE fetch /
 *    ONE source of truth; surfaces without a host feed fetch on mount.
 */
function NotificationsBody({ variant = "dropdown", onClose, feed: hostFeed }) {
  const ownFeed = useNotifications({ fetchOnMount: !hostFeed });
  const feed = hostFeed || ownFeed;
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = feed;

  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(base);
  const typeCfg = getTypeConfig(colors);

  const handleClick = (n) => {
    markRead(n.nNotificationId);
    if (n.strRoute) {
      onClose?.();
      navigate(n.strRoute);
    }
  };

  /* View all → open the right-side panel next to the page content
     (NotificationsSidePanel in Layout2 listens for this event). */
  const handleViewAll = () => {
    onClose?.();
    window.dispatchEvent(new CustomEvent("open_notifications_panel"));
  };

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 1.75,
          py: 1.5,
          borderBottom: `1px solid ${colors.slateInnerBg}`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>
            Notifications
          </Box>
          {unreadCount > 0 && (
            <Box
              sx={{
                backgroundColor: colors.blueSurface,
                color: colors.blueText,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 999,
                px: 0.875,
                lineHeight: 1.8,
              }}
            >
              {unreadCount} new
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {unreadCount > 0 && (
            <Box
              onClick={markAllRead}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: colors.blueText,
                cursor: "pointer",
                px: 0.75,
                py: 0.375,
                borderRadius: 1,
                "&:hover": { backgroundColor: colors.blueSurface },
              }}
            >
              <DoneAllIcon sx={{ fontSize: 14 }} />
              Mark all read
            </Box>
          )}
          <Box
            onClick={onClose}
            title={variant === "panel" ? "Close panel" : "Close"}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.textMuted,
              p: 0.5,
              borderRadius: 1,
              "&:hover": { backgroundColor: colors.slateInnerBg },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {loading && notifications.length === 0 ? (
          <NotificationSkeleton rows={4} />
        ) : notifications.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
              gap: 1,
              color: colors.textMuted,
            }}
          >
            <NotificationsIcon sx={{ fontSize: 36, color: colors.textFaint }} />
            <Box sx={{ fontSize: 13 }}>No notifications</Box>
          </Box>
        ) : (
          notifications.map((n) => {
            const cfg = typeCfg[n.cNotificationType] || typeCfg.I;
            return (
              <Box
                key={n.nNotificationId}
                onClick={() => handleClick(n)}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  px: 1.75,
                  py: 1.25,
                  cursor: "pointer",
                  borderBottom: `1px solid ${colors.slateInnerBg}`,
                  bgcolor: n.bIsRead
                    ? colors.slateOuterBgSolid
                    : colors.slateItemHeaderBg,
                  position: "relative",
                  transition: "background-color 0.15s",
                  "&:hover": { bgcolor: colors.slateItemHeaderBg },
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                {/* Type icon */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: cfg.bg,
                    color: cfg.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 0.25,
                  }}
                >
                  {cfg.icon}
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 0.25,
                    }}
                  >
                    <Box
                      sx={{
                        fontWeight: n.bIsRead ? 500 : 700,
                        fontSize: 13,
                        color: colors.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.strTitle}
                    </Box>
                    <Box
                      sx={{ fontSize: 10, color: colors.textMuted, flexShrink: 0 }}
                    >
                      {timeAgo(n.dtNotifiedAt)}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.strNotification}
                  </Box>
                </Box>

                {/* Actions */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                    flexShrink: 0,
                  }}
                >
                  {!n.bIsRead && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.nNotificationId);
                      }}
                      title="Mark as read"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: colors.textMuted,
                        p: 0.25,
                        borderRadius: 0.5,
                        "&:hover": {
                          color: colors.blueText,
                          bgcolor: colors.blueSurface,
                        },
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    </Box>
                  )}
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(n.nNotificationId);
                    }}
                    title="Delete"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: colors.textMuted,
                      p: 0.25,
                      borderRadius: 0.5,
                      "&:hover": {
                        color: colors.redAlertText,
                        bgcolor: colors.redSurface,
                      },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer — the drop-down's path to the FULL panel (its host is
          narrow); the side panel itself never shows a footer. */}
      {variant === "dropdown" && notifications.length > 0 && (
        <Box
          sx={{
            px: 1.75,
            py: 1,
            borderTop: `1px solid ${colors.slateInnerBg}`,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <Box
            onClick={handleViewAll}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.blueText,
              cursor: "pointer",
              display: "inline-block",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            View all notifications
          </Box>
        </Box>
      )}
    </>
  );
}

export default NotificationsBody;
