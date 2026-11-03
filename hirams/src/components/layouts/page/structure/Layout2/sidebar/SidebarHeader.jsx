import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────
// PROMPT 1 — useColors(c): ONLY tokens from getThemeColors map
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
});

const SidebarHeader = ({ collapsed, forceExpanded = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  // ✅ Wired EXACTLY as PROMPT 1 specifies
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const showFull = forceExpanded || !collapsed;
  const logoSrc = `${import.meta.env.BASE_URL}images/hirams-icon-square.png`;

  return (
    <div
      className="flex items-center w-full px-0.5 py-0.5 h-9 gap-1 cursor-pointer select-none hover:opacity-80"
      style={{
        justifyContent: showFull ? "flex-start" : "center",
        transition: "all 0.3s ease-in-out",
      }}
      role="button"
      tabIndex={0}
      aria-label="Go to dashboard"
      onClick={() => navigate("/dashboard")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/dashboard");
        }
      }}
    >
      <img
        src={logoSrc}
        alt="HIRAMS Logo"
        className="object-contain"
        style={{
          width: showFull ? "1.75rem" : "1.5rem",
          height: showFull ? "1.75rem" : "1.5rem",
          flexShrink: 0,
          transition: "all 0.3s ease-in-out",
        }}
      />
      {showFull && (
        <div
          className="flex flex-col justify-center leading-tight min-w-0"
          style={{
            opacity: 1,
            transform: "translateX(0)",
            transition: "all 0.3s ease-in-out",
          }}
        >
          <span
            className="text-xs font-bold truncate"
            style={{ color: colors.textPrimary }}
          >
            HiRAMS Inc.
          </span>
          <span
            className="text-[0.65rem] font-normal tracking-wide truncate"
            style={{ color: colors.textSecondary }}
          >
            E-COMMERCE WEBSITE
          </span>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;
