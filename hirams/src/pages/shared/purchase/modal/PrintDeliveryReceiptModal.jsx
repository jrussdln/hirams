import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Checkbox } from "@mui/material";
import {
  LocalShippingOutlined,
  ReceiptLongOutlined,
  CalendarTodayOutlined,
  PersonOutlined,
  StorefrontOutlined,
} from "@mui/icons-material";
import { fmtDate, fmtQty } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  divider: c.slate.border,
  dividerFaint: c.slate.divider,
  rowBorder: c.slate.borderRow,
  rowAltBg: c.slate.stripeAltBg,
  rowBg: c.print.paper,
  badgeBg: c.slate.hover,
  badgeBorder: c.slate.borderLight,
  badgeText: c.slate.mutedText,
  textStrong: c.gray.textPrimary,
  textMed: c.gray.label,
  textFaint: c.gray.textDisabled,
  textMuted: c.gray.textSecondary,
  hoverBg: c.slate.hover,
  toggleActiveBg: c.slate.mutedBg,
  checkboxUnchecked: c.slate.scrollbarThumb,
  checkboxChecked: c.gray.label,
  checkedRowBg: c.blue.bgSoft,
  disabledRowBg: c.slate.hover,
  panelBg: c.slate.innerBg,
  panelBorder: c.slate.border,
  tableHeaderBg: c.slate.itemHeaderBg,
  emptyIconColor: c.slate.scrollbarThumb,
  textDisabled: c.gray.textDisabled,
});

const SHAKE_KEYFRAMES = `@keyframes drRowShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }`;
if (
  typeof document !== "undefined" &&
  !document.getElementById("dr-row-shake-kf")
) {
  const s = document.createElement("style");
  s.id = "dr-row-shake-kf";
  s.textContent = SHAKE_KEYFRAMES;
  document.head.appendChild(s);
}

function InfoRow({ icon: Icon, label, value, fullWidth = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  return (
    <Box
      sx={{
        gridColumn: fullWidth ? "1 / -1" : "auto",
        display: "flex",
        alignItems: "flex-start",
        gap: 0.75,
        py: 0.5,
      }}
    >
      <Icon
        sx={{
          fontSize: "0.7rem",
          color: c.textDisabled,
          mt: "3px",
          flexShrink: 0,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.55rem",
            fontWeight: 700,
            color: c.textDisabled,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1.2,
            mb: 0.15,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: c.textStrong,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {value || "—"}
        </Typography>
      </Box>
    </Box>
  );
}

function SectionHeader({ label, right }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, mt: 0.5 }}>
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          color: c.textDisabled,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "0.5px", background: c.divider }} />
      {right}
    </Box>
  );
}

// Approved (A) AND pending (P) inventory rows both count as delivered —
// only cancelled (C) rows are left out.
const countsAsDelivered = (r) => r.cStatus === "A" || r.cStatus === "P";

