import React, { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";

const useColors = (c) => ({
  surfaceBg: c.slate.outerBg,
  borderColor: c.slate.border,
});

/**
 * PageRightPanel
 *
 * The ONE chrome shared by the right-side panels that squeeze page
 * content instead of floating over it (NotificationsSidePanel,
 * AIChatBotPanel). An inline flex sibling inside the content row: when
 * `open` is true it takes `width` px, otherwise it collapses to 0 and
 * the page stretches back — animated by the width transition.
 *
 * Square, flush top and bottom, with a single borderLeft separating it
 * from the page content — the header/footer borders of the content
 * panel already run above and below it.
 *
 * Props:
 *  - open: boolean — whether the panel occupies space
 *  - width: number — panel width in px while open
 *  - children: content — rendered into the full-height inner surface
 *    (AIChatbotLayout passes its own colors; NotificationsBody reads
 *    the theme itself).
 */
function PageRightPanel({ open, width, children }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  // Memoized call keeps the identity stable for the sx theme resolution.
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <Box
      sx={{
        flexShrink: 0,
        alignSelf: "stretch",
        width: open ? width : 0,
        overflow: "hidden",
        transition: "width 0.25s ease",
        borderLeft: open ? `1px solid ${colors.borderColor}` : "none",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          width,
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.surfaceBg,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default PageRightPanel;
