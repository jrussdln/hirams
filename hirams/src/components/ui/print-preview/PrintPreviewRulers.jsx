import React, { useRef } from "react";
import { Box, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors.js";

const MM_TO_PX = 96 / 25.4;
const RULER_THICKNESS = 14; // px, outside the paper edge
const LABEL_STEP_MM = 10;
const MIN_GUIDE_GAP_MM = 5;

/**
 * Horizontal + vertical measuring rulers pinned to the top and left edges of
 * the printed page. Rendered inside the visible Print Preview page only, so
 * they are never part of the actual print / PDF / copied image.
 *
 * The blue guides are draggable: their initial positions come from config,
 * but the user can slide them up/down in the preview to fine-tune the band.
 */
export default function PrintPreviewRulers({
  widthPx,
  heightPx,
  widthMm,
  heightMm,
  guidesMm = [],
  onGuidesChange,
  scale = 1,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = getThemeColors(isDark);

  const minor = isDark ? "#475569" : "#cbd5e1";
  const major = isDark ? "#94a3b8" : "#64748b";
  const label = isDark ? "#94a3b8" : "#64748b";
  const bg = colors.slate.innerBg;
  const border = colors.slate.border;

  const minorPx = MM_TO_PX;
  const majorPx = LABEL_STEP_MM * MM_TO_PX;
  const hLabels = Math.floor(widthMm / LABEL_STEP_MM);
  const vLabels = Math.floor(heightMm / LABEL_STEP_MM);

  const dragRef = useRef(null);

  const startDrag = (event, index) => {
    if (!onGuidesChange) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      index,
      startY: event.clientY,
      startMm: guidesMm[index],
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();

    // The page is scaled with a CSS transform, so screen pixels → mm must
    // account for the current zoom level.
    const deltaMm = (event.clientY - drag.startY) / (MM_TO_PX * scale);
    const lower =
      drag.index > 0 ? guidesMm[drag.index - 1] + MIN_GUIDE_GAP_MM : 0;
    const upper =
      drag.index < guidesMm.length - 1
        ? guidesMm[drag.index + 1] - MIN_GUIDE_GAP_MM
        : heightMm;
    const nextMm = Math.max(
      lower,
      Math.min(upper, drag.startMm + deltaMm),
    );
    const rounded = Math.round(nextMm * 10) / 10;
    if (rounded === guidesMm[drag.index]) return;

    const next = [...guidesMm];
    next[drag.index] = rounded;
    onGuidesChange(next);
  };

  const endDrag = (event) => {
    if (!dragRef.current) return;
    event.stopPropagation();
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // pointer capture may already be gone — nothing to release
    }
  };

  return (
    <Box aria-hidden="true" sx={{ pointerEvents: "none" }}>
      {/* HORIZONTAL — sits just above the paper */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: -RULER_THICKNESS,
          width: widthPx,
          height: RULER_THICKNESS,
          bgcolor: bg,
          borderBottom: `1px solid ${border}`,
          backgroundImage: `repeating-linear-gradient(to right, ${minor} 0 1px, transparent 1px ${minorPx}px), repeating-linear-gradient(to right, ${major} 0 1px, transparent 1px ${majorPx}px)`,
          backgroundSize: `100% 5px, 100% 9px`,
          backgroundPosition: "bottom left, bottom left",
          backgroundRepeat: "no-repeat",
        }}
      >
        {Array.from({ length: hLabels + 1 }, (_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: i * majorPx + 2,
              top: 0,
              fontSize: 8,
              lineHeight: 1.2,
              color: label,
            }}
          >
            {i * LABEL_STEP_MM}
          </Box>
        ))}
      </Box>

      {/* VERTICAL — sits just left of the paper */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: -RULER_THICKNESS,
          width: RULER_THICKNESS,
          height: heightPx,
          bgcolor: bg,
          borderRight: `1px solid ${border}`,
          backgroundImage: `repeating-linear-gradient(to bottom, ${minor} 0 1px, transparent 1px ${minorPx}px), repeating-linear-gradient(to bottom, ${major} 0 1px, transparent 1px ${majorPx}px)`,
          backgroundSize: `5px 100%, 9px 100%`,
          backgroundPosition: "left top, left top",
          backgroundRepeat: "no-repeat",
        }}
      >
        {Array.from({ length: vLabels + 1 }, (_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: i * majorPx + 1,
              left: 1,
              fontSize: 8,
              lineHeight: 1,
              color: label,
            }}
          >
            {i * LABEL_STEP_MM}
          </Box>
        ))}
      </Box>

      {/* HORIZONTAL GUIDES — draggable up/down; start at the configured mm */}
      {guidesMm.map((mm, index) => (
        <Box
          key={index}
          sx={{
            position: "absolute",
            top: mm * MM_TO_PX,
            left: 0,
            width: widthPx,
            borderTop: "1px dashed #2563eb",
            zIndex: 3,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 2,
              top: -13,
              px: 0.5,
              bgcolor: bg,
              fontSize: 8,
              lineHeight: 1.3,
              color: "#2563eb",
            }}
          >
            {mm} mm
          </Box>

          {/* Grab zone (the visible line itself is only 1px tall) */}
          <Box
            title="Drag to adjust guide"
            onPointerDown={(event) => startDrag(event, index)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            sx={{
              position: "absolute",
              left: 0,
              top: -4,
              width: widthPx,
              height: 9,
              cursor: "ns-resize",
              pointerEvents: "auto",
              zIndex: 1,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
