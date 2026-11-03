import React, { useEffect, useMemo, useState } from "react";
import { Dialog, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import BaseButton from "../form/BaseButton.jsx";

const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

// ── INLINE COLOR MAP - per-file useColors pattern ──────────────────
const useColors = (c) => ({
  warnSurface: c.amber.surface,
  warnBorder: c.amber.signalBorder,
  warnIcon: c.amber.signalText,
  heading: c.gray.textInk,
  body: c.gray.textSecondary,
  muted: c.gray.textMuted,
});

const fmtCountdown = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Inactivity prompt. Shown by the idle watcher (useIdleLogout) after the
 * idle limit is reached, it counts down a short grace period and hands
 * the outcome to the watcher:
 *   • onRestore / onCancel — the user CHOSE to stay; the watcher then
 *     restarts the idle clock from zero.
 *   • onLogout — the countdown ran out; the watcher signs the tab out.
 * Purely presentational — all the sign-out work lives in the hook.
 */
export default function IdleLogoutPrompt({
  open,
  idleLabel,
  graceSeconds = 60,
  onRestore,
  onLogout,
}) {
  const [left, setLeft] = useState(graceSeconds);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(base);

  // Grace countdown — one tick per second; if the user never answers,
  // the promise "Logging out" is carried out on 0:00.
  useEffect(() => {
    if (!open) return undefined;
    setLeft(graceSeconds);
    const timer = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, graceSeconds]);

  return (
    <Dialog
      open={open}
      // The prompt must never vanish without a decision — there is no
      // backdrop dismissal; auto-logout still stands on the countdown.
      PaperProps={{
        sx: {
          borderRadius: "16px",
          fontFamily: FONT,
          maxWidth: 380,
          width: "100%",
          overflow: "hidden",
        },
      }}
    >
      <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
        <div
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 18px",
            borderRadius: "50%",
            background: colors.warnSurface,
            border: `1.5px solid ${colors.warnBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.warnIcon}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2
          style={{
            margin: "0 0 6px",
            fontSize: "1.2rem",
            fontWeight: 650,
            letterSpacing: "-0.02em",
            color: colors.heading,
          }}
        >
          Inactivity Detected
        </h2>

        <p
          style={{
            margin: "0 0 4px",
            fontSize: "0.85rem",
            color: colors.body,
            lineHeight: 1.6,
          }}
        >
          You have been idle for{" "}
          <strong style={{ color: colors.heading }}>{idleLabel}</strong>. To
          keep your data safe you will be signed out automatically.
        </p>

        <p
          style={{
            margin: "0 0 24px",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: colors.warnIcon,
          }}
        >
          Logging out in {fmtCountdown(left)}
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <BaseButton
            label="Restore Session"
            actionColor="approve"
            onClick={onRestore}
            sx={{ flex: 1 }}
          />
        </div>
      </div>
    </Dialog>
  );
}
