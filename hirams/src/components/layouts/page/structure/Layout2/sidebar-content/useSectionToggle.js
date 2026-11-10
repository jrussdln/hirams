import { useCallback, useEffect, useState } from "react";
import { getItem, setItem } from "../../../../../../utils/storage/localStorage";

// One shared map so every section keeps its own state across reloads:
// { "OVERVIEW": true, "MANAGEMENT": false, ... }
const STORAGE_KEY = "sidebar_open_sections";

// Everything mounted under the same id — two headers can share one (a user
// with several roles), so a toggle has to reach them all.
const subscribers = new Set();

const readAll = () => {
  const saved = getItem(STORAGE_KEY, null);
  return saved && typeof saved === "object" ? saved : {};
};

const readOne = (id) => {
  const value = readAll()[id];
  return typeof value === "boolean" ? value : true;
};

/**
 * Show/hide state for a sidebar section (keyed by its title).
 * Starts open, and remembers what the user picked.
 *
 *   const [open, toggle] = useSectionToggle("MANAGEMENT");
 */
export default function useSectionToggle(id, autoOpen = false) {
  const [open, setOpen] = useState(() => readOne(id));

  useEffect(() => {
    const notify = (changedId) => {
      if (changedId === id) setOpen(readOne(id));
    };
    subscribers.add(notify);
    return () => subscribers.delete(notify);
  }, [id]);

  // Route-driven auto-open: when the app lands on one of this section's
  // pages while the section is collapsed, it uncollapses so the active item
  // is never hidden. Only OPENS — a navigation never re-collapses a section
  // the user folded; their manual choice persists otherwise.
  useEffect(() => {
    if (autoOpen && !readOne(id)) {
      setItem(STORAGE_KEY, { ...readAll(), [id]: true });
      subscribers.forEach((notify) => notify(id));
    }
  }, [id, autoOpen]);

  const toggle = useCallback(() => {
    // Merge with the other sections' state so we never wipe their choice.
    const next = !readOne(id);
    setItem(STORAGE_KEY, { ...readAll(), [id]: next });
    subscribers.forEach((notify) => notify(id));
  }, [id]);

  return [open, toggle];
}
