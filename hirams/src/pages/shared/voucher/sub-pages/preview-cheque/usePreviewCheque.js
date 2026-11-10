import { useLocation } from "react-router-dom";
import { numberToWords } from "../../../../../utils/helpers/numberToWords.js";

// Formats a Date as "MMDDYYYY" (digits only) for the cheque date boxes.
function toDigitDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

export default function usePreviewCheque() {
  const location = useLocation();
  const { cheque, payeeName, amount, payeeNickName, company } =
    location.state || {};

  const chequeAmount = Number(amount ?? cheque?.dAmount ?? 0);
  const chequeDate = cheque?.dtChequeDate
    ? new Date(cheque.dtChequeDate)
    : new Date();

  // SAVED-PDF TITLE — "SupplierNick-Cheque(CompanyNick)", e.g.
  // "PRIMA-Cheque(HiRams)". Filesystem-illegal characters are stripped
  // first, since a nickname can carry punctuation.
  const companyNick =
    company?.strCompanyNickName || company?.strCompanyName || "";
  const pdfFileName = `${payeeNickName ?? ""}-Cheque(${companyNick})`
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    date: toDigitDate(chequeDate),
    payeeName: payeeName ?? "—",
    amount: chequeAmount,
    amountInWords: numberToWords(chequeAmount),

    // Save-as-PDF file name: SupplierNick-Cheque(CompanyNick)
    pdfFileName,
  };
}