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
  PlayArrow,
  PauseCircle,
  CheckCircle,
  Business,
  Badge,
  LocationOn,
  ConfirmationNumber,
  VerifiedUser,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import Toast from "../../../../components/ui/banner/Toast.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY the tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  border: c.slate.border,
  divider: c.slate.divider,
  btnBg: c.slate.btnBg,
  btnBorder: c.slate.btnBorder,
  hover: c.slate.hover,
  mutedBg: c.slate.mutedBg,
  mutedBorder: c.slate.mutedBorder,
  mutedText: c.slate.mutedText,
  green: {
    bg: c.green.bg,
    textDark: c.green.textDark,
    border: c.green.border,
  },
  amber: {
    bg: c.amber.bg,
    textDark: c.amber.textDark,
    border: c.amber.border,
  },
  slate: {
    mutedBg: c.slate.mutedBg,
    mutedBorder: c.slate.mutedBorder,
  },
  blue: {
    bg: c.blue.bg,
    text: c.blue.text,
    textStrong: c.blue.textStrong,
  },
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    inputBg: c.gray.inputBg,
  },
  red: {
    text: c.red.textDark || c.red.text,
  },
  // ── Blue profile banner ────────────────────────────────────────────
  bannerGradient: c.blue.banner,
  bannerRing: c.blue.bannerRing,
  bannerRingSoft: c.blue.bannerRingSoft,
  bannerAvatarBg: c.blue.bannerAvatarBg,
  bannerTextMuted: c.blue.bannerTextMuted,
  bannerTextFaint: c.blue.bannerTextFaint,
  textOnFill: c.gray.textOnFill,
  plainBadge: c.badge.plain,
});

const fieldConfig = [
  { label: "Name", key: "name", icon: Business },
  { label: "Nickname", key: "nickname", icon: Badge },
  { label: "Address", key: "address", icon: LocationOn },
  { label: "TIN", key: "tin", icon: ConfirmationNumber },
];

const ACTIONS = {
  APPROVE: "approve",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
};

