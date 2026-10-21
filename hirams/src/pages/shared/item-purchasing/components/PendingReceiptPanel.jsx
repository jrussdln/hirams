import React from "react";
import { Box, Typography, Collapse, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  MoveToInboxOutlined,
  PhotoCameraOutlined,
} from "@mui/icons-material";
import { fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import ScanSerialNumberModal from "../modal/ScanSerialNumberModal.jsx";
import PurchaseItemsHeader, {
  ItemInfoColumn,
} from "./shared/PurchaseItemsTable.jsx";

export default function PendingReceiptPanel({
  options = [],
  forms,
  setForms,
  onBrandClick,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const { slate, gray, blue } = base;
  const getKey = (opt, idx) => opt.purchase_option?.nPurchaseItemId ?? idx;
  const getToReceive = (opt) => {
    const p = opt?.purchase_option;
    const ordered = p?.nQuantity || 0;
    const rcvd = p?.nInventoryQty || 0;
    return Math.max(ordered - rcvd, 0);
  };

  // Hide items that are fully received (nothing left in for delivery)
  const visible = React.useMemo(
    () =>
      options
        .map((opt, origIdx) => ({ opt, origIdx }))
        .filter(({ opt }) => getToReceive(opt) > 0),
    [options]
  );

  const [expandedIds, setExpandedIds] = React.useState(() => new Set());
  // Which row's S/N are being scanned by camera (null = modal closed).
  const [scanKey, setScanKey] = React.useState(null);
  const allKeys = visible.map(({ opt, origIdx }) => getKey(opt, origIdx));
  const allExpanded =
    allKeys.length > 0 && allKeys.every((k) => expandedIds.has(k));

  const toggleOne = (k) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const toggleAll = () =>
    setExpandedIds(allExpanded ? new Set() : new Set(allKeys));

  const getForm = (k) =>
    forms[k] ?? { qty: "", receiptNo: "", showSN: false, serials: [] };
  const setForm = (k, patch) =>
    setForms((prev) => ({ ...prev, [k]: { ...getForm(k), ...patch } }));

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
    background: slate.innerBg,//187.27
  };

  // The row the camera modal is bound to (null while it is closed).
  const scanEntry =
    scanKey != null
      ? visible.find(({ opt, origIdx }) => getKey(opt, origIdx) === scanKey)
      : null;
  const scanForm = scanKey != null ? getForm(scanKey) : { serials: [] };
  const scanOption = scanEntry?.opt?.purchase_option;
  const scanCap = scanEntry
    ? Math.max(
        0,
        Math.min(Number(scanForm.qty) || 0, getToReceive(scanEntry.opt)),
      )
    : 0;
  // Serials already on record — blocked so a unit cannot be received twice.
  const scanReceived = (scanOption?.receivedSerialNumbers || [])
    .filter(Boolean)
    .map(String);
  const scanLabel =
    [scanOption?.strBrand, scanOption?.strModel].filter(Boolean).join(" · ") ||
    scanOption?.transaction_item?.strName ||
    "Item";

  return (
    <>
      <Box
        sx={{
          border: `0.5px solid ${slate.border}`,
          borderRadius: 1,
          background: slate.outerBg,
          overflow: "hidden",
        }}
      >
        {/* Table header — the title on the left, the toggle on the right.
            It sits INSIDE the table box so the box rounds its top corners. */}
        <PurchaseItemsHeader
          action={
            <Box
              component="button"
              onClick={toggleAll}
              sx={{
                px: 0.75,
                height: 22,
                fontSize: "0.55rem",
                fontWeight: 700,
                color: blue.textStrong,
                background: blue.bg,
                border: `0.5px solid ${blue.border}`,
                // Barely rounded — it sits in the header's right corner.
                borderRadius: "5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {allExpanded ? "Hide All" : "Show All"}
            </Box>
          }
        />

        {visible.length === 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography
              sx={{ fontSize: "0.6rem", color: gray.textSecondary }}
            >
              No items left for delivery.
            </Typography>
          </Box>
        )}

        {visible.map(({ opt, origIdx }, idx) => {
          const p = opt.purchase_option;
          const tx = p?.transaction_item?.transaction;
          const toReceive = getToReceive(opt);
          const k = getKey(opt, origIdx);
          const expanded = expandedIds.has(k);
          const form = getForm(k);
          const isSingle = toReceive === 1;

          // ── Serial numbers ────────────────────────────────────────────
          // Receiving WRITES the S/N, so nothing is pre-filled here — the
          // list only has to stay inside the quantity being checked in.
          const capSerials = (qty) =>
            Math.max(0, Math.min(Number(qty) || 0, toReceive));

          // Moving the qty trims the list to it, so the S/N can never
          // outnumber the units being received.
          const applyQty = (nextQty) =>
            setForm(k, {
              qty: nextQty,
              serials: (form.serials || []).slice(0, capSerials(nextQty)),
            });

          return (
            <Box
              key={k}
              sx={{
                borderBottom:
                  idx < visible.length - 1
                    ? `0.5px solid ${slate.divider}`
                    : "none",
              }}
            >
              {/* ROW */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  "&:hover": { background: slate.itemHover },
                  transition: "background 0.15s",
                }}
              >
                {/* Left: the numbering + item info */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <ItemInfoColumn
                    p={p}
                    tx={tx}
                    idx={idx}
                    onBrandClick={onBrandClick}
                  />
                </Box>

                {/* Right: To Receive + toggle button */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 70,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.48rem",
                        fontWeight: 700,
                        color: gray.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        lineHeight: 1,
                      }}
                    >
                      To Receive
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        lineHeight: 1,
                        color:
                          toReceive > 0 ? blue.textStrong : gray.textSecondary,
                      }}
                    >
                      {fmtQty(toReceive)}
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "0.5rem",
                          ml: 0.3,
                          color: gray.textSecondary,
                        }}
                      >
                        {p?.strUOM}
                      </Typography>
                    </Typography>
                  </Box>

                  <Box
                    component="button"
                    onClick={() => toggleOne(k)}
                    disabled={toReceive <= 0}
                    title={expanded ? "Hide receive form" : "Show receive form"}
                    sx={{
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: `0.5px solid ${expanded ? blue.border : slate.mutedBorder}`,
                      borderRadius: "50px",
                      background: expanded ? blue.bg : "transparent",
                      color: expanded ? blue.textStrong : slate.mutedColor,
                      cursor: "pointer",
                      "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
                    }}
                  >
                    <MoveToInboxOutlined sx={{ fontSize: "0.85rem" }} />
                  </Box>
                </Box>
              </Box>

              {/* RECEIVE FORM */}
              <Collapse in={expanded} unmountOnExit>
                <Box
                  sx={{
                    px: 2,
                    pb: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Divider sx={{ borderColor: slate.divider }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}
                  >
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Typography sx={{ ...labelSx, flex: isSingle ? 1.4 : 1 }}>
                        Quantity to Receive
                      </Typography>
                      <Box sx={{ width: 78, flexShrink: 0 }} />
                      <Typography
                        sx={{ ...labelSx, flex: 1, whiteSpace: "nowrap" }}
                      >
                        Receipt No. (optional)
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.6 }}
                    >
                      {isSingle ? (
                        <Box
                          component="button"
                          onClick={() => applyQty(form.qty === "1" ? "" : "1")}
                          sx={{
                            flex: 1.4,
                            height: 32,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color:
                              form.qty === "1" ? gray.textOnFill : blue.textStrong,
                            background:
                              form.qty === "1" ? blue.textStrong : blue.bg,
                            border: `0.5px solid ${blue.border}`,
                            borderRadius: "7px",
                            cursor: "pointer",
                          }}
                        >
                          {form.qty === "1"
                            ? "1 Received"
                            : `Mark 1 ${p?.strUOM ?? ""}`}
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", flex: 1 }}>
                          <Box
                            component="input"
                            type="number"
                            min={0}
                            max={toReceive}
                            value={form.qty}
                            onChange={(e) => {
                              if (Number(e.target.value) <= toReceive)
                                applyQty(e.target.value);
                            }}
                            sx={{
                              ...inputSx,
                              borderRight: "none",
                              borderRadius: "7px 0 0 7px",
                            }}
                          />
                          <Box
                            sx={{
                              height: 32,
                              px: 1,
                              display: "flex",
                              alignItems: "center",
                              background: slate.mutedBg,
                              border: `0.5px solid ${slate.border}`,
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
                              {p?.strUOM ?? "—"}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      <Box
                        component="button"
                        onClick={() => setForm(k, { showSN: !form.showSN })}
                        disabled={!form.qty || Number(form.qty) <= 0}
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
                        onChange={(e) =>
                          setForm(k, { receiptNo: e.target.value })
                        }
                        sx={inputSx}
                      />
                    </Box>
                  </Box>

                  {form.showSN && (
                    <FormGrid
                      fields={[
                        {
                          name: "serials",
                          label: "Serial Numbers",
                          type: "serialNumber",
                          xs: 12,
                          placeholder: "Scan or type S/N and press Enter...",
                          // Hard cap: never more S/N than the qty received.
                          maxItems: capSerials(form.qty),
                          // Camera scanner attached to the right of the field.
                          actions: [
                            {
                              icon: (
                                <PhotoCameraOutlined
                                  sx={{ fontSize: "0.9rem" }}
                                />
                              ),
                              onClick: () => setScanKey(k),
                              title:
                                capSerials(form.qty) > 0
                                  ? "Scan serial numbers with the camera"
                                  : "Enter the quantity to receive first",
                              disabled: capSerials(form.qty) <= 0,
                            },
                          ],
                        },
                      ]}
                      switches={[]}
                      formData={{ serials: form.serials }}
                      errors={{}}
                      handleChange={(e) => {
                        if (e.target.name === "serials")
                          setForm(k, { serials: e.target.value });
                      }}
                      autoFocus={false}
                    />
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Camera scanner — opened from a row's S/N field, writing straight
          back into that row's form. */}
      <ScanSerialNumberModal
        open={scanKey != null}
        onClose={() => setScanKey(null)}
        serials={scanForm.serials || []}
        max={scanCap}
        denyValues={scanReceived}
        subTitle={scanLabel}
        onChange={(next) => {
          if (scanKey != null)
            setForm(scanKey, { serials: next, showSN: true });
        }}
      />
    </>
  );
}
