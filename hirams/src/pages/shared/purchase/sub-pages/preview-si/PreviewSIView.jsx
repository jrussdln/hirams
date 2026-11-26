import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";
import PrintPreview from "../../../../../components/ui/print-preview/PrintPreview.jsx";
import PreviewFormOverlay from "../../../../../components/ui/print-preview/PreviewFormOverlay.jsx";
import { getPrintLayoutProps } from "../../../../../constants/defaultPrintLayout.js";
import PrintPreviewPageFooter from "../../../../../components/ui/print-preview/PrintPreviewPageFooter.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";

// Body ink of the printed document. Read once at module scope: it is PAPER,
// so it is the same colour in both themes (print.ink).
const DOC_INK = getThemeColors(false).print.ink;
import { fmtPHP, fmtQty } from "../../../../../utils/formatters/formatter.js";

const cellSx = {
  border: "none",
  px: 1,
  py: 0.3,
  fontSize: "0.85rem",
  verticalAlign: "top",
  color: DOC_INK,
  fontFamily: "Calibri, Arial, sans-serif",
};

// Specs/serials are secondary lines — smaller ink and tighter leading than
// the main item row (same as the DR preview).
const specLineCellSx = {
  ...cellSx,
  fontSize: "0.7rem",
  lineHeight: 1.1,
  py: 0.1,
};

// ---- ADJUST THIS to move the whole Client Info block (Name/TIN/Address/Style) ----
const CLIENT_INFO_BLOCK_OFFSET = {
  top: 82,
  bottom: 0,
  left: 48,
  right: 0,
};

// ---- ADJUST THIS: HiRams' client block sits higher on its pre-printed form ----
// Space above the client nickname. Lower = closer to the top.
const HIRAMS_CLIENT_INFO_BLOCK_OFFSET = { top: 18 };

// ---- ADJUST THIS: space below the 2nd guide line before HiRams' totals ----
const HIRAMS_TOTALS_TOP_GAP = 20;

// A little more breathing room between the first three totals, and a larger
// drop before the final total, on HiRams' form.
const HIRAMS_TOTALS_LINE_GAP = 4;
const HIRAMS_LAST_TOTAL_GAP = 63;

// ---- ADJUST THIS for extra spacing on each individual line inside the block ----
const CLIENT_INFO_LINE_PADDING = {
  top: 10,
  bottom: 0,
  left: 0,
  right: 0,
};

// ---- ADJUST THIS to move the whole AO row (Contact Person / Number / Code) ----
const AO_ROW_OFFSET = {
  top: 35,
  bottom: 0,
  left: 195,
  right: 160,
};

// ---- ADJUST THIS to move the Qty / UOM / Name / Unit Price / Total row ----
const ITEM_ROW_OFFSET = {
  top: 10,
  bottom: 0,
  left: -50,
  right: -24,
};

// ---- These define the qty/UOM column widths so specs & serials line up with the item name ----
const ITEM_COLUMNS = {
  qtyWidth: 40,
  uomWidth: 60,
  unitPriceWidth: 70,
  totalPriceWidth: 80,
  gap: 8,
};

// HiRams' pre-printed form has a wider QUANTITY column, so its qty number
// sits further right. Only the item name and specs shift right by the row
// shift; Quantity and UOM keep their positions.
const HIRAMS_QTY_WIDTH = 64;
const HIRAMS_ITEM_ROW_LEFT_SHIFT = 30;
// Total horizontal space the name is indented by, within the item row.
const NAME_INDENT =
  ITEM_COLUMNS.qtyWidth +
  ITEM_COLUMNS.gap +
  ITEM_COLUMNS.uomWidth +
  ITEM_COLUMNS.gap;

// ---- ADJUST THIS to move the footer block (Grand Total + signature lines) ----
// Footer is pinned to the bottom of the printed page automatically via
// position: "absolute" on FOOTER_WRAPPER_SX below — these offsets just
// nudge it from that pinned position.
const FOOTER_OFFSET = {
  bottom: 24, // distance from the bottom edge of the page
  left: 32,
  right: 8,
};

// ---- ADJUST THIS to set the page's minimum height, so the footer stays pinned
// to the bottom of the page even when there are only a few items ----
const PAGE_MIN_HEIGHT = 890; // ~A4 height in px at 96dpi; use ~1056 for Letter size

const clientInfoCellSx = {
  ...cellSx,
  paddingTop: CLIENT_INFO_LINE_PADDING.top,
  paddingBottom: CLIENT_INFO_LINE_PADDING.bottom,
  paddingLeft: CLIENT_INFO_LINE_PADDING.left,
  paddingRight: CLIENT_INFO_LINE_PADDING.right,
};

