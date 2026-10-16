import React, {
  useState,
  useCallback,
  memo,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  Box,
  Typography,
  Fade,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import {
  PlayArrow,
  PauseCircle,
  CheckCircle,
  Person,
  Badge,
  AlternateEmail,
  AccountCircle,
  Wc,
  WorkOutline,
  VerifiedUser,
  Phone,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import Toast from "../../../../components/ui/banner/Toast.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import MediaRoute from "../../../../routes/MediaRoute.jsx";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Status badges
  amber: {
    bg: c.amber.bg,
    textDark: c.amber.textDark,
    border: c.amber.border,
  },
  green: {
    bg: c.green.bg,
    textDark: c.green.textDark,
    paid: c.green.paid,
  },
  red: {
    text: c.red.text,
  },
  blue: {
    bg: c.blue.bg,
    text: c.blue.text,
  },
  slate: {
    border: c.slate.border,
    divider: c.slate.divider,
    btnBg: c.slate.btnBg,
    btnBorder: c.slate.btnBorder,
    hover: c.slate.hover,
    mutedBg: c.slate.mutedBg,
    mutedText: c.slate.mutedText,
    mutedBorder: c.slate.mutedBorder,
  },
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    inputBg: c.gray.inputBg,
  },
  // ── Blue profile banner ────────────────────────────────────────────
  bannerGradient: c.blue.banner,
  bannerRing: c.blue.bannerRing,
  bannerShadow: c.blue.bannerShadow,
  bannerTextMuted: c.blue.bannerTextMuted,
  bannerTextFaint: c.blue.bannerTextFaint,
  textOnFill: c.gray.textOnFill,
  plainBadge: c.badge.plain,
});

const fieldConfig = [
  { label: "Name", key: "fullName", icon: Person },
  { label: "Nickname", key: "nickname", icon: Badge },
  { label: "Username", key: "username", icon: AccountCircle },
  { label: "Email", key: "email", icon: AlternateEmail },
  { label: "Phone No.", key: "phoneNumber", icon: Phone },
  { label: "User Type", key: "type", icon: WorkOutline },
  { label: "Sex", key: "sex", icon: Wc },
];

// Explicit action identifiers — NEVER derive branching logic from display labels.
const ACTIONS = {
  APPROVE: "approve",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
};

