import { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TooltipContainer from "../../../../components/layouts/tooltip/TooltipContainer.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import useJEVBalance from "../../../../hooks/useJEVBalance.js";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";

const useColors = (c) => ({
  border: c.slate.border,
  hoverBg: c.slate.hover,
  green: { bg: c.green.bg, border: c.green.border, text: c.green.text },
  amber: { bg: c.amber.bg, border: c.amber.border, text: c.amber.text },
  red: { bg: c.red.bg, border: c.red.border, text: c.red.text },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  text: { pri: c.gray.textPrimary, sec: c.gray.textSecondary },
  // Plain Set action (a MUI Button, not BaseButton) — same green the app
  // uses for approve/save, so it still reads as "commit".
  approve: { bg: c.green.borderStrong, hover: c.green.hover },
  onFill: c.gray.textOnFill,
});

// The status codes come from the jev_status mapping (config/mappings.php):
// P Draft · R Pending Clearance · A Active · C Cancelled. They are looked up
// BY LABEL so the mapping can gain or reorder codes without this tooltip
// mis-colouring or mis-gating one. A code the mapping never names falls
// through to the neutral blue tone.

// The tag slot at a row's right edge. CURRENT leads the list; UNBALANCED
// flags the Active option while the JEV's two sides do not square — same
// size and shape as CURRENT so it reads as the same kind of marker.
const TAG_SX = {
  fontSize: "0.58rem",
  fontWeight: 700,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

/**
 * Status switcher of the JEV listing — a bare radio list inside
 * TooltipContainer: no header, no footer. The row's own status always leads
 * the list, disabled and tagged "CURRENT", so you see where the JEV stands
 * before you see where it could go.
 *
 * Picking a status COMMITS it immediately — there is no separate "Set"
 * button; the current row is disabled, so only a real change can fire
 * (see handleSave).
 *
 * Writes through PUT /jev/{id} with a DIRECT cStatus, not the endpoint's
 * 'toggle' branch. Pending Clearance (R) is managed from the Collection
 * footer button, so it is never offered here.
 *
 * The finalized state (Active) is gated on balance: the JEV's entries are
 * judged exactly as JevEntriesViewModal judges them (sides alone — a voucher
 * JEV carries no Items total to reconcile against). While the sides do not
 * square — or the verdict is not in yet — that row is disabled and flagged
 * UNBALANCED in the tag slot CURRENT uses.
 */
export default function JevStatusUpdateTooltip({
  open,
  anchorEl,
  jev,
  jevStatus = {},
  onClose,
  onSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(base);

  const [saving, setSaving] = useState(false);

  const current = jev?.cStatus ?? "";
  const entity = jev?.strJEVNumber || "JEV";

  // The verdict JevEntriesViewModal works from (empty id while closed →
  // no fetch, no verdict — the gate stays shut until one arrives).
  const balance = useJEVBalance(open && jev?.nJEVId ? jev.nJEVId : "", 0, false);

  const statusLabelMap = { ...(jevStatus || {}) };

  const statusCodeByLabel = (label) =>
    Object.entries(statusLabelMap).find(
      ([, value]) =>
        String(value ?? "").trim().toLowerCase() === label.toLowerCase(),
    )?.[0] ?? "";
  const draftCode =
    statusCodeByLabel("Draft") || statusCodeByLabel("Pending");
  const activeCode = statusCodeByLabel("Active");
  const cancelledCode = statusCodeByLabel("Cancelled");
  const finalizedCodes = [activeCode].filter(Boolean);

  const toneFor = (code) =>
    code === activeCode
      ? colors.green
      : code === cancelledCode
        ? colors.red
        : code === draftCode
          ? colors.amber
          : colors.blue;

  // Unknown counts as blocked: a still-loading or failed check may never
  // pass for "balanced" — the rule demoteIfUnbalanced runs on close.
  const finalizedAllowed = !balance.loading && balance.balanced;

  // Pending Clearance is managed from the Collection footer button, so it
  // never appears here — not even as a read-only Current row. Filter it out
  // defensively by label too, in case a stale prop still carries it.
  const isPendingClearance = (label) =>
    String(label ?? "").trim().toLowerCase() === "pending clearance";
  const options = useMemo(() => {
    const entries = Object.entries({ ...(jevStatus || {}) }).filter(
      ([, label]) => !isPendingClearance(label),
    );
    const at = entries.findIndex(([code]) => code === current);
    if (at > 0) entries.unshift(...entries.splice(at, 1));
    return entries;
  }, [jevStatus, current]);

  // Fresh panel on every open — a pick left over from the previous row must
  // never preselect itself against the next one.
  useEffect(() => {
    if (open) {
      setSaving(false);
    }
  }, [open, jev?.nJEVId]);

  const handleClose = () => {
    setSaving(false);
    onClose?.();
  };

  // Committing happens straight from the radio change — no separate Set step.
  const handleSave = async (next) => {
    if (!jev?.nJEVId || !next || next === current || saving) return;
    if (finalizedCodes.includes(next) && !finalizedAllowed) return;
    const targetId = jev.nJEVId,
      label = statusLabelMap[next] ?? next;

    handleClose();
    setSaving(true);
    try {
      await withSpinner(entity, async () => {
        await JevAPI.update(targetId, { cStatus: next });
      });
      window.dispatchEvent(new CustomEvent("jev_data_updated"));
      await showSwal("SUCCESS", {}, { entity, action: `set to ${label}` });
      onSuccess?.(next);
    } catch (err) {
      console.error(err);
      await showSwal("ERROR", {}, { entity });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipContainer
      open={open}
      anchorEl={anchorEl}
      handleClose={handleClose}
      // Compact: narrow enough to read as a tip, not a dialog.
      width={300}
    >
      <RadioGroup
        name="jev-status"
        value={current}
        onChange={(e) => {
          const code = e.target.value;
          if (code === current) return;
          if (finalizedCodes.includes(code) && !finalizedAllowed) return;
          handleSave(code);
        }}
      >
        {options.map(([code, label], idx) => {
          const tone = toneFor(code);
          const isCurrent = code === current;
          // The finalized state (Active) is off-limits while the JEV does not
          // balance (or the verdict is still in): not selectable, flagged on
          // the right.
          const blockFinalized =
            finalizedCodes.includes(code) && !finalizedAllowed;
          const isDimmed = isCurrent || blockFinalized;
          // Flag only once the verdict is IN — "checking" must not paint
          // UNBALANCED over a JEV that may yet square up.
          const showUnbalanced =
            finalizedCodes.includes(code) &&
            !balance.loading &&
            !balance.balanced;
          const isFirst = idx === 0;
          const isLast = idx === options.length - 1;
          const r = "6px";

          return (
            // The row is a flex strip: [radio + label ........ | Set].
            // The wrapper owns the border, so the Set cell sits INSIDE the
            // row's right edge, full height, split off by a divider.
            <Box
              key={code}
              sx={{
                display: "flex",
                alignItems: "stretch",
                overflow: "hidden",
                ...(idx > 0 && { mt: "-1px" }),
                border: `1px solid ${isCurrent ? tone.border : colors.border}`,
                borderRadius: `${isFirst ? r : 0} ${isFirst ? r : 0} ${
                  isLast ? r : 0
                } ${isLast ? r : 0}`,
                transition: "background 0.15s",
                "&:hover": isDimmed ? {} : { background: colors.hoverBg },
              }}
            >
              <FormControlLabel
                value={code}
                disabled={isCurrent || blockFinalized || saving}
                sx={{
                  m: 0,
                  flex: 1,
                  minWidth: 0,
                  py: 0.25,
                  px: 0.75,
                  opacity: isDimmed ? 0.55 : 1,
                  cursor: isDimmed ? "default" : "pointer",
                  "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 },
                }}
                control={
                  <Radio
                    size="small"
                    sx={{
                      p: 0.5,
                      color: tone.border,
                      "&.Mui-checked": { color: tone.text },
                    }}
                  />
                }
                label={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: tone.text,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: colors.text.pri,
                      }}
                    >
                      {label}
                    </Typography>
                    {(isCurrent || showUnbalanced) && (
                      <Box
                        sx={{
                          ml: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        {isCurrent && (
                          <Typography
                            sx={{ ...TAG_SX, color: colors.text.sec }}
                          >
                            Current
                          </Typography>
                        )}
                        {showUnbalanced && (
                          <Typography
                            sx={{ ...TAG_SX, color: colors.red.text }}
                          >
                            Unbalanced
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                }
              />

            </Box>
          );
        })}
      </RadioGroup>
    </TooltipContainer>
  );
}