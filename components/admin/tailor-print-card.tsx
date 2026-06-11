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
    }, 100);
  };

  return (
    <div className={`a4-wrapper-${uniqueId}`}>
      <style>{`
        @media print {
          body.print-${uniqueId} {
            height: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          body.print-${uniqueId} * {
            visibility: hidden;
            transform: none !important;
            transition: none !important;
            animation: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.print-${uniqueId} .a4-wrapper-${uniqueId},
          body.print-${uniqueId} .a4-wrapper-${uniqueId} * {
            visibility: visible;
          }
          body.print-${uniqueId} .a4-wrapper-${uniqueId} .a4-page-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 999999 !important;
            background: white !important;
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