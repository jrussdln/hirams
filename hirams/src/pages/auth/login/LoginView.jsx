import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Link, useTheme } from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AccountCircle,
  Lock,
} from "@mui/icons-material";
import BaseButton from "../../../components/ui/form/BaseButton";
import AuthLayout from "../../../components/ui/auth/AuthLayout";
import AuthTextField from "../../../components/ui/auth/AuthTextField";
import AuthAlert from "../../../components/ui/auth/AuthAlert";
import PrivacyBanner from "../../../components/ui/auth/PrivacyBanner";
import DotSpinner from "../../../components/ui/loader/DotSpinner";
import getThemeColors from "../../../utils/style/getThemeColors";
import uiMessages from "../../../utils/helpers/uiMessages.js";
import { getItem, setItem } from "../../../utils/storage/localStorage.js";
import { DATA_PRIVACY_ENABLED } from "../../../constants/dataPrivacyText";

// ── Component-specific color map: ONLY tokens this component uses ──
const useColors = (c) => ({
  textSecondary: c.gray.textSecondary,
  iconMuted: c.gray.textDisabled,
  linkPrimary: c.blue.text,
});

export default function LoginView({
  formData,
  loading,
  showPassword,
  setShowPassword,
  statusMessage,
  statusTone,
  sessionExpired,
  fieldErrors,
  focusRequest,
  handleChange,
  handleLogin,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const usernameRef = React.useRef(null);
  const passwordRef = React.useRef(null);

  // ── Privacy consent ───────────────────────────────────────────────────
  // Controlled by DATA_PRIVACY_ENABLED in dataPrivacyText.js.
  //   true  → the consent banner gates the form: Login stays disabled (and
  //           Enter does nothing) until the box is ticked and "I Understand"
  //           is pressed. The tick is remembered, so the banner is a
  //           first-visit-only thing.
  //   false → no banner, no gate: consent starts as given and Login works
  //           straight away.
  const [privacyAccepted, setPrivacyAccepted] = React.useState(
    () => !DATA_PRIVACY_ENABLED || getItem("privacyAccepted") === true,
  );

  const acceptPrivacy = () => {
    setItem("privacyAccepted", true);
    setPrivacyAccepted(true);
    // The banner is gone — hand the keyboard back to the form.
    usernameRef.current?.focus();
  };

  // A real <form> submit: Enter works natively from either input and password
  // managers get an actual submit event (the old onKeyDown-per-field trick
  // gave them neither).
  const submit = (e) => {
    e.preventDefault();
    if (!loading && privacyAccepted) handleLogin();
  };

  // A failed submit drops the caret back into the field to fix, so nobody has
  // to Tab around hunting for what turned red.
  React.useEffect(() => {
    const field =
      focusRequest?.field ??
      (fieldErrors.username
        ? "username"
        : fieldErrors.password
          ? "password"
          : null);
    if (!field) return;
    (field === "password" ? passwordRef : usernameRef).current?.focus();
  }, [focusRequest, fieldErrors]);

  // Shared hover/focus treatment — the links used to give no feedback at all.
  // Padding is the tap target: bare 0.75rem text links are far under 44px on a
  // phone.
  const linkSx = {
    fontSize: { xs: "0.75rem", sm: "0.85rem" },
    textDecoration: "none",
    py: 0.75,
    px: 0.5,
    mx: -0.5,
    lineHeight: 1.4,
    verticalAlign: "middle",
    transition: "color 0.15s ease",
    "&:hover": { color: colors.linkPrimary, textDecoration: "underline" },
    "&:focus-visible": {
      outline: `2px solid ${colors.linkPrimary}`,
      outlineOffset: 2,
      borderRadius: 0.5,
    },
    // Locked while a login request is running.
    "&:disabled": {
      color: colors.textSecondary,
      textDecoration: "none",
      cursor: "not-allowed",
    },
  };

  return (
    <>
      <AuthLayout title="LOGIN">
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 400, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            Welcome Back!
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Please login to access your account.
          </Typography>
        </Box>

        <Box component="form" onSubmit={submit} noValidate autoComplete="on">
          {/* Why the user is staring at this form again */}
          <AuthAlert
            tone="info"
            message={sessionExpired ? uiMessages.common.sessionExpired : ""}
            sx={{ mb: 1.5 }}
          />

          <AuthAlert tone={statusTone} message={statusMessage} sx={{ mb: 2 }} />

          <AuthTextField
            label="User Name"
            name="strUserName"
            value={formData.strUserName}
            onChange={handleChange}
            autoFocus
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="none"
            inputRef={usernameRef}
            startIcon={<AccountCircle sx={{ color: colors.iconMuted }} />}
            error={!!fieldErrors.username}
            helperText={fieldErrors.username || ""}
            sx={{ mb: 2 }}
            inputProps={{ style: { fontSize: theme.typography.body2.fontSize } }}
          />

          <AuthTextField
            label="Password"
            name="strPassword"
            type={showPassword ? "text" : "password"}
            value={formData.strPassword}
            onChange={handleChange}
            autoComplete="current-password"
            inputRef={passwordRef}
            startIcon={<Lock sx={{ color: colors.iconMuted }} />}
            // Eye follows the app-wide convention (FormGrid): eye-off while the
            // password is hidden, eye while it is visible.
            endIcon={showPassword ? <Visibility /> : <VisibilityOff />}
            onEndIconClick={() => setShowPassword((prev) => !prev)}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password || ""}
            sx={{ mb: 0.5 }}
            inputProps={{ style: { fontSize: theme.typography.body2.fontSize } }}
          />

          {/* Recovery sits with the field it belongs to, not across the card */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Link
              component="button"
              type="button"
              disabled={loading}
              onClick={() => navigate("/forgotPassword")}
              sx={linkSx}
            >
              Forgot password?
            </Link>
          </Box>

          <BaseButton
            type="submit"
            label={loading ? <DotSpinner size={8} /> : "Login"}
            // Consent gates the form (only while DATA_PRIVACY_ENABLED is true).
            disabled={loading || !privacyAccepted}
            sx={{ width: "100%", py: { xs: 1.2, sm: 1.5 }, mb: 1 }}
            actionColor="login"
          />
        </Box>

        {/* Secondary path, kept out of the primary flow */}
        <Typography
          variant="body2"
          sx={{
            textAlign: "center",
            color: colors.textSecondary,
            fontSize: { xs: "0.75rem", sm: "0.8rem" },
          }}
        >
          Don't have an account?{" "}
          <Link
            component="button"
            type="button"
            disabled={loading}
            onClick={() => navigate("/register")}
            sx={linkSx}
          >
            Register Account
          </Link>
        </Typography>
      </AuthLayout>

      {/* Consent sheet over the lower 60% of the screen until consent is
          given. It lives outside the card so the card's overflow:hidden can
          never clip the fixed sheet. Hidden entirely when the flag is off. */}
      {DATA_PRIVACY_ENABLED && !privacyAccepted && (
        <PrivacyBanner onAgree={acceptPrivacy} />
      )}
    </>
  );
}