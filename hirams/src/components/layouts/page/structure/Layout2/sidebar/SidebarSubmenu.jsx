import React, { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../../../utils/style/getThemeColors";
import DotSpinner from "../../../../../../components/ui/loader/DotSpinner";

const ITEM_HEIGHT = "min-h-[26px]";

const useColors = (c) => ({
  activeBg: c.blue.bgSoft,
  activeText: c.blue.textStrong,
  inactiveText: c.gray.textDisabled,
  hoverBg: c.slate.hover,
  hoverText: c.gray.textSecondary,
  dotActive: c.blue.text,
  dotInactive: c.slate.mutedBorder,
  shine: c.slate.shine,
  badgeActiveBg: c.blue.bg,
  badgeActiveText: c.blue.text,
  badgeInactiveBg: c.slate.mutedBg,
  badgeInactiveText: c.gray.textDisabled,
  redBadgeBg: c.red.bg,
  redBadgeText: c.red.text,
  orangeBadgeBg: c.orange.bg,
  orangeBadgeText: c.orange.text,
});

// ── shine sweep keyframe, injected once globally (same pattern as
// the pip-kf style in HorizontalProgressTracker) ──
const KEYFRAMES = `
  @keyframes submenu-shine {
    0%   { left: -150%; }
    50%  { left: 150%; }
    100% { left: 150%; }
  }
`;
if (typeof document !== "undefined" && !document.getElementById("submenu-kf")) {
  const s = document.createElement("style");
  s.id = "submenu-kf";
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

const SidebarSubmenu = ({
  label,
  active = false,
  count,
  redCount,
  orangeCount,
  countLoading = false,
  onClick,
  indent = "pl-5",
}) => {
  const theme = useTheme(),
    isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const rowStyle = active
    ? {
        backgroundColor: colors.activeBg,
        color: colors.activeText,
        position: "relative",
        overflow: "hidden",
      }
    : { color: colors.inactiveText };

  const handleMouseEnter = (e) => {
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

  return (
    <div
      className={`flex items-center gap-1.5 ${indent} pr-1.5 rounded-md ${ITEM_HEIGHT} cursor-pointer select-none transition-colors duration-150`}
      style={rowStyle}
      // Marker for the sidebar scroll-reveal — the container scrolls the
      // active row into view after route changes / auto-opens.
      data-sidebar-active={active ? "true" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: "-150%",
            width: "60%",
            height: "100%",
            background:
              `linear-gradient(120deg, transparent, ${colors.shine}, transparent)`,
            animation: "submenu-shine 2.8s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <span
        className="w-1 h-1 rounded-full flex-shrink-0"
        style={{
          backgroundColor: active ? colors.dotActive : colors.dotInactive,
          position: "relative",
          zIndex: 1,
        }}
      />
      <span
        className={`flex-1 truncate text-[11.5px] ${active ? "font-medium" : ""}`}
        style={{ position: "relative", zIndex: 1 }}
      >
        {label}
      </span>
      {countLoading ? (
        <DotSpinner scale={0.28} />
      ) : (
        <div
          className="flex items-center gap-1 flex-shrink-0"
          style={{ position: "relative", zIndex: 1 }}
        >
          {redCount > 0 && (
            <span
              className="text-[9px] font-medium rounded-full px-1 leading-[15px] min-w-[15px] text-center"
              style={{
                backgroundColor: colors.redBadgeBg,
                color: colors.redBadgeText,
              }}
            >
              {redCount}
            </span>
          )}
          {orangeCount > 0 && (
            <span
              className="text-[9px] font-medium rounded-full px-1 leading-[15px] min-w-[15px] text-center"
              style={{
                backgroundColor: colors.orangeBadgeBg,
                color: colors.orangeBadgeText,
              }}
            >
              {orangeCount}
            </span>
          )}
          {count > 0 && (
            <span
              className="text-[9px] font-medium rounded-full px-1 leading-[15px] min-w-[15px] text-center"
              style={{
                backgroundColor: active
                  ? colors.badgeActiveBg
                  : colors.badgeInactiveBg,
                color: active
                  ? colors.badgeActiveText
                  : colors.badgeInactiveText,
              }}
            >
              {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarSubmenu;