// HiRams' SOLD TO box uses tighter line spacing. Padding (not a negative
// margin) keeps ADDRESS and TIN in sequence instead of stacking on each other.
const hiramsSubLineCellSx = {
  ...clientInfoCellSx,
  paddingTop: 0,
};

const clientInfoBlockWrapperSx = {
  marginTop: CLIENT_INFO_BLOCK_OFFSET.top,
  marginBottom: CLIENT_INFO_BLOCK_OFFSET.bottom,
  marginLeft: CLIENT_INFO_BLOCK_OFFSET.left,
  marginRight: CLIENT_INFO_BLOCK_OFFSET.right,
};

const hiramsClientInfoBlockWrapperSx = {
  ...clientInfoBlockWrapperSx,
  marginTop: HIRAMS_CLIENT_INFO_BLOCK_OFFSET.top,
};

const aoRowWrapperSx = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginTop: AO_ROW_OFFSET.top,
  marginBottom: AO_ROW_OFFSET.bottom,
  marginLeft: AO_ROW_OFFSET.left,
  marginRight: AO_ROW_OFFSET.right,
};

const itemRowWrapperSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: ITEM_COLUMNS.gap,
  marginTop: ITEM_ROW_OFFSET.top,
  marginBottom: ITEM_ROW_OFFSET.bottom,
  marginLeft: ITEM_ROW_OFFSET.left,
  marginRight: ITEM_ROW_OFFSET.right,
};

// Specs/serials share the same left offset as the item row, plus the
// name's indent, so their text starts directly under the item name.
const itemSubLineWrapperSx = {
  display: "flex",
  alignItems: "flex-start",
  marginLeft: ITEM_ROW_OFFSET.left,
  marginRight: ITEM_ROW_OFFSET.right,
};

const itemSubLineSpacerSx = {
  flexShrink: 0,
  width: NAME_INDENT,
};

// The page container needs position: relative so the footer (position:
// absolute) anchors to the printed page instead of the viewport, and a
// real minHeight (not "100%") so the footer stays pinned to the true
// bottom of the page even when there's only 1-2 items.
const PAGE_CONTAINER_SX = {
  padding: "24px 32px",
  boxSizing: "border-box",
  position: "relative",
  minHeight: PAGE_MIN_HEIGHT,
};

// In band mode the non-paged header uses a plain wrapper (no min-height) and
// the item rows get only horizontal padding inside the guide band.
const HEADER_WRAPPER_SX = { padding: "24px 32px", boxSizing: "border-box" };
const PAGED_WRAPPER_SX = { padding: "0 32px", boxSizing: "border-box" };

const FOOTER_WRAPPER_SX = {
  marginTop: 4,
  marginLeft: FOOTER_OFFSET.left,
  marginRight: FOOTER_OFFSET.right,
  fontFamily: "Calibri, Arial, sans-serif",
  fontSize: "0.8rem",
  color: DOC_INK,
};

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const COLGROUP = (
  <colgroup>
    <col style={{ width: "10%" }} />
    <col style={{ width: "40%" }} />
    <col style={{ width: "16%" }} />
    <col style={{ width: "17%" }} />
    <col style={{ width: "17%" }} />
  </colgroup>
);

function Footer({ grandTotal, isHirams = false }) {
  const vatAmount = (grandTotal / 1.12) * 0.12;
  const netOfVat = grandTotal / 1.12;
  const sum = vatAmount + netOfVat;

  return (
    <div style={FOOTER_WRAPPER_SX}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: isHirams ? HIRAMS_TOTALS_LINE_GAP : 1,
        }}
      >
        <div style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>
          {fmtPHP(grandTotal)}
        </div>
        <div style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>
          {fmtPHP(vatAmount)}
        </div>
        <div style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>
          {fmtPHP(netOfVat)}
        </div>

        <div style={{ height: isHirams ? HIRAMS_LAST_TOTAL_GAP : 50 }} />

        <div style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>
          {fmtPHP(sum)}
        </div>
      </div>
    </div>
  );
}

// Per-page subtotal line. The amount sits in the same right-aligned column as
// the item total amounts (the footer wrapper already matches that right edge).
const SUBTOTAL_LINE_SX = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-end",
  gap: 8,
  marginRight: 30,
  fontFamily: "Calibri, Arial, sans-serif",
  fontSize: "0.8rem",
  color: DOC_INK,
};

