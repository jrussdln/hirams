import { useMemo, useState } from "react";
import { Box, Collapse, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ArrowForwardOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";
import PageLayout from "../../components/layouts/page/content-page";
import ContentHeaderStructure from "../../components/ui/structure/ContentHeaderStructure";
import CustomSearchField from "../../components/ui/form/SearchField";
import BaseButton from "../../components/ui/form/BaseButton";
import getThemeColors from "../../utils/style/getThemeColors";
import icons from "../../utils/style/iconFormatStyles";
import { SECTIONS } from "../../constants/helpSections";

// ── Local Color Map — only tokens used in this component ──────────────
const useColors = (c) => ({
  border: c.slate.border,
  surface: c.slate.itemHeaderBg,
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  amber: { bg: c.amber.bg, text: c.amber.text },
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
});

// What the search bar matches on, per item.
const haystack = (item) =>
  `${item.title ?? ""} ${item.text ?? ""} ${item.sees ?? ""} ${(item.keys ?? []).join(" ")}`.toLowerCase();

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── Match highlight ───────────────────────────────────────────────────
function Highlight({ text, query, colors }) {
  if (!query) return <>{text}</>;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Box
            key={i}
            component="mark"
            sx={{
              bgcolor: colors.amber.bg,
              color: colors.amber.text,
              borderRadius: "3px",
              px: 0.25,
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ── Content card ──────────────────────────────────────────────────────
function Panel({ icon, title, children, colors, onClick, query }) {
  const body = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        {icon && (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              bgcolor: colors.blue.bg,
              border: `0.5px solid ${colors.blue.border}`,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: colors.gray.textPrimary,
          }}
        >
          <Highlight text={title} query={query} colors={colors} />
        </Typography>
        {onClick && (
          <ArrowForwardOutlined
            sx={{
              fontSize: "0.85rem",
              color: colors.gray.textMuted,
              ml: "auto",
            }}
          />
        )}
      </Box>
      <Typography
        sx={{
          fontSize: "0.68rem",
          lineHeight: 1.55,
          color: colors.gray.textSecondary,
        }}
      >
        <Highlight text={children} query={query} colors={colors} />
      </Typography>
    </>
  );

  const sx = {
    position: "relative",
    display: "block",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    // A <button> resets these — put the panel's own look back.
    background: colors.surface,
    border: `0.5px solid ${colors.border}`,
    borderLeft: `3px solid ${colors.blue.border}`,
    borderRadius: "8px",
    p: 1.5,
    cursor: onClick ? "pointer" : "default",
    transition: "border-color 0.15s, background 0.15s",
    ...(onClick
      ? { "&:hover": { bgcolor: colors.blue.bg, borderColor: colors.blue.text } }
      : {}),
  };

  return onClick ? (
    <Box component="button" onClick={onClick} sx={sx}>
      {body}
    </Box>
  ) : (
    <Box sx={sx}>{body}</Box>
  );
}


// ── Sub-heading inside a topic ────────────────────────────────────────
function BlockLabel({ children, colors }) {
  return (
    <Typography
      sx={{
        display: "block",
        fontSize: "0.58rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: colors.gray.textMuted,
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  // ── Search + open/closed state ───────────────────────────────────────
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({ start: true });

  const q = query.trim().toLowerCase();

  // While searching, every section that still has a hit is forced open and
  // the rest are hidden entirely; with an empty box the hand-picked
  // open/closed state takes over again.
  const sections = useMemo(() => {
    const list = SECTIONS.map((section) => {
      if (!q) return { ...section, hidden: false, hits: section.items.length };
      const titleMatches = section.title.toLowerCase().includes(q);
      const items = section.items.filter(
        (item) => titleMatches || haystack(item).includes(q),
      );
      return { ...section, items, hidden: items.length === 0, hits: items.length };
    });
    return list.filter((section) => !section.hidden);
  }, [q]);

  // While searching, every section that still has a hit opens itself and
  // the rest are hidden entirely. A section the reader has explicitly
  // opened or closed keeps that choice — the search never fights them.
  const isOpen = (id) => {
    const saved = open[id];
    if (saved !== undefined) return saved;
    return q ? true : id === "start" || id === "users";
  };
  const toggle = (id) =>
    setOpen((prev) => ({ ...prev, [id]: !(id in prev ? prev[id] : isOpen(id)) }));

  const handleBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/dashboard");

  // ── Body of a section, by kind ───────────────────────────────────────
  const renderItems = (section) => {
    const { kind, items } = section;

    if (kind === "blocks") {
      // Consecutive items of the same type become one block, so the
      // paragraphs, capability cards, steps and role rungs each keep their
      // own layout — and a search that leaves only one kind behind still
      // reads correctly (its sub-heading comes with it).
      const blocks = [];
      items.forEach((item) => {
        const last = blocks[blocks.length - 1];
        if (last && last.type === item.type) last.items.push(item);
        else blocks.push({ type: item.type, items: [item] });
      });

      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {blocks.map((block, b) => {
            if (block.type === "para") {
              return (
                <Box
                  key={b}
                  sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
                >
                  {block.items.map((item, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: "0.7rem",
                        lineHeight: 1.7,
                        color: colors.gray.textSecondary,
                      }}
                    >
                      <Highlight text={item.text} query={q} colors={colors} />
                    </Typography>
                  ))}
                </Box>
              );
            }

            if (block.type === "cap") {
              return (
                <Box key={b}>
                  <BlockLabel colors={colors}>What it can do</BlockLabel>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    {block.items.map((item, i) => (
                      <Panel
                        key={i}
                        icon={item.icon}
                        title={item.title}
                        colors={colors}
                        query={q}
                      >
                        {item.text}
                      </Panel>
                    ))}
                  </Box>
                </Box>
              );
            }

            if (block.type === "role") {
              return (
                <Box key={b}>
                  <BlockLabel colors={colors}>Highest to lowest</BlockLabel>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {block.items.map((item, i) => (
                      <Box
                        key={i}
                        sx={{
                          background: colors.surface,
                          border: `0.5px solid ${colors.border}`,
                          borderLeft: `3px solid ${colors.blue.border}`,
                          borderRadius: "8px",
                          p: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                            mb: 0.75,
                          }}
                        >
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: "99px",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: colors.blue.bg,
                              border: `0.5px solid ${colors.blue.border}`,
                              color: colors.blue.text,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: colors.gray.textPrimary,
                            }}
                          >
                            <Highlight
                              text={item.title}
                              query={q}
                              colors={colors}
                            />
                          </Typography>
                          <Typography
                            sx={{
                              px: 0.5,
                              py: 0.1,
                              borderRadius: "4px",
                              border: `0.5px solid ${colors.border}`,
                              color: colors.gray.textMuted,
                              fontSize: "0.56rem",
                              fontWeight: 700,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.code}
                          </Typography>
                          <Typography
                            sx={{
                              ml: "auto",
                              fontSize: "0.56rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              color: colors.gray.textMuted,
                            }}
                          >
                            {item.level}
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            lineHeight: 1.6,
                            color: colors.gray.textSecondary,
                            mb: item.sees ? 0.6 : 0,
                          }}
                        >
                          <Highlight text={item.text} query={q} colors={colors} />
                        </Typography>

                        {item.sees && (
                          <Typography
                            sx={{
                              fontSize: "0.64rem",
                              lineHeight: 1.55,
                              color: colors.gray.textMuted,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{ fontWeight: 700, mr: 0.5 }}
                            >
                              Sees:
                            </Box>
                            <Highlight
                              text={item.sees}
                              query={q}
                              colors={colors}
                            />
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            }

            if (block.type !== "step") return null;

            return (
              <Box key={b}>
                <BlockLabel colors={colors}>Where to start</BlockLabel>
                <Box
                  component="ol"
                  sx={{
                    pl: 2.2,
                    m: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  {block.items.map((item, i) => (
                    <li key={i}>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          lineHeight: 1.6,
                          color: colors.gray.textSecondary,
                        }}
                      >
                        <Highlight text={item.text} query={q} colors={colors} />
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }

    // cards + links both render as panels; links just get a target.
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            ...(kind === "links" ? { md: "1fr 1fr 1fr" } : {}),
          },
          gap: 1.5,
        }}
      >
        {items.map((item, i) => (
          <Panel
            key={i}
            icon={item.icon ?? <ArrowForwardOutlined sx={{ fontSize: "0.85rem" }} />}
            title={item.title}
            colors={colors}
            query={q}
            onClick={
              item.to
                ? () => navigate(item.to)
                : item.href
                  ? () => (window.location.href = item.href)
                  : undefined
            }
          >
            {item.text}
          </Panel>
        ))}
      </Box>
    );
  };

  return (
    <PageLayout
      title="Help & Support"
      subtitle="Search it, or open a topic below"
      footerLActions={
        <BaseButton
          label="Back"
          icon={icons.back}
          onClick={handleBack}
          actionColor="cancel"
        />
      }
    >


      {/* ── Search bar ────────────────────────────────────────────── */}
      <Box sx={{ mt: 0.5, mb: 1.25 }}>
        <CustomSearchField
          label="Search help"
          placeholder="e.g. voucher, fullscreen, Enter"
          value={query}
          onChange={setQuery}
        />
      </Box>

      {/* ── Clear search (only while a search is active) ─────────── */}
      {q && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mb: 1.25,
          }}
        >
          <BaseButton
            label="Clear search"
            icon={icons.close}
            size="small"
            actionColor="cancel"
            onClick={() => setQuery("")}
          />
        </Box>
      )}

      {/* ── Topics ────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: "center",
            border: `1px dashed ${colors.border}`,
            borderRadius: "10px",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: colors.gray.textPrimary,
              mb: 0.5,
            }}
          >
            No results for "{query.trim()}"
          </Typography>
          <Typography
            sx={{ fontSize: "0.68rem", color: colors.gray.textSecondary, mb: 1.5 }}
          >
            Try "voucher", "fullscreen", "Enter" or "inventory".
          </Typography>
          <BaseButton
            label="Clear search"
            icon={icons.close}
            size="small"
            actionColor="cancel"
            onClick={() => setQuery("")}
          />
        </Box>
      ) : (
        // One container: the topic rows sit flush against each other and the
        // outer box draws the only border, so there's no gap between rows.
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            border: `0.5px solid ${colors.border}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {sections.map((section, idx) => {
            const expanded = isOpen(section.id);
            return (
              <Box
                key={section.id}
                sx={{
                  borderTop: idx
                    ? `0.5px solid ${colors.border}`
                    : "none",
                }}
              >
                {/* Topic header — click to hide / show its content */}
                <Box
                  component="button"
                  onClick={() => toggle(section.id)}
                  aria-expanded={expanded}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 1,
                    fontFamily: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    bgcolor: colors.surface,
                    border: "none",
                    borderRadius: 0,
                    transition: "background 0.15s",
                    "&:hover": { bgcolor: colors.blue.bg },
                  }}
                >
                  <ChevronRightOutlined
                    sx={{
                      fontSize: 18,
                      color: colors.gray.textMuted,
                      transform: expanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colors.gray.textPrimary,
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Box
                    sx={{
                      ml: "auto",
                      px: 0.75,
                      py: 0.25,
                      borderRadius: "99px",
                      bgcolor: q ? colors.blue.bg : "transparent",
                      border: q ? `1px solid ${colors.blue.border}` : "none",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: q ? colors.blue.text : colors.gray.textMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    {q ? `${section.hits} hit${section.hits === 1 ? "" : "s"}` : ""}
                  </Box>
                </Box>

                {/* Content */}
                <Collapse in={expanded} timeout="auto">
                  <Box sx={{ p: 1.5 }}>{renderItems(section)}</Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      )}
    </PageLayout>
  );
}
