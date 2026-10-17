import React from "react";
import { Alert } from "@mui/material";

/**
 * The status line every auth page used to hand-roll as coloured text.
 *
 * One component so the tone, spacing and — the part plain text was missing —
 * the screen-reader announcement (`role="alert"`) match on login, forgot
 * password and reset password.
 *
 * @param tone "error" | "success" | "info"
 */
export default function AuthAlert({ tone = "error", message, sx }) {
  if (!message) return null;

  const severity =
    tone === "success" ? "success" : tone === "info" ? "info" : "error";

  return (
    <Alert
      severity={severity}
      variant="outlined"
      role="alert"
      sx={{
        mb: 2,
        py: 0.25,
        alignItems: "center",
        textAlign: "left",
        fontSize: { xs: "0.72rem", sm: "0.82rem" },
        lineHeight: 1.5,
        ...sx,
      }}
    >
      {message}
    </Alert>
  );
}
