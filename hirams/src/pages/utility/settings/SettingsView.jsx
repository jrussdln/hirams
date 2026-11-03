import React from "react";
import { useTheme } from "@mui/material";
import { Tabs, Tab } from "@mui/material";
import { Settings } from "@mui/icons-material";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomSearchField from "../../../components/ui/form/SearchField";
import getThemeColors from "../../../utils/style/getThemeColors";
import AccountPanel from "./components/AccountPanel.jsx";

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

  return (
    <PageLayout title="Settings" subtitle="Configure system-wide settings">
      <section
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
          borderRadius: colors.rounded,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            borderBottom: `1px solid ${colors.border}`,
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontSize: 13 },
          }}
        >
          <Tab label="General" value="general" />
          <Tab label="Account" value="account" />
          <Tab label="User Activities" value="users" />
          <Tab label="Audit Logs" value="audit" />
          <Tab label="Preferences" value="preferences" />
        </Tabs>

        {/* Tab content */}
        {tab === "account" && <AccountPanel />}
        {tab === "general" && (
          <ComingSoonPanel colors={colors} label="General" />
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
      </section>
    </PageLayout>
  );
}
