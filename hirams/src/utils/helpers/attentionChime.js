// utils/helpers/attentionChime.js
// The Needs Attention notification sound — playing a local asset.
// Browsers block audio until the user has interacted with the page.
import chimeSrc from "../../assets/audio/universfield-new-notification-051-494246.mp3";

let audioObj;
// The last count of EVERY warning sub-row in the sidebar, keyed by row.
// The first report after a page load rings if anything is already waiting;
// after that the bell rings ONLY when a row's count grows.
let lastWarningCounts = null;
let hasPendingWarnings = false;
let unlockArmed = false;

function playNow() {
  try {
    if (!audioObj) audioObj = new Audio(chimeSrc);
    audioObj.currentTime = 0;
    const attempt = audioObj.play();
    if (attempt?.catch) {
      attempt.catch(() => {
        // Autoplay blocked (no interaction yet) — ring on the first
        // interaction instead, provided work is still waiting.
        armUnlock();
      });
    }
  } catch {
    // Audio is decoration — never let it break the page.
  }
}

function armUnlock() {
  if (unlockArmed || !hasPendingWarnings) return;
  unlockArmed = true;

  const unlock = () => {
    unlockArmed = false;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (hasPendingWarnings) playNow();
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function playAttentionChime() {
  playNow();
}

/**
 * Report the current count of every sidebar sub-item that carries a
 * Needs Attention warning. Call it with the SAME row keys every time.
 *
 * - First report after a page load: ring if any row is above zero.
 * - Later reports: ring only when at least one row's count INCREASES.
 */
export function notifyWarningCounts(counts) {
  const next = {};
  for (const [key, value] of Object.entries(counts ?? {})) {
    next[key] = Number(value) || 0;
  }

  hasPendingWarnings = Object.values(next).some((count) => count > 0);

  if (lastWarningCounts === null) {
    lastWarningCounts = next;
    if (hasPendingWarnings) playNow();
    return;
  }

  const increased = Object.entries(next).some(
    ([key, count]) => count > (lastWarningCounts[key] ?? 0),
  );

  lastWarningCounts = next;
  if (increased) playNow();
}
