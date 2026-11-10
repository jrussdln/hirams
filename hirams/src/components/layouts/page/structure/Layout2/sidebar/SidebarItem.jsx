import React, { useState, useMemo, cloneElement, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Collapse } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import getThemeColors from "../../../../../../utils/style/getThemeColors";
import SidebarSearchRow from "./SidebarSearchRow";
import { preloadRoute } from "../../../../../../routes/pageLoaders";
import * as localStorage from "../../../../../../utils/storage/localStorage";

const ITEM_HEIGHT = "min-h-[28px]";

// ✅ ALIGNED with Submenu — ONLY verified tokens, same blue intensity
const useColors = (c) => ({
  activeBg: c.blue.bgSoft, // ← matches Submenu active bg (softer blue)
  activeText: c.blue.textStrong, // ← matches Submenu active text
  inactiveText: c.gray.textSecondary,
  hoverBg: c.slate.hover,
  hoverText: c.gray.textPrimary,
  iconActive: c.blue.text,
  iconInactive: c.gray.textSecondary,
  chevronColor: c.gray.textDisabled,
  shine: c.slate.shine,
});

// ── shine sweep keyframe, injected once globally (same pattern used
// in SidebarSubmenu / HorizontalProgressTracker) ──
const KEYFRAMES = `
  @keyframes sidebaritem-shine {
    0%   { left: -150%; }
    50%  { left: 150%; }
    100% { left: 150%; }
  }
`;
if (typeof document !== "undefined" && !document.getElementById("sidebaritem-kf")) {
  const s = document.createElement("style");
  s.id = "sidebaritem-kf";
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

const ShineOverlay = ({ color }) => (
  <span
    style={{
      position: "absolute",
      top: 0,
      left: "-150%",
      width: "60%",
      height: "100%",
      background:
        `linear-gradient(120deg, transparent, ${color}, transparent)`,
      animation: "sidebaritem-shine 2.8s ease-in-out infinite",
      pointerEvents: "none",
    }}
  />
);

const SidebarItem = ({
  icon,
  label,
  to,
  collapsed,
  forceExpanded = false,
  onClick,
  children,
  defaultOpen = false,
  onParentClick,
  // Opt-in: only submenus that explicitly pass showSearch get the row.
  showSearch = false,
  // Route-driven auto-open: when the app lands on one of this section's
  // pages while the section is collapsed, it pops open so the user can see
  // where they ended up (e.g. "I was browsing Item Purchasing, navigated to
  // a Voucher — the Vouchers section must uncollapse, or the highlighted
  // item hides behind the closed section"). It only OPENS — a route change
  // never collapses a section, and the manual open state stays persisted.
  autoOpen = false,
}) => {
  const theme = useTheme(),
    isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const { pathname } = useLocation();
  const showLabel = forceExpanded || !collapsed;
  const hasChildren = Boolean(children);
  const isCollapsed = collapsed && !forceExpanded;

  const storageKey = hasChildren ? `sidebar_open_${label}` : null;
  const [open, setOpen] = useState(() => {
    if (!storageKey) return false;
    const saved = localStorage.getItem(storageKey, null);
    return saved === null ? defaultOpen : saved === true;
  });

  const setOpenPersisted = (valOrFn) => {
    setOpen((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      if (storageKey) localStorage.setItem(storageKey, next);
      return next;
    });
  };

  useEffect(() => {
    if (storageKey && autoOpen) {
      // Only opens — the guard inside the updater means a route change can
      // never collapse a section the user closed, it just re-opens THIS
      // section the moment the app lands on one of its pages again.
      setOpen((prev) => {
        if (prev) return prev;
        localStorage.setItem(storageKey, true);
        return true;
      });
    }
  }, [storageKey, autoOpen]);

  const active = to ? pathname === to || pathname.startsWith(to + "/") : false;

  const coloredIcon = icon
    ? cloneElement(icon, {
        sx: {
          color: active ? colors.iconActive : colors.iconInactive,
          fontSize: 15,
        },
      })
    : null;

  const rowBase = `flex items-center gap-1 px-1 rounded-md transition-colors duration-150 cursor-pointer select-none w-full ${ITEM_HEIGHT} ${isCollapsed ? "justify-center" : ""}`;
  const rowStyle = active
    ? {
        backgroundColor: colors.activeBg,
        color: colors.activeText,
        position: "relative",
        overflow: "hidden",
      }
    : { color: colors.inactiveText };

  const handleMouseEnter = (e) => {
    // Prefetch the target page's chunk as soon as the cursor lands on it —
    // the download finishes before the user actually clicks.
    preloadRoute(to);
    if (!active) {
      e.currentTarget.style.backgroundColor = colors.hoverBg;
      e.currentTarget.style.color = colors.hoverText;
    }
  };
  const handleMouseLeave = (e) => {
    if (!active) {
      e.currentTarget.style.backgroundColor = "transparent";
      e.currentTarget.style.color = colors.inactiveText;
    }
  };

  // Re-clicking the item you are ALREADY on leaves the URL untouched, so
  // the mounted page never hears about it and keeps whatever sub-view it
  // was showing (Journal Accounts' report panel, …). Announce the re-click
  // so the page can drop back to its default view. Navigation itself is
  // left exactly as it was — only plain left clicks count, so opening the
  // item in a new tab stays a silent navigation.
  const handleLinkClick = (e) => {
    onClick?.(e);
    const plainClick =
      e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (active && to && plainClick && !e.defaultPrevented) {
      window.dispatchEvent(
        new CustomEvent("nav_item_reselect", { detail: { to } }),
      );
    }
  };

  if (hasChildren) {
    const handleClick = () =>
      isCollapsed
        ? (onParentClick?.(), onClick?.())
        : setOpenPersisted((v) => !v);
    return (
      <div className="flex flex-col w-full">
        <div
          className={rowBase}
          style={rowStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          title={isCollapsed ? label : undefined}
        >
          {active && <ShineOverlay color={colors.shine} />}
          <div
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
            style={{ position: "relative", zIndex: 1 }}
          >
            {coloredIcon}
          </div>
          {showLabel && (
            <>
              <span
                className="flex-1 truncate text-[13px] font-medium"
                style={{ position: "relative", zIndex: 1 }}
              >
                {label}
              </span>
              {open ? (
                <ExpandMoreIcon
                  sx={{
                    fontSize: 13,
                    color: colors.chevronColor,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              ) : (
                <ChevronRightIcon
                  sx={{
                    fontSize: 13,
                    color: colors.chevronColor,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              )}
            </>
          )}
        </div>
        {showLabel && (
          <Collapse in={open} timeout="auto">
            <div className="flex flex-col w-full mb-0.5">
              {showSearch && <SidebarSearchRow />}
              {children}
            </div>
          </Collapse>
        )}
      </div>
    );
  }

  return (
    <Link
      to={to}
      onClick={handleLinkClick}
      className={rowBase}
      style={rowStyle}
      // Marker for the sidebar scroll-reveal — the container scrolls the
      // active row into view after route changes / auto-opens.
      data-sidebar-active={active ? "true" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => preloadRoute(to)}
      title={isCollapsed ? label : undefined}
    >
      {active && <ShineOverlay color={colors.shine} />}
      <div
        className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        style={{ position: "relative", zIndex: 1 }}
      >
        {coloredIcon}
      </div>
      {showLabel && (
        <span
          className="flex-1 truncate text-[13px] font-medium"
          style={{ position: "relative", zIndex: 1 }}
        >
          {label}
        </span>
      )}
    </Link>
  );
};

export default SidebarItem;