function InfoUserModal({
  open,
  handleClose,
  userData,
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
  femaleKey,
  maleKey,
  userTypes,
}) {
  // ─────────────── PROPER THEME WIRING ───────────────
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  // ────────────────────────────────────────────────────

  const [confirmLetter, setConfirmLetter] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("");
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
      if (!userData?.firstName) return;

      if (confirmLetter.toUpperCase() !== userData.firstName[0].toUpperCase()) {
        setConfirmError(uiMessages.common.errorReqChar);
        return;
      }

      if (actionType === ACTIONS.APPROVE && !selectedUserType) {
        setConfirmError(uiMessages.common.errorUserType);
        return;
      }

      const entity = userData.nickname || userData.firstName;

      const actionWord =
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
      setSelectedUserType("");
      setConfirmError("");
      handleClose();

      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        await withSpinner(entity, async () => {
          if (actionType === ACTIONS.ACTIVATE) await onActive?.();
          else if (actionType === ACTIONS.DEACTIVATE) await onInactive?.();
          else if (actionType === ACTIONS.APPROVE)
            await onApprove?.(selectedUserType);
        });

        showSwal("SUCCESS", {}, { entity, action: actionWord });
        onRedirect?.(redirectLabel);
      } catch (error) {
        showSwal("ERROR", {}, { entity });
      }
    },
    [
      userData,
      confirmLetter,
      selectedUserType,
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
      const { statusCode } = userData || {};
      if (statusCode === forApprovalStatusKey) handleConfirm(ACTIONS.APPROVE);
      else if (statusCode === inactiveStatusKey)
        handleConfirm(ACTIONS.ACTIVATE);
      else if (statusCode === activeStatusKey)
        handleConfirm(ACTIONS.DEACTIVATE);
    },
    [
      userData,
      forApprovalStatusKey,
      inactiveStatusKey,
      activeStatusKey,
      handleConfirm,
    ],
  );

  const profileImage = MediaRoute.resolveProfileImage(userData);
  // bIsActive === 0 → currently online (matches useUser.js)
  const isOnline = Number(userData?.bIsActive) === 0;

  const showActiveDot = userData?.statusCode === activeStatusKey && isOnline;

  const getActiveText = (user) => {
    // Online → no time
    if (Number(user?.bIsActive) === 0) return "Online";

    // Offline → show last seen
    if (!user?.dtLoggedIn) return "Offline";

    const lastSeen = new Date(user.dtLoggedIn);
    if (isNaN(lastSeen)) return "Offline";

    const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Active just now";
    if (mins < 60) return `Active ${mins} min${mins === 1 ? "" : "s"} ago`;
    if (hours < 24) return `Active ${hours} hr${hours === 1 ? "" : "s"} ago`;
    return `Active ${days} day${days === 1 ? "" : "s"} ago`;
  };

  const statusCode = userData?.statusCode;

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
      ? "User Approval"
      : statusCode === activeStatusKey
        ? "User Deactivation"
        : "User Activation";

  // Header gradient — shared blue banner token
  const headerGradient = colors.bannerGradient;

  return (
    <ModalContainer
      open={open}
      handleClose={() => {
        setConfirmLetter("");
        setSelectedUserType("");
        setConfirmError("");
        handleClose();
      }}
      title={modalTitle}
      subTitle={`${userData?.nickname || ""}`}
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
            {/* Header banner with avatar */}
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
              {/* Avatar */}
              <Box sx={{ position: "relative", flexShrink: 0 }}>
                <Box
                  sx={{
                    width: { xs: 46, sm: 60 },
                    height: { xs: 46, sm: 60 },
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2.5px solid ${colors.bannerRing}`,
                    boxShadow: `0 4px 12px ${colors.bannerShadow}`,
                  }}
                >
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>

                {showActiveDot && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: { xs: 11, sm: 14 },
                      height: { xs: 11, sm: 14 },
                      borderRadius: "50%",
                      backgroundColor: colors.green.paid,
                      border: `2px solid ${colors.slate.btnBg}`,
                    }}
                  />
                )}
              </Box>

              {/* Name + active text */}
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
                  User Profile
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
                  {userData?.lastName}, {userData?.firstName}{" "}
                  {userData?.middleName}
                </Typography>

                <Typography
                  sx={{
                    color: colors.bannerTextFaint,
                    fontSize: { xs: "0.65rem", sm: "0.72rem" },
                    mt: 0.3,
                  }}
                >
                  {getActiveText(userData)}
                </Typography>
              </Box>

              {/* Status chip */}
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
                border: `1px solid ${colors.slate.border}`,
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                bgcolor: colors.slate.btnBg,
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
                      "&:hover": { bgcolor: colors.slate.hover },
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

                    {/* Divider mobile */}
                    <Divider
                      orientation="horizontal"
                      flexItem
                      sx={{
                        display: { xs: "block", sm: "none" },
                        borderColor: colors.slate.divider,
                      }}
                    />

                    {/* Divider desktop */}
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        display: { xs: "none", sm: "block" },
                        mx: 0.5,
                        borderColor: colors.slate.divider,
                      }}
                    />

                    {/* Value */}
                    <Typography
                      sx={{
                        fontSize: { xs: "0.72rem", sm: "0.84rem" },
                        color: colors.gray.textPrimary,
                        fontStyle: userData?.[key] ? "normal" : "italic",
                        pl: { xs: 4.5, sm: 0 },
                        wordBreak: "break-word",
                        transition: "color 0.3s ease-in-out",
                      }}
                    >
                      {userData?.[key] || "—"}
                    </Typography>
                  </Box>

                  {i < fieldConfig.length - 1 && (
                    <Divider
                      sx={{
                        mx: { xs: 1.5, sm: 2 },
                        borderColor: colors.slate.divider,
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Pending — user type selector */}
        {statusCode === forApprovalStatusKey && (
          <Fade in timeout={500}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: colors.gray.textSecondary }}>
                Select User Type
              </InputLabel>
              <Select
                value={selectedUserType}
                onChange={(e) => setSelectedUserType(e.target.value)}
                label="Select User Type"
                sx={{
                  borderRadius: "8px",
                  bgcolor: colors.gray.inputBg,
                  color: colors.gray.textPrimary,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: colors.slate.btnBorder,
                  },
                }}
              >
                {Object.entries(userTypes || {}).map(([k, label]) => (
                  <MenuItem
                    key={k}
                    value={k}
                    sx={{ color: colors.gray.textPrimary }}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Fade>
        )}

        {/* Action section */}
        <Fade in timeout={600}>
          <Box
            sx={{
              bgcolor: colors.slate.mutedBg,
              border: `1px solid ${colors.slate.border}`,
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
              {/* Left icon */}
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

              {/* Full width input */}
              <input
                value={confirmLetter}
                onChange={(e) => {
                  const val = e.target.value.slice(-1);
                  setConfirmLetter(val);
                  setConfirmError("");
                }}
                maxLength={1}
                placeholder={`Type first letter of "${userData?.firstName?.[0] || "?"}" to confirm`}
                style={{
                  width: "100%",
                  padding: "9px 160px 9px 34px",
                  fontSize: "0.82rem",
                  borderRadius: "50px",
                  border: confirmError
                    ? `1.5px solid ${colors.red.text}`
                    : `1.5px solid ${colors.slate.btnBorder}`,
                  outline: "none",
                  background: colors.gray.inputBg,
                  boxSizing: "border-box",
                  transition: "border 0.2s, background 0.3s ease-in-out",
                  color: colors.gray.textPrimary,
                }}
                onFocus={(e) => {
                  if (!confirmError)
                    e.target.style.borderColor = colors.blue.text;
                }}
                onBlur={(e) => {
                  if (!confirmError)
                    e.target.style.borderColor = colors.slate.btnBorder;
                }}
                onKeyDown={handleKeyDown}
              />

              {/* Button overlaying right side */}
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

export default memo(InfoUserModal);
