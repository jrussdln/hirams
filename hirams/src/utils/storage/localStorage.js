const PREFIX = "hirams_";

function buildKey(key) {
  return `${PREFIX}${key}`;
}

/**
 * Keys auto-eviction must never touch — the login session, the identity and
 * the user's role live here. Same rule the Storage Manager's
 * "Clear Application Caches" applies, so both behave one way about what is
 * disposable.
 */
const PROTECTED_RE = /user|token|role/i;

/** A stored key:value pair costs ~2× its text length bytes (UTF-16 units). */
const storedSize = (key, raw) => (key.length + raw.length) * 2;

/**
 * Make room for a failing write by dropping this app's disposable caches —
 * largest first, never the protected keys. One removal frees the most
 * headroom per step (the big list snapshots are exactly what fills the
 * quota), and losing them costs nothing but one loading skeleton on the
 * next visit: they are only revalidation seeds.
 *
 * @returns {boolean} true if the retry one write landed after evictions.
 */
function autoEvictAndRetry(fullKey, json) {
  // Collect — everything app-owned that is not protected.
  const evictable = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX) || PROTECTED_RE.test(k)) continue;
    const raw = localStorage.getItem(k) || "";
    evictable.push({ fullKey: k, size: storedSize(k, raw) });
  }
  evictable.sort((a, b) => b.size - a.size);

  // Evict → retry, keep going while space is still short.
  while (evictable.length) {
    const victim = evictable.shift();
    console.warn(
      `[Storage] Quota exceeded — auto-cleared "${victim.fullKey}" (${Math.round(victim.size / 1024) || 1} KB)`,
    );
    localStorage.removeItem(victim.fullKey);
    try {
      localStorage.setItem(fullKey, json);
      return true;
    } catch {
      // Still full — drop the next one.
    }
  }
  // Nothing left to give.
  return false;
}

/**
 * Get a value from localStorage, JSON-parsed.
 * Returns `fallback` if the key doesn't exist or parsing fails.
 */
export function getItem(key, fallback = null) {
  const fullKey = buildKey(key);
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Storage] GET "${fullKey}" → FAILED`, err);
    return fallback;
  }
}

/**
 * Store a value in localStorage (JSON-stringified).
 * When the quota is exceeded, disposable caches (largest first) are
 * auto-cleared to make room and the write is retried — the session and
 * identity keys are never touched.
 * Returns true on success, false if the value could not be saved even
 * after eviction.
 */
export function setItem(key, value) {
  const fullKey = buildKey(key);
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(fullKey, json);
    return true;
  } catch (err) {
    console.error(
      `[Storage] SET "${fullKey}" → quota exceeded, evicting caches…`,
      err,
    );
    try {
      return autoEvictAndRetry(fullKey, json);
    } catch (evictErr) {
      console.error(
        `[Storage] SET "${fullKey}" → FAILED even after auto-eviction`,
        evictErr,
      );
      return false;
    }
  }
}

/**
 * Remove a single key.
 */
export function removeItem(key) {
  const fullKey = buildKey(key);
  try {
    localStorage.removeItem(fullKey);
    return true;
  } catch (err) {
    console.error(`[Storage] REMOVE "${fullKey}" → FAILED`, err);
    return false;
  }
}

/**
 * Remove all keys under this app's prefix.
 */
export function clearAll() {
  try {
    const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    allKeys.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch (err) {
    console.error(`[Storage] CLEAR → FAILED`, err);
    return false;
  }
}

/**
 * Check if a key exists.
 */
export function hasItem(key) {
  const fullKey = buildKey(key);
  try {
    return localStorage.getItem(fullKey) !== null;
  } catch (err) {
    console.error(`[Storage] EXISTS "${fullKey}" → FAILED`, err);
    return false;
  }
}
