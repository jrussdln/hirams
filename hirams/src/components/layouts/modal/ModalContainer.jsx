import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Divider,
  IconButton,
  Fade,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DotSpinner from "../../../components/ui/loader/DotSpinner";
import BaseButton from "../../../components/ui/form/BaseButton";
import getThemeColors from "../../../utils/style/getThemeColors";
import { DragIndicatorOutlined } from "@mui/icons-material";
import UpDownIndicatorWidget from "../../../components/ui/widget/UpDownIndicatorWidget";
// ── PROMPT 1 — useColors(c): SOLID colors ONLY ───────────────────────
const useColors = (c) => ({
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  blueTextDark: c.blue.textStrong,

  // ✅ 100% SOLID — NO opacity in ANY mode! The palette now exposes
  // alpha-free variants for exactly this, so nothing is hand-rolled here.
  modalBg: c.slate.outerBgSolid,
  headerFooterBg: c.slate.itemHeaderBgSolid,
  overlayBg: c.slate.loadingOverlay,
});

function ModalContainer({
  open,
  handleClose,
  title,
  subTitle = "",
  children,
  onSave,
  saveLabel = "Save",
  showFooter = true,
  showSave = true,
  footerLogo = `${import.meta.env.BASE_URL}images/hirams-icon-rectangle.png`,
  width,
  loading = false,
  showCancel = true,
  cancelLabel = "Cancel",
  onCancel,
  disableBackdropClick = true,
  disabled = false,
  customMessage = null,
  contentPadding = { xs: 1, sm: 2 },
  extraActions = null,
  contentOnly = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ✅ Wired EXACTLY as PROMPT 1 specifies
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const contentScrollRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key !== "Enter") return;
      if (loading || disabled || !showSave || !onSave) return;

      const active = document.activeElement;
      if (active?.closest(".ql-editor")) return;
      if (active?.tagName === "BUTTON") return;

      e.preventDefault();
      e.stopPropagation();
      onSave();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, disabled, showSave, onSave]);

  const defaultWidth = { xs: "90%", sm: 440, md: 650 };
  const handleCancelClick = () => (onCancel ? onCancel() : handleClose());
  const handleBackdropClick = (event, reason) => {
    if (disableBackdropClick && reason === "backdropClick") return;
    handleClose(event, reason);
  };

  // ── Move the window ─────────────────────────────────────────────────────
  // The footer's drag button puts the card in move mode: the header then
  // drags the whole modal around the screen. The offset is kept from the
  // centred position, so the modal always opens where it always did.
  const [moveMode, setMoveMode] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const startDrag = (event) => {
    if (!moveMode) return;
    // Only the header drags — the content and the buttons must keep working.
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.baseX + (event.clientX - drag.startX),
      y: drag.baseY + (event.clientY - drag.startY),
    });
  };

  const endDrag = (event) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const toggleMoveMode = () => {
    setMoveMode((v) => {
      const next = !v;
      // Leaving move mode puts the card back where it opened.
      if (!next) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const showHeader = !contentOnly;
  const showFooterFinal = !contentOnly && showFooter;

  return (
    <Modal
      open={open}
      onClose={handleBackdropClick}
      closeAfterTransition
      disableEnforceFocus
      disableAutoFocus
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Fade in={open} timeout={150}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            // The offset is the move-mode drag; the card still opens centred.
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            width: width || defaultWidth,
            maxWidth: "95%",
            maxHeight: "90vh",
            bgcolor: contentOnly ? "transparent" : colors.modalBg, // ✅ SOLID
            borderRadius: contentOnly ? 0 : 2,
            boxShadow: contentOnly ? "none" : 26,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          {showHeader && (
            <Box
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 3,
                pl: 1,
                py: 1.5,
                borderBottom: `1px solid ${colors.border}`,
                bgcolor: colors.headerFooterBg, // ✅ SOLID
                pointerEvents: "auto",
                zIndex: 1,
                // In move mode the header is the handle: it grabs the card
                // and moves it around the screen.
                cursor: moveMode ? "grab" : "default",
                touchAction: moveMode ? "none" : "auto",
                userSelect: moveMode ? "none" : "auto",
                transition: moveMode ? "none" : "background 0.15s",
                ...(moveMode && {
                  boxShadow: `inset 0 0 0 1px ${colors.blueTextDark}`,
                }),
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                {/* The handle and the navy bar sit tight together — the gap
                    between them is a fraction of the one before the title. */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.25,
                    flexShrink: 0,
                  }}
                >
                  {/* MOVE — puts the card in move mode: the header then
                      drags the whole modal around the screen. Clicking it
                      again puts the card back where it opened. */}
                  <Box
                    component="button"
                    onClick={toggleMoveMode}
                    // The header is the drag handle — this button must NOT
                    // start a drag, or it could never be clicked a second
                    // time (the pointer would be captured by the drag).
                    onPointerDown={(e) => e.stopPropagation()}
                    title={
                      moveMode
                        ? "Stop moving — the card goes back to its place"
                        : "Move this window"
                    }
                    aria-label="Move this window"
                    aria-pressed={moveMode}
                    sx={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "6px",
                      cursor: "pointer",
                      flexShrink: 0,
                      color: moveMode
                        ? colors.blueTextDark
                        : colors.textSecondary,
                      background: moveMode ? colors.blueBg : "transparent",
                      border: `1px solid ${
                        moveMode ? colors.blueTextDark : "transparent"
                      }`,
                      transition: "all 0.15s",
                      "&:hover": { background: colors.blueBg },
                    }}
                  >
                    <DragIndicatorOutlined sx={{ fontSize: "0.95rem" }} />
                  </Box>

                  {/* ✅ VERTICAL NAVY BAR — BACK FOREVER */}
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      borderRadius: "9999px",
                      bgcolor: colors.blueTextDark,
                      flexShrink: 0,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minWidth: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: ".7rem", sm: ".75rem", md: ".85rem" },
                      fontWeight: 600,
                      lineHeight: 1,
                      color: colors.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {title}
                  </Typography>
                  {subTitle && (
                    <Typography
                      // A DIV, not the default <p>: the subtitle may carry
                      // inline nodes (the JEV viewer's type · DV-code link),
                      // and a <div> may not live inside a <p>.
                      component="div"
                      sx={{
                        fontSize: { xs: "0.68em", sm: "0.7em" },
                        fontStyle: "italic",
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: colors.textSecondary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px",
                      }}
                    >
                      {subTitle}
                    </Typography>
                  )}
                </Box>
              </Box>

              <IconButton
                size="small"
                onClick={handleClose}
                // Never a drag handle — the close button has to close.
                onPointerDown={(e) => e.stopPropagation()}
                sx={{
                  color: colors.textSecondary,
                  "&:hover": { color: colors.textPrimary },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Box
            id="modal-description"
            ref={contentScrollRef}
            sx={{
              overflowY: "auto",
              flex: 1,
              position: "relative",
              minHeight: "100px",
              pointerEvents: loading ? "none" : "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <UpDownIndicatorWidget
              scrollRef={contentScrollRef}
              direction="up"
              watch={[children, loading, open]}
            />
            <Box
              sx={{
                p: contentOnly ? 0 : contentPadding,
                opacity: loading ? 0 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {children}
            </Box>
            <UpDownIndicatorWidget
              scrollRef={contentScrollRef}
              direction="down"
              watch={[children, loading, open]}
            />

            <Fade in={loading} timeout={200} unmountOnExit>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1200,
                  pointerEvents: "none",
                  bgcolor: colors.overlayBg,
                }}
              >
                <DotSpinner message={true} loadingMessage={customMessage} />
              </Box>
            </Fade>
          </Box>
          {/* FOOTER */}
          {showFooterFinal && (
            <>
              <Divider sx={{ borderColor: colors.border }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1,
                  bgcolor: colors.headerFooterBg, // ✅ SOLID
                  borderTop: `1px solid ${colors.border}`,
                }}
              >
                {footerLogo && (
                  <Box
                    component="img"
                    src={footerLogo}
                    alt="Logo"
                    sx={{ height: 32 }}
                  />
                )}

                <Box sx={{ display: "flex", gap: 1 }}>
                  {showCancel && (
                    <BaseButton
                      label={cancelLabel}
                      onClick={handleCancelClick}
                      variant="outlined"
                      actionColor="cancel"
                      disabled={loading}
                    />
                  )}
                  {showSave && (
                    <BaseButton
                      label={saveLabel}
                      onClick={onSave}
                      disabled={loading || disabled}
                      actionColor="approve"
                    />
                  )}
                  {extraActions}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Fade>
    </Modal>
  );
}

export default ModalContainer;
