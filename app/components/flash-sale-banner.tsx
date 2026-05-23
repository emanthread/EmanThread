"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveDiscount {
  id: string;
  code: string;
  type: string;
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  minPurchase?: number;
  maxDiscount?: number;
  endDate: string;
}

function useCountdown(targetDate: string) {
  const calculateTimeLeft = useCallback(() => {
    const difference = new Date(targetDate).getTime() - new Date().getTime();
    if (difference <= 0) return null;
    return {
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
}

function CountdownPill({ endDate }: { endDate: string }) {
  const timeLeft = useCountdown(endDate);
  if (!timeLeft) return <span className="text-xs font-mono">Expired</span>;

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="text-xs font-mono tabular-nums">
      Ends in {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  );
}

export function FlashSaleBanner() {
  const [discounts, setDiscounts] = useState<ActiveDiscount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscounts() {
      try {
        const res = await fetch("/api/discounts/active");
        const data = await res.json();
        const all = (data.discounts || []) as ActiveDiscount[];
        // Only show discounts ending within 24 hours
        const now = new Date().getTime();
        const within24h = all.filter((d) => {
          if (!d.endDate) return false;
          const end = new Date(d.endDate).getTime();
          return end - now > 0 && end - now <= 24 * 60 * 60 * 1000;
        });
        setDiscounts(within24h);
      } catch (e) {
        console.error("Failed to fetch active discounts:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDiscounts();
  }, []);

  if (loading || discounts.length === 0) return null;

  const maxPercentage = discounts
    .filter((d) => d.type === "PERCENTAGE")
    .reduce((max, d) => Math.max(max, d.value), 0);

  return (
    <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white py-3 px-4">
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 flex-wrap">
        <Zap className="h-5 w-5 fill-yellow-300 text-yellow-300" />
        <span className="font-semibold text-sm sm:text-base">
          Flash Sale
          {maxPercentage > 0 && ` — Up to ${maxPercentage}% Off`}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {discounts.map((d) => (
            <Badge
              key={d.id}
              variant="secondary"
              className="bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm"
            >
              <span className="font-mono font-bold mr-2">{d.code}</span>
              <CountdownPill endDate={d.endDate} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductFlashSaleBadge({
  endDate,
  className,
}: {
  endDate: string;
  className?: string;
}) {
  const timeLeft = useCountdown(endDate);
  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full",
        className
      )}
    >
      <Zap className="h-3 w-3 fill-yellow-300 text-yellow-300" />
      <span className="tabular-nums">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}