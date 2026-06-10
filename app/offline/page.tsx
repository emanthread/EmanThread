"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // If online, redirect to home
  if (isOnline && typeof window !== "undefined") {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md space-y-4">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-semibold">You&apos;re Offline</h1>
        <p className="text-muted-foreground">
          Please check your internet connection and try again. Your cart and
          browsing data are saved locally.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md border border-input px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
