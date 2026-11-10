const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
};

const rgba = (hex, alpha) => `rgba(${hexToRgb(hex)},${alpha})`;

/**
 * Generate a full, balanced token set for one accent color from a single
 * "seed" hue, given as a light-mode-friendly hex and a dark-mode-friendly
 * hex (dark mode wants a lighter/more saturated hue so it reads on dark
 * backgrounds).
 *
 * @param {string} lightHex - hex used to derive LIGHT-mode text/tint colors
 * @param {string} darkHex  - hex used to derive DARK-mode text/tint colors
 */
const makeAccent = (lightHex, darkHex) => (isDark) => {
  const hex = isDark ? darkHex : lightHex;
  return isDark
    ? {
        bg: rgba(hex, 0.15),
        bgSoft: rgba(hex, 0.1),
        border: rgba(hex, 0.35),
        borderStrong: rgba(hex, 0.55),
        text: hex,
        textStrong: hex,
        ring: hex,
        hover: rgba(hex, 0.22),
        active: rgba(hex, 0.32),
      }
    : {
        // ✅ Balanced for light mode — visible but not muddy
        bg: rgba(hex, 0.12),
        bgSoft: rgba(hex, 0.07),
        border: rgba(hex, 0.35),
        borderStrong: rgba(hex, 0.55),
        text: hex,
        textStrong: hex,
        ring: hex,
        hover: rgba(hex, 0.2),
        active: rgba(hex, 0.28),
      };
};
// Seed hues: [lightModeHex, darkModeHex]
// lightModeHex should read well as TEXT on a white bg.
// darkModeHex should read well as TEXT on a dark bg (usually lighter/more saturated).
const ACCENT_SEEDS = {
  navy: ["#0D47A1", "#64B5F6"], // brand color (was theme.palette.primary.main); dark seed lightened so it reads on dark bg
  blue: ["#2563EB", "#93C5FD"], // slightly darker for better contrast in light mode
  indigo: ["#4338CA", "#A5B4FC"],
  purple: ["#5B21B6", "#A5B4FC"],
  violet: ["#7C3AED", "#C4B5FD"],
  orange: ["#C2410C", "#FB923C"],
  amber: ["#B45309", "#FBBF24"],
  yellow: ["#A16207", "#FDE68A"],
  green: ["#16A34A", "#4ADE80"],
  red: ["#DC2626", "#F87171"],
  teal: ["#0D9488", "#5EEAD4"],
  cyan: ["#0891B2", "#67E8F9"],
  pink: ["#BE185D", "#F9A8D4"],
};

/**
 * Build every accent color's token set for the given mode.
 */
const buildAccents = (isDark) => {
  const accents = {};
  for (const [name, [lightHex, darkHex]] of Object.entries(ACCENT_SEEDS)) {
    accents[name] = makeAccent(lightHex, darkHex)(isDark);
  }
  return accents;
};

