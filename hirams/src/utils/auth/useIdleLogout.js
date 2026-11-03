import React from "react";
import { createRoot } from "react-dom/client";
import { getItem } from "../storage/localStorage";
import { clearClientState } from "./clearClientState";
import IdleLogoutPrompt from "../../components/ui/auth/IdleLogoutPrompt";

const BASE_PATH = import.meta.env.MODE === "production" ? "/hirams" : "/";

// 2 hours without ANY interaction (mouse, keyboard, touch, scroll) fires
// the Inactivity prompt. Only USER activity resets the clock — background
// API polling and realtime events do not, because an unattended machine
// must still be challenged even while data quietly streams through it.
const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000; // TEMP test value — restore to 2 * 60 * 60 * 1000,5_000
const IDLE_LABEL = "2 hrs";
// Once the prompt is up, the user has this much time to keep the session;
// no answer means the page signs itself out.
const GRACE_SECONDS = 60; // TEMP test value — keep 60 in production

/** Imperatively mounts <IdleLogoutPrompt /> (same detached-root pattern as
 *  the sign-out modal in useLogout) and tears it down once the user has
 *  restored the session — or once the countdown carried the session away. */
const mountIdlePrompt = ({ onStay, onLogout }) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    container.remove();
  };

  root.render(
    React.createElement(IdleLogoutPrompt, {
      open: true,
      idleLabel: IDLE_LABEL,
      graceSeconds: GRACE_SECONDS,
      onRestore: onStay,
      onLogout: () => {
        cleanup();
        onLogout();
      },
    }),
  );

  return cleanup;
};

/** Arms the global inactivity watcher. Mount ONCE, near the app root
 *  (AppRoute). It is inert while nobody is signed in — it reads the token
 *  at check time, so it arms/disarms itself as users come and go. */
export const useIdleLogout = () => {
  React.useEffect(() => {
    let lastActive = Date.now();
    let promptOpen = false;
    let promptCleanup = null;

    const signOut = () => {
      clearClientState()
        .catch((e) => console.error("Idle logout cleanup failed:", e))
        .finally(() => {
          window.location.href = `${BASE_PATH}?reason=expired`;
        });
    };

    const showPrompt = () => {
      promptOpen = true;
      promptCleanup = mountIdlePrompt({
        // Both buttons keep the session — the watcher restarts the idle
        // clock from zero the moment a choice is made.
        onStay: () => {
          promptCleanup?.();
          promptCleanup = null;
          promptOpen = false;
          lastActive = Date.now();
        },
        onLogout: signOut,
      });
    };

    const markActive = () => {
      if (promptOpen) return; // inside the prompt the countdown rules
      lastActive = Date.now();
    };
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
      "click",
    ];
    for (const event of events) {
      window.addEventListener(event, markActive, { passive: true });
    }

    const tick = () => {
      if (promptOpen) return; // the countdown decides from here on
      if (Date.now() - lastActive < IDLE_LIMIT_MS) return;
      // Only meaningful for a signed-in session; on the login/register
      // screens there is nothing to protect and nothing to expire.
      const token = getItem("token");
      if (!token || token === "undefined" || token === "null") return;
      showPrompt();
    };

    const timer = setInterval(tick, 1_000); // TEMP test value — restore to 30_000
    return () => {
      clearInterval(timer);
      promptCleanup?.();
      for (const event of events) {
        window.removeEventListener(event, markActive);
      }
    };
  }, []);
};
