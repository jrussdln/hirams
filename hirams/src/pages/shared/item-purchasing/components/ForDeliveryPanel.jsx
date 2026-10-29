import React from "react";
import { Box, Typography, Collapse, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  EditOutlined,
  OutboxOutlined,
  PhotoCameraOutlined,
  SyncOutlined,
  CloseRounded,
} from "@mui/icons-material";
import { fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import ScanSerialNumberModal from "../modal/ScanSerialNumberModal.jsx";
import RowEditForm from "./shared/RowEditForm.jsx";
import DeliveryDateLabel from "./shared/DeliveryDateLabel.jsx";
import PurchaseItemsHeader, {
  ItemInfoColumn,
} from "./shared/PurchaseItemsTable.jsx";
import { hasApprovedInventory, approvedJevs } from "./shared/hasApprovedInventory.js";
import { getToDeliver } from "../../../../utils/helpers/purchaseProgress.js";

const num = (v) => Number(v) || 0;

export default function ForDeliveryPanel({
  options = [],
  forms,
  setForms,
  txnTotals,
  // The PO the rows belong to — it rides on the code line of every row.
  poNumber = "",
  // One number for the whole card, pre-filled on every row — a delivery
  // cannot be submitted without it.
  suggestedReceiptNo = "",
  // Edit button → receive form. Saves ONE line (returns true when recorded).
  onSaveReceive,
  savingReceive = false,
  // The receipt number the line was recorded under (its inventory rows carry
  // it) — the form opens with it instead of a blank field.
  onLoadReceiptNo,
  // Every purchase option per transaction item (all POs) — a row whose
  // quantity is shared by several suppliers opens one form per supplier.
  txnItemOptions,
  // The brand · model is a link — it opens the transaction for purchase.
  onBrandClick,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const { slate, gray, blue, red } = base;
  const getKey = (opt, idx) => opt.purchase_option?.nPurchaseItemId ?? idx;

  // Received (approved + pending) − delivered. Pending rows count as in hand,
  // so they are deliverable too — same rule as the backend guard.
  const toDeliver = (opt) => getToDeliver(opt?.purchase_option);

  // Row figure combined across every PO of the transaction (5 from supplier A
  // + 5 from supplier B = 10). It is both what the row shows and the form max:
  // on submit the delivery is split over the purchase items it covers, so the
  // shared qty really can go out from here.
  const rowFree = (opt) => {
    const t = txnTotals?.[opt?.purchase_option?.transaction_item?.nTransactionItemId];
    return t ? Math.max(num(t.rcvd) - num(t.dlvd), 0) : toDeliver(opt);
  };

  // Serial numbers written when the goods were RECEIVED (Pending Receipt),
  // minus the ones already delivered — what a row can still hand over. Both
  // lists are attached to every purchase option by
  // PurchaseOrderController::attachInventoryStats.
  const onHandSerials = (opt) => {
    const p = opt?.purchase_option;
    const sent = new Set(
      (p?.deliveredSerialNumbers || []).filter(Boolean).map(String),
    );
    return (p?.receivedSerialNumbers || [])
      .filter(Boolean)
      .map(String)
      .filter((sn) => !sent.has(sn));
  };

  // Hide items with nothing left to deliver on any of their POs
  const visible = React.useMemo(
    () =>
      options
        .map((opt, origIdx) => ({ opt, origIdx }))
        .filter(({ opt }) => rowFree(opt) > 0),
    [options, txnTotals]
  );

  const [expandedIds, setExpandedIds] = React.useState(() => new Set());
  // ── Edit → RECEIVE form ──────────────────────────────────────────────
  // Separate from the deliver form above: a row can still be short on stock
  // while it is listed here, so its edit button opens the receive form and
  // submits only that one line.
  const [editIds, setEditIds] = React.useState(() => new Set());
  const [editForms, setEditForms] = React.useState({});
  // The receipt number each row was recorded under, keyed like editForms —
  // looked up once per row so reopening a form doesn't refetch it.
  const [receiptByRow, setReceiptByRow] = React.useState({});
  // Which row's S/N are being scanned by camera (null = modal closed).
  const [scanKey, setScanKey] = React.useState(null);
  const allKeys = visible.map(({ opt, origIdx }) => getKey(opt, origIdx));
  const allExpanded =
    allKeys.length > 0 && allKeys.every((k) => expandedIds.has(k));

  // The row carries TWO forms — the deliver form and the receive (edit)
  // form — and only one of them may be open on a row at a time. Opening
  // either one closes the other.
  const toggleOne = (k, opt) => {
    const willOpen = !expandedIds.has(k);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
    // Opening the deliver form closes the receive form on the same row.
    if (willOpen && editIds.has(k)) closeEdit(k, opt);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
      return;
    }
    setExpandedIds(new Set(allKeys));
    // Opening every deliver form closes the receive forms on those rows.
    visible.forEach(({ opt, origIdx }) => {
      const k = getKey(opt, origIdx);
      if (editIds.has(k)) closeEdit(k, opt);
    });
  };

  const getForm = (k) =>
    forms[k] ?? {
      qty: "",
      // Untouched rows track the card's number; a row the user edited keeps
      // whatever is in forms[k].
      receiptNo: suggestedReceiptNo || "",
      showSN: false,
      serials: [],
    };
  const setForm = (k, patch) =>
    setForms((prev) => ({ ...prev, [k]: { ...getForm(k), ...patch } }));

  // The receive form opened from a row's Edit button — one draft per row,
  // cleared again as soon as its line has been recorded.
  const getEditForm = (k) =>
    editForms[k] ?? { qty: "", receiptNo: "", showSN: false, serials: [] };
  const setEditForm = (k, patch) =>
    setEditForms((prev) => ({ ...prev, [k]: { ...getEditForm(k), ...patch } }));

  // ── Suppliers behind this row's quantity ──────────────────────────────
  // The row adds every PO of the item together (5 + 7 = 12), but each
  // supplier keeps its own line — so Edit opens ONE FORM PER SUPPLIER. The
  // row's own option leads; the others follow when they hold something.
  const contributors = (opt) => {
    const mine = opt?.purchase_option;
    if (!mine) return [];
    // The merged row hands over its RAW part options. Reading the lead's
    // SUMMED figures as one supplier's line made the first form claim the
    // whole group — VST really holds 5, and the other 7 belongs to another
    // supplier's line.
    const parts = (opt?.__parts ?? [])
      .map((o) => o?.purchase_option ?? o)
      .filter(Boolean);
    if (parts.length) {
      // The row's own option still leads; the others follow when they hold
      // received stock.
      return [
        parts[0],
        ...parts.slice(1).filter((q) => num(q?.nInventoryQty) > 0),
      ];
    }
    // Fallback for rows that were not built by the group merge.
    const txId =
      mine?.nTransactionItemId ?? mine?.transaction_item?.nTransactionItemId;
    const others = (txnItemOptions?.[txId] ?? [])
      .map((c) => c?.purchase_option)
      .filter(
        (q) =>
          q &&
          Number(q?.nPurchaseItemId) !== Number(mine?.nPurchaseItemId) &&
          num(q?.nInventoryQty) > 0,
      );
    return [mine, ...others];
  };

  // Opening a form seeds it with what THAT supplier's line already holds — a
  // correction starts from the recorded quantity, the S/N on record and the
  // receipt number the row was written under.
  const seedEditForm = (q) => {
    const id = String(q?.nPurchaseItemId);
    const recorded = (q?.receivedSerialNumbers || [])
      .filter(Boolean)
      .map(String);
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        qty: String(num(q?.nInventoryQty)),
        // The line's own receipt number drops in below (it is optional here).
        receiptNo: receiptByRow[id] ?? (onLoadReceiptNo ? "" : ""),
        // Baseline for "did the user change the receipt" — the button treats
        // a receipt edit alone as a change (see RowEditForm).
        origReceiptNo: receiptByRow[id] ?? (onLoadReceiptNo ? "" : ""),
        showSN: true,
        serials: recorded,
      },
    }));

    if (!onLoadReceiptNo || receiptByRow[id] != null) return;
    onLoadReceiptNo(Number(id))
      .then((r) => {
        setReceiptByRow((prev) => ({ ...prev, [id]: r || "" }));
        setEditForms((prev) => {
          const cur = prev[id];
          // Keep whatever the user has already typed in the field.
          if (!cur || (cur.receiptNo || "").trim()) return prev;
          return { ...prev, [id]: { ...cur, receiptNo: r || "", origReceiptNo: r || "" } };
        });
      })
      .catch((err) =>
        console.error("Failed to load the line's receipt no.:", err),
      );
  };

  const toggleEdit = (k, opt) => {
    const willOpen = !editIds.has(k);
    setEditIds((prev) => {
      const next = new Set(prev);
      willOpen ? next.add(k) : next.delete(k);
      return next;
    });
    // Opening the receive form closes the deliver form on the same row.
    if (willOpen && expandedIds.has(k)) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }
    if (willOpen) contributors(opt).forEach(seedEditForm);
  };
  const closeEdit = (k, opt) => {
    const ids = contributors(opt).map((q) => String(q?.nPurchaseItemId));
    // Forget the cached receipts — the next save may have written new ones.
    setReceiptByRow((prev) => {
      if (!ids.some((id) => id in prev)) return prev;
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setEditIds((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    setEditForms((prev) => {
      if (!ids.some((id) => id in prev)) return prev;
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  };

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

  // The row the camera modal is bound to (null while it is closed).
  const scanEntry =
    scanKey != null
      ? visible.find(({ opt, origIdx }) => getKey(opt, origIdx) === scanKey)
      : null;
  const scanForm = scanKey != null ? getForm(scanKey) : { serials: [] };
  const scanCap = scanEntry
    ? Math.max(0, Math.min(Number(scanForm.qty) || 0, rowFree(scanEntry.opt)))
    : 0;
  const scanOnHand = scanEntry ? onHandSerials(scanEntry.opt) : [];
  const scanOption = scanEntry?.opt?.purchase_option;
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

        {/* ROWS — capped in height so a long PO scrolls inside the table
            instead of stretching the page; the header strip stays put. */}
        <Box sx={{ maxHeight: "50vh", overflowY: "auto" }}>
        {visible.map(({ opt, origIdx }, idx) => {
          const p = opt.purchase_option;
          const tx = p?.transaction_item?.transaction;
          // Shared across every PO of this item — also the form max below.
          const left = rowFree(opt);
          const k = getKey(opt, origIdx);
          const expanded = expandedIds.has(k);
          const form = getForm(k);
          // Edit → RECEIVE form. The row's quantity can be shared by several
          // suppliers (one PO each) — each of them gets its own form, so one
          // supplier is never corrected against another's numbers.
          const contributorList = contributors(opt);
          const editOpen = editIds.has(k);
          const isSingle = left === 1;
          // Qty in, receipt no. out — the field cannot be left blank.
          const receiptMissing =
            Number(form.qty) > 0 && !(form.receiptNo || "").trim();

          // ── Serial numbers ────────────────────────────────────────────
          // S/N are written when the goods are RECEIVED (Pending Receipt),
          // so the deliver form starts from that list minus what already
          // went out.
          const onHand = onHandSerials(opt);

          // A serial can never outnumber the units going out on this row.
          const capSerials = (qty) =>
            Math.max(0, Math.min(Number(qty) || 0, left));

          // What the sync button would fill — capped by the entered qty.
          const syncableSerials = onHand.slice(0, capSerials(form.qty));

          // Moving the qty trims the list to it; an empty, open S/N box
          // refills so raising the qty again does not leave it blank.
          const applyQty = (nextQty) => {
            const cap = capSerials(nextQty);
            const trimmed = (form.serials || []).slice(0, cap);
            setForm(k, {
              qty: nextQty,
              serials:
                trimmed.length === 0 && form.showSN && cap > 0
                  ? onHand.slice(0, cap)
                  : trimmed,
            });
          };

          // Opening the S/N box pre-fills it with the received serials.
          const toggleSN = () => {
            const open = !form.showSN;
            const current = form.serials || [];
            setForm(k, {
              showSN: open,
              serials:
                open && current.length === 0
                  ? onHand.slice(0, capSerials(form.qty))
                  : current,
            });
          };

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
                {/* Left: icon + item info */}
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
                    // A merged row can span several POs of the transaction —
                    // print the order(s) it was actually drawn from.
                    poNumber={opt.__poNos?.length ? opt.__poNos.join(", ") : poNumber}
                    onBrandClick={onBrandClick}
                  >
                    <DeliveryDateLabel
                      date={tx?.dtDelivery}
                      sx={{ color: slate.mutedColor }}
                    />
                  </ItemInfoColumn>
                </Box>

                {/* Right: To Deliver + edit + toggle button */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 92,
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
                      To Deliver
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        lineHeight: 1,
                        color:
                          left > 0 ? blue.textStrong : gray.textSecondary,
                      }}
                    >
                      {fmtQty(left)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.5rem",
                        lineHeight: 1,
                        color: gray.textSecondary,
                      }}
                    >
                      {p?.strUOM}
                    </Typography>
                  </Box>

                  {/* EDIT + DELIVER — grouped so the two icons sit close to
                      each other, while the "To Deliver" block keeps its own
                      spacing from them. */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    {/* EDIT — opens the receive form for this line */}
                    <Box
                      component="button"
                      onClick={() => toggleEdit(k, opt)}
                      title={
                        editOpen
                          ? "Hide receive form"
                          : "Edit — open receive form"
                      }
                      sx={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: `0.5px solid ${editOpen ? blue.border : slate.mutedBorder}`,
                        borderRadius: "50px",
                        background: editOpen ? blue.bg : "transparent",
                        color: editOpen ? blue.textStrong : slate.mutedColor,
                        cursor: "pointer",
                      }}
                    >
                      {editOpen ? (
                        <CloseRounded sx={{ fontSize: "0.85rem" }} />
                      ) : (
                        <EditOutlined sx={{ fontSize: "0.8rem" }} />
                      )}
                    </Box>

                    <Box
                      component="button"
                      onClick={() => toggleOne(k, opt)}
                      disabled={left <= 0}
                      title={
                        expanded ? "Hide deliver form" : "Show deliver form"
                      }
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
                      {expanded ? (
                        <CloseRounded sx={{ fontSize: "0.85rem" }} />
                      ) : (
                        <OutboxOutlined sx={{ fontSize: "0.85rem" }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* DELIVER FORM */}
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
                        Quantity to Deliver
                      </Typography>
                      <Box sx={{ width: 78, flexShrink: 0 }} />
                      <Typography
                        sx={{ ...labelSx, flex: 1, whiteSpace: "nowrap" }}
                      >
                        Receipt No. *
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
                            ? "1 Delivered"
                            : `Mark 1 ${p?.strUOM ?? ""}`}
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", flex: 1 }}>
                          <Box
                            component="input"
                            type="number"
                            min={0}
                            max={left}
                            value={form.qty}
                            onChange={(e) => {
                              if (Number(e.target.value) <= left)
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
                        onClick={toggleSN}
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
                        sx={{
                          ...inputSx,
                          border: receiptMissing
                            ? `0.5px solid ${red.text}`
                            : inputSx.border,
                        }}
                      />
                    </Box>

                    {receiptMissing && (
                      <Typography
                        sx={{
                          fontSize: "0.5rem",
                          fontWeight: 600,
                          color: red.text,
                          lineHeight: 1.2,
                        }}
                      >
                        Receipt No. is required
                        {suggestedReceiptNo
                          ? ` — next for this card: ${suggestedReceiptNo}`
                          : ""}
                      </Typography>
                    )}
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
                          // Hard cap: never more S/N than the qty going out.
                          maxItems: capSerials(form.qty),
                          // Camera scanner first, then the sync fill — both
                          // attached to the right of the field.
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
                                  : "Enter the delivery quantity first",
                              disabled: capSerials(form.qty) <= 0,
                            },
                            {
                              label: "Sync Received SN",
                              icon: (
                                <SyncOutlined sx={{ fontSize: "0.85rem" }} />
                              ),
                              onClick: () =>
                                setForm(k, {
                                  serials: onHand.slice(0, capSerials(form.qty)),
                                }),
                              disabled: syncableSerials.length === 0,
                              title: syncableSerials.length
                                ? `Fill with ${syncableSerials.length} received serial number(s) not yet delivered`
                                : "No received serial numbers available to fill",
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

              {/* EDIT FORM — RECEIVE (opened from the row's Edit button).
                  A row whose quantity is shared by several suppliers gets ONE
                  FORM PER SUPPLIER; each line saves on its own. */}
              <Collapse in={editOpen} unmountOnExit>
                <Box
                  sx={{
                    px: 2,
                    pb: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {contributorList.map((q) => {
                    const qk = String(q?.nPurchaseItemId);
                    const qForm = getEditForm(qk);
                    return (
                      <RowEditForm
                        key={qk}
                        mode="receive"
                        p={q}
                        // Nickname first, badge after — one supplier per form.
                        supplierName={q?.supplier?.strSupplierNickName || ""}
                        current={num(q?.nInventoryQty)}
                        max={num(q?.nQuantity)}
                        min={num(q?.nDeliveredQty)}
                        form={qForm}
                        onChange={(patch) => setEditForm(qk, patch)}
                        saving={savingReceive}
                        // An APPROVED inventory row means a JEV was already
                        // raised for this item — the record is closed.
                        locked={hasApprovedInventory(q, "receive")}
                        // …and the JEV behind it is named in the notice.
                        jevs={approvedJevs(q, "receive")}
                        currentSerials={(q?.receivedSerialNumbers || [])
                          .filter(Boolean)
                          .map(String)}
                        onSave={async () => {
                          if (!onSaveReceive) return;
                          const ok = await onSaveReceive({
                            nPurchaseItemId: Number(qk),
                            target: Number(qForm.qty),
                            strReceiptNumber:
                              (qForm.receiptNo || "").trim() || null,
                            serials: qForm.serials || [],
                          });
                          if (ok) closeEdit(k, opt);
                        }}
                      />
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
        </Box>
      </Box>

      {/* Camera scanner — opened from a row's S/N field, writing straight
          back into that row's form. */}
      <ScanSerialNumberModal
        open={scanKey != null}
        onClose={() => setScanKey(null)}
        serials={scanForm.serials || []}
        max={scanCap}
        allowedValues={scanOnHand}
        subTitle={scanLabel}
        onChange={(next) => {
          if (scanKey != null)
            setForm(scanKey, { serials: next, showSN: true });
        }}
      />
    </>
  );
}
