import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  PhotoCameraOutlined,
  SyncOutlined,
  LockOutlined,
  EditOutlined,
  CloseRounded,
} from "@mui/icons-material";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";
import FormGrid from "../../../../../components/ui/form/FormGrid.jsx";
import ScanSerialNumberModal from "../../modal/ScanSerialNumberModal.jsx";
import useKeysLabels from "../../../../../hooks/useKeysLabels.js";

// Width of the "Save Changes" button. The label row carries a spacer of the
// same width so the Receipt No. label stays lined up with its input.
const SAVE_W = 96;

/**
 * Per-row EDIT form opened from the Edit button of the For Delivery /
 * Delivered rows.
 *
 *   • mode="receive" → the receive form: shows what this line has recorded
 *     and lets the user type the CORRECT quantity (lower it when everything
 *     was checked in by mistake, raise it when a delivery came up short).
 *   • mode="deliver" → the delivered form: same idea for what went out.
 *
 * The quantity is the line's TOTAL, not a delta — Save Changes makes the
 * record match it. The button sits in the SAME row, right after the receipt
 * field, and submits only this line (the parent turns it into the API calls).
 */
export default function RowEditForm({
  mode = "receive",
  // The purchase option this row is drawn from.
  p,
  // What the line has recorded right now — the value the form opens with.
  current = 0,
  // Upper bound: ordered (receive) / received (deliver).
  max = 0,
  // Lower bound: already delivered (receive) can never be taken back,
  // 0 for a delivery.
  min = 0,
  form = {},
  onChange,
  onSave,
  saving = false,
  // S/N this line has ON RECORD (received / delivered, depending on mode).
  // They fill the list when the form opens so the correction shows them, and
  // they are what Save Changes is compared against.
  currentSerials = [],
  // Deliver only: received S/N not yet delivered (what can still go out).
  onHandSerials = [],
  // The supplier's nickname — printed before the badge so the line reads
  // "VST  10 Unit/27 Unit".
  supplierName = "",
  // The item already has an APPROVED inventory row — a JEV was raised for
  // it, so the record can no longer be touched. The form locks and says so.
  locked = false,
  // The journal(s) that closed this line — [{ id, number }]. Their numbers
  // are printed inside the lock notice and open that very JEV.
  jevs = [],
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const { slate, gray, blue, red, amber, green } = base;
  // The JEV numbers in the lock notice navigate (they open /journal-entry-voucher?id=…) for
  // FINANCE and MANAGEMENT only — AO / AOTL read them as plain text.
  const keys = useKeysLabels();
  const canOpenJev = keys.isFinanceOfficer || keys.isManagement;

  // Which row's S/N are being scanned by camera (modal is local to this form).
  const [scanOpen, setScanOpen] = React.useState(false);
  // The JEV notice can be dismissed — the line stays locked either way.
  const [noticeClosed, setNoticeClosed] = React.useState(false);

  const isDeliver = mode === "deliver";
  const qtyLabel = isDeliver ? "Quantity to Deliver" : "Quantity to Receive";
  const receiptLabel = isDeliver ? "Receipt No. *" : "Receipt No. (optional)";
  const uom = p?.strUOM ?? "";

  const patch = (next) => onChange?.(next);

  const target = form.qty === "" || form.qty == null ? null : Number(form.qty);
  const isWhole = target != null && Number.isInteger(target);
  const belowMin = isWhole && target < min;
  const aboveMax = isWhole && target > max;

  // The list is the line's S/N — the ones on record plus whatever is added
  // for units that come in, minus whatever gets crossed out.
  const serials = (form.serials || []).map(String);
  const onRecord = React.useMemo(
    () => new Set((currentSerials || []).filter(Boolean).map(String)),
    [currentSerials],
  );
  const serialSet = new Set(serials);
  const addedSerials = serials.filter((sn) => !onRecord.has(sn));
  const removedCount = [...onRecord].filter((sn) => !serialSet.has(sn)).length;
  const serialsChanged = addedSerials.length > 0 || removedCount > 0;

  // Only a HIGHER quantity brings units in — new S/N ride along with them.
  const capSerials = isWhole ? Math.max(0, target - current) : 0;
  const tooManySerials = isWhole && serials.length > target;
  const serialsOver = addedSerials.length > capSerials;

  // A receipt number that differs from what the line was recorded under is
  // a change too — fixing just the receipt must be savable. The seed stores
  // the line's original receipt in `origReceiptNo` for the compare.
  const baselineReceipt = String(form.origReceiptNo ?? "").trim();
  const receiptChanged =
    (form.receiptNo || "").trim() !== baselineReceipt;

  // Nothing to save = the same quantity, S/N and receipt the record holds.
  const unchanged =
    isWhole && target === current && !serialsChanged && !receiptChanged;

  // Only a delivery that adds units needs a receipt number — correcting the
  // count down leaves the existing rows (and their receipt) untouched.
  const receiptMissing =
    isDeliver && isWhole && target > current && !(form.receiptNo || "").trim();

  // An unchanged line is not an error — the Save button just stays disabled
  // (see `canSave`), so there is nothing to tell the user about.
  const error = belowMin
    ? min > 0
      ? `Can't be lower than ${min} ${uom} — that quantity is already delivered.`
      : "Quantity can't be negative."
    : aboveMax
      ? `Can't be higher than ${max} ${uom}.`
      : tooManySerials
        ? `A line can't hold more serial numbers than its quantity (${target}).`
        : serialsOver
          ? `You can only add serial numbers for the ${capSerials} extra unit(s) — remove the extra S/N.`
          : receiptMissing
            ? "Receipt No. is required"
            : "";

  const canSave =
    !saving &&
    !locked &&
    isWhole &&
    !belowMin &&
    !aboveMax &&
    !unchanged &&
    !tooManySerials &&
    !serialsOver &&
    !receiptMissing;

  const labelSx = {
    fontSize: "0.55rem",
    fontWeight: 700,
    color: gray.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const inputSx = {
    flex: 1,
    height: 32,
    px: 0.9,
    fontSize: "0.7rem",
    fontWeight: 600,
    color: gray.textPrimary,
    border: `0.5px solid ${slate.border}`,
    borderRadius: "7px",
    outline: "none",
    background: slate.innerBg,
  };

  // Typing a lower quantity only drops the S/N that no longer fit — the ones
  // on record are never thrown away just by changing the number.
  const applyQty = (nextQty) => {
    const n = nextQty === "" ? null : Number(nextQty);
    const list = (form.serials || []).map(String);
    patch({
      qty: nextQty,
      serials:
        n != null && Number.isInteger(n) && list.length > n
          ? list.slice(0, n)
          : list,
    });
  };

  const scanLabel =
    [p?.strBrand, p?.strModel].filter(Boolean).join(" · ") ||
    p?.transaction_item?.strName ||
    "Item";

  // How many more S/N the list can take, and the on-hand ones worth adding
  // to it (delivery only — the received list is what can still go out).
  const listCap = isWhole ? Math.max(target, 0) : serials.length;
  const roomSerials = Math.max(0, listCap - serials.length);
  const syncableSerials = isDeliver
    ? onHandSerials
        .filter((sn) => !serialSet.has(String(sn)))
        .slice(0, Math.min(roomSerials, capSerials))
    : [];

  // A locked line with no serial numbers has nothing to show in the S/N
  // list — an empty "Serial Numbers (0 of max 5)" box is just noise.
  const showSerialField = form.showSN && (!locked || serials.length > 0);

  return (
    <>
      <Divider sx={{ borderColor: slate.divider }} />

      {/* Supplier nickname, then the badge with what the line holds over
          its ceiling */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        {supplierName ? (
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              color: gray.textPrimary,
              textTransform: "uppercase",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {supplierName}
          </Typography>
        ) : null}

        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 1,
            py: 0.25,
            borderRadius: "50px",
            background: blue.bgSoft,
            border: `0.5px solid ${blue.border}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.5rem",
              fontWeight: 700,
              color: blue.textStrong,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
            }}
          >
            {`${current}/${max}${uom ? ` ${uom}` : ""}`}
          </Typography>
        </Box>
      </Box>

      {/* JEV NOTICE — a JEV was already raised for this item, so the record
          is closed and every field is disabled. On a line with no JEV yet,
          the same notice says editing is still open. Either way it can be
          dismissed with the X. */}
      {!noticeClosed && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.6,
            mt: 0.5,
            mb: 0.75,
            borderRadius: "7px",
            background: locked ? amber.warnBg : green.badgeBg,
            border: `0.5px solid ${locked ? amber.warnBorder : green.paidBorder}`,
          }}
        >
          {locked ? (
            <LockOutlined sx={{ fontSize: "0.8rem", color: amber.warnText }} />
          ) : (
            <EditOutlined sx={{ fontSize: "0.8rem", color: green.badgeText }} />
          )}
          <Typography
            // A DIV, not the default <p>: the JEV numbers inside are
            // clickable boxes, and a <div> may not live inside a <p>.
            component="div"
            sx={{
              flex: 1,
              fontSize: "0.55rem",
              fontWeight: 700,
              color: locked ? amber.warnText : green.badgeText,
              lineHeight: 1.2,
            }}
          >
            {locked ? (
              <>
                This item already have a JEV
                {jevs.length > 0 && (
                  <>
                    {" ("}
                    {jevs.map((j, i) => (
                      <Box key={j.id ?? j.number} component="span">
                        {i > 0 && ", "}
                        {/* Finance / management get the jump; AO / AOTL
                            see the number as part of the warning text. */}
                        {canOpenJev ? (
                          <Box
                            component="span"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/journal-entry-voucher?id=${j.id}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/journal-entry-voucher?id=${j.id}`);
                              }
                            }}
                            title="Open this JEV"
                            sx={{
                              color: blue.text,
                              cursor: "pointer",
                              fontWeight: 700,
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {j.number}
                          </Box>
                        ) : (
                          <Box component="span">{j.number}</Box>
                        )}
                      </Box>
                    ))}
                    {")"}
                  </>
                )}
                , cannot be edited.
              </>
            ) : (
              "Editing is Available only for Item that still dont have JEV"
            )}
          </Typography>
          <Box
            component="button"
            onClick={() => setNoticeClosed(true)}
            title="Close this notice"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 16,
              height: 16,
              flexShrink: 0,
              border: "none",
              background: "transparent",
              color: locked ? amber.warnText : green.badgeText,
              cursor: "pointer",
              p: 0,
              borderRadius: "4px",
              "&:hover": { opacity: 0.7 },
            }}
          >
            <CloseRounded sx={{ fontSize: "0.8rem" }} />
          </Box>
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
        {/* Labels — laid out exactly like the input row below (same gap, the
            two flex-1 spacers land the labels on their own fields) */}
        <Box sx={{ display: "flex", gap: 0.6 }}>
          <Typography sx={{ ...labelSx, flex: 1 }}>{qtyLabel}</Typography>
          <Box sx={{ width: 78, flexShrink: 0 }} />
          <Typography
            sx={{ ...labelSx, flex: 1, whiteSpace: "nowrap", minWidth: 0 }}
          >
            {receiptLabel}
          </Typography>
          {!locked && <Box sx={{ width: SAVE_W, flexShrink: 0 }} />}
        </Box>

        {/* Qty + S/N + Receipt No. + Save Changes — all in ONE row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <Box sx={{ display: "flex", flex: 1 }}>
            <Box
              component="input"
              type="number"
              value={form.qty}
              onChange={(e) => applyQty(e.target.value)}
              disabled={locked}
              sx={{
                ...inputSx,
                border: belowMin || aboveMax ? `0.5px solid ${red.text}` : inputSx.border,
                borderRight: "none",
                borderRadius: "7px 0 0 7px",
                ...(locked && {
                  opacity: 0.55,
                  cursor: "not-allowed",
                  background: slate.mutedBg,
                }),
              }}
            />
            <Box
              sx={{
                height: 32,
                px: 1,
                display: "flex",
                alignItems: "center",
                background: slate.mutedBg,
                border: belowMin || aboveMax
                  ? `0.5px solid ${red.text}`
                  : `0.5px solid ${slate.border}`,
                borderRadius: "0 7px 7px 0",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  color: gray.textMuted,
                  textTransform: "uppercase",
                }}
              >
                {uom || "—"}
              </Typography>
            </Box>
          </Box>

          <Box
            component="button"
            onClick={() => {
              if (locked) return;
              const open = !form.showSN;
              const list = (form.serials || []).map(String);
              // Opening a delivery form tops the list up with the received
              // S/N that can still go out — the ones already there stay.
              const next =
                open && isDeliver && syncableSerials.length > 0
                  ? [...list, ...syncableSerials]
                  : list;
              patch({ showSN: open, serials: next });
            }}
            disabled={locked}
            title={
              form.showSN
                ? "Hide serial numbers"
                : "Show the serial numbers on record"
            }
            sx={{
              width: 78,
              height: 32,
              flexShrink: 0,
              fontSize: "0.6rem",
              fontWeight: 700,
              color: form.showSN ? blue.textStrong : gray.textMuted,
              background: form.showSN ? blue.bg : slate.outerBg,
              border: `0.5px solid ${form.showSN ? blue.border : slate.border}`,
              borderRadius: "7px",
              cursor: "pointer",
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            {form.showSN ? "− SN" : "+ SN"}
          </Box>

          <Box
            component="input"
            type="text"
            value={form.receiptNo}
            placeholder="e.g. RR-2025-0001"
            onChange={(e) => patch({ receiptNo: e.target.value })}
            disabled={locked}
            sx={{
              ...inputSx,
              border: receiptMissing
                ? `0.5px solid ${red.text}`
                : inputSx.border,
              ...(locked && {
                opacity: 0.55,
                cursor: "not-allowed",
                background: slate.mutedBg,
              }),
            }}
          />

          {/* Save Changes — same row, right after the receipt field. A locked
              line can never be saved, so the button is not drawn at all. */}
          {!locked && (
            <Box
              component="button"
              onClick={() => canSave && onSave?.()}
              disabled={!canSave}
              title={
                canSave
                  ? `Save this ${isDeliver ? "delivery" : "receipt"} line`
                  : error ||
                    (unchanged ? "No changes to save" : undefined)
              }
              sx={{
                minWidth: SAVE_W,
                height: 32,
                px: 0.75,
                flexShrink: 0,
                fontSize: "0.6rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: gray.textOnFill,
                background: blue.textStrong,
                border: `0.5px solid ${blue.border}`,
                borderRadius: "7px",
                cursor: "pointer",
                "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Box>
          )}
        </Box>

        {error && (
          <Typography
            sx={{
              fontSize: "0.5rem",
              fontWeight: 600,
              color: red.text,
              lineHeight: 1.2,
            }}
          >
            {error}
          </Typography>
        )}
      </Box>

      {showSerialField && (
        <FormGrid
          fields={[
            {
              name: "serials",
              label: `Serial Numbers (${serials.length}${
                isWhole ? ` of max ${target}` : ""
              }${capSerials > 0 ? ` — ${capSerials} new` : ""})`,
              type: "serialNumber",
              xs: 12,
              disabled: locked,
              placeholder: "Scan or type S/N and press Enter...",
              // The list carries the S/N on record, so the cap is the line's
              // whole quantity — only units that come in may be added.
              maxItems: listCap,
              actions: [
                {
                  icon: (
                    <PhotoCameraOutlined sx={{ fontSize: "0.9rem" }} />
                  ),
                  onClick: () => setScanOpen(true),
                  title:
                    locked
                      ? "This item already has a JEV — it cannot be edited"
                      : roomSerials > 0
                        ? "Scan serial numbers with the camera"
                        : "This line is full — raise the quantity first",
                  disabled: locked || roomSerials <= 0,
                },
                // Sync fills only exists on the delivery side — the received
                // list is what can still go out.
                ...(isDeliver
                  ? [
                      {
                        label: "Sync Received SN",
                        icon: (
                          <SyncOutlined sx={{ fontSize: "0.85rem" }} />
                        ),
                        onClick: () =>
                          patch({
                            serials: [
                              ...(form.serials || []).map(String),
                              ...syncableSerials,
                            ],
                          }),
                        disabled: locked || syncableSerials.length === 0,
                        title: locked
                          ? "This item already has a JEV — it cannot be edited"
                          : syncableSerials.length
                            ? `Add ${syncableSerials.length} received serial number(s) not yet delivered`
                            : "No received serial numbers left to add",
                      },
                    ]
                  : []),
              ],
            },
          ]}
          switches={[]}
          formData={{ serials: form.serials || [] }}
          errors={{}}
          handleChange={(e) => {
            if (e.target.name === "serials") patch({ serials: e.target.value });
          }}
          autoFocus={false}
        />
      )}

      {/* Camera scanner — writes straight back into this form. */}
      <ScanSerialNumberModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        serials={form.serials || []}
        max={listCap}
        subTitle={scanLabel}
        {...(isDeliver
          ? { allowedValues: onHandSerials }
          : { denyValues: currentSerials })}
        onChange={(next) => patch({ serials: next, showSN: true })}
      />
    </>
  );
}
