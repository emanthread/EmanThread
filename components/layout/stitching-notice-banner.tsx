"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function StitchingNoticeBanner() {
  const [notice, setNotice] = useState<string>("");
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchNotice() {
      try {
        const res = await fetch("/api/store/public");
        if (res.ok) {
          const data = await res.json();
          if (data.stitchingNotice) {
            setNotice(data.stitchingNotice);
            
            // Check if dismissed in this session
            const dismissed = sessionStorage.getItem("stitching-notice-dismissed");
            if (!dismissed) {
              setIsVisible(true);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load stitching notice banner:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotice();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("stitching-notice-dismissed", "true");
    setIsVisible(false);
  };

  if (loading || !isVisible || !notice) return null;

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-amber-950",
        "relative flex items-center justify-center py-2 px-8 text-center text-xs md:text-sm font-medium",
        "border-b border-amber-600/20 shadow-sm transition-all duration-300 z-[60]"
      )}
    >
      <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950 animate-pulse" />
        <span>{notice}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-950 hover:bg-amber-700/10 rounded-full transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
