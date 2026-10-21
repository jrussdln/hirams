import React, { useState } from "react";
import PageLayout from "../../../../../components/layouts/page/content-page/index.jsx";
import { fmtPHP, fmtQty } from "../../../../../utils/formatters/formatter.js";
import { numberToWords } from "../../../../../utils/helpers/numberToWords.js";
import PrintAreaStructure from "../../../../../components/ui/print-preview/PrintPreview.jsx";
import EditableCell from "../../../../../components/ui/print-preview/EditableCell.jsx";
import MediaRoute from "../../../../../routes/MediaRoute.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors.js";
// ✅ FIXED PRINT COLORS — NEVER CHANGED, EXACTLY AS YOU HAD THEM.
// Now sourced from the palette's `print` group, which is pinned and
// deliberately mode-INDEPENDENT: printed output is ink on paper, so it
// must never follow the app theme. Read once at module scope because this
// object feeds module-level style constants (cellSx / headerCellSx), so
// hooks can't be used here — same approach as the SweetAlert colours.
const DOC = getThemeColors(false).print;
const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};
const cellSx = {
  border: `1.5px solid ${DOC.border}`, // slightly thicker than 1px for print-engine safety margin
  px: 1,
  py: 0.5,
  fontSize: "0.7rem",
  verticalAlign: "middle",
  color: DOC.text,
};
const headerCellSx = {
  ...cellSx,
  backgroundColor: DOC.headerBg,
  fontWeight: 700,
  textAlign: "center",
};

