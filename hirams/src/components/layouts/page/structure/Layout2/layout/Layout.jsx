import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Sidebar from "./Sidebar";
import PageChunkErrorBoundary from "../../../../../ui/error-boundary/PageChunkErrorBoundary";
import getThemeColors from "../../../../../../utils/style/getThemeColors";

const useColors = (c) => ({
  // The shell strips' background — the aurora gradient from the system
  // group (same family as the maintenance screen). NOTE: it rides on
  // `background` in the JSX, not backgroundColor — a CSS gradient is not a
  // single color.
  shellBg: c.system.shellBg,
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

  // Mobile: the sidebar strip no longer renders on small screens, so the
  // page layout's header button (inside the Outlet) opens the overlay —
  // wired through the same window event the rest of the app uses.
  useEffect(() => {
    const handler = () => setMobileSidebarOpen((v) => !v);
    window.addEventListener("mobile_sidebar_open", handler);
    return () => window.removeEventListener("mobile_sidebar_open", handler);
  }, []);

  return (
    <>
      {/* items-stretch makes sidebar fill full height — DO NOT CHANGE */}
      <div
        className="flex items-stretch h-screen w-full overflow-hidden py-2 pl-2 gap-1"
        style={{ background: colors.shellBg }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          toggleCollapse={toggleCollapse}
        />
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
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
    </>
  );
}

export default Layout;