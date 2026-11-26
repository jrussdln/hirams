import React from "react";
import { useNavigate } from "react-router-dom";
import { fmtQty } from "../../../../../utils/formatters/formatter.js";
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

// ---- ADJUST THIS: HiRams' SOLD TO box sits higher on its pre-printed form ----
// This is the space above the client nickname. Lower value = nickname closer
// to the top. Other companies keep CLIENT_INFO_BLOCK_OFFSET above.
const HIRAMS_CLIENT_INFO_BLOCK_OFFSET = { top: 30 };

// ---- ADJUST THIS for extra spacing on each individual line inside the block ----
const CLIENT_INFO_LINE_PADDING = {
  top: 10,
  bottom: 0,
  left: 0,
  right: 0,
};

// HiRams' pre-printed SOLD TO box has tighter line spacing. Pulling each
// sub-line up with a negative margin makes them stack on each other, so the
// spacing is tightened with paddingTop instead (see hiramsSubLineCellSx).

// ---- ADJUST THIS to move the whole AO row (Contact Person / Number / Code) ----
const AO_ROW_OFFSET = {
  top: 25,
  bottom: 0,
  left: 195,
  right: 160,
};

// ---- ADJUST THIS to move the Qty / UOM / Name row for each item ----
const ITEM_ROW_OFFSET = {
  top: 10,
  bottom: 0,
  left: -55,
  right: 0,
};

// ---- These define the qty/UOM column widths so specs & serials can line up ----
// with the item name. Adjust here if you resize the qty/UOM columns above.
const ITEM_COLUMNS = {
  qtyWidth: 40,
  uomWidth: 60,
  gap: 8,
};

// HiRams' pre-printed form has a wider QUANTITY column, so its qty number
// sits further right than on the other companies' forms.
const HIRAMS_QTY_WIDTH = 64;

// HiRams' item row AND its spec / serial lines shift right together.
const HIRAMS_ITEM_ROW_LEFT_SHIFT = 30;
// Total horizontal space the name is indented by, within the item row.
const NAME_INDENT =
  ITEM_COLUMNS.qtyWidth +
  ITEM_COLUMNS.gap +
  ITEM_COLUMNS.uomWidth +
  ITEM_COLUMNS.gap;

// Specs/serials are secondary lines, so they use a smaller ink and tighter
// leading than the main item row.
const specLineCellSx = {
  ...cellSx,
  fontSize: "0.7rem",
  lineHeight: 1.1,
  py: 0.1,
};

const clientInfoCellSx = {
  ...cellSx,
  paddingTop: CLIENT_INFO_LINE_PADDING.top,
  paddingBottom: CLIENT_INFO_LINE_PADDING.bottom,
  paddingLeft: CLIENT_INFO_LINE_PADDING.left,
  paddingRight: CLIENT_INFO_LINE_PADDING.right,
};

// HiRams' pre-printed SOLD TO box has tighter line spacing, so its ADDRESS and
// TIN lines sit higher than the other companies' forms.
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

