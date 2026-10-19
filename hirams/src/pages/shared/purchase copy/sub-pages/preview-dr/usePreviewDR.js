import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const DEFAULTS = {
  clientName: "—",
  clientAddress: "",
  clientBusinessStyle: "",
  contactPerson: "",
  contactNumber: "",
  code: "",
  items: [],
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

export default function usePreviewDR() {
  const location = useLocation();
  const state = location.state || {};

  return useMemo(() => {
    const {
      transaction,
      deliveredOptions = [],
      assignedAOName,
      assignedAONo,
      transactionCode,
      receiptNumber,
    } = state;

    const client = transaction?.client || {};

    const items = deliveredOptions.map((item) => ({
      itemQty: item.itemQty ?? 0,
      itemUOM: item.itemUOM || "Unit",
      itemName: item.itemName || "—",
      specLines: specsToLines(item.itemSpecs),
      serials: item.options
        ? item.options
            .flatMap((opt) => opt.deliveredRows || [])
            .flatMap((row) => row.serialNumbers || [])
            .filter(Boolean)
        : [],
    }));

    return {
      clientName:
        client.strClientNickName || client.strClientName || DEFAULTS.clientName,
      clientTIN: client.strTIN || "",
      clientAddress: client.strAddress || "",
      clientBusinessStyle: client.strBusinessStyle || "",
      contactPerson: assignedAOName || "",
      contactNumber: assignedAONo || client.strContactNumber || "",
      code: receiptNumber || transactionCode || "",
      items,
    };
  }, [state]);
}
