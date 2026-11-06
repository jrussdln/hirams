import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../../components/layouts/page/content-page";
import BaseButton from "../../../../components/ui/form/BaseButton";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import icons from "../../../../utils/style/iconFormatStyles";
import { Box, Typography, Divider } from "@mui/material";
import ContentHeaderStructure from "../../../../components/ui/structure/ContentHeaderStructure";
import {
  LocalShippingOutlined,
  ReceiptLongOutlined,
  UnfoldMore,
  UnfoldLess,
} from "@mui/icons-material";
import {
  fmtDate,
  fmtQty,
  fmtPHP,
} from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const pickColors = (c) => ({
  divider: c.slate.border,
  dividerFaint: c.slate.divider,
  rowBorder: c.slate.borderRow,
  rowAltBg: c.slate.stripeAltBg,
  rowBg: c.print.paper,
  badgeBg: c.blue.bgSoft,
  badgeBorder: c.blue.border,
  badgeText: c.blue.text,
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

// INFO ROW — the same look as the purchase page's FieldItem
// (TransactionDetails): small caption label with the value under it.
// No icon — this is the print view.
function InfoRow(props) {
  const { label, value, fullWidth = false } = props;
  return (
    <Box
      sx={{
        gridColumn: fullWidth ? "1 / -1" : "auto",
        minWidth: 0,
        py: 0.4,
      }}
    >
      <Typography
        variant="caption"
        component="div"
        sx={{
          fontSize: "0.65rem",
          fontWeight: 600,
          color: "text.secondary",
          letterSpacing: "0.04em",
          lineHeight: 1,
          mb: 0.35,
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        variant="body2"
        sx={{
          color: "text.primary",
          fontSize: "1rem",
          fontWeight: 400,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

// Section headers in the Purchase style (the TransactionDetails header:
// divider above, label, divider below) — but with NO icon, the label row
// is just the uppercase name.
function SectionHeader({ label }) {
  return (
    <>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "text.secondary",
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1.75 }} />
    </>
  );
}

const SI_GRID = "28px 1fr 70px 100px 110px 90px";
// Table body scrolls past this height. TABLE_OFFSET = header card + tabs + footer.
const TABLE_OFFSET = 380;
const tableMaxHeight = (extra = 0) =>
  `max(240px, calc(100vh - ${TABLE_OFFSET + extra}px))`;
// Expanded section — shared by the DR and SI tables
function ExpandedSpecs({ specs, serials = [], c }) {
  const hasSpecs = !!specs && specs.trim() && specs.trim() !== "<p></p>";
  const hasSerials = serials.length > 0;

  return (
    <>
      {/* header strip */}
      <Box
        sx={{
          px: 2,
          pl: 5,
          py: 0.4,
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          background: c.badgeBg,
          borderTop: `0.5px solid ${c.dividerFaint}`,
          borderBottom: `0.5px solid ${c.badgeBorder}`,
        }}
      >
        <Typography
          sx={{
            width: "100%",
            textAlign: "left",
            fontSize: "0.55rem",
            fontWeight: 700,
            color: c.badgeText,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Specifications
        </Typography>
      </Box>

      {/* specs body — max height, scrolls when long */}
      {hasSpecs && (
        <Box
          sx={{
            px: 2,
            py: 1,
            pl: 5,
            background: c.badgeBg,
            fontSize: "0.6rem",
            color: c.textMuted,
            lineHeight: 1.5,
            maxHeight: 140,
            overflowY: "auto",
            wordBreak: "break-word",
            "& *": { backgroundColor: "transparent !important" },
            "& ul, & ol": { paddingLeft: "1rem", margin: 0 },
            "& p": { margin: 0 },
          }}
          dangerouslySetInnerHTML={{ __html: specs }}
        />
      )}

      {/* S/N line */}
      {hasSerials && (
        <Box
          sx={{
            px: 2,
            py: 0.75,
            pl: 5,
            background: c.badgeBg,
            borderTop: hasSpecs ? `0.5px dashed ${c.badgeBorder}` : "none",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 600,
              color: c.textMuted,
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            S/N: {serials.map((sn) => `#${sn}`).join(", ")}
          </Typography>
        </Box>
      )}
    </>
  );
}
function SalesInvoiceRow({ item, i, isLast, isDark, c, signal }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (signal && signal.tick > 0) setOpen(signal.value);
  }, [signal?.tick]);
  const hasSpecs =
    item.itemSpecs &&
    item.itemSpecs.trim() &&
    item.itemSpecs.trim() !== "<p></p>";

  // Serial numbers — adjust the field here if SI items store them elsewhere
  const serials = [
    ...new Set(
      [
        ...(Array.isArray(item.serialNumbers) ? item.serialNumbers : []),
        ...(item.options || []).flatMap((opt) =>
          (opt.deliveredRows || []).flatMap((row) => row.serialNumbers || []),
        ),
      ]
        .filter(Boolean)
        .map((sn) => String(sn).trim().replace(/^#/, "")),
    ),
  ];
  const hasSerials = serials.length > 0;
  const hasContent = hasSpecs || hasSerials;
  return (
    <Box
      sx={{
        borderBottom: isLast ? "none" : `0.5px solid ${c.rowBorder}`,
      }}
    >
      <Box
        onClick={hasContent ? () => setOpen((v) => !v) : undefined}
        sx={{
          display: "grid",
          gridTemplateColumns: SI_GRID,
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.1,
          background:
            i % 2 === 0 ? c.rowAltBg : isDark ? "transparent" : c.rowBg,
          cursor: hasContent ? "pointer" : "default",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.58rem",
            fontWeight: 600,
            color: c.textFaint,
            textAlign: "center",
          }}
        >
          {i + 1}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: c.textStrong,
            lineHeight: 1.3,
            wordBreak: "break-word",
            minWidth: 0,
          }}
        >
          {item.itemName || "—"}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: c.textMed,
            textAlign: "right",
          }}
        >
          {item.itemQty != null ? fmtQty(item.itemQty) : "—"}
        </Typography>
        <Typography
          sx={{ fontSize: "0.7rem", color: c.textMed, textAlign: "right" }}
        >
          {fmtPHP(item.unitPrice)}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: c.textStrong,
            textAlign: "right",
          }}
        >
          {fmtPHP(item.totalPrice)}
        </Typography>

        {hasContent ? (
          <Box
            component="button"
            aria-expanded={open}
            title={open ? "Collapse specifications" : "Expand specifications"}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: open ? c.badgeBg : "transparent",
              border: `0.5px solid ${c.badgeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              p: 0,
              justifySelf: "end",
              "&:hover": { background: c.badgeBg },
            }}
          >
            <ArrowDropDownIcon
              sx={{
                fontSize: "1rem",
                color: open ? c.badgeText : c.textFaint,
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </Box>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Typography sx={{ fontSize: "0.65rem", color: c.textFaint }}>
              —
            </Typography>
          </Box>
        )}
      </Box>
      {open && hasContent && (
        <ExpandedSpecs
          specs={hasSpecs ? item.itemSpecs : ""}
          serials={serials}
          c={c}
        />
      )}
    </Box>
  );
}
function SalesInvoiceTable({ items, signal }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => pickColors(base), [base]);

  if (!items || items.length === 0) {
    return (
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
          No invoiceable items found for this transaction.
        </Typography>
      </Box>
    );
  }

  const grandTotal = items.reduce(
    (sum, i) => sum + Number(i.totalPrice || 0),
    0,
  );

  const headCell = (label, align = "left") => (
    <Typography
      sx={{
        fontSize: "0.57rem",
        fontWeight: 700,
        color: c.textDisabled,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        textAlign: align,
      }}
    >
      {label}
    </Typography>
  );

  return (
    <Box
      sx={{
        borderRadius: "8px",
        border: `0.5px solid ${c.panelBorder}`,
        overflow: "hidden",
      }}
    >
      <Box sx={{ maxHeight: tableMaxHeight(), overflowY: "auto" }}>
        {/* header — stays pinned while rows scroll */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: SI_GRID,
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            background: c.tableHeaderBg,
            borderBottom: `0.5px solid ${c.panelBorder}`,
          }}
        >
          {headCell("#", "center")}
          {headCell("Item")}
          {headCell("Qty", "right")}
          {headCell("Unit Price", "right")}
          {headCell("Total", "right")}
          {headCell("Action", "right")}
        </Box>

        {items.map((item, i) => (
          <SalesInvoiceRow
            key={i}
            item={item}
            i={i}
            isLast={i === items.length - 1}
            isDark={isDark}
            c={c}
            signal={signal}
          />
        ))}
      </Box>

      {/* grand total — outside the scroll area, always visible */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.9,
          background: c.tableHeaderBg,
          borderTop: `0.5px solid ${c.panelBorder}`,
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
          Grand Total
        </Typography>
        <Typography
          sx={{ fontSize: "0.78rem", fontWeight: 800, color: c.textStrong }}
        >
          {fmtPHP(grandTotal)}
        </Typography>
      </Box>
    </Box>
  );
}
// Sales Invoice table component
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

function ItemRow({ item, index, selected, signal }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => pickColors(base), [base]);

  // SPECIFICATIONS — uncollapsed only by this row's Action toggle; the
  // old full-width "Specifications" and "Quantity History" blocks are
  // gone. The row's ids are the receipt batch the DR No. picker chose.
  const [specsOpen, setSpecsOpen] = useState(false);
  useEffect(() => {
    if (signal && signal.tick > 0) setSpecsOpen(signal.value);
  }, [signal?.tick]);
  const hasSpecs =
    item.itemSpecs &&
    item.itemSpecs.trim() &&
    item.itemSpecs.trim() !== "<p></p>";
  const hasOptions = item.options && item.options.length > 0;
  const selectedSerials = [
    ...new Set(
      (hasOptions
        ? item.options
            .flatMap((opt) => opt.deliveredRows || [])
            .filter((row) => new Set(selected).has(row.nInventoryId))
            .flatMap((row) => row.serialNumbers || [])
        : []
      )
        .filter(Boolean)
        .map((sn) => String(sn).trim().replace(/^#/, "")),
    ),
  ];
  const hasSerials = selectedSerials.length > 0;
  const hasContent = hasSpecs || hasSerials;

  const allRows = itemDeliveryRows(item);
  const computeSelectedQty = (ids) =>
    allRows
      .filter((r) => ids.includes(r.nInventoryId) && countsAsDelivered(r))
      .reduce((sum, r) => sum + (r.nQuantity || 0), 0);

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
        onClick={hasContent ? () => setSpecsOpen((v) => !v) : undefined}
        sx={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 100px 90px",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.1,
          background:
            index % 2 === 0 ? c.rowAltBg : isDark ? "transparent" : c.rowBg,
          cursor: hasContent ? "pointer" : "default",
        }}
      >
        {/* # — plain row number, no border or chip */}
        <Typography
          sx={{
            fontSize: "0.58rem",
            fontWeight: 600,
            color: c.textFaint,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: c.textStrong,
            lineHeight: 1.3,
            wordBreak: "break-word",
            minWidth: 0,
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

        {/* ── ACTION — uncollapses this item's Specifications ── */}
        {hasContent ? (
          <Box
            component="button"
            aria-expanded={specsOpen}
            title={
              specsOpen ? "Collapse specifications" : "Expand specifications"
            }
            onClick={(e) => {
              e.stopPropagation();
              setSpecsOpen((v) => !v);
            }}
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: specsOpen ? c.badgeBg : "transparent",
              border: `0.5px solid ${c.badgeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              p: 0,
              justifySelf: "end",
              "&:hover": { background: c.badgeBg },
            }}
          >
            <ArrowDropDownIcon
              sx={{
                fontSize: "1rem",
                color: specsOpen ? c.badgeText : c.textFaint,
                transform: specsOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </Box>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Typography sx={{ fontSize: "0.65rem", color: c.textFaint }}>
              —
            </Typography>
          </Box>
        )}
      </Box>

      {specsOpen && hasContent && (
        <ExpandedSpecs
          specs={hasSpecs ? item.itemSpecs : ""}
          serials={selectedSerials}
          c={c}
        />
      )}
    </Box>
  );
}

/**
 * THE PRINT DR WORKSPACE — a page, not a modal.
 *
 * Mounted only while the user is printing the Delivery Receipt
 * (PurchaseView swaps its whole page away): the transaction's workspace
 * is hidden and THIS panel owns the window, with its own footer
 * — Back (returns to the workspace) and Print (opens the DR preview).
 */
export default function DRPanel({
  transaction,
  transactionCode,
  deliveredOptions = [],
  assignedAOName,
  assignedAONo,
  salesInvoiceItems = [],
  totalPurchaseProgress = 0,
  onClose,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => pickColors(base), [base]);

  const siReady = totalPurchaseProgress === 100 && salesInvoiceItems.length > 0;

  const [selectedDr, setSelectedDr] = useState("");
  const [activeTab, setActiveTab] = useState("dr");
  // expand / collapse all — rows listen to this signal
  const [allOpen, setAllOpen] = useState(false);
  const [signal, setSignal] = useState({ value: false, tick: 0 });

  const handleToggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);
    setSignal((s) => ({ value: next, tick: s.tick + 1 }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAllOpen(false);
    setSignal({ value: false, tick: 0 });
  };
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

  // Per item: the rows of the DR chosen on the selector — the DR No.
  // picker owns the batch now; there is no per-row ticking anymore.
  const itemSelection = (index) => rowsForDr(deliveredOptions[index], activeDr);

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

  // TABLE ROWS — same rule as the print list: an item whose picked-batch
  // qty is 0 isn't shown at all, and the row numbering stays sequential.
  const displayRows = deliveredOptions
    .map((item, index) => {
      const rows = itemDeliveryRows(item);
      const selectedIds = itemSelection(index);
      const selectedRows = rows.filter(
        (r) => selectedIds.includes(r.nInventoryId) && countsAsDelivered(r),
      );
      const batchQty =
        rows.length > 0
          ? selectedRows.reduce((sum, r) => sum + Number(r.nQuantity || 0), 0)
          : item.itemQty;
      return { item, index, selectedIds, batchQty };
    })
    .filter((d) => Number(d.batchQty) > 0)
    .map((d, i) => ({ ...d, index: i }));

  const handleDrChange = (e) => {
    // The DR No. picker switches the whole batch.
    setSelectedDr(e.target.value);
  };

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

  const handlePrintSi = () => {
    navigate("/preview-si", {
      state: {
        transaction,
        invoiceItems: salesInvoiceItems,
        assignedAOName,
        assignedAONo,
        transactionCode,
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

  // Height taken by the Delivery Details block above the DR table
  const deliveryFieldCount = [
    deliveryDate,
    receiverName,
    deliveryAddress,
    deliveryNotes,
  ].filter(Boolean).length;
  const deliveryExtra = hasDeliveryDetails ? 90 + deliveryFieldCount * 46 : 0;
  return (
    <PageLayout
      title="Delivery Receipt / Sales Invoice"
      subtitle={transactionCode ? `${transactionCode}` : ""}
      footerLActions={
        <BaseButton
          label="Back"
          icon={icons.back}
          onClick={onClose}
          actionColor="back"
        />
      }
      // The picked batch has to have content — an OR whose items all
      // dropped out has nothing to print.
      footerRActions={
        <BaseButton
          label={activeTab === "dr" ? "Preview DR" : "Preview SI"}
          icon={icons.print}
          onClick={
            activeTab === "dr"
              ? handlePrint
              : handlePrintSi
          }
          actionColor="save"
          disabled={printItems.length === 0}
          tooltip={
            printItems.length === 0
              ? "Nothing to print — no delivered rows picked"
              : ""
          }
        />
      }
    >
      {/* No extra padding here — the page layout already pads its content
          area, and the purchase page content (TransactionDetails, the
          items table) sits directly in it. The old px/py was the modal
          frame's leftover and made this panel look inset. */}
      <Box>
        {/* TRANSACTION HEADER — one ContentHeaderStructure shell, two
            columns. LEFT: the transaction identity (code, client +
            Business Style pill, TIN, Address). RIGHT: a receipt summary
            card for the pickup and the DR No. picker right under it. */}
        {(() => {
          const client = transaction?.client;
          const name = client?.strClientNickName || client?.strClientName;
          const tin = client?.strTIN;
          const address = client?.strAddress;
          const aoNickname =
            transaction?.user?.strNickName?.toUpperCase() || "—";
          const style = client?.strBusinessStyle;
          // CURRENT-RECEIPT STATS — every delivered row (approved or
          // pending) carrying the picked DR number, across all items.
          const receiptRows = activeDr
            ? deliveredOptions
                .flatMap((it) => itemDeliveryRows(it))
                .filter(
                  (r) =>
                    countsAsDelivered(r) &&
                    (r.strReceiptNumber || "").trim() === activeDr,
                )
            : [];
          const receiptQty = receiptRows.reduce(
            (sum, r) => sum + Number(r.nQuantity || 0),
            0,
          );
          const receiptDate = receiptRows.reduce((max, r) => {
            const t = r.dtLog ? new Date(r.dtLog).getTime() : 0;
            return t > max ? t : max;
          }, 0);
          return (
            <ContentHeaderStructure p={1.5} mb={1.5} textAlign="left">
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                {/* ── LEFT — transaction identity ─────────────────────── */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: c.textMuted,
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    {transactionCode || "—"}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                      mt: 0.3,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: c.textStrong,
                        textTransform: "uppercase",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </Typography>
                    {style && (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 0.8,
                          py: "2px",
                          borderRadius: "50px",
                          background: c.badgeBg,
                          border: `0.5px solid ${c.badgeBorder}`,
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: c.badgeText,
                            textTransform: "uppercase",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {style}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {tin && (
                    <>
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 600,
                          color: c.textMuted,
                          textTransform: "uppercase",
                          lineHeight: 1,
                          mt: 0.7,
                        }}
                      >
                        TIN
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: c.textStrong,
                          lineHeight: 1.2,
                          mt: 0.15,
                        }}
                      >
                        {tin}
                      </Typography>
                    </>
                  )}

                  {address && (
                    <>
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 600,
                          color: c.textMuted,
                          textTransform: "uppercase",
                          lineHeight: 1,
                          mt: 0.7,
                        }}
                      >
                        Address
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: c.textStrong,
                          lineHeight: 1.2,
                          mt: 0.15,
                          wordBreak: "break-word",
                          textTransform: "uppercase",
                        }}
                      >
                        {address}
                      </Typography>
                    </>
                  )}

                  {aoNickname && (
                    <Typography
                      sx={{
                        fontSize: "0.55rem",
                        fontWeight: 600,
                        color: c.textMuted,
                        textTransform: "uppercase",
                        lineHeight: 1,
                        mt: 0.7,
                      }}
                    >
                      AO: {aoNickname}
                    </Typography>
                  )}
                </Box>

                {/* ── RIGHT — current receipt card + DR No. picker ────── */}
                {activeTab === "dr" && drNumbers.length > 0 && (
                  <Box
                    sx={{
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.6,
                      width: 185,
                    }}
                  >
                    <Box
                      sx={{
                        borderRadius: "8px",
                        border: `0.5px solid ${c.panelBorder}`,
                        background: c.rowBg,
                        px: 1.25,
                        py: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <ReceiptLongOutlined
                          sx={{ fontSize: 11, color: c.badgeText }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.52rem",
                            fontWeight: 700,
                            color: c.badgeText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            lineHeight: 1,
                          }}
                        >
                          Current Receipt
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: c.textStrong,
                          lineHeight: 1.1,
                          mt: 0.3,
                          wordBreak: "break-all",
                        }}
                      >
                        {activeDr}
                      </Typography>
                      <Box
                        sx={{
                          height: "0.5px",
                          background: c.panelBorder,
                          mt: 0.6,
                          mb: 0.5,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          color: c.textMuted,
                          lineHeight: 1.2,
                        }}
                      >
                        {receiptDate
                          ? new Date(receiptDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "No logged delivery"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          color: c.textMuted,
                          lineHeight: 1.2,
                          mt: 0.15,
                        }}
                      >
                        {receiptRows.length} row
                        {receiptRows.length === 1 ? "" : "s"} ·{" "}
                        {fmtQty(receiptQty)} total qty
                      </Typography>
                    </Box>

                    {/* DR No. — switch the receipt batch */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
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
                          flexShrink: 0,
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
                          flex: 1,
                          minWidth: 0,
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color: c.textMed,
                          background: c.panelBg,
                          border: `0.5px solid ${c.panelBorder}`,
                          borderRadius: "5px",
                          px: 0.75,
                          py: 0.8,
                          cursor: "pointer",
                          outline: "none",
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
                  </Box>
                )}
              </Box>
            </ContentHeaderStructure>
          );
        })()}

        {/* TAB SELECTION */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            borderBottom: `1px solid ${c.divider}`,
            mb: 2,
          }}
        >
          {["dr", "si"].map((tab) => (
            <Box
              key={tab}
              onClick={() => handleTabChange(tab)}
              sx={{
                px: 2,
                py: 1,
                cursor: "pointer",
                borderBottom:
                  activeTab === tab
                    ? `2px solid ${c.badgeBorder}`
                    : "2px solid transparent",
                color: activeTab === tab ? c.textStrong : c.textMuted,
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              {tab === "dr" ? (
                "Delivery Receipt"
              ) : (
                <>
                  Sales Invoice
                  {!siReady && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        ml: 0.5,
                        px: 0.6,
                        py: "1px",
                        borderRadius: "50px",
                        background: c.badgeBg,
                        border: `0.5px solid ${c.badgeBorder}`,
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.55rem",
                          fontWeight: 600,
                          color: c.badgeText,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        NOT AVAILABLE
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          ))}

          {/* expand / collapse all */}
          <Box
            component="button"
            onClick={handleToggleAll}
            title={
              allOpen
                ? "Collapse all specifications"
                : "Expand all specifications"
            }
            sx={{
              ml: "auto",
              mb: "2px",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.4,
              borderRadius: "6px",
              background: allOpen ? c.badgeBg : "transparent",
              border: `0.5px solid ${c.badgeBorder}`,
              color: allOpen ? c.badgeText : c.textMuted,
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              "&:hover": { background: c.badgeBg },
            }}
          >
            {allOpen ? (
              <UnfoldLess sx={{ fontSize: "0.9rem" }} />
            ) : (
              <UnfoldMore sx={{ fontSize: "0.9rem" }} />
            )}
            {allOpen ? "Collapse all" : "Expand all"}
          </Box>
        </Box>
        {activeTab === "si" ? (
          <SalesInvoiceTable items={salesInvoiceItems} signal={signal} />
        ) : (
          <>
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
                      label="Delivery Date"
                      value={fmtDate(deliveryDate)}
                    />
                  )}
                  {receiverName && (
                    <InfoRow label="Receiver" value={receiverName} />
                  )}
                  {deliveryAddress && (
                    <InfoRow label="Address" value={deliveryAddress} />
                  )}
                  {deliveryNotes && (
                    <InfoRow label="Notes" value={deliveryNotes} />
                  )}
                </Box>
              </>
            )}

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
                    maxHeight: tableMaxHeight(deliveryExtra),
                    overflowY: "auto",
                  }}
                >
                  {/* header — pinned while rows scroll */}
                  <Box
                    sx={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 100px 90px",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      background: c.tableHeaderBg,
                      borderBottom: `0.5px solid ${c.panelBorder}`,
                    }}
                  >
                    {[
                      ["#", "center"],
                      ["Item", "left"],
                      ["Qty", "right"],
                      ["Action", "right"],
                    ].map(([label, align]) => (
                      <Typography
                        key={label}
                        sx={{
                          fontSize: "0.57rem",
                          fontWeight: 700,
                          color: c.textDisabled,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          textAlign: align,
                        }}
                      >
                        {label}
                      </Typography>
                    ))}
                  </Box>

                  {displayRows.map(({ item, index, selectedIds }) => (
                    <ItemRow
                      key={index}
                      item={item}
                      index={index}
                      selected={selectedIds}
                      signal={signal}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </PageLayout>
  );
}
