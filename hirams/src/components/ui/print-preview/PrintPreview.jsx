import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { getDesignTokens } from "../../../utils/style/theme.js";
import getThemeColors from "../../../utils/style/getThemeColors.js";
import { useReactToPrint } from "react-to-print";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import PrintPreviewRightPanel from "./PrintPreviewRightPanel.jsx";
import BaseButton from "../form/BaseButton.jsx";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import RedoOutlined from "@mui/icons-material/RedoOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import MiniBaseButton from "../form/MiniBaseButton.jsx";
import { EditableCell, PrintEditableContext } from "./EditableCell.jsx";
import ModalContainer from "../../layouts/modal/ModalContainer.jsx";
import {
  PRINT_PREVIEW_CONFIRM_STYLES,
  resolveConfirmStyle,
} from "../../../utils/style/sharedConfirmStyles.jsx";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { getFontEmbedCSS } from "../../../utils/print/getFontEmbedCSS.js";

export { EditableCell };

const useColors = (c) => ({
  border: c.slate.border,
  innerBg: c.slate.outerBg,
  headerBg: c.slate.itemHeaderBgSolid,
});

export const PAPER_SIZES = {
  A4: { label: "A4", wMm: 210, hMm: 297, wPx: 794, hPx: 1123 },
  Letter: { label: "Letter (8.5×11)", wMm: 216, hMm: 279, wPx: 816, hPx: 1056 },
  Legal: { label: "Legal (8.5×14)", wMm: 216, hMm: 356, wPx: 816, hPx: 1344 },
  "8.5x13": { label: "8.5 × 13", wMm: 216, hMm: 330, wPx: 816, hPx: 1248 },
};

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
  defaultPaperSize = "A4",
  defaultOrientation = "portrait",
  defaultMargin = "Normal",
  maxWidth = "800px",
  pdfFileName = "document",
  onControlsReady,
  showSystemGenerated = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = useColors(base);

  const lightBase = React.useMemo(() => getThemeColors(false), []);
  const lightTheme = React.useMemo(
    () => createTheme(getDesignTokens("light")),
    [],
  );
  const printRef = useRef(null);
  const pdfPageRefs = useRef([]);

  // Fit the preview to the space left in the window so the inner area scrolls
  const rootRef = useRef(null);
  const [rootH, setRootH] = useState(null);
  useEffect(() => {
    const fit = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setRootH(Math.max(240, window.innerHeight - top - 12)); // 12 = bottom gap, tune if needed
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const ToolbarButton = ({ active = false, variant = "blue", ...props }) => (
    <MiniBaseButton variant={active ? variant : "neutral"} {...props} />
  );

  const [viewMode, setViewMode] = useState("normal");
  const [paperSize, setPaperSize] = useState(defaultPaperSize);
  const [orientation, setOrientation] = useState(defaultOrientation);
  const [margin, setMargin] = useState(defaultMargin);
  const [scale, setScale] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [colorMode, setColorMode] = useState("color");

  // Centralized "System Generated" stamp — captured once so the timestamp
  // stays stable across re-renders, page changes, printing, and PDF export.
  const [generatedAt] = useState(() => new Date().toLocaleString("en-PH"));

  const systemGeneratedStamp = showSystemGenerated && (
    <Box
      sx={{
        mt: 1,
        width: "100%",
        textAlign: "center",
        fontSize: "0.65rem",
        fontWeight: 300,
        fontStyle: "italic",
        color: "#64748B",
        lineHeight: 1.4,
      }}
    >
      System Generated at {generatedAt}
    </Box>
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [slideDir, setSlideDir] = useState(0);

  const zoomIn = () => setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)));

  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const contentRef = useRef(null);
  const [totalPages, setTotalPages] = useState(1);
  const [contentTotalHeight, setContentTotalHeight] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);

  const topBarRef = useRef(null);
  const [topBarH, setTopBarH] = useState(0);

  const size = PAPER_SIZES[paperSize];
  const marginPreset = MARGINS[margin];
  const isLandscape = orientation === "landscape";

  // Edit mode is automatic: on in print view, off in normal view
  const editingEnabled = viewMode === "print";

  const [editableValues, setEditableValues] = useState({});
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const setEditableValue = useCallback((id, val) => {
    setEditableValues((prev) => {
      setPast((p) => [...p, prev]);
      setFuture([]);
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
    syncPageStyleTag();
  }, [PRINT_W_MM, PRINT_H_MM, marginPreset]);

  useEffect(() => {
    const outerScroll = scrollAreaRef.current?.closest(".overflow-auto");
    if (outerScroll) {
      const prev = outerScroll.style.overflow;
      outerScroll.style.overflow = "hidden";
      return () => {
        outerScroll.style.overflow = prev;
      };
    }
  }, []);

  useEffect(() => {
    const target = document.querySelector(".hirams-content-row");
    setPortalTarget(target);
  }, []);

  useEffect(() => {
    if (onControlsReady) {
      onControlsReady({
        viewMode,
        setViewMode,
        panelOpen,
        setPanelOpen,
        editingEnabled,
      });
    }
  }, [viewMode, panelOpen, editingEnabled, onControlsReady]);

  useEffect(() => {
    const onClosePrint = () => setPanelOpen(false);
    const onOpenNotif = () => setPanelOpen(false);
    window.addEventListener("close_print_preview_panel", onClosePrint);
    window.addEventListener("open_notifications_panel", onOpenNotif);
    return () => {
      window.removeEventListener("close_print_preview_panel", onClosePrint);
      window.removeEventListener("open_notifications_panel", onOpenNotif);
    };
  }, []);

  useEffect(() => {
    if (viewMode === "print") {
      setPanelOpen(true);
    } else {
      setPanelOpen(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (panelOpen) {
      window.dispatchEvent(new CustomEvent("open_print_preview_panel"));
      window.dispatchEvent(new CustomEvent("close_notifications_panel"));
    } else {
      window.dispatchEvent(new CustomEvent("close_print_preview_panel"));
    }
  }, [panelOpen]);

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

  const pdfConfirmStyle = React.useMemo(
    () => resolveConfirmStyle(PRINT_PREVIEW_CONFIRM_STYLES.save_pdf, isDark),
    [isDark],
  );
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // ── Copy as Image ── captures the full document as a PNG and writes it to
  // the clipboard (falls back to downloading the .png when the async
  // clipboard API isn't available).
  const [copyBusy, setCopyBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  const handleCopyImage = useCallback(async () => {
    if (copyBusy || copied) return;
    const node = printRef.current;
    if (!node) return;
    setCopyBusy(true);
    try {
      // The hidden print node has NO padding (printer margins come from
      // @page), so capturing it directly yields an image cropped flush to
      // the content. Build a temporary off-screen wrapper padded with the
      // current margin preset so the copied image has breathing room.
      // NOTE: the fixed off-screen positioning must live on a HOLDING
      // parent — html-to-image copies the captured node's own computed
      // styles into its clone, and a fixed/negative-offset node renders
      // far outside the capture canvas, producing a blank white image.
      const marginMm = parseFloat(marginPreset.print) || 12;
      const holdingBox = document.createElement("div");
      holdingBox.style.position = "fixed";
      holdingBox.style.left = "-10000px";
      holdingBox.style.top = "0";
      holdingBox.style.width = `${PRINT_W_MM + marginMm * 2}mm`;

      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.padding = marginPreset.print;
      wrapper.style.boxSizing = "border-box";
      wrapper.style.background = "#ffffff";
      wrapper.style.color = "#1E293B";
      Array.from(node.childNodes).forEach((child) =>
        wrapper.appendChild(child.cloneNode(true)),
      );
      holdingBox.appendChild(wrapper);
      document.body.appendChild(holdingBox);

      let canvas;
      try {
        canvas = await toCanvas(wrapper, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          fontEmbedCSS: await getFontEmbedCSS(),
          filter: (domNode) =>
            !(domNode.tagName === "IMG" && domNode.naturalWidth === 0),
          onImageErrorHandler: () => undefined,
        });
      } finally {
        holdingBox.remove();
      }
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Failed to encode PNG");

      let copiedToClipboard = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.write &&
        typeof window !== "undefined" &&
        typeof ClipboardItem !== "undefined"
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          copiedToClipboard = true;
        } catch (clipboardErr) {
          console.warn(
            "Clipboard image write failed, falling back to download:",
            clipboardErr,
          );
        }
      }

      if (!copiedToClipboard) {
        // Fallback: download the image instead of silently failing.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${pdfFileName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy document as image:", err);
    } finally {
      setCopyBusy(false);
    }
  }, [copyBusy, copied, pdfFileName, marginPreset, PRINT_W_MM]);

  const handleGeneratePdf = useCallback(async () => {
    const nodes = pdfPageRefs.current.slice(0, totalPages).filter(Boolean);
    if (pdfBusy || nodes.length === 0) return;
    setPdfBusy(true);
    try {
      const captureOptions = {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        fontEmbedCSS: await getFontEmbedCSS(),
        filter: (domNode) =>
          !(domNode.tagName === "IMG" && domNode.naturalWidth === 0),
        onImageErrorHandler: () => undefined,
      };

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
  }, [pdfBusy, totalPages, isLandscape, PRINT_W_MM, PRINT_H_MM, pdfFileName]);

  const marginPx = parseFloat(marginPreset.preview) * MM_TO_PX;
  const usablePageHeight = Math.max(
    1,
    PAGE_H - marginPx * 2 - headerH - footerH,
  );

  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => setTopBarH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [paperSize, orientation, margin, viewMode]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

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

  const scrollAreaRef = useRef(null);
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
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
    const onMouseMove = (e) => {
      if (!dragState.current.dragging) return;
      moveDrag(e.clientX, e.clientY);
    };
    const onTouchMove = (e) => {
      if (!dragState.current.dragging) return;
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
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
        ref={rootRef}
        sx={{
          display: "flex",
          flexDirection: "row",
          height: rootH ? `${rootH}px` : "100%",
          minHeight: 0,
          alignItems: "stretch",
          mx: "-12px",
          mt: "-12px",
          mb: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
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
              pt: viewMode === "normal" ? 3 : 0,
              pb: 3,
              px: 2,
              bgcolor: c.innerBg,
              overflow: "auto",
              flex: 1,
              minHeight: 0,
              cursor: dragEnabled
                ? isDragging
                  ? "grabbing"
                  : "grab"
                : "default",
              userSelect: isDragging ? "none" : "auto",
            }}
          >
            <style>{`
              @keyframes pageSlideNext { from { transform: translateX(40px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
              @keyframes pageSlidePrev { from { transform: translateX(-40px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
              .print-editable-cell:hover .print-editable-add-icon { opacity: 1 !important; }
            `}</style>

            {/* Content header (toolbar) — print view only */}
            {viewMode === "print" && (
              <Box
                ref={topBarRef}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  alignSelf: "stretch",
                  mx: -2,
                  height: 72,
                  boxSizing: "border-box",
                  bgcolor: c.headerBg,
                  borderBottom: `1px solid ${c.border}`,
                  mb: 3,
                  cursor: "default",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    height: "100%",
                  }}
                >
                  {/* LEFT */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      justifySelf: "start",
                    }}
                  >
                    {editingEnabled && (
                      <>
                        <ToolbarButton
                          icon={<UndoOutlined />}
                          label="Undo"
                          tooltip="Undo"
                          onClick={handleUndo}
                          disabled={
                            historyControlsDisabled || past.length === 0
                          }
                        />
                        <ToolbarButton
                          icon={<RedoOutlined />}
                          label="Redo"
                          tooltip="Redo"
                          onClick={handleRedo}
                          disabled={
                            historyControlsDisabled || future.length === 0
                          }
                        />
                      </>
                    )}
                  </Box>

                  {/* CENTER */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                    }}
                  >
                    {viewMode === "print" && (
                      <>
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
                            py: 0.75,
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
                  </Box>

                  {/* RIGHT */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      justifySelf: "end",
                    }}
                  >
                    {editingEnabled && (
                      <ToolbarButton
                        icon={<RestartAltOutlined />}
                        label="Reset"
                        tooltip="Reset"
                        onClick={handleResetPage}
                        disabled={historyControlsDisabled}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {viewMode === "normal" && (
              <ThemeProvider theme={lightTheme}>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth,
                    mx: "auto",
                    bgcolor: "#ffffff",
                    color: lightBase.print.text,
                    colorScheme: "light",
                    border: `1px dashed ${lightBase.slate.totalBorder}`,
                    boxShadow: `0 2px 8px ${lightBase.shadow.low}`,
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
                  {systemGeneratedStamp}
                </Box>
              </ThemeProvider>
            )}

            {viewMode === "print" && (
              <ThemeProvider theme={lightTheme}>
                <Box
                  sx={{
                    width: PAGE_W,
                    minHeight: PAGE_H,
                    bgcolor: "#ffffff",
                    color: lightBase.print.text,
                    colorScheme: "light",
                    boxShadow: `0 2px 8px ${lightBase.shadow.low}`,
                    border: `1px solid ${lightBase.slate.totalBorder}`,
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

                    <Box ref={footerRef}>{footer}</Box>
                    {systemGeneratedStamp}
                  </Box>
                </Box>
              </ThemeProvider>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: "-10000px",
            width: `${PRINT_W_MM}mm`,
          }}
        >
          <ThemeProvider theme={lightTheme}>
            <div
              ref={printRef}
              style={{
                width: `${PRINT_W_MM}mm`,
                filter: colorMode === "grayscale" ? "grayscale(1)" : "none",
                background: "#ffffff",
                color: "#1E293B",
                colorScheme: "light",
              }}
            >
              {header}
              {children}
              {footer}
              {systemGeneratedStamp}
            </div>
          </ThemeProvider>
        </Box>
        {pdfConfirmOpen && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: "-10000px",
              width: `${PRINT_W_MM}mm`,
            }}
          >
            <ThemeProvider theme={lightTheme}>
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => {
                const sliceH = Math.min(
                  usablePageHeight,
                  Math.max(0, contentTotalHeight - i * usablePageHeight),
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
                      color: "#1E293B",
                      colorScheme: "light",
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
                    {showSystemGenerated && (
                      <div
                        style={{
                          marginTop: 4,
                          width: "100%",
                          textAlign: "center",
                          fontSize: "8.5px",
                          fontWeight: 300,
                          fontStyle: "italic",
                          color: "#64748B",
                          lineHeight: 1.4,
                        }}
                      >
                        System Generated at {generatedAt}
                      </div>
                    )}
                  </div>
                );
              })}
            </ThemeProvider>
          </Box>
        )}
      </Box>

      {(() => {
        const panel = (
          <PrintPreviewRightPanel
            open={panelOpen}
            onClose={() => {
              setPanelOpen(false);
              setViewMode("normal");
            }}
            paperSize={paperSize}
            setPaperSize={setPaperSize}
            paperSizes={PAPER_SIZES}
            orientation={orientation}
            setOrientation={setOrientation}
            margin={margin}
            setMargin={setMargin}
            margins={MARGINS}
            colorMode={colorMode}
            setColorMode={setColorMode}
            dragEnabled={dragEnabled}
            onToggleDrag={() => setDragEnabled((v) => !v)}
            onPrint={() => {
              if (viewMode !== "print") setViewMode("print");
              handlePrint();
            }}
            onSavePdf={() => {
              if (viewMode !== "print") setViewMode("print");
              setPdfConfirmOpen(true);
            }}
            pdfBusy={pdfBusy}
            onCopyImage={handleCopyImage}
            copyBusy={copyBusy}
            copied={copied}
            scale={scale}
            onZoomChange={setScale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        );
        return portalTarget ? createPortal(panel, portalTarget) : panel;
      })()}

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
                    transition: "all 0.15s ease",
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
                    transition: "all 0.15s ease",
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
    </PrintEditableContext.Provider>
  );
}
