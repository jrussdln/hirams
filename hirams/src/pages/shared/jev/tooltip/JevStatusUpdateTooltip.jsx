import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TooltipContainer from "../../../../components/layouts/tooltip/TooltipContainer.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import useJevBalance from "../hooks/useJevBalance.js";
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

// A / C / P are the jev_status codes (config/mappings.php). A code the
// mapping never names falls through to the neutral blue tone.

// The one status an unbalanced JEV may never reach (balance gate below).
const ACTIVE_CODE = "A";

const toneFor = (code, colors) =>
  code === ACTIVE_CODE
    ? colors.green
    : code === "C"
      ? colors.red
      : code === "P"
        ? colors.amber
        : colors.blue;

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
 * Picking only STAGES a change: a plain "Set" button then appears BELOW the
 * rows — outside the list block, never inside a row — and is what commits
 * it (see handleSave).
 *
 * Writes through PUT /jev/{id} with a DIRECT cStatus ('A' / 'P' / 'C'), not
 * the endpoint's 'toggle' branch — a toggle can only round-trip P <-> A and
 * could never reach Cancelled.
 *
 * Active is gated on balance: the JEV's entries are judged exactly as
 * JevEntriesViewModal judges them (sides alone — a voucher JEV carries no
 * Items total to reconcile against). While the sides do not square — or
 * the verdict is not in yet — the Active row is disabled and flagged
 * UNBALANCED in the tag slot CURRENT uses. Same strictness as that modal's
 * demote-on-close: no verdict may pass for "balanced".
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

  const [picked, setPicked] = useState("");
  const [saving, setSaving] = useState(false);

  const current = jev?.cStatus ?? "";
  const entity = jev?.strJEVNumber || "JEV";

  // The verdict JevEntriesViewModal works from (empty id while closed →
  // no fetch, no verdict — the gate stays shut until one arrives).
  const balance = useJevBalance(open && jev?.nJEVId ? jev.nJEVId : "", 0, false);

  // Unknown counts as blocked: a still-loading or failed check may never
  // pass for "balanced" — the rule demoteIfUnbalanced runs on close.
  const activeAllowed = !balance.loading && balance.balanced;

  // The row's own status always leads the list, whatever order the mapping
  // declares — you should see where it stands before where it could go.
  const options = useMemo(() => {
    const entries = Object.entries(jevStatus ?? {});
    const at = entries.findIndex(([code]) => code === current);
    if (at > 0) entries.unshift(...entries.splice(at, 1));
    return entries;
  }, [jevStatus, current]);

  // Fresh panel on every open — a pick left over from the previous row must
  // never preselect itself against the next one.
  useEffect(() => {
    if (open) {
      setPicked("");
      setSaving(false);
    }
  }, [open, jev?.nJEVId]);

  const handleClose = () => {
    setPicked("");
    setSaving(false);
    onClose?.();
  };

  // Selecting only STAGES the change; the Set button below the list is what
  // commits it.
  const handleSave = async () => {
    if (!jev?.nJEVId || !picked || picked === current || saving) return;
    // The Active row is disabled while unbalanced, so this only guards the
    // race where the verdict lands after the pick was staged.
    if (picked === ACTIVE_CODE && !activeAllowed) return;
    // Read up front: handleClose() clears the target on the next render, so
    // everything the request and its toasts need is captured first.
    const targetId = jev.nJEVId,
      next = picked,
      label = jevStatus?.[next] ?? next;

    // withSpinner already owns the progress UI, so the panel leaves
    // immediately instead of holding the stage on its own loading state.
    handleClose();
    setSaving(true);
    try {
      await withSpinner(entity, async () => {
        await JevAPI.update(targetId, { cStatus: next });
      });
      // The server's JevUpdated broadcast is toOthers() — this tab has to
      // tell ITSELF the row changed, same as handleJevAESaved does.
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

  // The action only exists while a DIFFERENT status is staged — the current
  // row is disabled, so there is nothing to commit until something changes.
  const showSetAction =
    !!picked &&
    picked !== current &&
    // A staged Active loses its Set the moment the verdict says no.
    !(picked === ACTIVE_CODE && !activeAllowed);

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
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
      >
        {options.map(([code, label], idx) => {
          const tone = toneFor(code, colors);
          const isCurrent = code === current;
          // Active is off-limits while the JEV does not balance (or the
          // verdict is still in): not selectable, flagged on the right.
          const blockActive = code === ACTIVE_CODE && !activeAllowed;
          const isDimmed = isCurrent || blockActive;
          // Flag only once the verdict is IN — "checking" must not paint
          // UNBALANCED over a JEV that may yet square up.
          const showUnbalanced =
            code === ACTIVE_CODE && !balance.loading && !balance.balanced;
          const isPicked = showSetAction && code === picked;
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
                disabled={isCurrent || blockActive || saving}
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

              {/* Set cell: right end of the selected row, full row height,
                  divider on its left. */}
              {isPicked && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  disableElevation
                  sx={{
                    flexShrink: 0,
                    minWidth: 0,
                    px: 2,
                    borderRadius: 0,
                    borderLeft: `1px solid ${colors.border}`,
                    textTransform: "none",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: colors.text.pri,
                    background: "transparent",
                    "&:hover": { background: colors.hoverBg },
                    "&.Mui-disabled": { opacity: 0.45 },
                  }}
                >
                  Set
                </Button>
              )}
            </Box>
          );
        })}
      </RadioGroup>
    </TooltipContainer>
  );
}