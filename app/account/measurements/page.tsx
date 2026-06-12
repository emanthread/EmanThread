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

import { Ruler, MessageCircle } from "lucide-react";

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

// ─── Tailor Request Note Section ─────────────────────────────────────────────

function TailorRequestNote() {
  return (
    <div className="bg-background rounded-lg border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Tailor Measurement Request</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        We are currently not accepting tailor measurement requests online.
        Please contact us on WhatsApp for any stitching or measurement inquiries.
      </p>
      <Button
        onClick={() => window.open("https://wa.me/923344556677", "_blank")}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
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
                    {Object.entries(stitchingPrices[gender]).map(([fabric, price]) => (
                      <div key={fabric} className="p-3 bg-muted/30 border rounded-md flex flex-col justify-center items-center text-center">
                        <span className="text-sm font-medium mb-1">
                          {GARMENT_LABELS[fabric] ?? fabric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-primary font-bold">{formatPrice(price)}</span>
                      </div>
                    ))}
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