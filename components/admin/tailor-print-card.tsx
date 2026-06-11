"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { A4MeasurementForm } from "@/components/measurements/forms/A4MeasurementForm";
import type { UnifiedMeasurementFormData, GarmentType } from "@/lib/validators/measurements-unified";
import { UNIFIED_MEASUREMENT_EMPTY } from "@/lib/validators/measurements-unified";

export interface TailorCardData {
  serialNo: string;
  customerName: string;
  deliveryDate?: string;
  productName: string;
  garmentType: string;
  gender?: string;
  measurements: Record<string, any>;
  stylingPrefs?: Record<string, unknown> | null;
  notes?: string | null;
}

function deriveGender(garmentType: string | undefined): 'Male' | 'Female' {
  if (!garmentType) return 'Male';
  const ladiesKeywords = ['ladies', 'lady', 'women', 'woman', 'suit', 'frock', 'dress', 'kurti', 'sharara', 'gown'];
  return ladiesKeywords.some(kw => garmentType.toLowerCase().includes(kw)) ? 'Female' : 'Male';
}

/**
 * Build a UnifiedMeasurementFormData from the flat Prisma field measurements.
 * The measurements object contains Prisma column names (length1, chest1, neck1, etc.)
 * which directly map to UnifiedMeasurementFormData keys.
 */
function buildFormData(data: TailorCardData): UnifiedMeasurementFormData {
  const m = data.measurements || {};
  const s = data.stylingPrefs || {};

  return {
    ...UNIFIED_MEASUREMENT_EMPTY,
    ...m,
    ...s,
    gender: (data.gender ?? deriveGender(data.garmentType)) as UnifiedMeasurementFormData["gender"],
    garmentType: data.garmentType as UnifiedMeasurementFormData["garmentType"],
    customerName: data.customerName,
    deliveryDate: data.deliveryDate || "",
    notes: data.notes || "",
    serialNumber: data.serialNo,
  };
}

export function TailorPrintCard({ data }: { data: TailorCardData }) {
  const formData = buildFormData(data);
  const rawId = React.useId();
  const uniqueId = rawId.replace(/:/g, "-");

  React.useEffect(() => {
    const afterPrint = () => {
      document.body.classList.remove(`print-${uniqueId}`);
    };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, [uniqueId]);

  const handlePrint = () => {
    document.body.classList.add(`print-${uniqueId}`);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className={`a4-wrapper-${uniqueId}`}>
      <style>{`
        @media print {
          /* 1. Hide everything on the page */
          body.print-${uniqueId} > * {
            display: none !important;
          }

          /* 2. Show only our wrapper */
          body.print-${uniqueId} > .a4-wrapper-${uniqueId} {
            display: block !important;
          }

          /* 3. Strip the scale-wrapper clipping box so it doesn't clip the card */
          body.print-${uniqueId} .a4-scale-wrapper {
            position: static !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            margin: 0 !important;
          }

          /* 4. Make scale-inner static so it's no longer absolutely positioned off-screen */
          body.print-${uniqueId} .a4-scale-inner {
            position: static !important;
            transform: none !important;
            -webkit-transform: none !important;
          }

          /* 5. Pin the actual A4 page to fill the paper */
          body.print-${uniqueId} .a4-page {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 6mm !important;
            border: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
            background: white !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 6. Make all children of our wrapper visible */
          body.print-${uniqueId} .a4-wrapper-${uniqueId} * {
            visibility: visible !important;
          }
        }
      `}</style>

      <Button variant="outline" size="sm" onClick={handlePrint} className="mb-4 print:hidden">
        <Printer className="h-4 w-4 mr-2" /> Print Tailor Card
      </Button>

      <A4MeasurementForm
        data={formData}
        onChange={() => {}}
        readOnly={true}
        garmentType={data.garmentType as GarmentType}
        isAdmin={true}
      />
    </div>
  );
}