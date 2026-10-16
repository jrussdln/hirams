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
  Percent,
  AccountBalance,
  VerifiedUser,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import Toast from "../../../../components/ui/banner/Toast.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Status badges
  amberBg: c.amber.bg,
  amberText: c.amber.textDark,
  amberBorder: c.amber.border,
  greenBg: c.green.bg,
  greenText: c.green.textDark,
  greenBorder: c.green.border,
  slateBg: c.slate.mutedBg,
  slateText: c.slate.mutedText,
  slateBorder: c.slate.mutedBorder,
  // The plain, neutral badge that sits on the blue header banner — no status
  // colour, just the translucent-white treatment shared with every other
  // plain badge in the app.
  badgeBg: c.badge.plain.bg,
  badgeText: c.badge.plain.text,
  badgeBorder: c.badge.plain.border,
  // Blue header banner
  banner: c.blue.banner,
  bannerPlate: c.blue.bannerAvatarBg,
  bannerText: c.gray.textOnFill,
  bannerEyebrow: c.blue.bannerTextMuted,
  // Layout & dividers
  slateDivider: c.slate.divider,
  slateBtnBg: c.slate.btnBg,
  slateBtnBorder: c.slate.btnBorder,
  slateHover: c.slate.hover,
  // Icons & labels
  blueIconBg: c.blue.bg,
  blueIconColor: c.blue.text,
  blueFocusBorder: c.blue.text,
  grayTextSecondary: c.gray.textSecondary,
  grayTextPrimary: c.gray.textPrimary,
  grayInputBg: c.gray.inputBg,
  // Errors
  redErrorText: c.red.text,
});

const fieldConfig = [
  { label: "Supplier", key: "supplierName", icon: Business },
  { label: "Nickname", key: "supplierNickName", icon: Badge },
  { label: "TIN", key: "supplierTIN", icon: Receipt },
  { label: "Address", key: "address", icon: LocationOn },
  { label: "VAT", key: "vat", icon: Percent },
  { label: "EWT", key: "ewt", icon: AccountBalance },
];

