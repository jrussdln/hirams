import React, {
  useState,
  useCallback,
  memo,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Box, Typography, Fade, Chip, Divider, useTheme } from "@mui/material";
import {
  CheckCircle,
  PlayArrow,
  PauseCircle,
  Business,
  Badge,
  Receipt,
  LocationOn,
  Phone,
  Person,
  Style,
  VerifiedUser,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import Toast from "../../../../components/ui/banner/Toast.jsx";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const fieldConfig = [
  { label: "Client", key: "name", icon: Business },
  { label: "Nickname", key: "nickname", icon: Badge },
  { label: "TIN", key: "tin", icon: Receipt },
  { label: "Business Style", key: "businessStyle", icon: Style },
  { label: "Address", key: "address", icon: LocationOn },
  { label: "Contact Person", key: "contactPerson", icon: Person },
  { label: "Contact Number", key: "contactNumber", icon: Phone },
];

// Explicit action identifiers — NEVER derive branching logic from display labels.
const ACTIONS = {
  APPROVE: "approve",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
};

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Status chip colors
  pendingBg: c.amber.bg,
  pendingText: c.amber.textDark,
  pendingBorder: c.amber.border,
  activeBg: c.green.bg,
  activeText: c.green.textDark,
  activeBorder: c.green.border,
  inactiveBg: c.slate.mutedBg,
  inactiveText: c.slate.mutedText,
  inactiveBorder: c.slate.mutedBorder,

  // Info card surface
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  borderHover: c.slate.hover,
  divider: c.slate.divider,

  // Icon pill
  iconBg: c.blue.bg,
  iconText: c.blue.text,

  // Text
  labelText: c.gray.textSecondary,
  valueText: c.gray.textPrimary,

  // Action panel
  panelBg: c.slate.mutedBg,
  panelBorder: c.slate.mutedBorder,

  // Input
  inputBg: c.gray.inputBg,
  inputBorder: c.slate.btnBorder,
  inputFocus: c.blue.text,
  errorText: c.red.text,

  // ── Blue profile banner ────────────────────────────────────────────
  bannerGradient: c.blue.banner,
  bannerAvatarBg: c.blue.bannerAvatarBg,
  bannerTextMuted: c.blue.bannerTextMuted,
  textOnFill: c.gray.textOnFill,
  plainBadge: c.badge.plain,
});

