/**
 * For Purchase only.
 *
 * The workspace logic itself lives in hooks/useTransactionWorkspace.js —
 * shared with the Collection page, which is the same screen at a different
 * transaction status. This wrapper exists so PurchaseView can keep importing
 * a page-local hook and the two pages stay independently readable.
 *
 * See useCollection.js for the counterpart.
 */
import useTransactionWorkspace from "../../../hooks/useTransactionWorkspace.js";

export default function usePurchase() {
  return useTransactionWorkspace();
}