// Subsequent items sit right under the previous item's specs, so they use a
// much smaller top gap than the first item.
const itemRowWrapperTightSx = {
  ...itemRowWrapperSx,
  marginTop: 10,
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

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const COLGROUP = (
  <colgroup>
    <col style={{ width: "12%" }} />
    <col style={{ width: "48%" }} />
    <col style={{ width: "20%" }} />
    <col style={{ width: "20%" }} />
  </colgroup>
);

export default function PreviewDRView({
  clientName,
  clientTIN,
  clientAddress,
  clientBusinessStyle,
  isHirams,
  contactPerson,
  contactNumber,
  code,
  items,
  companyId,
  pdfFileName,
}) {
  const navigate = useNavigate();
  const [printControls, setPrintControls] = React.useState(null);

  const layoutProps = getPrintLayoutProps("DR", companyId);
  const banded = Boolean(layoutProps.contentWindowMm);

  // Effective item-row columns. Widening the qty column pushes the (right-
  // aligned) quantity number to the right and keeps specs/serials indented
  // under the item name.
  const qtyWidth = isHirams ? HIRAMS_QTY_WIDTH : ITEM_COLUMNS.qtyWidth;
  // Quantity and UOM keep their original positions (already fixed). Only the
  // item name and spec/serial lines shift right: shrink the qty box by the
  // shift so its right-aligned number stays put, then push the name over.
  const qtyBoxWidth = isHirams ? qtyWidth - HIRAMS_ITEM_ROW_LEFT_SHIFT : qtyWidth;
  const nameShift = isHirams ? HIRAMS_ITEM_ROW_LEFT_SHIFT : 0;
  const nameIndent =
    qtyWidth + ITEM_COLUMNS.gap + ITEM_COLUMNS.uomWidth + ITEM_COLUMNS.gap;
  const rowLeft =
    ITEM_ROW_OFFSET.left + (isHirams ? HIRAMS_ITEM_ROW_LEFT_SHIFT : 0);
  const itemRowSx = { ...itemRowWrapperSx, marginLeft: rowLeft };
  const tightItemRowSx = { ...itemRowWrapperTightSx, marginLeft: rowLeft };
  const subLineWrapperSx = {
    ...itemSubLineWrapperSx,
    marginLeft: rowLeft,
  };
  const subLineSpacerSx = { ...itemSubLineSpacerSx, width: nameIndent };

  // Client info / contact row stay in normal flow above the guide band.
  const headerRows = (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        <tr style={{ height: 22 }}>
          <td colSpan={4} style={cellSx}>
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
          <td colSpan={4} style={cellSx} />
        </tr>

        {!isHirams && (
          <tr style={{ height: 22 }}>
            <td colSpan={4} style={cellSx}>
              <div style={aoRowWrapperSx}>
                <div style={{ fontWeight: 600 }}>{contactPerson}</div>
                <div>{contactNumber}</div>
                <div style={{ textAlign: "right" }}>{code}</div>
              </div>
            </td>
          </tr>
        )}

        <tr style={{ height: 20 }}>
          <td colSpan={4} style={cellSx} />
        </tr>
      </tbody>
    </table>
  );

  // Item rows are the only part placed in (and paginated by) the guide band.
  const itemRows = (
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
              style={{ height: 22 }}
            >
              <td colSpan={4} style={cellSx}>
                <div style={i > 0 ? tightItemRowSx : itemRowSx}>
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
                  <div style={{ fontWeight: 700, marginLeft: nameShift }}>
                    {item.itemName}
                  </div>
                </div>
              </td>
            </tr>

            {item.specLines.map((line, li) => (
              <tr
                key={li}
                data-print-item-end={
                  li === item.specLines.length - 1 && item.serials.length === 0
                    ? ""
                    : undefined
                }
                style={{ height: 14 }}
              >
                <td colSpan={4} style={specLineCellSx}>
                  <div style={subLineWrapperSx}>
                    <div style={subLineSpacerSx} />
                    <div>{line}</div>
                  </div>
                </td>
              </tr>
            ))}

            {item.serials.length > 0 && (
              <tr data-print-item-end style={{ height: 14 }}>
                <td colSpan={4} style={specLineCellSx}>
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
            colSpan={4}
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
      title="Delivery Receipt Preview"
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
          banded ? (
            <div style={{ padding: "0 32px", boxSizing: "border-box" }}>
              {itemRows}
            </div>
          ) : null
        }
        onExport={() => console.log("wire up export")}
        onControlsReady={setPrintControls}
        hideHeaderControls={true}
        showSystemGenerated={false}
        previewOverlay={<PreviewFormOverlay companyId={companyId} docType="DR" />}
        pdfFileName={pdfFileName}>
        <div style={{ padding: "24px 32px", boxSizing: "border-box" }}>
          {headerRows}
          {!banded && itemRows}
        </div>
      </PrintPreview>
    </PageLayout>
  );
}
