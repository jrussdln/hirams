import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";
import AIChatbotLayout from "../../../components/layouts/chatbot/structure";
import PageRightPanel from "../../../components/ui/panel/PageRightPanel";

const useColors = (c) => ({
  innerBg: c.slate.innerBg,
  borderColor: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  blueBg: c.blue.bg,
  blueBgSoft: c.blue.bgSoft,
  blueText: c.blue.text,
  blueTextStrong: c.blue.textStrong,
  blueBorder: c.blue.border,
  inputBg: c.gray.inputBg,
});

/**
 * AIChatbotPanel
 *
 * Desktop, inline sliding panel meant to sit alongside page content
 * (rendered as a flex sibling inside the content area, not an overlay).
 * The sliding chrome (width transition, border, surface) lives in
 * PageRightPanel; this file owns the chatbot's color tokens and the
 * layout that consumes them.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - width: number, panel width in px, defaults to 340
 *  - messages: optional array of { id, role: "user" | "assistant", text }
 *  - onSend: optional (text: string) => void â€” called when the user submits a message
 */
function AIChatbotPanel({ open, onClose, width = 340, messages = [], onSend }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <PageRightPanel open={open} width={width}>
      <AIChatbotLayout
        colors={colors}
        onClose={onClose}
        messages={messages}
        onSend={onSend}
      />
    </PageRightPanel>
  );
}

export default AIChatbotPanel;
