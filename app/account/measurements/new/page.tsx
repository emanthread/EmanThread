"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ruler } from "lucide-react";

import { CartDrawer } from "@/components/cart/lazy-cart-drawer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { UnifiedMeasurementForm } from "@/components/measurements/UnifiedMeasurementForm";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { safeInternalReturnPath, withQueryValue } from "@/lib/internal-return-path";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";

export default function NewMeasurementProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const handleSave = async (data: UnifiedMeasurementFormData) => {
    const response = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to create profile");
    }

    const requestedReturn = new URLSearchParams(window.location.search).get("returnTo");
    if (requestedReturn && payload?.profile?.id) {
      const returnTo = safeInternalReturnPath(requestedReturn, "/account/measurements");
      router.push(withQueryValue(returnTo, "measurementProfileId", payload.profile.id));
      return;
    }

    router.push("/account/measurements");
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen overflow-x-hidden bg-muted/30 pb-16 pt-28">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-serif">
                <Ruler className="h-6 w-6" /> Create Measurement Profile
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete each step, then save your measurements.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/measurements">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to profiles
              </Link>
            </Button>
          </div>

          <section className="min-w-0 overflow-hidden rounded-lg border bg-background shadow-sm">
            <UnifiedMeasurementForm data={{}} mode="edit" wizard onSave={handleSave} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
