import React from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";


// ── Component-specific color map: ONLY tokens this component uses ──
const useColors = (c) => ({
  pageBg: c.slate.outerBg,
  paperBg: c.slate.innerBg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  hairline: c.slate.divider,
  accent: c.navy.authAccent,
  cardShadow: c.shadow.base,
});


const AuthLayout = ({
  title,
  children,
  width = 400,
  maxWidth = "100%",
}) => {
  // ✅ Standard wiring — exact pattern from your docs
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);


  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: { xs: "flex-start", sm: "center" },
        bgcolor: colors.pageBg,
        p: { xs: 0, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: { xs: "100%", sm: width },
          maxWidth: { xs: "100%", sm: maxWidth },
          borderRadius: { xs: 0, sm: 3 },
          textAlign: "left",
          overflow: "hidden",
          position: "relative",
          bgcolor: colors.paperBg,
          minHeight: { xs: "100dvh", sm: "unset" },
          // Hairline + soft lift on desktop; flat and full-bleed on phones.
          border: { xs: "none", sm: `1px solid ${colors.hairline}` },
          boxShadow: { xs: "none", sm: `0 20px 50px ${colors.cardShadow}` },
          // iPhone home indicator / notch — the card is full-bleed on phones.
          pb: { xs: "env(safe-area-inset-bottom)", sm: 0 },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            pt: { xs: 4, sm: 5 },
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Page title + short accent rule — the form underneath is
              left-aligned, so the heading is too */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: colors.textPrimary,
                fontSize: { xs: "1.15rem", sm: "1.35rem" },
                lineHeight: 1.25,
              }}
            >
              {title}
            </Typography>
            <Box
              sx={{
                mt: 0.9,
                width: 36,
                height: 3,
                borderRadius: 2,
                bgcolor: colors.accent,
              }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              mt: 3,
              pt: 1.5,
              textAlign: "center",
              borderTop: `1px solid ${colors.hairline}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ display: "block", color: colors.textSecondary }}
            >
              &copy; {new Date().getFullYear()} HiRAMS Inc. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};


export default AuthLayout;
