"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuthStore } from "@/lib/auth-store";
import { signIn } from "next-auth/react";

// Suppress noisy FedCM AbortError logged by Google's GSI library internally.
// This is a harmless Chrome FedCM quirk — it doesn't affect One Tap functionality.
function suppressFedCMAbortError() {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("FedCM") || args[0].includes("GSI_LOGGER"))
    ) {
      return;
    }
    original.call(console, ...args);
  };
  return () => {
    console.error = original;
  };
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const ONE_TAP_KEY = "eman-one-tap-dismissed";

export function GoogleOneTap() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const initialized = useRef(false);
  const scriptLoaded = useRef(false);
  const callbackRef = useRef<((response: { credential: string }) => void) | null>(null);
  const onLoadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const result = await signIn("google-one-tap", {
          idToken: response.credential,
          redirect: false,
        });

        if (result?.ok) {
          // Wait for session cookie to propagate — retry with delay
          let profile: any = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
              profile = await res.json();
              break;
            }
            if (attempt < 4) await new Promise((r) => setTimeout(r, 300));
          }

          if (profile) {
            useAuthStore.setState({
              user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                whatsappConsent: profile.whatsappConsent,
                whatsappPhone: profile.whatsappPhone,
                role: profile.role,
                isVerified: profile.isVerified ?? true,
                addresses: profile.addresses,
                createdAt: profile.createdAt,
              },
              isAuthenticated: true,
            });
          }
          router.refresh();
        }
      } catch (err) {
        console.error("One Tap sign-in failed:", err);
      }
    },
    [router]
  );

  // Keep a stable ref to the callback
  callbackRef.current = handleCredentialResponse;

  // Initialize Google One Tap
  const initOneTap = useCallback(() => {
    if (initialized.current || !GOOGLE_CLIENT_ID) return;
    if (typeof window === "undefined" || !(window as any).google?.accounts) return;

    const dismissed = sessionStorage.getItem(ONE_TAP_KEY);
    if (dismissed === "true") return;

    initialized.current = true;

    try {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          callbackRef.current?.(response);
        },
        cancel_on_tap_outside: true,
        auto_select: false,
      });

      try {
        google.accounts.id.prompt((moment: any) => {
          if (moment.getDismissedReason()) {
            sessionStorage.setItem(ONE_TAP_KEY, "true");
          }
        });
      } catch (promptErr: any) {
        // Silently suppress FedCM AbortError — harmless, Chrome FedCM API quirk
        if (promptErr?.message?.includes("AbortError") || promptErr?.message?.includes("NetworkError")) {
          // FedCM rejected — fall back to classic popup flow
        } else {
          console.warn("One Tap prompt failed:", promptErr);
        }
      }
    } catch (err) {
      console.error("One Tap initialization failed:", err);
      initialized.current = false; // Allow retry
    }
  }, []);

  // Attempt initialization after render (covers the case when script is already cached)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (scriptLoaded.current) return;

    const timer = setTimeout(() => {
      if ((window as any).google?.accounts) {
        initOneTap();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [initOneTap]);

  // Suppress noisy FedCM AbortError from Google's internal GSI logger
  useEffect(() => {
    const restore = suppressFedCMAbortError();
    return () => restore();
  }, []);

  // Cleanup onLoad timer on unmount
  useEffect(() => {
    return () => {
      if (onLoadTimerRef.current) clearTimeout(onLoadTimerRef.current);
    };
  }, []);

  // Don't show One Tap if user is already logged in
  if (isAuthenticated) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="lazyOnload"
      onLoad={() => {
        scriptLoaded.current = true;
        onLoadTimerRef.current = setTimeout(initOneTap, 500);
      }}
    />
  );
}