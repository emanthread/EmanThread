"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UnsavedChangesContextValue = {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  confirmNavigation: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

const ADMIN_HISTORY_POINT = "__emanAdminHistoryPoint";

function historyStateWithPoint(state: unknown, point: number) {
  const current =
    state && typeof state === "object"
      ? (state as Record<string, unknown>)
      : {};
  return { ...current, [ADMIN_HISTORY_POINT]: point };
}

export function AdminUnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);

  const updateHasUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!hasUnsavedChangesRef.current) return true;
    if (!window.confirm("Leave without saving this product?")) return false;
    updateHasUnsavedChanges(false);
    return true;
  }, [updateHasUnsavedChanges]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const initialPoint = window.history.state?.[ADMIN_HISTORY_POINT];
    let currentPoint =
      typeof initialPoint === "number" && Number.isFinite(initialPoint)
        ? initialPoint
        : 1;
    let restoringCancelledNavigation = false;

    if (initialPoint !== currentPoint) {
      originalReplaceState.call(
        window.history,
        historyStateWithPoint(window.history.state, currentPoint),
        "",
        window.location.href
      );
    }

    const patchedPushState: History["pushState"] = function (
      data,
      unused,
      url
    ) {
      currentPoint += 1;
      originalPushState.call(
        window.history,
        historyStateWithPoint(data, currentPoint),
        unused,
        url
      );
    };
    const patchedReplaceState: History["replaceState"] = function (
      data,
      unused,
      url
    ) {
      originalReplaceState.call(
        window.history,
        historyStateWithPoint(data, currentPoint),
        unused,
        url
      );
    };

    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;

    const handlePopState = (event: PopStateEvent) => {
      const eventPoint = event.state?.[ADMIN_HISTORY_POINT];
      const nextPoint =
        typeof eventPoint === "number" && Number.isFinite(eventPoint)
          ? eventPoint
          : 0;

      if (restoringCancelledNavigation) {
        restoringCancelledNavigation = false;
        currentPoint = nextPoint;
        event.stopImmediatePropagation();
        return;
      }

      const historyDelta = currentPoint - nextPoint;
      if (!hasUnsavedChangesRef.current || confirmNavigation()) {
        currentPoint = nextPoint;
        return;
      }

      // Keep Next's router from processing the rejected history entry. The
      // second popstate only restores the browser to the entry it just left,
      // so it is suppressed as well to avoid a duplicate confirmation/render.
      event.stopImmediatePropagation();
      if (historyDelta !== 0) {
        restoringCancelledNavigation = true;
        window.history.go(historyDelta);
      }
    };

    window.addEventListener("popstate", handlePopState, true);
    return () => {
      window.removeEventListener("popstate", handlePopState, true);
      if (window.history.pushState === patchedPushState) {
        window.history.pushState = originalPushState;
      }
      if (window.history.replaceState === patchedReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, [confirmNavigation]);

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      setHasUnsavedChanges: updateHasUnsavedChanges,
      confirmNavigation,
    }),
    [confirmNavigation, hasUnsavedChanges, updateHasUnsavedChanges]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useAdminUnsavedChanges(): UnsavedChangesContextValue {
  const value = useContext(UnsavedChangesContext);
  if (!value) {
    throw new Error(
      "useAdminUnsavedChanges must be used inside AdminUnsavedChangesProvider"
    );
  }
  return value;
}
