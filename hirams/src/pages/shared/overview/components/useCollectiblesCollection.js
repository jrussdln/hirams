import { useEffect, useState } from "react";
import OverviewAPI from "../../../../api/endpoints/overview.api";
import { getItem, setItem } from "../../../../utils/storage/localStorage";

const CACHE_KEY = "overview_collectibles_cache";
const EMPTY = { collectibles: [], collections: [] };

/**
 * The Collectibles / Collection card's data, shared by the Management and
 * Finance dashboards. Seeded from cache so a revisit paints instantly, then
 * refreshed from the API once on mount.
 */
export default function useCollectiblesCollection() {
  const [data, setData] = useState(() => getItem(CACHE_KEY, EMPTY));

  useEffect(() => {
    let mounted = true;
    OverviewAPI.getCollectiblesCollection()
      .then((res) => {
        if (!mounted) return;
        const next = {
          collectibles: res?.collectibles || [],
          collections: res?.collections || [],
        };
        setData(next);
        setItem(CACHE_KEY, next);
      })
      .catch((err) =>
        console.error("Failed to load collectibles and collections", err),
      );
    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
