"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin page error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-xl items-center px-4 py-12">
      <div className="w-full space-y-4">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>This admin page could not load</AlertTitle>
          <AlertDescription>
            The request failed before the page finished loading. Retrying does not reset stored data.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RefreshCw />
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <LayoutDashboard />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
