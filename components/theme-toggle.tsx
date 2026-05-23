"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Extra classes forwarded to the Button wrapper */
  className?: string;
}

/**
 * Premium sun ↔ moon theme toggle.
 *
 * - Uses `next-themes` `resolvedTheme` so the system default is honoured.
 * - Guarded behind a `mounted` flag to prevent SSR hydration mismatch.
 * - Icon swap is driven by CSS opacity + scale — subtle, not flashy.
 * - Renders a dimensionally-identical placeholder before mount so layout
 *   never shifts.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render theme-aware UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Invisible placeholder — exact same size as the real button
    return <div className="h-9 w-9 shrink-0" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      id="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={cn(
        "relative shrink-0 overflow-hidden",
        // Inherit caller's text/hover colour (e.g. white when on hero overlay)
        className
      )}
    >
      {/* Sun — visible in light mode */}
      <Sun
        className={cn(
          "absolute h-5 w-5 transition-all duration-300 ease-in-out",
          isDark
            ? "opacity-0 scale-50 rotate-90"
            : "opacity-100 scale-100 rotate-0"
        )}
      />

      {/* Moon — visible in dark mode */}
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-all duration-300 ease-in-out",
          isDark
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 -rotate-90"
        )}
      />

      {/* Accessible label for screen readers */}
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </Button>
  );
}
