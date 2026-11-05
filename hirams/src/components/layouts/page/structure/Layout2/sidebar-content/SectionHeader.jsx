import React, { useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import getThemeColors from "../../../../../../utils/style/getThemeColors";

const useColors = (c) => ({
  label: c.gray.textDisabled,
  chevron: c.gray.textMuted,
  hoverOverlay: c.slate.hoverOverlay,
});

/**
 * Section title. When `onToggle` is given, the title becomes a switch for
 * everything under it (chevron ▸ hidden / ▾ shown, choice is persisted by
 * useSectionToggle). Without it, it stays a plain label.
 */
const SectionHeader = ({
  label,
  open = true,
  onToggle,
  collapsed,
  forceExpanded,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useMemo(() => useColors(base), [base]);
  const [hovered, setHovered] = useState(false);

  if (collapsed && !forceExpanded) return null;

  const canToggle = typeof onToggle === "function";
  const highlight = canToggle && hovered ? c.hoverOverlay : "transparent";

  const handleKeyDown = (e) => {
    if (!canToggle) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 w-full px-2 py-1.5 select-none transition-colors"
      style={{
        cursor: canToggle ? "pointer" : "default",
        borderRadius: 6,
        background: highlight,
      }}
      onClick={canToggle ? onToggle : undefined}
      onKeyDown={handleKeyDown}
      onMouseEnter={canToggle ? () => setHovered(true) : undefined}
      onMouseLeave={canToggle ? () => setHovered(false) : undefined}
      onFocus={canToggle ? () => setHovered(true) : undefined}
      onBlur={canToggle ? () => setHovered(false) : undefined}
      role={canToggle ? "button" : undefined}
      tabIndex={canToggle ? 0 : undefined}
      aria-expanded={canToggle ? open : undefined}
      title={canToggle ? (open ? `Hide ${label}` : `Show ${label}`) : undefined}
    >
      <span
        className="uppercase text-[10px] tracking-wider whitespace-nowrap"
        style={{ color: c.label }}
      >
        {label}
      </span>
      {canToggle && (
        <span
          className="ml-auto flex items-center"
          style={{ color: c.chevron }}
          aria-hidden="true"
        >
          {open ? (
            <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
          ) : (
            <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
          )}
        </span>
      )}
    </div>
  );
};

export default SectionHeader;
