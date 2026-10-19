import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const DEFAULTS = {
  clientName: "—",
  clientTIN: "",
  clientAddress: "",
  clientBusinessStyle: "",
  contactPerson: "",
  contactNumber: "",
  code: "",
  items: [],
  grandTotal: 0,
};

// Splits an itemSpecs HTML blob into plain text lines, one per <p>/<li>/<br>.
function specsToLines(html) {
  if (!html) return [];
  return html
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
}

export default function usePreviewSI() {
  const location = useLocation();
  const state = location.state || {};

  return useMemo(() => {
    const {
      transaction,
      invoiceItems = [],
      assignedAOName,
      assignedAONo,
      transactionCode,
    } = state;

    const client = transaction?.client || {};

    const items = invoiceItems.map((item) => ({
      itemQty: item.itemQty ?? 0,
      itemUOM: item.itemUOM || "Unit",
      itemName: item.itemName || "—",
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      specLines: specsToLines(item.itemSpecs),
      serials: item.options
        ? item.options
            .flatMap((opt) => opt.deliveredRows || [])
            .flatMap((row) => row.serialNumbers || [])
            .filter(Boolean)
        : [],
    }));

    const grandTotal = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);

    return {
      clientName:
        client.strClientNickName || client.strClientName || DEFAULTS.clientName,
      clientTIN: client.strTIN || "",
      clientAddress: client.strAddress || "",
      clientBusinessStyle: client.strBusinessStyle || "",
      contactPerson: assignedAOName || "",
      contactNumber: assignedAONo || client.strContactNumber || "",
      code: transactionCode || "",
      items,
      grandTotal,
    };
  }, [state]);
}