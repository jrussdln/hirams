import React, { useEffect, useState } from "react";
import { Box, Typography, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useKeysLabels from "../../../hooks/useKeysLabels";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton";
import icons from "../../../utils/style/iconFormatStyles";
import { getPhilippinesTime } from "../../../utils/helpers/timeZone";
import { getItem } from "../../../utils/storage/localStorage";
import getThemeColors from "../../../utils/style/getThemeColors";
import { cardSx } from "./components/overviewStyles";
import ManagementView from "./components/ManagementView";
import ProcurementView from "./components/ProcurementView";
import AOView from "./components/AOView";
import FinanceView from "./components/FinanceView";

// ─── Welcome-banner tokens ─────────────────────────────────────────────────
// The indigo/violet treatment below is decorative and belongs to the banner
// alone, so it lives as one group in getThemeColors (hero.*).
const useColors = (c) => ({
  gradient: c.hero.gradient,
  ring: c.hero.border,
  orbA: c.hero.orbA,
  orbB: c.hero.orbB,
  orbC: c.hero.orbC,
  eyebrow: c.hero.eyebrow,
  pillBg: c.hero.pillBg,
  pillRing: c.hero.pillBorder,
  pillText: c.hero.pillText,
  avatarGradient: c.hero.avatarGradient,
  avatarRing: c.hero.avatarBorder,
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
// The page shell — the welcome banner plus the dashboard body for the signed-in
// role. Every widget moved out to ./components/<Role>View.jsx so each role can
// carry its own set.

export default function Dashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));
  const user = getItem("user");
  const { isManagement, isProcurement, isAccountOfficer, isFinanceOfficer } =
    useKeysLabels();

  // Which ledger the dashboard is showing in full (null = normal dashboard).
  // Lifted here so the welcome banner and Needs Attention can be hidden and
  // the page subtitle can name what is being viewed.
  const [viewingAll, setViewingAll] = useState(null);

  // Live Philippine time, ticking inside the banner.
  const [phTime, setPhTime] = useState(getPhilippinesTime());
  useEffect(() => {
    const updateTime = () => {
      const now = getPhilippinesTime();
      setPhTime(now);
      const delay = 1000 - now.getMilliseconds();
      setTimeout(updateTime, delay);
    };
    updateTime();
  }, []);

  // View All opens a focused ledger view — Back lives in the page footer.
  const footer = viewingAll ? (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-start" }}>
      <BaseButton
        label="Back"
        icon={icons.back}
        actionColor="back"
        tooltip="Back to dashboard"
        onClick={() => setViewingAll(null)}
      />
    </Box>
  ) : false;

  return (
    <PageLayout title={"Dashboard"} subtitle={viewingAll || undefined} footer={footer}>
      <div className="space-y-6">
        {/* Welcome Banner — hidden while a ledger is being viewed in full */}
        {!viewingAll && (
        <Card
          sx={{
            ...cardSx(theme),
            background: colors.gradient,
            overflow: "hidden",
            position: "relative",
            border: `1px solid ${colors.ring}`,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: colors.orbA,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -20,
              right: 60,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: colors.orbB,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 90,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: colors.orbC,
            }}
          />
          <Box
            sx={{
              p: 2.5,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: colors.eyebrow,
                  mb: 0.4,
                }}
              >
                Good{" "}
                {(() => {
                  const nowPH = getPhilippinesTime();
                  const hour = nowPH.getHours();
                  return hour < 12
                    ? "Morning"
                    : hour < 18
                      ? "Afternoon"
                      : "Evening";
                })()}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {user?.strFName ?? "User"} {user?.strLName ?? ""}
              </Typography>
              <Typography
                sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.6 }}
              >
                Here's your overview and performance metrics for this month.
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 1.2,
                  px: 2.2,
                  py: 0.8,
                  bgcolor: colors.pillBg,
                  borderRadius: "20px",
                  border: `1px solid ${colors.pillRing}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: colors.pillText,
                    fontWeight: 500,
                  }}
                >
                  {phTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" — "}
                  {phTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "14px",
                background: colors.avatarGradient,
                border: `1px solid ${colors.avatarRing}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ml: 2,
              }}
            >
              <Typography sx={{ fontSize: "1.6rem" }}>👋</Typography>
            </Box>
          </Box>
        </Card>
        )}

        {/* Role-specific dashboard body — one view per user role */}
        {isManagement && (
          <ManagementView
            viewingAll={viewingAll}
            onViewingAllChange={setViewingAll}
          />
        )}
        {isProcurement && <ProcurementView />}
        {isAccountOfficer && <AOView />}
        {isFinanceOfficer && <FinanceView />}
      </div>
    </PageLayout>
  );
}