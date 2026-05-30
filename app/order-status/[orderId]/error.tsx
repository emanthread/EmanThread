"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderStatusError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Order Status Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-4 border border-red-100">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Unable to Load Order</h2>
        <p className="text-muted-foreground text-sm">
          We encountered an error while trying to fetch your order details. Please try again or contact support.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="bg-emerald-600 hover:bg-emerald-700">
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
