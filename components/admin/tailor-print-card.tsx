"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export interface TailorCardData {
  serialNo: string;
  customerName: string;
  deliveryDate?: string;
  productName: string;
  garmentType: string;
  measurements: Record<string, string>;
  stylingPrefs?: Record<string, unknown> | null;
  notes?: string | null;
}

const GENTS_SHIRT_LABELS: [string, string][] = [
  ["length", "Length"],
  ["shoulder", "Shoulder"],
  ["sleeves", "Sleeves"],
  ["golai", "Golai"],
  ["caff", "Caff"],
  ["plate", "Caff Plate"],
  ["golbazoo", "Gol Bazoo"],
  ["neck", "Neck"],
  ["chest", "Chest"],
  ["collarnok", "Collar Nok"],
  ["bane", "Bane"],
  ["patti", "Patti"],
  ["waist", "Waist"],
  ["gherra", "Gherra"],
];

const GENTS_BOTTOM_LABELS: [string, string][] = [
  ["shalwar", "Shalwar Length"],
  ["shalwargherra", "Shalwar Gherra"],
  ["shalwarassan", "Shalwar Assan"],
  ["shalwarpancha", "Shalwar Pancha"],
  ["trouser", "Trouser"],
  ["trousergherra", "Trouser Gherra"],
  ["trouserassan", "Trouser Assan"],
  ["trouserside", "Trouser Side"],
  ["trouserfront", "Trouser Front"],
  ["trouserpancha", "Trouser Pancha"],
];

const LADIES_SHIRT_LABELS: [string, string][] = [
  ["length", "Length"],
  ["shoulder", "Shoulder"],
  ["sleeves", "Sleeves"],
  ["golai", "Golai"],
  ["mori", "Mori"],
  ["bellbazoo", "Bell Bazoo"],
  ["neck", "Neck"],
  ["chest", "Chest"],
  ["waist", "Waist"],
  ["gherra", "Gherra"],
];

const LADIES_BOTTOM_LABELS: [string, string][] = [
  ["shalwar", "Shalwar Length"],
  ["shalwargherra", "Shalwar Gherra"],
  ["shalwarassan", "Shalwar Assan"],
  ["shalwarpancha", "Shalwar Pancha"],
];

function MRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-gray-200 py-0.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}"</span>
    </div>
  );
}

export function TailorPrintCard({ data }: { data: TailorCardData }) {
  const isGents = data.garmentType === "gents";
  const shirtLabels = isGents ? GENTS_SHIRT_LABELS : LADIES_SHIRT_LABELS;
  const bottomLabels = isGents ? GENTS_BOTTOM_LABELS : LADIES_BOTTOM_LABELS;
  const m = data.measurements || {};
  const s = data.stylingPrefs || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handlePrint} className="mb-4 print:hidden">
        <Printer className="h-4 w-4 mr-2" /> Print Tailor Card
      </Button>

      <div
        id="tailor-print-card"
        className="border rounded-lg overflow-hidden max-w-sm text-sm font-sans"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 text-white text-center"
          style={{ backgroundColor: "#0072B5" }}
        >
          <p className="text-lg font-bold tracking-wide">🧵 EMAN THREADS</p>
          <p className="text-xs opacity-80">Custom Tailoring Order</p>
        </div>

        {/* Order Info */}
        <div className="bg-gray-50 px-4 py-2 border-b grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Serial:</span>{" "}
            <span className="font-semibold">#{data.serialNo}</span>
          </div>
          <div>
            <span className="text-gray-500">Customer:</span>{" "}
            <span className="font-semibold">{data.customerName}</span>
          </div>
          {data.deliveryDate && (
            <div className="col-span-2">
              <span className="text-gray-500">Date:</span>{" "}
              <span className="font-semibold">{data.deliveryDate}</span>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-gray-500">Item:</span>{" "}
            <span className="font-semibold">{data.productName}</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Shirt Section */}
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">
              {isGents ? "Gents" : "Ladies"} — Kameez / Shirt
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              {shirtLabels.map(([key, label]) =>
                m[key] ? <MRow key={key} label={label} value={m[key]} /> : null
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">
              {isGents ? "Shalwar / Trouser" : "Shalwar"}
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              {bottomLabels.map(([key, label]) =>
                m[key] ? <MRow key={key} label={label} value={m[key]} /> : null
              )}
            </div>
          </div>

          {/* Styling */}
          {Object.keys(s).some((k) => s[k] && !["sidepocket", "frontpocket", "shalwarpocket"].includes(k)) && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">
                Styling Preferences
              </p>
              <div className="space-y-0.5 text-xs">
                {isGents && !!s.sleeve_style && (
                  <div>Sleeve Style: <strong className="capitalize">{String(s.sleeve_style)}</strong></div>
                )}
                {isGents && !!s.bane && <div>Bane: <strong>✓</strong></div>}
                {isGents && !!s.collar && <div>Collar: <strong>✓</strong></div>}
                {isGents && !!s.waist_style && (
                  <div>Waist Style: <strong className="capitalize">{String(s.waist_style)}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">Notes</p>
              <p className="text-xs text-gray-700">{data.notes}</p>
            </div>
          )}

          {/* Tailor Signature */}
          <div className="pt-3 border-t border-dashed">
            <p className="text-xs text-gray-500">Tailor Signature: ____________________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
