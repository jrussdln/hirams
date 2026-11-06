// components/common/ContentHeaderStructure.jsx
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────
// INLINE COLOR MAP — per-file useColors pattern (PROMPT 1)
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  defaultBg: c.cyan.bg,
  defaultBorder: c.cyan.border,
  defaultText: c.cyan.text,
});

function ContentHeaderStructure({
  children,
  bgColor,
  borderColor,
  textColor,
  borderRadius = 2,
  p = 1.5,
  mb = 1.5,
  fontWeight = 400,
  fontSize = "0.850rem",
  lineHeight = 1,
  textAlign = "center",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Theme resolution — memoized
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <Box
      sx={{
        backgroundColor: bgColor ?? colors.defaultBg,
        border: `1px solid ${borderColor ?? colors.defaultBorder}`,
        borderRadius,
        p,
        mb,
        overflow: "hidden",
      }}
    >
<Typography
  variant="body2"
  component="div"
  sx={{
    color: textColor ?? colors.defaultText,
    fontWeight,
    fontSize,
    lineHeight,
    textAlign,
    overflow: "visible",
  }}
>
  {children}
</Typography>
    </Box>
  );
}

export default ContentHeaderStructure;
