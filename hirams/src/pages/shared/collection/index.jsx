import useCollection from "./useCollection";
import CollectionView from "./CollectionView";

export default function TransactionForCollection() {
  const props = useCollection();
  return <CollectionView {...props} />;
}
