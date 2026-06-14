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
  
  let style = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement;
  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    document.head.appendChild(style);
  }

  const pageRules = `@page { size: 105mm 148mm; margin: 0; }`;

  style.textContent = `
    ${pageRules}

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
        background: white !important;
        z-index: 2147483647 !important;
      }

      body.tailor-printing-a4 > .tailor-print-portal {
        width: 210mm !important;
        height: 297mm !important;
      }

      body.tailor-printing-a6 > .tailor-print-portal {
        width: 105mm !important;
        height: 148.5mm !important;
        overflow: hidden !important;
      }

      /* ── 3. Strip the screen-only scale wrapper ── */
      body.tailor-printing-a4 .tailor-print-portal .a4-scale-wrapper {
        position: static !important;
        height: auto !important;
        width: auto !important;
        overflow: visible !important;
        margin: 0 !important;
      }
      body.tailor-printing-a4 .tailor-print-portal .a4-scale-inner {
        position: static !important;
        transform: none !important;
        -webkit-transform: none !important;
      }

      /* ── 3b. Scale wrapper for A6 to scale A4 down to A6 ── */
      body.tailor-printing-a6 .tailor-print-portal .a4-scale-wrapper {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        overflow: visible !important;
        margin: 0 !important;
        transform: scale(0.5) !important;
        transform-origin: top left !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-scale-inner {
        position: static !important;
        transform: none !important;
        -webkit-transform: none !important;
      }

      /* ── 4. The actual A4 page fills the paper ── */
      body.tailor-printing-a4 .tailor-print-portal .a4-page {
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

      body.tailor-printing-a6 .tailor-print-portal .a4-page {
        position: static !important;
        width: 210mm !important;
        min-height: 297mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 4mm !important;
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
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
      }

      /* ── 6. Advanced A6 styling overrides for optimal font readability & spacing ── */
      body.tailor-printing-a6 .tailor-print-portal .a4-page {
        padding: 4mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-row {
        min-height: 18.5mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-label {
        font-size: 16.5px !important;
        padding: 4mm 2mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-inputline {
        font-size: 16.5px !important;
        height: 12mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-subitem {
        font-size: 14.5px !important;
        min-height: 16.5mm !important;
        padding: 2mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-subitem .a4-smallline input {
        font-size: 14.5px !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-card h3 {
        font-size: 17px !important; /* ~7.7pt after scale(0.452) */
        padding: 2.5mm 3mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-meta {
        font-size: 13.5px !important;
        height: 13mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-meta-input {
        font-size: 13.5px !important;
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-title-area h1 {
        font-size: 22px !important; /* ~10pt after scale(0.452) */
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-title-area h2 {
        font-size: 32px !important; /* ~14.5pt after scale(0.452) */
      }
      body.tailor-printing-a6 .tailor-print-portal .a4-pill {
        font-size: 12.5px !important;
        padding: 1mm 2mm !important;
      }
      body.tailor-printing-a6 .tailor-print-portal button {
        padding: 1.5mm !important;
        font-size: 14px !important;
        border-width: 1.5px !important;
      }
    }
  `;
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
  const [printFormat, setPrintFormat] = React.useState<"a4" | "a6" | null>(null);
  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);

  const handlePrint = React.useCallback((format: "a4" | "a6") => {
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
    document.body.classList.add(`tailor-printing-${format}`);

    // 3. Trigger render of portal content
    setPrintFormat(format);

    // 4. Cleanup on afterprint (fires after dialog is closed or cancelled)
    const cleanup = () => {
      document.body.classList.remove("tailor-printing");
      document.body.classList.remove("tailor-printing-a4");
      document.body.classList.remove("tailor-printing-a6");
      if (portalContainerRef.current) {
        try {
          document.body.removeChild(portalContainerRef.current);
        } catch (_) {
          // already removed
        }
        portalContainerRef.current = null;
      }
      setPrintFormat(null);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
  }, []);

  // After React renders the portal content, wait one frame + delay, then print
  React.useEffect(() => {
    if (!printFormat || !portalContainerRef.current) return;

    // requestAnimationFrame ensures the portal DOM has been painted
    const rafId = requestAnimationFrame(() => {
      const timerId = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timerId);
    });

    return () => cancelAnimationFrame(rafId);
  }, [printFormat]);

  const isPrinting = printFormat !== null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4 print:hidden" id="tailor-print-options">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePrint("a6")}
          id="tailor-print-btn-a6"
        >
          <Printer className="h-4 w-4 mr-2" /> Print A6 Card
        </Button>
      </div>

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