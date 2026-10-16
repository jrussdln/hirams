import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../utils/style/getThemeColors";

// ── INLINE COLOR MAP - per-file useColors pattern ──────────────────
// Decorative indigo→violet poster palette, held in the `decor` token group.
const useColors = (c) => ({
  pageBg: c.decor.pageBg,
  orbIndigo: c.decor.orbIndigo,
  orbViolet: c.decor.orbViolet,
  orbPink: c.decor.orbPink,
  cardBg: c.decor.cardBg,
  cardBorder: c.decor.cardBorder,
  cardShadow: c.decor.cardShadow,
  pulseRing: c.decor.pulseRing,
  pulseRingSoft: c.decor.pulseRingSoft,
  iconBg: c.decor.iconBg,
  iconBorder: c.decor.iconBorder,
  iconStroke: c.decor.iconStroke,
  shimmerText: c.decor.shimmerText,
  title: c.decor.title,
  desc: c.slate.mutedColor,
  chipText: c.decor.chipText,
  chipBg: c.decor.chipBg,
  chipBorder: c.decor.chipBorder,
  divider: c.decor.divider,
  btnBg: c.decor.btnBg,
  btnBgHover: c.decor.btnBgHover,
  btnText: c.gray.textOnFill,
  btnShadow: c.decor.btnShadow,
  btnShadowHover: c.decor.btnShadowHover,
  footNote: c.gray.textMuted,
});

export default function RoutePermission() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  // Called directly rather than inside useMemo: `useColors` is a plain factory,
  // and wrapping it trips react-hooks/rules-of-hooks.
  const colors = useColors(base);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Georgia', serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Soft background orbs */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: colors.orbIndigo,
          top: "-150px",
          left: "-150px",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: colors.orbViolet,
          bottom: "-100px",
          right: "-100px",
          animation: "float 6s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: colors.orbPink,
          top: "40%",
          right: "15%",
          animation: "float 10s ease-in-out infinite 2s",
        }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .go-back-btn:hover {
          background: ${colors.btnBgHover} !important;
          transform: translateY(-2px) !important;
          box-shadow: ${colors.btnShadowHover} !important;
        }
        .go-back-btn:active {
          transform: translateY(0px) !important;
        }
      `}</style>

      <div
        style={{
          position: "relative",
          background: colors.cardBg,
          backdropFilter: "blur(24px)",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "24px",
          padding: "52px 44px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxShadow: colors.cardShadow,
          animation: mounted ? "fadeUp 0.7s ease forwards" : "none",
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* Icon with pulse rings */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${colors.pulseRing}`,
              animation: "pulseRing 2s ease-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${colors.pulseRingSoft}`,
              animation: "pulseRing 2s ease-out infinite 0.5s",
            }}
          />
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: colors.iconBg,
              border: `1px solid ${colors.iconBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.iconStroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Error badge */}
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.7rem",
            fontWeight: 500,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "12px",
            background: colors.shimmerText,
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}
        >
          Error 403 · Access Denied
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.9rem",
            fontWeight: 700,
            color: colors.title,
            margin: "0 0 16px 0",
            lineHeight: 1.2,
            letterSpacing: "-0.3px",
          }}
        >
          Access Not Available
        </h1>

        {/* Description */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem",
            color: colors.desc,
            lineHeight: 1.7,
            margin: "0 0 12px 0",
            fontWeight: 300,
          }}
        >
          The page you're trying to access is not available for your current
          login status or role.
        </p>

        {/* Info chips */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
            margin: "24px 0 32px 0",
          }}
        >
          {["Insufficient Permissions", "Role Restricted", "Auth Required"].map(
            (tag, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: colors.chipText,
                  background: colors.chipBg,
                  border: `1px solid ${colors.chipBorder}`,
                  borderRadius: "99px",
                  padding: "4px 12px",
                  letterSpacing: "0.3px",
                  animation: `fadeUp 0.5s ease forwards ${0.2 + i * 0.1}s`,
                  opacity: 0,
                }}
              >
                {tag}
              </span>
            ),
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: colors.divider,
            marginBottom: "28px",
          }}
        />

        {/* Button */}
        <button
          onClick={() => {
            navigate("/login");
          }}
          style={{
            width: "100%",
            padding: "14px",
            background: colors.btnBg,
            color: colors.btnText,
            border: "none",
            borderRadius: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.3px",
            transition: "all 0.25s ease",
            boxShadow: colors.btnShadow,
          }}
        >
          ← Go Back / Login
        </button>

        {/* Footer note */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.72rem",
            color: colors.footNote,
            marginTop: "20px",
            marginBottom: 0,
            fontWeight: 300,
          }}
        >
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}