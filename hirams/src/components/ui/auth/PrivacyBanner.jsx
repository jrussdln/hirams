import React from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Link,
  Typography,
  useTheme,
} from "@mui/material";
import { VerifiedUserOutlined } from "@mui/icons-material";
import BaseButton from "../form/BaseButton";
import getThemeColors from "../../../utils/style/getThemeColors";
import {
  SYSTEM_NAME,
  privacyStatement,
  termsAndConditions,
} from "../../../constants/dataPrivacyText";

// ── Component-specific color map: ONLY tokens this component uses ──
const useColors = (c) => ({
  bannerBg: c.slate.outerBgSolid,
  surface: c.slate.itemHeaderBg,
  accent: c.navy.authAccent,
  accentText: c.navy.text,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  linkPrimary: c.blue.text,
  bannerShadow: c.shadow.popover,
});

// A real anchor (not navigate()) so "view more" opens in a NEW TAB and the
// half-typed login form stays put. BASE_URL carries the production "/hirams/"
// prefix and nothing in dev, the same base the router uses.
const PRIVACY_URL = `${import.meta.env.BASE_URL}data-privacy`;

/**
 * Consent sheet over the lower 60% of the login screen.
 *
 * Brand line, then the Privacy Statement and Terms and Conditions side by
 * side (stacked on a phone), a centered "Click to view more", the consent box,
 * and a full-width "I Understand". Overflow scrolls inside the sheet. The page
 * behind is dimmed, and the login page keeps its own Login button disabled
 * while this is mounted.
 *
 * @param {() => void} onAgree — called when "I Understand" is clicked with the
 *   box ticked; the caller persists the choice and unmounts the banner.
 */
export default function PrivacyBanner({ onAgree }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const [agreed, setAgreed] = React.useState(false);

  const headingSx = {
    textAlign: "center",
    fontWeight: 700,
    fontSize: { xs: "0.95rem", sm: "1.05rem" },
    color: colors.textPrimary,
    mb: 1.5,
  };

  const bodySx = {
    textAlign: "justify",
    fontSize: { xs: "0.8rem", sm: "0.9rem" },
    lineHeight: 1.8,
    color: colors.textSecondary,
  };

  const strongSx = { color: colors.textPrimary, fontWeight: 700 };

  return (
    <>
      {/* Dims and softly blurs the login screen behind the sheet. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: (t) => t.zIndex.modal - 1,
          bgcolor: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(2px)",
        }}
      />

      <Box
        component="section"
        role="dialog"
        aria-modal="true"
        aria-label="Privacy statement and terms and conditions"
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.modal,
          height: { xs: "85dvh", sm: "60vh" },
          minHeight: { sm: 440 },
          display: "flex",
          flexDirection: "column",
          bgcolor: colors.bannerBg,
          borderTop: `3px solid ${colors.accent}`,
          boxShadow: `0 -16px 40px ${colors.bannerShadow}`,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        {/* ── Scrollable content ──────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: { xs: 2, sm: 4, md: 8 },
            pt: { xs: 2, sm: 3 },
            pb: 1,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: "auto" }}>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                columnGap: { md: 5 },
                rowGap: 3,
              }}
            >
              <Box>
                <Typography sx={headingSx}>Privacy Statement</Typography>
                <Typography sx={bodySx}>{privacyStatement}</Typography>
              </Box>
              <Box>
                <Typography sx={headingSx}>Terms and Conditions</Typography>
                <Typography sx={bodySx}>{termsAndConditions}</Typography>
              </Box>
            </Box>

            <Box sx={{ textAlign: "center", mt: 2.5, mb: 1 }}>
              <Link
                href={PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "inline-block",
                  py: 0.75,
                  px: 1,
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  color: colors.linkPrimary,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                  "&:focus-visible": {
                    outline: `2px solid ${colors.linkPrimary}`,
                    outlineOffset: 2,
                    borderRadius: 0.5,
                  },
                }}
              >
                Click to view more
              </Link>
            </Box>
          </Box>
        </Box>

        {/* ── Consent (fixed row) ─────────────────────────────────────── */}
        <Box sx={{ px: { xs: 2, sm: 4, md: 8 }, pt: 1, pb: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box
              sx={{
                bgcolor: colors.surface,
                border: "none",
                borderRadius: 1.5,
                px: 1.5,
                py: 0.75,
                mb: 1.5,
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%" }}
                control={
                  <Checkbox
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    inputProps={{ "aria-label": "I have read and agree" }}
                    sx={{
                      color: colors.linkPrimary,
                      "&.Mui-checked": { color: colors.linkPrimary },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: { xs: "0.8rem", sm: "0.92rem" },
                      color: colors.textSecondary,
                    }}
                  >
                    I have read and agree to the{" "}
                    <Box component="strong" sx={strongSx}>
                      Privacy Statement
                    </Box>{" "}
                    and{" "}
                    <Box component="strong" sx={strongSx}>
                      Terms and Conditions
                    </Box>
                    .
                  </Typography>
                }
              />
            </Box>

            <BaseButton
              label="I Understand"
              disabled={!agreed}
              onClick={onAgree}
              actionColor="login"
              sx={{ width: "100%", py: { xs: 1.3, sm: 1.6 } }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
}