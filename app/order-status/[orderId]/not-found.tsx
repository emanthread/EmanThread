import Link from "next/link";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderStatusNotFound() {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-4 border border-border">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <PackageX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Order Not Found</h2>
        <p className="text-muted-foreground text-sm">
          We couldn't find an order with that tracking link. It may have been typed incorrectly or the link might be broken.
        </p>
        <div className="pt-4">
          <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
            <Link href="/">Return to Store</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
