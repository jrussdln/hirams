import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useKeysLabels from "../../../../../hooks/useKeysLabels.js";
import { buildRoleGroups } from "../../../../../hooks/useRoleBuilder.js";
import UserAPI from "../../../../../api/endpoints/user.api.js";

export default function usePreviewPO() {
  const location = useLocation();
  const { userTypes } = useKeysLabels();
  const [resolvedSignatories, setResolvedSignatories] = useState(null);
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

  // ── Signatories self-resolution ──────────────────────────────────────
  // The update view snapshots these names into navigation state, but the
  // snapshot reads "—" whenever the users/mappings fetch had not landed
  // (or outright failed) before Preview was clicked. When that happens,
  // the preview resolves the names itself.
  const needsCheckedBy = !checkByOtherAOName || checkByOtherAOName === "—";
  const needsApprovedBy = !generalManagerName || generalManagerName === "—";

  useEffect(() => {
    if ((!needsCheckedBy && !needsApprovedBy) || !userTypes || Object.keys(userTypes).length === 0)
      return;
    let cancelled = false;
    UserAPI.getAllUsers()
      .then((res) => {
        if (cancelled) return;
        const users = res.users ?? [];
        const buildName = (u) =>
          [
            u?.strFName,
            u?.strMName ? u.strMName[0].toUpperCase() + "." : "",
            u?.strLName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        const { accountOfficerKey, generalManagerKey } =
          buildRoleGroups(userTypes);
        // Checked by — an Account Officer OTHER than the transaction's
        // assigned one. General Manager — the first GM-type account.
        const assignedAOUserId = Number(
          firstOption?.purchase_option?.transaction_item?.transaction?.user
            ?.nUserId,
        );
        const ao = users.find(
          (u) =>
            accountOfficerKey.includes(String(u.cUserType)) &&
            Number(u.nUserId) !== assignedAOUserId,
        );
        const gm = users.find((u) =>
          generalManagerKey.includes(String(u.cUserType)),
        );
        setResolvedSignatories({
          checkedBy: ao ? buildName(ao) || "—" : "—",
          approvedBy: gm ? buildName(gm) || "—" : "—",
        });
      })
      .catch((err) =>
        console.error("Failed to fetch users for PO signatories:", err),
      );
    return () => {
      cancelled = true;
    };
  }, [needsCheckedBy, needsApprovedBy, userTypes]);

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

  // Same field names your Laravel controller reads off purchase_option
  const items = options.map((opt, idx) => {
    const p = opt?.purchase_option ?? {};
    const qty = Number(p.nQuantity ?? 0);
    const unitPrice = Number(p.dUnitPrice ?? 0);
    const brandModel = [p.strBrand, p.strModel]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase();
    const itemName = (p?.transaction_item?.strName ?? "").toUpperCase();
    const desc = brandModel || itemName || "—";
    // The item name rides BELOW the brand · model line as the cell's
    // small italic subline — but only while brand · model is actually
    // leading, since the fallback already shows the name itself.
    const subName = brandModel && itemName ? itemName : "";

    return {
      no: idx + 1,
      desc,
      subName,
      uom: (p.strUOM ?? "").toUpperCase(),
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
    contactName,
    contactNumber,

    items,
    subtotal,
    freight,
    total,
    ewt,
    payable,

    // Signatories — snapshot values win; the "—" gaps fall back to the
    // preview's own lookup of the user list.
    preparedBy: assignedAOName ?? "—",
    preparedByRole: "Account Officer",
    checkedBy:
      !needsCheckedBy
        ? checkByOtherAOName ?? "—"
        : (resolvedSignatories?.checkedBy ?? "—"),
    checkedByRole: "Account Officer",
    approvedBy:
      !needsApprovedBy
        ? generalManagerName ?? "—"
        : (resolvedSignatories?.approvedBy ?? "—"),
    approvedByRole: "General Manager",
  };
}
