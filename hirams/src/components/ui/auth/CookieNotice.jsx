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
const BAR_BG = "rgba(31, 111, 197, 0.7)";
const SUBMIT_BG = "#2e9e7a";

/**
 * "Important Notice" bar shown after a successful login.
 *
 * Mount it ONCE inside the layout every logged-in page shares (the one that
 * wraps /dashboard). The user ticks "I Agree" and presses Submit; the choice
 * is then remembered. Turn it off with COOKIE_NOTICE_ENABLED in
 * dataPrivacyText.js.
 */
export default function CookieNotice() {
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
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.snackbar,
        bgcolor: BAR_BG,
        color: "#fff",
        px: { xs: 2, sm: 3 },
        pt: { xs: 2, sm: 2.5 },
        pb: { xs: 2, sm: 2.5 },
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: "0.85rem", sm: "0.95rem" },
          letterSpacing: "0.02em",
          mb: 1.25,
        }}
      >
        {cookieNotice.heading}
      </Typography>

      <Typography
        sx={{
          fontSize: { xs: "0.82rem", sm: "0.92rem" },
          lineHeight: 1.7,
          mb: 1.5,
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
            <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
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
            bgcolor: SUBMIT_BG,
            color: "#fff",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            px: 3,
            py: 1,
            borderRadius: 1,
            "&:hover": { bgcolor: "#258566" },
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