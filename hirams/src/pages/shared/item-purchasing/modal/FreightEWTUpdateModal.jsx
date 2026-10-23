import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import {
  EditOutlined,
  SyncOutlined,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import EwtTypeField from "../../../../components/ui/form/EwtTypeField.jsx";
import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import { ewtOfOption } from "../../../../utils/helpers/calculateEWT.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import useMapping from "../../../../hooks/useMapping.js";

const buildColors = (c) => ({
  primary: c.green.paid,
  primaryDark: c.green.textDark,
  hoverBg: c.green.badgeBg,
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textMuted: c.gray.textSecondary,
  inputBg: c.gray.inputBg,
  error: c.red.text,
});

/**
 * Freight / EWT editor.
 *
 * Two cards, one on top of the other:
 *   - FREIGHT - the charge on top of the goods, saved on the PO itself.
 *   - EWT     - the withholding tax on the PO's lines: the sum of the EWT
 *               they carry, with the EWT field of every line below it.
 *
 * Each card is read-only until its own Edit is pressed: the Edit button
 * swaps that card's value for its fields, and the modal's Save then writes
 * whatever is on screen. Only one card is open at a time, and the footer's
 * Back button is the way out of an edit.
 */
export default function FreightEWTUpdateModal({
  open,
  onClose,
  po,
  // The PO's purchase options - the lines the EWT lives on.
  options = [],
  onSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => buildColors(base), [base]);
  const { ewtBypassType } = useMapping();

  // Each card edits on its own.
  const [editingFreight, setEditingFreight] = useState(false);
  const [editingEwt, setEditingEwt] = useState(false);
  const [freight, setFreight] = useState("");
  // nPurchaseItemId -> the EWT on that line (the derived amount).
  const [ewtValues, setEwtValues] = useState({});
  // nPurchaseItemId -> the EWT TYPE of that line ("" = Default, A, B, C).
  const [ewtTypes, setEwtTypes] = useState({});
  const [saving, setSaving] = useState(false);
  // The EWT sync - the line it is running for.
  const [syncingId, setSyncingId] = useState(null);

  // The SAVED state — the PO and its lines as the parent holds them. Both
  // seeds read it: the open effect, and Back leaving edit mode (which must
  // throw away everything the user typed but never saved). Memoized on the
  // PO and its options — a refetch swaps the identity, so the editor
  // re-seeds, without re-running on every keystroke's render.
  const savedState = useMemo(() => {
    const freight =
      po?.dFreight != null && po?.dFreight !== "" ? String(po.dFreight) : "";
    const ewt = {};
    const types = {};
    (options || []).forEach((opt) => {
      const p = opt?.purchase_option;
      if (!p?.nPurchaseItemId) return;
      // The EWT is derived — the value comes from the helper, not a column.
      ewt[p.nPurchaseItemId] = String(ewtOfOption(p));
      types[p.nPurchaseItemId] = p.cEWTType || "";
    });
    return { freight, ewt, types };
  }, [po, options]);

  // The values always follow the PO (a save refetches it), but the edit
  // states are only reset when the modal is OPENED - a save must not close
  // the editor.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      setEditingFreight(false);
      setEditingEwt(false);
    }
    setFreight(savedState.freight);
    setEwtValues(savedState.ewt);
    setEwtTypes(savedState.types);
  }, [open, po, options, savedState]);

  // BACK — out of an edit: the screens go back to read-only and the
  // unsaved changes reset to the saved state. Pressed from read-only it
  // does nothing (the footer's Cancel then closes the modal itself).
  const handleBackFromEdit = () => {
    setFreight(savedState.freight);
    setEwtValues(savedState.ewt);
    setEwtTypes(savedState.types);
    setSyncingId(null);
    setEditingFreight(false);
    setEditingEwt(false);
  };

  const poId = po?.nPurchaseOrderId;
  const freightValue = Number(freight) || 0;
  // The EWT lines - the PO's options, in the order they are listed.
  const ewtLines = (options || [])
    .map((opt) => opt?.purchase_option)
    .filter((p) => p?.nPurchaseItemId);
  // The EWT the PO carries - the sum of the EWT on its lines. The amount
  // is DERIVED (see utils/helpers/calculateEWT.js), so the lines' own
  // values are used; while the editor is open the previewed amounts win
  // (they already include a type the user just picked).
  const ewtTotal = ewtLines.reduce(
    (sum, p) =>
      sum +
      (ewtValues[p.nPurchaseItemId] !== undefined
        ? Number(ewtValues[p.nPurchaseItemId]) || 0
        : ewtOfOption(p)),
    0,
  );

  const handleSave = async () => {
    if (!poId) return;
    setSaving(true);
    try {
      // No outside spinner, no popup: the modal's own footer spinner is
      // enough, and the editor stays open on the values it holds.
      // The freight lives on the PO itself.
      await PurchaseOrderAPI.updateFreight(poId, {
        dFreight: freight === "" ? null : Number(freight),
      });

      // The EWT lives on the lines - but the amount itself is DERIVED from
      // the line's EWT type, so only the TYPE is written. Only the lines
      // whose type changed are touched.
      await Promise.all(
        ewtLines.map(async (p) => {
          const next = ewtTypes[p.nPurchaseItemId] ?? "";
          const current = p.cEWTType || "";
          if (next === current) return;
          await PurchaseOptionAPI.updateOption(p.nPurchaseItemId, {
            cEWTType: next === "" ? null : next,
          });
        }),
      );

      // The values on screen are refreshed by the PO refetch, and the
      // editor goes back to its default (read-only) view.
      setEditingFreight(false);
      setEditingEwt(false);
      onSuccess?.();
    } catch (err) {
      console.error("Failed to save the freight / EWT:", err);
    } finally {
      setSaving(false);
    }
  };

  // The EWT sync: pull the EWT the system calculates for ONE line (the
  // same formula the option editor uses). Every line has its own button.
  const handleSyncEwt = async (p) => {
    if (!p) return;
    setSyncingId(p.nPurchaseItemId);
    try {
      const res = await PurchaseOptionAPI.calculateEWT({
        nSupplierId: p.nSupplierId,
        quantity: p.nQuantity,
        unitPrice: p.dUnitPrice,
        // 'G' goods (1%) / 'S' service (2%) - the line's own item type.
        cItemType: p.transaction_item?.transaction?.cItemType ?? "G",
        // The line's own EWT type - the bypass wins over the default.
        cEWTType: ewtTypes[p.nPurchaseItemId] || null,
      });
      setEwtValues((prev) => ({
        ...prev,
        [p.nPurchaseItemId]: String(res?.calculatedEWT ?? ""),
      }));
    } catch (err) {
      console.error("Failed to sync the EWT:", err);
    } finally {
      setSyncingId(null);
    }
  };

  // The type was picked on a line: remember it and re-derive that line's
  // amount with the new formula.
  const handleEwtTypeChange = async (p, type) => {
    setEwtTypes((prev) => ({ ...prev, [p.nPurchaseItemId]: type }));
    setSyncingId(p.nPurchaseItemId);
    try {
      const res = await PurchaseOptionAPI.calculateEWT({
        nSupplierId: p.nSupplierId,
        quantity: p.nQuantity,
        unitPrice: p.dUnitPrice,
        cItemType: p.transaction_item?.transaction?.cItemType ?? "G",
        cEWTType: type || null,
      });
      setEwtValues((prev) => ({
        ...prev,
        [p.nPurchaseItemId]: String(res?.calculatedEWT ?? ""),
      }));
    } catch (err) {
      console.error("Failed to re-derive the EWT:", err);
    } finally {
      setSyncingId(null);
    }
  };

  // The small button both cards use (Edit, and the EWT sync).
  const actionButton = ({
    label,
    icon,
    onClick,
    disabled = false,
    tone = "primary",
    height = 26,
    title,
  }) => (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label || undefined}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.4,
        height,
        // An icon-only button is a square.
        width: label ? "auto" : height,
        px: label ? 0.9 : 0,
        borderRadius: "6px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: "0.62rem",
        fontWeight: 700,
        color: tone === "primary" ? c.primaryDark : c.textMuted,
        background: tone === "primary" ? c.hoverBg : "transparent",
        border: `0.5px solid ${c.border}`,
        flexShrink: 0,
        "&:hover": disabled
          ? undefined
          : tone === "primary"
            ? { filter: "brightness(0.97)" }
            : { background: c.hoverBg },
        "&.Mui-disabled": { opacity: 0.45 },
      }}
    >
      {icon}
      {label}
    </Box>
  );

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Freight / EWT"
      subTitle={po?.strPurchaseOrderNo || ""}
      onSave={handleSave}
      saveLabel="Save"
      // The footer's Cancel/Back is the way out of an edit: while editing it
      // goes back to read-only AND resets the unsaved changes; otherwise it
      // closes the modal.
      onCancel={() => {
        if (editingFreight || editingEwt) {
          handleBackFromEdit();
          return;
        }
        onClose?.();
      }}
      cancelLabel={editingFreight || editingEwt ? "Back" : "Cancel"}
      loading={saving}
      disableBackdropClick
      width={620}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {/* THE FREIGHT - hidden while the EWT is being edited */}
        {!editingEwt && (
          <Box
            sx={{
              border: `0.5px solid ${c.border}`,
              borderRadius: "10px",
              px: 1.25,
              py: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {editingFreight ? (
              /* EDIT - no label here: the field alone. The form grid carries
                 MUI's negative margins, so it needs a padding of its own,
                 otherwise the field sits outside the box. */
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0, px: 1, py: 1 }}>
                  <FormGrid
                    fields={[
                      {
                        name: "dFreight",
                        label: "Freight Charge",
                        type: "peso",
                        xs: 12,
                        placeholder: "0.00",
                        sx: {
                          "& .MuiInputBase-root": {
                            backgroundColor: c.inputBg,
                            borderRadius: 2,
                            fontSize: "0.75rem",
                          },
                        },
                      },
                    ]}
                    formData={{ dFreight: freight }}
                    handleChange={(e) => setFreight(e.target.value)}
                    errors={{}}
                  />
                </Box>
              </Box>
            ) : (
              /* VIEW - the label, the amount under it, and the Edit button */
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: c.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      lineHeight: 1,
                    }}
                  >
                    Freight
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      minHeight: 16,
                      lineHeight: 1.05,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: freightValue > 0 ? "1.25rem" : "0.9rem",
                        fontWeight: freightValue > 0 ? 800 : 400,
                        fontStyle: freightValue > 0 ? "normal" : "italic",
                        lineHeight: 1.05,
                        color: freightValue > 0 ? c.primaryDark : c.textMuted,
                      }}
                    >
                      {freightValue > 0 ? fmtPHP(freightValue) : "No Freight"}
                    </Typography>
                  </Box>
                </Box>
                {actionButton({
                  label: "Edit",
                  icon: <EditOutlined sx={{ fontSize: "0.8rem" }} />,
                  onClick: () => setEditingFreight(true),
                })}
              </Box>
            )}
          </Box>
        )}

        {/* THE EWT - hidden while the freight is being edited */}
        {!editingFreight && (
          <Box
            sx={{
              border: `0.5px solid ${c.border}`,
              borderRadius: "10px",
              px: 1.25,
              py: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {editingEwt ? (
              /* EDIT - no label here: the fields of the lines, each with its
                 own Sync button on the right. */
              <Box sx={{ px: 1, py: 1 }}>
                {ewtLines.length === 0 ? (
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontStyle: "italic",
                      color: c.textMuted,
                      textAlign: "center",
                      py: 1,
                    }}
                  >
                    This purchase order has no items yet.
                  </Typography>
                ) : (
                  /* The lines - the EWT field of every one of them, each
                     with its own Sync button on the right. The gap is
                     wide enough for the field's floating label to sit
                     above its own border without crowding the line
                     above it. */
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {ewtLines.map((p) => (
                      <Box
                        key={p.nPurchaseItemId}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 0.5,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0, px: 1 }}>
                          {/* THE LINE - the EWT amount is derived from the
                              line's EWT type, so the field shows the amount
                              and lets the user pick the type. */}
                          <EwtTypeField
                            compact
                            label={[p.strBrand, p.strModel]
                              .filter(Boolean)
                              .join(" \u00b7 ")}
                            value={ewtTypes[p.nPurchaseItemId] ?? ""}
                            amount={
                              ewtValues[p.nPurchaseItemId] === undefined ||
                              ewtValues[p.nPurchaseItemId] === ""
                                ? null
                                : Number(ewtValues[p.nPurchaseItemId])
                            }
                            loading={syncingId === p.nPurchaseItemId}
                            labels={ewtBypassType}
                            onChange={(type) => handleEwtTypeChange(p, type)}
                          />
                        </Box>

                        {/* SYNC EWT - this line only. Icon only, on the
                            right of the field, as tall as the field. */}
                        {actionButton({
                          label: "",
                          icon: <SyncOutlined sx={{ fontSize: "0.9rem" }} />,
                          onClick: () => handleSyncEwt(p),
                          disabled: syncingId === p.nPurchaseItemId,
                          // The field's own height - the EWT field is a
                          // standard small TextField (40px), so the button
                          // lines up with it exactly.
                          height: 40,
                          title:
                            syncingId === p.nPurchaseItemId
                              ? "Syncing..."
                              : "Sync EWT",
                        })}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              /* VIEW - the label, the EWT total under it, and the Edit button */
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: c.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      lineHeight: 1,
                    }}
                  >
                    EWT
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      minHeight: 16,
                      lineHeight: 1.05,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: ewtTotal > 0 ? "1.25rem" : "0.9rem",
                        fontWeight: ewtTotal > 0 ? 800 : 400,
                        fontStyle: ewtTotal > 0 ? "normal" : "italic",
                        lineHeight: 1.05,
                        color: ewtTotal > 0 ? c.primaryDark : c.textMuted,
                      }}
                    >
                      {ewtTotal > 0 ? fmtPHP(ewtTotal) : "No EWT"}
                    </Typography>
                  </Box>
                </Box>
                {actionButton({
                  label: "Edit",
                  icon: <EditOutlined sx={{ fontSize: "0.8rem" }} />,
                  onClick: () => setEditingEwt(true),
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </ModalContainer>
  );
}
