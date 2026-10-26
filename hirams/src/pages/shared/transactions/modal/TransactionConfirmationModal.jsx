import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import {
  TRANSACTION_CONFIRM_STYLES,
  resolveConfirmStyle,
} from "../../../../utils/style/sharedConfirmStyles.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── INLINE COLOR MAP — per-file useColors pattern (PROMPT 1) ────────────
// (the same slate tokens ConfirmationStructure uses for its back button)
const useColors = (c) => ({
  textSecondary: c.gray.textSecondary,
  btnText: c.slate.btnText,
  mutedBg: c.slate.mutedBg,
  btnBg: c.slate.btnBg,
  btnBorder: c.slate.btnBorder,
  btnHoverBg: c.slate.btnHoverBg,
  border: c.slate.border,
  outerBg: c.slate.outerBg,
  textOnFill: c.gray.textOnFill,
});

/**
 * The Add Transaction confirm — asks the type question ("Pre-Canvass or
 * not?") BEFORE the AEModal opens, in the same shell as every other
 * confirm dialog (ModalContainer + sharedConfirmStyles variants).
 *
 * Two actions: "Pre-Canvass" passes bIsPreCanvas=true; "No" answers no
 * and passes bIsPreCanvas=false — either opens the AEModal with the choice.
 */
export default function TransactionConfirmationModal({
  open,
  onPreCanvas,
  onNormal,
  onClose,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = getThemeColors(isDark);
  const colors = useColors(base);

  const style = useMemo(
    () => resolveConfirmStyle(TRANSACTION_CONFIRM_STYLES.add, isDark),
    [isDark],
  );

  if (!open || !style) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      contentOnly
      disableBackdropClick
      width={{ xs: "90%", sm: 480 }}
    >
      <Box
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: colors.outerBg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: style.bg,
            px: 3,
            py: 4,
            gap: 2,
            animation: "fadeSlideIn 0.18s ease",
            "@keyframes fadeSlideIn": {
              from: { opacity: 0, transform: "scale(0.97)" },
              to: { opacity: 1, transform: "scale(1)" },
            },
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: colors.outerBg,
              border: `1.5px solid ${style.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${style.dotColor}22`,
            }}
          >
            <style.Icon sx={{ fontSize: "1.4rem", color: style.iconColor }} />
          </Box>

          {/* Title + description */}
          <Box sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.95rem",
                fontWeight: 800,
                color: style.color,
                lineHeight: 1.3,
                mb: 0.75,
              }}
            >
              {style.title}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: colors.textSecondary,
                lineHeight: 1.6,
                maxWidth: 260,
                mx: "auto",
              }}
            >
              {style.desc}
            </Typography>
          </Box>

          {/* Actions — PreCanvass or No (No = open as a Normal Transaction) */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              width: "100%",
              maxWidth: 320,
            }}
          >
            <Box
              onClick={onPreCanvas}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 0.875,
                borderRadius: "8px",
                background: style.confirmBg,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: `0 2px 8px ${style.dotColor}44`,
                "&:hover": { opacity: 0.9, transform: "translateY(-0.5px)" },
                "&:active": { opacity: 0.85, transform: "translateY(0)" },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.textOnFill,
                }}
              >
                {style.confirmLabel}
              </Typography>
            </Box>

            <Box
              onClick={onNormal}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 0.875,
                borderRadius: "8px",
                background: colors.btnBg,
                border: `0.5px solid ${colors.btnBorder}`,
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": {
                  background: colors.btnHoverBg,
                  borderColor: colors.border,
                },
                "&:active": { opacity: 0.8 },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.btnText,
                }}
              >
                No
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </ModalContainer>
  );
}
