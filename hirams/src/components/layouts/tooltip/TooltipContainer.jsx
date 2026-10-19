import { useMemo } from "react";
import { Popover, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";

// ── makeColors(c): SOLID colors ONLY ─────────────────────────────────
// Named `makeColors`, not `useColors`, so calling it inside useMemo
// doesn't trip react-hooks/rules-of-hooks (same as JevListView).
const makeColors = (c) => ({
  modalBg: c.slate.outerBgSolid, // ✅ SOLID — no opacity in ANY mode
});

/**
 * A real tooltip, not a modal: a compact panel anchored to the element that
 * opened it, carrying only the caller's content — plus a CSS triangle that
 * points back at that trigger, so the panel visibly belongs to the button.
 *
 * Built on MUI's Popover, which supplies three things a modal cannot:
 *   • positioning against `anchorEl`, so it opens next to its trigger;
 *   • an INVISIBLE backdrop (Popover sets `backdrop.invisible`), so no dark
 *     scrim is ever drawn over the page;
 *   • viewport clamping via `marginThreshold`, so a panel opened near an
 *     edge slides back on-screen instead of overflowing it.
 *
 * The tip is a 12px square rotated 45°, centred on the paper's RIGHT edge:
 * half lies over the paper in the paper's own colour (seam invisible), half
 * sticks out as the point, aimed straight at the trigger. It only lines up
 * with the button while the panel is NOT clamped — near a viewport edge MUI
 * slides the panel, tip and all.
 */
function TooltipContainer({
  open,
  anchorEl,
  handleClose,
  children,
  width = { xs: "90vw", sm: 320 },
  contentPadding = 0.75,
  showArrow = true,
  // Opens to the LEFT of the trigger, vertically centred on it — a table's
  // action column sits on the right, so this keeps the panel on-screen and
  // the tip points back at the exact button that raised it. The −12 is a
  // NUMERIC origin (MUI accepts px offsets, Popover.js:193 does
  // left = anchor − transform): it parks the panel's right edge 12px short
  // of the button. The tip pokes ~8.5px past that edge, so its point lands
  // ~3.5px from the button — close enough to read as CONNECTED, never on
  // top of what you clicked.
  anchorOrigin = { vertical: "center", horizontal: -12 },
  transformOrigin = { vertical: "center", horizontal: "right" },
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => makeColors(getThemeColors(isDark)), [isDark]);

  // A Popover without an anchor has nowhere to sit (MUI falls back to the
  // top-left corner), so treat "open but unanchored" as closed.
  const isOpen = Boolean(open && anchorEl);

  return (
    <Popover
      open={isOpen}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      // Keeps the panel 12px off any viewport edge while MUI still does the
      // heavy lifting of flipping/clamping it into view.
      marginThreshold={12}
      slotProps={{
        paper: {
          sx: {
            width,
            maxWidth: "calc(100vw - 24px)",
            bgcolor: colors.modalBg,
            borderRadius: 2,
            boxShadow: 26,
            // Popover styles its paper with overflow-y:auto / overflow-x:hidden,
            // which would CLIP the tip. The box below does its own scrolling,
            // so the paper itself can stay open.
            overflow: "visible",
          },
        },
      }}
    >
      {/* Content only — long lists scroll inside the panel. Right padding makes
          room for the tip's inner half so it never rides over the rows (or the
          Set button at their right end). */}
      <Box
        sx={{
          p: contentPadding,
          pr: showArrow ? 1.5 : contentPadding,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {children}
      </Box>

      {showArrow && (
        <Box
          sx={{
            position: "absolute",
            // Right edge, level with the trigger's centre: the tip points
            // sideways at the button instead of down from underneath it.
            right: -6,
            top: "50%",
            width: 12,
            height: 12,
            bgcolor: colors.modalBg,
            transform: "translateY(-50%) rotate(45deg)",
            // Sits above the scrolling content box, not inside it.
            zIndex: 1,
          }}
        />
      )}
    </Popover>
  );
}

export default TooltipContainer;
