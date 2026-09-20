export const TRACKING_CONSENT_KEY = "emanthread_tracking_consent_v1";
export const TRACKING_CONSENT_EVENT = "emanthread:tracking-consent";

export type TrackingConsent = "granted" | "denied";

export function readTrackingConsent(): TrackingConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(TRACKING_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function saveTrackingConsent(value: TrackingConsent) {
  window.localStorage.setItem(TRACKING_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_EVENT, { detail: value }));
}