export const getThemeColors = (isDark) => {
  const accents = buildAccents(isDark);

  return {
    // ═══════════════════════════════════════════════════════════════════
    // SKELETON — plain neutral shades for loading states
    // ═══════════════════════════════════════════════════════════════════
    skeleton: {
      strong: isDark ? "rgba(148,163,184,0.5)" : "#6B7280",
      base: isDark ? "rgba(100,116,139,0.4)" : "#9CA3AF",
      soft: isDark ? "rgba(71,85,105,0.3)" : "#E5E7EB",
      overlay: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      skelLight: isDark ? "rgba(51,65,85,0.9)" : "#E5E7EB",
      skelMed: isDark ? "rgba(71,85,105,0.9)" : "#D1D5DB",
      skelFaint: isDark ? "rgba(84,102,125,0.8)" : "#E5E7EB",

      // ── Plain neutrals for loader/Skeleton.jsx ─────────────────────────
      // Deliberately HUE-FREE (pure gray / white): a loading skeleton must
      // never carry an accent tint, and dark mode uses gray-900-family
      // neutrals rather than the slate/navy surfaces used by real UI.
      paper: isDark ? "#111827" : "#FFFFFF",
      panel: isDark ? "rgba(31,41,55,0.6)" : "#F9FAFB",
      panelAlt: isDark ? "rgba(42,48,60,0.6)" : "#F3F4F6",
      accentRule: isDark ? "rgba(148,163,184,0.45)" : "#CBD5E1",
      rule: isDark ? "rgba(55,65,81,0.55)" : "#E5E7EB",
      ruleSoft: isDark ? "rgba(47,56,70,0.55)" : "#F3F4F6",
      bar: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
      barFaint: isDark ? "rgba(255,255,255,0.06)" : "#EEF0F2",
      headGradient: isDark
        ? "linear-gradient(135deg, #1F2937 0%, #1F2937 100%)"
        : "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
      // sweeping shimmer band used by inline loading bars. Plain neutrals
      // only - a loading state must never carry an accent tint.
      shimmerBar: isDark
        ? "linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%)"
        : "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // SLATE — structural surfaces: borders, dividers, cards, panels, hovers
    // ═══════════════════════════════════════════════════════════════════
    slate: {
      // borders / dividers
      border: isDark ? "rgba(148,163,184,0.15)" : "#D1D5DB",
      borderLight: isDark ? "rgba(148,163,184,0.2)" : "#E5E7EB",
      borderRow: isDark ? "rgba(148,163,184,0.1)" : "#E5E7EB",
      divider: isDark ? "rgba(148,163,184,0.1)" : "#E5E7EB",

      // hovers
      hover: isDark ? "rgba(30,41,59,0.5)" : "#F3F4F6",
      itemHover: isDark ? "rgba(30,41,59,0.5)" : "#E5E7EB",

      // card / panel surfaces
      itemHeaderBg: isDark ? "rgba(30,41,59,0.5)" : "#F8FAFC",
      expandedBg: isDark ? "rgba(30,41,59,0.4)" : "#F1F5F9",
      outerBg: isDark ? "rgba(15,23,42,0.5)" : "#FFFFFF",
      innerBg: isDark ? "rgba(30,41,59,0.4)" : "#F1F5F9",
      totalBg: isDark ? "rgba(30,41,59,0.3)" : "#F8FAFC",
      totalBorder: isDark ? "rgba(148,163,184,0.45)" : "#CBD5E1",
      stripeBg: isDark ? "rgba(148,163,184,0.06)" : "#F1F5F9",
      stripeAltBg: isDark ? "rgba(148,163,184,0.04)" : "#F8FAFC",
      // frosted card surface (CardStructure's cardBg)
      cardGlass: isDark ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.55)",
      // 1px ring drawn around the status Stamp on a cart card — a white
      // highlight in light mode, a dark navy in dark mode
      stampRing: isDark ? "rgba(15,23,42,0.4)" : "rgba(255,255,255,0.7)",
      // dashboard: unfilled stage bar + row-hover + mini progress track
      stageTrack: isDark ? "rgba(30, 41, 59, 0.6)" : "#F1F5F9",
      cardHover: isDark ? "rgba(30, 41, 59, 0.4)" : "#F8FAFC",
      progressTrack: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      // left rule on a due-date row that has no status colour of its own
      dueRule: isDark ? "#475569" : "#E2E8F0",
      // header strip behind a purchase-item timeline step (dark mode is a
      // flat fill expressed as a degenerate gradient — kept verbatim so the
      // `background` declaration renders byte-identically)
      stepHeaderBg: isDark
        ? "linear-gradient(135deg,#1e293b 0%,#1e293b 100%)"
        : "linear-gradient(135deg,#fafbff 0%,#f8fafc 100%)",

      // muted chips
      mutedBg: isDark ? "rgba(51,65,85,0.6)" : "#F1F5F9",
      mutedBorder: isDark ? "rgba(71,85,105,0.4)" : "#E2E8F0",
      mutedColor: isDark ? "#94A3B8" : "#64748B",
      mutedText: isDark ? "#94A3B8" : "#64748B",

      // summary block
      summaryBg: isDark ? "rgba(51,65,85,0.55)" : "#EFF2F7",
      summaryBorder: isDark ? "rgba(148,163,184,0.3)" : "#E2E8F0",

      // buttons
      btnBg: isDark ? "rgba(30,41,59,0.8)" : "#FFFFFF",
      btnBorder: isDark ? "rgba(148,163,184,0.35)" : "#CBD5E1",
      btnText: isDark ? "#E2E8F0" : "#1E293B",
      btnHoverBg: isDark ? "rgba(30,41,59,0.95)" : "#F1F5F9",

      // misc
      scrollbarThumb: isDark ? "#475569" : "#CBD5E1",

      // ── Solid (opaque) siblings ──────────────────────────────────────
      // The surface tokens above are deliberately TRANSLUCENT in dark mode
      // so they can layer. Modals must never be see-through, so these are
      // the same colours with their alpha removed.
      outerBgSolid: isDark ? "#0F172A" : "#FFFFFF",
      itemHeaderBgSolid: isDark ? "#1E293B" : "#F8FAFC",

      // ── Overlays / scrims ────────────────────────────────────────────
      // `overlay` was already referenced by Sidebar / ContentHeader but had
      // never been defined — it resolved to undefined and the scrim never
      // rendered. Now it exists.
      overlay: isDark ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.5)",
      backdrop: "rgba(15,23,42,0.25)",
      loadingOverlay: isDark ? "#1E293B" : "rgba(30,41,59,0.05)",

      // ── Effects ──────────────────────────────────────────────────────
      shadowColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(15,23,42,0.16)",
      shine: "rgba(255,255,255,0.35)",
      hoverOverlay: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      // stronger shine sweep (used on the AI chat FAB)
      shineBold: "rgba(255,255,255,0.55)",
      // diagonal shine stripes laid over a solid accent fill — always white
      // in both modes, because it sits on top of a coloured bar
      shineStripe: "rgba(255,255,255,0.2)",
      // the moving highlight inside a shimmer gradient — geometry stays in
      // the component, only the colour lives here
      shimmerColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // GRAY — text hierarchy + plain inputs
    // ═══════════════════════════════════════════════════════════════════
    gray: {
      textPrimary: isDark ? "#E2E8F0" : "#1E293B",
      textSecondary: isDark ? "#94A3B8" : "#64748B",
      textMuted: isDark ? "#9CA3AF" : "#94A3B8",
      textDisabled: isDark ? "#78889F" : "#94A3B8",
      textHeading: isDark ? "#CBD5E1" : "#1E293B",
      label: isDark ? "#CBD5E1" : "#334155",
      inputBg: isDark ? "rgba(30,41,59,0.6)" : "#F8FAFC",
      inputFocusBg: isDark ? "rgba(51,65,85,0.5)" : "#FFFFFF",

      // inline <code> chip background (chatbot markdown)
      codeBg: "rgba(127,127,127,0.15)",
      // foreground for icons/text sitting on a SOLID accent fill
      textOnFill: "#FFFFFF",
      // deliberately fainter than textDisabled — empty-state icons etc.
      textFaint: isDark ? "#475569" : "#CBD5E1",
      // near-black heading ink (slate-950) — darker than textPrimary,
      // used where a heading must read as the darkest thing on screen
      textInk: isDark ? "#E2E8F0" : "#0F172A",
    },

    // ═══════════════════════════════════════════════════════════════════
    // BADGES — quick accent fills, derived from the same accent set
    // ═══════════════════════════════════════════════════════════════════
    badge: {
      orangeBg: accents.orange.bg,
      amberBg: accents.amber.bg,
      blueBg: accents.blue.bg,
      redBg: accents.red.bg,
      goldBg: isDark ? "rgba(251,191,36,0.25)" : "#FDE68A",
      amberAltBg: isDark ? "rgba(251,191,36,0.18)" : "#FEF3C7",
      // Plain, neutral status chip — deliberately carries NO status colour.
      // Mode-independent: it sits on a FIXED accent banner (the blue profile
      // banner, the violet account banner, …), never on a themed surface, so
      // what's layered on it can't be theme-aware either.
      plain: {
        bg: "rgba(255,255,255,0.18)",
        text: "#FFFFFF",
        border: "rgba(255,255,255,0.35)",
        // thinner companion used on the violet account banner
        borderSoft: "rgba(255,255,255,0.28)",
      },
    },

    // ═══════════════════════════════════════════════════════════════════
    // ON-ACCENT — white treatments laid over ANY solid accent fill.
    // Accent-AGNOSTIC and mode-INDEPENDENT: they sit on a coloured plate,
    // so only that plate's own colour matters, never the app theme. (The
    // same value exists as blue.bannerAvatarBg for the blue banner; this
    // is the neutral name for use on other accents such as violet.)
    // Colour only (same convention as shadow.*).
    // ═══════════════════════════════════════════════════════════════════
    onAccent: {
      // icon plate on a coloured banner
      plate: "rgba(255,255,255,0.15)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // STANDALONE POSTER PAGES — 404 / 403 / maintenance.
    // These pages carry their own decorative indigo -> violet -> pink palette
    // that is deliberately NOT the app accent set (accents are UI chrome; this
    // is a full-bleed illustration surface). Light values are pinned to the
    // originals so light mode is pixel-identical. Dark values are derived from
    // the app's existing dark surfaces + the indigo/violet/pink DARK seeds
    // (#A5B4FC / #C4B5FD / #F9A8D4) so the poster stops glaring white in dark.
    decor: {
      // full-bleed page wash: indigo-50 -> gray-50 -> violet-50
      pageBg: isDark
        ? "linear-gradient(145deg, #1e1b4b 0%, #0f172a 50%, #2e1065 100%)"
        : "linear-gradient(145deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
      // floating background orbs — alphas nudged up in dark so they still read
      orbIndigo: isDark
        ? "radial-gradient(circle, rgba(165,180,252,0.10) 0%, transparent 70%)"
        : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
      orbViolet: isDark
        ? "radial-gradient(circle, rgba(196,181,253,0.09) 0%, transparent 70%)"
        : "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
      orbPink: isDark
        ? "radial-gradient(circle, rgba(249,168,212,0.08) 0%, transparent 70%)"
        : "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)",
      // frosted card (always rendered with backdropFilter: blur(24px))
      cardBg: isDark ? "rgba(30,41,59,0.85)" : "rgba(255,255,255,0.85)",
      cardBorder: isDark
        ? "rgba(165,180,252,0.18)"
        : "rgba(99,102,241,0.12)",
      // outer glow + a 1px inset top-highlight; the highlight flips from white
      // to slate in dark so it doesn't read as a hard bright edge
      cardShadow: isDark
        ? "0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(148,163,184,0.12) inset"
        : "0 8px 40px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.9) inset",
      // pulse rings around the icon
      pulseRing: isDark ? "rgba(165,180,252,0.35)" : "rgba(99,102,241,0.3)",
      pulseRingSoft: isDark
        ? "rgba(165,180,252,0.18)"
        : "rgba(99,102,241,0.15)",
      // icon plate + its stroke
      iconBg: isDark
        ? "linear-gradient(135deg, rgba(165,180,252,0.12), rgba(196,181,253,0.12))"
        : "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
      iconBorder: isDark
        ? "rgba(165,180,252,0.25)"
        : "rgba(99,102,241,0.2)",
      iconStroke: isDark
        ? "rgba(165,180,252,0.9)"
        : "rgba(99,102,241,0.9)",
      // shimmering "ERROR 404" eyebrow text
      shimmerText: isDark
        ? "linear-gradient(90deg, #a5b4fc, #c4b5fd, #a5b4fc)"
        : "linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)",
      // heading + info chips
      title: isDark ? "#E0E7FF" : "#1e1b4b",
      chipText: isDark ? "#A5B4FC" : "#6366f1",
      chipBg: isDark ? "rgba(165,180,252,0.12)" : "rgba(99,102,241,0.08)",
      chipBorder: isDark
        ? "rgba(165,180,252,0.22)"
        : "rgba(99,102,241,0.18)",
      // hairline divider above the button
      divider: isDark
        ? "linear-gradient(90deg, transparent, rgba(165,180,252,0.2), transparent)"
        : "linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)",
      // primary CTA — light mode deepens on hover, dark mode brightens
      btnBg: isDark
        ? "linear-gradient(135deg, #818cf8, #a78bfa)"
        : "linear-gradient(135deg, #6366f1, #7c3aed)",
      btnBgHover: isDark
        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
        : "linear-gradient(135deg, #4338ca, #7c3aed)",
      btnShadow: isDark
        ? "0 4px 20px rgba(0,0,0,0.4)"
        : "0 4px 20px rgba(99,102,241,0.25)",
      btnShadowHover: isDark
        ? "0 12px 32px rgba(0,0,0,0.5)"
        : "0 12px 32px rgba(99,102,241,0.35)",
    },

    // ACCENT COLORS — fully generated, same token shape for every color:
    //   bg, bgSoft, border, borderStrong, text, textStrong, hover, active
    // ═══════════════════════════════════════════════════════════════════
    navy: {
      ...accents.navy,
      // Auth-screen accent (top bar + page title). Kept as its own literal:
      // it predates the seed system and sits a hair off the navy seed above,
      // so deriving it would visibly shift the login screen.
      authAccent: "#034FA5",
    },
    blue: {
      ...accents.blue,
      // tinted "signal" surfaces + their icon colour (notifications, badges)
      surface: isDark ? "rgba(37,99,235,0.14)" : "#EFF6FF",
      // Header / profile-banner gradient. Mode-INDEPENDENT on purpose: it was
      // copy-pasted across 7 files as `isDark ? G : G` with both branches
      // identical, so a single value reproduces every one of them exactly.
      banner:
        "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)",
      // Foreground treatments that sit ON that banner. Also mode-independent -
      // the banner never changes, so neither can what's layered over it.
      // COLOUR ONLY (same convention as shadow.*): border/box-shadow geometry
      // stays in the component, e.g. `2.5px solid ${c.blue.bannerRing}`.
      bannerRing: "rgba(255,255,255,0.4)",
      bannerRingSoft: "rgba(255,255,255,0.25)",
      bannerAvatarBg: "rgba(255,255,255,0.15)",
      bannerShadow: "rgba(0,0,0,0.2)",
      bannerChipShadow: "rgba(0,0,0,0.18)",
      // Text-on-banner ladder, strongest first — all mode-INDEPENDENT
      // (white over the blue gradient reads the same in both themes):
      //   High .85 · Med .80 · Soft .75 · Muted .70 · Faint .60
      bannerTextHigh: "rgba(255,255,255,0.85)",
      bannerTextMed: "rgba(255,255,255,0.8)",
      bannerTextSoft: "rgba(255,255,255,0.75)",
      bannerTextMuted: "rgba(255,255,255,0.7)",
      bannerTextFaint: "rgba(255,255,255,0.6)",
      // Text on the tinted blue table header: LIGHT mode is white on the
      // saturated fill, DARK mode stays on the softer ink used everywhere
      // else (== gray.textPrimary's dark value).
      headerText: isDark ? "#E2E8F0" : "#FFFFFF",
      // hairline under the export-preview block
      previewDivider: isDark
        ? "rgba(96,165,250,0.15)"
        : accents.blue.bgSoft,
      // ProgressBar fill gradient (active / in-progress)
      progressGradient: isDark
        ? "linear-gradient(90deg,#1e40af,#60a5fa)"
        : "linear-gradient(90deg,#1d4ed8,#3b82f6)",
      // dashboard "count" chip (active total, selected year)
      infoChipBg: isDark ? "rgba(30, 64, 175, 0.4)" : "#E3F2FD",
      infoChipText: isDark ? "#BFDBFE" : "#1565C0",
      // Filled state of a segmented tab (PricingView). Mode-INDEPENDENT on
      // purpose — the original pinned one navy for both themes.
      tabActive: "#1565C0",
    },
    indigo: accents.indigo,
    purple: accents.purple,
    violet: accents.violet,
    orange: accents.orange,
    amber: {
      ...accents.amber,
      // extra semantic aliases kept for backwards compatibility
      textDark: isDark ? "#FEF08A" : "#78350F",
      value: isDark ? "#FEF08A" : "#78350F",
      warnBg: isDark ? "rgba(245,158,11,0.12)" : "#FEF3C7",
      warnBorder: isDark ? "rgba(251,191,36,0.35)" : "#F59E0B",
      warnText: isDark ? "#FCD34D" : "#92400E",
      warnHoverBg: isDark ? "rgba(245,158,11,0.2)" : "#FED7AA",
      // signal circle (warning icon badge) — light pinned to originals
      surface: isDark ? "rgba(245,158,11,0.14)" : "#FFFBEB",
      signalBorder: isDark ? "rgba(251,191,36,0.45)" : "#FDE68A",
      signalText: isDark ? "#FBBF24" : "#D97706",
    },
    yellow: accents.yellow,
    green: {
      ...accents.green,
      textDark: isDark ? "#BBF7D0" : "#166534",
      hoverBorder: isDark ? "rgba(74,222,128,0.6)" : "#22C55E",
      activeBg: isDark ? "rgba(22,163,74,0.35)" : "#BBF7D0",
      paid: isDark ? "#4ADE80" : "#16A34A",
      paidBorder: isDark ? "rgba(74,222,128,0.5)" : "#16A34A",
      badgeBg: isDark ? "rgba(34,197,94,0.16)" : "rgba(22,163,74,0.15)",
      badgeText: isDark ? "#86EFAC" : "#15803D",
      surface: isDark ? "rgba(34,197,94,0.14)" : "#F0FDF4",
      // Selected-row gradient fill (payment-terms picker). The light branch
      // stays derived from the accent so it can never drift from green.bg /
      // green.hover; the dark branch is a deliberately different pair.
      selectedBgStart: isDark
        ? "rgba(22,163,74,0.18)"
        : accents.green.bg,
      selectedBgEnd: isDark
        ? "rgba(22,163,74,0.10)"
        : accents.green.hover,
      // Foreground on a SOLID green fill. Dark mode's fill is the LIGHTER
      // green seed, so the ink flips to near-black there — hence mode-aware.
      textOnFill: isDark ? "#0F172A" : "#FFFFFF",
      // ProgressBar fill gradient (done / success)
      progressGradient: isDark
        ? "linear-gradient(90deg,#15803d,#4ade80)"
        : "linear-gradient(90deg,#16a34a,#22c55e)",
    },
    red: {
      ...accents.red,
      textDark: isDark ? "#FCA5A5" : "#B91C1C",
      hoverBorder: isDark ? "rgba(248,113,113,0.45)" : "#FCA5A5",
      danger: isDark ? "#F87171" : "#DC2626",
      // signal circle (destructive icon badge) — light pinned to originals
      surface: isDark ? "rgba(239,68,68,0.14)" : "#FFF1F2",
      signalBorder: isDark ? "rgba(251,113,113,0.45)" : "#FECDD3",
      signalText: isDark ? "#F87171" : "#E11D48",
      alertText: isDark ? "#F87171" : "#EF4444",
    },
    teal: accents.teal,
    cyan: accents.cyan,
    pink: accents.pink,

    // ═══════════════════════════════════════════════════════════════════
    // SHADOWS — colour only; the offsets/blur stay with the component so
    // `boxShadow: \`0 4px 20px ${c.shadow.base}\`` keeps its own geometry.
    // ═══════════════════════════════════════════════════════════════════
    shadow: {
      hairline: "rgba(0,0,0,0.05)",
      low: "rgba(0,0,0,0.08)",
      base: "rgba(0,0,0,0.12)",
      strong: "rgba(0,0,0,0.25)",
      raised: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.06)",
      soft: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
      // floating panel / dropdown sheet — heavier in dark so it clears the
      // darker page behind it
      popover: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)",
      // small chip / tooltip
      chip: "rgba(0,0,0,0.18)",
      // Popper / dropdown sheet
      dropdown: "rgba(0,0,0,0.15)",
      // cart / purchase-order card elevation
      cart: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.08)",
      // loading-card elevation (Skeleton PO cards)
      loading: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.06)",
      // overview / dashboard cards (see components/overviewStyles.js)
      cardSm: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.07)",
      cardLg: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)",
      // row / list-item elevation that appears on :hover
      // (geometry stays at the call site)
      hover: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.06)",
      // blue-accent elevation that appears on :hover of a blue-bordered card
      accentHover: "rgba(59,130,246,0.15)",
      scrim: "rgba(0,0,0,0.4)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // SWAL — SweetAlert renders outside MUI, so it can't inherit the
    // theme. The button colours are therefore mode-INDEPENDENT on purpose.
    // ═══════════════════════════════════════════════════════════════════
    swal: {
      confirm: "#D33333",
      cancel: "#3085D6",
      popupBg: isDark ? "rgba(30,41,59,0.5)" : "#FFFFFF",
    },

    // ═══════════════════════════════════════════════════════════════════
    // EXPORT DIALOG — the full-screen export overlay (ExportSpinnerContent)
    // ═══════════════════════════════════════════════════════════════════
    exportDialog: {
      bg: isDark ? "rgba(22,26,36,0.97)" : "rgba(245,248,255,0.97)",
      backdrop: isDark ? "rgba(0,0,0,0.6)" : "rgba(10,25,60,0.35)",
      cardGradient: isDark
        ? "linear-gradient(135deg, #1b2838 0%, #14304a 100%)"
        : "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
      shadow: isDark
        ? "0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)"
        : "0 24px 60px rgba(25,118,210,0.18), 0 4px 16px rgba(0,0,0,0.08)",
      cardShadow: isDark
        ? "0 4px 16px rgba(25,118,210,0.35)"
        : "0 4px 16px rgba(25,118,210,0.2)",
      stepGlow: isDark
        ? "0 0 8px rgba(147,197,253,0.45)"
        : "0 0 8px rgba(25,118,210,0.45)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // HERO — the dashboard welcome banner (Dashboard.jsx). Decorative
    // indigo/violet treatment that belongs to the banner alone, so it is
    // kept together here rather than scattered through the component.
    // ═══════════════════════════════════════════════════════════════════
    hero: {
      gradient: isDark
        ? "linear-gradient(135deg, #1e293b 0%, #1e1b4b 50%, #1e293b 100%)"
        : "linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 50%, #ede9fe 100%)",
      border: isDark ? "rgba(99,102,241,0.25)" : "#dbeafe",
      // the three blurred background orbs
      orbA: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)",
      orbB: isDark ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.06)",
      orbC: isDark ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.05)",
      // "GOOD MORNING" eyebrow
      eyebrow: isDark ? "#a5b4fc" : "#6366f1",
      // live-clock pill
      pillBg: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
      pillBorder: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)",
      pillText: isDark ? "#c7d2fe" : "#6366f1",
      // waving-hand plate
      avatarGradient: isDark
        ? "linear-gradient(135deg, rgba(99,102,241,0.20) 0%, rgba(59,130,246,0.20) 100%)"
        : "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.12) 100%)",
      avatarBorder: isDark
        ? "rgba(99,102,241,0.25)"
        : "rgba(99,102,241,0.15)",
    },

    // ═══════════════════════════════════════════════════════════════════
    // CHART — data-visualization series colours (Recharts fills/strokes).
    // Mode-INDEPENDENT on purpose: a series must keep the SAME identity in
    // both themes or the tooltip and the legend stop agreeing with the
    // bars. Charts also need hues the UI chrome deliberately avoids.
    // ═══════════════════════════════════════════════════════════════════
    chart: {
      // client-status donut
      pie: {
        blue: "#1976d2",
        amber: "#ff9800",
        gray: "#9e9e9e",
        green: "#4caf50",
      },
      // transaction-stage bars, in stage order
      stage: [
        "#94a3b8",
        "#f59e0b",
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
        "#f97316",
        "#10b981",
        "#059669",
      ],
      bar: "#1976d2",
      revenue: "#2563eb",
      expenses: "#f59e0b",
      profit: "#16a34a",
      profitTrend: "#10b981",
      transactions: "#3b82f6",
      avgHours: "#f97316",
    },

    // ═══════════════════════════════════════════════════════════════════
    // TOTALS — the inline Revenue / Expenses / Profit figures. Note
    // revenue reuses blue.text (identical seed values).
    // ═══════════════════════════════════════════════════════════════════
    totals: {
      expenses: isDark ? "#fcd34d" : "#f59e0b",
      profitPos: isDark ? "#86efac" : "#16a34a",
      profitNeg: isDark ? "#fca5a5" : "#dc2626",
    },

    // ═══════════════════════════════════════════════════════════════════
    // MEDAL — ranking row tints (gold / silver / bronze / unranked).
    // ═══════════════════════════════════════════════════════════════════
    medal: {
      gold: {
        bg: isDark ? "rgba(234,179,8,0.15)" : "#fef3c7",
        border: isDark ? "#facc15" : "#fbbf24",
        text: isDark ? "#fef08a" : "#92400e",
      },
      silver: {
        bg: isDark ? "rgba(148,163,184,0.15)" : "#f1f5f9",
        border: "#94a3b8",
        text: isDark ? "#cbd5e1" : "#475569",
      },
      bronze: {
        bg: isDark ? "rgba(251,146,60,0.15)" : "#fed7aa",
        border: "#fb923c",
        text: isDark ? "#fdba74" : "#9a3412",
      },
      plain: {
        bg: isDark ? "rgba(30,41,59,0.4)" : "#f8fafc",
        border: isDark ? "#475569" : "#e2e8f0",
        text: isDark ? "#94a3b8" : "#64748b",
      },
    },

    // ═══════════════════════════════════════════════════════════════════
    // METRIC — the four KPI tiles. `color` is fixed across modes (it is a
    // category identity); only the tint behind it shifts.
    // ═══════════════════════════════════════════════════════════════════
    metric: {
      users: {
        color: "#3b82f6",
        bg: isDark ? "rgba(59,130,246,0.15)" : "#e3f2fd",
      },
      company: {
        color: "#a855f7",
        bg: isDark ? "rgba(168,85,247,0.15)" : "#f3e5f5",
      },
      clients: {
        color: "#ef4444",
        bg: isDark ? "rgba(239,68,68,0.15)" : "#ffebee",
      },
      suppliers: {
        color: "#f97316",
        bg: isDark ? "rgba(249,115,22,0.15)" : "#fff3e0",
      },
    },

    // ═══════════════════════════════════════════════════════════════════
    // PRICING — the markup / markdown mode chooser and its preview panel
    // (PricingPercentageModal). Two accent modes plus the local greys.
    // Values this modal SHARES with the rest of the app (blue.text,
    // red.text, green.text, gray.inputBg, gray.textSecondary,
    // slate.outerBgSolid) already live in their own groups and are
    // reused from there — never duplicated here.
    // ═══════════════════════════════════════════════════════════════════
    pricing: {
      // markup (upcharge) mode — blue
      markup: {
        accentLight: isDark ? "rgba(96,165,250,0.08)" : "#E3F2FD",
        accentBorder: isDark ? "rgba(96,165,250,0.35)" : "#90CAF9",
        radio: isDark ? "#60A5FA" : "#1976D2",
      },
      // markdown (discount) mode — amber. `accent` also carries the two
      // "cost" figures, which use the same colour.
      markdown: {
        accent: isDark ? "#FCD34D" : "#B45309",
        accentLight: isDark ? "rgba(251,191,36,0.08)" : "#FEF3C7",
        accentBorder: isDark ? "rgba(251,191,36,0.35)" : "#FCD34D",
      },
      // ABC-violation banner (the red text itself is red.text)
      violation: {
        bg: isDark ? "rgba(248,113,113,0.08)" : "#FFF5F5",
        border: isDark ? "rgba(248,113,113,0.4)" : "#FCA5A5",
      },
      // preview panel
      modeBoxBorder: isDark ? "rgba(148,163,184,0.25)" : "#E2E8F0",
      modeLabel: isDark ? "#CBD5E1" : "#475569",
      previewLabel: isDark ? "#CBD5E1" : "#555555",
      previewDivider: isDark ? "rgba(96,165,250,0.2)" : "#BFDBFE",
      capitalText: isDark ? "#E2E8F0" : "#333333",
      noteMuted: isDark ? "#64748B" : "#999999",
      costAmberDeep: isDark ? "#FEF08A" : "#92400E",
      abcTeal: isDark ? "#5EEAD4" : "#0F766E",
      // mode-INDEPENDENT: this one is the SAME grey in both themes
      helperMuted: "#94A3B8",
    },

    // ═══════════════════════════════════════════════════════════════════
    // SYSTEM — the full-app states (SystemUnderMaintenance screen). The
    // light background is the indigo→grey→violet aurora gradient; dark
    // mode carries a deep slate equivalent with the same hue family so the
    // aurora tint reads on both.
    // ═══════════════════════════════════════════════════════════════════
    system: {
      maintenanceBg: isDark
        ? "linear-gradient(145deg, #121a2f 0%, #0b1120 50%, #191024 100%)"
        : "linear-gradient(145deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
      // APP SHELL — the page background behind ALL content (Layout2's root
      // strip). Same aurora family as the maintenance screen; keep the two
      // gradients in step so the shell and the global states look like one
      // system.
      shellBg: isDark
        ? "linear-gradient(145deg, #121a2f 0%, #0b1120 50%, #191024 100%)"
        : "linear-gradient(145deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
      // Glass card over the aurora — dark mode uses a deep frosted slate
      // instead of white so the card keeps the "floating glass" look.
      maintenanceCard: isDark ? "rgba(20,29,51,0.85)" : "rgba(255,255,255,0.85)",
      maintenanceCardBorder: isDark
        ? "rgba(148,163,184,0.25)"
        : "rgba(99,102,241,0.12)",
      maintenanceCardShadow: isDark
        ? "0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.05) inset"
        : "0 8px 40px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.9) inset",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACCOUNT — the "My Account" tab (AccountPanel + AccountPanelSkeleton).
    // These use the Tailwind grey/emerald ramps (#111827, #6b7280, #f3f4f6,
    // #047857 …) rather than the slate/emerald values already in `gray` /
    // `green`, so they CANNOT be shared with those groups without shifting
    // light mode. White-on-banner values live in `blue.banner*` instead;
    // plain badges use `badge.plain.*`; the header uses `blue.banner`.
    // ═══════════════════════════════════════════════════════════════════
    account: {
      // green used ONLY by the "Password Updated Successfully" checkmark —
      // the status badge itself is plain (see badge.plain)
      statusActiveText: isDark ? "#6EE7B7" : "#047857",

      // card & backgrounds
      cardBg: isDark ? "#1E293B" : "#FFFFFF",
      cardBorder: isDark ? "rgba(148,163,184,0.25)" : "#E5E7EB",
      rowHover: isDark ? "rgba(59,130,246,0.06)" : "#F8FAFC",
      iconBoxBg: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF",
      primary: isDark ? "#60A5FA" : "#3B82F6",
      primaryDark: isDark ? "#3B82F6" : "#1976D2",

      // text — the panel's own grey ramp, distinct from `gray.*`
      textPrimary: isDark ? "#F1F5F9" : "#111827",
      textSecondary: isDark ? "#94A3B8" : "#6B7280",
      textMuted: isDark ? "#64748B" : "#9CA3AF",
      divider: isDark ? "rgba(148,163,184,0.18)" : "#F3F4F6",

      // success state (emerald, not the palette green)
      successBg: isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5",
      successBorder: isDark ? "rgba(110,231,183,0.3)" : "#A7F3D0",
      successText: isDark ? "#6EE7B7" : "#065F46",
      successTextBold: isDark ? "#A7F3D0" : "#047857",

      // focus glow around the avatar when its image failed to load
      // (the error text itself is red.alertText)
      errorRedGlow: isDark ? "rgba(248,113,113,0.25)" : "rgba(239,68,68,0.3)",

      // the small camera/edit affordance on the avatar
      editBtnBg: isDark ? "#334155" : "#FFFFFF",
      editBtnBorder: isDark ? "rgba(148,163,184,0.4)" : "#E5E7EB",
      editBtnHoverBg: isDark ? "rgba(59,130,246,0.15)" : "#F0F9FF",
    },

    // ═══════════════════════════════════════════════════════════════════
    // PRINT — ink for the print-preview documents (PO, voucher).
    // Mode-INDEPENDENT on purpose and NOT derived from the live palette:
    // these render to PAPER, so they must not shift when the app theme
    // changes. Values are pinned exactly as the print documents had them.
    // ═══════════════════════════════════════════════════════════════════
    print: {
      headerBg: "#B3BECD",
      fillBg: "#E5E7EB",
      grayBg: "#E5E7EB",
      rowGray: "#F1F5F9",
      border: "#94A3B8",
      outerDash: "#166534",
      text: "#1E293B",
      // the blank sheet itself — white in BOTH themes
      paper: "#FFFFFF",
      // body ink of the DR / SI document previews. A different grey ramp
      // (gray-900) from print.text (slate-800), so it needs its own token.
      ink: "#111827",
      // highlight fill behind a selected cell on paper (payment mode)
      highlight: "#FDE68A",
    },

    // ═══════════════════════════════════════════════════════════════════
    // SCANNER — the serial-number camera viewfinder overlay.
    // Mode-INDEPENDENT on purpose: everything here sits on top of LIVE
    // VIDEO (or a black letterbox), never on an app surface, so it can't
    // inherit the theme — a viewfinder must read the same either way.
    // ═══════════════════════════════════════════════════════════════════
    scanner: {
      letterbox: "#000000",
      scrim: "rgba(0,0,0,0.72)",
      frameRing: "rgba(255,255,255,0.7)",
      text: "#FFFFFF",
      btnBg: "rgba(255,255,255,0.14)",
      btnBgHover: "rgba(255,255,255,0.24)",
      btnBorder: "rgba(255,255,255,0.45)",
    },
  };
};

export default getThemeColors;
