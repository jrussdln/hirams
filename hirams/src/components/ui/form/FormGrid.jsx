import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  FormControl,
  InputLabel,
  Typography,
  InputAdornment,
  IconButton,
  Skeleton,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import icons from "../../../utils/style/iconFormatStyles";
import getThemeColors from "../../../utils/style/getThemeColors";
import CalculatorWidget from "../widget/CalculatorWidget";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// ─────────────────────────────────────────────────────────────────────
// 🎨 CENTRALIZED COLOR MAP — per-file useColors pattern
// ────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  // Text
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  textHeading: c.gray.textHeading,
  textDisabled: c.gray.textDisabled,

  // Blue — chips, focus, borders
  blueText: c.blue.text,
  blueTextDark: c.blue.textDark,
  blueBg: c.blue.bg,
  blueBorder: c.blue.border,

  // Navy — brand color (checkbox/switch checked state, was color="primary")
  navyText: c.navy.text,

  // Green — copy success
  greenText: c.green.text,

  // Indigo — serial focus / add button
  indigoText: c.indigo.text,

  // Violet — add button hover
  violetText: c.violet.text,

  // Slate — borders, backgrounds
  slateBorder: c.slate.border,
  slateBtnBorder: c.slate.btnBorder,
  slateMutedBg: c.slate.mutedBg,
  slateItemHeaderBg: c.slate.itemHeaderBg,

  // Red — errors
  redDanger: c.red.danger,
});

// ── Icon map for special field types ──────────────────────────────────
const FIELD_TYPE_META = {
  tin: {
    icon: icons.tin,
    inputMode: "numeric",
    placeholder: "000-000-000-00000",
  },
  bank: {
    icon: icons.bank,
    inputMode: "numeric",
    placeholder: "Account number",
  },
  password: { icon: icons.password, inputMode: undefined, placeholder: "" },
  email: {
    icon: icons.email,
    inputMode: "email",
    placeholder: "you@example.com",
  },
  phone: { icon: icons.phone, inputMode: "tel", placeholder: "0900-000-0000" },
  username: {
    icon: icons.username,
    inputMode: undefined,
    placeholder: "Username",
  },
};

const ICON_SX = { fontSize: "1rem", color: "text.secondary" };

// ── Copy Chip ─────────────────────────────────────────────────────────
function CopyChip({ sn }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const clr = useMemo(() => useColors(base), [base]);

  const [copied, setCopied] = useState(false);

  return (
    <Box
      component="span"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(sn).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={copied ? "Copied!" : "Copy"}
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        ml: 0.25,
        color: copied ? clr.greenText : clr.blueText,
        "&:hover": { color: copied ? clr.greenText : clr.blueTextDark },
        transition: "color 0.2s",
      }}
    >
      {copied ? (
        <CheckCircleOutlined sx={{ fontSize: "0.6rem" }} />
      ) : (
        <ContentCopyOutlined sx={{ fontSize: "0.6rem" }} />
      )}
    </Box>
  );
}

// ── Serial Number Field ────────────────────────────────────────────────
function SerialNumberField({ field, serials, onAdd, onRemove }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const clr = useMemo(() => useColors(base), [base]);
  const [draft, setDraft] = useState("");

  return (
    <>
      {/* Chips */}
      {serials.length > 0 && (
        <Box
          sx={{ px: 1, pb: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}
        >
          {serials.map((s, i) => (
            <Box
              key={i}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.75,
                py: 0.25,
                borderRadius: "5px",
                background: clr.blueBg,
                border: `0.5px solid ${clr.blueBorder}`,
                maxWidth: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: clr.blueText,
                  lineHeight: 1,
                  wordBreak: "break-all",
                }}
              >
                {s}
              </Typography>
              <CopyChip sn={s} />
              {!field.disabled && (
                <Box
                  component="span"
                  onClick={() => onRemove(i)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    color: clr.textMuted,
                    fontSize: "0.6rem",
                    lineHeight: 1,
                    ml: 0.25,
                    "&:hover": { color: clr.blueText },
                  }}
                >
                  ✕
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Input Row */}
      {!field.disabled && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            pb: 0.75,
            gap: 0.5,
          }}
        >
          <Box
            component="input"
            value={draft}
            placeholder={field.placeholder || "Type and press Enter to add..."}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                onAdd(draft);
                setDraft("");
              }
              if (e.key === "Backspace" && !draft && serials.length) {
                onRemove(serials.length - 1);
              }
            }}
            sx={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "0.72rem",
              color: "text.primary",
              py: 0.25,
              "::placeholder": { color: clr.textMuted },
            }}
          />
          <Box
            component="span"
            onClick={() => {
              onAdd(draft);
              setDraft("");
            }}
            sx={{
              fontSize: "0.55rem",
              color:
                draft.trim() &&
                (field.maxItems === undefined ||
                  serials.length < field.maxItems)
                  ? clr.indigoText
                  : clr.textMuted,
              cursor:
                draft.trim() &&
                (field.maxItems === undefined ||
                  serials.length < field.maxItems)
                  ? "pointer"
                  : "default",
              flexShrink: 0,
              userSelect: "none",
              letterSpacing: "0.04em",
              "&:hover": {
                color: draft.trim() ? clr.violetText : clr.textMuted,
              },
            }}
          >
            + ADD
          </Box>
        </Box>
      )}
    </>
  );
}

