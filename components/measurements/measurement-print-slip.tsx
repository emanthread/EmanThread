"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { TailorMeasurementFormData } from "@/lib/validators/tailor-measurements";

function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

interface Customer {
  name: string;
  email: string;
  phone?: string | null;
}

interface MeasurementPrintSlipProps {
  data: TailorMeasurementFormData;
  customer: Customer;
  measurementId?: string;
}

/** Returns "value fraction" or "—" */
function fmt(v1: string, v2: string): string {
  const val = [v1, v2].filter(Boolean).join(" ");
  return val || "—";
}

function rowHtml(label: string, v1: string, v2: string): string {
  const val = fmt(v1, v2);
  if (val === "—") return ""; // skip empty rows to save A6 space
  return `<tr>
    <td style="padding:2px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;width:52%;">${label}</td>
    <td style="padding:2px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;font-weight:600;">${val}</td>
  </tr>`;
}

function sectionHtml(title: string, rows: string): string {
  if (!rows) return "";
  return `
    <div style="margin-bottom:6px;">
      <div style="font-size:10px;font-weight:700;border-bottom:1.5px solid #1a1a1a;padding-bottom:1px;margin-bottom:3px;">${title}</div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;
}

function checkHtml(label: string, val: string): string {
  return val === "1" ? `<span style="display:inline-block;margin:1px 4px;background:#f3f4f6;border-radius:3px;padding:1px 5px;font-size:9px;">✓ ${label}</span>` : "";
}

export function MeasurementPrintSlip({ data, customer, measurementId }: MeasurementPrintSlipProps) {
  const isMale = data.gender !== "Female";

  const buildContent = () => {
    // ── Kameez section ──
    let kameezRows = "";
    kameezRows += rowHtml("لمبائی / Length", data.length1, data.length2);
    kameezRows += rowHtml("کندھا / Shoulder", data.shoulder1, data.shoulder2);
    kameezRows += rowHtml("سینہ / Chest", data.chest1, data.chest2);
    kameezRows += rowHtml("کمر / Waist", data.waist1, data.waist2);
    kameezRows += rowHtml("گھیرا / Gherra", data.gherra1, data.gherra2);
    kameezRows += rowHtml("گلا / Neck", data.neck1, data.neck2);
    kameezRows += rowHtml("آستین / Sleeves", data.sleeves1, data.sleeves2);
    kameezRows += rowHtml("گولائی / Golai", data.golai1, data.golai2);
    kameezRows += rowHtml("کف / Cuff", data.armcuff1, data.armcuff2);
    kameezRows += rowHtml("پلیٹ / Plate", data.armplate1, data.armplate2);
    kameezRows += rowHtml("گول بازو / Gol Bazoo", data.golbazoo1, data.golbazoo2);
    kameezRows += rowHtml("پٹی / Patti", data.armpatti1, data.armpatti2);
    kameezRows += rowHtml("کالر نوک / Collar Nok", data.collarnok1, data.collarnok2);
    kameezRows += rowHtml("بنے / Bane", data.bane1, data.bane2);
    if (!isMale) {
      kameezRows += rowHtml("گولائی (L) / Golai L", data.ladGolai1, data.ladGolai2);
      kameezRows += rowHtml("موری / Mori", data.ladMori1, data.ladMori2);
      kameezRows += rowHtml("بیل بازو / Bell Bazoo", data.ladBellbazoo1, data.ladBellbazoo2);
      kameezRows += rowHtml("چاک / Chaak", data.ladChaak1, data.ladChaak2);
      kameezRows += rowHtml("ہپ / Hip", data.ladHip1, data.ladHip2);
    }

    // ── Style flags ──
    const styleChecks = [
      checkHtml("Double", data.doubleCb),
      checkHtml("Single", data.singleCb),
      checkHtml("Gol", data.golCb),
      checkHtml("Choras", data.chorasCb),
      checkHtml("Bane", data.baneCb),
      checkHtml("Collar", data.collarCb),
      checkHtml("Round Neck", data.roundneck),
    ].join("");

    // ── Shalwar section ──
    let shalwarRows = "";
    shalwarRows += rowHtml("لمبائی / Length", data.shalwar1, data.shalwar2);
    shalwarRows += rowHtml("گھیرا / Gherra", data.shalwarGherra1, data.shalwarGherra2);
    shalwarRows += rowHtml("اسن / Assan", data.shalwarAssan1, data.shalwarAssan2);
    shalwarRows += rowHtml("پنچہ / Pancha", data.shalwarPancha1, data.shalwarPancha2);
    if (!isMale) {
      shalwarRows += rowHtml("Simple Shalwar", data.ladSimpleShalwar1, data.ladSimpleShalwar2);
      shalwarRows += rowHtml("Simple Pancha", data.ladSimpleShalwarPancha1, data.ladSimpleShalwarPancha2);
      shalwarRows += rowHtml("Simple Gherra", data.ladSimpleShalwarGherra1, data.ladSimpleShalwarGherra2);
      shalwarRows += rowHtml("Belt Shalwar", data.ladShalwarBelt1, data.ladShalwarBelt2);
      shalwarRows += rowHtml("Belt Pancha", data.ladShalwarBeltPancha1, data.ladShalwarBeltPancha2);
      shalwarRows += rowHtml("Belt Gherra", data.ladShalwarBeltGherra1, data.ladShalwarBeltGherra2);
    }

    // ── Trouser section (gents only) ──
    let trouserRows = "";
    if (isMale) {
      trouserRows += rowHtml("Length", data.trouserdata1, data.trouserdata2);
      trouserRows += rowHtml("Gherra", data.trouserdata3, data.trouserdata4);
      trouserRows += rowHtml("Assan", data.trouserdata5, data.trouserdata6);
      trouserRows += rowHtml("Side", data.trouserdata7, data.trouserdata8);
      trouserRows += rowHtml("Front", data.trouserdata9, data.trouserdata10);
      trouserRows += rowHtml("Pancha", data.trouserdata11, data.trouserdata12);
      if (data.trouserdata13) trouserRows += `<tr><td style="padding:2px 5px;font-size:10px;width:52%;">Other</td><td style="padding:2px 5px;font-size:10px;font-weight:600;">${esc(data.trouserdata13)}</td></tr>`;
    }

    // ── Pockets ──
    const pocketParts: string[] = [];
    if (data.frontPocket) pocketParts.push(`Front: ${esc(data.frontPocket)}`);
    if (data.sidePocket) pocketParts.push(`Side: ${esc(data.sidePocket)}`);
    if (data.shalwarPocket) pocketParts.push(`Shalwar: ${esc(data.shalwarPocket)}`);

    return `
      <!-- Header -->
      <table style="width:100%;margin-bottom:6px;border-bottom:1.5px solid #1a1a1a;padding-bottom:5px;">
        <tbody><tr>
          <td>
            <div style="font-family:Georgia,serif;font-size:14px;font-weight:700;line-height:1.2;">Eman Thread</div>
            <div style="font-size:9px;color:#6b7280;">Tailor Measurement Slip</div>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <div style="font-size:10px;font-weight:700;">${esc(customer.name)}</div>
            <div style="font-size:9px;color:#6b7280;">${esc(customer.email)}</div>
            ${customer.phone ? `<div style="font-size:9px;color:#6b7280;">${esc(customer.phone)}</div>` : ""}
            ${measurementId ? `<div style="font-size:8px;color:#9ca3af;">ID: ${measurementId.slice(0, 8).toUpperCase()}</div>` : ""}
            <div style="font-size:9px;">Gender: ${data.gender}</div>
            ${data.deliveryDate ? `<div style="font-size:9px;">Delivery: ${new Date(data.deliveryDate).toLocaleDateString()}</div>` : ""}
          </td>
        </tr></tbody>
      </table>

      ${sectionHtml(isMale ? "کمیز / Kameez" : "شرٹ / Shirt", kameezRows)}

      ${styleChecks ? `<div style="margin-bottom:6px;font-size:9px;color:#374151;">${styleChecks}</div>` : ""}

      ${sectionHtml("شلوار / Shalwar", shalwarRows)}

      ${isMale && trouserRows ? sectionHtml("ٹراؤزر / Trouser", trouserRows) : ""}

      ${pocketParts.length ? `<div style="font-size:9px;color:#4b5563;margin-bottom:4px;">${pocketParts.join(" · ")}</div>` : ""}

      ${data.notes ? `<div style="margin-top:4px;padding:4px 6px;background:#f9fafb;border-radius:3px;font-size:9px;"><strong>Notes:</strong> ${esc(data.notes)}</div>` : ""}

      <hr style="border-color:#d1d5db;margin:6px 0;" />
      <div style="text-align:center;font-size:8px;color:#9ca3af;">Eman Thread · ${new Date().toLocaleDateString()}</div>
    `;
  };

  const handlePrint = () => {
    const content = buildContent();
    const win = window.open("about:blank", "_blank", "width=500,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurement Slip – ${esc(customer.name)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #1a1a1a;
              padding: 8mm;
              width: 105mm;
              min-height: 148mm;
            }
            table { width: 100%; border-collapse: collapse; }
            @page {
              size: A6 portrait;
              margin: 4mm;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print()" onafterprint="window.close()">
          ${content}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 w-full">
      <Printer className="h-4 w-4" />
      Print Slip (A6)
    </Button>
  );
}