// Receipt numbers sort by the digits they carry: "DR-0009" → 9
const receiptNumValue = (str) => {
  const digits = String(str ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : -Infinity;
};

// One flat list of an item's delivery rows, tagged with their option.
const itemDeliveryRows = (item) =>
  (item?.options || []).flatMap((opt) =>
    (opt.deliveredRows || []).map((row) => ({
      ...row,
      uom: opt.uom,
      nPurchaseItemId: opt.nPurchaseItemId,
      nPurchaseOrderId: opt.nPurchaseOrderId,
    })),
  );

// The ids to tick for a given DR. Picking a receipt prints THAT batch and
// nothing else — an item with no rows under the chosen DR gets no checked
// rows and drops out of the print, it never quietly keeps an older batch
// ticked. Only when the data carries no receipt numbers at all (no picker)
// does every item fall back to its own newest batch.
const rowsForDr = (item, dr) => {
  const selectable = itemDeliveryRows(item).filter(countsAsDelivered);
  if (selectable.length === 0) return [];
  if (!dr) {
    const latest = selectable.reduce(
      (max, r) => Math.max(max, receiptNumValue(r.strReceiptNumber)),
      -Infinity,
    );
    return selectable
      .filter((r) => receiptNumValue(r.strReceiptNumber) === latest)
      .map((r) => r.nInventoryId);
  }
  return selectable
    .filter((r) => (r.strReceiptNumber || "").trim() === dr)
    .map((r) => r.nInventoryId);
};

function ItemRow({ item, index, selected, onSelectedChange }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  const [specsOpen, setSpecsOpen] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);
  const hasSpecs =
    item.itemSpecs &&
    item.itemSpecs.trim() &&
    item.itemSpecs.trim() !== "<p></p>";
  const hasOptions = item.options && item.options.length > 0;
  const hasSerials = hasOptions
    ? item.options.some((opt) =>
        (opt.deliveredRows || []).some(
          (row) => (row.serialNumbers || []).filter(Boolean).length > 0,
        ),
      )
    : false;

  const allRows = itemDeliveryRows(item);
  const selectableRows = allRows.filter(countsAsDelivered);

  const [selectError, setSelectError] = useState("");
  const [shakeRowId, setShakeRowId] = useState(null);

  const flagSelectError = (id, message) => {
    setSelectError(message);
    setShakeRowId(id);
    setTimeout(() => {
      setSelectError("");
      setShakeRowId(null);
    }, 3000);
  };

  const allSelected =
    selectableRows.length > 0 && selected.length === selectableRows.length;
  const indeterminate = selected.length > 0 && !allSelected;

  const computeSelectedQty = (ids) =>
    allRows
      .filter((r) => ids.includes(r.nInventoryId) && countsAsDelivered(r))
      .reduce((sum, r) => sum + (r.nQuantity || 0), 0);

  const toggleAll = (e) => {
    e.stopPropagation();
    if (allSelected) {
      onSelectedChange([]);
      return;
    }
    const distinctReceipts = new Set(
      selectableRows.map((r) => r.strReceiptNumber || ""),
    );
    if (distinctReceipts.size > 1 && selected.length === 0) {
      flagSelectError(
        null,
        "Multiple Receipt Numbers found — select a row first to choose which batch to include.",
      );
      return;
    }
    const targetReceipt =
      selected.length > 0
        ? allRows.find((r) => r.nInventoryId === selected[0])
            ?.strReceiptNumber || ""
        : selectableRows[0]?.strReceiptNumber || "";
    onSelectedChange(
      selectableRows
        .filter((r) => (r.strReceiptNumber || "") === targetReceipt)
        .map((r) => r.nInventoryId),
    );
  };

  const toggleOne = (id) => {
    const row = allRows.find((r) => r.nInventoryId === id);
    if (!row || !countsAsDelivered(row)) return;
    const isRemoving = selected.includes(id);
    // One DR prints ONE receipt number — so clicking into a DIFFERENT
    // receipt batch does not error out, it SWITCHES: the clicked receipt's
    // whole batch takes over and the old batch un-ticks. The user picked
    // that receipt ("the OR that should be checked"), not a dead shake.
    if (!isRemoving && selected.length > 0) {
      const existingRow = allRows.find((r) => r.nInventoryId === selected[0]);
      const sameReceipt =
        (row?.strReceiptNumber || "") === (existingRow?.strReceiptNumber || "");
      if (!sameReceipt) {
        onSelectedChange(
          selectableRows
            .filter(
              (r) => (r.strReceiptNumber || "") === (row.strReceiptNumber || ""),
            )
            .map((r) => r.nInventoryId),
        );
        return;
      }
    }
    onSelectedChange(
      isRemoving ? selected.filter((x) => x !== id) : [...selected, id],
    );
  };

  // The ticked rows ARE the printed qty now — fall back to the item's own
  // delivered total only when it has no per-delivery breakdown at all.
  const displayedQty =
    allRows.length > 0 ? computeSelectedQty(selected) : (item.itemQty ?? "—");

  return (
    <Box
      sx={{
        borderBottom: `0.5px solid ${c.rowBorder}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1.5,
          py: 1.1,
          background:
            index % 2 === 0 ? c.rowAltBg : isDark ? "transparent" : c.rowBg,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "5px",
            background: c.badgeBg,
            border: `0.5px solid ${c.badgeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{ fontSize: "0.55rem", fontWeight: 700, color: c.badgeText }}
          >
            {index + 1}
          </Typography>
        </Box>
        <Typography
          sx={{
            flex: 1,
            fontSize: "0.7rem",
            fontWeight: 600,
            color: c.textStrong,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {item.itemName || "—"}
        </Typography>
        <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 60 }}>
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: c.textMed,
              lineHeight: 1.2,
            }}
          >
            {fmtQty(displayedQty)}
          </Typography>
          {item.itemUOM && (
            <Typography
              sx={{
                fontSize: "0.5rem",
                color: c.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              {item.itemUOM}
            </Typography>
          )}
        </Box>
      </Box>

      {(hasSpecs || hasSerials) && (
        <Box
          component="button"
          onClick={() => setSpecsOpen((v) => !v)}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 0.6,
            background: specsOpen ? c.toggleActiveBg : "transparent",
            border: "none",
            borderTop: `0.5px solid ${c.dividerFaint}`,
            cursor: "pointer",
            textAlign: "left",
            "&:hover": { background: c.hoverBg },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.58rem",
              fontWeight: 700,
              color: c.badgeText,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Specifications
          </Typography>
          <ArrowDropDownIcon
            sx={{
              fontSize: "1.1rem",
              color: c.textFaint,
              transform: specsOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Box>
      )}

      {specsOpen && (hasSpecs || hasSerials) && (
        <Box
          sx={{
            background: c.rowAltBg,
            borderTop: `0.5px solid ${c.dividerFaint}`,
          }}
        >
          {hasSpecs && (
            <Box
              sx={{
                px: 2,
                py: 1,
                pl: 3.5,
                fontSize: "0.6rem",
                color: c.textMuted,
                lineHeight: 1.5,
                "& *": { backgroundColor: "transparent !important" },
                "& ul, & ol": { paddingLeft: "1rem", margin: 0 },
                "& p": { margin: 0 },
                wordBreak: "break-word",
              }}
              dangerouslySetInnerHTML={{ __html: item.itemSpecs }}
            />
          )}
          {(() => {
            const checkedRowIds = new Set(selected);
            const allSerials = hasOptions
              ? item.options
                  .flatMap((opt) => opt.deliveredRows || [])
                  .filter((row) => checkedRowIds.has(row.nInventoryId))
                  .flatMap((row) => row.serialNumbers || [])
                  .filter(Boolean)
              : [];
            if (allSerials.length === 0) return null;
            return (
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  pl: 3.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0.5,
                  flexWrap: "wrap",
                  borderTop: hasSpecs
                    ? `0.5px dashed ${c.badgeBorder}`
                    : "none",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    color: c.badgeText,
                    flexShrink: 0,
                    lineHeight: 1.6,
                  }}
                >
                  S/N:
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    color: c.textMed,
                    fontWeight: 500,
                    lineHeight: 1.6,
                    wordBreak: "break-all",
                  }}
                >
                  {allSerials.join(", ")}
                </Typography>
              </Box>
            );
          })()}
        </Box>
      )}

      {hasOptions && (
        <Box
          component="button"
          onClick={() => setQtyOpen((v) => !v)}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 0.6,
            background: qtyOpen ? c.toggleActiveBg : "transparent",
            border: "none",
            borderTop: `0.5px solid ${c.dividerFaint}`,
            cursor: "pointer",
            textAlign: "left",
            "&:hover": { background: c.hoverBg },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.58rem",
              fontWeight: 700,
              color: c.badgeText,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Quantity History
          </Typography>
          <ArrowDropDownIcon
            sx={{
              fontSize: "1.1rem",
              color: c.textFaint,
              transform: qtyOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Box>
      )}

      {qtyOpen && hasOptions && (
        <Box
          sx={{
            borderTop: `0.5px solid ${c.dividerFaint}`,
            background: c.rowAltBg,
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderBottom: `0.5px solid ${c.badgeBorder}`,
            }}
          >
            <Typography
              sx={{
                width: 20,
                flexShrink: 0,
                fontSize: "0.5rem",
                fontWeight: 700,
                color: c.textFaint,
                textAlign: "center",
              }}
            >
              #
            </Typography>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={toggleAll}
              sx={{
                p: 0,
                width: 16,
                height: 16,
                flexShrink: 0,
                color: c.checkboxUnchecked,
                "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                  color: c.checkboxChecked,
                },
                "& .MuiSvgIcon-root": { fontSize: "0.85rem" },
              }}
            />
            <Typography
              sx={{
                minWidth: 70,
                flexShrink: 0,
                fontSize: "0.5rem",
                fontWeight: 700,
                color: c.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Receipt No
            </Typography>
            <Typography
              sx={{
                flex: 1,
                fontSize: "0.5rem",
                fontWeight: 700,
                color: c.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Qty
            </Typography>
            <Typography
              sx={{
                minWidth: 80,
                fontSize: "0.5rem",
                fontWeight: 700,
                color: c.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textAlign: "right",
              }}
            >
              Date
            </Typography>
          </Box>

          {selectError && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                background: c.badgeBg,
                borderBottom: `0.5px solid ${c.badgeBorder}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.56rem",
                  fontWeight: 600,
                  color: c.badgeText,
                }}
              >
                {selectError}
              </Typography>
            </Box>
          )}

          {allRows.length === 0 ? (
            <Box sx={{ px: 1.5, py: 0.75 }}>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: c.textFaint,
                  fontStyle: "italic",
                }}
              >
                No delivery records.
              </Typography>
            </Box>
          ) : (
            allRows.map((row, rowIdx) => {
              const isChecked = selected.includes(row.nInventoryId);
              const rowSerials = (row.serialNumbers || []).filter(Boolean);
              const isDisabledRow = !countsAsDelivered(row);
              return (
                <Box
                  key={row.nInventoryId}
                  sx={{
                    background: isDisabledRow
                      ? c.disabledRowBg
                      : isChecked
                        ? c.checkedRowBg
                        : rowIdx % 2 === 0
                          ? c.rowAltBg
                          : isDark
                            ? "transparent"
                            : c.rowBg,
                    opacity: isDisabledRow ? 0.6 : 1,
                    borderBottom: `0.5px solid ${c.rowBorder}`,
                    "&:last-of-type": { borderBottom: "none" },
                    animation:
                      shakeRowId === row.nInventoryId
                        ? "drRowShake 0.3s ease"
                        : "none",
                  }}
                >
                  <Box
                    onClick={() => {
                      if (!isDisabledRow) toggleOne(row.nInventoryId);
                    }}
                    sx={{
                      px: 1.5,
                      py: 0.55,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      cursor: isDisabledRow ? "default" : "pointer",
                      transition: "background 0.1s",
                    }}
                  >
                    <Typography
                      sx={{
                        width: 20,
                        flexShrink: 0,
                        fontSize: "0.55rem",
                        fontWeight: 600,
                        color: c.textFaint,
                        textAlign: "center",
                      }}
                    >
                      {rowIdx + 1}
                    </Typography>
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      disabled={isDisabledRow}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isDisabledRow) toggleOne(row.nInventoryId);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        p: 0,
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        color: c.checkboxUnchecked,
                        "&.Mui-checked": { color: c.checkboxChecked },
                        "& .MuiSvgIcon-root": { fontSize: "0.85rem" },
                      }}
                    />
                    <Typography
                      sx={{
                        minWidth: 70,
                        flexShrink: 0,
                        fontSize: "0.58rem",
                        fontWeight: 600,
                        color: isChecked ? c.textStrong : c.badgeText,
                        wordBreak: "break-word",
                      }}
                    >
                      {row.strReceiptNumber || "—"}
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 0.4,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: c.textMed,
                          lineHeight: 1.2,
                        }}
                      >
                        {fmtQty(row.nQuantity)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.48rem",
                          color: c.textFaint,
                          textTransform: "uppercase",
                          lineHeight: 1,
                        }}
                      >
                        {row.uom}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        minWidth: 80,
                        fontSize: "0.58rem",
                        color: c.badgeText,
                        textAlign: "right",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.dtLog
                        ? new Date(row.dtLog).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </Typography>
                  </Box>
                  {rowSerials.length > 0 && (
                    <Box
                      sx={{
                        px: 1.5,
                        pb: 0.6,
                        pl: 5.5,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.52rem",
                          fontWeight: 700,
                          color: c.badgeText,
                          flexShrink: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        S/N:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.52rem",
                          color: c.badgeText,
                          fontWeight: 500,
                          lineHeight: 1.5,
                          wordBreak: "break-all",
                        }}
                      >
                        {rowSerials.join(", ")}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}

export default function PrintDeliveryReceiptModal({
  open,
  onClose,
  transaction,
  deliveredOptions = [],
  assignedAOName,
  assignedAONo,
  transactionCode,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  const [selectedDr, setSelectedDr] = useState("");
  const [itemSelections, setItemSelections] = useState({});

  // Every open starts fresh: the pick falls back to the LATEST DR and any
  // manual ticks from the last session are forgotten — a stale selection
  // must not survive the close (the deliveries may have moved on since).
  React.useEffect(() => {
    if (open) {
      setSelectedDr("");
      setItemSelections({});
    }
  }, [open]);

  // Every distinct DR (delivery receipt) number across all delivery rows,
  // newest first.
  const drNumbers = (() => {
    const nums = new Set();
    deliveredOptions.forEach((item) =>
      itemDeliveryRows(item).forEach((row) => {
        const rn = (row.strReceiptNumber || "").trim();
        if (rn) nums.add(rn);
      }),
    );
    return [...nums].sort((a, b) => receiptNumValue(b) - receiptNumValue(a));
  })();
  const latestDr = drNumbers[0] || "";
  // No pick yet (or the data changed under us) → the newest DR.
  const activeDr =
    selectedDr && drNumbers.includes(selectedDr) ? selectedDr : latestDr;

  if (!open || !transaction) return null;

  // Per item: a manual tick set wins, otherwise the rows of the DR chosen
  // on the selector (each item falls back to its own newest batch).
  const itemSelection = (index) =>
    itemSelections[index] ?? rowsForDr(deliveredOptions[index], activeDr);

  // What the printed DR will contain — ONLY the items with checked rows.
  // An item not part of the picked receipt's batch is left out entirely;
  // it must not ride along at qty 0 (or worse, at its older batch's qty).
  const printItems = deliveredOptions
    .map((item, index) => {
      const rows = itemDeliveryRows(item);
      const selectedIds = new Set(itemSelection(index));
      const selectedRows = rows.filter((r) => selectedIds.has(r.nInventoryId));
      const selectedQty = selectedRows.reduce(
        (sum, r) => sum + Number(r.nQuantity || 0),
        0,
      );
      return {
        ...item,
        // No per-delivery breakdown → keep the item's own delivered qty.
        itemQty: rows.length > 0 ? selectedQty : item.itemQty,
        strReceiptNumber: selectedRows[0]?.strReceiptNumber || "",
      };
    })
    .filter((it) => Number(it.itemQty) > 0);

  const handleDrChange = (e) => {
    setSelectedDr(e.target.value);
    setItemSelections({}); // new batch — forget the manual ticks
  };

  const handleRowToggle = (index, ids) =>
    setItemSelections((prev) => ({ ...prev, [index]: ids }));

  const handlePrint = () => {
    const receiptNumber =
      printItems.find((it) => it.strReceiptNumber)?.strReceiptNumber ?? "";
    navigate("/preview-dr", {
      state: {
        transaction,
        deliveredOptions: printItems,
        assignedAOName,
        assignedAONo,
        transactionCode,
        receiptNumber,
      },
    });
  };
  const deliveryInfo =
    transaction?.deliveryInfo || transaction?.delivery_info || null;
  const deliveryDate =
    deliveryInfo?.dtDeliveryDate || transaction?.dtDeliveryDate || null;
  const deliveryAddress =
    deliveryInfo?.strDeliveryAddress || transaction?.strDeliveryAddress || null;
  const deliveryNotes =
    deliveryInfo?.strDeliveryNotes || transaction?.strDeliveryNotes || null;
  const receiverName =
    deliveryInfo?.strReceiverName || transaction?.strReceiverName || null;
  const hasDeliveryDetails =
    deliveryDate || deliveryAddress || receiverName || deliveryNotes;

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Delivery Receipt"
      subTitle={transactionCode ? `${transactionCode}` : ""}
      contentPadding={0}
      showSave={true}
      saveLabel="Print"
      onSave={handlePrint}
      // The picked batch has to have content — an OR whose items all
      // dropped out has nothing to print.
      disabled={printItems.length === 0}
      showCancel={true}
      cancelLabel="Cancel"
      onCancel={onClose}
    >
      <Box sx={{ px: 2.5, py: 1.5 }}>
        {(() => {
          const client = transaction?.client;
          if (!client) return null;
          const name = client.strClientNickName || client.strClientName;
          const tin = client.strTIN;
          const address = client.strAddress;
          const style = client.strBusinessStyle;
          if (!name && !tin && !address && !style) return null;
          return (
            <Box
              sx={{
                borderRadius: "8px",
                border: `0.5px solid ${c.panelBorder}`,
                background: c.panelBg,
                px: 1.5,
                py: 1,
                mb: 2,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 2,
                rowGap: 0,
              }}
            >
              <InfoRow
                icon={ReceiptLongOutlined}
                label="Transaction"
                value={
                  transaction?.strTitle
                    ? `${transactionCode} | ${transaction.strTitle}`
                    : transactionCode
                }
                fullWidth
              />
              {name && (
                <InfoRow
                  icon={PersonOutlined}
                  label="Client"
                  value={name.toUpperCase()}
                />
              )}
              {tin && (
                <InfoRow icon={ReceiptLongOutlined} label="TIN" value={tin} />
              )}
              {address && (
                <InfoRow
                  icon={LocalShippingOutlined}
                  label="Address"
                  value={address}
                />
              )}
              {style && (
                <InfoRow
                  icon={StorefrontOutlined}
                  label="Business Style"
                  value={style}
                />
              )}
              <InfoRow
                icon={PersonOutlined}
                label="Account Officer"
                value={assignedAOName}
                fullWidth
              />
            </Box>
          );
        })()}

        {hasDeliveryDetails && (
          <>
            <SectionHeader label="Delivery Details" />
            <Box
              sx={{
                borderRadius: "8px",
                border: `0.5px solid ${c.panelBorder}`,
                background: c.panelBg,
                px: 1.5,
                py: 1,
                mb: 2,
              }}
            >
              {deliveryDate && (
                <InfoRow
                  icon={CalendarTodayOutlined}
                  label="Delivery Date"
                  value={fmtDate(deliveryDate)}
                />
              )}
              {receiverName && (
                <InfoRow
                  icon={PersonOutlined}
                  label="Receiver"
                  value={receiverName}
                />
              )}
              {deliveryAddress && (
                <InfoRow
                  icon={LocalShippingOutlined}
                  label="Address"
                  value={deliveryAddress}
                />
              )}
              {deliveryNotes && (
                <InfoRow
                  icon={ReceiptLongOutlined}
                  label="Notes"
                  value={deliveryNotes}
                />
              )}
            </Box>
          </>
        )}

        <SectionHeader
          label={`Delivered Items (${deliveredOptions.length})`}
          right={
            drNumbers.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.5rem",
                    fontWeight: 700,
                    color: c.textFaint,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  DR No.
                </Typography>
                <Box
                  component="select"
                  value={activeDr}
                  onChange={handleDrChange}
                  aria-label="DR number"
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    color: c.textMed,
                    background: c.panelBg,
                    border: `0.5px solid ${c.panelBorder}`,
                    borderRadius: "5px",
                    px: 0.75,
                    py: 0.3,
                    cursor: "pointer",
                    outline: "none",
                    maxWidth: 140,
                    "&:hover": { background: c.hoverBg },
                  }}
                >
                  {drNumbers.map((dr) => (
                    <option key={dr} value={dr}>
                      {dr}
                    </option>
                  ))}
                </Box>
              </Box>
            ) : null
          }
        />
        {deliveredOptions.length === 0 ? (
          <Box
            sx={{
              borderRadius: "8px",
              border: `0.5px solid ${c.panelBorder}`,
              background: c.panelBg,
              px: 2,
              py: 3,
              textAlign: "center",
            }}
          >
            <LocalShippingOutlined
              sx={{ fontSize: "1.5rem", color: c.emptyIconColor, mb: 0.5 }}
            />
            <Typography sx={{ fontSize: "0.65rem", color: c.textDisabled }}>
              No delivered items found for this transaction.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              borderRadius: "8px",
              border: `0.5px solid ${c.panelBorder}`,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 100px",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.75,
                background: c.tableHeaderBg,
                borderBottom: `0.5px solid ${c.panelBorder}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.57rem",
                  fontWeight: 700,
                  color: c.textDisabled,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Item / Specifications
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.57rem",
                  fontWeight: 700,
                  color: c.textDisabled,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  textAlign: "right",
                }}
              >
                Qty
              </Typography>
            </Box>
            {deliveredOptions.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                index={i}
                selected={itemSelection(i)}
                onSelectedChange={(ids) => handleRowToggle(i, ids)}
              />
            ))}
          </Box>
        )}
      </Box>
    </ModalContainer>
  );
}
