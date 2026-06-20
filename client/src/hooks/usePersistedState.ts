import { useEffect, useState } from "react";

/**
 * Like useState, but persists the value to sessionStorage under `key` so it
 * survives component unmount / re-navigation (e.g. leaving a page and coming
 * back, whether via "back" or the sidebar). Cleared when the browser tab closes.
 *
 * Use for transient UI drafts that shouldn't be lost mid-edit — active tab,
 * unsaved form input, etc. Key it per entity (e.g. by projectId) so drafts
 * don't bleed across records.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage unavailable/full — non-fatal */
    }
  }, [key, state]);

  return [state, setState] as const;
}
