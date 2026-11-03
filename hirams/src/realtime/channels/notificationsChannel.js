import echo from "../../lib/echo.js";

/**
 * notificationsChannel — the notification feed's live sync.
 *
 * The backend broadcasts `notification.updated` on the public
 * `notifications` channel for every write (created / read /
 * read_all / deleted). Re-dispatched as a window event so
 * useNotifications can refetch the shared feed, which propagates to
 * every mounted surface (bell badge, dropdown, side panel).
 */
export function subscribeNotificationsChannel() {
  const channel = echo.channel("notifications");

  channel.listen(".notification.updated", (e) => {
    window.dispatchEvent(
      new CustomEvent("notification_data_updated", { detail: e })
    );
  });

  return () => echo.leaveChannel("notifications");
}
