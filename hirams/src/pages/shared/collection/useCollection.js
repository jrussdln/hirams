/**
 * For Collection only.
 *
 * The workspace logic itself lives in hooks/useTransactionWorkspace.js —
 * shared with the Purchase page, which is the same screen at a different
 * transaction status. This wrapper exists so CollectionView can keep
 * importing a page-local hook and the two pages stay independently readable.
 *
 * See usePurchase.js for the counterpart.
 */
import useTransactionWorkspace from "../../../hooks/useTransactionWorkspace.js";

export default function useCollection() {
  return useTransactionWorkspace();
}
