import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

import {
  ClickAwayListener,
  Paper,
  Popper,
  IconButton,
  Tooltip,
  Box,
  Divider,
  Fade,
  Skeleton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { useNavigate } from "react-router-dom";
import MediaRoute from "../../../../../routes/MediaRoute";
import NotificationMenu from "../../../../../components/ui/menu/NotificationMenu";
import { getItem } from "../../../../../utils/storage/localStorage";
import { useLogout } from "../../../../../utils/auth/logout";
import useKeysLabels from "../../../../../hooks/useKeysLabels";
import { useThemeMode } from "../../../../../hooks/useThemeMode";
import getThemeColors from "../../../../../utils/style/getThemeColors";
import BaseButton from "../../../../../components/ui/form/BaseButton";
import AIChatbotWidget from "../../../../../components/ui/widget/AIChatBotWidget";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import UpDownIndicatorWidget from "../../../../../components/ui/widget/UpDownIndicatorWidget";
import {
  aiChatBotEnabled,
  darkModeEnabled,
} from "../../../../../config/featureFlags.js";
// ── Helpers ──────────────────────────────────────────────────────────
const readUserFromStorage = () => getItem("user", {});

const extractBgColor = (node) => {
  if (!React.isValidElement(node)) return null;
  const sx = node.props?.sx;
  if (sx && typeof sx === "object") {
    return sx.background || sx.backgroundColor || null;
  }
  return null;
};

const extractLabelText = (node) => {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = extractLabelText(child);
      if (found) return found;
    }
    return null;
  }
  if (React.isValidElement(node)) {
    if (typeof node.props?.label === "string") return node.props.label;
    return extractLabelText(node.props?.children);
  }
  return null;
};

const isIconElement = (node) => {
  if (!React.isValidElement(node)) return false;
  const t = node.type;
  return t?.muiName === "SvgIcon" || t?.render?.muiName === "SvgIcon";
};

const extractIcon = (node) => {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = extractIcon(child);
      if (found) return found;
    }
    return null;
  }
  if (React.isValidElement(node)) {
    if (isIconElement(node)) return node;
    return extractIcon(node.props?.children);
  }
  return null;
};

const collectActionItems = (node, results = []) => {
  if (node == null || typeof node === "boolean") return results;
  if (Array.isArray(node)) {
    node.forEach((child) => collectActionItems(child, results));
    return results;
  }
  if (React.isValidElement(node)) {
    if (typeof node.props?.onClick === "function") {
      results.push({
        label: extractLabelText(node) || "Action",
        icon: extractIcon(node),
        bgColor: extractBgColor(node),
        onClick: node.props.onClick,
        disabled: Boolean(node.props?.disabled),
      });
      return results;
    }
    collectActionItems(node.props?.children, results);
    return results;
  }
  return results;
};

const useColors = (c) => ({
  surfaceBg: c.slate.outerBg,
  borderColor: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
  blueBg: c.blue.bg,
  blueText: c.blue.text,
  blueRing: c.blue.ring,
  redBg: c.red.bg,
  redText: c.red.text,
  overlayBg: c.slate.overlay,
  mutedBg: c.slate.mutedBg,
  hoverSubtle: c.slate.hover,
});

