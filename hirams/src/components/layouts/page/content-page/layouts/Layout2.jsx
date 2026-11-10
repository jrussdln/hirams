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
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useTheme } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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
import CookieNotice from "../../../../../components/ui/auth/CookieNotice";
import AIChatbotWidget from "../../../../../components/ui/widget/AIChatBotWidget";
import NotificationSidePanel from "../../../../../pages/utility/panel/NotificationsSidePanel";
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

// Header navigation is passed in as JSX by each page. Read the native tab
// buttons once and render them as one compact menu in the shared header.
const collectHeaderTabItems = (node, results = []) => {
  if (node == null || typeof node === "boolean") return results;
  if (Array.isArray(node)) {
    node.forEach((child) => collectHeaderTabItems(child, results));
    return results;
  }
  if (React.isValidElement(node)) {
    if (node.type === "button") {
      results.push({
        label: extractLabelText(node) || "Page",
        icon: extractIcon(node),
        onClick: node.props?.onClick,
        disabled: Boolean(node.props?.disabled),
        active: Boolean(node.props?.["data-active"]),
      });
      return results;
    }
    collectHeaderTabItems(node.props?.children, results);
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
  shine: c.slate.shine,
});

// ── shine sweep keyframe for subfooter (same pattern as sidebar item) ──
const SUBFOOTER_KEYFRAMES = `
  @keyframes subfooter-shine {
    0%   { left: -150%; }
    50%  { left: 150%; }
    100% { left: 150%; }
  }
`;
if (typeof document !== "undefined" && !document.getElementById("subfooter-kf")) {
  const s = document.createElement("style");
  s.id = "subfooter-kf";
  s.textContent = SUBFOOTER_KEYFRAMES;
  document.head.appendChild(s);
}

