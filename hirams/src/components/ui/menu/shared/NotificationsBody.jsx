import React, { useMemo, useState } from "react";
import { Box, useTheme } from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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

/* ── Time grouping ────────────────────────────────────────────────
   Notifications bucket into This Day / This Week / This Month /
   This Year (+ Earlier). This Week is a rolling 7-day window (not a
   calendar week), so "4d ago" always reads This Week. */
const GROUP_ORDER = ["day", "week", "month", "year", "earlier"];
const GROUP_META = {
  day: "This Day",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  earlier: "Earlier",
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const groupKeyOf = (dt, now) => {
  if (!dt) return "earlier";
  const d = new Date(dt);
  if (isNaN(d)) return "earlier";
  // Rolling buckets — "7 days ago" must read This Week regardless of
  // which weekday it was, so This Week is a sliding 168h window rather
  // than a calendar Mon–Sun. Mutually exclusive top-down:
  if (+startOfDay(d) === +startOfDay(now)) return "day";
  if (d.getTime() >= now.getTime() - 7 * DAY_MS) return "week";
  if (d >= startOfMonth(now)) return "month";
  if (d.getFullYear() === now.getFullYear()) return "year";
  return "earlier";
};

const groupNotifications = (rows, now = new Date()) => {
  const groups = { day: [], week: [], month: [], year: [], earlier: [] };
  rows.forEach((n) => groups[groupKeyOf(n.dtNotifiedAt, now)].push(n));
  return groups;
};

/* Rows show the full timestamp under the content — "Tue, Nov 3, 2026
   9:24 AM". Composed part-by-part because ICU inserts an extra comma
   before the time when formatting date+time at once. */
const fmtNotificationDate = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d)) return "";
  const weekday = d.toLocaleString("en-US", { weekday: "short" });
  const datePart = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${weekday}, ${datePart} ${timePart}`;
};

/* Older notifications were stored with the timestamp glued onto the
   message ("<date>: …"). The row-level date made it redundant, so strip
   any leading prefix that matches that legacy shape. */
const LEGACY_TS_PREFIX =
  /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} \d{1,2}:\d{2}\s?[AP]M:\s*/;

const rowMessage = (n) => (n.strNotification || "").replace(LEGACY_TS_PREFIX, "");

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

  /* Bucket the feed once per render tick. `now` is read inline so a
     session spanning midnight regroups on the next fetch; no ticker
     needed — every open/refresh already re-renders. */
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);
  const isFullList = variant === "panel";

  /* Accordion state for the side panel's sections. Everything starts
     collapsed except the first bucket (This Day). */
  const [openGroups, setOpenGroups] = useState(() => ({ day: true }));
  const toggleGroup = (id) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderRow = (n) => {
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
          }}
        >
          {rowMessage(n)}
        </Box>
        {/* Full timestamp under the content — the canonical date. */}
        <Box sx={{ mt: 0.35, fontSize: 10, color: colors.textMuted }}>{fmtNotificationDate(n.dtNotifiedAt)}</Box>
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
          flexShrink: 0,
          borderBottom: `1px solid ${colors.slateInnerBg}`,
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
          {/* "Mark all read" lives in the footer for the side panel —
              keep this header chip only for the surfaces without one. */}
          {variant !== "panel" && unreadCount > 0 && (
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
      <Box sx={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
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
        ) : isFullList ? (
          /* FULL LIST (side panel) — the four buckets always render in
             order (This Day / This Week / This Month / This Year) so the
             hierarchy reads plainly even when a bucket is empty;
             Earlier only appears if rows exist. Headers stick while
             their rows scroll underneath. */
          GROUP_ORDER.filter((id) => id !== "earlier" || groups[id].length > 0)
            .map((id) => {
              const isOpen = !!openGroups[id];
              const count = groups[id].length;
              return (
                <React.Fragment key={id}>
                  {/* Section header — click toggles the accordion. */}
                  <Box
                    onClick={() => toggleGroup(id)}
                    sx={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 1.75,
                      py: 0.75,
                      backgroundColor: colors.slateOuterBgSolid,
                      borderBottom: `1px solid ${colors.slateInnerBg}`,
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                      "&:hover": { backgroundColor: colors.slateHover },
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: colors.textMuted,
                      }}
                    >
                      {GROUP_META[id]}
                    </Box>
                    {count > 0 && (
                      <Box
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: colors.blueText,
                          backgroundColor: colors.blueSurface,
                          borderRadius: 999,
                          px: 0.75,
                          lineHeight: 1.6,
                        }}
                      >
                        {count}
                      </Box>
                    )}
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 16,
                        color: colors.textMuted,
                        ml: "auto",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s ease",
                      }}
                    />
                  </Box>
                  {isOpen &&
                    (count > 0 ? (
                      groups[id].map(renderRow)
                    ) : (
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1,
                          fontSize: 11.5,
                          color: colors.textFaint,
                          borderBottom: `1px solid ${colors.slateInnerBg}`,
                        }}
                      >
                        No notifications
                      </Box>
                    ))}
                </React.Fragment>
              );
            })
        ) : (
          /* BELL DROPDOWN / MOBILE SHEET — today's notifications only;
             the "View all" footer opens the grouped side panel. */
          groups.day.length > 0 ? (
            groups.day.map(renderRow)
          ) : (
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
              <Box sx={{ fontSize: 13 }}>No new notifications today</Box>
              <Box sx={{ fontSize: 11 }}>
                Older notifications are under View all
              </Box>
            </Box>
          )
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

      {/* Side panel footer — mirrors the AI chatbot panel: fixed bar under
          the scrollable list carrying the bulk read action. Disabled
          (muted, inert) while everything is already read. */}
      {variant === "panel" && notifications.length > 0 && (
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
            onClick={unreadCount > 0 ? () => markAllRead() : undefined}
            title={unreadCount > 0 ? "Mark every notification read" : "Nothing unread"}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 0.75,
              py: 0.375,
              borderRadius: 1,
              ...(unreadCount > 0
                ? {
                    color: colors.blueText,
                    cursor: "pointer",
                    "&:hover": { backgroundColor: colors.blueSurface },
                  }
                : {
                    color: colors.textMuted,
                    cursor: "default",
                  }),
            }}
          >
            <DoneAllIcon sx={{ fontSize: 14 }} />
            Mark all as read
          </Box>
        </Box>
      )}
    </>
  );
}

export default NotificationsBody;
