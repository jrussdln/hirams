import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Link,
  Typography,
  useTheme,
} from "@mui/material";
import { ExpandMore, VerifiedUserOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import getThemeColors from "../../utils/style/getThemeColors";
import {
  SYSTEM_NAME,
  SYSTEM_FULL_NAME,
  NPC_REGISTRATION,
  privacyStatement,
  termsAndConditions,
  termsPoints,
  privacyNotice,
  acceptanceNote,
} from "../../constants/dataPrivacyText";

// ── Component-specific color map: ONLY tokens this component uses ──
const useColors = (c) => ({
  pageBg: c.slate.outerBg,
  surface: c.slate.itemHeaderBg,
  border: c.slate.border,
  hairline: c.slate.divider,
  accent: c.navy.authAccent,
  accentSoft: c.navy.bg,
  accentText: c.navy.text,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  linkPrimary: c.blue.text,
});

export default function DataPrivacy() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const bodySx = {
    fontSize: { xs: "0.85rem", sm: "0.92rem" },
    lineHeight: 1.8,
    color: colors.textSecondary,
    textAlign: "justify",
  };

  const renderParagraphs = (paragraphs = []) =>
    paragraphs.map((p, i) => (
      <Typography key={i} sx={{ ...bodySx, mb: 1.5 }}>
        {p}
      </Typography>
    ));

  const renderBullets = (bullets) =>
    bullets && (
      <Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
        {bullets.map((b, i) => (
          <Box
            component="li"
            key={i}
            sx={{ mb: 0.75, "&::marker": { color: colors.accent } }}
          >
            <Typography sx={bodySx}>{b}</Typography>
          </Box>
        ))}
      </Box>
    );

  const accordionSx = {
    bgcolor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px !important",
    boxShadow: "none",
    mb: 2,
    "&::before": { display: "none" },
    "&.Mui-expanded": { mb: 2, mt: 0 },
  };

  const summarySx = {
    px: { xs: 2, sm: 3.5 },
    minHeight: { xs: 64, sm: 80 },
    "& .MuiAccordionSummary-content": { my: 2 },
    "&:focus-visible": {
      outline: `2px solid ${colors.accent}`,
      outlineOffset: -2,
    },
  };

  const titleSx = {
    fontWeight: 800,
    fontSize: { xs: "0.95rem", sm: "1.2rem" },
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    color: colors.textPrimary,
  };

  const hasRegistration = Boolean(NPC_REGISTRATION.number);

  // Shared by the header and footer so the two bars line up with the content.
  const barInnerSx = {
    width: "100%",
    maxWidth: 1200,
    mx: "auto",
    px: { xs: 2, sm: 8 },
  };

  const barLinkSx = {
    fontSize: { xs: "0.78rem", sm: "0.85rem" },
    fontWeight: 600,
    color: colors.linkPrimary,
    textDecoration: "none",
    py: 0.75,
    px: 1,
    mx: -1,
    "&:hover": { textDecoration: "underline" },
    "&:focus-visible": {
      outline: `2px solid ${colors.linkPrimary}`,
      outlineOffset: 2,
      borderRadius: 0.5,
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: colors.pageBg,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (t) => t.zIndex.appBar,
          bgcolor: colors.surface,
          borderBottom: `1px solid ${colors.hairline}`,
        }}
      >
        <Box
          sx={{
            ...barInnerSx,
            minHeight: { xs: 60, sm: 68 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: 1.5,
                bgcolor: colors.accentSoft,
                color: colors.accentText,
              }}
            >
              <VerifiedUserOutlined fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1rem", sm: "1.1rem" },
                  lineHeight: 1.2,
                  color: colors.textPrimary,
                }}
              >
                {SYSTEM_NAME}
              </Typography>
              <Typography
                noWrap
                sx={{
                  display: { xs: "none", sm: "block" },
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                }}
              >
                {SYSTEM_FULL_NAME}
              </Typography>
            </Box>
          </Box>

          {/* The page opens in its own tab, so offer a way back to the app. */}
          <Link
            component="button"
            type="button"
            onClick={() => navigate("/")}
            sx={barLinkSx}
          >
            Go to login
          </Link>
        </Box>
      </Box>

      {/* ── Page container ──────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          flex: 1,
          px: { xs: 2, sm: 8 },
          py: { xs: 3, sm: 5 },
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.35rem", sm: "1.8rem" },
              color: colors.textPrimary,
              mb: 0.75,
            }}
          >
            Data Privacy and Terms of Use
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
              color: colors.textSecondary,
              maxWidth: 720,
            }}
          >
            How {SYSTEM_NAME} collects, uses, and protects your information, and
            the terms for using the system.
          </Typography>
        </Box>

        {/* ── NPC registration seal (only when a number is configured) ── */}
        {hasRegistration && (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 2, sm: 4 },
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 2,
              border: `2px solid ${colors.accent}`,
              bgcolor: colors.accentSoft,
            }}
          >
            {NPC_REGISTRATION.sealImage ? (
              <Box
                component="img"
                src={NPC_REGISTRATION.sealImage}
                alt="DPS registration seal"
                sx={{ width: 96, height: "auto", flexShrink: 0 }}
              />
            ) : (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  border: `3px solid ${colors.accent}`,
                  color: colors.accentText,
                }}
              >
                <VerifiedUserOutlined sx={{ fontSize: 40 }} />
              </Box>
            )}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.05rem", sm: "1.3rem" },
                  color: colors.accentText,
                }}
              >
                {NPC_REGISTRATION.title}
                {NPC_REGISTRATION.year ? ` ${NPC_REGISTRATION.year}` : ""}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: colors.textPrimary,
                  mb: 1.5,
                }}
              >
                NPC Registration No. {NPC_REGISTRATION.number}
              </Typography>
              <Typography sx={bodySx}>{NPC_REGISTRATION.certificate}</Typography>
            </Box>
          </Box>
        )}

        {/* ── Accordions ──────────────────────────────────────────────── */}
        <Accordion disableGutters sx={accordionSx}>
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: colors.textPrimary }} />}
            sx={summarySx}
          >
            <Typography sx={titleSx}>Privacy Statement</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, sm: 3.5 }, pb: 3, pt: 0 }}>
            {renderParagraphs([privacyStatement])}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters sx={accordionSx}>
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: colors.textPrimary }} />}
            sx={summarySx}
          >
            <Typography sx={titleSx}>Privacy Notice</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, sm: 3.5 }, pb: 3, pt: 0 }}>
            {privacyNotice.map((section) => (
              <Box key={section.title} sx={{ mb: 2.5 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    color: colors.textPrimary,
                    mb: 1,
                  }}
                >
                  {section.title}
                </Typography>
                {renderParagraphs(section.paragraphs)}
                {renderBullets(section.bullets)}
                {section.after && (
                  <Typography sx={bodySx}>{section.after}</Typography>
                )}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters sx={accordionSx}>
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: colors.textPrimary }} />}
            sx={summarySx}
          >
            <Typography sx={titleSx}>Terms and Conditions</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, sm: 3.5 }, pb: 3, pt: 0 }}>
            {renderParagraphs([termsAndConditions])}
            {renderBullets(termsPoints)}
            <Typography sx={bodySx}>{acceptanceNote}</Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          bgcolor: colors.surface,
          borderTop: `1px solid ${colors.hairline}`,
          py: 2.5,
          px: 2,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.78rem", color: colors.textMuted }}>
          &copy; {new Date().getFullYear()} HiRAMS Inc. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}