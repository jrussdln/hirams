import React from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Typography,
} from "@mui/material";
import { getItem, setItem } from "../../../utils/storage/localStorage.js";
import {
  COOKIE_NOTICE_ENABLED,
  cookieNotice,
} from "../../../constants/dataPrivacyText";

// Opens the full page in a new tab, using the same base path the router uses.
const PRIVACY_URL = `${import.meta.env.BASE_URL}data-privacy`;
const STORAGE_KEY = "cookieNoticeAccepted";

// A semi-transparent blue bar (70% alpha) with white text, the same in light
// and dark mode.
const BAR_BG = "rgba(30, 64, 175, 0.95)";
const SUBMIT_BG = "#ffffff";

/**
 * "Important Notice" bar shown after a successful login.
 *
 * Mount it ONCE inside the layout every logged-in page shares (the one that
 * wraps /dashboard). The user ticks "I Agree" and presses Submit; the choice
 * is then remembered. Turn it off with COOKIE_NOTICE_ENABLED in
 * dataPrivacyText.js.
 */
export default function CookieNotice({ contained = false }) {
  const [accepted, setAccepted] = React.useState(
    () => !COOKIE_NOTICE_ENABLED || getItem(STORAGE_KEY) === true,
  );
  const [agreed, setAgreed] = React.useState(false);

  if (accepted) return null;

  const submit = () => {
    if (!agreed) return;
    setItem(STORAGE_KEY, true);
    setAccepted(true);
  };

  return (
    <Box
      component="aside"
      role="region"
      aria-label="Important notice"
      sx={{
        position: contained ? "absolute" : "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.snackbar,
        bgcolor: BAR_BG,
        color: "#fff",
        borderTop: "1px solid rgba(255, 255, 255, 0.15)",
        px: { xs: 2, sm: 3 },
        pt: { xs: 1.5, sm: 2 },
        pb: { xs: 1.5, sm: 2 },
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.18)",
      }}
    >
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: { xs: "0.8rem", sm: "0.88rem" },
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          mb: 0.75,
          color: "#fff",
        }}
      >
        {cookieNotice.heading}
      </Typography>

      <Typography
        sx={{
          fontSize: { xs: "0.78rem", sm: "0.85rem" },
          fontWeight: 400,
          lineHeight: 1.6,
          mb: 1.25,
          color: "rgba(255, 255, 255, 0.92)",
        }}
      >
        {cookieNotice.before}
        <Link
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
            "&:focus-visible": {
              outline: "2px solid #fff",
              outlineOffset: 2,
              borderRadius: 0.5,
            },
          }}
        >
          {cookieNotice.linkLabel}
        </Link>
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              inputProps={{ "aria-label": "I agree" }}
              sx={{
                color: "#fff",
                p: 0.75,
                "&.Mui-checked": { color: "#fff" },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" }, fontWeight: 500 }}>
              {cookieNotice.button}
            </Typography>
          }
        />

        <Button
          onClick={submit}
          disabled={!agreed}
          variant="contained"
          disableElevation
          sx={{
            bgcolor: "#fff",
            color: "#1e40af",
            fontWeight: 600,
            textTransform: "none",
            letterSpacing: "0.02em",
            fontSize: "0.85rem",
            px: 2.5,
            py: 0.75,
            borderRadius: 1.5,
            boxShadow: "none",
            "&:hover": { bgcolor: "#eff6ff", boxShadow: "none" },
            "&.Mui-disabled": {
              bgcolor: "rgba(255, 255, 255, 0.22)",
              color: "rgba(255, 255, 255, 0.7)",
            },
          }}
        >
          Submit
        </Button>
      </Box>
    </Box>
  );
}