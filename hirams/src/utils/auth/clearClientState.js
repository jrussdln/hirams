// utils/auth/clearClientState.js
import { clearAll } from "../storage/localStorage";
import { clearMappings } from "../storage/mappingCache.js";

/**
 * Wipes all client-side state. Each section is independently try/caught,
 * so a failure in one doesn't prevent the rest.
 */
export const clearClientState = async () => {
  clearAll();
  // localStorage.clearAll(); // Kept user data for persistence
  clearMappings();

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("Could not clear caches:", e);
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("Could not unregister service workers:", e);
  }

  try {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (!name) return;
      const base = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = base;
      document.cookie = `${base};domain=${window.location.hostname}`;
    });
  } catch (e) {
    console.warn("Could not clear cookies:", e);
  }
};