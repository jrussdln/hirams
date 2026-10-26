import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Menu,
  Typography,
} from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import ZoomInOutlined from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlined from "@mui/icons-material/ZoomOutOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import PanToolOutlined from "@mui/icons-material/PanToolOutlined";
import BackHandOutlined from "@mui/icons-material/BackHandOutlined";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import BaseButton from "../form/BaseButton.jsx";
import Slider from "@mui/material/Slider";
import EditOutlined from "@mui/icons-material/EditOutlined";
import EditOffOutlined from "@mui/icons-material/EditOffOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import RedoOutlined from "@mui/icons-material/RedoOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import MiniBaseButton from "../form/MiniBaseButton.jsx";
import { EditableCell, PrintEditableContext } from "./EditableCell.jsx";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ModalContainer from "../../layouts/modal/ModalContainer.jsx";
import {
  PRINT_PREVIEW_CONFIRM_STYLES,
  resolveConfirmStyle,
} from "../../../utils/style/sharedConfirmStyles.jsx";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { getFontEmbedCSS } from "../../../utils/print/getFontEmbedCSS.js";
// EditableCell now lives in its own file (./EditableCell.jsx) — re-exported
// here so existing `import { EditableCell } from ".../PrintPreview"` call
// sites keep working without changes.
export { EditableCell };

const useColors = (c) => ({
  border: c.slate.border,
  innerBg: c.slate.innerBg,
  headerBg: c.slate.itemHeaderBg,
});

// ─── PAPER SIZES ───
export const PAPER_SIZES = {
  A4: { label: "A4", wMm: 210, hMm: 297, wPx: 794, hPx: 1123 },
  Letter: { label: "Letter (8.5×11)", wMm: 216, hMm: 279, wPx: 816, hPx: 1056 },
  Legal: { label: "Legal (8.5×14)", wMm: 216, hMm: 356, wPx: 816, hPx: 1344 },
  "8.5x13": { label: "8.5 × 13", wMm: 216, hMm: 330, wPx: 816, hPx: 1248 },
};

// ─── MARGIN PRESETS ───
export const MARGINS = {
  Normal: { label: "Normal (12mm)", preview: "12mm", print: "12mm" },
  Narrow: { label: "Narrow (5mm)", preview: "5mm", print: "5mm" },
  Wide: { label: "Wide (25mm)", preview: "25mm", print: "25mm" },
};

const MM_TO_PX = 96 / 25.4;

