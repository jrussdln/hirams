import { useLocation } from "react-router-dom";

export default function usePreviewPO() {
  const location = useLocation();
  const {
    po,
    options = [],
    assignedAOName,
    checkByOtherAOName,
    generalManagerName,
    firstOption,
    freightAmount,
    ewtAmount,
    cashKey,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,
  } = location.state || {};

  // Same lookup chain as the Laravel export/preview endpoints:
  // firstOption.purchase_option.transaction_item.transaction.company
  // firstOption.purchase_option.supplier
  const company =
    firstOption?.purchase_option?.transaction_item?.transaction?.company ?? {};
  const supplier = firstOption?.purchase_option?.supplier ?? {};

  const contactName =
    firstOption?.purchase_option?.supplier_contact?.strName ?? null;

  const contactNumber =
    firstOption?.purchase_option?.supplier_contact?.strNumber ?? null;
  const contactPerson =
    contactName && contactNumber
      ? `${contactName} - ${contactNumber}`
      : (contactName ?? contactNumber ?? "");

  // Same field names your Laravel controller reads off purchase_option
  const items = options.map((opt, idx) => {
    const p = opt?.purchase_option ?? {};
    const qty = Number(p.nQuantity ?? 0);
    const unitPrice = Number(p.dUnitPrice ?? 0);
    const brandModel = [p.strBrand, p.strModel].filter(Boolean).join(" · ");
    const desc = brandModel || p?.transaction_item?.strName || "—";

    return {
      no: idx + 1,
      desc,
      uom: p.strUOM ?? "",
      qty,
      unitPrice,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const freight = Number(freightAmount ?? 0);
  const ewt = Number(ewtAmount ?? 0);
  // The sheet's arithmetic: subtotal + freight = total, then total - ewt =
  // TOTAL (the amount payable).
  const total = subtotal + freight;
  const payable = total - ewt;

  const shippingRaw = po?.strShippingDetails ?? "";
  // Quill stores rich HTML — keep it as-is so it can be rendered with
  // dangerouslySetInnerHTML in the preview. Don't strip tags anymore.
  const paymentTermsLabel = (() => {
    const code = po?.cPaymentTerms;
    if (code == null || code === "") return "";
    switch (String(code)) {
      case String(cashKey):
        return cashLabel ?? String(code);
      case String(creditCardKey):
        return creditCardLabel ?? String(code);
      case String(chequeKey):
        return chequeLabel ?? String(code);
      case String(otherPaymentTermKey):
        return otherPaymentTermLabel ?? String(code);
      default:
        return String(code);
    }
  })();
  return {
    poNo: po?.strPurchaseOrderNo ?? "—",
    date: new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),

    companyName: company?.strCompanyName
      ? company.strCompanyName.toUpperCase()
      : "—",
    companyAddress: company?.strAddress ?? "",
    companyEmail: company?.strEmail ? company.strEmail : "—",
    companyTIN: company?.strTIN ?? "",
    companyLogo: company?.strLogo ?? null,
    companyPhoneNo: company?.strPhoneNo ?? "",
    paymentTerms: paymentTermsLabel,
    shippingDetails: shippingRaw,

    supplierName: supplier?.strSupplierName
      ? supplier.strSupplierName.toUpperCase()
      : "—",
    supplierAddress: supplier?.strAddress ?? "",
    supplierTIN: supplier?.strTIN ?? "",
    contactPerson,

    items,
    subtotal,
    freight,
    total,
    ewt,
    payable,

    // signatories — same three names your Laravel writes into the sheet
    preparedBy: assignedAOName ?? "—",
    preparedByRole: "Account Officer",
    checkedBy: checkByOtherAOName ?? "—",
    checkedByRole: "Account Officer",
    approvedBy: generalManagerName ?? "—",
    approvedByRole: "General Manager",
  };
}
