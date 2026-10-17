import React, { Suspense, useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Sidebar from "./Sidebar";
import PageChunkErrorBoundary from "../../../../../ui/error-boundary/PageChunkErrorBoundary";
import CookieNotice from "../../../../../ui/auth/CookieNotice";
import getThemeColors from "../../../../../../utils/style/getThemeColors";

const useColors = (c) => ({
  layoutBg: c.slate.outerBg,
});

function Layout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleCollapse = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);

  return (
    <>
      {/* items-stretch makes sidebar fill full height — DO NOT CHANGE */}
      <div
        className="flex items-stretch h-screen w-full overflow-hidden py-2 pl-2 gap-1"
        style={{ backgroundColor: colors.layoutBg }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          toggleCollapse={toggleCollapse}
        />
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <main className="flex-1 min-w-0 overflow-auto">
            {/* Route code-split: only the page chunk loads, the shell above
                (sidebar/header) stays mounted while it downloads.
                fallback={null} — React Router runs navigations inside
                startTransition, so the PREVIOUS page stays visible until the
                new one is ready; each page then shows its own skeleton for
                data. */}
            <PageChunkErrorBoundary>
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </PageChunkErrorBoundary>
          </main>
        </div>
      </div>

      {/* Post-login cookie bar — fixed to the viewport bottom, so it sits
          outside the flex shell; unmounts itself once accepted. */}
      <CookieNotice />
    </>
  );
}

export default Layout;