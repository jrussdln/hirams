import React, { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import SidebarContent from "../sidebar/SidebarContent";
import getThemeColors from "../../../../../../utils/style/getThemeColors";

// ─────────────────────────────────────────────────────────────────
// PROMPT 1 — useColors(c): ONLY tokens from getThemeColors map
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  sidebarBg: c.slate.outerBg,
  borderColor: c.slate.border,
  overlayBg: c.slate.overlay,
});

const Sidebar = ({ collapsed, mobileOpen, setMobileOpen, toggleCollapse }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ✅ Wired EXACTLY as PROMPT 1 specifies
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:flex rounded-xl overflow-hidden border flex-shrink-0 transition-all duration-300"
        style={{
          height: "calc(100vh - 1rem)",
          width: collapsed ? "3.5rem" : "15rem",
          backgroundColor: colors.sidebarBg,
          borderColor: colors.borderColor,
        }}
      >
        <SidebarContent collapsed={collapsed} toggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile — no collapsed rail anymore: the full sidebar opens as an
          overlay from the page layout's header button (mobile_sidebar_open
          event, answered in layout/Layout.jsx). */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0"
            style={{ backgroundColor: colors.overlayBg }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="relative z-50 rounded-xl overflow-hidden border flex flex-col shadow-lg m-2"
            style={{
              height: "calc(100vh - 1rem)",
              width: "15rem",
              backgroundColor: colors.sidebarBg,
              borderColor: colors.borderColor,
            }}
          >
            <SidebarContent
              collapsed={false}
              forceExpanded
              toggleCollapse={() => setMobileOpen(false)}
              onItemClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