const Layout2 = ({
  title,
  subtitle,
  children,
  footer,
  footerLActions,
  footerRActions,
  loading = false,
  scrollRef,
  actions,
  onArchive,
  headerRight,
  upDownIndicator = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState(readUserFromStorage);
  const logout = useLogout();
  const { userTypes, defaultUserType } = useKeysLabels();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();

  // ── Header icons: help + full screen ──────────────────────────────────
  // Full screen covers the WHOLE browser window (documentElement), not just
  // the page card. The button mirrors document.fullscreenchange instead of
  // flipping its own state, so Esc — which the browser owns — puts the icon
  // back to "enter full screen" on its own.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (err) {
      // Rejected (unsupported browser, or the page is not allowed to go
      // fullscreen) — leave the header as it was rather than throw.
      console.error("Full screen toggle failed:", err);
    }
  }, []);
  const internalScrollRef = useRef(null);
  const effectiveScrollRef =
    scrollRef && "current" in scrollRef ? scrollRef : internalScrollRef;
  useEffect(() => {
    const handleStorageChange = () => setUser(readUserFromStorage());
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const profileImage = MediaRoute.resolveProfileImage(user);
  const nickName = user?.strFName || user?.strNickName || "User";
  const role =
    userTypes[user?.cUserType] ?? defaultUserType?.[user?.cUserType] ?? "";
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);

  const handleActionsClick = (event) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsMenuOpen((prev) => !prev);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
    setProfileOpen((prev) => !prev);
  };

  // Shared look for the header's utility icons — same bare, bordered-free
  // button the notification bell uses, with a theme-aware hover wash so it
  // does not flash white in dark mode.
  const headerIconButton = (title, onClick, Icon, active = false) => (
    <Tooltip title={title} key={title}>
      <IconButton
        onClick={onClick}
        size="small"
        aria-label={title}
        sx={{
          p: 0.5,
          borderRadius: "50%",
          "&:hover": { bgcolor: colors.hoverSubtle },
        }}
      >
        <Icon
          sx={{
            fontSize: 22,
            color: active ? colors.blueText : colors.textSecondary,
            transition: "color 0.2s",
          }}
        />
      </IconButton>
    </Tooltip>
  );

  return (
    <div
      className="flex flex-col max-h-[calc(100vh-1rem)] min-h-[calc(100vh-1rem)] rounded-tl-xl rounded-bl-xl overflow-hidden relative ml-0 border"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        backgroundColor: colors.surfaceBg,
        borderColor: colors.borderColor,
      }}
    >
      <style>{`
        div::-webkit-scrollbar { display: none; }
        @keyframes bounceUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>

      {/* HEADER */}
      <header
        className="sticky top-0 z-20 px-0 py-2 pt-2 pb-2 mx-1 mt-1 rounded-t-lg border-b"
        style={{ borderColor: colors.borderColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 pl-1 sm:pl-2.5 min-w-0 flex-1">
            <div
              className="w-1 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors.blueText }}
            />
            <div className="flex flex-col justify-center min-w-0">
              <h1
                className="text-xs sm:text-sm font-bold leading-tight truncate"
                style={{ color: colors.textPrimary }}
              >
                {title}
              </h1>
              {subtitle && (
                <span
                  className="leading-tight italic truncate block"
                  style={{
                    fontSize: "0.68em",
                    fontWeight: 400,
                    color: colors.textSecondary,
                  }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {headerRight && (
              <>
                <div>{headerRight}</div>
                <div
                  className="w-px h-6 mx-1 sm:mx-2 flex-shrink-0"
                  style={{ backgroundColor: colors.borderColor }}
                />
              </>
            )}

            {/* Help → /help · Full screen → whole browser window */}
            {headerIconButton(
              "Help & Support",
              () => navigate("/help"),
              HelpOutlineIcon,
            )}
            {headerIconButton(
              isFullscreen ? "Exit full screen" : "Full screen",
              toggleFullscreen,
              isFullscreen ? FullscreenExitIcon : FullscreenIcon,
              isFullscreen,
            )}
            <NotificationMenu />

            {darkModeEnabled && (
              <>
                <Tooltip
                  title={
                    mode === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                >
                  <IconButton
                    onClick={toggleMode}
                    size="small"
                    sx={{
                      border: `1px solid ${colors.borderColor}`,
                      borderRadius: "30px",
                    }}
                  >
                    {mode === "dark" ? (
                      <Brightness7Icon fontSize="small" />
                    ) : (
                      <Brightness4Icon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>

                <div
                  className="w-px h-6 mx-1 sm:mx-2 flex-shrink-0"
                  style={{ backgroundColor: colors.borderColor }}
                />
              </>
            )}

            <ClickAwayListener onClickAway={() => setProfileOpen(false)}>
              <div
                className="relative flex items-center gap-2 cursor-pointer"
                onClick={handleProfileClick}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent transition-all duration-200 flex-shrink-0"
                    style={{ "&:hover": { outlineColor: colors.blueRing } }}
                  >
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="hidden sm:flex flex-col leading-tight mr-3 min-w-0">
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: colors.textPrimary }}
                    >
                      {nickName}
                    </span>
                    {role && (
                      <span
                        className="text-[0.7em] font-normal truncate"
                        style={{ color: colors.textSecondary }}
                      >
                        {role}
                      </span>
                    )}
                  </div>
                </div>

                <Popper
                  open={profileOpen}
                  anchorEl={anchorEl}
                  placement="bottom-end"
                  transition
                  style={{ zIndex: 1300 }}
                  modifiers={[
                    { name: "offset", options: { offset: [0, 10] } },
                    {
                      name: "preventOverflow",
                      options: { padding: 8 },
                    },
                  ]}
                >
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={180}>
                      <div>
                        {/* ▲ caret pointing up at the avatar */}
                        <div
                          style={{
                            position: "absolute",
                            top: -6,
                            right: 16,
                            width: 12,
                            height: 12,
                            transform: "rotate(45deg)",
                            backgroundColor: colors.surfaceBg,
                            borderTopLeftRadius: 3,
                            zIndex: 1,
                          }}
                        />
                        <Paper
                          elevation={8}
                          sx={{
                            mt: 1.5,
                            p: 0.75,
                            minWidth: 216,
                            borderRadius: 2,
                            border: `1px solid ${colors.borderColor}`,
                            boxShadow: `0 8px 28px ${colors.shadowColor}`,
                          }}
                        >
                          {/* ── Identity header ─────────────────────── */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              px: 0.75,
                              py: 0.75,
                              mb: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                overflow: "hidden",
                                flexShrink: 0,
                                border: `2px solid ${colors.blueRing}`,
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
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: colors.textPrimary,
                                  lineHeight: 1.2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {nickName}
                              </Typography>
                              {role && (
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    color: colors.textSecondary,
                                    lineHeight: 1.3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {role}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          <Divider
                            sx={{ mb: 0.75, borderColor: colors.borderColor }}
                          />

                          {/* ── Actions ─────────────────────────────── */}
                          <Box
                            component="button"
                            type="button"
                            onClick={() => {
                              setProfileOpen(false);
                              navigate("/settings");
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              width: "100%",
                              px: 0.75,
                              py: 0.75,
                              mb: 0.25,
                              border: "none",
                              borderRadius: 1.5,
                              bgcolor: "transparent",
                              color: colors.textPrimary,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: 13.5,
                              textAlign: "left",
                              transition: "background-color 0.15s, color 0.15s",
                              "&:hover": {
                                bgcolor: colors.blueBg,
                                color: colors.blueText,
                              },
                              "&:focus-visible": {
                                outline: `2px solid ${colors.blueText}`,
                                outlineOffset: 1,
                              },
                            }}
                          >
                            <SettingsIcon fontSize="small" />
                            Settings
                          </Box>

                          <Box
                            component="button"
                            type="button"
                            onClick={() => {
                              setProfileOpen(false);
                              logout();
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              width: "100%",
                              px: 0.75,
                              py: 0.75,
                              border: "none",
                              borderRadius: 1.5,
                              bgcolor: "transparent",
                              color: colors.redText,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: 13.5,
                              textAlign: "left",
                              transition: "background-color 0.15s, color 0.15s",
                              "&:hover": {
                                bgcolor: colors.redBg,
                                color: colors.redText,
                              },
                              "&:focus-visible": {
                                outline: `2px solid ${colors.redText}`,
                                outlineOffset: 1,
                              },
                            }}
                          >
                            <LogoutIcon fontSize="small" />
                            Logout
                          </Box>
                        </Paper>
                      </div>
                    </Fade>
                  )}
                </Popper>
              </div>
            </ClickAwayListener>
          </div>
        </div>
      </header>

      <div
        className="flex-1 relative overflow-hidden mx-1 flex min-h-0"
        style={{ alignItems: "stretch" }}
      >
        <div
          ref={effectiveScrollRef}
          className="flex-1 overflow-auto min-h-0 flex flex-col"
          style={loading ? { pointerEvents: "none" } : undefined}
        >
          {upDownIndicator && (
            <UpDownIndicatorWidget
              scrollRef={effectiveScrollRef}
              direction="up"
              watch={[children, loading]}
            />
          )}
          <div className="p-3 space-y-0">{children}</div>
          {upDownIndicator && (
            <UpDownIndicatorWidget
              scrollRef={effectiveScrollRef}
              direction="down"
              watch={[children, loading]}
            />
          )}
        </div>
        {aiChatBotEnabled && <AIChatbotWidget accentColor={colors.blueText} />}
      </div>
      {/* FOOTER */}
      {(footer || footerLActions || footerRActions) && (
        <footer
          className="sticky bottom-0 z-20 px-3 py-2 mx-1 mb-1 rounded-b-lg border-t"
          style={{ borderColor: colors.borderColor }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Skeleton
                variant="rounded"
                width={90}
                height={28}
                sx={{ borderRadius: "999px" }}
              />
              <Box sx={{ display: "flex", gap: 0.75 }}>
                <Skeleton
                  variant="rounded"
                  width={70}
                  height={28}
                  sx={{ borderRadius: "999px" }}
                />
                <Skeleton
                  variant="rounded"
                  width={70}
                  height={28}
                  sx={{ borderRadius: "999px" }}
                />
              </Box>
            </Box>
          ) : footer ? (
            footer
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {footerLActions}

              {footerRActions && (
                <>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      gap: 0.75,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {footerRActions}
                  </Box>

                  <Box sx={{ display: { xs: "block", sm: "none" } }}>
                    <ClickAwayListener
                      onClickAway={() => setActionsMenuOpen(false)}
                    >
                      <div>
                        <BaseButton
                          label="Menu"
                          icon={<MenuIcon fontSize="small" />}
                          onClick={handleActionsClick}
                          actionColor="back"
                        />
                        <Popper
                          open={actionsMenuOpen}
                          anchorEl={actionsAnchorEl}
                          placement="top-end"
                          style={{ zIndex: 1300 }}
                        >
                          <Paper
                            elevation={4}
                            sx={{
                              p: 0.5,
                              mb: 1,
                              minWidth: 160,
                              maxWidth: 150,
                              borderRadius: "10px",
                              border: `1px solid ${colors.borderColor}`,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              {collectActionItems(footerRActions).map(
                                (item, i) => (
                                  <Box
                                    key={i}
                                    onClick={() => {
                                      if (!item.disabled) {
                                        item.onClick();
                                        setActionsMenuOpen(false);
                                      }
                                    }}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.75,
                                      px: 1,
                                      py: 0.6,
                                      borderRadius: "6px",
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      color: item.disabled
                                        ? colors.textDisabled
                                        : item.bgColor || colors.textPrimary,
                                      bgcolor: item.disabled
                                        ? colors.mutedBg
                                        : "transparent",
                                      cursor: item.disabled
                                        ? "not-allowed"
                                        : "pointer",
                                      transition: "filter .15s ease",
                                      opacity: item.disabled ? 0.5 : 1,
                                      "&:hover": !item.disabled
                                        ? {
                                            filter: item.bgColor
                                              ? "brightness(0.95)"
                                              : "none",
                                            bgcolor: item.bgColor
                                              ? undefined
                                              : colors.hoverSubtle,
                                          }
                                        : undefined,
                                    }}
                                  >
                                    {item.icon && (
                                      <Box
                                        sx={{
                                          display: "inline-flex",
                                          flexShrink: 0,
                                          "& svg": { fontSize: "0.85rem" },
                                        }}
                                      >
                                        {item.icon}
                                      </Box>
                                    )}
                                    <span style={{ whiteSpace: "nowrap" }}>
                                      {item.label}
                                    </span>
                                  </Box>
                                ),
                              )}
                            </Box>
                          </Paper>
                        </Popper>
                      </div>
                    </ClickAwayListener>
                  </Box>
                </>
              )}
            </Box>
          )}
        </footer>
      )}
    </div>
  );
};

export default Layout2;
