import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";
import { fmtPHP, fmtQty } from "../../../../../utils/formatters/formatter.js";
import PrintPreview from "../../../../../components/ui/print-preview/PrintPreview.jsx";
import PrintPreviewPageFooter from "../../../../../components/ui/print-preview/PrintPreviewPageFooter.jsx";
import EditableCell, {
  PrintEditableContext,
} from "../../../../../components/ui/print-preview/EditableCell.jsx";
import MediaRoute from "../../../../../routes/MediaRoute.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";

// Print ink for this document. Read once at module scope: it renders to
// PAPER, so every value is mode-INDEPENDENT (the print.* group).
const DOC = getThemeColors(false).print;

const cellSx = {
  border: `1.5px solid ${DOC.border}`,
  px: 1,
  py: 0.5,
  fontSize: "0.7rem",
  verticalAlign: "middle",
  color: DOC.text,
};

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const sectionHeaderSx = {
  ...cellSx,
  backgroundColor: DOC.headerBg,
  fontWeight: 700,
  textAlign: "center",
};

// SIX columns shared by the header block and the items table so the two
// separate <table> elements keep their columns visually aligned (the same
// trick the voucher preview's COLGROUP plays with nine equal columns).
// DESCRIPTION gets the widest band; the money columns sit on the right.
const COL_WIDTHS = ["7%", "33%", "20%", "10%", "15%", "15%"];
const COLGROUP = (
  <colgroup>
    {COL_WIDTHS.map((w, i) => (
      <col key={i} style={{ width: w }} />
    ))}
  </colgroup>
);

// Committed EditableCell values are raw strings ("1,234.56", "₱500", ""),
// so strip anything non-numeric instead of trusting Number() — the same
// guard the voucher preview runs before it re-derives anything.
const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// The row's SELLING TOTAL: a typed TOTAL wins over the recompute, then a
// typed price/qty pair, then the row's mapped data.
function rowTotal(row, values) {
  const totalKey = `item-${row.id}-total`;
  if (totalKey in values) return toNum(values[totalKey]);

  const qtyKey = `item-${row.id}-qty`;
  const priceKey = `item-${row.id}-selling`;
  const qty = qtyKey in values ? toNum(values[qtyKey]) : row.qty;
  const price = priceKey in values ? toNum(values[priceKey]) : row.unitSelling;
  return toNum(qty) * toNum(price);
}

function rowsGrandTotal(rows, values) {
  return rows.reduce((sum, row, idx) => sum + rowTotal(row, values), 0);
}

