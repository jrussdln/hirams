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
// ─── CENTRALIZED THEME COLORS ── Auto switches Light/Dark ────────────────
// Every value comes from getThemeColors. Shared ones (the banner gradient,
// the plain status badge, white-on-fill, the red alert, the shadow colours)
// are reused from their own groups; the rest come from account.*.
const useColors = (c) => ({
  // header banner — ONE gradient token. The old headerStart/Mid/End triple
  // rebuilt this same string from three stops that never varied by mode.
  banner: c.blue.banner,
  bannerRing: c.blue.bannerRing,
  bannerTextHigh: c.blue.bannerTextHigh,
  bannerTextMed: c.blue.bannerTextMed,
  bannerTextSoft: c.blue.bannerTextSoft,

  // plain status badge (sits on the banner)
  statusText: c.badge.plain.text,
  statusBg: c.badge.plain.bg,
  statusBorder: c.badge.plain.border,

  // green used ONLY by the "Password Updated Successfully" checkmark —
  // the status badge itself is plain (see STATUS_MAP)
  statusActiveText: c.account.statusActiveText,

  // card & backgrounds
  cardBg: c.account.cardBg,
  cardBorder: c.account.cardBorder,
  rowHover: c.account.rowHover,
  iconBoxBg: c.account.iconBoxBg,
  primary: c.account.primary,
  primaryDark: c.account.primaryDark,

  // text (the panel's own grey ramp, distinct from gray.*)
  textPrimary: c.account.textPrimary,
  textSecondary: c.account.textSecondary,
  textMuted: c.account.textMuted,
  textInverse: c.gray.textOnFill,

  // divider
  divider: c.account.divider,

  // success state
  successBg: c.account.successBg,
  successBorder: c.account.successBorder,
  successText: c.account.successText,
  successTextBold: c.account.successTextBold,

  // error — the glow only; the text itself is red.alertText
  errorRed: c.red.alertText,
  errorRedGlow: c.account.errorRedGlow,

  // the camera/edit affordance on the avatar
  editBtnBg: c.account.editBtnBg,
  editBtnBorder: c.account.editBtnBorder,
  editBtnHoverBg: c.account.editBtnHoverBg,

  // shadow COLOURS — geometry stays at the call site
  shadowStrong: c.shadow.strong,
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
 * Returns a human-readable status string.
 *
 * bIsActive === 0 → currently online (no time shown)
 * bIsActive === 1 → offline, show "Active X ago" from last login
 */
const getActiveText = (user) => {
  // Online → no time
  if (Number(user?.bIsActive) === 0) return "Online";

  // Offline → show last seen
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
// ── Component ────────────────────────────────────────────────────────────────

/**
 * Account profile panel — the Account Profile modal content, inline as the
 * "My Account" tab of the Settings page.
 */
function AccountPanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ✅ THEME-AWARE COLORS — Auto switches Light/Dark
  const colors = useColors(getThemeColors(isDark));

  // Plain, neutral badge — no status colour. All three states share the
  // same translucent-white treatment so it sits quietly on the blue banner.
  const STATUS_MAP = {
    V: {
      color: colors.statusText,
      bg: colors.statusBg,
      border: colors.statusBorder,
      label: "Pending",
    },
    A: {
      color: colors.statusText,
      bg: colors.statusBg,
      border: colors.statusBorder,
      label: "Active",
    },
    I: {
      color: colors.statusText,
      bg: colors.statusBg,
      border: colors.statusBorder,
      label: "Inactive",
    },
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const { userTypes, defaultUserType, sex: sexMap } = useKeysLabels();
  const [imageError, setImageError] = useState(null);
  // "save_profile" | "save_photo" | "update_password" while its confirmation
  // dialog is open — same contract as inventory's confirmAction.
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Fetch user on mount (was: on modal open) ───────────────────────────────
  useEffect(() => {
    const nUserId = getItem("userId");
    if (!nUserId) return;

    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const data = await UserAPI.getById(nUserId);
        const raw = data?.user ?? {};

        if (!cancelled) {
          setUser({
            ...raw,
            firstName: raw.strFName || "",
            middleName: raw.strMName || "",
            lastName: raw.strLName || "",
            fullName:
              [raw.strFName, raw.strMName, raw.strLName]
                .filter(Boolean)
                .join(" ") || "No Name",
            nickname: raw.strNickName || "",
            username: raw.strUserName || "",
            phoneNumber: raw.strPhoneNo || "",
            email: raw.strEmail || "",
            type:
              userTypes?.[raw.cUserType] ??
              defaultUserType?.[raw.cUserType] ??
              "",
            sex: sexMap?.[raw.cSex] || raw.cSex || "",
            statusCode: raw.cStatus,
          });
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
  const statusChip = STATUS_MAP[user?.statusCode] ?? null;

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
      await showSwal(
        "SUCCESS",
        {},
        { entity: "Password", action: "updated" },
      );
    } catch {
      setPwErrors({ newPw: uiMessages.common.failedUpdatePassword });
      await showSwal("ERROR", {}, { entity: "password", action: "update" });
    } finally {
      setChangeLoading(false);
    }
  };

  // Validates first (errors surface inline, no dialog yet), then opens the
  // confirmation dialog. The API call itself runs from handleConfirmAction.
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

  // Validates first (errors surface inline, no dialog yet), then opens the
  // confirmation dialog. The API call itself runs from handleConfirmAction.
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
  // The footer buttons only open the dialog; this runs the action it was
  // opened for (same contract as inventory's handleConfirmAction).
  const handleConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "save_profile") await doSaveProfile();
    else if (action === "save_photo") await doUploadImage();
    else if (action === "update_password") await doUpdatePassword();
  };

  // ── Per-step footer buttons (replaces the ModalContainer footer) ───────────
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
            imageFile ? () => setConfirmAction("save_photo") : () => setPwStep("verify")
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageChange}
      />

      <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
        {/* ── Header banner ──────────────────────────────────────────────── */}
        <Box
          sx={{
            background: colors.banner,
            borderRadius: "12px 12px 0 0",
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.5, sm: 2.5 },
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 1.5, sm: 2 },
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Box
              sx={{
                width: { xs: 70, sm: 100 },
                height: { xs: 70, sm: 100 },
                borderRadius: "50%",
                overflow: "hidden",
                border: imageError
                  ? `2.5px solid ${colors.errorRed}`
                  : `2.5px solid ${colors.bannerRing}`,
                boxShadow: imageError
                  ? `0 0 0 3px ${colors.errorRedGlow}`
                  : `0 4px 12px ${colors.shadowStrong}`,
                transition: "border 0.2s, box-shadow 0.2s",
              }}
            >
              <img
                src={displayImage}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
            {imageError && (
              <Box
                sx={{
                  position: "absolute",
                  left: "110%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: colors.errorRed,
                  color: colors.textInverse,
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  px: 1.2,
                  py: 0.6,
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 8px ${colors.shadowStrong}`,
                  zIndex: 10,
                  pointerEvents: "none",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    right: "100%",
                    transform: "translateY(-50%)",
                    border: "5px solid transparent",
                    borderRightColor: colors.errorRed,
                  },
                }}
              >
                {imageError}
              </Box>
            )}
            <Tooltip title="Change photo" placement="bottom">
              <IconButton
                onClick={handleImageClick}
                size="small"
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: { xs: 22, sm: 26 },
                  height: { xs: 22, sm: 26 },
                  bgcolor: colors.editBtnBg,
                  border: `2px solid ${colors.editBtnBorder}`,
                  boxShadow: `0 1px 4px ${colors.shadowChip}`,
                  "&:hover": {
                    bgcolor: colors.editBtnHoverBg,
                    borderColor: colors.primary,
                    "& svg": { color: colors.primary },
                  },
                }}
              >
                <EditRounded
                  sx={{
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    color: colors.textSecondary,
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Profile text */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                color: colors.bannerTextHigh,
                fontSize: { xs: "0.6rem", sm: "0.68rem" },
                fontWeight: 500,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              My Profile
            </Typography>

            <Typography
              sx={{
                color: colors.textInverse,
                fontWeight: 700,
                fontSize: { xs: "0.9rem", sm: "1rem" },
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {fullName}
            </Typography>

            {user?.type && (
              <Typography
                sx={{
                  color: colors.bannerTextMed,
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  mt: 0.2,
                }}
              >
                {user.type}
              </Typography>
            )}

            <Typography
              sx={{
                color: colors.bannerTextSoft,
                fontSize: { xs: "0.68rem", sm: "0.72rem" },
                mt: 0.3,
              }}
            >
              {getActiveText(user)}
            </Typography>
          </Box>

          {/* Status chip */}
          {statusChip && (
            <Chip
              label={statusChip.label}
              size="small"
              sx={{
                backgroundColor: statusChip.bg,
                color: statusChip.color,
                border: `1px solid ${statusChip.border}`,
                fontWeight: 600,
                fontSize: { xs: "0.62rem", sm: "0.7rem" },
                letterSpacing: "0.3px",
                flexShrink: 0,
                height: { xs: 22, sm: 26 },
              }}
            />
          )}
        </Box>

        {loading && !user ? (
          /* ── Loading (was a text-only "Loading profile…" block) ─────────── */
          <AccountPanelSkeleton />
        ) : (
          <>
            {/* ── STEP: idle – profile info ────────────────────────────── */}
            {pwStep === "idle" && (
              <Box
                sx={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  overflow: "hidden",
                  bgcolor: colors.cardBg,
                }}
              >
                {FIELD_CONFIG.map(({ label, key, icon }, i) => {
                  const Icon = icon;
                  return (
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
                          "&:hover": { bgcolor: colors.rowHover },
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
                              width: 28,
                              height: 28,
                              borderRadius: "8px",
                              bgcolor: colors.iconBoxBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon
                              sx={{ fontSize: "0.85rem", color: colors.primary }}
                            />
                          </Box>

                          <Typography
                            sx={{
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              color: colors.textSecondary,
                              whiteSpace: "nowrap",
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
                            fontSize: { xs: "0.82rem", sm: "0.84rem" },
                            color: colors.textPrimary,
                            fontStyle: user?.[key] ? "normal" : "italic",
                            pl: { xs: 4.5, sm: 0 },
                            wordBreak: "break-word",
                          }}
                        >
                          {user?.[key] || "—"}
                        </Typography>
                      </Box>

                      {i < FIELD_CONFIG.length - 1 && (
                        <Divider
                          sx={{ mx: { xs: 1.5, sm: 2 }, borderColor: colors.divider }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* ── STEP: editProfile ────────────────────────────────────── */}
            {pwStep === "editProfile" && (
              <Box
                sx={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  bgcolor: colors.cardBg,
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 1.5,
                  }}
                >
                  Edit Profile
                </Typography>
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

            {/* ── STEP: verify ─────────────────────────────────────────── */}
            {pwStep === "verify" && (
              <Box
                sx={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  bgcolor: colors.cardBg,
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 1.5,
                  }}
                >
                  Verify Identity
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: colors.textPrimary,
                    mb: 2,
                    lineHeight: 1.6,
                  }}
                >
                  Confirm your <strong>current password</strong> to proceed.
                </Typography>
                <FormGrid
                  fields={VERIFY_FIELDS}
                  formData={verifyData}
                  errors={verifyErrors}
                  handleChange={handleVerifyChange}
                />
              </Box>
            )}

            {/* ── STEP: change ─────────────────────────────────────────── */}
            {pwStep === "change" && (
              <Box
                sx={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  bgcolor: colors.cardBg,
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 1.5,
                  }}
                >
                  Set New Password
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: colors.textPrimary,
                    mb: 2,
                    lineHeight: 1.6,
                  }}
                >
                  Enter and confirm your <strong>new password</strong>.
                </Typography>
                <FormGrid
                  fields={changeFields}
                  formData={pwData}
                  errors={pwErrors}
                  handleChange={handlePwChange}
                />
              </Box>
            )}

            {/* ── STEP: done ───────────────────────────────────────────── */}
            {pwStep === "done" && (
              <Box
                sx={{
                  border: `1px solid ${colors.successBorder}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  bgcolor: colors.successBg,
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  textAlign: "center",
                }}
              >
                <CheckCircle
                  sx={{ fontSize: 48, color: colors.statusActiveText }}
                />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: colors.successText,
                  }}
                >
                  Password Updated Successfully
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: colors.successTextBold,
                    lineHeight: 1.6,
                    maxWidth: 320,
                  }}
                >
                  Your password has been changed. Use your new password the next
                  time you log in.
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* ── Footer actions (was the modal footer) ───────────────────────── */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            mt: 2,
          }}
        >
          {currentFooter.extra}
          {currentFooter.secondary}
          {currentFooter.primary}
        </Box>
      </Paper>

      {/* Save Profile / Save Photo / Update Password confirmations */}
      <SettingsConfirmationModal
        open={!!confirmAction}
        style={
          confirmAction ? SETTINGS_CONFIRM_STYLES[confirmAction] : null
        }
        loading={editLoading || imageUploading || changeLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </Box>
  );
}

export default AccountPanel;
