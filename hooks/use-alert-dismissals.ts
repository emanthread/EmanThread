/**
 * Hook for persisting alert dismissal timestamps in localStorage.
 *
 * These values are UI preferences only (tracking when the user last dismissed
 * each alert type), so localStorage is appropriate — no sensitive data.
 * The wrapper provides safe access with try/catch in case storage is full
 * or unavailable (incognito mode, storage quota exceeded).
 */

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(`[useAlertDismissals] Failed to write localStorage key "${key}":`, err);
  }
}

export function useAlertDismissals() {
  const getDismissedAt = (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return safeGetItem(key);
  };

  const dismissAlert = (storageKey: string, latestAt: string | null): void => {
    if (latestAt && typeof window !== "undefined") {
      safeSetItem(storageKey, latestAt);
    }
  };

  return { getDismissedAt, dismissAlert };
}
