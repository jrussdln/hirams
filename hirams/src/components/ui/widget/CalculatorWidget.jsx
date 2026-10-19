import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import getThemeColors from "../../../utils/style/getThemeColors";

// ── Inline color map — same per-file pattern the other widgets use ──────
const makeColors = (c) => ({
  border: c.slate.border,
  surface: c.slate.outerBgSolid, // solid: this panel must never be see-through
  headerBg: c.slate.itemHeaderBgSolid,
  keyBg: c.slate.btnBg,
  keyBorder: c.slate.btnBorder,
  keyHover: c.slate.btnHoverBg,
  displayBg: c.gray.inputBg,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  onFill: c.gray.textOnFill,
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  amber: { bg: c.amber.bg, border: c.amber.border, text: c.amber.text },
  red: { bg: c.red.bg, border: c.red.border, text: c.red.text },
  green: { text: c.green.text },
  shadow: c.shadow.popover,
});

// ── Geometry ───────────────────────────────────────────────────────────
const EDGE = 12; // minimum gap kept between the panel and the viewport edge
const MIN_W = 236;
const MIN_H = 320;
const DEFAULT_W = 272;
const DEFAULT_H = 380;

const clampNum = (n, min, max) => Math.min(Math.max(n, min), max);

// Where the panel lands the FIRST time it is opened — bottom-right of the
// viewport, which keeps it clear of the form the user just clicked in.
const defaultPos = () => ({
  x: Math.max(EDGE, window.innerWidth - DEFAULT_W - 24),
  y: Math.max(EDGE, Math.round((window.innerHeight - DEFAULT_H) / 3)),
});

// The panel is always kept fully inside the viewport — while it is dragged,
// resized, or the window itself changes size.
const clampPos = (p, s) => ({
  x: clampNum(p.x, EDGE, Math.max(EDGE, window.innerWidth - s.w - EDGE)),
  y: clampNum(p.y, EDGE, Math.max(EDGE, window.innerHeight - s.h - EDGE)),
});

// ── Number helpers ─────────────────────────────────────────────────────
// Kill float drift (0.1 + 0.2) before anything is shown or applied.
const round12 = (n) => Number(Number(n).toPrecision(12));

