import usePurchase from "./usePurchase";
import PurchaseView from "./PurchaseView";

export default function TransactionForPurchase() {
  const props = usePurchase();
  return <PurchaseView {...props} />;
}
