import React from "react";
import { useTheme, Box, Typography, Paper } from "@mui/material";
import {
  Settings,
  HelpOutline,
  PersonOutline as Person,
  History,
  Security,
  Tune,
  Storage as StorageIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layouts/page/content-page";
import getThemeColors from "../../../utils/style/getThemeColors";
import AccountPanel from "./components/AccountPanel.jsx";
import StoragePanel from "./components/StoragePanel.jsx";
import BaseButton from "../../../components/ui/form/BaseButton.jsx";

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
  const navigate = useNavigate();

  const tabItems = [
    { label: "General", value: "general", icon: <Settings fontSize="small" /> },
    { label: "Account", value: "account", icon: <Person fontSize="small" /> },
    { label: "User Activities", value: "users", icon: <History fontSize="small" /> },
    { label: "Audit Logs", value: "audit", icon: <Security fontSize="small" /> },
    { label: "Preferences", value: "preferences", icon: <Tune fontSize="small" /> },
    { label: "Storage", value: "storage", icon: <StorageIcon fontSize="small" /> },
  ];

  const panelHeight = "calc(100vh - 100px)";

  return (
    <PageLayout title="Settings" subtitle="Configure system-wide settings">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
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
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              minHeight: panelHeight,
              height: panelHeight,
            }}
          >
            {tabItems.map((item) => {
              const isActive = tab === item.value;
              return (
                <Box
                  key={item.value}
                  onClick={(e) => handleTabChange(e, item.value)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
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
                  <Typography sx={{ fontSize: 13, fontWeight: "inherit", color: "inherit" }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 flex flex-col">
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
              {tab === "general" && (
                <Box sx={{ p: 3 }}>
                  <ComingSoonPanel colors={colors} label="General" />
                  {/* Help & Support Context Container */}
                  <section
                    className="mt-6 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    style={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.border}`,
                      boxShadow: colors.shadow,
                      borderRadius: colors.rounded,
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="p-2.5 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: base.blue?.bg || "rgba(37,99,235,0.1)",
                          color: base.blue?.text || "#2563EB",
                        }}
                      >
                        <HelpOutline sx={{ fontSize: 22 }} />
                      </div>
                      <div>
                        <h3
                          className="text-[14px] font-semibold mb-0.5"
                          style={{ color: colors.textPrimary }}
                        >
                          Help & Support Center
                        </h3>
                        <p
                          className="text-[12px] leading-relaxed max-w-2xl"
                          style={{ color: colors.textSecondary }}
                        >
                          Need assistance with system workflows, user roles, or troubleshooting? Access documentation, guides, and support resources to help you navigate HIRAMS efficiently.
                        </p>
                      </div>
                    </div>
                    <BaseButton
                      label="View Documentation"
                      onClick={() => navigate("/help")}
                      variant="outlined"
                      size="small"
                    />
                  </section>
                </Box>
              )}
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
