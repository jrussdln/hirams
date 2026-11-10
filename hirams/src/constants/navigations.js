export const SECTION_LABELS = {
  overview: "OVERVIEW",
  management: "MANAGEMENT",
  transaction: "TRANSACTION",
  records: "RECORDS",
  accounting: "ACCOUNTING",
};

// Which pages belong to which sidebar section (SECTION_LABELS value) —
// drives the GROUP-level auto-open: landing on any of these routes (via a
// reroute, Back button, or a direct URL) uncollapses its whole section, the
// same way each section nav's autoOpen reveals the highlighted item inside
// it. Keep in sync with the per-nav `isOnPage` membership lists the navs
// compute for their highlights — this is the group mirror of those lists.
export const SECTION_ROUTES = {
  [SECTION_LABELS.overview]: ["/dashboard"],
  [SECTION_LABELS.management]: [
    "/user",
    "/client",
    "/supplier",
    "/assignee",
    "/company",
    "/direct-cost",
  ],
  [SECTION_LABELS.transaction]: [
    "/transaction",
    "/transaction-canvas",
    "/transaction-pricing-set",
    "/transaction-pricing",
    "/transaction-for-purchase",
    "/transaction-for-collection",
    "/preview-pricing",
    "/item-purchasing",
    "/item-purchasing-update",
    "/preview-po",
    "/quantity-history",
    "/transaction-archive",
  ],
  [SECTION_LABELS.records]: ["/inventory"],
  [SECTION_LABELS.accounting]: [
    "/voucher",
    "/voucher-update",
    "/journal-entry-voucher",
    "/jev-update",
    "/journal-account",
  ],
};
