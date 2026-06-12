"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/data";
import { MeasurementProfileManager } from "@/components/measurements/MeasurementProfileManager";

import { Ruler } from "lucide-react";

interface StitchingPrices {
  male: Record<string, number>;
  female: Record<string, number>;
}

// Map garment fabric type keys (from StitchingPrice.fabricType in DB) to human-readable labels.
// Keys must match whatever the admin saves in /admin/settings → Stitching tab.
const GARMENT_LABELS: Record<string, string> = {
  // ── Male (canonical keys) ─────────────────────────────────────────────────
  "shalwar_kameez_simple_shalwar": "Shalwar Kameez (with simple Shalwar)",
  "shalwar_kameez_trouser": "Shalwar Kameez with Trouser",
  "simple 3 piece suit": "Simple 3 Piece Suit",
  "prince coat 3 piece suit": "Prince Coat 3 Piece Suit",
  "shirt": "Shirt",
  // ── Female (canonical keys) ───────────────────────────────────────────────
  "female_shalwar_kameez_simple_shalwar": "Shalwar Kameez (with simple Shalwar)",
  "female_shalwar_kameez_trouser": "Shalwar Kameez with Trouser",
  "female_shalwar_kameez_belt_shalwar": "Shalwar Kameez with Belt Shalwar",
  "frock": "Frock",
  "lehnga kurti": "Lehnga Kurti",
  "saari": "Saari",
  // ── Legacy fallbacks (any pre-migration DB rows still display correctly) ───
  "shalwar_kameez": "Shalwar Kameez",
  "simple shalwar kameez": "Simple Shalwar Kameez",
  "shalwar kameez": "Shalwar Kameez",
  "simple 3 piece": "Simple 3 Piece",
  "prince coat": "Prince Coat",
  "simple shalwar": "Simple Shalwar Kameez",
};

const ACTIVE_MALE_GARMENTS = [
  "shalwar_kameez_simple_shalwar",
  "shalwar_kameez_trouser",
  "simple 3 piece suit",
  "prince coat 3 piece suit",
  "shirt",
];

const ACTIVE_FEMALE_GARMENTS = [
  "female_shalwar_kameez_simple_shalwar",
  "female_shalwar_kameez_trouser",
  "female_shalwar_kameez_belt_shalwar",
  "frock",
  "lehnga kurti",
  "saari",
];
// ─── Tailor Request Note Section ─────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="#25D366"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TailorRequestNote() {
  return (
    <div className="bg-background rounded-lg border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <WhatsAppIcon className="h-5 w-5" />
        <h2 className="font-semibold text-lg">Tailor Measurement Request</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Please contact us on WhatsApp for any stitching or measurement inquiries.
      </p>
      <Button
        onClick={() => window.open("https://wa.me/923344556677", "_blank")}
        className="gap-2"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Contact on WhatsApp
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeasurementsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stitchingPrices, setStitchingPrices] = useState<StitchingPrices>({ male: {}, female: {} });

  const fetchStitchingPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/stitching-prices");
      if (res.ok) setStitchingPrices(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStitchingPrices();
    }
  }, [isAuthenticated, fetchStitchingPrices]);

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-serif flex items-center gap-2">
                <Ruler className="h-6 w-6" /> Stitching Services
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your measurements and view stitching prices
              </p>
            </div>
          </div>

          {/* ── Stitching Prices by Garment ── */}
          <div className="mb-8 space-y-6">
            {(["male", "female"] as const).map((gender) => (
              <div key={gender} className="bg-background rounded-lg border p-6 shadow-sm">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="text-primary">{gender === "male" ? "👨" : "👩"}</span>{" "}
                  {gender === "male" ? "Male" : "Female"} Garments
                </h2>
                {!stitchingPrices[gender] || Object.keys(stitchingPrices[gender]).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No prices configured yet.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(gender === "male" ? ACTIVE_MALE_GARMENTS : ACTIVE_FEMALE_GARMENTS).map((fabric) => {
                      const price = stitchingPrices[gender][fabric] || 0;
                      return (
                        <div key={fabric} className="p-3 bg-muted/30 border rounded-md flex flex-col justify-center items-center text-center">
                          <span className="text-sm font-medium mb-1">
                            {GARMENT_LABELS[fabric] ?? fabric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <span className="text-primary font-bold">{formatPrice(price)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Measurement Profiles ── */}
          <div className="mb-8 bg-background rounded-lg border p-6 shadow-sm">
            <MeasurementProfileManager />
          </div>

          {/* ── Tailor Request Note ── */}
          <div className="mb-8">
            <TailorRequestNote />
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}