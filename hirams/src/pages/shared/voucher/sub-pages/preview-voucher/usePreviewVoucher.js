import { useLocation } from "react-router-dom";

export default function usePreviewVoucher() {
  const location = useLocation();
  const {
    voucher,
    isAssigneeType,
    payeeName,
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

  const accountRows = jevEntries.map((e) => {
    const isFrom = Number(e.dAmount) < 0;
    return {
      id: e.nJEVEntryId,
      title: buildAccountPath(e.journal_account),
      fromAmount: isFrom ? Math.abs(Number(e.dAmount || 0)) : null,
      toAmount: isFrom ? null : Number(e.dAmount || 0),
    };
  });
console.log(onlineLabel);
  // The FREIGHT of the POs the voucher carries — the sum of their freight
  // (a voucher without POs — an assignee voucher — has none).
  const freight = (voucher?.voucher_suppliers ?? []).reduce(
    (sum, vs) => sum + Number(vs?.purchase_order?.dFreight || 0),
    0,
  );

  const items = particulars.map((p) =>
    isAssigneeType
      ? {
          particular: p.particular ?? "—",
          qty: Number(p.quantity ?? 1),
          uom: p.strUOM ?? "",
          unitPrice: Number(
            p.unitAmount ?? (p.amount ?? 0) / Number(p.quantity || 1),
          ),
        }
      : {
          particular: p.particular ?? "—",
          qty: 1,
          uom: p.strUOM ?? "",
          unitPrice: Number(p.amount ?? 0),
        },
  );

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

    items,

    freight,

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
