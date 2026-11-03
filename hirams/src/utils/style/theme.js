// src/utils/style/theme.js
//
// This app has two styling systems: MUI's theme (drives every MUI component)
// and getThemeColors() (drives everything hand-styled). getThemeColors is the
// SINGLE SOURCE OF TRUTH — this file only reshapes it into MUI's palette.
//
// It used to hold its own hand-copied literals (#1a1a1a, #f5f5f5, #1e1e1e…),
// which is how MUI components drifted onto a different palette than the rest
// of the app. Do not add colour literals here — add them to getThemeColors.
import getThemeColors from "./getThemeColors";

// ── Colour maths ─────────────────────────────────────────────────────────
// Some slate tokens are deliberately TRANSLUCENT so they can layer over each
// other in the DOM — that layering is what gives dark mode its depth. MUI
// needs concrete colours, so we pre-composite each token exactly the way the
// browser composites it. A MUI Paper and a hand-styled card then resolve to
// the identical pixel instead of two subtly different greys.

const parseColor = (value) => {
  const v = String(value).trim();

  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? hex.split("").map((ch) => ch + ch).join("")
        : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }

  const match = v.match(/^rgba?\(([^)]+)\)$/);
  if (match) {
    const [r, g, b, a = "1"] = match[1].split(",").map((part) => part.trim());
    return { r: +r, g: +g, b: +b, a: +a };
  }

  // Unrecognised input — treat as opaque black rather than throwing during
  // module evaluation (which would blank the whole app).
  return { r: 0, g: 0, b: 0, a: 1 };
};

const toHex = ({ r, g, b }) =>
  "#" +
  [r, g, b]
    .map((n) =>
      Math.round(Math.min(255, Math.max(0, n)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

/** Composite `fg` over `bg` and return an opaque `#rrggbb` string. */
const flatten = (fg, bg) => {
  const f = parseColor(fg);
  const b = parseColor(bg);
  return toHex({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
  });
};

// Brand navy — single source of truth is the "navy" accent in getThemeColors.
// Uses the LIGHT seed (#0D47A1) in BOTH modes so MUI's default controls
// (Checkbox, Switch, Button, focus rings…) keep the exact navy they had
// before this refactor — no visual drift in either mode.
const brandNavy = getThemeColors(false).navy.textStrong;

export const getDesignTokens = (mode) => {
  const isDark = mode === "dark";
  const c = getThemeColors(isDark);

  // Page surface = slate.outerBg over its own opaque core. Layering a colour
  // over itself is a fixed point (a·T + (1−a)·T === T), so <body> and the
  // Layout's surface land on EXACTLY the same colour — no seam, no
  // double-darkening, even though the token is translucent in dark mode.
  const pageBg = flatten(c.slate.outerBg, c.slate.outerBg);

  // Card surface = slate.btnBg over that same page surface — precisely how
  // every hand-styled card in the app composites. MUI Paper now agrees.
  const paperBg = flatten(c.slate.btnBg, pageBg);

  return {
    palette: {
      mode,
      primary: { main: brandNavy },

      background: {
        default: pageBg,
        paper: paperBg,
      },

      text: {
        primary: c.gray.textPrimary,
        secondary: c.gray.textSecondary,
        disabled: c.gray.textDisabled,
      },

      divider: c.slate.divider,
    },

    typography: {
      fontFamily: "'Inter', 'Roboto', sans-serif",
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 500 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 300 },
    },
  };
};

export default getDesignTokens;

