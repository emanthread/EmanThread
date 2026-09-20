"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  readTrackingConsent,
  saveTrackingConsent,
  type TrackingConsent,
} from "@/lib/tracking-consent";

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

export function PrivacyConsent() {
  const [choice, setChoice] = useState<TrackingConsent | null | "loading">("loading");

  useEffect(() => {
    const current =
      navigator.globalPrivacyControl === true ? "denied" : readTrackingConsent();
    if (navigator.globalPrivacyControl === true) {
      saveTrackingConsent("denied");
    }
    setChoice(current);

    const openPreferences = () => setChoice(null);
    window.addEventListener("emanthread:open-privacy-preferences", openPreferences);
    return () =>
      window.removeEventListener("emanthread:open-privacy-preferences", openPreferences);
  }, []);

  const choose = (value: TrackingConsent) => {
    saveTrackingConsent(value);
    setChoice(value);
  };

  if (choice !== null) return null;

  return (
    <aside
      aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-5"
    >
      <p className="font-semibold">Your privacy choices</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        We use necessary storage for the website. With your permission, we also use
        analytics and Meta Pixel to understand visits and measure advertising. You
        can decline without affecting shopping. See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => choose("denied")}>
          Necessary only
        </Button>
        <Button type="button" onClick={() => choose("granted")}>
          Allow analytics
        </Button>
      </div>
    </aside>
  );
}
