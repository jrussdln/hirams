import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  LockReset,
  CheckCircleOutline,
  ErrorOutline,
  AccessTime,
  Lock,
  ArrowBack,
  AccountCircle,
} from "@mui/icons-material";
import AuthLayout from "../../../components/ui/auth/AuthLayout";
import AuthTextField from "../../../components/ui/auth/AuthTextField";
import AuthAlert from "../../../components/ui/auth/AuthAlert";
import BaseButton from "../../../components/ui/form/BaseButton";
import DotSpinner from "../../../components/ui/loader/DotSpinner";
import getThemeColors from "../../../utils/style/getThemeColors";

// ── Component-specific color map: ONLY tokens this component uses ──
const useColors = (c) => ({
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  iconMuted: c.gray.textDisabled,
  textReadOnly: c.gray.textDisabled,
  errorIcon: c.red.text,
  successIcon: c.green.text,
  amber: {
    bg: c.amber.bg,
    border: c.amber.border,
    borderStrong: c.amber.borderStrong,
    text: c.amber.warnText,
    icon: c.amber.value,
  },
});

export default function ResetPasswordView({
  navigate,
  usernameFromLink,
  formData,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  loading,
  validating,
  tokenValid,
  statusMessage,
  isError,
  fieldErrors,
  success,
  handleChange,
  handleSubmit,
}) {
  // ✅ Standard wiring — exact pattern from your docs
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  // ── Validating state ──────────────────────────────────────────────
  if (validating) {
    return (
      <AuthLayout title="PASSWORD RESET">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 4,
            gap: 2,
          }}
        >
          <DotSpinner size={10} />
          <Typography
            variant="body2"
            sx={{ color: colors.textSecondary, fontSize: "0.875rem" }}
          >
            Verifying your reset link…
          </Typography>
        </Box>
      </AuthLayout>
    );
  }

  // ── Invalid / expired token ────────────────────────────────────────
  if (!tokenValid) {
    return (
      <AuthLayout title="PASSWORD RESET">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            py: 2,
            gap: 2,
          }}
        >
          <ErrorOutline
            sx={{ fontSize: { xs: 48, sm: 64 }, color: colors.errorIcon }}
          />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, fontSize: { xs: "0.95rem", sm: "1.1rem" } }}
          >
            Link Invalid or Expired
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            This password reset link is no longer valid. It may have already
            been used or has expired — links are only valid for{" "}
            <strong>60 minutes</strong>.
          </Typography>
          <BaseButton
            label="Request a New Link"
            onClick={() => navigate("/forgotPassword")}
            icon={<LockReset fontSize="small" />}
            actionColor="reset"
            sx={{ mt: 1 }}
          />
        </Box>
      </AuthLayout>
    );
  }

  // ── Success ────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout title="PASSWORD RESET">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            py: 2,
            gap: 2,
          }}
        >
          <CheckCircleOutline
            sx={{ fontSize: { xs: 48, sm: 64 }, color: colors.successIcon }}
          />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 500, fontSize: { xs: "0.95rem", sm: "1.1rem" } }}
          >
            Password Updated!
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            Your password has been reset successfully. Redirecting you to the
            login page…
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: colors.textDisabled, fontSize: "0.7rem" }}
          >
            You will be redirected in a few seconds.
          </Typography>
          <DotSpinner size={8} />
        </Box>
      </AuthLayout>
    );
  }

  // ── Main reset form ────────────────────────────────────────────────
  // A real <form> submit — Enter works from either password field.
  const submit = (e) => {
    e.preventDefault();
    if (!loading) handleSubmit();
  };

  return (
    <AuthLayout title="RESET PASSWORD">
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 400, fontSize: { xs: "1rem", sm: "1.25rem" } }}
        >
          Choose a new password
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: colors.textSecondary,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            lineHeight: 1.5,
          }}
        >
          Hi <strong>{usernameFromLink}</strong>, enter a new secure password
          for your HiRAMS account below.
        </Typography>
      </Box>

      {/* Expiry notice — amber warning banner from palette */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          bgcolor: colors.amber.bg,
          border: `1px solid ${colors.amber.border}`,
          borderLeft: `4px solid ${colors.amber.borderStrong}`,
          borderRadius: 1,
          px: 1.5,
          py: 1,
          mb: 2,
        }}
      >
        <AccessTime
          sx={{
            fontSize: 15,
            color: colors.amber.icon,
            mt: 0.2,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: colors.amber.text,
            lineHeight: 1.6,
          }}
        >
          This link will expire in <strong>60 minutes</strong>. If you did not
          request a password reset, you can safely ignore this page.
        </Typography>
      </Box>

      <Box component="form" onSubmit={submit} noValidate>
        <AuthAlert tone={isError ? "error" : "info"} message={statusMessage} />

        {/* Username read-only */}
        <AuthTextField
          label="Username"
          name="username"
          value={usernameFromLink}
          autoComplete="username"
          startIcon={<AccountCircle sx={{ color: colors.iconMuted }} />}
          sx={{ mb: 2 }}
          inputProps={{
            readOnly: true,
            style: {
              fontSize: theme.typography.body2.fontSize,
              color: colors.textReadOnly,
              cursor: "not-allowed",
            },
          }}
        />

        {/* New password */}
        <AuthTextField
          label="New Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          startIcon={<Lock sx={{ color: colors.iconMuted }} />}
          endIcon={showPassword ? <Visibility /> : <VisibilityOff />}
          onEndIconClick={() => setShowPassword((p) => !p)}
          error={!!fieldErrors.password}
          helperText={fieldErrors.password || ""}
          sx={{ mb: 2 }}
          inputProps={{ style: { fontSize: theme.typography.body2.fontSize } }}
        />

        {/* Confirm password */}
        <AuthTextField
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          startIcon={<Lock sx={{ color: colors.iconMuted }} />}
          endIcon={showConfirm ? <Visibility /> : <VisibilityOff />}
          onEndIconClick={() => setShowConfirm((p) => !p)}
          error={!!fieldErrors.confirmPassword}
          helperText={fieldErrors.confirmPassword || ""}
          sx={{ mb: 3 }}
          inputProps={{ style: { fontSize: theme.typography.body2.fontSize } }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <BaseButton
            label="Login"
            type="button"
            variant="outlined"
            onClick={() => navigate("/")}
            icon={<ArrowBack fontSize="small" />}
            actionColor="back"
            disabled={loading}
          />
          <BaseButton
            label="Reset Password"
            type="submit"
            disabled={loading}
            icon={!loading && <LockReset fontSize="small" />}
            actionColor="reset"
          />
        </Box>
      </Box>
    </AuthLayout>
  );
}
