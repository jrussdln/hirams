import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors";
import PageRightPanel from "../panel/PageRightPanel";
import CloseIcon from "@mui/icons-material/Close";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import PanToolOutlined from "@mui/icons-material/PanToolOutlined";
import BackHandOutlined from "@mui/icons-material/BackHandOutlined";

import ZoomInOutlined from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlined from "@mui/icons-material/ZoomOutOutlined";
import Slider from "@mui/material/Slider";
// Shared by the panel header and the preview toolbar so they always match
export const PRINT_HEADER_H = 56;

const useColors = (c) => ({
  outerBg: c.slate.outerBg,
  innerBg: c.slate.innerBg,
  border: c.slate.border,
  borderLight: c.slate.borderLight,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  blueBgSoft: c.blue.bgSoft,
  blueText: c.blue.text,
  blueTextStrong: c.blue.textStrong,
  blueBorder: c.blue.border,
  blueSurface: c.blue.bg,
  slateHover: c.slate.hover,
  btnBg: c.slate.btnBg,
  btnBorder: c.slate.btnBorder,
  btnHoverBg: c.slate.btnHoverBg,
});

export default function PrintPreviewRightPanel({
  open,
  onClose,
  width = 350,
  paperSize,
  setPaperSize,
  paperSizes = {},
  orientation,
  setOrientation,
  margin,
  setMargin,
  margins = {},
  colorMode,
  setColorMode,
  onPrint,
  onSavePdf,
  pdfBusy,
  pdfFileName = "document",
  onCopyImage,
  copyBusy = false,
  copied = false,
  dragEnabled = false,
  onToggleDrag,
  scale = 1,
  onZoomChange,
  onZoomIn,
  onZoomOut,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [saveFormat, setSaveFormat] = useState("pdf");

  return (
    <PageRightPanel open={open} width={width}>
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.outerBg,
        }}
      >
        {/* ── 1. HEADER (Mirrors AIChatbot Header & NotificationsBody Header) ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            height: PRINT_HEADER_H,
            boxSizing: "border-box",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
            bgcolor: colors.outerBg,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: colors.blueBgSoft,
              }}
            >
              <TuneOutlined
                sx={{ fontSize: 14, color: colors.blueTextStrong }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Menu
            </Typography>
          </Box>
          <Tooltip title="Close panel">
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close panel"
              sx={{
                p: 0.5,
                borderRadius: 1,
                color: colors.textSecondary,
                "&:hover": { bgcolor: colors.slateHover },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── 2. SCROLLABLE BODY ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2.25,
          }}
        >
          {/* SECTION: PRINT OPTIONS */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                bgcolor: colors.innerBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 2,
                p: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              {/* Paper Size */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  Paper Size
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={paperSize || "A4"}
                    onChange={(e) => setPaperSize(e.target.value)}
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: colors.btnBg,
                      borderRadius: 1.5,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.borderLight,
                      },
                    }}
                  >
                    {Object.entries(paperSizes).map(([key, val]) => (
                      <MenuItem
                        key={key}
                        value={key}
                        sx={{ fontSize: "0.8rem" }}
                      >
                        {val.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Orientation */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  Orientation
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={orientation || "portrait"}
                    onChange={(e) => setOrientation(e.target.value)}
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: colors.btnBg,
                      borderRadius: 1.5,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.borderLight,
                      },
                    }}
                  >
                    <MenuItem value="portrait" sx={{ fontSize: "0.8rem" }}>
                      📄 Portrait
                    </MenuItem>
                    <MenuItem value="landscape" sx={{ fontSize: "0.8rem" }}>
                      📰 Landscape
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Margins */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  Margins
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={margin || "normal"}
                    onChange={(e) => setMargin(e.target.value)}
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: colors.btnBg,
                      borderRadius: 1.5,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.borderLight,
                      },
                    }}
                  >
                    {Object.entries(margins).map(([key, val]) => (
                      <MenuItem
                        key={key}
                        value={key}
                        sx={{ fontSize: "0.8rem" }}
                      >
                        {val.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Color Mode */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  Color Mode
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={colorMode || "color"}
                    onChange={(e) => setColorMode(e.target.value)}
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: colors.btnBg,
                      borderRadius: 1.5,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.borderLight,
                      },
                    }}
                  >
                    <MenuItem value="color" sx={{ fontSize: "0.8rem" }}>
                      🎨 Color
                    </MenuItem>
                    <MenuItem value="grayscale" sx={{ fontSize: "0.8rem" }}>
                      ⬛ Black & White (Grayscale)
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          {/* SECTION: PRINT */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                bgcolor: colors.innerBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 2,
                p: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                Send the formatted document directly to your printer or system
                dialog.
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={onPrint}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 1.1,
                  px: 2,
                  borderRadius: 1.5,
                  bgcolor: colors.btnBg,
                  border: `1px solid ${colors.btnBorder}`,
                  color: colors.textPrimary,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: colors.btnHoverBg,
                    borderColor: colors.border,
                  },
                  "&:active": { opacity: 0.8 },
                }}
              >
                <PrintOutlined sx={{ fontSize: 18, color: colors.blueText }} />
                Print Document
              </Box>
            </Box>
          </Box>

          {/* SECTION: COPY AS IMAGE */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                bgcolor: colors.innerBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 2,
                p: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                Copy the full document with its margins as an image, ready to
                paste anywhere.
              </Typography>
              <Box
                component="button"
                type="button"
                disabled={copyBusy}
                onClick={onCopyImage}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 1.1,
                  px: 2,
                  borderRadius: 1.5,
                  bgcolor: colors.btnBg,
                  border: `1px solid ${colors.btnBorder}`,
                  color: colors.textPrimary,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: copyBusy ? "wait" : "pointer",
                  opacity: copyBusy ? 0.7 : 1,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: colors.btnHoverBg,
                    borderColor: colors.border,
                  },
                  "&:active": { opacity: 0.8 },
                }}
              >
                {copied ? (
                  <CheckOutlined sx={{ fontSize: 18, color: colors.blueText }} />
                ) : (
                  <ContentCopyOutlined
                    sx={{ fontSize: 18, color: colors.blueText }}
                  />
                )}
                {copyBusy
                  ? "Capturing…"
                  : copied
                    ? "Copied!"
                    : "Copy as Image"}
              </Box>
            </Box>
          </Box>

          {/* SECTION: SAVE AS */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                bgcolor: colors.innerBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 2,
                p: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  File Format
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={saveFormat}
                    onChange={(e) => setSaveFormat(e.target.value)}
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: colors.btnBg,
                      borderRadius: 1.5,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.borderLight,
                      },
                    }}
                  >
                    <MenuItem value="pdf" sx={{ fontSize: "0.8rem" }}>
                      PDF Document (.pdf)
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* File Title — the name the download lands under. Long
                  names ellipsize rather than stretching the card. */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    mb: 0.5,
                  }}
                >
                  File Title
                </Typography>
                <Box
                  sx={{
                    fontSize: "0.8rem",
                    fontStyle: "italic",
                    bgcolor: colors.btnBg,
                    border: 1,
                    borderColor: colors.borderLight,
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.8,
                    color: colors.textPrimary,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {pdfFileName}.pdf
                </Box>
              </Box>

              <Box
                component="button"
                type="button"
                disabled={pdfBusy}
                onClick={onSavePdf}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 1.1,
                  px: 2,
                  borderRadius: 1.5,
                  bgcolor: colors.blueSurface,
                  border: `1px solid ${colors.blueBorder}`,
                  color: colors.blueTextStrong,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: pdfBusy ? "wait" : "pointer",
                  opacity: pdfBusy ? 0.7 : 1,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: colors.blueBgSoft,
                  },
                  "&:active": { opacity: 0.8 },
                }}
              >
                <DownloadOutlined sx={{ fontSize: 18 }} />
                {pdfBusy ? "Saving PDF…" : "Save as PDF"}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── 3. FOOTER (drag toggle left, zoom right) ── */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: `1px solid ${colors.border}`,
            bgcolor: colors.outerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexShrink: 0,
          }}
        >
          {/* LEFT: draggable toggle */}
          <Box
            component="button"
            type="button"
            onClick={onToggleDrag}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              py: 0.5,
              px: 1.25,
              borderRadius: 1,
              bgcolor: dragEnabled ? colors.blueBgSoft : colors.btnBg,
              border: `1px solid ${dragEnabled ? colors.blueBorder : colors.btnBorder}`,
              color: dragEnabled ? colors.blueTextStrong : colors.textPrimary,
              fontWeight: 600,
              fontSize: "0.75rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: dragEnabled ? colors.blueBgSoft : colors.btnHoverBg,
              },
            }}
          >
            {dragEnabled ? (
              <PanToolOutlined sx={{ fontSize: 15 }} />
            ) : (
              <BackHandOutlined sx={{ fontSize: 15 }} />
            )}
            Draggable
          </Box>

          {/* RIGHT: zoom controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={onZoomOut}
              disabled={scale <= 0.4}
              aria-label="Zoom out"
              sx={{ p: 0.5, color: colors.textSecondary }}
            >
              <ZoomOutOutlined sx={{ fontSize: "0.9rem" }} />
            </IconButton>
            <Slider
              value={scale}
              onChange={(e, val) =>
                onZoomChange?.(Array.isArray(val) ? val[0] : val)
              }
              min={0.4}
              max={1.5}
              step={0.05}
              size="small"
              sx={{
                width: 64,
                mx: 0.5,
                color: colors.textSecondary,
                "& .MuiSlider-thumb": { width: 12, height: 12 },
              }}
              aria-label="Zoom level"
            />
            <IconButton
              size="small"
              onClick={onZoomIn}
              disabled={scale >= 1.5}
              aria-label="Zoom in"
              sx={{ p: 0.5, color: colors.textSecondary }}
            >
              <ZoomInOutlined sx={{ fontSize: "0.9rem" }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: colors.textSecondary,
                minWidth: 34,
                textAlign: "right",
              }}
            >
              {Math.round(scale * 100)}%
            </Typography>
          </Box>
        </Box>
      </Box>
    </PageRightPanel>
  );
}