function InfoClientModal({
  open,
  handleClose,
  clientData,
  onApprove,
  onActive,
  onInactive,
  onRedirect,
  activeStatusKey,
  inactiveStatusKey,
  forApprovalStatusKey,
  activeStatusLabel,
  inactiveStatusLabel,
  forApprovalStatusLabel,
  isManagement,
}) {
  // ✅ Standardized color wiring
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [confirmLetter, setConfirmLetter] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const errorAlertRef = useRef(null);

  useEffect(() => {
    if (confirmError && errorAlertRef.current) {
      errorAlertRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [confirmError]);

  const handleConfirm = useCallback(
    async (actionType) => {
      if (!clientData?.name) return;

      if (
        confirmLetter.trim().toUpperCase() !== clientData.name[0].toUpperCase()
      ) {
        setConfirmError(uiMessages.common.errorReqChar);
        return;
      }

      const entity = clientData.nickname || clientData.name;

      const actionLabel =
        actionType === ACTIONS.ACTIVATE
          ? "activated"
          : actionType === ACTIONS.DEACTIVATE
            ? "deactivated"
            : "approved";

      const redirectLabel =
        actionType === ACTIONS.DEACTIVATE
          ? inactiveStatusLabel
          : activeStatusLabel;

      setConfirmLetter("");
      setConfirmError("");
      handleClose();

      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        await withSpinner(entity, async () => {
          if (actionType === ACTIONS.ACTIVATE) await onActive?.();
          else if (actionType === ACTIONS.DEACTIVATE) await onInactive?.();
          else if (actionType === ACTIONS.APPROVE) await onApprove?.();
        });

        onRedirect?.(redirectLabel);
        await showSwal("SUCCESS", {}, { entity, action: actionLabel });
      } catch (error) {
        await showSwal("ERROR", {}, { entity });
      }
    },
    [
      clientData,
      confirmLetter,
      onApprove,
      onActive,
      onInactive,
      onRedirect,
      handleClose,
      activeStatusLabel,
      inactiveStatusLabel,
    ],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      const { statusCode } = clientData || {};
      if (statusCode === forApprovalStatusKey) handleConfirm(ACTIONS.APPROVE);
      else if (statusCode === inactiveStatusKey)
        handleConfirm(ACTIONS.ACTIVATE);
      else if (statusCode === activeStatusKey)
        handleConfirm(ACTIONS.DEACTIVATE);
    },
    [
      clientData,
      forApprovalStatusKey,
      inactiveStatusKey,
      activeStatusKey,
      handleConfirm,
    ],
  );

  const statusCode = clientData?.statusCode;

  // ✅ Plain, neutral badge — no status colour. All three states share the
  // same translucent-white treatment so it sits quietly on the blue banner.
  const PLAIN_BADGE = {
    bg: colors.plainBadge.bg,
    color: colors.plainBadge.text,
    border: colors.plainBadge.border,
  };

  const getStatusStyle = (code) => {
    if (code === forApprovalStatusKey)
      return { label: "Pending Approval", ...PLAIN_BADGE };
    if (code === activeStatusKey) return { label: "Active", ...PLAIN_BADGE };
    if (code === inactiveStatusKey)
      return { label: "Inactive", ...PLAIN_BADGE };
    return null;
  };

  const currentStatus = getStatusStyle(statusCode);

  const modalTitle =
    statusCode === forApprovalStatusKey
      ? "Client Approval"
      : statusCode === activeStatusKey
        ? "Client Deactivation"
        : "Client Activation";

  // ✅ Gradient — shared blue banner token, same in both modes
  const headerGradient = colors.bannerGradient;

  return (
    <ModalContainer
      open={open}
      handleClose={() => {
        setConfirmLetter("");
        setConfirmError("");
        handleClose();
      }}
      title={modalTitle}
      subTitle={clientData?.nickname ? `${clientData.nickname}` : ""}
      showSave={false}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* <Toast
          ref={errorAlertRef}
          open={!!confirmError}
          message={confirmError}
          severity="error"
          onClose={() => setConfirmError("")}
        /> */}

        <Fade in timeout={400}>
          <Box>
            {/* Header banner */}
            <Box
              sx={{
                background: headerGradient,
                borderRadius: "12px 12px 0 0",
                px: { xs: 1.5, sm: 2.5 },
                py: { xs: 1.5, sm: 2.5 },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: "10px",
                    bgcolor: colors.bannerAvatarBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Business
                    sx={{
                      color: colors.textOnFill,
                      fontSize: { xs: "1.1rem", sm: "1.4rem" },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: colors.bannerTextMuted,
                      fontSize: { xs: "0.6rem", sm: "0.68rem" },
                      fontWeight: 500,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Client Profile
                  </Typography>
                  <Typography
                    sx={{
                      color: colors.textOnFill,
                      fontWeight: 700,
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                    }}
                  >
                    {clientData?.name || "—"}
                  </Typography>
                </Box>
              </Box>

              {currentStatus && (
                <Chip
                  label={currentStatus.label}
                  size="small"
                  sx={{
                    backgroundColor: currentStatus.bg,
                    color: currentStatus.color,
                    border: `1px solid ${currentStatus.border}`,
                    fontWeight: 600,
                    fontSize: { xs: "0.6rem", sm: "0.7rem" },
                    letterSpacing: "0.3px",
                    height: { xs: 22, sm: 26 },
                  }}
                />
              )}
            </Box>

            {/* Info card — ALL hardcoded → theme tokens */}
            <Box
              sx={{
                border: `1px solid ${colors.border}`,
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                bgcolor: colors.cardBg,
                transition: "background 0.3s ease-in-out",
              }}
            >
              {fieldConfig.map(({ label, key, icon: Icon }, i) => (
                <Box key={label}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      flexDirection: { xs: "column", sm: "row" },
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 1.2, sm: 1.1 },
                      gap: { xs: 0.5, sm: 1.5 },
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: colors.borderHover },
                    }}
                  >
                    {/* Icon + Label */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: { sm: 140 },
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 24, sm: 30 },
                          height: { xs: 24, sm: 30 },
                          borderRadius: "8px",
                          bgcolor: colors.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.3s ease-in-out",
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: { xs: "0.8rem", sm: "0.9rem" },
                            color: colors.iconText,
                            transition: "color 0.3s ease-in-out",
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: { xs: "0.68rem", sm: "0.76rem" },
                          fontWeight: 600,
                          color: colors.labelText,
                          whiteSpace: "nowrap",
                          transition: "color 0.3s ease-in-out",
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>

                    {/* Mobile divider */}
                    <Divider
                      orientation="horizontal"
                      flexItem
                      sx={{
                        display: { xs: "block", sm: "none" },
                        borderColor: colors.divider,
                      }}
                    />

                    {/* Desktop divider */}
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        display: { xs: "none", sm: "block" },
                        mx: 0.5,
                        borderColor: colors.divider,
                      }}
                    />

                    {/* Value */}
                    <Typography
                      sx={{
                        fontSize: { xs: "0.72rem", sm: "0.84rem" },
                        color: colors.valueText,
                        fontStyle: clientData?.[key] ? "normal" : "italic",
                        pl: { xs: 4.5, sm: 0 },
                        wordBreak: "break-word",
                        transition: "color 0.3s ease-in-out",
                      }}
                    >
                      {clientData?.[key] || "—"}
                    </Typography>
                  </Box>

                  {i < fieldConfig.length - 1 && (
                    <Divider
                      sx={{
                        mx: { xs: 1.5, sm: 2 },
                        borderColor: colors.divider,
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Action section */}
        {isManagement && (
          <Fade in timeout={600}>
            <Box
              sx={{
                bgcolor: colors.panelBg,
                border: `1px solid ${colors.panelBorder}`,
                borderRadius: "12px",
                p: 2,
                transition:
                  "background 0.3s ease-in-out, border 0.3s ease-in-out",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: colors.labelText,
                  mb: 0.5,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  transition: "color 0.3s ease-in-out",
                }}
              >
                Confirm Action
              </Typography>

              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    zIndex: 1,
                  }}
                >
                  <VerifiedUser
                    sx={{
                      fontSize: "1rem",
                      color: confirmError ? colors.errorText : colors.labelText,
                      transition: "color 0.3s ease-in-out",
                    }}
                  />
                </Box>

                <input
                  value={confirmLetter}
                  onChange={(e) => {
                    const val = e.target.value.slice(-1);
                    setConfirmLetter(val);
                    setConfirmError("");
                  }}
                  maxLength={1}
                  placeholder={`Type first letter of "${clientData?.name?.[0] || "?"}" to confirm`}
                  style={{
                    width: "100%",
                    padding: "9px 160px 9px 34px",
                    fontSize: "0.82rem",
                    borderRadius: "50px",
                    border: confirmError
                      ? `1.5px solid ${colors.errorText}`
                      : `1.5px solid ${colors.inputBorder}`,
                    outline: "none",
                    background: colors.inputBg,
                    boxSizing: "border-box",
                    transition: "border 0.2s, background 0.3s ease-in-out",
                    color: colors.valueText,
                  }}
                  onFocus={(e) => {
                    if (!confirmError)
                      e.target.style.borderColor = colors.inputFocus;
                  }}
                  onBlur={(e) => {
                    if (!confirmError)
                      e.target.style.borderColor = colors.inputBorder;
                  }}
                  onKeyDown={handleKeyDown}
                />

                <Box
                  sx={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    gap: 0.5,
                  }}
                >
                  {statusCode === forApprovalStatusKey && (
                    <BaseButton
                      label="Approve"
                      onClick={() => handleConfirm(ACTIONS.APPROVE)}
                      icon={<CheckCircle />}
                      size="small"
                      actionColor="approve"
                    />
                  )}
                  {statusCode === inactiveStatusKey && (
                    <BaseButton
                      label="Activate"
                      onClick={() => handleConfirm(ACTIONS.ACTIVATE)}
                      icon={<PlayArrow />}
                      size="small"
                      actionColor="activate"
                    />
                  )}
                  {statusCode === activeStatusKey && (
                    <BaseButton
                      label="Deactivate"
                      onClick={() => handleConfirm(ACTIONS.DEACTIVATE)}
                      icon={<PauseCircle />}
                      size="small"
                      actionColor="deactivate"
                    />
                  )}
                </Box>
              </Box>

              {confirmError && (
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: colors.errorText,
                    mt: 0.5,
                    pl: 1.5,
                  }}
                >
                  {confirmError}
                </Typography>
              )}
            </Box>
          </Fade>
        )}
      </Box>
    </ModalContainer>
  );
}

export default memo(InfoClientModal);
