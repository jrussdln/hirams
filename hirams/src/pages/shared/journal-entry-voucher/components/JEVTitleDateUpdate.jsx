import { useTheme } from "@mui/material/styles";
import { Box, Typography, TextField } from "@mui/material";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  slate: {
    border: c.slate.border,
    itemHeaderBg: c.slate.itemHeaderBg,
    divider: c.slate.divider,
    hover: c.slate.hover,
  },
  gray: { textHeading: c.gray.textHeading, textMuted: c.gray.textMuted },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text, hover: c.blue.hover },
});

// ── The JEV title / date form's card ─────────────────────────────────
// A rounded card ABOVE the JEV panel: a header naming the edit, then the
// two fields (Title · Date) — the content that used to live inside the
// panel's own header while the JEV was being renamed.
//
// Fully decoupled from JevViewPanel: the panel owns the edit's life
// (open/close, values, validation, the save through JevAPI.update) and
// this component is only the visual half — controlled, every change
// handed up through onTitleChange / onDateChange. The save failure
// arrives as the field errors; there is no Swal.
//
// Its actions ARE here: Close discards and Save commits from the card's
// own footer; Enter saves and Escape cancels from the fields too.
export default function JEVTitleDateUpdate({
  // Controlled field values.
  titleValue,
  dateValue,
  // Field changes handed up — the panel clears its own errors.
  onTitleChange,
  onDateChange,
  // Field errors, straight from the panel's validation / save failure.
  titleError = "",
  dateError = "",
  // The Date field — shown by default alongside Title; a caller may
  // hide it, but nothing in the edit ties the date to the title.
  showDate = true,
  // The Close button — shown by default, always left of Save; a
  // caller may hide it.
  showCancel = true,
  // The save in flight — the fields lock while it runs.
  saving = false,
  // Focuses the Title field as soon as the card opens.
  titleInputRef = null,
  onSave,
  onCancel,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));

  return (
    <Box
      sx={{
        borderRadius: "12px",
        border: `0.5px solid ${colors.slate.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.75,
          bgcolor: colors.slate.itemHeaderBg,
          borderBottom: `0.5px solid ${colors.slate.border}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: colors.gray.textHeading,
          }}
        >
          {titleValue || titleError ? "Edit JEV Info" : "Add JEV Info"}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.6rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: colors.gray.textMuted,
          }}
        >
          {saving ? "Saving…" : "Title · Date"}
        </Typography>
      </Box>

      <Box
        sx={{ p: 1.5 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave?.();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel?.();
          }
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 0.75,
          }}
        >
          <TextField
            label="Title"
            size="small"
            required
            value={titleValue}
            onChange={onTitleChange}
            error={!!titleError}
            helperText={titleError}
            disabled={saving}
            inputProps={{ maxLength: 100 }}
            inputRef={titleInputRef}
            autoFocus
            sx={{ flex: "1 1 180px", minWidth: 140 }}
          />
          {/* The Date field — shown whenever this card is open. */}
          {showDate && (
            <TextField
              label="Date"
              type="date"
              size="small"
              required
              value={dateValue}
              onChange={onDateChange}
              error={!!dateError}
              helperText={dateError}
              disabled={saving}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: "0 1 200px", minWidth: 180 }}
            />
          )}
        </Box>
      </Box>

      {/* ── Actions — Close discards, Save commits ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 0.75,
          bgcolor: colors.slate.itemHeaderBg,
          borderTop: `0.5px solid ${colors.slate.border}`,
        }}
      >
        {showCancel && (
          <Box
            component="button"
            onClick={onCancel}
            disabled={saving}
            title="Discard the changes"
            sx={{
              px: 1,
              py: 0.4,
              borderRadius: "7px",
              bgcolor: colors.slate.hover,
              border: `0.5px solid ${colors.slate.border}`,
              cursor: saving ? "not-allowed" : "pointer",
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
              "&:hover:not(:disabled)": { bgcolor: colors.slate.border },
            }}
          >
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: colors.gray.textHeading,
                lineHeight: 1.4,
              }}
            >
              Close
            </Typography>
          </Box>
        )}
        <Box
          component="button"
          onClick={onSave}
          disabled={saving}
          title="Save the title and date"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 1,
            py: 0.4,
            borderRadius: "7px",
            bgcolor: colors.blue.bg,
            border: `0.5px solid ${colors.blue.border}`,
            cursor: saving ? "not-allowed" : "pointer",
            "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            "&:hover:not(:disabled)": { bgcolor: colors.blue.hover },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: colors.gray.textHeading,
              lineHeight: 1.4,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
