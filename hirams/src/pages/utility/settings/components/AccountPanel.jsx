import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Badge,
  AlternateEmail,
  AccountCircle,
  Wc,
  CheckCircle,
  EditRounded,
  ManageAccountsOutlined,
} from "@mui/icons-material";
import uiMessages from "../../../../utils/helpers/uiMessages.js";
import useKeysLabels from "../../../../hooks/useKeysLabels.js";
import UserAPI from "../../../../api/endpoints/user.api.js";
import AuthAPI from "../../../../api/endpoints/auth.api.js";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import MediaRoute from "../../../../routes/MediaRoute.jsx";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import { getItem, setItem } from "../../../../utils/storage/localStorage.js";
import {
  validatePassword,
  validateConfirmPassword,
} from "../../../../utils/formatters/formatter.js";
import SettingsConfirmationModal from "../modal/SettingsConfirmationModal.jsx";
import AccountPanelSkeleton from "./AccountPanelSkeleton.jsx";
import { SETTINGS_CONFIRM_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ─── THEME COLORS — neutral only (same tokens the Storage Manager uses) ────
const useColors = (c) => ({
  cardBg: c.account.cardBg,
  cardBorder: c.account.cardBorder,
  rowHover: c.account.rowHover,
  iconBoxBg: c.account.iconBoxBg,
  textPrimary: c.account.textPrimary,
  textSecondary: c.account.textSecondary,
  textMuted: c.account.textMuted,
  divider: c.account.divider,

  // success state (password updated)
  successBg: c.account.successBg,
  successBorder: c.account.successBorder,
  successText: c.account.successText,
  successTextBold: c.account.successTextBold,
  statusActiveText: c.account.statusActiveText,

  // error
  errorRed: c.red.alertText,
  errorRedGlow: c.account.errorRedGlow,

  // avatar edit button
  editBtnBg: c.account.editBtnBg,
  editBtnBorder: c.account.editBtnBorder,
  editBtnHoverBg: c.account.editBtnHoverBg,

  textInverse: c.gray.textOnFill,
  shadowChip: c.shadow.chip,
});

// ── Constants ────────────────────────────────────────────────────────────────

const FIELD_CONFIG = [
  { label: "Nickname", key: "nickname", icon: Badge },
  { label: "Username", key: "username", icon: AccountCircle },
  { label: "Phone Number", key: "phoneNumber", icon: PhoneIphoneOutlined },
  { label: "Email", key: "email", icon: AlternateEmail },
  { label: "Sex", key: "sex", icon: Wc },
];

const VERIFY_FIELDS = [
  { label: "Current Password", name: "currentPw", type: "password", xs: 12 },
];

const STATUS_LABELS = { V: "Pending", A: "Active", I: "Inactive" };

const INITIAL_VERIFY = { currentPw: "" };
const INITIAL_PW_DATA = { newPw: "", confirmPw: "" };

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Merges updates into the "user" object stored in localStorage and dispatches
 * a synthetic "storage" event so same-tab listeners (e.g. Header, SidebarProfile)
 * pick up the change immediately.
 */
const syncLocalStorage = (updates = {}) => {
  try {
    const parsed = getItem("user", {});
    setItem("user", { ...parsed, ...updates });
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.warn("Failed to sync localStorage user:", err);
  }
};

/**
 * Maps the raw API / localStorage user record to the panel's display shape.
 */
const buildPanelUser = (raw, userTypes, defaultUserType, sexMap) => ({
  ...raw,
  firstName: raw.strFName || "",
  middleName: raw.strMName || "",
  lastName: raw.strLName || "",
  fullName:
    [raw.strFName, raw.strMName, raw.strLName].filter(Boolean).join(" ") ||
    "No Name",
  nickname: raw.strNickName || "",
  username: raw.strUserName || "",
  phoneNumber: raw.strPhoneNo || "",
  email: raw.strEmail || "",
  type: userTypes?.[raw.cUserType] ?? defaultUserType?.[raw.cUserType] ?? "",
  sex: sexMap?.[raw.cSex] || raw.cSex || "",
  statusCode: raw.cStatus,
});

/**
 * bIsActive === 0 → currently online (no time shown)
 * bIsActive === 1 → offline, show "Active X ago" from last login
 */
const getActiveText = (user) => {
  if (Number(user?.bIsActive) === 0) return "Online";
  if (!user?.dtLoggedIn) return "Inactive";

  const lastSeen = new Date(user.dtLoggedIn);
  if (isNaN(lastSeen)) return "Inactive";

  const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "Active just now";
  if (mins < 60) return `Active ${mins} min${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `Active ${hours} hr${hours === 1 ? "" : "s"} ago`;
  return `Active ${days} day${days === 1 ? "" : "s"} ago`;
};

// ── Small presentational piece ───────────────────────────────────────────────
function SectionLabel({ children, colors, sx }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.textMuted,
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

function AccountPanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));

  const { userTypes, defaultUserType, sex: sexMap } = useKeysLabels();

  // Seeded from the localStorage "user" copy — instant render on revisit;
  // the fetch below silently refreshes it.
  const storedUser = getItem("user", null);
  const [user, setUser] = useState(() =>
    storedUser
      ? buildPanelUser(storedUser, userTypes, defaultUserType, sexMap)
      : null,
  );
  const [loading, setLoading] = useState(!storedUser);
  const [pwStep, setPwStep] = useState("idle");

  // Verify step
  const [verifyData, setVerifyData] = useState(INITIAL_VERIFY);
  const [verifyErrors, setVerifyErrors] = useState({});
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Change step
  const [pwData, setPwData] = useState(INITIAL_PW_DATA);
  const [pwErrors, setPwErrors] = useState({});
  const [changeLoading, setChangeLoading] = useState(false);

  // Profile image
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [imageError, setImageError] = useState(null);
  // "save_profile" | "save_photo" | "update_password" while its dialog is open
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Fetch user on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const nUserId = getItem("userId");
    if (!nUserId) return;

    let cancelled = false;

    const fetchUser = async () => {
      if (!user) setLoading(true);
      try {
        const data = await UserAPI.getById(nUserId);
        const raw = data?.user ?? {};

        if (!cancelled) {
          setUser(buildPanelUser(raw, userTypes, defaultUserType, sexMap));
        }
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [userTypes, defaultUserType, sexMap]);

  // Drop the temp preview URL if the tab is left before saving/discarding.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const fullName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(" ");
  const displayImage = MediaRoute.resolveProfileImage(user, imagePreview);
  const statusLabel = STATUS_LABELS[user?.statusCode] ?? null;

  // ── Profile image handlers ──────────────────────────────────────────────────
  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageError(null);
    e.target.value = "";
  };

  const doUploadImage = async () => {
    if (!imageFile) return;

    const nUserId = getItem("userId");
    setImageUploading(true);
    setImageError(null);

    try {
      await withSpinner("Photo", async () => {
        const formData = new FormData();
        formData.append("strProfileImage", imageFile);

        const data = await UserAPI.uploadProfileImage(nUserId, formData);

        setUser((prev) => ({ ...prev, strProfileImage: data.strProfileImage }));
        syncLocalStorage({ strProfileImage: data.strProfileImage });

        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        setImageFile(null);
      });
      await showSwal(
        "SUCCESS",
        {},
        { entity: "Profile Photo", action: "updated" },
      );
    } catch (e) {
      console.error("Profile image upload failed:", e);
      const msg =
        e?.data?.errors?.strProfileImage?.[0] ||
        e?.data?.message ||
        e?.message ||
        "Upload failed. Please try again.";
      setImageError(msg);
      await showSwal("ERROR", {}, { entity: "profile photo", action: "update" });
    } finally {
      setImageUploading(false);
    }
  };

  const handleDiscardImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  };

  // ── Password – verify step ──────────────────────────────────────────────────
  const handleVerifyChange = (e) => {
    const { name, value } = e.target;
    setVerifyData((prev) => ({ ...prev, [name]: value }));
    if (verifyErrors[name])
      setVerifyErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleVerify = async () => {
    if (!verifyData.currentPw.trim()) {
      setVerifyErrors({ currentPw: uiMessages.common.requiredPassword });
      return;
    }

    setVerifyLoading(true);
    try {
      await AuthAPI.verifyPassword({
        strPassword: verifyData.currentPw,
      });
      setPwStep("change");
    } catch (e) {
      setVerifyErrors({
        currentPw:
          e.status === 404
            ? uiMessages.common.invalidPassword
            : uiMessages.common.failedVerification,
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Password – change step ──────────────────────────────────────────────────
  const handlePwChange = (e) => {
    const { name, value } = e.target;

    setPwData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "newPw") {
        if (!value) next.confirmPw = "";
      }
      return next;
    });

    setPwErrors((prev) => {
      if (name === "newPw") {
        return {
          ...prev,
          newPw: validatePassword(value),
          confirmPw: pwData.confirmPw
            ? validateConfirmPassword(value, pwData.confirmPw)
            : prev.confirmPw,
        };
      }
      if (name === "confirmPw") {
        return {
          ...prev,
          confirmPw: validateConfirmPassword(pwData.newPw, value),
        };
      }
      return prev;
    });
  };

  const doUpdatePassword = async () => {
    const nUserId = getItem("userId");
    setChangeLoading(true);
    try {
      await withSpinner("Password", async () => {
        await UserAPI.updatePassword(nUserId, {
          strPassword: pwData.newPw,
          strPassword_confirmation: pwData.confirmPw,
        });
      });
      setPwStep("done");
      await showSwal("SUCCESS", {}, { entity: "Password", action: "updated" });
    } catch {
      setPwErrors({ newPw: uiMessages.common.failedUpdatePassword });
      await showSwal("ERROR", {}, { entity: "password", action: "update" });
    } finally {
      setChangeLoading(false);
    }
  };

  // Validates first (errors surface inline), then opens the confirmation dialog.
  const handleChangePassword = () => {
    const errors = {};

    if (!pwData.newPw) errors.newPw = uiMessages.common.requiredPassword;
    if (!pwData.confirmPw) errors.confirmPw = uiMessages.common.confirmPassword;

    const pwErr = validatePassword(pwData.newPw);
    const cpErr = validateConfirmPassword(pwData.newPw, pwData.confirmPw);
    if (pwErr) errors.newPw = pwErr;
    if (cpErr) errors.confirmPw = cpErr;

    if (Object.keys(errors).length) {
      setPwErrors(errors);
      return;
    }

    setConfirmAction("update_password");
  };

  // ── Dynamic FormGrid fields ─────────────────────────────────────────────────
  const changeFields = [
    { label: "New Password", name: "newPw", type: "password", xs: 12 },
    {
      label: "Confirm Password",
      name: "confirmPw",
      type: "password",
      xs: 12,
      disabled: !pwData.newPw || pwData.newPw.length < 6,
    },
  ];

  const handleStartEdit = () => {
    setEditData({
      firstName: user?.firstName || "",
      middleName: user?.middleName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      sex: user?.sex || "",
      phoneNumber: user?.phoneNumber || "",
      email: user?.email || "",
      username: user?.username || "",
    });
    setEditErrors({});
    setPwStep("editProfile");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const doSaveProfile = async () => {
    const nUserId = getItem("userId");
    setEditLoading(true);

    try {
      const payload = {
        strFName: editData.firstName,
        strMName: editData.middleName || "",
        strLName: editData.lastName,
        strNickName: editData.nickname,
        cSex:
          Object.keys(sexMap || {}).find((k) => sexMap[k] === editData.sex) ||
          user?.cSex,
        strPhoneNo: editData.phoneNumber || "",
        strEmail: editData.email || "",
        strUserName: editData.username || "",
        cUserType: user?.cUserType,
      };

      await withSpinner("Profile", async () => {
        const res = await UserAPI.updateUser(nUserId, payload);
        const updated = res?.user ?? {};

        setUser((prev) => ({
          ...prev,
          firstName: updated.strFName ?? editData.firstName,
          middleName: updated.strMName ?? editData.middleName,
          lastName: updated.strLName ?? editData.lastName,
          fullName:
            [
              updated.strFName ?? editData.firstName,
              updated.strMName ?? editData.middleName,
              updated.strLName ?? editData.lastName,
            ]
              .filter(Boolean)
              .join(" ") || "No Name",
          nickname: updated.strNickName ?? editData.nickname,
          phoneNumber: updated.strPhoneNo ?? editData.phoneNumber,
          email: updated.strEmail ?? editData.email,
          username: updated.strUserName ?? editData.username,
          sex: sexMap?.[updated.cSex] || editData.sex,
        }));

        syncLocalStorage({
          strFName: updated.strFName ?? editData.firstName,
          strMName: updated.strMName ?? editData.middleName,
          strLName: updated.strLName ?? editData.lastName,
          strNickName: updated.strNickName ?? editData.nickname,
        });
      });

      setPwStep("idle");
      await showSwal("SUCCESS", {}, { entity: "Profile", action: "updated" });
    } catch (e) {
      console.error("Failed to update profile:", e);
      setEditErrors({
        firstName: e?.message || "Failed to update profile. Please try again.",
      });
      await showSwal("ERROR", {}, { entity: "profile", action: "update" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveProfile = () => {
    const newErrors = {};
    if (!editData.firstName?.trim())
      newErrors.firstName = "First name is required.";
    if (!editData.lastName?.trim())
      newErrors.lastName = "Last name is required.";
    if (!editData.nickname?.trim())
      newErrors.nickname = "Nickname is required.";

    if (Object.keys(newErrors).length) {
      setEditErrors(newErrors);
      return;
    }

    setConfirmAction("save_profile");
  };

  const backToIdle = () => {
    setPwStep("idle");
    setPwData(INITIAL_PW_DATA);
    setPwErrors({});
    setVerifyData(INITIAL_VERIFY);
    setVerifyErrors({});
    setEditData({});
    setEditErrors({});
  };

  // ── Confirmations ───────────────────────────────────────────────────────
  const handleConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "save_profile") await doSaveProfile();
    else if (action === "save_photo") await doUploadImage();
    else if (action === "update_password") await doUpdatePassword();
  };

  // ── Per-step footer buttons ────────────────────────────────────────────────
  const stepFooter = {
    idle: {
      extra: imageFile ? null : (
        <BaseButton
          key="editProfile"
          label="Edit Profile"
          icon={<EditRounded />}
          variant="outlined"
          actionColor="edit"
          onClick={handleStartEdit}
        />
      ),
      secondary: imageFile ? (
        <BaseButton
          key="discard"
          label="Discard"
          variant="outlined"
          actionColor="cancel"
          onClick={handleDiscardImage}
        />
      ) : null,
      primary: (
        <BaseButton
          key="savePhoto"
          label={
            imageFile
              ? imageUploading
                ? "Uploading…"
                : "Save Photo"
              : "Change Password"
          }
          actionColor={imageFile ? "save" : "verify"}
          disabled={imageUploading}
          onClick={
            imageFile
              ? () => setConfirmAction("save_photo")
              : () => setPwStep("verify")
          }
        />
      ),
    },
    editProfile: {
      primary: (
        <BaseButton
          key="saveProfile"
          label={editLoading ? "Saving…" : "Save Changes"}
          actionColor="save"
          disabled={editLoading}
          onClick={handleSaveProfile}
        />
      ),
      secondary: (
        <BaseButton
          key="cancelEdit"
          label="Cancel"
          variant="outlined"
          actionColor="back"
          onClick={backToIdle}
        />
      ),
    },
    verify: {
      primary: (
        <BaseButton
          key="confirmVerify"
          label={verifyLoading ? "Verifying…" : "Confirm"}
          actionColor="verify"
          disabled={verifyLoading}
          onClick={handleVerify}
        />
      ),
      secondary: (
        <BaseButton
          key="backVerify"
          label="Back"
          variant="outlined"
          actionColor="back"
          onClick={backToIdle}
        />
      ),
    },
    change: {
      primary: (
        <BaseButton
          key="updatePw"
          label={changeLoading ? "Saving…" : "Update Password"}
          actionColor="save"
          disabled={changeLoading}
          onClick={handleChangePassword}
        />
      ),
      secondary: (
        <BaseButton
          key="backChange"
          label="Back"
          variant="outlined"
          actionColor="back"
          onClick={() => {
            setPwStep("verify");
            setPwData(INITIAL_PW_DATA);
            setPwErrors({});
          }}
        />
      ),
    },
    done: {
      secondary: (
        <BaseButton
          key="backToProfile"
          label="Back to Profile"
          variant="outlined"
          actionColor="back"
          onClick={backToIdle}
        />
      ),
    },
  };

  const currentFooter = stepFooter[pwStep] ?? stepFooter.idle;

  const cardSx = {
    borderRadius: 3,
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    overflow: "hidden",
  };

  const stepTitles = {
    idle: "Personal information",
    editProfile: "Edit profile",
    verify: "Verify identity",
    change: "Set new password",
    done: "Password updated",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1200, mx: "auto" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageChange}
      />

      {/* ── Page header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: 2,
            backgroundColor: colors.iconBoxBg,
            color: colors.textSecondary,
            display: "flex",
          }}
        >
          <ManageAccountsOutlined />
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: colors.textPrimary,
              lineHeight: 1.2,
            }}
          >
            My Account
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: colors.textSecondary }}>
            Manage your profile, photo, and password.
          </Typography>
        </Box>
      </Box>

      {loading && !user ? (
        <AccountPanelSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── Left column: profile summary ── */}
          <div className="lg:col-span-4">
            <Paper
              elevation={0}
              sx={{
                ...cardSx,
                p: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Avatar */}
              <Box sx={{ position: "relative", mb: 2, mt: 1 }}>
                <Box
                  sx={{
                    width: 132,
                    height: 132,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: imageError
                      ? `2.5px solid ${colors.errorRed}`
                      : `2.5px solid ${colors.cardBorder}`,
                    boxShadow: imageError
                      ? `0 0 0 3px ${colors.errorRedGlow}`
                      : "none",
                    transition: "border 0.2s, box-shadow 0.2s",
                  }}
                >
                  <img
                    src={displayImage}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <Tooltip title="Change photo" placement="bottom">
                  <IconButton
                    onClick={handleImageClick}
                    size="small"
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      width: 28,
                      height: 28,
                      bgcolor: colors.editBtnBg,
                      border: `2px solid ${colors.editBtnBorder}`,
                      boxShadow: `0 1px 4px ${colors.shadowChip}`,
                      "&:hover": {
                        bgcolor: colors.editBtnHoverBg,
                        "& svg": { color: colors.textPrimary },
                      },
                    }}
                  >
                    <EditRounded
                      sx={{ fontSize: "0.8rem", color: colors.textSecondary }}
                    />
                  </IconButton>
                </Tooltip>
              </Box>

              {imageError && (
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: colors.errorRed,
                    mb: 1,
                    maxWidth: 240,
                  }}
                >
                  {imageError}
                </Typography>
              )}
              {imageFile && !imageError && (
                <Typography
                  sx={{ fontSize: 11.5, color: colors.textMuted, mb: 1 }}
                >
                  New photo selected, not saved yet
                </Typography>
              )}

              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                  textTransform: "uppercase",
                }}
              >
                {user?.firstName ? user.firstName.toUpperCase() : "NO NAME"}
              </Typography>

              {user?.lastName && (
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    lineHeight: 1.2,
                    mt: 0.5,
                    wordBreak: "break-word",
                    textTransform: "uppercase",
                  }}
                >
                  {user.lastName.toUpperCase()}
                </Typography>
              )}

              {user?.type && (
                <Typography
                  sx={{ fontSize: 12, color: colors.textMuted, mt: 1 }}
                >
                  {user.type}
                </Typography>
              )}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 1,
                  mt: 1.5,
                }}
              >
                {statusLabel && (
                  <Chip
                    label={statusLabel}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: colors.textSecondary,
                      backgroundColor: colors.iconBoxBg,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  />
                )}
                <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>
                  {getActiveText(user)}
                </Typography>
              </Box>
            </Paper>
          </div>

          {/* ── Right column: details / forms ── */}
          <div className="lg:col-span-8">
            <Paper elevation={0} sx={cardSx}>
              <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                <SectionLabel colors={colors}>{stepTitles[pwStep]}</SectionLabel>
              </Box>
              <Divider sx={{ borderColor: colors.divider }} />

              {/* idle – profile info */}
              {pwStep === "idle" &&
                FIELD_CONFIG.map(({ label, key, icon }, i) => {
                  const Icon = icon;
                  return (
                    <Box key={label}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: { xs: "flex-start", sm: "center" },
                          flexDirection: { xs: "column", sm: "row" },
                          px: 3,
                          py: 1.5,
                          gap: { xs: 0.5, sm: 2 },
                          transition: "background 0.15s",
                          "&:hover": { bgcolor: colors.rowHover },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            minWidth: { sm: 160 },
                            flexShrink: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: 1.5,
                              bgcolor: colors.iconBoxBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon
                              sx={{
                                fontSize: "0.9rem",
                                color: colors.textSecondary,
                              }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: colors.textSecondary,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 13.5,
                            color: user?.[key]
                              ? colors.textPrimary
                              : colors.textMuted,
                            pl: { xs: 5.5, sm: 0 },
                            wordBreak: "break-word",
                          }}
                        >
                          {user?.[key] || "—"}
                        </Typography>
                      </Box>
                      {i < FIELD_CONFIG.length - 1 && (
                        <Divider sx={{ borderColor: colors.divider }} />
                      )}
                    </Box>
                  );
                })}

              {/* editProfile */}
              {pwStep === "editProfile" && (
                <Box sx={{ p: 3 }}>
                  <FormGrid
                    fields={[
                      { label: "First Name", name: "firstName", xs: 4 },
                      { label: "Middle Name", name: "middleName", xs: 4 },
                      { label: "Last Name", name: "lastName", xs: 4 },
                      { label: "Nickname", name: "nickname", xs: 6 },
                      {
                        label: "Sex",
                        name: "sex",
                        type: "select",
                        xs: 6,
                        options: Object.entries(sexMap || {}).map(
                          ([, label]) => ({ value: label, label }),
                        ),
                      },
                      {
                        label: "Phone Number",
                        name: "phoneNumber",
                        type: "phone",
                        xs: 6,
                      },
                      {
                        label: "Username",
                        name: "username",
                        type: "username",
                        xs: 6,
                      },
                      { label: "Email", name: "email", type: "email", xs: 12 },
                    ]}
                    formData={editData}
                    errors={editErrors}
                    handleChange={handleEditChange}
                  />
                </Box>
              )}

              {/* verify */}
              {pwStep === "verify" && (
                <Box sx={{ p: 3 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      mb: 2,
                      lineHeight: 1.6,
                    }}
                  >
                    Confirm your{" "}
                    <strong style={{ color: colors.textPrimary }}>
                      current password
                    </strong>{" "}
                    to proceed.
                  </Typography>
                  <FormGrid
                    fields={VERIFY_FIELDS}
                    formData={verifyData}
                    errors={verifyErrors}
                    handleChange={handleVerifyChange}
                  />
                </Box>
              )}

              {/* change */}
              {pwStep === "change" && (
                <Box sx={{ p: 3 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      mb: 2,
                      lineHeight: 1.6,
                    }}
                  >
                    Enter and confirm your{" "}
                    <strong style={{ color: colors.textPrimary }}>
                      new password
                    </strong>
                    .
                  </Typography>
                  <FormGrid
                    fields={changeFields}
                    formData={pwData}
                    errors={pwErrors}
                    handleChange={handlePwChange}
                  />
                </Box>
              )}

              {/* done */}
              {pwStep === "done" && (
                <Box
                  sx={{
                    m: 3,
                    p: 3,
                    borderRadius: 2,
                    border: `1px solid ${colors.successBorder}`,
                    bgcolor: colors.successBg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                    textAlign: "center",
                  }}
                >
                  <CheckCircle
                    sx={{ fontSize: 44, color: colors.statusActiveText }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: colors.successText,
                    }}
                  >
                    Password Updated Successfully
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: colors.successTextBold,
                      lineHeight: 1.6,
                      maxWidth: 320,
                    }}
                  >
                    Your password has been changed. Use your new password the
                    next time you log in.
                  </Typography>
                </Box>
              )}

              {/* Footer actions inside Personal Information card after sex */}
              <Divider sx={{ borderColor: colors.divider }} />
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 1,
                  px: 3,
                  py: 1.75,
                }}
              >
                {currentFooter.extra}
                {currentFooter.secondary}
                {currentFooter.primary}
              </Box>
            </Paper>
          </div>
        </div>
      )}

      {/* Save Profile / Save Photo / Update Password confirmations */}
      <SettingsConfirmationModal
        open={!!confirmAction}
        style={confirmAction ? SETTINGS_CONFIRM_STYLES[confirmAction] : null}
        loading={editLoading || imageUploading || changeLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </Box>
  );
}

export default AccountPanel;