function InfoSupplierModal({
  open,
  handleClose,
  supplierData,
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
  isFinanceOfficer,
}) {
  // ✅ STANDARD THEME WIRING
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

  // ✅ Plain, neutral badge — no status colour. All three states share the
  // same translucent-white treatment so it sits quietly on the blue banner.
  const PLAIN_BADGE = {
    bg: colors.badgeBg,
    color: colors.badgeText,
    border: colors.badgeBorder,
  };

  const getStatusStyle = (code) => {
    if (code === forApprovalStatusKey)
      return { label: "Pending Approval", ...PLAIN_BADGE };
    if (code === activeStatusKey) return { label: "Active", ...PLAIN_BADGE };
    if (code === inactiveStatusKey)
      return { label: "Inactive", ...PLAIN_BADGE };
    return null;
  };

  const statusCode = supplierData?.statusCode;
  const currentStatus = getStatusStyle(statusCode);

  const handleConfirm = useCallback(
    async (action) => {
      if (!supplierData?.supplierName) return;
      if (
        confirmLetter.trim().toUpperCase() !==
        supplierData.supplierName[0].toUpperCase()
      ) {
        setConfirmError(uiMessages.common.errorReqChar);
        return;
      }

      const entity = supplierData.supplierNickName || supplierData.supplierName;

      const actionWord =
        action === activeStatusLabel
          ? "activated"
          : action === inactiveStatusLabel
            ? "deactivated"
            : "approved";

      setConfirmLetter("");
      setConfirmError("");
      handleClose();

      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        await withSpinner(entity, async () => {
          if (action === activeStatusLabel) await onActive?.();
          else if (action === inactiveStatusLabel) await onInactive?.();
          else if (action === forApprovalStatusLabel) await onApprove?.();
        });

        showSwal("SUCCESS", {}, { entity, action: actionWord });

        if (action === forApprovalStatusLabel) onRedirect?.(activeStatusLabel);
        else onRedirect?.(action);
      } catch (error) {
        showSwal("ERROR", {}, { entity });
      }
    },
    [
      supplierData,
      confirmLetter,
      onApprove,
      onActive,
      onInactive,
      onRedirect,
      handleClose,
      activeStatusLabel,
      inactiveStatusLabel,
      forApprovalStatusLabel,
    ],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      const { statusCode } = supplierData || {};
      if (statusCode === forApprovalStatusKey)
        handleConfirm(forApprovalStatusLabel);
      else if (statusCode === inactiveStatusKey)
        handleConfirm(activeStatusLabel);
      else if (statusCode === activeStatusKey)
        handleConfirm(inactiveStatusLabel);
    },
    [
      supplierData,
      forApprovalStatusKey,
      inactiveStatusKey,
      activeStatusKey,
      forApprovalStatusLabel,
      activeStatusLabel,
      inactiveStatusLabel,
      handleConfirm,
    ],
  );

  const modalTitle =
    statusCode === forApprovalStatusKey
      ? "Supplier Approval"
      : statusCode === activeStatusKey
        ? "Supplier Deactivation"
        : "Supplier Activation";

    // Header banner - ONE token. Both branches were byte-identical, so the
  // mode split bought nothing.
  const headerGradient = colors.banner;

  return (
    <ModalContainer
      open={open}
      handleClose={() => {
        setConfirmLetter("");
        setConfirmError("");
        handleClose();
      }}
      title={modalTitle}
      subTitle={
        supplierData?.supplierNickName ? `${supplierData.supplierNickName}` : ""
      }
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
            {/* Header banner — ALL sizes/structure preserved */}
            <Box
              sx={{
                background: headerGradient,
                borderRadius: "12px 12px 0 0",
                px: { xs: 1.5, sm: 2.5 },
                py: { xs: 1.5, sm: 2.5 },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
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
                    bgcolor: colors.bannerPlate,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Business
                    sx={{
                      color: colors.bannerText,
                      fontSize: { xs: "1.1rem", sm: "1.4rem" },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: colors.bannerEyebrow,
                      fontSize: { xs: "0.6rem", sm: "0.7rem" },
                      fontWeight: 500,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Supplier Profile
                  </Typography>

                  <Typography
                    sx={{
                      color: colors.bannerText,
                      fontWeight: 700,
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                    }}
                  >
                    {supplierData?.supplierName || "—"}
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

            {/* Info rows — ALL sizes/structure preserved, colors from local map */}
            <Box
              sx={{
                border: `1px solid ${colors.slateBorder}`,
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                overflow: "hidden",
                bgcolor: colors.slateBtnBg,
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
                      "&:hover": { bgcolor: colors.slateHover },
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
                          width: { xs: 26, sm: 32 },
                          height: { xs: 26, sm: 32 },
                          borderRadius: "8px",
                          bgcolor: colors.blueIconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.3s ease-in-out",
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: { xs: "0.8rem", sm: "0.95rem" },
                            color: colors.blueIconColor,
                            transition: "color 0.3s ease-in-out",
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: { xs: "0.7rem", sm: "0.78rem" },
                          fontWeight: 600,
                          color: colors.grayTextSecondary,
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
                        borderColor: colors.slateDivider,
                      }}
                    />

                    {/* Desktop divider */}
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        display: { xs: "none", sm: "block" },
                        mx: 0.5,
                        borderColor: colors.slateDivider,
                      }}
                    />

                    {/* Value */}
                    <Typography
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.85rem" },
                        color: colors.grayTextPrimary,
                        fontStyle: supplierData?.[key] ? "normal" : "italic",
                        pl: { xs: 4.5, sm: 0 },
                        wordBreak: "break-word",
                        transition: "color 0.3s ease-in-out",
                      }}
                    >
                      {supplierData?.[key] || "—"}
                    </Typography>
                  </Box>

                  {i < fieldConfig.length - 1 && (
                    <Divider
                      sx={{
                        mx: { xs: 1.5, sm: 2 },
                        borderColor: colors.slateDivider,
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Action section */}
        {(isManagement || isFinanceOfficer) && (
          <Fade in timeout={600}>
            <Box
              sx={{
                bgcolor: colors.slateBg,
                border: `1px solid ${colors.slateBorder}`,
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
                  color: colors.grayTextSecondary,
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
                        ? colors.redErrorText
                        : colors.grayTextSecondary,
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
                  placeholder={`Type first letter of "${supplierData?.supplierName?.[0] || "?"}" to confirm`}
                  style={{
                    width: "100%",
                    padding: "9px 160px 9px 34px",
                    fontSize: "0.82rem",
                    borderRadius: "50px",
                    border: confirmError
                      ? `1.5px solid ${colors.redErrorText}`
                      : `1.5px solid ${colors.slateBtnBorder}`,
                    outline: "none",
                    background: colors.grayInputBg,
                    boxSizing: "border-box",
                    transition: "border 0.2s, background 0.3s ease-in-out",
                    color: colors.grayTextPrimary,
                  }}
                  onFocus={(e) => {
                    if (!confirmError)
                      e.target.style.borderColor = colors.blueFocusBorder;
                  }}
                  onBlur={(e) => {
                    if (!confirmError)
                      e.target.style.borderColor = colors.slateBtnBorder;
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
                      onClick={() => handleConfirm(forApprovalStatusLabel)}
                      icon={<CheckCircle />}
                      size="small"
                      actionColor="approve"
                    />
                  )}
                  {statusCode === inactiveStatusKey && (
                    <BaseButton
                      label="Activate"
                      onClick={() => handleConfirm(activeStatusLabel)}
                      icon={<PlayArrow />}
                      size="small"
                      actionColor="activate"
                    />
                  )}
                  {statusCode === activeStatusKey && (
                    <BaseButton
                      label="Deactivate"
                      onClick={() => handleConfirm(inactiveStatusLabel)}
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
                    color: colors.redErrorText,
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

export default memo(InfoSupplierModal);
