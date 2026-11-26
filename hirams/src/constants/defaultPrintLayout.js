/**
 * Default print layout for each printable document.
 *
 *   paperSize   → a key of PrintPreview's PAPER_SIZES  (A4 | Letter | Legal | 8.5x13)
 *   orientation → "portrait" | "landscape"
 *   margin      → a key of PrintPreview's MARGINS     (Normal | Narrow | Wide)
 *
 * Keys below are the document names used by the preview pages.
 */
export const DEFAULT_PRINT_LAYOUT = {
  // Disbursement Voucher — standard sheet, portrait.
  Voucher: {
    paperSize: "A4",
    orientation: "portrait",
    margin: "Narrow",
  },

  // Purchase Order — standard sheet, portrait.
  PO: {
    paperSize: "A4",
    orientation: "portrait",
    margin: "Narrow",
  },

  // Cheque — laid out across the width of pre-printed cheque stock.
  Cheque: {
    paperSize: "Letter",
    orientation: "landscape",
    margin: "Custom",
  },

  // Delivery Receipt — standard sheet, portrait.
  DR: {
    paperSize: "Letter",
    orientation: "portrait",
    margin: "Normal",
  },

  // Sales Invoice — standard sheet, portrait.
  SI: {
    paperSize: "Letter",
    orientation: "portrait",
    margin: "Normal",
  },

  // Pricing — standard sheet, portrait.
  Pricing: {
    paperSize: "A4",
    orientation: "portrait",
    margin: "Narrow",
  },
};

/** Generic sheet setup, used when a caller names no document. */
export const FALLBACK_PRINT_LAYOUT = {
  paperSize: "A4",
  orientation: "portrait",
  margin: "Normal",
};

/**
 * Preview-only horizontal ruler guides, in millimetres from the top of the
 * page. Keyed `<companyId>-<docType>` — the same key scheme as the blank form
 * templates used by the preview overlay. Only the companies/documents listed
 * here get guides (e.g. the 105 mm / 230 mm marks on company 3's DR form).
 */
export const PREVIEW_RULER_GUIDES = {
  "3-DR": [107, 231],
  "3-SI": [104.9, 198.5],
  "2-DR": [107, 231],
  "2-SI": [104.9, 198.5],
   "1-DR": [53.4, 220.7],
  "1-SI": [49.5, 205],
};

/**
 * Paged rows are confined to the vertical band between the first and last
 * guide (mm from the page top). Content past the last guide continues on the
 * next page. No guides → no band → the normal page-margin pagination applies.
 */
export const getContentWindow = (guides) =>
  guides.length >= 2
    ? { top: guides[0], bottom: guides[guides.length - 1] }
    : null;

/** @returns {number[]} guide positions in mm (empty when none are configured) */
export const getRulerGuides = (documentType, companyId) => {
  if (companyId === null || companyId === undefined || companyId === "") return [];
  const key = `${String(companyId).trim()}-${String(documentType ?? "")
    .trim()
    .toUpperCase()}`;
  return PREVIEW_RULER_GUIDES[key] ?? [];
};

/**
 * The `default*` props PrintPreview takes, plus the company-specific ruler
 * guides, for one document type. An unknown type falls back to the generic
 * sheet setup.
 *
 *   <PrintPreview {...getPrintLayoutProps("SI")} ... />
 */
export const getPrintLayoutProps = (documentType, companyId) => {
  const layout = DEFAULT_PRINT_LAYOUT[documentType] ?? FALLBACK_PRINT_LAYOUT;
  const rulerGuides = getRulerGuides(documentType, companyId);

  return {
    defaultPaperSize: layout.paperSize,
    defaultOrientation: layout.orientation,
    defaultMargin: layout.margin,
    rulerGuides,
    contentWindowMm: getContentWindow(rulerGuides),
  };
};

export default DEFAULT_PRINT_LAYOUT;
