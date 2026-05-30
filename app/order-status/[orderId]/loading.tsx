import { Loader2 } from "lucide-react";

export default function OrderStatusLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading order details...
        </p>
      </div>
    </div>
  );
}
