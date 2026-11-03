import React, { useMemo } from "react";
import { Box, Modal, Slide, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";
import AIChatbotLayout from "../../../components/layouts/chatbot/structure";

const useColors = (c) => ({
  surfaceBg: c.slate.outerBg,
  innerBg: c.slate.innerBg,
  borderColor: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  blueBg: c.blue.bg,
  blueBgSoft: c.blue.bgSoft,
  blueText: c.blue.text,
  blueTextStrong: c.blue.textStrong,
  inputBg: c.gray.inputBg,
  shadowStrong: c.shadow.strong,
});

/**
 * AIChatbotModal
 *
 * Mobile, full-screen modal version of the AI assistant, sliding up from
 * the bottom.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - messages: optional array of { id, role: "user" | "assistant", text }
 *  - onSend: optional (text: string) => void
 */
function AIChatbotModal({ open, onClose, messages = [], onSend }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "flex-end" }}
    >
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            width: "100%",
            height: "88vh",
            backgroundColor: colors.surfaceBg,
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            display: "flex",
            flexDirection: "column",
            outline: "none",
            boxShadow: `0 -4px 24px ${colors.shadowStrong}`,
          }}
        >
          {/* Drag handle */}
          <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 4,
                borderRadius: "99px",
                backgroundColor: colors.borderColor,
              }}
            />
          </Box>

          <AIChatbotLayout
            colors={colors}
            onClose={onClose}
            messages={messages}
            onSend={onSend}
            headerIconBoxSize={28}
            headerIconFontSize={15}
            headerTitleFontSize="0.85rem"
            emptyStateIconSize={32}
            emptyStateTextSize="0.78rem"
            messageFontSize="0.8rem"
            messageBorderRadius="12px"
            inputFontSize="0.8rem"
            inputBorderRadius="10px"
            sendIconSize={18}
            footerSx={{
              px: 1.5,
              py: 1.25,
              pb: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
            }}
          />
        </Box>
      </Slide>
    </Modal>
  );
}

export default AIChatbotModal;