// "1234567.5" → "1,234,567.5" — thousands separators only, the trailing
// "." and the digits after it are left exactly as typed.
const groupDigits = (s) => {
  const text = String(s ?? "");
  const neg = text.startsWith("-");
  const body = neg ? text.slice(1) : text;
  const [int, dec] = body.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}${dec !== undefined ? `.${dec}` : ""}`;
};

const OPERATORS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => (b === 0 ? NaN : a / b),
};

// Display glyphs — the internal operator keys stay "+ - * /".
const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

// The keypad, top-left to bottom-right. `action` is resolved by press().
const KEY_ROWS = [
  [
    { label: "AC", action: "clear", tone: "warn", aria: "All clear" },
    { label: "⌫", action: "back", tone: "warn", aria: "Backspace" },
    { label: "%", action: "percent", tone: "op", aria: "Percent" },
    { label: "÷", action: "op:/", tone: "op", aria: "Divide" },
  ],
  [
    { label: "7", action: "d:7" },
    { label: "8", action: "d:8" },
    { label: "9", action: "d:9" },
    { label: "×", action: "op:*", tone: "op", aria: "Multiply" },
  ],
  [
    { label: "4", action: "d:4" },
    { label: "5", action: "d:5" },
    { label: "6", action: "d:6" },
    { label: "−", action: "op:-", tone: "op", aria: "Subtract" },
  ],
  [
    { label: "1", action: "d:1" },
    { label: "2", action: "d:2" },
    { label: "3", action: "d:3" },
    { label: "+", action: "op:+", tone: "op", aria: "Add" },
  ],
  [
    { label: "±", action: "sign", aria: "Toggle sign" },
    { label: "0", action: "d:0" },
    { label: ".", action: "dot" },
    { label: "=", action: "equals", tone: "accent", aria: "Equals" },
  ],
];

// One keypad key. Sizes itself to its grid cell so the whole pad stretches
// with the panel when it is resized.
function CalcKey({ label, tone = "plain", aria, onPress, colors }) {
  const isOp = tone === "op";
  const isWarn = tone === "warn";
  const isAccent = tone === "accent";

  return (
    <Box
      component="button"
      type="button"
      aria-label={aria || label}
      onClick={onPress}
      sx={{
        minWidth: 0,
        border: `1px solid ${isAccent ? colors.blue.text : isOp ? colors.blue.border : isWarn ? colors.red.border : colors.keyBorder}`,
        borderRadius: "8px",
        background: isAccent ? colors.blue.text : isOp ? colors.blue.bg : isWarn ? colors.red.bg : colors.keyBg,
        color: isAccent ? colors.onFill : isOp ? colors.blue.text : isWarn ? colors.red.text : colors.textPrimary,
        fontSize: tone === "plain" ? "0.95rem" : "0.85rem",
        fontWeight: 600,
        lineHeight: 1,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "background 0.12s, transform 0.08s",
        "&:hover": {
          background: isAccent ? colors.blue.text : isOp ? colors.blue.bg : colors.keyHover,
        },
        "&:active": { transform: "scale(0.96)" },
      }}
    >
      {label}
    </Box>
  );
}

/**
 * CalculatorWidget — the floating calculator behind the 🧮 button that sits
 * inside every peso field (FormGrid renders this and opens it from that icon).
 *
 * A draggable, resizable panel portaled straight to document.body: it has to
 * clear the MUI Modal every form lives in — that modal's paper carries
 * `transform: translate(-50%, -50%)`, which makes IT the containing block of
 * any position:fixed descendant, so an inline panel would be trapped (and
 * clipped by its overflow) inside the dialog. A portal escapes all of that,
 * and the 1600 z-index sits above the modal layer (1300).
 *
 * Props (all optional except open):
 *  - open      panel visible or not. The instance stays mounted while closed,
 *              so its position and size survive open → close → open.
 *  - onClose   close request (X button, Escape, or another calculator opening).
 *  - target    { name, label } of the field this calculator was opened for —
 *              null renders a plain calculator with no "Use in…" button.
 *  - onApply   onApply(value) hands the shown number back to the caller as a
 *              plain numeric string ("1234.56"); FormGrid writes it into the field.
 */
export default function CalculatorWidget({
  open = false,
  onClose,
  target = null,
  onApply = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => makeColors(base), [base]);

  // ── Window state ─────────────────────────────────────────────────────
  // entry  — the digits being typed ("" = nothing typed yet)
  // acc/op — the running total and the operator waiting on its right side
  // fresh  — the next digit starts a NEW number (after = or an operator)
  // tape   — the expression line above the result, e.g. "1,200 + 300 ="
  const [entry, setEntry] = useState("");
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const [tape, setTape] = useState("");
  const [error, setError] = useState("");

  // ── Window frame ─────────────────────────────────────────────────────
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Refs mirror the frame for the pointer handlers below, so a drag never
  // reads a stale position from a closure.
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const rootRef = useRef(null);
  const idRef = useRef(`calc-${Math.random().toString(36).slice(2)}`);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  // Two timers, one per flash — sharing one would leave the copy checkmark
  // stuck on screen the moment an apply overwrote its timeout.
  const applyRef = useRef(null);
  const copyRef = useRef(null);

  // ── One calculator at a time ─────────────────────────────────────────
  // Every FormGrid can mount its own instance, so opening one tells the
  // others (if any) to close through the same onClose the caller uses.
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(
      new CustomEvent("calculator-opened", { detail: { id: idRef.current } }),
    );
  }, [open]);

  useEffect(() => {
    const h = (e) => {
      if (e.detail?.id !== idRef.current) onClose?.();
    };
    window.addEventListener("calculator-opened", h);
    return () => window.removeEventListener("calculator-opened", h);
  }, [onClose]);

  // Fresh tape on every opening; the panel keeps its place and size.
  useEffect(() => {
    if (!open) return;
    setEntry("");
    setAcc(null);
    setOp(null);
    setFresh(true);
    setTape("");
    setError("");
  }, [open]);

  // Keyboard straight away: the panel takes focus when it opens (the modals
  // mount with disableEnforceFocus, so nothing fights it for focus).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => rootRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Keep the panel inside the viewport when the window itself changes size.
  useEffect(() => {
    const onResize = () => {
      const s = sizeRef.current;
      const next = {
        w: Math.min(s.w, Math.max(MIN_W, window.innerWidth - 2 * EDGE)),
        h: Math.min(s.h, Math.max(MIN_H, window.innerHeight - 2 * EDGE)),
      };
      setSize(next);
      setPos((p) => clampPos(p, next));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(applyRef.current);
      clearTimeout(copyRef.current);
    },
    [],
  );

  // ── Drag (the header) ────────────────────────────────────────────────
  const startDrag = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...posRef.current };

    const move = (ev) =>
      setPos(
        clampPos(
          {
            x: origin.x + ev.clientX - startX,
            y: origin.y + ev.clientY - startY,
          },
          sizeRef.current,
        ),
      );
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      document.body.style.removeProperty("user-select");
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  // ── Resize (the bottom-right corner) ─────────────────────────────────
  const startResize = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...sizeRef.current };

    const move = (ev) => {
      // Growing sideways can never push the right edge past the window, and
      // growing down never past the bottom — measured from where the panel
      // currently sits.
      const maxW = Math.max(MIN_W, window.innerWidth - posRef.current.x - EDGE);
      const maxH = Math.max(MIN_H, window.innerHeight - posRef.current.y - EDGE);
      setSize({
        w: clampNum(origin.w + (ev.clientX - startX), MIN_W, maxW),
        h: clampNum(origin.h + (ev.clientY - startY), MIN_H, maxH),
      });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      document.body.style.removeProperty("user-select");
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  // ── Calculator logic ─────────────────────────────────────────────────
  // What the right-hand side currently holds: whatever is being typed, or
  // the running total when nothing is (an operator pressed twice in a row).
  const currentValue = () => {
    if (entry === "" || entry === "-") return acc ?? 0;
    const n = Number(entry);
    return Number.isFinite(n) ? n : 0;
  };

  const reset = () => {
    setEntry("");
    setAcc(null);
    setOp(null);
    setFresh(true);
    setTape("");
    setError("");
  };

  const inputDigit = (d) => {
    // An error (÷ 0) is wiped by the first new keystroke, tape included.
    if (error) {
      setEntry(d);
      setAcc(null);
      setOp(null);
      setTape("");
      setError("");
      setFresh(false);
      return;
    }
    if (fresh) {
      setEntry(d);
      setFresh(false);
      return;
    }
    setEntry((prev) => {
      if (prev === "" || prev === "0") return d;
      if (prev.replace(/[^0-9]/g, "").length >= 15) return prev;
      return prev + d;
    });
  };

  const inputDot = () => {
    if (fresh || error || entry === "" || entry === "-") {
      setEntry(entry.startsWith("-") ? "-0." : "0.");
      setFresh(false);
      setError("");
      return;
    }
    setEntry((prev) => (prev.includes(".") ? prev : `${prev}.`));
  };

  const toggleSign = () => {
    if (error) return;
    setEntry((prev) =>
      prev === "" || prev === "0"
        ? prev
        : prev.startsWith("-")
          ? prev.slice(1)
          : `-${prev}`,
    );
  };

  const percent = () => {
    if (error) return;
    setEntry((prev) => String(round12((prev === "" ? acc ?? 0 : Number(prev)) / 100)));
    setFresh(false);
  };

  const backspace = () => {
    if (error) {
      reset();
      return;
    }
    if (fresh) return;
    setEntry((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
  };

  const inputOperator = (next) => {
    const cur = error ? 0 : currentValue();
    let nextAcc = cur;

    if (op !== null && acc !== null && !fresh) {
      const result = OPERATORS[op](acc, cur);
      if (!Number.isFinite(result)) {
        setTape(
          `${groupDigits(round12(acc))} ${OP_SYMBOL[op]} ${groupDigits(round12(cur))} =`,
        );
        setError("Cannot divide by zero");
        setAcc(null);
        setOp(null);
        setEntry("");
        setFresh(true);
        return;
      }
      nextAcc = round12(result);
    }

    setAcc(nextAcc);
    setOp(next);
    setTape(`${groupDigits(round12(nextAcc))} ${OP_SYMBOL[next]}`);
    setFresh(true);
    setError("");
  };

  const equals = () => {
    if (op === null || acc === null) return;
    const cur = error ? 0 : currentValue();
    const left = round12(acc);
    const result = OPERATORS[op](acc, cur);
    setTape(
      `${groupDigits(left)} ${OP_SYMBOL[op]} ${groupDigits(round12(cur))} =`,
    );

    if (!Number.isFinite(result)) {
      setError("Cannot divide by zero");
      setAcc(null);
      setOp(null);
      setEntry("");
      setFresh(true);
      return;
    }

    setEntry(String(round12(result)));
    setAcc(null);
    setOp(null);
    setFresh(true);
    setError("");
  };

  const press = (action) => {
    if (action.startsWith("d:")) return inputDigit(action.slice(2));
    if (action.startsWith("op:")) return inputOperator(action.slice(3));
    if (action === "clear") return reset();
    if (action === "back") return backspace();
    if (action === "percent") return percent();
    if (action === "sign") return toggleSign();
    if (action === "dot") return inputDot();
    if (action === "equals") return equals();
  };

  // ── Apply / copy ─────────────────────────────────────────────────────
  const shownNumber = () => {
    if (error) return NaN;
    const n = entry === "" || entry === "-" ? (acc ?? 0) : Number(entry);
    return Number.isFinite(n) ? round12(n) : NaN;
  };

  const handleApply = () => {
    const n = shownNumber();
    if (!Number.isFinite(n)) return;
    onApply?.(String(n));
    setApplied(true);
    clearTimeout(applyRef.current);
    applyRef.current = setTimeout(() => setApplied(false), 1200);
  };

  const handleCopy = () => {
    const n = shownNumber();
    if (!Number.isFinite(n)) return;
    navigator.clipboard?.writeText(String(n));
    setCopied(true);
    clearTimeout(copyRef.current);
    copyRef.current = setTimeout(() => setCopied(false), 1200);
  };

  // ── Keyboard ─────────────────────────────────────────────────────────
  // Bound to the panel itself: it holds focus from the moment it opens, so
  // keys land here and nowhere else. Every key we handle also STOPS
  // propagating — ModalContainer listens for Enter on window and would
  // otherwise save the form behind the calculator.
  const handleKeyDown = (e) => {
    // A focused button owns Enter / Space (it would fire on keyup); don't
    // run the same key through the calculator a second time.
    if (e.target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " "))
      return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      inputDigit(e.key);
    } else if (e.key === "." || e.key === ",") {
      e.preventDefault();
      e.stopPropagation();
      inputDot();
    } else if (e.key === "+") {
      e.preventDefault();
      e.stopPropagation();
      inputOperator("+");
    } else if (e.key === "-") {
      e.preventDefault();
      e.stopPropagation();
      inputOperator("-");
    } else if (e.key === "*" || e.key.toLowerCase() === "x") {
      e.preventDefault();
      e.stopPropagation();
      inputOperator("*");
    } else if (e.key === "/") {
      e.preventDefault();
      e.stopPropagation();
      inputOperator("/");
    } else if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      e.stopPropagation();
      equals();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      backspace();
    } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
      e.preventDefault();
      e.stopPropagation();
      reset();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onClose?.();
    }
  };

  if (!open) return null;

  const displayValue = error
    ? error
    : entry !== "" && entry !== "-"
      ? groupDigits(entry)
      : acc !== null
        ? groupDigits(round12(acc))
        : "0";

  const applyLabel = target?.label
    ? `Use in ${target.label}`
    : "Use in amount field";

  return createPortal(
    <Box
      ref={rootRef}
      component="section"
      role="dialog"
      aria-label="Calculator"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      sx={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        width: size.w,
        height: size.h,
        zIndex: 1600, // above the MUI modal layer (1300)
        display: "flex",
        flexDirection: "column",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        bgcolor: colors.surface,
        boxShadow: `0 12px 40px ${colors.shadow}`,
        overflow: "hidden",
        outline: "none",
      }}
    >
      {/* ── Header — the drag handle ─────────────────────────────────── */}
      <Box
        onPointerDown={startDrag}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          height: 36,
          flexShrink: 0,
          bgcolor: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragIndicatorIcon
          sx={{ fontSize: "1rem", color: colors.textMuted, flexShrink: 0 }}
        />
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            color: colors.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Calculator
        </Typography>
        {target?.label && (
          <Typography
            title={target.label}
            sx={{
              maxWidth: "45%",
              fontSize: "0.6rem",
              fontWeight: 600,
              color: colors.textMuted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            → {target.label}
          </Typography>
        )}
        <IconButton
          size="small"
          aria-label="Close calculator"
          onClick={onClose}
          sx={{ color: colors.textMuted, "&:hover": { color: colors.textPrimary } }}
        >
          <CloseIcon sx={{ fontSize: "0.95rem" }} />
        </IconButton>
      </Box>

      {/* ── Display ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          bgcolor: colors.displayBg,
        }}
      >
        <Typography
          sx={{
            minHeight: "0.85rem",
            fontSize: "0.6rem",
            color: colors.textMuted,
            textAlign: "right",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tape || "\u00A0"}
        </Typography>
        <Typography
          title={displayValue}
          sx={{
            fontSize: "1.45rem",
            fontWeight: 600,
            lineHeight: 1.3,
            color: error ? colors.red.text : colors.textPrimary,
            textAlign: "right",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayValue}
        </Typography>
      </Box>

      {/* ── Keypad — every row grows with the panel ──────────────────── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridAutoRows: "1fr",
          gap: 0.5,
          p: 0.75,
        }}
      >
        {KEY_ROWS.flat().map((k) => (
          <CalcKey
            key={k.label}
            label={k.label}
            aria={k.aria}
            tone={k.tone}
            colors={colors}
            onPress={() => press(k.action)}
          />
        ))}
      </Box>

      {/* ── Footer — push the result into the field it was opened for ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          p: 0.75,
          flexShrink: 0,
          borderTop: `1px solid ${colors.border}`,
          bgcolor: colors.headerBg,
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={handleApply}
          disabled={!onApply}
          title={onApply ? `Write ${displayValue} into ${target?.label ?? "the field"}` : "No field attached"}
          sx={{
            flex: 1,
            minWidth: 0,
            height: 30,
            px: 1,
            border: `1px solid ${colors.blue.text}`,
            borderRadius: "7px",
            background: applied ? colors.blue.bg : colors.blue.text,
            color: applied ? colors.blue.text : colors.onFill,
            fontFamily: "inherit",
            fontSize: "0.68rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: onApply ? "pointer" : "default",
            opacity: onApply ? 1 : 0.5,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {applied ? "Applied ✓" : applyLabel}
        </Box>
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label="Copy result"
          title="Copy result"
          sx={{
            color: copied ? colors.green.text : colors.textMuted,
            border: `1px solid ${colors.keyBorder}`,
            borderRadius: "7px",
            width: 30,
            height: 30,
            "&:hover": { color: colors.textPrimary },
          }}
        >
          {copied ? (
            <CheckCircleOutlined sx={{ fontSize: "0.95rem" }} />
          ) : (
            <ContentCopyOutlined sx={{ fontSize: "0.9rem" }} />
          )}
        </IconButton>
      </Box>

      {/* ── Resize corner (sits above everything, top layer) ─────────── */}
      <Box
        onPointerDown={startResize}
        title="Resize"
        aria-hidden
        sx={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          cursor: "nwse-resize",
          touchAction: "none",
          background: `linear-gradient(135deg, transparent 46%, ${colors.textMuted} 46%, ${colors.textMuted} 54%, transparent 54%, transparent 64%, ${colors.textMuted} 64%, ${colors.textMuted} 72%, transparent 72%)`,
        }}
      />
    </Box>,
    document.body,
  );
}
