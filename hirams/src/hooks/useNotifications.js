import { useCallback, useEffect, useState } from "react";
import { getItem, setItem, hasItem } from "../utils/storage/localStorage";
import NotificationAPI from "../api/endpoints/notification.api";

/* ── Module-level shared feed ─────────────────────────────────────
 * Every surface showing notifications (bell badge + dropdown, mobile
 * sheet, the right-side panel) renders from the SAME list. Optimistic
 * writes go through `commit`, so marking a row read in the panel
 * instantly drops the badge in the header — no second fetch needed.
 * Requests are de-duped with one in-flight promise shared by all.
 *
 * The feed persists per user (notifications_cache_<userId>) so a reload
 * or revisit renders instantly from cache — the mount fetch silently
 * refreshes it.
 */
const cacheKey = () => {
  const me = getItem("user", {}) || {};
  return `notifications_cache_${me?.nUserId ?? "anon"}`;
};

let sharedRows = getItem(cacheKey(), []);
let inFlight = null;

const subscribers = new Set();

const commit = (rows) => {
  sharedRows = rows;
  setItem(cacheKey(), rows);
  subscribers.forEach((sync) => sync());
};

const fetchAll = async () => {
  if (!inFlight) {
    inFlight = NotificationAPI.list()
      .then(({ data }) => commit(data || []))
      .catch((error) => console.error("Error fetching notifications:", error))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

/**
 * useNotifications
 *
 * Each surface mounts its own instance, but all instances SHARE the
 * feed above. `fetchOnMount` unfolds fresh data at open time (the
 * dropdown body and the side panel each trigger one).
 *
 * Returns { notifications, unreadCount, loading, refresh,
 *           markRead, markAllRead, remove }.
 */
export default function useNotifications({ fetchOnMount = true } = {}) {
  const [rows, setRows] = useState(sharedRows);
  // Seeded from cache → no skeleton flash; the mount refresh below is
  // then silent. No cache → normal visible load.
  const [loading, setLoading] = useState(
    () => fetchOnMount && !hasItem(cacheKey()),
  );

  useEffect(() => {
    const sync = () => setRows([...sharedRows]);
    subscribers.add(sync);
    sync();
    return () => subscribers.delete(sync);
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    await fetchAll();
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    if (fetchOnMount) refresh({ silent: hasItem(cacheKey()) });
  }, [fetchOnMount, refresh]);

  /* Live sync — the backend broadcasts notification.updated on every
     write (created / read / read_all / deleted) through the
     notifications channel (RealtimeProvider → notification_data_updated
     here). Events for another user are ignored; for our user the feed
     refetches once (the in-flight promise de-dupes across instances). */
  useEffect(() => {
    const onDataUpdated = (e) => {
      const me = getItem("user", {});
      const userId = e.detail?.userId;
      if (userId != null && me?.nUserId != null
        && String(userId) !== String(me.nUserId)) {
        return;
      }
      fetchAll();
    };
    window.addEventListener("notification_data_updated", onDataUpdated);
    return () =>
      window.removeEventListener("notification_data_updated", onDataUpdated);
  }, []);

  const unreadCount = rows.filter((n) => !n.bIsRead).length;

  const markRead = useCallback(async (id) => {
    commit(
      sharedRows.map((n) =>
        n.nNotificationId === id
          ? { ...n, bIsRead: true, dtReadAt: new Date() }
          : n,
      ),
    );
    try {
      await NotificationAPI.markRead(id);
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    commit(sharedRows.map((n) => ({ ...n, bIsRead: true })));
    try {
      await NotificationAPI.markAllRead();
    } catch (error) {
      console.error("Error marking all notifications read:", error);
    }
  }, []);

  const remove = useCallback(async (id) => {
    commit(sharedRows.filter((n) => n.nNotificationId !== id));
    try {
      await NotificationAPI.remove(id);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  return {
    notifications: rows,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    remove,
  };
}
