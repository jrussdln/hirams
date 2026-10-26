import useJournalEntryVoucher from "./useJournalEntryVoucher";
import JournalEntryVoucherView from "./JournalEntryVoucherView";

export default function JournalEntryVoucher() {
  const props = useJournalEntryVoucher();
  return <JournalEntryVoucherView {...props} />;
}
