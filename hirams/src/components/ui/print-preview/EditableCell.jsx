import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "@mui/material/styles";
import EditOutlined from "@mui/icons-material/EditOutlined";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import getThemeColors from "../../../utils/style/getThemeColors";

// ─── SHARED CONTEXT ───
// Provided by <PrintPreview>, consumed by every EditableCell in
// header/footer/children. Kept here (not in PrintPreview) since it's
// really part of this component's contract, not the layout's.
export const PrintEditableContext = createContext(null);

function usePrintEditableCell(id, initialValue = "") {
  const ctx = useContext(PrintEditableContext);
  if (!ctx) {
    throw new Error(
      "EditableCell must be rendered inside <PrintPreview>'s header/footer/children.",
    );
  }
  const value = ctx.values[id] ?? initialValue;
  const setValue = useCallback((v) => ctx.setValue(id, v), [ctx, id]);
  return [value, setValue, ctx.editingEnabled];
}

// ─── SHARED STATE/BEHAVIOR ───
// EditableCell and EditableCell.Inline used to duplicate this entire
// block (value/draft/editing state, focus-on-edit, commit/cancel,
// hasValue/displayText/icon derivation). Consolidated into one hook so
// there's a single place to fix bugs or add features later.
function useEditableCellState(id, initialValue, formatDisplay) {
  const [value, setValue, editingEnabled] = usePrintEditableCell(
    id,
    initialValue,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value ?? ""));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, value]);

  const commit = () => {
    if (inputRef.current) inputRef.current.innerHTML = ""; // clear stray DOM content
    setValue(draft.trim());
    setEditing(false);
  };
  const cancel = () => {
    setDraft(String(value ?? ""));
    setEditing(false);
  };

  const hasValue = value !== "" && value != null;
  const displayText = hasValue
    ? formatDisplay
      ? formatDisplay(value)
      : value
    : "\u00A0";
  const IconComponent = hasValue ? EditOutlined : AddCircleOutline;

  return {
    editingEnabled,
    editing,
    setEditing,
    value, // ← add this
    draft,
    setDraft,
    inputRef,
    commit,
    cancel,
    hasValue,
    displayText,
    IconComponent,
  };
}

// Small shared bit: the pencil/plus glyph that fades in on hover.
function EditAffordance({ IconComponent, hasValue, position }) {
  // ✅ Standard wiring — PROMPT 1 pattern (replaces color: "primary.main")
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <IconComponent
      className="print-editable-add-icon"
      sx={{
        position: "absolute",
        ...position,
        fontSize: hasValue ? "0.8rem" : "0.9rem",
        opacity: 0,
        transition: "opacity 0.15s",
        pointerEvents: "none",
        color: base.navy.text,
      }}
    />
  );
}

// ─── BLOCK VARIANT — renders as a <td> ───
export function EditableCell({
  id,
  colSpan,
  rowSpan,
  style,
  align = "center",
  verticalAlign = "middle",
  placeholder = "",
  initialValue = "",
  formatDisplay,
  // Optional quiet second line under the value — small, italicized and
  // lighter, e.g. the item name under a brand · model description. Left
  // empty it costs nothing.
  subline = "",
}) {
  const {
    editingEnabled,
    editing,
    setEditing,
    draft,
    setDraft,
    inputRef,
    commit,
    cancel,
    hasValue,
    displayText,
    IconComponent,
  } = useEditableCellState(id, initialValue, formatDisplay);

  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{
        ...style,
        position: "relative",
        cursor: editingEnabled ? "pointer" : "default",
        verticalAlign,
      }}
      className="print-editable-cell"
      onClick={() => editingEnabled && !editing && setEditing(true)}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            font: "inherit",
            textAlign: align,
          }}
        />
      ) : (
        <span
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            textAlign: hasValue ? align : "center",
            // Tight leading so a multi-line cell (value + subline) hugs.
            lineHeight: 1.2,
          }}
        >
          {displayText}
          {subline && (
            <span
              style={{
                display: "block",
                fontSize: "0.55rem",
                fontStyle: "italic",
                fontWeight: 400,
                opacity: 0.8,
                marginTop: 0,
                letterSpacing: "0.01em",
                lineHeight: 1.15,
              }}
            >
              {subline}
            </span>
          )}
          {editingEnabled && (
            <EditAffordance
              IconComponent={IconComponent}
              hasValue={hasValue}
              position={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </span>
      )}
    </td>
  );
}
// ─── INLINE VARIANT — renders as a <span>, for text sitting in a sentence ───
EditableCell.Inline = function EditableCellInline({
  id,
  placeholder = "",
  initialValue = "",
  formatDisplay,
}) {
  const {
    editingEnabled,
    editing,
    setEditing,
    draft,
    setDraft,
    inputRef,
    commit,
    cancel,
    hasValue,
    displayText,
    IconComponent,
  } = useEditableCellState(id, initialValue, formatDisplay);

  return editing ? (
    <input
      ref={inputRef}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      style={{
        border: "none",
        outline: "none",
        borderBottom: "1px dashed currentColor",
        background: "transparent",
        font: "inherit",
        width: "60%",
      }}
    />
  ) : (
    <span
      className="print-editable-cell"
      style={{
        position: "relative",
        cursor: editingEnabled ? "pointer" : "default",
        paddingRight: 14,
      }}
      onClick={() => editingEnabled && setEditing(true)}
    >
      {displayText}
      {editingEnabled && (
        <EditAffordance
          IconComponent={IconComponent}
          hasValue={hasValue}
          position={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
        />
      )}
    </span>
  );
};
// ─── RICH TEXT VARIANT — renders as a <td>, contentEditable, supports
// multi-line/paragraph input (Enter = new line) for Quill-style HTML ───
EditableCell.RichText = function EditableCellRichText({
  id,
  colSpan,
  rowSpan,
  style,
  verticalAlign = "top",
  placeholder = "",
  initialValue = "",
  className,
}) {
  const {
    editingEnabled,
    editing,
    setEditing,
    value, // ← add this
    draft,
    setDraft,
    inputRef,
    commit,
    cancel,
    hasValue,
  } = useEditableCellState(id, initialValue, null);

  // contentEditable is uncontrolled — only push draft into the DOM when
  // we (re)enter edit mode, never on every keystroke, or the caret jumps.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.innerHTML = draft || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleInput = () => setDraft(inputRef.current?.innerHTML ?? "");

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    // Enter is intentionally left alone — contentEditable turns it into
    // a new line/paragraph, which is the "new row" behavior you want.
  };

  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{
        ...style,
        position: "relative",
        cursor: editingEnabled ? "pointer" : "default",
        verticalAlign,
      }}
      className="print-editable-cell"
      onClick={() => editingEnabled && !editing && setEditing(true)}
    >
      {editing ? (
        <div
          key="editing" // 👈 add this
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={className}
          style={{
            outline: "none",
            minHeight: "1.4em",
            whiteSpace: "pre-wrap",
          }}
        />
      ) : (
        <div key="display" style={{ position: "relative" }}>
          {hasValue ? (
            <div
              className={className}
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <span style={{ opacity: 0.5 }}>{placeholder || "\u00A0"}</span>
          )}
          {editingEnabled && (
            <EditAffordance
              IconComponent={hasValue ? EditOutlined : AddCircleOutline}
              hasValue={hasValue}
              position={{ top: 0, right: 0 }}
            />
          )}
        </div>
      )}
    </td>
  );
};
export default EditableCell;