function InfoAssigneeModal({
  open,
  handleClose,
  assigneeData,
  onActive,
  onInactive,
  onApprove,
  activeStatusKey,
  inactiveStatusKey,
  forApprovalStatusKey,
  activeStatusLabel,
  inactiveStatusLabel,
  forApprovalStatusLabel,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ✅ Standardized color wiring
  const baseColors = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(baseColors), [baseColors]);

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

  // ✅ Plain, neutral badge — no status colour. All three states share the
  // same translucent-white treatment so it sits quietly on the blue banner.
  const PLAIN_BADGE = {
    bg: colors.plainBadge.bg,
    color: colors.plainBadge.text,
    border: colors.plainBadge.border,
  };

  const getStatusStyle = (code) => {
    if (code === activeStatusKey)
      return { label: activeStatusLabel, ...PLAIN_BADGE };
    if (code === inactiveStatusKey)
      return { label: inactiveStatusLabel, ...PLAIN_BADGE };
    if (code === forApprovalStatusKey)
      return { label: forApprovalStatusLabel, ...PLAIN_BADGE };
    return null;
  };

  const statusCode = assigneeData?.statusCode;
  const currentStatus = getStatusStyle(statusCode);
  const modalTitle =
    statusCode === activeStatusKey
      ? "Assignee Deactivation"
      : statusCode === forApprovalStatusKey
        ? "Assignee Approval"
        : "Assignee Activation";

  const handleConfirm = useCallback(
    async (actionType) => {
      if (!assigneeData?.name) return;
      if (confirmLetter.toUpperCase() !== assigneeData.name[0].toUpperCase()) {
        setConfirmError(
          uiMessages.common.errorReqChar ?? "Incorrect confirmation letter.",
        );
        return;
      }

      const entity =
        assigneeData.nickname !== "—"
          ? assigneeData.nickname
          : assigneeData.name;
      const actionWord =
        actionType === ACTIONS.ACTIVATE
          ? "activated"
          : actionType === ACTIONS.APPROVE
            ? "approved"
            : "deactivated";

      setConfirmLetter("");
      setConfirmError("");
      handleClose();

      await new Promise((r) => setTimeout(r, 300));

      try {
        await withSpinner(entity, async () => {
          if (actionType === ACTIONS.ACTIVATE) await onActive?.();
          else if (actionType === ACTIONS.DEACTIVATE) await onInactive?.();
          else if (actionType === ACTIONS.APPROVE) await onApprove?.();
        });
        showSwal("SUCCESS", {}, { entity, action: actionWord });
      } catch {
        showSwal("ERROR", {}, { entity });
      }
    },
    [
      assigneeData,
      confirmLetter,
      onActive,
      onInactive,
      onApprove,
      handleClose,
      colors,
    ],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      const code = assigneeData?.statusCode;
      if (code === inactiveStatusKey) handleConfirm(ACTIONS.ACTIVATE);
      else if (code === activeStatusKey) handleConfirm(ACTIONS.DEACTIVATE);
      else if (code === forApprovalStatusKey) handleConfirm(ACTIONS.APPROVE);
    },
    [
      assigneeData,
      activeStatusKey,
      inactiveStatusKey,
      forApprovalStatusKey,
      handleConfirm,
    ],
  );

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
      subTitle={`${assigneeData?.nickname !== "—" ? (assigneeData?.nickname ?? "") : (assigneeData?.name ?? "")}`}
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
                gap: { xs: 1.2, sm: 2 },
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  width: { xs: 46, sm: 60 },
                  height: { xs: 46, sm: 60 },
                  borderRadius: "50%",
                  bgcolor: colors.bannerAvatarBg,
                  border: `2.5px solid ${isDark ? colors.bannerRingSoft : colors.bannerRing}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Business
                  sx={{
                    color: colors.textOnFill,
                    fontSize: { xs: "1.4rem", sm: "1.8rem" },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: colors.bannerTextMuted,
                    fontSize: { xs: "0.58rem", sm: "0.68rem" },
                    fontWeight: 500,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Assignee Profile
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
                  {assigneeData?.name}
                </Typography>
                {assigneeData?.nickname && assigneeData.nickname !== "—" && (
                  <Typography
                    sx={{
                      color: colors.bannerTextFaint,
                      fontSize: { xs: "0.65rem", sm: "0.72rem" },
                      mt: 0.3,
                    }}
                  >
                    {assigneeData.nickname}
                  </Typography>
                )}
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
                    flexShrink: 0,
                    height: { xs: 22, sm: 26 },
                  }}
                />
              )}
            </Box>

            {/* Info rows */}
            <Box
              sx={{
                border: `1px solid ${colors.border}`,
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                bgcolor: colors.btnBg,
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
                      "&:hover": { bgcolor: colors.hover },
                      transition: "background 0.15s",
                    }}
                  >
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
                          bgcolor: colors.blue.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.3s ease-in-out",
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: { xs: "0.78rem", sm: "0.9rem" },
                            color: colors.blue.text,
                            transition: "color 0.3s ease-in-out",
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: { xs: "0.68rem", sm: "0.76rem" },
                          fontWeight: 600,
                          color: colors.gray.textSecondary,
                          whiteSpace: "nowrap",
                          transition: "color 0.3s ease-in-out",
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>

                    <Divider
                      orientation="horizontal"
                      flexItem
                      sx={{
                        display: { xs: "block", sm: "none" },
                        borderColor: colors.divider,
                      }}
                    />
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        display: { xs: "none", sm: "block" },
                        mx: 0.5,
                        borderColor: colors.divider,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: { xs: "0.72rem", sm: "0.84rem" },
                        color: colors.gray.textPrimary,
                        fontStyle:
                          assigneeData?.[key] && assigneeData[key] !== "—"
                            ? "normal"
                            : "italic",
                        pl: { xs: 4.5, sm: 0 },
                        wordBreak: "break-word",
                        transition: "color 0.3s ease-in-out",
                      }}
                    >
                      {assigneeData?.[key] || "—"}
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

        {/* Confirm action */}
        <Fade in timeout={600}>
          <Box
            sx={{
              bgcolor: colors.mutedBg,
              border: `1px solid ${colors.mutedBorder}`,
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
                color: colors.gray.textSecondary,
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
                    color: confirmError
                      ? colors.red.text
                      : colors.gray.textSecondary,
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
                placeholder={`Type first letter of "${assigneeData?.name?.[0] || "?"}" to confirm`}
                style={{
                  width: "100%",
                  padding: "9px 160px 9px 34px",
                  fontSize: "0.82rem",
                  borderRadius: "50px",
                  border: confirmError
                    ? `1.5px solid ${colors.red.text}`
                    : `1.5px solid ${colors.btnBorder}`,
                  outline: "none",
                  background: colors.gray.inputBg,
                  boxSizing: "border-box",
                  transition: "border 0.2s, background 0.3s ease-in-out",
                  color: colors.gray.textPrimary,
                }}
                onFocus={(e) => {
                  if (!confirmError)
                    e.target.style.borderColor = colors.blue.textStrong;
                }}
                onBlur={(e) => {
                  if (!confirmError)
                    e.target.style.borderColor = colors.btnBorder;
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
                {statusCode === forApprovalStatusKey && (
                  <BaseButton
                    label="Approve"
                    onClick={() => handleConfirm(ACTIONS.APPROVE)}
                    icon={<CheckCircle />}
                    size="small"
                    actionColor="approve"
                  />
                )}
              </Box>
            </Box>

            {confirmError && (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: colors.red.text,
                  mt: 0.5,
                  pl: 1.5,
                }}
              >
                {confirmError}
              </Typography>
            )}
          </Box>
        </Fade>
      </Box>
    </ModalContainer>
  );
}

export default memo(InfoAssigneeModal);