function PricingHeaderTable({
  transactionCode,
  clientName,
  title,
  companyLogo,
  companyName,
}) {
  // Same resolution as the voucher preview: the company's logo filename
  // → images URL; null means the header row is not drawn at all.
  const logoSrc = MediaRoute.resolveCompanyLogo({ strLogo: companyLogo });

  return (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        {companyLogo && logoSrc && (
          <tr>
            <td
              colSpan={6}
              style={{
                ...cellSx,
                border: "none",
                textAlign: "center",
                verticalAlign: "middle",
                height: 60,
              }}
            >
              <img
                src={logoSrc}
                alt={`${companyName} logo`}
                style={{
                  maxWidth: "160px",
                  maxHeight: "48px",
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </td>
          </tr>
        )}
        <tr>
          <td colSpan={6} style={sectionHeaderSx}>
            TRANSACTION PRICINGS
          </td>
        </tr>
        <tr>
          <td
            colSpan={4}
            style={{ ...cellSx, fontStyle: "italic" }}
          >
            <b style={{ fontStyle: "normal" }}>Client:</b>{" "}
            {clientName}
          </td>
          <td colSpan={2} style={{ ...cellSx, fontStyle: "italic" }}>
            <b style={{ fontStyle: "normal" }}>Transaction Code:</b>{" "}
            <u>{transactionCode}</u>
          </td>
        </tr>
        <tr>
          <td colSpan={6} style={{ ...cellSx, fontStyle: "italic" }}>
            <b style={{ fontStyle: "normal" }}>Title:</b>{" "}
            {title || "—"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function PricingItemsTable({ rows }) {
  // Committed edits from PrintPreview's edit-mode store — a typed Qty or
  // SELLING PRICE recalculates that row's TOTAL cell, and the GRAND TOTAL
  // re-derives from whatever the rows currently read.
  const values = React.useContext(PrintEditableContext)?.values ?? {};

  return (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        <tr>
          <td style={sectionHeaderSx}>#</td>
          <td style={sectionHeaderSx}>Item Description</td>
          <td style={sectionHeaderSx}>Brand/Model</td>
          <td style={sectionHeaderSx}>Qty</td>
          <td style={sectionHeaderSx}>Selling Price</td>
          <td style={sectionHeaderSx}>Total</td>
        </tr>
        {rows.map((row) => (
          <tr key={row.id}>
            <td
              style={{
                ...cellSx,
                textAlign: "center",
                backgroundColor: DOC.rowGray,
              }}
            >
              {row.n}
            </td>
            <EditableCell
              id={`item-${row.id}-desc`}
              colSpan={1}
              style={{
                ...cellSx,
                fontWeight: 600,
                backgroundColor: DOC.rowGray,
              }}
              align="left"
              initialValue={row.description}
            />
            <EditableCell
              id={`item-${row.id}-brand`}
              colSpan={1}
              style={{
                ...cellSx,
                textAlign: "left",
                backgroundColor: DOC.rowGray,
              }}
              align="left"
              initialValue={row.brandModel}
            />
            <EditableCell
              id={`item-${row.id}-qty`}
              colSpan={1}
              style={{
                ...cellSx,
                textAlign: "center",
                backgroundColor: DOC.rowGray,
              }}
              align="center"
              initialValue={row.qty}
              formatDisplay={(v) => fmtQty(v)}
            />
            <EditableCell
              id={`item-${row.id}-selling`}
              colSpan={1}
              style={{
                ...cellSx,
                textAlign: "right",
                backgroundColor: DOC.rowGray,
              }}
              align="right"
              initialValue={row.unitSelling ?? ""}
              formatDisplay={(v) => fmtPHP(toNum(v))}
            />
            <EditableCell
              id={`item-${row.id}-total`}
              colSpan={1}
              style={{
                ...cellSx,
                textAlign: "right",
                fontWeight: 700,
                backgroundColor: DOC.rowGray,
              }}
              align="right"
              initialValue={rowTotal(row, values)}
              formatDisplay={(v) => fmtPHP(toNum(v))}
            />
          </tr>
        ))}
        {/* spacer row — same breath between body and total the widget leaves */}
        <tr>
          <td
            colSpan={6}
            style={{
              border: "none",
              height: "10px",
              backgroundColor: "transparent",
            }}
          />
        </tr>
      </tbody>
    </table>
  );
}

function PricingFooterTable({ rows }) {
  const values = React.useContext(PrintEditableContext)?.values ?? {};
  const grandTotal = rowsGrandTotal(rows, values);

  return (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        <tr>
          <EditableCell
            id="grandTotalLabel"
            colSpan={4}
            style={{
              ...cellSx,
              fontWeight: 700,
              textAlign: "right",
              backgroundColor: DOC.fillBg,
              borderRight: `2px solid ${DOC.border}`,
            }}
            align="right"
            initialValue="Grand Total"
          />
          <td
            colSpan={1}
            style={{
              ...cellSx,
              backgroundColor: DOC.fillBg,
            }}
          />
          <EditableCell
            id="grandTotalValue"
            colSpan={1}
            style={{
              ...cellSx,
              fontWeight: 700,
              textAlign: "right",
              backgroundColor: DOC.fillBg,
            }}
            align="right"
            initialValue={grandTotal}
            formatDisplay={(v) => fmtPHP(toNum(v))}
          />
        </tr>
      </tbody>
    </table>
  );
}

export default function PreviewPricingView({
  clientName,
  transactionCode,
  title,
  rows,
  companyLogo,
  companyName,
  pdfFileName,
}) {
  const navigate = useNavigate();
  const [printControls, setPrintControls] = React.useState(null);

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
      title="Pricing Preview"
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
        onExport={() => console.log("wire up export")}
        onControlsReady={setPrintControls}
        hideHeaderControls={true}
        pdfFileName={pdfFileName}
        header={
          <PricingHeaderTable
            transactionCode={transactionCode}
            clientName={clientName}
            title={title}
            companyLogo={companyLogo}
            companyName={companyName}
          />
        }
        footer={<PricingFooterTable rows={rows} />}
      >
        <PricingItemsTable rows={rows} />
      </PrintPreview>
    </PageLayout>
  );
}