export default function PrintPreview({
  children,
  header = null,
  footer = null,
  onExport,
  defaultPaperSize = "A4",
  defaultOrientation = "portrait",
  defaultMargin = "Normal",
  maxWidth = "800px",
  pdfFileName = "document",
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useColors(base);
  const printRef = useRef(null);
  // Per-page PDF capture nodes (one per rendered PDF page), collected
  // via ref callbacks during render.
  const pdfPageRefs = useRef([]);

  // ─── TOOLBAR BUTTON HELPER ───
  // Every header/footer action button is a MiniBaseButton. "active" picks
  // which colored variant to show (e.g. Edit Mode turns amber once on);
  // when inactive it always falls back to the "neutral" (muted) variant,
  // matching the old miniBtnSx(active, base) look without hand-rolled
  // color overrides at each call site.
  const ToolbarButton = ({ active = false, variant = "blue", ...props }) => (
    <MiniBaseButton variant={active ? variant : "neutral"} {...props} />
  );

  // ─── STATE ───
  const [viewMode, setViewMode] = useState("normal"); // "normal" | "print"
  const [paperSize, setPaperSize] = useState(defaultPaperSize);
  const [orientation, setOrientation] = useState(defaultOrientation);
  const [margin, setMargin] = useState(defaultMargin);
  const [scale, setScale] = useState(1);
  // whether the print-options strip is expanded above the slim header bar
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  // ─── PRINT-SPECIFIC CONTROLS ───
  const [colorMode, setColorMode] = useState("color"); // "color" | "grayscale"

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [slideDir, setSlideDir] = useState(0); // -1 prev, 1 next, 0 none

  const zoomIn = () => setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)));

  // refs to measure header/footer heights so the middle "items" window
  // gets whatever vertical space is left on the page
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const contentRef = useRef(null);
  const [totalPages, setTotalPages] = useState(1);
  const [contentTotalHeight, setContentTotalHeight] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);

  // height of the slim toolbar (+ print-options strip when open), so the
  // banner below it can stick right underneath instead of overlapping it
  const topBarRef = useRef(null);
  const [topBarH, setTopBarH] = useState(0);

  // ─── DIMENSIONS ───
  const size = PAPER_SIZES[paperSize];
  const marginPreset = MARGINS[margin];
  const isLandscape = orientation === "landscape";

  // ─── EDIT MODE ───
  const [editingEnabled, setEditingEnabled] = useState(false);

  // ─── EDITABLE VALUES + UNDO/REDO HISTORY ───
  const [editableValues, setEditableValues] = useState({});
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const setEditableValue = useCallback((id, val) => {
    setEditableValues((prev) => {
      setPast((p) => [...p, prev]);
      setFuture([]); // a fresh edit invalidates any redo history
      return { ...prev, [id]: val };
    });
  }, []);

  const handleUndo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prevSnapshot = p[p.length - 1];
      setEditableValues((current) => {
        setFuture((f) => [current, ...f]);
        return prevSnapshot;
      });
      return p.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const nextSnapshot = f[0];
      setEditableValues((current) => {
        setPast((p) => [...p, current]);
        return nextSnapshot;
      });
      return f.slice(1);
    });
  }, []);
  const historyControlsDisabled = viewMode !== "print" && !editingEnabled;
  const [dismissedBanner, setDismissedBanner] = useState(null);

  const handleResetPage = useCallback(() => {
    setEditableValues({});
    setPast([]);
    setFuture([]);
  }, []);

  const PAGE_W = isLandscape ? size.hPx : size.wPx;
  const PAGE_H = isLandscape ? size.wPx : size.hPx;
  const PRINT_W_MM = isLandscape ? size.hMm : size.wMm;
  const PRINT_H_MM = isLandscape ? size.wMm : size.hMm;
  const [dragEnabled, setDragEnabled] = useState(true);

  const syncPageStyleTag = () => {
    let styleTag = document.getElementById("rtp-dynamic-page-style");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "rtp-dynamic-page-style";
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
@page {
  size: ${PRINT_W_MM}mm ${PRINT_H_MM}mm;
  margin: ${marginPreset.print};
}
    `;
  };

  useEffect(() => {
    if (viewMode !== "print") {
      setShowPrintOptions(false);
    }
  }, [viewMode]);

  // Keep it in sync live too, so the tag is always current even before
  // the user hits Print (harmless if it also updates here).
  useEffect(() => {
    syncPageStyleTag();
  }, [PRINT_W_MM, PRINT_H_MM, marginPreset]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
  @page { size: ${PRINT_W_MM}mm ${PRINT_H_MM}mm; margin: ${marginPreset.print}; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  table { border-collapse: collapse !important; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .print-editable-add-icon { display: none !important; }
`,
    onBeforePrint: () => {
      const images = printRef.current?.querySelectorAll("img") ?? [];
      return Promise.all(
        Array.from(images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
        ),
      );
    },
  });

  // ─── SAVE AS PDF ───
  // The toolbar button opens a confirm dialog (same machinery as every
  // other confirm in the app); YES on that dialog renders the hidden print
  // document to a canvas (html-to-image) and packs it into a real .pdf
  // file (jsPDF), paginated to the chosen paper size, then downloads it.
  const pdfConfirmStyle = React.useMemo(
    () => resolveConfirmStyle(PRINT_PREVIEW_CONFIRM_STYLES.save_pdf, isDark),
    [isDark],
  );
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const handleGeneratePdf = useCallback(async () => {
    // One capture node per PDF page (rendered only while the confirm
    // dialog is open — see the hidden PDF-pages strip below).
    const nodes = pdfPageRefs.current.slice(0, totalPages).filter(Boolean);
    if (pdfBusy || nodes.length === 0) return;
    setPdfBusy(true);
    try {
      const captureOptions = {
        pixelRatio: 2, // crisp text, sane file size
        backgroundColor: "#ffffff",
        // Skip html-to-image's own font embedding: it reads every
        // stylesheet, and cross-origin ones (Google Fonts) throw on
        // cssRules access. Hand it the font CSS pre-embedded instead
        // (see utils/print/getFontEmbedCSS.js).
        fontEmbedCSS: await getFontEmbedCSS(),
        // A broken image (e.g. a company logo that 404s) would abort the
        // whole capture — leave it out of the render instead.
        filter: (domNode) =>
          !(domNode.tagName === "IMG" && domNode.naturalWidth === 0),
        // html-to-image turns unfetchable images into an empty src,
        // whose error event rejects the whole capture. Resolve instead —
        // the image just comes out blank in the PDF.
        onImageErrorHandler: () => undefined,
      };

      // Logos etc. must be fully decoded before the capture.
      const images = nodes.flatMap((n) =>
        Array.from(n.querySelectorAll("img")),
      );
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
        ),
      );

      const pdf = new jsPDF({
        orientation: isLandscape ? "l" : "p",
        unit: "mm",
        format: [PRINT_W_MM, PRINT_H_MM],
      });

      // Each PDF page is captured from its own node that mirrors the
      // print view exactly — margins, repeated header, that page's
      // slice of the content, and the footer — so the PDF paginates
      // identically to the print view preview instead of blindly
      // slicing a continuous canvas mid-row.
      for (let i = 0; i < nodes.length; i++) {
        if (i > 0)
          pdf.addPage([PRINT_W_MM, PRINT_H_MM], isLandscape ? "l" : "p");
        const pageCanvas = await toCanvas(nodes[i], captureOptions);
        pdf.addImage(
          pageCanvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          PRINT_W_MM,
          PRINT_H_MM,
        );
      }
      pdf.save(`${pdfFileName}.pdf`);
      setPdfConfirmOpen(false);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setPdfBusy(false);
    }
  }, [
    pdfBusy,
    totalPages,
    isLandscape,
    PRINT_W_MM,
    PRINT_H_MM,
    pdfFileName,
  ]);

  const marginPx = parseFloat(marginPreset.preview) * MM_TO_PX;
  const usablePageHeight = Math.max(
    1,
    PAGE_H - marginPx * 2 - headerH - footerH,
  );

  // measure the slim toolbar's height (grows when print options are open)
  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => setTopBarH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPrintOptions, viewMode]);

  // measure header/footer heights (they render in full on every page).
  // NOTE: these nodes stay mounted across page changes (no more key-based
  // remount on the print page wrapper), so this observer stays valid for
  // the lifetime of print view instead of going stale after Next/Prev.
  useEffect(() => {
    if (viewMode !== "print") return;
    const measure = () => {
      setHeaderH(headerRef.current ? headerRef.current.offsetHeight : 0);
      setFooterH(footerRef.current ? footerRef.current.offsetHeight : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, [viewMode, header, footer, paperSize, orientation, margin]);

  useEffect(() => {
    if (viewMode !== "print") {
      setTotalPages(1);
      setContentTotalHeight(0);
      return;
    }
    const node = contentRef.current;
    if (!node) return;

    const recompute = () => {
      const contentHeight = node.scrollHeight;
      setContentTotalHeight(contentHeight);
      setTotalPages(Math.max(1, Math.ceil(contentHeight / usablePageHeight)));
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewMode, usablePageHeight]);

  // reset to page 1 whenever paper settings change, and clamp if pages shrink
  useEffect(() => {
    setCurrentPage(1);
  }, [paperSize, orientation, margin, viewMode]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // clear the slide animation flag shortly after triggering it, so the
  // CSS animation can replay next time without needing a remount/key
  useEffect(() => {
    if (slideDir === 0) return;
    const t = setTimeout(() => setSlideDir(0), 220);
    return () => clearTimeout(t);
  }, [slideDir, currentPage]);

  const goToPage = (next) => {
    if (next < 1 || next > totalPages || next === currentPage) return;
    setSlideDir(next > currentPage ? 1 : -1);
    setCurrentPage(next);
  };

  // ─── WHEEL ZOOM (works in both normal and print view, requires Ctrl/Cmd + scroll) ───
  const scrollAreaRef = useRef(null);
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain scroll = let it scroll normally
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((s) => Math.min(1.5, +(s + 0.05).toFixed(2)));
      } else {
        setScale((s) => Math.max(0.4, +(s - 0.05).toFixed(2)));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── CLICK-AND-DRAG PANNING (no scrollbar needed) ───
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = (clientX, clientY) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    dragState.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    setIsDragging(true);
  };

  const moveDrag = (clientX, clientY) => {
    const el = scrollAreaRef.current;
    if (!el || !dragState.current.dragging) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    el.scrollLeft = dragState.current.scrollLeft - dx;
    el.scrollTop = dragState.current.scrollTop - dy;
  };

  const endDrag = () => {
    dragState.current.dragging = false;
    setIsDragging(false);
  };
  const handleMouseDown = (e) => {
    if (!dragEnabled) return;
    startDrag(e.clientX, e.clientY);
  };
  const handleMouseMove = (e) => {
    if (!dragState.current.dragging) return;
    moveDrag(e.clientX, e.clientY);
  };
  const handleTouchStart = (e) => {
    if (!dragEnabled) return;
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  };
  const handleTouchMove = (e) => {
    if (!dragState.current.dragging) return;
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  };
  useEffect(() => {
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
    return () => {
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchend", endDrag);
    };
  }, []);

  return (
    <PrintEditableContext.Provider
      value={{
        values: editableValues,
        setValue: setEditableValue,
        editingEnabled,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: "100vh",
        }}
      >
        {/* ─── SLIM HEADER ─── */}
        <Box
          ref={topBarRef}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            flexShrink: 0,
            mx: "-12px",
            mt: "-12px",
            bgcolor: c.headerBg,
          }}
        >
          {/* ─── THE SLIM BAR ITSELF (same visual style as the sub-footer) ─── */}
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              px: 2,
              py: 0.5,
              border: `1px dashed ${c.border}`,
            }}
          >
            {/* left corner — back + view toggle + edit mode + undo/redo + reset */}
            <Box
              sx={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexWrap: "wrap",
              }}
            >
              <ToolbarButton
                active={viewMode === "print"}
                variant="blue"
                icon={
                  viewMode === "print" ? (
                    <ArrowBackOutlined />
                  ) : (
                    <PrintOutlined />
                  )
                }
                label={
                  viewMode === "print"
                    ? "Go Back Normal View"
                    : "Go to Print View"
                }
                onClick={() =>
                  setViewMode((v) => (v === "print" ? "normal" : "print"))
                }
                disabled={editingEnabled}
              />
              <ToolbarButton
                active={editingEnabled}
                variant="amber"
                icon={editingEnabled ? <EditOffOutlined /> : <EditOutlined />}
                label={editingEnabled ? "Disable Edit" : "Enable Edit Mode"}
                onClick={() => setEditingEnabled((v) => !v)}
                disabled={viewMode === "normal"}
              />
            </Box>

            {/* center — zoom controls */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <IconButton size="small" onClick={zoomOut} aria-label="Zoom out">
                <ZoomOutOutlined fontSize="small" />
              </IconButton>
              <Box
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: base.gray.textSecondary,
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {Math.round(scale * 100)}%
              </Box>
              <IconButton size="small" onClick={zoomIn} aria-label="Zoom in">
                <ZoomInOutlined fontSize="small" />
              </IconButton>
            </Box>

            {/* right corner — small action buttons */}
            <Box
              sx={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.25,
              }}
            >
              {!editingEnabled ? (
                <>
                  <ToolbarButton
                    active={showPrintOptions}
                    variant="purple"
                    icon={<TuneOutlined />}
                    label="Print Options"
                    onClick={() => setShowPrintOptions((v) => !v)}
                    disabled={viewMode !== "print"}
                  />
                  <ToolbarButton
                    icon={<PrintOutlined />}
                    label="Print"
                    onClick={handlePrint}
                    disabled={viewMode !== "print"}
                  />
                  {/* Same print pipeline as Print — the browser's dialog
                      is opened with the exact page size/margins already
                      applied, and "Save as PDF" is the destination there. */}
                  <ToolbarButton
                    icon={<DownloadOutlined />}
                    label={pdfBusy ? "Saving…" : "Save as PDF"}
                    onClick={() => setPdfConfirmOpen(true)}
                    disabled={viewMode !== "print" || pdfBusy}
                  />
                </>
              ) : (
                <>
                  <ToolbarButton
                    icon={<UndoOutlined />}
                    label="Undo"
                    tooltip="Undo"
                    onClick={handleUndo}
                    disabled={historyControlsDisabled || past.length === 0}
                  />
                  <ToolbarButton
                    icon={<RedoOutlined />}
                    label="Redo"
                    tooltip="Redo"
                    onClick={handleRedo}
                    disabled={historyControlsDisabled || future.length === 0}
                  />
                  <ToolbarButton
                    icon={<RestartAltOutlined />}
                    label="Reset"
                    tooltip="Reset"
                    onClick={handleResetPage}
                    disabled={historyControlsDisabled}
                  />
                </>
              )}
            </Box>
          </Box>

          {/* ─── PRINT OPTIONS STRIP — sits below the slim bar, centered ─── */}
          {showPrintOptions && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 1.5,
                border: `1px dashed ${c.border}`,
              }}
            >
              <Grid
                container
                spacing={1}
                justifyContent="center"
                sx={{ width: "auto" }}
              >
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel sx={{ fontSize: "0.75rem" }}>
                      Paper Size
                    </InputLabel>
                    <Select
                      label="Paper Size"
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {Object.entries(PAPER_SIZES).map(([key, val]) => (
                        <MenuItem
                          key={key}
                          value={key}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {val.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel sx={{ fontSize: "0.75rem" }}>
                      Orientation
                    </InputLabel>
                    <Select
                      label="Orientation"
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      <MenuItem value="portrait" sx={{ fontSize: "0.75rem" }}>
                        📄 Portrait
                      </MenuItem>
                      <MenuItem value="landscape" sx={{ fontSize: "0.75rem" }}>
                        📰 Landscape
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ fontSize: "0.75rem" }}>
                      Margins
                    </InputLabel>
                    <Select
                      label="Margins"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {Object.entries(MARGINS).map(([key, val]) => (
                        <MenuItem
                          key={key}
                          value={key}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {val.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel sx={{ fontSize: "0.75rem" }}>
                      Color Mode
                    </InputLabel>
                    <Select
                      label="Color Mode"
                      value={colorMode}
                      onChange={(e) => setColorMode(e.target.value)}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      <MenuItem value="color" sx={{ fontSize: "0.75rem" }}>
                        🎨 Color
                      </MenuItem>
                      <MenuItem value="grayscale" sx={{ fontSize: "0.75rem" }}>
                        ⬛ Black & White
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>

        {(() => {
          const bannerKind = editingEnabled
            ? "edit"
            : viewMode === "print"
              ? "print"
              : "normal";

          if (dismissedBanner === bannerKind) return null;

          const banner =
            bannerKind === "edit"
              ? {
                  icon: <WarningAmberOutlined sx={{ fontSize: "1rem" }} />,
                  color: base.amber,
                  message: (
                    <>
                      <strong>Edit Mode</strong> — changes here are temporary
                      and won't be saved to the database. Use{" "}
                      <strong>Reset</strong> to restore the page to its original
                      state, <strong>Undo</strong> to revert your last change,
                      or <strong>Redo</strong> to reapply it.
                    </>
                  ),
                }
              : bannerKind === "print"
                ? {
                    icon: <PrintOutlined sx={{ fontSize: "1rem" }} />,
                    color: base.blue,
                    message: (
                      <>
                        <strong>Print View</strong> — this shows exactly how the
                        document will paginate on paper. Open{" "}
                        <strong>Print Options</strong> to adjust paper size,
                        orientation, margins, and color mode, then use{" "}
                        <strong>Print</strong> or <strong>Export</strong> to
                        save it as PDF, XLSX, CSV, or DOCX.
                      </>
                    ),
                  }
                : {
                    icon: <DescriptionOutlined sx={{ fontSize: "1rem" }} />,
                    color: base.violet,
                    message: (
                      <>
                        <strong>Normal View</strong> — shows the full document
                        in one continuous scroll. Switch to{" "}
                        <strong>Print View</strong> to see how it will paginate.
                      </>
                    ),
                  };

          return (
            <Box
              sx={{
                position: "sticky",
                top: topBarH,
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 1,
                px: 4,
                py: 0.75,
                mx: "-12px",
                flexShrink: 0,
                bgcolor: banner.color.bg,
                borderBottom: `1px dashed ${banner.color.border}`,
              }}
            >
              {React.cloneElement(banner.icon, {
                sx: {
                  ...banner.icon.props.sx,
                  color: banner.color.text,
                  flexShrink: 0,
                },
              })}
              <Box
                sx={{
                  fontSize: "0.72rem",
                  color: banner.color.text,
                  lineHeight: 1.4,
                }}
              >
                {banner.message}
              </Box>
              <IconButton
                size="small"
                onClick={() => setDismissedBanner(bannerKind)}
                aria-label="Dismiss banner"
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  p: 0.4,
                }}
              >
                <CloseOutlined
                  sx={{ fontSize: "0.9rem", color: banner.color.text }}
                />
              </IconButton>
            </Box>
          );
        })()}
        {/* ─── CONTENT AREA — flex:1 fills whatever space header+footer leave ─── */}
        <Box
          ref={scrollAreaRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 3,
            px: 2,
            bgcolor: c.innerBg,
            mx: "-12px",
            overflow: "auto",
            flex: 1,
            minHeight: 0,
            cursor: dragEnabled
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default",
            userSelect: isDragging ? "none" : "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <style>{`
            @keyframes pageSlideNext { from { transform: translateX(40px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
            @keyframes pageSlidePrev { from { transform: translateX(-40px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
            .print-editable-cell:hover .print-editable-add-icon { opacity: 1 !important; }
          `}</style>
          {/* ─── NORMAL VIEW — header + full content + footer, no pagination ─── */}
          {viewMode === "normal" && (
            <Box
              sx={{
                width: "100%",
                maxWidth,
                mx: "auto",
                bgcolor: base.slate.itemHeaderBgSolid,
                border: `1px dashed ${base.slate.totalBorder}`,
                boxShadow: `0 2px 8px ${base.shadow.low}`,
                p: 3,
                boxSizing: "border-box",
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
            >
              {header}
              {children}
              {footer}
            </Box>
          )}

          {/* ─── PRINT VIEW — header + paginated items window + footer, repeated per page ───
               No `key={currentPage}` here anymore: remounting this box on every page
               change was destroying headerRef/contentRef/footerRef and briefly
               resetting their measured heights, which fed back into totalPages and
               clamped currentPage back down — that's what made Next/Prev feel broken.
               The slide animation is now driven by `slideDir` alone (cleared via a
               timeout effect above), so the DOM node stays mounted throughout. */}
          {viewMode === "print" && (
            <Box
              sx={{
                width: PAGE_W,
                minHeight: PAGE_H,
                bgcolor: base.slate.itemHeaderBgSolid,
                boxShadow: `0 2px 8px ${base.shadow.low}`,
                border: `1px solid ${base.slate.totalBorder}`,
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                flexShrink: 0,
                boxSizing: "border-box",
                animation:
                  slideDir === 1
                    ? "pageSlideNext 0.2s ease"
                    : slideDir === -1
                      ? "pageSlidePrev 0.2s ease"
                      : "none",
              }}
            >
              <Box
                sx={{
                  p: marginPreset.preview,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* header — full, repeats every page */}
                <Box ref={headerRef}>{header}</Box>

                <Box
                  sx={{
                    height: Math.min(
                      usablePageHeight,
                      Math.max(
                        0,
                        contentTotalHeight -
                          (currentPage - 1) * usablePageHeight,
                      ),
                    ),
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    ref={contentRef}
                    sx={{
                      transform: `translateY(-${(currentPage - 1) * usablePageHeight}px)`,
                    }}
                  >
                    {children}
                  </Box>
                </Box>

                {/* footer — full, sits directly after the items window, no gap */}
                <Box ref={footerRef}>{footer}</Box>
              </Box>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: "-10000px",
            width: `${PRINT_W_MM}mm`,
          }}
        >
          <div
            ref={printRef}
            style={{
              width: `${PRINT_W_MM}mm`,
              filter: colorMode === "grayscale" ? "grayscale(1)" : "none",
              background: "#ffffff",
            }}
          >
            {header}
            {children}
            {footer}
          </div>
        </Box>
        {/* ─── HIDDEN PDF PAGES — one page-sized node per PDF page, each
             mirroring the print view exactly (margin padding, repeated
             header, that page's slice of the content, footer). Mounted
             only while the save-as-PDF confirm dialog is open, since
             rendering the full content once per page is heavy. ─── */}
        {pdfConfirmOpen && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: "-10000px",
              width: `${PRINT_W_MM}mm`,
            }}
          >
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => {
              const sliceH = Math.min(
                usablePageHeight,
                Math.max(
                  0,
                  contentTotalHeight - i * usablePageHeight,
                ),
              );
              return (
                <div
                  key={i}
                  ref={(el) => {
                    pdfPageRefs.current[i] = el;
                  }}
                  style={{
                    width: `${PRINT_W_MM}mm`,
                    height: `${PRINT_H_MM}mm`,
                    boxSizing: "border-box",
                    padding: marginPreset.print,
                    filter:
                      colorMode === "grayscale" ? "grayscale(1)" : "none",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {header}
                  <div
                    style={{
                      height: sliceH,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        transform: `translateY(-${i * usablePageHeight}px)`,
                      }}
                    >
                      {children}
                    </div>
                  </div>
                  {footer}
                </div>
              );
            })}
          </Box>
        )}
        {/* ─── SUBFOOTER (pagination + zoom, print view only) ─── */}

        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            flexShrink: 0,
            mx: "-12px",
            mb: "-12px",
            bgcolor: c.headerBg,
            borderBottomLeftRadius: 12,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              px: 2,
              py: 2.75,
              border: `1px dashed ${c.border}`,
            }}
          >
            {/* left corner — drag toggle */}
            <Box
              sx={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <ToolbarButton
                icon={<ArrowBackOutlined />}
                label="Back"
                onClick={() => navigate(-1)}
              />
              <ToolbarButton
                active={dragEnabled}
                variant="green"
                icon={dragEnabled ? <PanToolOutlined /> : <BackHandOutlined />}
                label={"Draggable Content"}
                onClick={() => setDragEnabled((v) => !v)}
              />
            </Box>

            {/* center — pagination */}
            {viewMode === "print" && (
              <>
                {" "}
                <BaseButton
                  icon={<ChevronLeftOutlined fontSize="small" />}
                  onClick={() => goToPage(currentPage - 1)}
                  actionColor="default"
                  tooltip="Previous page"
                  disabled={currentPage <= 1}
                />
                <Box
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: base.gray.textSecondary,
                    minWidth: 90,
                    textAlign: "center",
                  }}
                >
                  Page {currentPage} of {totalPages}
                </Box>
                <BaseButton
                  icon={<ChevronRightOutlined fontSize="small" />}
                  onClick={() => goToPage(currentPage + 1)}
                  actionColor="default"
                  tooltip="Next page"
                  disabled={currentPage >= totalPages}
                />
              </>
            )}
            {/* right corner — Word-style zoom slider */}
            <Box
              sx={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <IconButton size="small" onClick={zoomOut} aria-label="Zoom out">
                <ZoomOutOutlined sx={{ fontSize: "0.9rem" }} />
              </IconButton>
              <Slider
                value={scale}
                onChange={(e, val) =>
                  setScale(Array.isArray(val) ? val[0] : val)
                }
                min={0.4}
                max={1.5}
                step={0.05}
                size="small"
                sx={{
                  width: 90,
                  color: base.gray.textSecondary,
                  "& .MuiSlider-thumb": { width: 12, height: 12 },
                }}
                aria-label="Zoom level"
              />
              <IconButton size="small" onClick={zoomIn} aria-label="Zoom in">
                <ZoomInOutlined sx={{ fontSize: "0.9rem" }} />
              </IconButton>
              <Box
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: base.gray.textSecondary,
                  minWidth: 34,
                  textAlign: "right",
                }}
              >
                {Math.round(scale * 100)}%
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ─── SAVE AS PDF CONFIRM — YES generates and downloads the .pdf ─── */}
        {pdfConfirmOpen && pdfConfirmStyle && (
          <ModalContainer
            open={pdfConfirmOpen}
            handleClose={() => {
              if (!pdfBusy) setPdfConfirmOpen(false);
            }}
            contentOnly
            disableBackdropClick
            width={{ xs: "90%", sm: 480 }}
          >
            <Box
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: base.slate.outerBg,
                border: `1px solid ${base.slate.border}`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: pdfConfirmStyle.bg,
                  px: 3,
                  py: 4,
                  gap: 2,
                  animation: "fadeSlideIn 0.18s ease",
                  "@keyframes fadeSlideIn": {
                    from: { opacity: 0, transform: "scale(0.97)" },
                    to: { opacity: 1, transform: "scale(1)" },
                  },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    background: base.slate.outerBg,
                    border: `1.5px solid ${pdfConfirmStyle.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 16px ${pdfConfirmStyle.dotColor}22`,
                  }}
                >
                  <pdfConfirmStyle.Icon
                    sx={{ fontSize: "1.4rem", color: pdfConfirmStyle.iconColor }}
                  />
                </Box>

                {/* Title + description */}
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: pdfConfirmStyle.color,
                      lineHeight: 1.3,
                      mb: 0.75,
                    }}
                  >
                    {pdfConfirmStyle.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      color: base.gray.textSecondary,
                      lineHeight: 1.6,
                      maxWidth: 260,
                      mx: "auto",
                    }}
                  >
                    {pdfConfirmStyle.desc}
                  </Typography>
                </Box>

                {/* Actions — Yes = generate + download; No = dismiss */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    width: "100%",
                    maxWidth: 320,
                  }}
                >
                  <Box
                    onClick={handleGeneratePdf}
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 0.875,
                      borderRadius: "8px",
                      background: pdfConfirmStyle.confirmBg,
                      cursor: pdfBusy ? "wait" : "pointer",
                      opacity: pdfBusy ? 0.7 : 1,
                      transition: "all 0.15s",
                      boxShadow: `0 2px 8px ${pdfConfirmStyle.dotColor}44`,
                      "&:hover": {
                        opacity: pdfBusy ? 0.7 : 0.9,
                        transform: pdfBusy ? "none" : "translateY(-0.5px)",
                      },
                      "&:active": {
                        opacity: pdfBusy ? 0.7 : 0.85,
                        transform: "translateY(0)",
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: base.gray.textOnFill,
                      }}
                    >
                      {pdfBusy ? "Generating…" : pdfConfirmStyle.confirmLabel}
                    </Typography>
                  </Box>

                  <Box
                    onClick={() => {
                      if (!pdfBusy) setPdfConfirmOpen(false);
                    }}
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 0.875,
                      borderRadius: "8px",
                      background: base.slate.btnBg,
                      border: `0.5px solid ${base.slate.btnBorder}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        background: base.slate.btnHoverBg,
                        borderColor: base.slate.border,
                      },
                      "&:active": { opacity: 0.8 },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: base.slate.btnText,
                      }}
                    >
                      No, cancel
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </ModalContainer>
        )}
      </Box>
    </PrintEditableContext.Provider>
  );
}