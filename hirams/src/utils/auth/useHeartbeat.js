import { useEffect } from "react";
import { ENV } from "../../config/env";
import { getItem } from "../storage/localStorage";

/**
 * useHeartbeat
 *
 * Presence reporter for "who is currently using the app":
 *
 *   - Every 30s a POST /auth/heartbeat stamps tblusers.dtLastSeen.
 *     The backend scheduler flips sessions with no heartbeat for 2
 *     minutes offline — that's how a crashed / force-killed browser
 *     (which never gets to send a logout) is detected.
 *
 *   - On pagehide (tab close / browser quit) a keepalive fetch POSTs
 *     /auth/offline, marking the user offline RIGHT AWAY instead of
 *     waiting for the prune. keepalive lets the request outlive the
 *     page it belongs to. Harmless on reload: the very first
 *     heartbeat (sent on mount below) flags the user online again.
 *
 * Mounted ONCE near the app root (AppRoute) — inert while nobody is
 * signed in. The goodbye ping is best-effort: sendBeacon() can't carry
 * the Bearer token, so a keepalive fetch is used instead.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

export const useHeartbeat = () => {
  useEffect(() => {
    const signedIn = () => !!getItem("token");

    const headers = () => ({
      Authorization: `Bearer ${getItem("token")}`,
      Accept: "application/json",
    });

    const ping = async () => {
      if (!signedIn()) return;
      try {
        await fetch(`${ENV.API_BASE_URL}auth/heartbeat`, {
          method: "POST",
          headers: headers(),
        });
      } catch {
        /* network blip — the next beat retries */
      }
    };

    const goodbye = () => {
      if (!signedIn()) return;
      try {
        fetch(`${ENV.API_BASE_URL}auth/offline`, {
          method: "POST",
          keepalive: true, // survives the page dying
          headers: headers(),
        }).catch(() => {});
      } catch {
        /* browser refused late traffic — the prune still catches it */
      }
    };

    ping(); // be visible the moment the app opens (also undoes the prune)
    const timer = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    window.addEventListener("pagehide", goodbye, { capture: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", goodbye, { capture: true });
    };
  }, []);
};
