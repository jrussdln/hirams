import React from "react";
import {
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Settings,
  PersonOutline as Person,
  History,
  Security,
  Tune,
  Storage as StorageIcon,
} from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import getThemeColors from "../../../utils/style/getThemeColors";
import AccountPanel from "./components/AccountPanel.jsx";
import StoragePanel from "./components/StoragePanel.jsx";
import GeneralPanel from "./components/GeneralPanel.jsx";


// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — pulls ONLY tokens THIS component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  pageBg: c.slate.outerBg,
  cardBg: c.slate.btnBg,
  border: c.slate.border,
  textSecondary: c.gray.textSecondary,
  textPrimary: c.gray.textPrimary,
  textDisabled: c.gray.textDisabled,
  rowHover: c.slate.hover,
  activeBg: c.blue?.bg || "rgba(37,99,235,0.1)",
  activeText: c.blue?.text || "#2563EB",
  shadow: `0 1px 2px ${c.shadow.hairline}`,
  rounded: "0.5rem",
});

// ─────────────────────────────────────────────────────────────────────
// PLACEHOLDER PANEL — reused for tabs not yet implemented
// ─────────────────────────────────────────────────────────────────────
function ComingSoonPanel({ colors, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Settings sx={{ fontSize: 40, color: colors.textDisabled }} />
      <p
        className="text-[13px] font-medium"
        style={{ color: colors.textSecondary }}
      >
        {label} — coming soon
      </p>
      <p className="text-[12px]" style={{ color: colors.textDisabled }}>
        This section is under construction.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────────────────────────────
export default function SettingsView({
  search,
  setSearch,
  tab,
  handleTabChange,
}) {
  // ✅ Standardized color wiring
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const tabItems = [
    { label: "General", value: "general", icon: <Settings fontSize="small" /> },
    { label: "Account", value: "account", icon: <Person fontSize="small" /> },
    { label: "User Activities", value: "users", icon: <History fontSize="small" /> },
    { label: "Audit Logs", value: "audit", icon: <Security fontSize="small" /> },
    { label: "Preferences", value: "preferences", icon: <Tune fontSize="small" /> },
    { label: "Storage", value: "storage", icon: <StorageIcon fontSize="small" /> },
  ];

  const isSmall = useMediaQuery(theme.breakpoints.down("lg"));
  const panelHeight = "calc(100vh - 100px)";

  return (
    <PageLayout title="Settings" subtitle="Configure system-wide settings">
      {/* Icon rail on small screens; full labelled sidebar from lg up */}
      <div className="grid grid-cols-[auto_1fr] lg:grid-cols-12 gap-2 lg:gap-5 items-stretch">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 flex flex-col">
          <Paper
            elevation={0}
            sx={{
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              boxShadow: colors.shadow,
              borderRadius: colors.rounded,
              overflow: "hidden",
              p: { xs: 0.75, lg: 1.5 },
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              alignItems: { xs: "center", lg: "stretch" },
              width: { xs: "fit-content", lg: "auto" },
              minHeight: { xs: "auto", lg: panelHeight },
              height: { xs: "auto", lg: panelHeight },
            }}
          >
            {tabItems.map((item) => {
              const isActive = tab === item.value;
              const tabButton = (
                <Box
                  onClick={(e) => handleTabChange(e, item.value)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: { xs: "center", lg: "flex-start" },
                    gap: 1.5,
                    px: { xs: 1.25, lg: 2 },
                    py: { xs: 1.25, lg: 1.25 },
                    width: { xs: 48, lg: "auto" },
                    height: { xs: 48, lg: "auto" },
                    borderRadius: 1.5,
                    cursor: "pointer",
                    backgroundColor: isActive ? colors.activeBg : "transparent",
                    color: isActive ? colors.activeText : colors.textSecondary,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: isActive ? colors.activeBg : colors.rowHover,
                      color: isActive ? colors.activeText : colors.textPrimary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", color: isActive ? colors.activeText : "inherit" }}>
                    {item.icon}
                  </Box>
                  <Typography
                    sx={{
                      display: { xs: "none", lg: "block" },
                      fontSize: 13,
                      fontWeight: "inherit",
                      color: "inherit",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );

              // Icon-only on small screens — the tooltip carries the label there.
              return isSmall ? (
                <Tooltip
                  key={item.value}
                  title={item.label}
                  placement="right"
                  arrow
                >
                  {tabButton}
                </Tooltip>
              ) : (
                <React.Fragment key={item.value}>{tabButton}</React.Fragment>
              );
            })}
          </Paper>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 flex flex-col min-w-0">
          <Paper
            elevation={0}
            sx={{
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              boxShadow: colors.shadow,
              borderRadius: colors.rounded,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: panelHeight,
              height: panelHeight,
            }}
          >
            <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
              {tab === "account" && <AccountPanel />}
              {tab === "storage" && <StoragePanel />}
              {tab === "general" && <GeneralPanel />}
              {tab === "users" && (
                <ComingSoonPanel colors={colors} label="User Activities" />
              )}
              {tab === "audit" && (
                <ComingSoonPanel colors={colors} label="Audit Logs" />
              )}
              {tab === "preferences" && (
                <ComingSoonPanel colors={colors} label="Preferences" />
              )}
            </Box>
          </Paper>
        </div>
      </div>
    </PageLayout>
  );
}
