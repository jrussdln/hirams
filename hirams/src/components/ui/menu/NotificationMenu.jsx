import React, { useMemo, useRef, useState } from "react";
import {
  Paper,
  Popper,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
  Slide,
  Box,
} from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";

import getThemeColors from "../../../utils/style/getThemeColors";
import NotificationsBody from "./shared/NotificationsBody";
import useNotifications from "../../../hooks/useNotifications";

/* ── Theme tokens ────────────────────────────────────────────── */
// INLINE COLOR MAP — per-file useColors pattern
const useColors = (c) => ({
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textOnFill: c.gray.textOnFill,
  blueText: c.blue.text,
  redAlertText: c.red.alertText,
  slateItemHeaderBg: c.slate.itemHeaderBg,
  slateHover: c.slate.hover,
  slateOuterBgSolid: c.slate.outerBgSolid,
  scrim: c.shadow.scrim,
});

/* ═════════════════════════════════════════════════════════════ */
function NotificationMenu() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  // Plain call (not inside useMemo) — wrapping a `use*` name in a callback
  // trips react-hooks/rules-of-hooks; cheap object literal, no memo needed.
  const colors = useColors(base);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const handleToggle = () => setOpen((prev) => !prev);
  const handleClose = () => setOpen(false);

  /* ONE fetch owns the badge and the dropdown list: the body renders
     this feed, so marking rows read inside the dropdown updates the
     bell badge in the same render. */
  const feed = useNotifications();

  /* ── Shared panel ────────────────────────────────────────────── */
  const PanelContent = (
    <Paper
      elevation={isMobile ? 0 : 4}
      sx={{
        width: isMobile ? "100%" : 360,
        maxHeight: isMobile ? "80vh" : 480,
        borderRadius: isMobile ? "16px 16px 0 0" : "10px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: isMobile ? "none" : `1px solid ${colors.slateItemHeaderBg}`,
      }}
    >
      <NotificationsBody
        variant={isMobile ? "mobile" : "dropdown"}
        onClose={handleClose}
        feed={feed}
      />
    </Paper>
  );

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div style={{ position: "relative" }}>
        {/* Bell */}
        <button
          ref={bellRef}
          onClick={handleToggle}
          style={{
            position: "relative",
            padding: 4, // was 8, now matches the other header icons (p: 0.5)

            borderRadius: "50%",
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.slateHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <NotificationsIcon
            sx={{
              fontSize: 22,
              color: open ? colors.blueText : colors.textSecondary,
              mr: 0.5,
              transition: "color 0.2s",
            }}
          />
          {feed.unreadCount > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: 0, // was 4
                right: 0.5, // was 4
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                bgcolor: colors.redAlertText,
                color: colors.textOnFill,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 0.375,
                lineHeight: 1,
                boxShadow: `0 0 0 2px ${colors.slateOuterBgSolid}`,
              }}
            >
              {feed.unreadCount > 9 ? "9+" : feed.unreadCount}
            </Box>
          )}
        </button>

        {/* Desktop dropdown */}
        {!isMobile && (
          <Popper
            open={open}
            anchorEl={bellRef.current}
            placement="bottom-end"
            disablePortal={false}
            modifiers={[
              { name: "flip", enabled: true },
              {
                name: "preventOverflow",
                enabled: true,
                options: { boundary: "window" },
              },
            ]}
            sx={{ zIndex: 1300 }}
          >
            <Box sx={{ mt: 1, position: "relative" }}>
              {/* Caret arrow */}
              <Box
                sx={{
                  position: "absolute",
                  top: -7,
                  right: 14,
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderBottom: `7px solid ${colors.slateOuterBgSolid}`,
                  zIndex: 1,
                }}
              />
              {PanelContent}
            </Box>
          </Popper>
        )}

        {/* Mobile bottom sheet */}
        {isMobile && (
          <>
            {/* Backdrop */}
            <Box
              onClick={handleClose}
              sx={{
                position: "fixed",
                inset: 0,
                bgcolor: colors.scrim,
                zIndex: 1300,
                opacity: open ? 1 : 0,
                pointerEvents: open ? "auto" : "none",
                transition: "opacity 0.25s ease",
              }}
            />
            {/* Sheet with Slide animation */}
            <Slide direction="up" in={open} mountOnEnter unmountOnExit>
              <Box
                sx={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1400,
                }}
              >
                {/* Drag handle */}
                <Box
                  sx={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: colors.textOnFill,
                    mx: "auto",
                    mb: 0.75,
                    mt: 1,
                  }}
                />
                {PanelContent}
              </Box>
            </Slide>
          </>
        )}
      </div>
    </ClickAwayListener>
  );
}

export default NotificationMenu;
