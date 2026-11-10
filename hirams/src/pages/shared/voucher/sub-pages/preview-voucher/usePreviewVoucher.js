import { useLocation } from "react-router-dom";

export default function usePreviewVoucher() {
  const location = useLocation();
  const {
    voucher,
    isAssigneeType,
    payeeName,
    // The voucher's supplier nickname — rides under each PO code line
    // as the particulars' small italic subline (supplier type only).
    payeeNickName,
    supplierTIN,
    supplierAddress,
    particulars = [],

    ewtAmount,
    company,
    jevEntries = [],
    cPaymentTerms,
    onlineKey,
    cashKey,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    onlineLabel,
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,
  } = location.state || {};
  const buildAccountPath = (account) => {
    const path = [];
    let current = account;
    let guard = 0;
    while (current && guard < 10) {
      path.unshift(current.display_name ?? "—");
      current = current.parent ?? null;
      guard++;
    }
    return path.join(" / ");
  };

  const accountRows = (Array.isArray(jevEntries) ? jevEntries : []).map((e) => {
    const isFrom = Number(e.dAmount) < 0;
    return {
      id: e.nJEVEntryId,
      title: buildAccountPath(e.journal_account),
      fromAmount: isFrom ? Math.abs(Number(e.dAmount || 0)) : null,
      toAmount: isFrom ? null : Number(e.dAmount || 0),
    };
  });

  // The FREIGHT of the POs the voucher carries — the sum of their freight
  // (a voucher without POs — an assignee voucher — has none).
  const freight = (voucher?.voucher_suppliers ?? []).reduce(
    (sum, vs) => sum + Number(vs?.purchase_order?.dFreight || 0),
    0,
  );

  const items = (Array.isArray(particulars) ? particulars : []).map((p) =>
    isAssigneeType
      ? {
          particular: p.particular ?? "—",
          qty: Number(p.quantity ?? 1),
          uom: (p.strUOM ?? "").toUpperCase(),
          unitPrice: Number(
            p.unitAmount ?? (p.amount ?? 0) / Number(p.quantity || 1),
          ),
          subline: "",
        }
      : {
          particular: p.particular ?? "—",
          qty: 1,
          uom: (p.strUOM ?? "").toUpperCase(),
          unitPrice: Number(p.amount ?? 0),
          // Supplier nickname and JEV title under the PO code — supplier-type rows
          // only, forced to caps.
          subline: (voucher?.jev?.strTitle ?? "").toUpperCase(),
        },
  );

  // SAVED-PDF TITLE — "DVNUMBER(SupplierNick)-DisbursementVoucher(
  // CompanyNick)", e.g. "DV2026-0134(PRIMA)-DisbursementVoucher(HiRams)".
  // Filesystem-illegal characters are stripped first, since a voucher
  // number can carry slashes.
  const companyNick =
    company?.strCompanyNickName || company?.strCompanyName || "";
  const pdfFileName = `${
    voucher?.strNumber ?? ""
  }(${payeeNickName ?? ""})-DisbursementVoucher(${companyNick})`
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    voucherNo: voucher?.strNumber ?? "—",
    tin: supplierTIN ?? "",
    date: new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),

    payeeName: payeeName ?? "—",
    payeeAddress: supplierAddress ?? "",

    // JEV title for supplier type
    jevTitle: voucher?.jev?.strTitle,

    items,

    freight,

    // Save-as-PDF file name: DVNUMBER(SupplierNick)-DisbursementVoucher(CompanyNick)
    pdfFileName,

    ewtDiscount: Number(ewtAmount ?? 0),

    companyName: company?.strCompanyName
      ? company.strCompanyName.toUpperCase()
      : "",
    companyLogo: company?.strLogo ?? null,

      accountRows,
    cPaymentTerms,
    onlineKey,        // add
    cashKey,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    onlineLabel,      // add
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,
  };
}