const Layout2 = ({
  title,
  subtitle,
  children,
  footer,
  footerLActions,
  footerRActions,
  subFooter,
  loading = false,
  scrollRef,
  actions,
  onArchive,
  headerRight,
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
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [headerMenuAnchorEl, setHeaderMenuAnchorEl] = useState(null);
  const headerTabItems = useMemo(
    () => collectHeaderTabItems(headerRight),
    [headerRight],
  );

  const handleHeaderMenuClick = (event) => {
    setHeaderMenuAnchorEl(event.currentTarget);
    setHeaderMenuOpen((prev) => !prev);
  };

  const handleActionsClick = (event) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsMenuOpen((prev) => !prev);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
    setProfileOpen((prev) => !prev);
  };

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
      className="flex flex-col h-full rounded-tl-xl rounded-bl-xl overflow-hidden relative ml-0 border"
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
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* HEADER */}
      <header
        className="sticky top-0 z-20 px-0 py-2 pt-2 pb-2 mx-1 mt-1 rounded-t-lg border-b"
        style={{ borderColor: colors.borderColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 pl-1 sm:pl-2.5 min-w-0 flex-1">
            <div className="lg:hidden flex-shrink-0">
              <Tooltip title="Open sidebar">
                <IconButton
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("mobile_sidebar_open"))
                  }
                  size="small"
                  aria-label="Open sidebar"
                  sx={{
                    p: 0.5,
                    borderRadius: "50%",
                    "&:hover": { bgcolor: colors.hoverSubtle },
                  }}
                >
                  <MenuIcon
                    sx={{
                      fontSize: 22,
                      color: colors.textSecondary,
                      transition: "color 0.2s",
                    }}
                  />
                </IconButton>
              </Tooltip>
            </div>
            <div
              className="w-1 h-6 rounded-full flex-shrink-0 hidden lg:block"
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
            {headerTabItems.length > 0 && (
              <ClickAwayListener onClickAway={() => setHeaderMenuOpen(false)}>
                <div>
                  <Box
                    component="button"
                    type="button"
                    onClick={handleHeaderMenuClick}
                    aria-label="Change page tab"
                    aria-expanded={headerMenuOpen}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      justifyContent: "space-between",
                      minHeight: 24,
                      minWidth: 120,
                      px: 0.75,
                      border: `1px solid ${colors.borderColor}`,
                      borderRadius: "7px",
                      bgcolor: headerMenuOpen
                        ? colors.blueBg
                        : colors.surfaceBg,
                      color: colors.textPrimary,
                      fontFamily: "inherit",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      transition: "background-color 0.15s, border-color 0.15s",
                      "&:hover": {
                        bgcolor: colors.hoverSubtle,
                        borderColor: colors.blueText,
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${colors.blueText}`,
                        outlineOffset: 1,
                      },
                    }}
                  >
                    <MenuIcon
                      sx={{
                        fontSize: 15,
                        color: headerMenuOpen
                          ? colors.blueText
                          : colors.textSecondary,
                      }}
                    />
                    <span style={{ flex: 1, textAlign: "right" }}>
                      {headerTabItems.find((item) => item.active)?.label ||
                        headerTabItems[0]?.label}
                    </span>
                    <ArrowDropDownIcon
                      sx={{
                        fontSize: 16,
                        color: headerMenuOpen
                          ? colors.blueText
                          : colors.textSecondary,
                      }}
                    />
                  </Box>
                  <Popper
                    open={headerMenuOpen}
                    anchorEl={headerMenuAnchorEl}
                    placement="bottom-end"
                    style={{ zIndex: 1300 }}
                    modifiers={[{ name: "offset", options: { offset: [0, 6] } }]}
                  >
                    <Paper
                      elevation={8}
                      sx={{
                        p: 0.5,
                        minWidth: 150,
                        borderRadius: 2,
                        border: `1px solid ${colors.borderColor}`,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        {headerTabItems.map((item, index) => (
                          <Box
                            component="button"
                            type="button"
                            key={`${item.label}-${index}`}
                            disabled={item.disabled}
                            onClick={() => {
                              if (item.disabled) return;
                              item.onClick?.();
                              setHeaderMenuOpen(false);
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              width: "100%",
                              px: 0.75,
                              py: 0.5,
                              border: "none",
                              borderRadius: 1.5,
                              bgcolor: item.active ? colors.blueBg : "transparent",
                              color: item.active
                                ? colors.blueText
                                : colors.textPrimary,
                              fontFamily: "inherit",
                              fontSize: 11,
                              fontWeight: item.active ? 700 : 600,
                              textTransform: "uppercase",
                              textAlign: "left",
                              cursor: item.disabled ? "not-allowed" : "pointer",
                              opacity: item.disabled ? 0.5 : 1,
                              "&:hover": !item.disabled
                                ? { bgcolor: colors.hoverSubtle }
                                : undefined,
                              "&:focus-visible": {
                                outline: `2px solid ${colors.blueText}`,
                                outlineOffset: 1,
                              },
                            }}
                          >
                            {item.icon && (
                              <Box sx={{ display: "inline-flex", "& svg": { fontSize: 16 } }}>
                                {item.icon}
                              </Box>
                            )}
                            <span>{item.label}</span>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Popper>
                </div>
              </ClickAwayListener>
            )}

            {headerIconButton(
              isFullscreen ? "Exit full screen" : "Full screen",
              toggleFullscreen,
              isFullscreen ? FullscreenExitIcon : FullscreenIcon,
              isFullscreen,
            )}
            <NotificationMenu />

            {/* AI assistant — left of the theme toggle, in the same
                bordered-circle treatment. The panel itself slides in
                beside the page content; this button only opens it (see
                AIChatbotWidget's toggle_ai_chatbot contract). */}
            {aiChatBotEnabled && (
              <Tooltip title="Ask AI">
                <IconButton
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("toggle_ai_chatbot"))
                  }
                  size="small"
                  aria-label="Ask AI"
                  sx={{
                    "&:hover": { bgcolor: colors.hoverSubtle },
                  }}
                >
                  <AutoAwesomeIcon
                    sx={{
                      fontSize: 16,
                      color: colors.blueText,
                      transition: "color 0.2s",
                    }}
                  />
                </IconButton>
              </Tooltip>
            )}

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
                      "&:hover": { bgcolor: colors.hoverSubtle },
                    }}
                  >
                    {mode === "dark" ? (
                      <Brightness7Icon fontSize="small" />
                    ) : (
                      <Brightness4Icon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Divider
              orientation="vertical"
              variant="middle"
              sx={{
                display: { xs: "none", lg: "flex" },
                height: 20,
                maxHeight: 20,
                minHeight: 20,
                borderColor: colors.divider,
                borderWidth: 1,
                ml: 1.5,
                mr: 1.5,
                my: "auto",
              }}
            />

            <ClickAwayListener onClickAway={() => setProfileOpen(false)}>
              <div
                className="relative flex items-center mr-2 cursor-pointer"
                onClick={handleProfileClick}
              >
                <div
                  className="w-8 h-8 rounded-full overflow-hidden transition-all duration-200 flex-shrink-0"
                  style={{
                    border: `2px solid ${colors.blueRing}`,
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>

                <Popper
                  open={profileOpen}
                  anchorEl={anchorEl}
                  placement="bottom-end"
                  transition
                  style={{ zIndex: 1300 }}
                  modifiers={[
                    {
                      name: "preventOverflow",
                      options: { padding: 8 },
                    },
                  ]}
                >
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={180}>
                      <div style={{ position: "relative", marginTop: 8 }}>
                        {/* Caret arrow — flush with the paper, same trick
                            as the notification dropdown: a triangle that
                            spans the entire 8px offset gap, tip touching
                            the avatar, base meeting the popup edge. Filled
                            with the SAME background token as the Paper
                            below, so it never blends with the page (which
                            made it invisible in dark mode). */}
                        <div
                          style={{
                            position: "absolute",
                            top: -7,
                            right: 16,
                            width: 0,
                            height: 0,
                            borderLeft: "7px solid transparent",
                            borderRight: "7px solid transparent",
                            borderBottom: `7px solid ${theme.palette.background.paper}`,
                            zIndex: 1,
                          }}
                        />
                        <Paper
                          elevation={8}
                          sx={{
                            p: 0.75,
                            minWidth: 216,
                            borderRadius: 2,
                            border: `1px solid ${colors.borderColor}`,
                            boxShadow: `0 8px 28px ${colors.shadowColor}`,
                            bgcolor: "background.paper",
                          }}
                        >
                          <Box
                            component="button"
                            type="button"
                            onClick={() => {
                              setProfileOpen(false);
                              navigate("/settings?tab=account");
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              px: 0.75,
                              py: 0.75,
                              mb: 0.5,
                              width: "100%",
                              border: "none",
                              borderRadius: 1.5,
                              bgcolor: "transparent",
                              textAlign: "left",
                              fontFamily: "inherit",
                              cursor: "pointer",
                              transition: "background-color 0.15s",
                              "&:hover": {
                                bgcolor: colors.blueBg,
                              },
                              "&:focus-visible": {
                                outline: `2px solid ${colors.blueText}`,
                                outlineOffset: 1,
                              },
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
        className="flex-1 relative overflow-hidden mx-1 flex min-h-0 hirams-content-row"
        style={{ alignItems: "stretch" }}
      >
        <div
          ref={effectiveScrollRef}
          className="flex-1 overflow-auto min-h-0 flex flex-col"
          style={loading ? { pointerEvents: "none" } : undefined}
        >
          <div className="p-3 space-y-0">{children}</div>
        </div>
        <NotificationSidePanel />
        {/* The AI panel is a flex sibling of this row — its trigger lives
            in the page header ("Ask AI", left of the theme toggle). */}
        {aiChatBotEnabled && (
          <AIChatbotWidget showFloatingTrigger={false} />
        )}
      </div>
      {/* SUB FOOTER - positioned between content and footer */}
      {subFooter && (
        <div
          className="z-20 px-3 mx-1 border-t relative overflow-hidden"
          style={{
            borderColor: colors.blueText,
            backgroundColor: colors.blueText,
            height: 28,
            display: "flex",
            alignItems: "center",
            animation: "slideInLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 0,
              left: "-150%",
              width: "60%",
              height: "100%",
              background:
                `linear-gradient(120deg, transparent, ${colors.shine}, transparent)`,
              animation: "subfooter-shine 2.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", alignItems: "center" }}>
            {subFooter}
          </div>
        </div>
      )}
      {/* FOOTER */}
      {(footer || footerLActions || footerRActions) && (
        <footer
          className="sticky bottom-0 z-20 px-3 py-2 mx-1 mb-1 rounded-b-lg border-t"
          style={{ borderColor: colors.borderColor }}
        >
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

            {loading ? (
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
            ) : footer ? (
              footer
            ) : (
              footerRActions && (
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
              )
            )}
          </Box>
        </footer>
      )}
      {/* Cookie notice scoped to this content container. */}
      <CookieNotice contained />
    </div>
  );
};

export default Layout2;

