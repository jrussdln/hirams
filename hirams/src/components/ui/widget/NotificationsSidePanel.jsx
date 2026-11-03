import React, { useEffect, useMemo, useState } from "react";
import { Box, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";
import NotificationsBody from "../menu/shared/NotificationsBody";

const useColors = (c) => ({
  surfaceBg: c.slate.outerBg,
  innerBg: c.slate.innerBg,
  borderColor: c.slate.border,
});

const PANEL_WIDTH = 360;

/**
 * NotificationsSidePanel
 *
 * The notifications VIEW-ALL surface — a right-side sliding column that
 * squeezes the page content the same way the AI chatbot does: an inline
 * flex sibling inside the content row (not an overlay). Opening is
 * driven by the `open_notifications_panel` window event, which the bell
 * dropdown's “View all notifications” footer dispatches.
 *
 * Mount once inside the content row (Layout2), ideally right where the
 * AIChatbotWidget sits so both panels stack after the page content.
 */
export default function NotificationsSidePanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  // Called directly rather than inside useMemo: `useColors` is a plain
  // factory, and wrapping it trips react-hooks/rules-of-hooks.
  const colors = useColors(base);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open_notifications_panel", onOpen);
    return () => {
      window.removeEventListener("open_notifications_panel", onOpen);
    };
  }, []);

  // The AI chatbot shares this row of the content area — tell it when the
  // notifications panel goes away so its floating button comes back.
  const closePanel = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("close_notifications_panel"));
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 1.5,
        flexShrink: 0,
        alignSelf: "stretch",
        width: open ? PANEL_WIDTH : 0,
        overflow: "hidden",
        transition: "width 0.25s ease",
        borderTop: open ? `1px solid ${colors.borderColor}` : "none",
        borderBottom: open ? `1px solid ${colors.borderColor}` : "none",
        borderLeft: open ? `1px solid ${colors.borderColor}` : "none",
        borderRight: "none",
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          width: PANEL_WIDTH,
          height: "100%",
          minHeight: 0,
          backgroundColor: colors.surfaceBg,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          overflow: "hidden",
        }}
      >
        <NotificationsBody
          variant="panel"
          onClose={closePanel}
        />
      </Box>
    </Box>
  );
}
