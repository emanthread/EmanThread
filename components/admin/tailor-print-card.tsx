"use client";

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
  measurements: Record<string, string>;
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          .a4-page-root, .a4-page-root * {
            visibility: visible;
          }
          .a4-page-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Break out of modal stacking and transforms */
          [role="dialog"], [data-radix-popper-content-wrapper], .fixed, .absolute {
            position: static !important;
            transform: none !important;
            inset: 0 !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          .a4-scale-wrapper {
            height: auto !important;
            width: auto !important;
            margin: 0 !important;
          }
          .a4-scale-inner {
            position: static !important;
            transform: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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