// ── MAIN FormGrid ─────────────────────────────────────────────────────
export default function FormGrid({
  fields = [],
  switches = [],
  formData = {},
  errors = {},
  handleChange,
  handleSwitchChange,
  onLastFieldTab,
  autoFocus = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const clr = useMemo(() => useColors(base), [base]);

  const firstInputRef = useRef(null);
  const inputRefs = useRef([]);
  const [showPassword, setShowPassword] = useState({});
  const [pesoDisplayValues, setPesoDisplayValues] = useState({});
  const [selectSearch, setSelectSearch] = useState({});
  // Which peso field the floating calculator was opened from — null = closed.
  // The widget itself is dragged / resized / dismissed; this only names the
  // field its "Use in …" button writes back into.
  const [calcField, setCalcField] = useState(null);

  const togglePasswordVisibility = (name) =>
    setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    if (autoFocus === false) return;
    const timer = setTimeout(() => firstInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  // ── Peso fields can also be written from OUTSIDE FormGrid ─────────────
  // (the entry modal's click-to-fill, a form reset, an edit screen loading
  // its record). While the user types, this component writes BOTH sides in
  // the same handler, so they never diverge — a divergence therefore means
  // an external write, and this typed cache has to follow it, or the box
  // keeps showing the number that was there before. Values differing only
  // as TEXT ("12." vs 12) are left alone so the caret never jumps while
  // someone is mid-typing.
  useEffect(() => {
    setPesoDisplayValues((prev) => {
      let next = prev;
      fields.forEach((f) => {
        if (f?.type !== "peso") return;
        const raw = formData?.[f.name];
        const stored = raw === undefined || raw === null ? "" : String(raw);
        const shown = prev[f.name];
        if (shown === undefined || shown === stored) return;
        if (stored !== "" && shown !== "" && Number(shown) === Number(stored))
          return;
        if (next === prev) next = { ...prev };
        next[f.name] = stored;
      });
      return next;
    });
  }, [formData, fields]);

  const handleKeyDown = (e, index, multiline) => {
    if (!multiline && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < inputRefs.current.length) {
        inputRefs.current[nextIndex]?.focus();
      } else if (onLastFieldTab) {
        onLastFieldTab();
      }
    }
  };

  // ── Quill Renderer ──────────────────────────────────────────────────
  const renderQuill = (field, index) => {
    const bgColor = theme.palette.background.paper;
    const quillTextColor = clr.textPrimary;
    let toolbarOptions = [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }],
      [{ background: [] }],
    ];
    if (field.showHighlighter === false && !field.readOnlyHighlight) {
      toolbarOptions = [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: [] }],
      ];
    }
    const transparentStyle =
      field.showHighlighter === false
        ? `.ql-editor span[style*="background-color"] { background-color: transparent !important; }`
        : "";
    const quillMinHeight = "32vh";
    const disabledLookStyle = field.readOnlyHighlight
      ? `
        .${field.name.replace(/[^a-zA-Z0-9]/g, "_")}-disabled-wrap .ql-toolbar.ql-snow {
          opacity: 0.5;
          pointer-events: none;
          background: ${clr.slateMutedBg} !important;
        }
        .${field.name.replace(/[^a-zA-Z0-9]/g, "_")}-disabled-wrap .ql-container.ql-snow {
          background: ${clr.slateMutedBg} !important;
        }
        .${field.name.replace(/[^a-zA-Z0-9]/g, "_")}-disabled-wrap .ql-editor {
          color: ${clr.textDisabled} !important;
        }
      `
      : "";
    const uniqueClass = field.readOnlyHighlight
      ? `ql-readonly-${field.name.replace(/[^a-zA-Z0-9]/g, "_")}`
      : "";

    return (
      <>
        {field.showHighlighter === false && <style>{transparentStyle}</style>}
        {field.readOnlyHighlight && <style>{disabledLookStyle}</style>}
        <div
          className={
            field.readOnlyHighlight
              ? `${field.name.replace(/[^a-zA-Z0-9]/g, "_")}-disabled-wrap`
              : undefined
          }
          style={
            field.readOnlyHighlight
              ? { border: `1px solid ${clr.slateBorder}`, borderRadius: 8 }
              : undefined
          }
        >
          <style>{`
          .ql-editor {
            max-height: ${field.maxHeight || 300}px;
            min-height: ${quillMinHeight};
            overflow-y: auto;
            color: ${quillTextColor} !important;
          }
          .ql-container.ql-snow { border-color: ${clr.slateBorder} !important; }
          .ql-toolbar.ql-snow {
            border-color: ${clr.slateBorder} !important;
            background: ${clr.slateItemHeaderBg};
          }
          .ql-snow .ql-stroke { stroke: ${clr.textHeading} !important; }
          ${field.readOnlyHighlight ? `.${uniqueClass} .ql-editor { caret-color: transparent; cursor: default; user-select: text; }` : ""}
        `}</style>

          <FormControl fullWidth size="small" error={!!errors[field.name]}>
            <InputLabel
              shrink
              sx={{ backgroundColor: bgColor, px: 0.5, borderRadius: 0.25 }}
            >
              {field.label}
            </InputLabel>
            <ReactQuill
              theme="snow"
              value={formData[field.name] || ""}
              onChange={(val) => {
                if (field.readOnlyHighlight) {
                  const stripTags = (html) => html.replace(/<[^>]*>/g, "");
                  if (stripTags(val) !== stripTags(formData[field.name] || ""))
                    return;
                }
                handleChange({ target: { name: field.name, value: val } });
              }}
              placeholder={field.placeholder || ""}
              modules={{ toolbar: toolbarOptions }}
              readOnly={field.readOnly}
              className={uniqueClass}
              style={{
                minHeight: field.minRows ? field.minRows * 24 : 100,
                backgroundColor: bgColor,
              }}
              ref={(el) => {
                inputRefs.current[index] = el;
                if (el && field.readOnlyHighlight) {
                  const editor = el.getEditor?.();
                  if (editor && !editor.__readOnlyBound) {
                    editor.__readOnlyBound = true;
                    editor.root.addEventListener("keydown", (e) => {
                      const isAllowed =
                        (e.ctrlKey &&
                          ["c", "a", "z"].includes(e.key.toLowerCase())) ||
                        [
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                          "Tab",
                        ].includes(e.key);
                      if (!isAllowed) e.preventDefault();
                    });
                    editor.root.addEventListener("paste", (e) =>
                      e.preventDefault(),
                    );
                    editor.root.addEventListener("cut", (e) =>
                      e.preventDefault(),
                    );
                    editor.root.setAttribute("contenteditable", "false");
                  }
                }
              }}
            />
            {errors[field.name] && (
              <Typography variant="caption" color="error">
                {errors[field.name]}
              </Typography>
            )}
          </FormControl>
        </div>
      </>
    );
  };

  // ── Serial Number Fieldset ──────────────────────────────────────────
  const renderSerialNumber = (field, index) => {
    const serials = Array.isArray(formData[field.name])
      ? formData[field.name]
      : formData[field.name]
        ? String(formData[field.name]).split("\n").filter(Boolean)
        : [];

    const addSerial = (raw) => {
      const val = raw.trim();
      if (!val) return;
      if (serials.includes(val)) return;
      if (field.maxItems !== undefined && serials.length >= field.maxItems)
        return;
      if (field.allowedValues?.length > 0 && !field.allowedValues.includes(val))
        return;
      handleChange({ target: { name: field.name, value: [...serials, val] } });
    };

    const removeSerial = (i) => {
      handleChange({
        target: {
          name: field.name,
          value: serials.filter((_, idx) => idx !== i),
        },
      });
    };

    // Buttons attached to the right of the field, in order — `field.actions`
    // holds a list (camera scan, then "Sync Received SN"), while `field.action`
    // stays as the single-action shorthand.
    const actions = field.actions ?? (field.action ? [field.action] : []);

    return (
      <Grid item xs={12} sm={field.xs || 12} key={field.name}>
        <Box
          sx={{
            display: actions.length ? "flex" : "block",
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              flex: actions.length ? 1 : undefined,
              minWidth: 0,
              border: `0.5px solid ${errors[field.name] ? clr.redDanger : clr.slateBorder}`,
              borderRadius: actions.length ? "7px 0 0 7px" : "7px",
              background: field.disabled
                ? clr.slateMutedBg
                : theme.palette.background.paper,
              transition: "border-color 0.15s",
              "&:focus-within": {
                borderColor: errors[field.name] ? clr.redDanger : clr.indigoText,
              },
            }}
          >
            <Box sx={{ px: 1.25, pt: 0.75, pb: serials.length ? 0.5 : 0 }}>
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  lineHeight: 1,
                  color: errors[field.name] ? clr.redDanger : clr.textSecondary,
                  textTransform: "uppercase",
                }}
              >
                {field.label}
              </Typography>
            </Box>
            <SerialNumberField
              field={field}
              serials={serials}
              onAdd={addSerial}
              onRemove={removeSerial}
            />
          </Box>

          {/* Optional attached actions (e.g. camera scan, "Sync Received SN") */}
          {actions.map((act, i) => (
            <Box
              key={act.label || i}
              component="button"
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              title={act.title || act.label}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.4,
                flexShrink: 0,
                minWidth: 34,
                px: act.label ? 1.25 : 0.5,
                border: `0.5px solid ${errors[field.name] ? clr.redDanger : clr.slateBorder}`,
                borderLeft: "none",
                // Only the last one closes the rounded end; the ones before it
                // butt together, their right edge acting as the divider.
                borderRadius: i === actions.length - 1 ? "0 7px 7px 0" : "0",
                background: act.disabled
                  ? clr.slateMutedBg
                  : theme.palette.background.paper,
                color: act.disabled ? clr.textMuted : clr.indigoText,
                fontSize: "0.58rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                cursor: act.disabled ? "not-allowed" : "pointer",
                transition: "color 0.15s, background 0.15s",
                "&:hover:not(:disabled)": {
                  background: clr.slateMutedBg,
                  color: clr.violetText,
                },
              }}
            >
              {act.icon}
              {act.label}
            </Box>
          ))}
        </Box>
        {errors[field.name] && (
          <Typography
            sx={{
              fontSize: "0.58rem",
              color: clr.redDanger,
              mt: 0.4,
              ml: 0.25,
            }}
          >
            {errors[field.name]}
          </Typography>
        )}
      </Grid>
    );
  };

  // ── Special Field Renderer (TIN/Bank/Email/Phone/Password) ───────────
  const renderSpecialField = (field, index) => {
    const meta = FIELD_TYPE_META[field.name]
      ? FIELD_TYPE_META[field.type]
      : FIELD_TYPE_META[field.type];
    const isPassword = field.type === "password";
    const visible = showPassword[field.name];

    const handleTinChange = (e) => {
      let raw = e.target.value.replace(/\D/g, "").slice(0, 14);
      const parts = [];
      for (let i = 0; i < raw.length; i += 3) parts.push(raw.slice(i, i + 3));
      handleChange({ target: { name: field.name, value: parts.join("-") } });
    };

    const handleNumericChange = (e) => {
      const max =
        field.type === "bank" ? 16 : field.type === "phone" ? 11 : undefined;
      const raw = e.target.value.replace(/\D/g, "").slice(0, max);
      handleChange({ target: { name: field.name, value: raw } });
    };

    const changeHandler =
      field.type === "tin"
        ? handleTinChange
        : field.type === "bank"
          ? handleNumericChange
          : field.type === "phone"
            ? handleNumericChange
            : handleChange;

    return (
      <Grid item xs={12} sm={field.xs || 12} key={field.name}>
        <TextField
          label={field.label}
          name={field.name}
          fullWidth
          size="small"
          type={isPassword ? (visible ? "text" : "password") : "text"}
          inputMode={meta.inputMode}
          value={formData[field.name] || ""}
          error={!!errors[field.name]}
          helperText={errors[field.name] || field.helperText || ""}
          disabled={field.disabled}
          placeholder={field.placeholder ?? meta.placeholder}
          inputRef={(el) => {
            inputRefs.current[index] = el;
            if (!firstInputRef.current) firstInputRef.current = el;
          }}
          onKeyDown={(e) => handleKeyDown(e, index, false)}
          onChange={changeHandler}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {React.cloneElement(meta.icon, { sx: ICON_SX })}
              </InputAdornment>
            ),
            ...(isPassword && {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility(field.name)}
                    edge="end"
                    size="small"
                    disabled={field.disabled}
                  >
                    {visible ? (
                      <Visibility sx={ICON_SX} />
                    ) : (
                      <VisibilityOff sx={ICON_SX} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }),
          }}
        />
      </Grid>
    );
  };

  // ── Field Router ─────────────────────────────────────────────────────
  firstInputRef.current = null;

  return (
    <Grid container spacing={1.5}>
      {fields.map((field, index) => {
        // Special typed fields
        if (FIELD_TYPE_META[field.type])
          return renderSpecialField(field, index);

        const isDateField = ["date", "time", "datetime-local"].includes(
          field.type,
        );
        const disabled = field.dependsOn ? !formData[field.dependsOn] : false;

        // Custom renderer
        if (field.type === "custom" && field.render) {
          return (
            <Grid item xs={12} sm={field.xs || 12} key={field.name}>
              {field.render()}
            </Grid>
          );
        }

        // Date field
        if (field.type === "date") {
          return (
            <Grid item xs={12} sm={field.xs || 12} key={field.name}>
              <TextField
                label={field.label}
                name={field.name}
                type="date"
                fullWidth
                size="small"
                value={formData[field.name] || ""}
                onChange={handleChange}
                error={!!errors[field.name]}
                helperText={errors[field.name] || field.helperText || ""}
                disabled={field.disabled}
                placeholder={field.placeholder || ""}
                InputLabelProps={{ shrink: true }}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                  if (!firstInputRef.current) firstInputRef.current = el;
                }}
                onKeyDown={(e) => handleKeyDown(e, index, false)}
                inputProps={{ min: field.minDate, max: field.maxDate }}
              />
            </Grid>
          );
        }

        // Peso / Currency field
        if (field.type === "peso") {
          const rawStored = formData[field.name];
          const displayValue =
            pesoDisplayValues[field.name] !== undefined
              ? pesoDisplayValues[field.name]
              : rawStored !== undefined && rawStored !== ""
                ? Number(rawStored).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "";

          return (
            <Grid item xs={12} sm={field.xs || 12} key={field.name}>
              <TextField
                label={field.label}
                name={field.name}
                type="text"
                fullWidth
                size="small"
                value={displayValue}
                error={!!errors[field.name]}
                helperText={errors[field.name] || field.helperText || ""}
                disabled={field.disabled}
                placeholder={field.placeholder || "0.00"}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                  if (!firstInputRef.current) firstInputRef.current = el;
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e, index, false);
                  const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                    "Enter",
                    ".",
                  ];
                  if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key))
                    e.preventDefault();
                }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  if (/^\d*\.?\d{0,2}$/.test(raw)) {
                    setPesoDisplayValues((prev) => ({
                      ...prev,
                      [field.name]: raw,
                    }));
                    handleChange({ target: { name: field.name, value: raw } });
                  }
                }}
                onBlur={() => {
                  const raw = formData[field.name];
                  setPesoDisplayValues((prev) => {
                    const u = { ...prev };
                    delete u[field.name];
                    return u;
                  });
                  if (raw !== "" && raw !== undefined && !isNaN(Number(raw))) {
                    handleChange({
                      target: {
                        name: field.name,
                        value: Number(raw).toFixed(2),
                      },
                    });
                  }
                }}
                onFocus={() => {
                  const raw = formData[field.name];
                  const unformatted =
                    raw !== "" && raw !== undefined && !isNaN(Number(raw))
                      ? String(Number(raw))
                      : "";
                  setPesoDisplayValues((prev) => ({
                    ...prev,
                    [field.name]: unformatted,
                  }));
                }}
                InputProps={{
                  readOnly: field.InputProps?.readOnly,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        ₱
                      </Typography>
                    </InputAdornment>
                  ),
                  // The 🧮 that opens the floating calculator, sitting inside
                  // the field at its right end. Opt out per field with
                  // `calculator: false`; a disabled field gets no button.
                  endAdornment:
                    field.disabled || field.calculator === false ? null : (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label={`Open calculator for ${field.label}`}
                          title="Open calculator"
                          onClick={() =>
                            setCalcField({ name: field.name, label: field.label })
                          }
                          sx={{
                            color: clr.textMuted,
                            p: 0.25,
                            "&:hover": { color: clr.blueText },
                          }}
                        >
                          {React.cloneElement(icons.calculator, {
                            sx: { fontSize: "1.05rem" },
                          })}
                        </IconButton>
                      </InputAdornment>
                    ),
                }}
              />
            </Grid>
          );
        }

        // Select / Dropdown with search
        if (field.type === "select") {
          const options = field.options || [];
          const isLoadingOptions = field.loading === true;

          return (
            <Grid item xs={12} sm={field.xs || 12} key={field.name}>
              <TextField
                select
                fullWidth
                size="small"
                label={field.label}
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                error={!!errors[field.name]}
                helperText={errors[field.name] || field.helperText || ""}
                disabled={field.disabled}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                  if (!firstInputRef.current) firstInputRef.current = el;
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: { sx: { maxHeight: 300 } },
                    autoFocus: false,
                  },
                  onOpen: () => {
                    if ((field.options || []).length > 8) {
                      setTimeout(() => {
                        document
                          .getElementById(`select-search-${field.name}`)
                          ?.focus();
                      }, 50);
                    }
                  },
                  onClose: () =>
                    setSelectSearch((prev) => ({ ...prev, [field.name]: "" })),
                }}
              >
                {options.length > 8 && (
                  <MenuItem
                    disableRipple
                    disableTouchRipple
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{
                      p: 0,
                      "&:hover": { backgroundColor: "transparent" },
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <TextField
                      id={`select-search-${field.name}`}
                      size="small"
                      placeholder="Search..."
                      fullWidth
                      value={selectSearch[field.name] || ""}
                      onChange={(e) =>
                        setSelectSearch((prev) => ({
                          ...prev,
                          [field.name]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{ px: 1, py: 0.5 }}
                      autoComplete="off"
                    />
                  </MenuItem>
                )}

                {isLoadingOptions ? (
                  [1, 2, 3].map((i) => (
                    <MenuItem key={i} disabled sx={{ py: 0.8 }}>
                      <Skeleton
                        variant="text"
                        width={`${45 + i * 15}%`}
                        height={14}
                        sx={{ borderRadius: 1 }}
                      />
                    </MenuItem>
                  ))
                ) : options.filter((opt) =>
                    opt.label
                      ?.toLowerCase()
                      .includes((selectSearch[field.name] || "").toLowerCase()),
                  ).length === 0 ? (
                  <MenuItem disabled>
                    <Typography
                      variant="caption"
                      sx={{ color: clr.textDisabled }}
                    >
                      No data available
                    </Typography>
                  </MenuItem>
                ) : (
                  options
                    .filter((opt) =>
                      opt.label
                        ?.toLowerCase()
                        .includes(
                          (selectSearch[field.name] || "").toLowerCase(),
                        ),
                    )
                    .map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))
                )}
              </TextField>
            </Grid>
          );
        }

        // Section Label
        if (field.type === "label") {
          return (
            <Grid item xs={12} key={`label-${index}`}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 200, color: clr.textPrimary }}
              >
                {field.label}
              </Typography>
            </Grid>
          );
        }

        // Checkbox
        if (field.type === "checkbox") {
          return (
            <Grid item xs={field.xs || 12} key={field.name}>
              <FormControlLabel
                control={
                  <Checkbox
                    name={field.name}
                    checked={!!formData[field.name]}
                    onChange={handleChange}
                    sx={{
                      "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                        color: clr.navyText,
                      },
                    }}
                  />
                }
                label={field.label || ""}
              />
            </Grid>
          );
        }

        // Serial Number fieldset
        if (field.type === "serialNumber")
          return renderSerialNumber(field, index);

        // Multiline / Textarea
        if (field.multiline) {
          if (field.plainMultiline) {
            return (
              <Grid item xs={12} sm={field.xs || 12} key={field.name}>
                <TextField
                  label={field.label}
                  name={field.name}
                  placeholder={field.placeholder}
                  fullWidth
                  size="small"
                  multiline
                  minRows={field.minRows || 3}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  error={!!errors[field.name]}
                  helperText={errors[field.name] || ""}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      return;
                    }
                    handleKeyDown(e, index, true);
                  }}
                />
              </Grid>
            );
          }
          return (
            <Grid item xs={12} sm={field.xs || 12} key={field.name}>
              {renderQuill(field, index)}
            </Grid>
          );
        }

        // ── Standard TextField ──────────────────────────────────────────
        const isPassword = field.type === "password";
        return (
          <Grid item xs={12} sm={field.xs || 12} key={field.name}>
            <TextField
              label={field.label}
              name={field.name}
              type={
                isPassword
                  ? showPassword[field.name]
                    ? "text"
                    : "password"
                  : field.type || "text"
              }
              fullWidth
              size="small"
              value={formData[field.name] || ""}
              error={!!errors[field.name]}
              helperText={errors[field.name] || field.helperText || ""}
              disabled={field.disabled || disabled}
              placeholder={field.placeholder || ""}
              InputLabelProps={isDateField ? { shrink: true } : {}}
              inputRef={(el) => {
                inputRefs.current[index] = el;
                if (!firstInputRef.current) firstInputRef.current = el;
              }}
              onKeyDown={(e) => {
                handleKeyDown(e, index, field.multiline);
                if (field.numberOnly) {
                  const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                    "Enter",
                  ];
                  if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key))
                    e.preventDefault();
                }
              }}
              onChange={(e) => {
                let value = e.target.value;
                if (field.numberOnly) value = value.replace(/[^0-9]/g, "");
                handleChange({ target: { name: field.name, value } });
              }}
              InputProps={
                isPassword
                  ? {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility(field.name)}
                            edge="end"
                            disabled={field.disabled || disabled}
                          >
                            {showPassword[field.name] ? (
                              <Visibility />
                            ) : (
                              <VisibilityOff />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  : {}
              }
            />
          </Grid>
        );
      })}

      {/* Switches */}
      {switches.map((sw) => (
        <Grid item xs={sw.xs || 12} key={sw.name}>
          <FormControlLabel
            control={
              <Switch
                name={sw.name}
                checked={!!formData[sw.name]}
                onChange={handleSwitchChange}
                disabled={sw.disabled}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: clr.navyText },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: clr.navyText,
                  },
                }}
              />
            }
            label={
              sw.mobileLabel ? (
                <Box component="span">
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" } }}
                  >
                    {sw.label}
                  </Box>
                  <Box component="span" sx={{ display: { sm: "none" } }}>
                    {sw.mobileLabel}
                  </Box>
                </Box>
              ) : (
                sw.label || ""
              )
            }
          />
        </Grid>
      ))}

      {/* ── Calculator ────────────────────────────────────────────────
          One floating instance per form, opened by the 🧮 in any peso
          field above. The widget portals ITSELF to document.body (it has
          to clear the MUI modal this form usually sits in), so when it is
          closed it renders nothing — harmless here as the Grid's last
          child. "Use in <field>" writes the shown number back through
          handleChange, exactly as if it had been typed. */}
      <CalculatorWidget
        open={!!calcField}
        target={calcField}
        onClose={() => setCalcField(null)}
        onApply={(value) => {
          if (!calcField) return;
          const num = Number(value);
          if (!Number.isFinite(num)) return;
          // Same 2-decimal shape the field's own blur writes.
          handleChange({
            target: { name: calcField.name, value: num.toFixed(2) },
          });
          // Focus back into the field so typing / Tab can carry straight on.
          const idx = fields.findIndex((f) => f.name === calcField.name);
          inputRefs.current[idx]?.focus?.();
        }}
      />
    </Grid>
  );
}
