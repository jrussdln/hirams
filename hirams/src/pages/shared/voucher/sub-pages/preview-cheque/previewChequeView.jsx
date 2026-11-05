import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import BaseButton from "../../../../../components/ui/form/BaseButton.jsx";
import icons from "../../../../../utils/style/iconFormatStyles.jsx";
import { fmtPHP } from "../../../../../utils/formatters/formatter.js";
import PrintPreview from "../../../../../components/ui/print-preview/PrintPreview.jsx";
import PrintPreviewPageFooter from "../../../../../components/ui/print-preview/PrintPreviewPageFooter.jsx";
import EditableCell from "../../../../../components/ui/print-preview/EditableCell.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";

// Body ink of the printed document. Read once at module scope: it is PAPER,
// so it is the same colour in both themes (print.ink).
const DOC_INK = getThemeColors(false).print.ink;

const plainCellSx = {
  border: "none",
  px: 1,
  py: 0.5,
  fontSize: "0.85rem",
  verticalAlign: "middle",
  color: DOC_INK,
};

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const COLGROUP = (
  <colgroup>
    {Array.from({ length: 8 }).map((_, i) => (
      <col key={i} style={{ width: `${(100 / 8).toFixed(4)}%` }} />
    ))}
  </colgroup>
);

// Total "rows" on the page, mimicking a spreadsheet grid. Content sits at
// specific row indexes (date ~21, payee/amount ~22, words ~24); rows after
// WORDS_ROW are no longer needed, so we stop the grid there instead of
// padding all the way to a fixed page-height row count (was causing a
// blank trailing page).
const DATE_ROW = 21;
const PAYEE_ROW = 22;
const WORDS_ROW = 23;
const TOTAL_ROWS = WORDS_ROW; // was 32 — trims the extra empty filler rows below
// Adjust these to nudge the whole content block relative to the printable
// area — e.g. to align with pre-printed cheque stock. Values in px.
const CONTENT_MARGIN = {
  top: -40,
  right: 276,
  bottom: 0,
  left: 61,
};

const DEFAULTS = {
  date: new Date()
    .toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, ""), // → "MMDDYYYY", e.g. "09102026"
  payeeName: "—",
  amount: 0,
  amountInWords: "",
};

// Renders a date as grouped digit slots, e.g. "09 28 2026", each character
// in its own fixed-width slot. Spacing mimics a printed cheque's date field,
// but the slot outlines are invisible (transparent border keeps the layout).
function DateDigitBoxes({ date }) {
  const digitsOnly = (date || "")
    .replace(/[^0-9]/g, "")
    .padEnd(8, " ")
    .slice(0, 8);
  const groups = [
    digitsOnly.slice(0, 2), // MM
    digitsOnly.slice(2, 4), // DD
    digitsOnly.slice(4, 8), // YYYY
  ];

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      {groups.map((group, gi) => (
        <div
          key={gi}
          style={{
            display: "flex",
            gap: 3,
            marginRight: gi === 1 ? 9 : 0,
          }}
        >
          {group.split("").map((ch, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 22,
                border: "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                fontWeight: 500,
                color: DOC_INK,
              }}
            >
              {ch.trim()}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PreviewChequeView({
  date = DEFAULTS.date,
  payeeName = DEFAULTS.payeeName,
  amount = DEFAULTS.amount,
  amountInWords = DEFAULTS.amountInWords,
}) {
  const rows = Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1);
  const navigate = useNavigate();
  const [printControls, setPrintControls] = React.useState(null);

  // Saved-PDF title: "PayeeName MMDDYYYY" (e.g. "John Smith 11042026").
  // Strips characters that are illegal in file names, so a payee like
  // "ABC, Inc." stays valid on disk.
  const pdfFileName = `${payeeName} ${date}`
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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
      title="Cheque Preview"
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
        showSystemGenerated={false}
        pdfFileName={pdfFileName}
      >
        <div
          style={{
            marginTop: CONTENT_MARGIN.top,
            marginRight: CONTENT_MARGIN.right,
            marginBottom: CONTENT_MARGIN.bottom,
            marginLeft: CONTENT_MARGIN.left,
            boxSizing: "border-box",
          }}
        >
          <table style={TABLE_STYLE}>
            {COLGROUP}
            <tbody>
              {rows.map((rowNum) => {
                if (rowNum === DATE_ROW) {
                  return (
                    <tr key={rowNum} style={{ height: 24 }}>
                      <td colSpan={4} style={plainCellSx} />
                      <td
                        colSpan={4}
                        style={{
                          ...plainCellSx,
                          textAlign: "right",
                          verticalAlign: "top",
                          paddingBottom: 16,
                        }}
                      >
                        <DateDigitBoxes date={date} />
                      </td>
                    </tr>
                  );
                }

                if (rowNum === PAYEE_ROW) {
                  return (
                    <tr key={rowNum} style={{ height: 24 }}>
                      <EditableCell
                        id="payeeName"
                        colSpan={5}
                        style={{
                          ...plainCellSx,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                        align="left"
                        initialValue={payeeName}
                        placeholder="Payee name"
                      />
                      <EditableCell
                        id="amountOverride"
                        colSpan={3}
                        style={{
                          ...plainCellSx,
                          textAlign: "right",
                          fontWeight: 500,
                          fontSize: "0.8rem",
                          paddingRight: 20,
                        }}
                        align="right"
                        initialValue={amount}
                        formatDisplay={(v) => fmtPHP(Number(v) || 0)}
                      />
                    </tr>
                  );
                }

                if (rowNum === WORDS_ROW) {
                  return (
                    <tr key={rowNum} style={{ height: 24 }}>
                      <td
                        colSpan={8}
                        style={{
                          ...plainCellSx,
                          fontWeight: 400,
                          fontSize: "0.8rem",
                          paddingTop: 8,
                          paddingLeft: 2,
                        }}
                      >
                        {amountInWords}
                      </td>
                    </tr>
                  );
                }

                // Empty filler row — keeps the sheet's full page height/proportions
                return (
                  <tr key={rowNum} style={{ height: 24 }}>
                    <td colSpan={8} style={plainCellSx} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PrintPreview>
    </PageLayout>
  );
}
