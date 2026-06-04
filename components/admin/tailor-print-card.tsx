"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { UnifiedLayoutEngine } from "@/components/measurements/UnifiedLayoutEngine";

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

export function TailorPrintCard({ data }: { data: TailorCardData }) {
  // Determine gender safely. Default to male if unspecified, or explicitly check for "male" or "gents".
  // Assuming garmentType is something like "male_MEN_SHALWAR_KAMEEZ" or "female_LADIES_FROCK".
  const gt = (data.garmentType || "").toLowerCase();
  const isGents = gt.startsWith("male") || gt === "gents" || gt.includes("men_");
  const gender = isGents ? "male" : "female";
  
  // Extract category (e.g. "male_prince_coat" -> "prince_coat")
  let category = "";
  if (gt.startsWith("male_")) category = gt.replace("male_", "");
  else if (gt.startsWith("female_")) category = gt.replace("female_", "");
  else category = gt;

  const m = data.measurements || {};
  const s = data.stylingPrefs || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * {
            visibility: hidden;
          }
          #tailor-print-card, #tailor-print-card * {
            visibility: visible;
          }
          #tailor-print-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 210mm;
          }
          /* Ensure backgrounds print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <Button variant="outline" size="sm" onClick={handlePrint} className="mb-4 print:hidden">
        <Printer className="h-4 w-4 mr-2" /> Print Tailor Card
      </Button>

      <div
        id="tailor-print-card"
        className="border rounded-lg overflow-hidden max-w-[210mm] text-sm font-sans bg-white print:border-none print:shadow-none"
        style={{ fontFamily: "Arial, sans-serif", breakInside: "avoid" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 text-white text-center print:bg-[#0072B5]"
          style={{ backgroundColor: "#0072B5" }}
        >
          <p className="text-lg font-bold tracking-wide">🧵 EMAN THREADS</p>
          <p className="text-xs opacity-80">Custom Tailoring Order</p>
        </div>

        {/* Order Info */}
        <div className="bg-gray-50 print:bg-gray-50 px-4 py-2 border-b grid grid-cols-2 gap-2 text-xs text-black">
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
            <span className="font-semibold">{data.productName} ({gender.toUpperCase()})</span>
          </div>
        </div>

        {/* Unified Layout Engine (Read-Only Mode) */}
        <div className="px-1 py-3 text-black">
          <UnifiedLayoutEngine
            gender={gender}
            category={category}
            measurements={m}
            stylingPrefs={s}
            notes={data.notes || ""}
            readOnly={true}
          />
        </div>

        {/* Tailor Signature */}
        <div className="px-4 py-3 border-t border-dashed mt-4 text-black">
          <p className="text-xs text-gray-500">Tailor Signature: ____________________________</p>
        </div>
      </div>
    </div>
  );
}
