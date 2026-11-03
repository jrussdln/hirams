import React, { useState, useCallback, useMemo } from "react";
import { IconButton, Tooltip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import getThemeColors from "../../../utils/style/getThemeColors";
import AIChatBotPanel from "../../../pages/shared/ai-chatbot/component/AIChatBotPanel";
import AIChatBotModal from "../../../pages/shared/ai-chatbot/modal/AIChatBotModal";
import AIChatBotAPI from "../../../api/endpoints/ai-chatbot.api";

// ── INLINE COLOR MAP - per-file useColors pattern ──────────────────
const useColors = (c) => ({
  accent: c.blue.text, // 6-digit hex — the glow keyframes append alpha to it
  onFill: c.gray.textOnFill,
  shadowStrong: c.shadow.strong,
  shineBold: c.slate.shineBold,
});

/**
 * AIChatbotWidget
 *
 * Fully self-contained AI assistant entry point: owns open/closed state,
 * message history, and the send-to-API handler. Renders the floating
 * trigger button plus the desktop panel or mobile modal depending on
 * viewport. Consumers just drop <AIChatbotWidget /> in — no wiring needed.
 *
 * Props:
 *  - accentColor: optional override for the floating button background + glow.
 *    Defaults to the themed blue accent when omitted.
 */
function AIChatbotWidget({ accentColor }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  // Called directly rather than inside useMemo: `useColors` is a plain
  // factory, and wrapping it trips react-hooks/rules-of-hooks.
  const colors = useColors(base);
  // Prop override still wins, but the default now follows the theme.
  const accent = accentColor ?? colors.accent;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  // The notifications side panel shares this content row — while it is
  // open the chatbot (panel AND floating button) steps aside entirely.
  const [yielded, setYielded] = useState(false);

  React.useEffect(() => {
    const yieldRow = () => {
      setYielded(true);
      setOpen(false); // the chat panel collapses with the row's tenant switch
    };
    const claimRow = () => setYielded(false);
    window.addEventListener("open_notifications_panel", yieldRow);
    window.addEventListener("close_notifications_panel", claimRow);
    return () => {
      window.removeEventListener("open_notifications_panel", yieldRow);
      window.removeEventListener("close_notifications_panel", claimRow);
    };
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const userMsg = { id: `u-${Date.now()}`, role: "user", text };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.text,
        }));
        const reply = await AIChatBotAPI.send(history);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", text: reply },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: "Sorry, something went wrong reaching the AI service.",
          },
        ]);
      }
    },
    [messages],
  );

  return (
    <>
      {yielded ? null : !isMobile && (
        <AIChatBotPanel
          open={open}
          onClose={() => setOpen(false)}
          messages={messages}
          onSend={handleSend}
        />
      )}

      {!yielded && !open && (
        <Tooltip title="Ask AI" placement="left">
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              position: "absolute",
              bottom: 90,
              right: 30,
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: accent,
              color: colors.onFill,
              overflow: "hidden",
              boxShadow: `0 4px 12px ${colors.shadowStrong}, 0 0 0 0 ${accent}`,
              zIndex: 15,
              animation: "aiPulse 2.4s ease-out infinite",
              "@keyframes aiPulse": {
                "0%": { boxShadow: `0 4px 12px ${colors.shadowStrong}, 0 0 0 0 ${accent}66` },
                "70%": { boxShadow: `0 4px 12px ${colors.shadowStrong}, 0 0 0 12px ${accent}00` },
                "100%": { boxShadow: `0 4px 12px ${colors.shadowStrong}, 0 0 0 0 ${accent}00` },
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-150%",
                width: "60%",
                height: "100%",
                background: `linear-gradient(120deg, transparent, ${colors.shineBold}, transparent)`,
                animation: "aiShine 2.8s ease-in-out infinite",
              },
              "@keyframes aiShine": {
                "0%": { left: "-150%" },
                "50%": { left: "150%" },
                "100%": { left: "150%" },
              },
              "&:hover": {
                backgroundColor: accent,
                filter: "brightness(0.92)",
                animationPlayState: "paused",
              },
            }}
          >
            <AutoAwesome
              fontSize="small"
              sx={{ position: "relative", zIndex: 1, animation: "aiSpark 1.8s ease-in-out infinite" }}
            />
            <style>{`
              @keyframes aiSpark {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.75; transform: scale(1.15); }
              }
            `}</style>
          </IconButton>
        </Tooltip>
      )}

      {isMobile && (
        <AIChatBotModal
          open={open}
          onClose={() => setOpen(false)}
          messages={messages}
          onSend={handleSend}
        />
      )}
    </>
  );
}

export default AIChatbotWidget;