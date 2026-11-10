import { useLocation } from "react-router-dom";
import MediaRoute from "../../../../../routes/MediaRoute.jsx";

// sessionStorage keeps the preview alive across a REFRESH or a DIRECT URL
// open — React Router's route state is wiped on both, so the page re-reads
// the payload the last Cost Breakdown / Export modal handed over. The
// Transactions sidebar reads the same slot for its highlight.
const PREVIEW_PRICING_STATE_KEY = "previewPricingState";

function readStoredPreviewState() {
  try {
    return JSON.parse(sessionStorage.getItem(PREVIEW_PRICING_STATE_KEY) || "null");
  } catch {
    return null;
  }
}

export default function usePreviewPricing() {
  const location = useLocation();
  // Everything the grid needs arrives in the route state handed over by
  // ExportCanvasModal: the raw canvas items (or the chosen pricing set's
  // items) + the unit selling prices the modal computed (markup applied —
  // or the set's own stored prices on the Pre-Canvass side). The company
  // rides along so the print can open with the client's logo.
  //
  // On a refresh (or opening /preview-pricing straight in the address bar)
  // the route state is gone — fall back to the sessionStorage copy.
  const {
    transaction = null,
    clientName = "",
    items = [],
    unitSellingPrices = {},
    company = null,
  } = location.state || readStoredPreviewState() || {};

  // BRAND/MODEL — the chosen purchase option carries it. Same rule the
  // Excel export uses: a value on both sides reads "Brand - Model", a
  // missing side reads "n/a", none at all reads "n/a - n/a".
  const brandModelOf = (item) => {
    const chosen = (item.purchaseOptions || []).find(
      (o) => Number(o.bIncluded) === 1,
    );
    const brand = (chosen?.strBrand || "").trim();
    const model = (chosen?.strModel || "").trim();
    if (!brand && !model) return "n/a - n/a";
    return `${brand || "n/a"} - ${model || "n/a"}`;
  };

  // One row per priced item — the selling price is the modal's computed
  // unit price and the line total is ROUNDED unit × qty, matching the
  // modal's own preview math (and the Excel report).
  const rows = items
    .map((item, idx) => {
      const qty = Number(item.qty || 0);
      const unit = Number(unitSellingPrices[item.id] || 0);
      return {
        id: item.id ?? `row-${idx}`,
        n: item.nItemNumber ?? idx + 1,
        description: item.name || "—",
        brandModel: brandModelOf(item),
        qty,
        uom: (item.uom ?? "").toUpperCase(),
        unitSelling: unit > 0 ? unit : null,
        total: qty > 0 && unit > 0 ? Math.round(unit) * qty : null,
      };
    })
    .filter((r) => r.unitSelling !== null && r.total !== null);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  // SAVED-PDF TITLE — "TXNCODE(ClientNick)-TransactionPricing(CompanyNick)"
  // e.g. "9849H(PGOM)-TransactionPricing(HiRams)". Filesystem-illegal
  // characters are stripped first, so a code with a slash stays valid
  // on disk.
  const clientNick = clientName || transaction?.clientName || "";
  const companyNick =
    company?.strCompanyNickName || company?.strCompanyName || "";
  const pdfFileName =
    `${transaction?.strCode || ""}(${clientNick})-TransactionPricing(${companyNick})`
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  return {
    clientName: clientName || transaction?.clientName || "—",
    transactionCode: transaction?.strCode || "—",
    title: transaction?.strTitle || "",

    // Company identity for the print header — same resolution the voucher
    // preview uses (logo filename → API images URL, null when there is
    // none so the header row is simply not drawn).
    companyName: company?.strCompanyName
      ? company.strCompanyName.toUpperCase()
      : "",
    companyLogo: company?.strLogo ?? null,
    companyLogoSrc: MediaRoute.resolveCompanyLogo(company),

    rows,
    grandTotal,
    pdfFileName,
  };
}
