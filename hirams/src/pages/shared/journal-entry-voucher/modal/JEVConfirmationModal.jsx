import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import ConfirmationStructure from "../../../../components/ui/structure/ConfirmationStructure.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  slate: { outerBg: c.slate.outerBg, border: c.slate.border },
});

/**
 * Confirmation dialog of the JEV listing — the same shell the settings and
 * inventory pages use (ModalContainer + ConfirmationStructure), with the
 * style entry resolved by the caller from JEV_CONFIRM_STYLES.
 *
 * `style` is the raw entry (e.g. JEV_CONFIRM_STYLES.create_jev);
 * ConfirmationStructure resolves the light/dark variant itself.
 */
export default function JEVConfirmationModal({
  open,
  style,
  badge,
  loading = false,
  onConfirm,
  onClose,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = getThemeColors(isDark);
  const colors = useColors(base);

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      contentOnly
      disableBackdropClick
      width={{ xs: "90%", sm: 420 }}
    >
      {style && (
        <Box
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: colors.slate.outerBg,
            border: `1px solid ${colors.slate.border}`,
          }}
        >
          <ConfirmationStructure
            style={style}
            voucherNumber={badge}
            loading={loading}
            onConfirm={onConfirm}
            onBack={onClose}
          />
        </Box>
      )}
    </ModalContainer>
  );
}
