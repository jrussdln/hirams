// overview/components/NeedsAttentionBanner.jsx
// The amber strip under the welcome banner — shared by every role
// dashboard that has something needing a human (Management: clients,
// suppliers, carts; Finance: carts, Procurement: txn-verif, price-verif).
// Renders ONLY when `items` is non-empty; each entry carries its own count
// and jumps straight to the page (pre-filtered) that resolves it.
import React from "react";
import { Box, Typography, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion as Motion } from "framer-motion";
import { WarningAmberRounded, ChevronRight } from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors";
import { cardSx, cardVariants } from "./overviewStyles";

const useColors = (c) => ({
  warn: {
    bg: c.amber.warnBg,
    border: c.amber.warnBorder,
    text: c.amber.warnText,
    hoverBg: c.amber.warnHoverBg,
    surface: c.amber.surface,
    signalBorder: c.amber.signalBorder,
    signalText: c.amber.signalText,
  },
});

export default function NeedsAttentionBanner({ items, theme: themeProp }) {
  const themeFromContext = useTheme();
  const theme = themeProp ?? themeFromContext;
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));
  const totalCount = items.reduce((acc, item) => acc + (Number(item.count) || 0), 0);
  if (!items.length) return null;

  return (
    <Motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      style={{ height: "100%" }}
    >
      <Card
        sx={{
          ...cardSx(theme),
          border: `1px solid ${colors.warn.border}`,
          background: colors.warn.bg,
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            background: colors.warn.signalText,
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Signal badge — the amber warning mark with pulse effect */}
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "12px",
              background: colors.warn.surface,
              border: `1px solid ${colors.warn.signalBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.05)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            <WarningAmberRounded
              sx={{ color: colors.warn.signalText, fontSize: 22 }}
            />
          </Box>

          <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: colors.warn.text,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
              }}
            >
              Needs Attention {totalCount > 0 && `(${totalCount})`}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
              Waiting on a decision — review them before they pile up.
            </Typography>
          </Box>

          {/* Entries — one clickable pill per attention item */}
          <Box sx={{ ml: "auto", display: "flex", gap: 1.25, flexWrap: "wrap" }}>
            {items.map((item) => (
              <Box
                key={item.key}
                onClick={item.onClick}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 0.85,
                  py: 0.85,
                  borderRadius: "12px",
                  background: colors.warn.surface,
                  border: `1px solid ${colors.warn.signalBorder}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  "&:hover": {
                    background: colors.warn.hoverBg,
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                    borderColor: colors.warn.signalText,
                  },
                }}
              >
                <Box
                  sx={{
                    minWidth: 20,
                    height: 20,
                    px: 0.75,
                    borderRadius: "6px",
                    background: colors.warn.signalText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    {item.count}
                  </Typography>
                </Box>
                {(() => {
                  const words = (item.label || "").split(" ");
                  const first = words[0] || "";
                  const rest = words.slice(1).join(" ");
                  return (
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color: colors.warn.text,
                          textTransform: "uppercase",
                          lineHeight: 1.05,
                        }}
                      >
                        {first}
                      </Typography>
                      {rest && (
                        <Typography
                          sx={{
                            fontSize: "0.5rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                            lineHeight: 1.05,
                          }}
                        >
                          {rest}
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
                <ChevronRight
                  sx={{ fontSize: 16, color: colors.warn.signalText, opacity: 0.8 }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Card>
    </Motion.div>
  );
}
