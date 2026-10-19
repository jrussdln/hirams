import React from "react";
import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import PrintPreview from "../../../../../components/ui/print-preview/PrintPreview.jsx";
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

// ---- ADJUST THIS to move the whole Client Info block (Name/TIN/Address/Style) ----
const CLIENT_INFO_BLOCK_OFFSET = {
  top: 92,
  bottom: 0,
  left: 48,
  right: 0,
};

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
  right: 140,
};

// ---- ADJUST THIS to move the Qty / UOM / Name / Unit Price / Total row ----
const ITEM_ROW_OFFSET = {
  top: 30,
  bottom: 0,
  left: -30,
  right: 0,
};

// ---- These define the qty/UOM column widths so specs & serials line up with the item name ----
const ITEM_COLUMNS = {
  qtyWidth: 40,
  uomWidth: 60,
  unitPriceWidth: 70,
  totalPriceWidth: 80,
  gap: 8,
};
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
  right: 32,
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

const clientInfoBlockWrapperSx = {
  marginTop: CLIENT_INFO_BLOCK_OFFSET.top,
  marginBottom: CLIENT_INFO_BLOCK_OFFSET.bottom,
  marginLeft: CLIENT_INFO_BLOCK_OFFSET.left,
  marginRight: CLIENT_INFO_BLOCK_OFFSET.right,
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

const FOOTER_WRAPPER_SX = {
  position: "absolute",
  bottom: FOOTER_OFFSET.bottom,
  left: FOOTER_OFFSET.left,
  right: FOOTER_OFFSET.right,
  fontFamily: "Calibri, Arial, sans-serif",
  fontSize: "0.75rem",
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

function Footer({ grandTotal }) {
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
          gap: 1,
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

        <div style={{ height: 50 }} />

        <div style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>
          {fmtPHP(sum)}
        </div>
      </div>
    </div>
  );
}
export default function PreviewSIView({
  clientName,
  clientTIN,
  clientAddress,
  clientBusinessStyle,
  contactPerson,
  contactNumber,
  code,
  items,
  grandTotal,
}) {
  return (
    <PageLayout
      title="Sales Invoice Preview"
      subtitle="Quick overview"
      upDownIndicator={false}
    >
      <PrintPreview onExport={() => console.log("wire up export")}>
        <div style={PAGE_CONTAINER_SX}>
          <table style={TABLE_STYLE}>
            {COLGROUP}
            <tbody>
              <tr style={{ height: 22 }}>
                <td colSpan={5} style={cellSx}>
                  <div style={clientInfoBlockWrapperSx}>
                    <div style={clientInfoCellSx}>{clientName}</div>
                    {clientTIN && (
                      <div style={clientInfoCellSx}>{clientTIN}</div>
                    )}
                    {clientAddress && (
                      <div style={clientInfoCellSx}>{clientAddress}</div>
                    )}
                    <div style={clientInfoCellSx}>{clientBusinessStyle}</div>
                  </div>
                </td>
              </tr>

              <tr style={{ height: 30 }}>
                <td colSpan={5} style={cellSx} />
              </tr>

              <tr style={{ height: 22 }}>
                <td colSpan={5} style={cellSx}>
                  <div style={aoRowWrapperSx}>
                    <div style={{ fontWeight: 600 }}>{contactPerson}</div>
                    <div>{contactNumber}</div>
                    <div style={{ textAlign: "right" }}>{code}</div>
                  </div>
                </td>
              </tr>

              <tr style={{ height: 20 }}>
                <td colSpan={5} style={cellSx} />
              </tr>

              {items.map((item, i) => (
                <React.Fragment key={i}>
                  <tr style={{ height: 22 }}>
                    <td colSpan={5} style={cellSx}>
                      <div style={itemRowWrapperSx}>
                        <div
                          style={{
                            textAlign: "right",
                            width: ITEM_COLUMNS.qtyWidth,
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
                        <div style={{ fontWeight: 700, flex: 1 }}>
                          {item.itemName}
                        </div>
                        <div
                          style={{
                            width: ITEM_COLUMNS.unitPriceWidth,
                            flexShrink: 0,
                            textAlign: "right",
                          }}
                        >
                          ₱{fmtPHP(item.unitPrice)}
                        </div>
                        <div
                          style={{
                            width: ITEM_COLUMNS.totalPriceWidth,
                            flexShrink: 0,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          ₱{fmtPHP(item.totalPrice)}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {item.specLines.map((line, li) => (
                    <tr key={li} style={{ height: 20 }}>
                      <td colSpan={5} style={cellSx}>
                        <div style={itemSubLineWrapperSx}>
                          <div style={itemSubLineSpacerSx} />
                          <div>{line}</div>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {item.serials.length > 0 && (
                    <tr style={{ height: 20 }}>
                      <td colSpan={5} style={cellSx}>
                        <div style={itemSubLineWrapperSx}>
                          <div style={itemSubLineSpacerSx} />
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

          <Footer grandTotal={grandTotal} />
        </div>
      </PrintPreview>
    </PageLayout>
  );
}
