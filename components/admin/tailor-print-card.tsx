"use client";

import React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { A4MeasurementForm } from "@/components/measurements/forms/A4MeasurementForm";
import type {
  UnifiedMeasurementFormData,
  GarmentType,
} from "@/lib/validators/measurements-unified";
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

function deriveGender(garmentType: string | undefined): "Male" | "Female" {
  if (!garmentType) return "Male";
  const ladiesKeywords = [
    "ladies","lady","women","woman","suit","frock",
    "dress","kurti","sharara","gown",
  ];
  return ladiesKeywords.some((kw) =>
    garmentType.toLowerCase().includes(kw)
  )
    ? "Female"
    : "Male";
}

function buildFormData(data: TailorCardData): UnifiedMeasurementFormData {
  const m = data.measurements || {};
  const s = data.stylingPrefs || {};
  return {
    ...UNIFIED_MEASUREMENT_EMPTY,
    ...m,
    ...s,
    gender: (data.gender ??
      deriveGender(data.garmentType)) as UnifiedMeasurementFormData["gender"],
    garmentType:
      data.garmentType as UnifiedMeasurementFormData["garmentType"],
    customerName: data.customerName,
    deliveryDate: data.deliveryDate || "",
    notes: data.notes || "",
    serialNumber: data.serialNo,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRINT CSS — injected directly into <head> so it is always active regardless
   of where in the DOM tree this component renders (inside modals, dialogs,
   tabs, deeply nested admin layouts, etc.)
────────────────────────────────────────────────────────────────────────────── */
const PRINT_STYLE_ID = "tailor-print-global-style";

function ensurePrintStyleInHead() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PRINT_STYLE_ID)) return; // already injected

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* ── 1. Hide everything that isn't our portal ── */
      body.tailor-printing > *:not(.tailor-print-portal) {
        display: none !important;
        visibility: hidden !important;
      }

      /* ── 2. The portal sits at (0,0) on the paper ── */
      body.tailor-printing > .tailor-print-portal {
        display: block !important;
        visibility: visible !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        overflow: hidden !important;
        background: white !important;
        z-index: 2147483647 !important;
      }

      /* ── 3. Strip the screen-only scale wrapper ── */
      body.tailor-printing .tailor-print-portal .a4-scale-wrapper {
        position: static !important;
        height: auto !important;
        width: auto !important;
        overflow: visible !important;
        margin: 0 !important;
      }
      body.tailor-printing .tailor-print-portal .a4-scale-inner {
        position: static !important;
        transform: none !important;
        -webkit-transform: none !important;
      }

      /* ── 4. The actual A4 page fills the paper ── */
      body.tailor-printing .tailor-print-portal .a4-page {
        position: static !important;
        width: 210mm !important;
        min-height: 297mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 6mm !important;
        border: none !important;
        box-shadow: none !important;
        overflow: hidden !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* ── 5. All descendants inside the portal are visible ── */
      body.tailor-printing .tailor-print-portal * {
        visibility: visible !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────────────────────────
   TailorPrintCard
   ─────────────────────────────────────────────────────────────────────────────
   Works in every context:
   • Embedded in a regular page tab (measurements/[id])
   • Embedded inside a shadcn <Dialog> (view profile dialog)
   • Embedded inside a custom fixed overlay (print list modals)
   • Embedded inside an order page card

   Strategy:
   1. On click: create a brand-new <div class="tailor-print-portal"> and
      appendChild it directly onto document.body (bypasses ALL nesting).
   2. Inject print CSS into document.head (not into any hidden subtree).
   3. Render A4 form into the portal via createPortal().
   4. Wait 350ms for React paint + browser layout flush, then window.print().
   5. afterprint → remove portal div, remove body class, reset state.
────────────────────────────────────────────────────────────────────────────── */
export function TailorPrintCard({ data }: { data: TailorCardData }) {
  const formData = buildFormData(data);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);

  const handlePrint = React.useCallback(() => {
    if (typeof window === "undefined") return;

    // Guard: don't start a second print if one is already running
    if (portalContainerRef.current) return;

    // Ensure the print CSS is in <head> — idempotent
    ensurePrintStyleInHead();

    // 1. Create portal container directly on <body>
    const container = document.createElement("div");
    container.className = "tailor-print-portal";
    document.body.appendChild(container);
    portalContainerRef.current = container;

    // 2. Mark body for CSS targeting
    document.body.classList.add("tailor-printing");

    // 3. Trigger render of portal content
    setIsPrinting(true);

    // 4. Cleanup on afterprint (fires after dialog is closed or cancelled)
    const cleanup = () => {
      document.body.classList.remove("tailor-printing");
      if (portalContainerRef.current) {
        try {
          document.body.removeChild(portalContainerRef.current);
        } catch (_) {
          // already removed
        }
        portalContainerRef.current = null;
      }
      setIsPrinting(false);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
  }, []);

  // After React renders the portal content, wait one frame + delay, then print
  React.useEffect(() => {
    if (!isPrinting || !portalContainerRef.current) return;

    // requestAnimationFrame ensures the portal DOM has been painted
    const rafId = requestAnimationFrame(() => {
      const timerId = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timerId);
    });

    return () => cancelAnimationFrame(rafId);
  }, [isPrinting]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="mb-4 print:hidden"
        id="tailor-print-btn"
      >
        <Printer className="h-4 w-4 mr-2" /> Print Tailor Card
      </Button>

      {/* Screen preview — always visible for the user to inspect */}
      <A4MeasurementForm
        data={formData}
        onChange={() => {}}
        readOnly={true}
        garmentType={data.garmentType as GarmentType}
        isAdmin={true}
      />

      {/* Portal — only mounted during printing, renders directly into body */}
      {isPrinting &&
        portalContainerRef.current &&
        createPortal(
          <A4MeasurementForm
            data={formData}
            onChange={() => {}}
            readOnly={true}
            garmentType={data.garmentType as GarmentType}
            isAdmin={true}
          />,
          portalContainerRef.current
        )}
    </>
  );
}