function SubtotalLine({ pageNumber, amount }) {
  return (
    <div style={SUBTOTAL_LINE_SX}>
      <div>{`Sub-Total Page ${pageNumber}`}</div>
      <div
        style={{
          width: ITEM_COLUMNS.totalPriceWidth,
          textAlign: "right",
          fontWeight: 800,
          transform: "translateX(20px)",
        }}
      >
        {fmtPHP(amount)}
      </div>
    </div>
  );
}

function SubtotalsList({ subtotals = [] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
      }}
    >
      {subtotals.map((amount, i) => (
        <SubtotalLine key={i} pageNumber={i + 1} amount={amount} />
      ))}
    </div>
  );
}

export default function PreviewSIView({
  clientName,
  clientTIN,
  clientAddress,
  clientBusinessStyle,
  isHirams,
  contactPerson,
  contactNumber,
  code,
  items,
  grandTotal,
  companyId,
  pdfFileName,
}) {
  const navigate = useNavigate();
  const [printControls, setPrintControls] = React.useState(null);

  const layoutProps = getPrintLayoutProps("SI", companyId);
  const banded = Boolean(layoutProps.contentWindowMm);

  // HiRams item layout: quantity/UOM stay where they were fixed; only the
  // item name and its spec/serial lines shift right together.
  const qtyWidth = isHirams ? HIRAMS_QTY_WIDTH : ITEM_COLUMNS.qtyWidth;
  const qtyBoxWidth = isHirams ? qtyWidth - HIRAMS_ITEM_ROW_LEFT_SHIFT : qtyWidth;
  const nameShift = isHirams ? HIRAMS_ITEM_ROW_LEFT_SHIFT : 0;
  const rowLeft =
    ITEM_ROW_OFFSET.left + (isHirams ? HIRAMS_ITEM_ROW_LEFT_SHIFT : 0);
  const itemRowSx = { ...itemRowWrapperSx, marginLeft: rowLeft };
  const nameIndent =
    qtyWidth + ITEM_COLUMNS.gap + ITEM_COLUMNS.uomWidth + ITEM_COLUMNS.gap;
  const subLineWrapperSx = {
    ...itemSubLineWrapperSx,
    marginLeft: rowLeft,
  };
  const subLineSpacerSx = { ...itemSubLineSpacerSx, width: nameIndent };

  // Four grand-total amounts. On HiRams' form the block sits below the 2nd
  // guide line, so it gets extra breathing room from that line.
  const renderTotals = () => (
    <div style={isHirams ? { marginTop: HIRAMS_TOTALS_TOP_GAP } : undefined}>
      <Footer grandTotal={grandTotal} isHirams={isHirams} />
    </div>
  );

  // Below the guide: each non-final page shows only its own subtotal; the
  // final page keeps the four grand-total amounts unchanged.
  const renderBandFooter = ({ pageIndex, totalPages, subtotals }) => {
    if (pageIndex === null || pageIndex === undefined || totalPages <= 1) {
      return renderTotals();
    }
    if (pageIndex < totalPages - 1) {
      return (
        <SubtotalLine
          pageNumber={pageIndex + 1}
          amount={subtotals[pageIndex] ?? 0}
        />
      );
    }
    return renderTotals();
  };

  // Just above the guide on the final page: every page's subtotal, listed.
  const renderBandTopFooter = ({ pageIndex, totalPages, subtotals }) => {
    if (totalPages <= 1 || pageIndex !== totalPages - 1) return null;
    return <SubtotalsList subtotals={subtotals} />;
  };

  // Client info / contact row stay in normal flow above the guide band.
  const headerRows = (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        <tr style={{ height: 22 }}>
          <td colSpan={5} style={cellSx}>
            <div
              style={
                isHirams
                  ? hiramsClientInfoBlockWrapperSx
                  : clientInfoBlockWrapperSx
              }
            >
              <div style={clientInfoCellSx}>{clientName}</div>
              {isHirams ? (
                <>
                  {clientAddress && (
                    <div style={hiramsSubLineCellSx}>{clientAddress}</div>
                  )}
                  {clientTIN && (
                    <div style={hiramsSubLineCellSx}>{clientTIN}</div>
                  )}
                </>
              ) : (
                <>
                  {clientTIN && (
                    <div style={clientInfoCellSx}>{clientTIN}</div>
                  )}
                  {clientAddress && (
                    <div style={clientInfoCellSx}>{clientAddress}</div>
                  )}
                </>
              )}
              {!isHirams && (
                <div style={clientInfoCellSx}>{clientBusinessStyle}</div>
              )}
            </div>
          </td>
        </tr>

        <tr style={{ height: 30 }}>
          <td colSpan={5} style={cellSx} />
        </tr>

        {!isHirams && (
          <tr style={{ height: 22 }}>
            <td colSpan={5} style={cellSx}>
              <div style={aoRowWrapperSx}>
                <div style={{ fontWeight: 600 }}>{contactPerson}</div>
                <div>{contactNumber}</div>
                <div style={{ textAlign: "right" }}>{code}</div>
              </div>
            </td>
          </tr>
        )}

        <tr style={{ height: 20 }}>
          <td colSpan={5} style={cellSx} />
        </tr>
      </tbody>
    </table>
  );

  // Item rows, the closing marker and the grand-total footer are the only
  // part placed in (and paginated by) the guide band.
  const itemRows = (
    <>
      <table style={TABLE_STYLE}>
        {COLGROUP}
        <tbody>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <tr
                data-print-item
                data-print-item-end={
                  item.specLines.length === 0 && item.serials.length === 0
                    ? ""
                    : undefined
                }
                data-print-amount={item.totalPrice}
                style={{ height: 22 }}
              >
                <td colSpan={5} style={cellSx}>
                  <div style={itemRowSx}>
                    <div
                      style={{
                        textAlign: "right",
                        width: qtyBoxWidth,
                        flexShrink: 0,
                      }}
                    >
                      {fmtQty(item.itemQty)}
                    </div>
                    <div
                      style={{
                        width: ITEM_COLUMNS.uomWidth,
                        flexShrink: 0,
                      }}
                    >
                      {item.itemUOM}
                    </div>
                    <div
                      style={{ fontWeight: 700, flex: 1, marginLeft: nameShift }}
                    >
                      {item.itemName}
                    </div>
                    <div
                      style={{
                        width: ITEM_COLUMNS.unitPriceWidth,
                        flexShrink: 0,
                        textAlign: "right",
                        marginRight: 24,
                      }}
                    >
                      {fmtPHP(item.unitPrice)}
                    </div>
                    <div
                      style={{
                        width: ITEM_COLUMNS.totalPriceWidth,
                        flexShrink: 0,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {fmtPHP(item.totalPrice)}
                    </div>
                  </div>
                </td>
              </tr>

              {item.specLines.map((line, li) => (
                <tr
                  key={li}
                  data-print-item-end={
                    li === item.specLines.length - 1 &&
                    item.serials.length === 0
                      ? ""
                      : undefined
                  }
                  style={{ minHeight: 14 }}
                >
                  <td colSpan={3} style={specLineCellSx}>
                    <div style={subLineWrapperSx}>
                      <div style={subLineSpacerSx} />
                      <div>{line}</div>
                    </div>
                  </td>
                </tr>
              ))}

              {item.serials.length > 0 && (
                <tr data-print-item-end style={{ minHeight: 14 }}>
                  <td colSpan={3} style={specLineCellSx}>
                    <div style={subLineWrapperSx}>
                      <div style={subLineSpacerSx} />
                      <div style={{ fontWeight: 700, fontStyle: "italic" }}>
                        S/N: {item.serials.join(", ")}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}

          <tr style={{ height: 22 }}>
            <td
              colSpan={5}
              style={{
                ...cellSx,
                textAlign: "center",
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              ***nothing follows***
            </td>
          </tr>
        </tbody>
      </table>

      {!banded && renderTotals()}
    </>
  );

  const footerLActions = (
    <BaseButton
      label="Back"
      icon={icons.back}
      onClick={() => navigate(-1)}
      actionColor="back"
    />
  );

  return (
    <PageLayout
      title="Sales Invoice Preview"
      subtitle="Quick overview"
      upDownIndicator={false}
      footerLActions={
        printControls?.viewMode === "print" ? (
          <PrintPreviewPageFooter printControls={printControls} side="left" />
        ) : (
          footerLActions
        )
      }
      footerRActions={<PrintPreviewPageFooter printControls={printControls} />}
    >
      <PrintPreview
        {...layoutProps}
        pagedChildren={
          banded ? <div style={PAGED_WRAPPER_SX}>{itemRows}</div> : null
        }
        bandFooter={banded ? renderBandFooter : null}
        bandTopFooter={banded ? renderBandTopFooter : null}
        onExport={() => console.log("wire up export")}
        onControlsReady={setPrintControls}
        hideHeaderControls={true}
        showSystemGenerated={false}
        previewOverlay={<PreviewFormOverlay companyId={companyId} docType="CSI" />}
        pdfFileName={pdfFileName}>
        <div style={banded ? HEADER_WRAPPER_SX : PAGE_CONTAINER_SX}>
          {headerRows}
          {!banded && itemRows}
        </div>
      </PrintPreview>
    </PageLayout>
  );
}
