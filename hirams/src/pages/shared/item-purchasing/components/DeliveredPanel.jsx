import React from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { EditOutlined, CloseRounded } from "@mui/icons-material";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import { fmtQty } from "../../../../utils/formatters/formatter.js";
import {
  getDelivered,
} from "../../../../utils/helpers/purchaseProgress.js";
import RowEditForm from "./shared/RowEditForm.jsx";
import PurchaseItemsHeader, {
  ItemInfoColumn,
} from "./shared/PurchaseItemsTable.jsx";
import { hasApprovedInventory, approvedJevs } from "./shared/hasApprovedInventory.js";

const num = (v) => Number(v) || 0;

/**
 * Delivered phase (status 160) of the PO detail page.
 * Read-only list of the items that already went out — approved (A) + pending
 * (P) rows both count. Anything still undelivered is handled in For Delivery.
 *
 * Each row carries an Edit button opening the DELIVERED form for that line
 * (quantity + receipt no.), saved on its own through Save Changes.
 */
export default function DeliveredPanel({
  options = [],
  txnTotals,
  // The PO the rows belong to — it rides on the code line of every row.
  poNumber = "",
  // One number for the whole card — pre-filled on every edit form.
  suggestedReceiptNo = "",
  // Edit button → delivered form. Saves ONE line (returns true when recorded).
  onSaveDeliver,
  savingDeliver = false,
  // The receipt number the line was recorded under (its inventory rows carry
  // it) — the form opens with it instead of only the card's suggestion.
  onLoadReceiptNo,
  // Every purchase option per transaction item (all POs) — a row whose
  // quantity is shared by several suppliers opens one form per supplier.
  txnItemOptions,
  // Registers the footer's Save Changes runner — null while no row's edit
  // form is open. ItemPurchasingUpdateView renders the button after the
  // Cancel PO button.
  onFooterSaveChange,
  // The brand · model is a link — it opens the transaction for purchase.
  onBrandClick,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const { slate, gray, blue } = base;
  const getKey = (opt, idx) => opt.purchase_option?.nPurchaseItemId ?? idx;

  const delivered = (opt) => getDelivered(opt?.purchase_option);

  // Serial numbers written when the goods were received, minus the ones
  // already delivered — what a line can still hand over.
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

  // Hide items that have nothing delivered yet — same rule as the Delivered
  // card in the list. The card itself always stays visible.
  const visible = React.useMemo(
    () =>
      options
        .map((opt, origIdx) => ({ opt, origIdx }))
        .filter(({ opt }) => delivered(opt) > 0),
    [options]
  );

  // ── Edit → DELIVERED form ────────────────────────────────────────────
  // One draft per row; cleared again once its line has been recorded.
  const [editIds, setEditIds] = React.useState(() => new Set());
  const [editForms, setEditForms] = React.useState({});
  // The receipt number each row was recorded under, keyed like editForms —
  // looked up once per row so reopening a form doesn't refetch it.
  const [receiptByRow, setReceiptByRow] = React.useState({});
  const getEditForm = (k) =>
    editForms[k] ?? {
      qty: "",
      // Untouched rows track the card's number; a row the user edited keeps
      // whatever is in editForms[k].
      receiptNo: suggestedReceiptNo || "",
      showSN: false,
      serials: [],
    };
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
    // SUMMED figures (this row totals 12 received / 12 delivered) as one
    // supplier's line made the first form claim the whole group — VST
    // really holds 5, and the other 7 belongs to another supplier's line.
    const parts = (opt?.__parts ?? [])
      .map((o) => o?.purchase_option ?? o)
      .filter(Boolean);
    if (parts.length) {
      // The row's own option still leads; the others follow when they hold
      // delivered stock.
      return [
        parts[0],
        ...parts.slice(1).filter((q) => num(q?.nDeliveredQty) > 0),
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
          num(q?.nDeliveredQty) > 0,
      );
    return [mine, ...others];
  };

  // Opening a form seeds it with what THAT supplier's line already holds — a
  // correction starts from the recorded quantity, the S/N on record and the
  // receipt number the row was written under. The S/N list only opens when
  // the line actually holds serial numbers; otherwise it stays behind + SN.
  const seedEditForm = (q) => {
    const id = String(q?.nPurchaseItemId);
    const recorded = (q?.deliveredSerialNumbers || [])
      .filter(Boolean)
      .map(String);
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        qty: String(num(q?.nDeliveredQty)),
        // The line's own receipt number drops in below; the card's number is
        // only a stand-in while the lookup is on its way.
        receiptNo:
          receiptByRow[id] ?? (onLoadReceiptNo ? "" : suggestedReceiptNo || ""),
        // Baseline for "did the user change the receipt" — the button treats
        // a receipt edit alone as a change (see RowEditForm).
        origReceiptNo:
          receiptByRow[id] ?? (onLoadReceiptNo ? "" : suggestedReceiptNo || ""),
        showSN: recorded.length > 0,
        serials: recorded,
      },
    }));

    if (!onLoadReceiptNo || receiptByRow[id] != null) return;
    onLoadReceiptNo(Number(id), -1)
      .then((r) => {
        const recordedNo = r || "";
        setReceiptByRow((prev) => ({ ...prev, [id]: recordedNo }));
        setEditForms((prev) => {
          const cur = prev[id];
          // Keep whatever the user has already typed in the field.
          if (!cur || (cur.receiptNo || "").trim()) return prev;
          return {
            ...prev,
            [id]: {
              ...cur,
              receiptNo: recordedNo || suggestedReceiptNo || "",
              origReceiptNo: recordedNo || suggestedReceiptNo || "",
            },
          };
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
    if (willOpen) contributors(opt).forEach(seedEditForm);
  };

  // Show All / Hide All — opens (or closes) every row's edit form.
  const allKeys = visible.map(({ opt, origIdx }) => getKey(opt, origIdx));
  const allExpanded =
    allKeys.length > 0 && allKeys.every((k) => editIds.has(k));
  const toggleAll = () => {
    if (allExpanded) {
      setEditIds(new Set());
      return;
    }
    const next = new Set();
    visible.forEach(({ opt, origIdx }) => {
      const k = getKey(opt, origIdx);
      next.add(k);
      contributors(opt).forEach(seedEditForm);
    });
    setEditIds(next);
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

  // ── Footer's Save Changes ─────────────────────────────────────────────
  // The per-form Save button moved to the PAGE FOOTER. One click there
  // walks every open row and saves each of its supplier lines through the
  // same hook the button used to reach; a row where nothing failed closes.
  const saveLine = async (qk) => {
    if (!onSaveDeliver) return false;
    const qForm = getEditForm(qk);
    return onSaveDeliver({
      nPurchaseItemId: Number(qk),
      target: Number(qForm.qty),
      strReceiptNumber: (qForm.receiptNo || "").trim() || null,
      serials: qForm.serials || [],
    });
  };

  // True when a form still matches the record — the footer save skips such
  // a line silently instead of poking the hook for a no-op.
  const lineUnchanged = (q) => {
    const f = getEditForm(String(q?.nPurchaseItemId));
    if (!f) return true;
    const target = Number(f.qty);
    if (!Number.isInteger(target) || target !== num(q?.nDeliveredQty))
      return false;
    const recorded = (q?.deliveredSerialNumbers || [])
      .filter(Boolean)
      .map(String);
    const want = (f.serials || []).map(String);
    if (
      want.length !== new Set(recorded).size ||
      want.some((sn) => !recorded.includes(sn))
    )
      return false;
    return (
      (f.receiptNo || "").trim() === String(f.origReceiptNo ?? "").trim()
    );
  };

  const saveAllOpenForms = async () => {
    let anyFailed = false;
    for (const k of [...editIds]) {
      const entry = visible.find(
        ({ opt, origIdx }) => getKey(opt, origIdx) === k,
      );
      const list = entry ? contributors(entry.opt) : [];
      if (!list.length) {
        anyFailed = true;
        continue;
      }
      let rowFailed = false;
      for (const q of list) {
        // Nothing typed on this line — nothing to record; the row's form
        // just closes with its neighbours.
        if (lineUnchanged(q)) continue;
        const ok = await saveLine(String(q?.nPurchaseItemId));
        if (!ok) rowFailed = true;
      }
      if (rowFailed) anyFailed = true;
      else closeEdit(k, entry.opt);
    }
    return !anyFailed;
  };

  // ── Footer's Close (discard) ──────────────────────────────────────────
  // Closes EVERY open edit row without saving — the footer counterpart to
  // the per-row X. Newest values stay in the record untouched.
  const closeAllOpenForms = () => {
    for (const k of [...editIds]) {
      const entry = visible.find(
        ({ opt, origIdx }) => getKey(opt, origIdx) === k,
      );
      if (entry) closeEdit(k, entry.opt);
    }
  };
  const closeAllRef = React.useRef(null);
  closeAllRef.current = closeAllOpenForms;

  // The footer buttons appear only while a row's edit form is open, and
  // always run the LATEST runner through the refs — the panel re-renders
  // many times while a form is being typed into. The runners are handed
  // over WRAPPED in an object: a bare function passed through setState is
  // read as an UPDATER by React, which called it the moment it was
  // registered — the save ran on open and closed the form instantly.
  const saveAllRef = React.useRef(null);
  saveAllRef.current = saveAllOpenForms;
  React.useEffect(() => {
    if (!onFooterSaveChange) return undefined;
    onFooterSaveChange(
      editIds.size > 0
        ? {
            run: () => saveAllRef.current?.(),
            close: () => closeAllRef.current?.(),
          }
        : null,
    );
    return () => onFooterSaveChange(null);
  }, [editIds.size, onFooterSaveChange]);

  // Rows still showing the auto receipt number follow the card's number when
  // it arrives (or moves on). Anything typed by hand stays.
  const prevSuggestionRef = React.useRef("");
  React.useEffect(() => {
    const prev = prevSuggestionRef.current;
    prevSuggestionRef.current = suggestedReceiptNo;
    if (!suggestedReceiptNo || prev === suggestedReceiptNo) return;

    setEditForms((prevForms) => {
      let changed = false;
      const next = {};
      for (const [key, f] of Object.entries(prevForms)) {
        const current = String(f?.receiptNo ?? "").trim();
        const follows = current === prev || (!prev && !current);
        if (follows) {
          next[key] = { ...f, receiptNo: suggestedReceiptNo };
          changed = true;
        } else {
          next[key] = f;
        }
      }
      return changed ? next : prevForms;
    });
  }, [suggestedReceiptNo]);

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
            <Typography sx={{ fontSize: "0.6rem", color: gray.textSecondary }}>
              No delivered items yet.
            </Typography>
          </Box>
        )}

        {/* ROWS — capped in height so a long PO scrolls inside the table
            instead of stretching the page; the header strip stays put. */}
        <Box sx={{ maxHeight: "50vh", overflowY: "auto" }}>
        {visible.map(({ opt, origIdx }, idx) => {
          const p = opt.purchase_option;
          const tx = p?.transaction_item?.transaction;
          // Combined across every PO of the transaction so the row matches
          // the card (5 + 7 = 12).
          const total = txnTotals?.[p?.transaction_item?.nTransactionItemId];
          const cDlvd = total ? total.dlvd : num(p?.nDeliveredQty);
          const k = getKey(opt, origIdx);
          // Edit → DELIVERED form. The row's quantity can be shared by several
          // suppliers (one PO each) — each of them gets its own form, so one
          // supplier is never corrected against another's numbers.
          const contributorList = contributors(opt);
          const editOpen = editIds.has(k);

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
                  />
                </Box>

                {/* Right: Delivered total + edit */}
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
                      Delivered
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        lineHeight: 1,
                        color:
                          cDlvd > 0 ? blue.textStrong : gray.textSecondary,
                      }}
                    >
                      {fmtQty(cDlvd)}
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

                  {/* EDIT — opens the delivered form for this line */}
                  <Box
                    component="button"
                    onClick={() => toggleEdit(k, opt)}
                    title={
                      editOpen
                        ? "Hide delivered form"
                        : "Edit — open delivered form"
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
                </Box>
              </Box>

              {/* EDIT FORM — DELIVERED (opened from the row's Edit button).
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
                        mode="deliver"
                        p={q}
                        // Nickname first, badge after — one supplier per form.
                        supplierName={q?.supplier?.strSupplierNickName || ""}
                        current={num(q?.nDeliveredQty)}
                        max={num(q?.nInventoryQty)}
                        min={0}
                        form={qForm}
                        onChange={(patch) => setEditForm(qk, patch)}
                        saving={savingDeliver}
                        // An APPROVED inventory row means a JEV was already
                        // raised for this item — the record is closed.
                        locked={hasApprovedInventory(q, "deliver")}
                        // …and the JEV behind it is named in the notice.
                        jevs={approvedJevs(q, "deliver")}
                        currentSerials={(q?.deliveredSerialNumbers || [])
                          .filter(Boolean)
                          .map(String)}
                        onHandSerials={onHandSerials({ purchase_option: q })}
                        onSave={async () => {
                          const ok = await saveLine(qk);
                          if (ok) closeEdit(k, opt);
                        }}
                        // The Save button lives in the PAGE FOOTER now -
                        // one click saves every open edit form.
                        showSave={false}
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
    </>
  );
}