const COLGROUP = (
  <colgroup>
    <col style={{ width: "11%" }} />
    <col style={{ width: "44%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "13%" }} />
  </colgroup>
);

// Fallback so the page doesn't crash if opened directly with no nav state.
const DEFAULTS = {
  companyName: "—",
  companyAddress: "",
  companyEmail: "",
  companyPhoneNo: "",
  companyTIN: "",
  companyLogo: null, // ← new
  poNo: "—",
  date: "",
  paymentTerms: "",
  supplierName: "—",
  supplierAddress: "",
  contactPerson: "",
  items: [],
  freight: 0,
  ewt: 0,
  preparedBy: "",
  preparedByRole: "",
  checkedBy: "",
  checkedByRole: "",
  approvedBy: "",
  approvedByRole: "",
  shippingDetails: "",
};
const QUILL_CONTENT_STYLE = `
  .po-shipping-quill p { margin: 0 0 2px 0; }
  .po-shipping-quill ul, .po-shipping-quill ol { margin: 0 0 2px 16px; padding: 0; }
  .po-shipping-quill strong { font-weight: 700; }
  .po-shipping-quill em { font-style: italic; }
  .po-shipping-quill a { color: inherit; text-decoration: underline; }
`;
function POHeaderTable({
  companyName,
  companyAddress,
  companyEmail,
  companyPhoneNo,
  companyTIN,
  poNo,
  date,
  paymentTerms,
  supplierName,
  supplierAddress,
  contactPerson,
  companyLogo,
  shippingDetails,
}) {
  const logoSrc = MediaRoute.resolveCompanyLogo({ strLogo: companyLogo });
  const hasShipping =
    typeof shippingDetails === "string" &&
    shippingDetails.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <>
      <style>{QUILL_CONTENT_STYLE}</style>
      <table style={TABLE_STYLE}>
        {COLGROUP}
        <tbody>
          <tr>
            {companyLogo && logoSrc && (
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
            )}
          </tr>
          <tr>
            <td colSpan={5} style={{ ...cellSx, border: "none" }}>
              {!(companyLogo && logoSrc) && (
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    lineHeight: 1.2,
                    color: DOC.text,
                  }}
                >
                  {companyName}
                </div>
              )}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cellSx, paddingTop: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: DOC.text,
                }}
              >
                {companyAddress}
              </div>
            </td>
            <td
              colSpan={4}
              rowSpan={2}
              style={{ ...headerCellSx, fontSize: "1.2rem" }}
            >
              PURCHASE ORDER
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{
                ...cellSx,
                fontStyle: "italic",
                fontWeight: 500,
                height: 22,
              }}
            >
              {companyEmail}
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{ ...cellSx, fontStyle: "italic", fontWeight: 500 }}
            >
              {companyPhoneNo}
            </td>
            <td
              style={{
                ...cellSx,
                fontStyle: "italic",
                fontWeight: 500,
                backgroundColor: DOC.fillBg,
              }}
            >
              No.
            </td>
            {/* PO number is document-specific — editable */}
            <EditableCell
              id="poNo"
              style={{
                ...cellSx,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "0.55rem",
              }}
              align="left"
              initialValue={poNo}
              placeholder="PO No."
            />
            <td
              style={{
                ...cellSx,
                fontWeight: 700,
                backgroundColor: DOC.fillBg,
              }}
            >
              Date:
            </td>
            {/* Date is document-specific — editable */}
            <EditableCell
              id="date"
              style={{ ...cellSx, fontStyle: "italic" }}
              align="left"
              initialValue={date}
              placeholder="Date"
            />
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{ ...cellSx, fontStyle: "italic", fontWeight: 500 }}
            >
              TIN: {companyTIN}
            </td>
            <td
              colSpan={2}
              style={{
                ...cellSx,
                fontWeight: 700,
                backgroundColor: DOC.fillBg,
              }}
            >
              Payment Terms:
            </td>
            {/* Payment terms are document-specific — editable */}
            <EditableCell
              id="paymentTerms"
              colSpan={2}
              style={cellSx}
              align="center"
              initialValue={paymentTerms}
              placeholder="Payment terms"
            />
          </tr>
          <tr>
            <td colSpan={2} style={headerCellSx}>
              SUPPLIER
            </td>
            <td colSpan={4} style={headerCellSx}>
              SHIPPING
            </td>
          </tr>
          <tr>
            {/* Supplier name is document-specific — editable */}
            <EditableCell
              id="supplierName"
              colSpan={2}
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                fontWeight: 500,
              }}
              align="left"
              initialValue={supplierName}
              placeholder="Supplier name"
            />
            <EditableCell.RichText
              id="shippingDetails"
              colSpan={4}
              rowSpan={4}
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                fontSize: "0.68rem",
                lineHeight: 1.35,
              }}
              verticalAlign="top"
              initialValue={shippingDetails}
              placeholder="Shipping details"
              className="po-shipping-quill"
            />
          </tr>
          <tr>
            {/* Supplier address is document-specific — editable */}
            <EditableCell
              id="supplierAddress"
              colSpan={2}
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                fontWeight: 500,
                fontStyle: "italic",
              }}
              align="left"
              initialValue={supplierAddress}
              placeholder="Supplier address"
            />
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{ ...cellSx, backgroundColor: DOC.fillBg, height: 24 }}
            />
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                fontWeight: 500,
              }}
            >
              Contact Person:{" "}
              <EditableCell.Inline
                id="contactPerson"
                initialValue={contactPerson}
                placeholder="Contact person"
              />
            </td>
            <td
              colSpan={4}
              style={{ ...cellSx, backgroundColor: DOC.fillBg }}
            />
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ── ITEMS TABLE — the only part that paginates in print view ──
function POItemsTable({ items }) {
  return (
    <table style={TABLE_STYLE}>
      {COLGROUP}
      <tbody>
        <tr>
          <td style={headerCellSx}>No.</td>
          <td style={headerCellSx}>Description</td>
          <td style={headerCellSx}>UOM</td>
          <td style={headerCellSx}>Qty</td>
          <td style={headerCellSx}>Unit Price</td>
          <td style={headerCellSx}>Amount</td>
        </tr>
        {items.map((item, idx) => {
          // Prefer a stable identity over the array index — if `items` is
          // ever re-sorted or filtered, an index-based id can silently
          // attach an edit to the wrong row.
          const rowId = item.id ?? item.no ?? idx;
          return (
            <tr key={item.no ?? idx}>
              {/* row number stays static — it's positional, not data */}
              <td
                style={{
                  ...cellSx,
                  textAlign: "center",
                  backgroundColor: DOC.rowGray,
                }}
              >
                {item.no}
              </td>
              <EditableCell
                id={`item-${rowId}-desc`}
                style={{ ...cellSx, backgroundColor: DOC.rowGray }}
                align="left"
                initialValue={item.desc}
                placeholder="Description"
              />
              <EditableCell
                id={`item-${rowId}-uom`}
                style={{
                  ...cellSx,
                  textAlign: "center",
                  backgroundColor: DOC.rowGray,
                }}
                align="center"
                initialValue={item.uom}
                placeholder="UOM"
              />
              <EditableCell
                id={`item-${rowId}-qty`}
                style={{
                  ...cellSx,
                  textAlign: "center",
                  backgroundColor: DOC.rowGray,
                }}
                align="center"
                initialValue={item.qty}
                formatDisplay={(v) => fmtQty(v)}
                placeholder="Qty"
              />
              <EditableCell
                id={`item-${rowId}-unitPrice`}
                style={{
                  ...cellSx,
                  textAlign: "right",
                  backgroundColor: DOC.rowGray,
                }}
                align="right"
                initialValue={item.unitPrice}
                formatDisplay={(v) => fmtPHP(Number(v) || 0)}
              />
              <EditableCell
                id={`item-${rowId}-amount`}
                style={{
                  ...cellSx,
                  textAlign: "right",
                  fontWeight: 700,
                  fontStyle: "italic",
                  backgroundColor: DOC.rowGray,
                }}
                align="right"
                initialValue={item.qty * item.unitPrice}
                formatDisplay={(v) => fmtPHP(Number(v) || 0)}
              />
            </tr>
          );
        })}
        {/* spacer row */}
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

// ── FOOTER TABLE (terms, totals, signatures) — repeats every page ──
function POFooterTable({
  freight,
  ewt,
  subtotal,
  payable,
  preparedBy,
  preparedByRole,
  checkedBy,
  checkedByRole,
  approvedBy,
  approvedByRole,
}) {
  return (
    <>
      <table style={TABLE_STYLE}>
        {COLGROUP}
        <tbody>
          <tr>
            <td
              colSpan={4}
              style={{
                ...cellSx,
                backgroundColor: DOC.grayBg,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              TERMS & CONDITIONS
            </td>
            <td style={{ ...cellSx, fontWeight: 700, fontStyle: "italic" }}>
              Subtotal
            </td>
            {/* Subtotal override — editable, view-only (not recalculated) */}
            <EditableCell
              id="subtotalOverride"
              style={{
                ...cellSx,
                textAlign: "right",
                fontWeight: 700,
                fontStyle: "italic",
              }}
              align="right"
              initialValue={subtotal}
              formatDisplay={(v) => fmtPHP(Number(v) || 0)}
            />
          </tr>
          <tr>
            <td
              colSpan={4}
              rowSpan={3}
              style={{ ...cellSx, verticalAlign: "top" }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontStyle: "italic",
                  color: DOC.text,
                }}
              >
                1. We deserve the right to cancel the purchase order anytime
                before product shipment.
              </div>
              <div
                style={{
                  fontSize: "0.62rem",
                  fontStyle: "italic",
                  color: DOC.text,
                }}
              >
                2. Invoice raised to us should contain the details of purchase
                order with date mentioned.
              </div>
              <div
                style={{
                  fontSize: "0.55rem",
                  fontStyle: "italic",
                  color: DOC.text,
                }}
              >
                3. Adherence to agreed product specifications is a must. Any
                deviation during delivery will result in cancellation of PO.
              </div>
              <div
                style={{
                  fontSize: "0.62rem",
                  fontStyle: "italic",
                  color: DOC.text,
                }}
              >
                4. Delivery should be strictly done within 5 days from the date
                of purchase order.
              </div>
            </td>
            <td style={{ ...cellSx, fontStyle: "italic" }}>Freight</td>
            {/* Freight — editable */}
            <EditableCell
              id="freightOverride"
              style={{ ...cellSx, textAlign: "right", fontStyle: "italic" }}
              align="right"
              initialValue={freight}
              formatDisplay={(v) => fmtPHP(Number(v) || 0)}
            />
          </tr>
          <tr>
            <td style={{ ...cellSx, fontStyle: "italic" }}>EWT</td>
            {/* EWT — editable */}
            <EditableCell
              id="ewtOverride"
              style={{ ...cellSx, textAlign: "right", fontStyle: "italic" }}
              align="right"
              initialValue={ewt}
              formatDisplay={(v) => fmtPHP(Number(v) || 0)}
            />
          </tr>
          <tr>
            <td
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              TOTAL
            </td>
            {/* Total/payable override — editable, view-only */}
            <EditableCell
              id="payableOverride"
              style={{
                ...cellSx,
                backgroundColor: DOC.fillBg,
                textAlign: "right",
                fontWeight: 700,
                fontStyle: "italic",
              }}
              align="right"
              initialValue={payable}
              formatDisplay={(v) => fmtPHP(Number(v) || 0)}
            />
          </tr>
          <tr>
            <td
              colSpan={6}
              style={{
                ...cellSx,
                backgroundColor: DOC.grayBg,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Amount in Words: {numberToWords(payable)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── SIGNATURES — separate table, 4 truly equal columns ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginTop: 12,
        }}
      >
        <colgroup>
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}>
              Prepared By:
            </td>
            <td style={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}>
              Checked By:
            </td>
            <td style={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}>
              Approved By:
            </td>
            <td style={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}>
              Conforme:
            </td>
          </tr>
          <tr>
            <td
              style={{
                ...cellSx,
                height: 40,
                fontWeight: 700,
                textTransform: "uppercase",
                verticalAlign: "bottom",
              }}
            >
              <EditableCell.Inline
                id="preparedByName"
                initialValue={preparedBy}
                placeholder="Name"
              />
            </td>
            <td
              style={{
                ...cellSx,
                height: 40,
                fontWeight: 700,
                textTransform: "uppercase",
                verticalAlign: "bottom",
              }}
            >
              <EditableCell.Inline
                id="checkedByName"
                initialValue={checkedBy}
                placeholder="Name"
              />
            </td>
            <td
              style={{
                ...cellSx,
                height: 40,
                fontWeight: 700,
                textTransform: "uppercase",
                verticalAlign: "bottom",
              }}
            >
              <EditableCell.Inline
                id="approvedByName"
                initialValue={approvedBy}
                placeholder="Name"
              />
            </td>
            <EditableCell
              id="signatureReceivedPayment"
              style={{ ...cellSx, height: 40, fontWeight: 700 }}
              align="left"
              verticalAlign="bottom"
              placeholder="Name / Signature"
            />
          </tr>
          <tr>
            <td style={{ ...cellSx, fontStyle: "italic" }}>
              <EditableCell.Inline
                id="preparedByRole"
                initialValue={preparedByRole}
                placeholder="Role"
              />
            </td>
            <td style={{ ...cellSx, fontStyle: "italic" }}>
              <EditableCell.Inline
                id="checkedByRole"
                initialValue={checkedByRole}
                placeholder="Role"
              />
            </td>
            <td style={{ ...cellSx, fontStyle: "italic" }}>
              <EditableCell.Inline
                id="approvedByRole"
                initialValue={approvedByRole}
                placeholder="Role"
              />
            </td>
            <td style={{ ...cellSx, fontStyle: "italic" }}>
              Signature Over Printed Name
            </td>
          </tr>
        </tbody>
      </table>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        {COLGROUP}
        <tbody>
          <tr>
            <td
              colSpan={6}
              style={{
                ...cellSx,
                textAlign: "right",
                fontWeight: 300,
                fontStyle: "italic",
              }}
            >
              System Generated PO - {new Date().toLocaleString("en-PH")}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function PreviewPOView({
  companyName = DEFAULTS.companyName,
  companyAddress = DEFAULTS.companyAddress,
  companyEmail = DEFAULTS.companyEmail,
  companyPhoneNo = DEFAULTS.companyPhoneNo,
  companyTIN = DEFAULTS.companyTIN,
  companyLogo = DEFAULTS.companyLogo,
  poNo = DEFAULTS.poNo,
  date = DEFAULTS.date,
  paymentTerms = DEFAULTS.paymentTerms,
  supplierName = DEFAULTS.supplierName,
  supplierAddress = DEFAULTS.supplierAddress,
  contactPerson = DEFAULTS.contactPerson,
  shippingDetails = DEFAULTS.shippingDetails,
  items = DEFAULTS.items,
  freight = DEFAULTS.freight,
  ewt = DEFAULTS.ewt,
  subtotal: subtotalProp,
  total: totalProp,
  payable: payableProp,
  preparedBy = DEFAULTS.preparedBy,
  preparedByRole = DEFAULTS.preparedByRole,
  checkedBy = DEFAULTS.checkedBy,
  checkedByRole = DEFAULTS.checkedByRole,
  approvedBy = DEFAULTS.approvedBy,
  approvedByRole = DEFAULTS.approvedByRole,
}) {
  const subtotal =
    subtotalProp ?? items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  // subtotal + freight = total, then total - ewt = TOTAL (the payable).
  const total = totalProp ?? subtotal + Number(freight ?? 0);
  const payable = payableProp ?? total - Number(ewt ?? 0);

  const [datesDisabled, setDatesDisabled] = useState(false);

  return (
    <PageLayout
      title="PO Preview"
      subtitle="Quick overview"
      upDownIndicator={false}
    >
      <PrintAreaStructure
        onExport={() => console.log("wire up export")}
        onDisableDatesChange={setDatesDisabled}
        header={
          <POHeaderTable
            companyName={companyName}
            companyAddress={companyAddress}
            companyEmail={companyEmail}
            companyPhoneNo={companyPhoneNo}
            companyTIN={companyTIN}
            companyLogo={companyLogo}
            poNo={poNo}
            date={datesDisabled ? "" : date}
            paymentTerms={paymentTerms}
            supplierName={supplierName}
            supplierAddress={supplierAddress}
            contactPerson={contactPerson}
            shippingDetails={shippingDetails}
          />
        }
        footer={
          <POFooterTable
            freight={freight}
            ewt={ewt}
            subtotal={subtotal}
            payable={payable}
            preparedBy={preparedBy}
            preparedByRole={preparedByRole}
            checkedBy={checkedBy}
            checkedByRole={checkedByRole}
            approvedBy={approvedBy}
            approvedByRole={approvedByRole}
          />
        }
      >
        <POItemsTable items={items} />
      </PrintAreaStructure>
    </PageLayout>
  );
}
