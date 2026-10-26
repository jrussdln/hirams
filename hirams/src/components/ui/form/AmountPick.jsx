import { createContext, useContext } from "react";
import { Typography } from "@mui/material";

// ── Click-to-fill channel for the entry modal's Amount field ─────────────
// Provided by JEVEntryAEModal around ITS OWN panel + form, so a money cell
// only becomes a click target inside that modal: every other host of these
// tables (the voucher page's particulars, the inventory group drill-down,
// the shared JEV viewer) has no provider above it and keeps behaving — and
// looking — exactly as it always did.
export const AmountPickContext = createContext(null);

/**
 * ONE money value: the same text a plain Typography would print, plus —
 * only while a handler is present — a pointer cursor, a dotted underline,
 * a tooltip and the click that fills Amount.
 *
 * `value` is the RAW number behind the text. Anything that is not a finite
 * number (a "—", a "--", an unknown selling price) is never pickable, so
 * those cells stay plain text.
 *
 * Always a `component="span"`: a value can sit inside another Typography
 * ("NET: ₱0.00", "EWT: ₱12.00"), where a nested <p> would be invalid HTML.
 * Pass `variant="inherit"` for those inline cases so the wrapper takes the
 * surrounding line's font instead of printing its own.
 */
export default function PickableValue({ value, children, sx, variant }) {
  const pick = useContext(AmountPickContext);
  const hasValue = value !== null && value !== undefined && value !== "";
  const n = Number(value);
  const pickable = typeof pick === "function" && hasValue && Number.isFinite(n);

  return (
    <Typography
      component="span"
      variant={variant}
      title={pickable ? "Click to fill Amount" : undefined}
      onClick={
        pickable
          ? (e) => {
              // A row can carry a click of its own (a drill-down opens the
              // item, a header toggles the row) — filling Amount must not
              // also fire it.
              e.stopPropagation();
              pick(n);
            }
          : undefined
      }
      sx={{
        display: "inline",
        ...sx,
        ...(pickable && {
          cursor: "pointer",
          textDecoration: "underline dotted",
          textUnderlineOffset: "2px",
          transition: "opacity 0.15s ease",
          "&:hover": { opacity: 0.7 },
        }),
      }}
    >
      {children}
    </Typography>
  );
}
