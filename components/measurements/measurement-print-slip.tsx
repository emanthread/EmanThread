"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { TailorMeasurementFormData } from "@/lib/validators/tailor-measurements";

function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); } // A3.5

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

function Cell({ label, val1, val2 }: { label: string; val1: string; val2: string }) {
  const display = [val1, val2].filter(Boolean).join(" ") || "—";
  return (
    <tr>
      <td style={{ padding: "3px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 500, width: "40%" }}>
        {label}
      </td>
      <td style={{ padding: "3px 8px", borderBottom: "1px solid #e5e7eb", width: "60%" }}>
        {display}
      </td>
    </tr>
  );
}

function CheckRow({ label, val }: { label: string; val: string }) {
  return val === "1" ? (
    <span style={{ display: "inline-block", margin: "2px 6px", background: "#f3f4f6", borderRadius: 4, padding: "1px 8px", fontSize: 11 }}>
      ✓ {label}
    </span>
  ) : null;
}

export function MeasurementPrintSlip({ data, customer, measurementId }: MeasurementPrintSlipProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const isMale = data.gender !== "Female";

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("about:blank", "_blank", "width=850,height=1100");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurement Slip – ${esc(customer.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 0; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            td { font-size: 12px; }
            h2 { margin: 0 0 4px; font-size: 16px; }
            @page { size: A4; margin: 12mm; }
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
    <div>
      <Button variant="outline" size="sm" onClick={handlePrint} className="mb-4 print:hidden gap-2">
        <Printer className="h-4 w-4" /> Print Slip
      </Button>

      <div ref={printRef}>
        {/* Header */}
        <table style={{ marginBottom: 12 }}>
          <tbody>
            <tr>
              <td>
                <h2 style={{ fontFamily: "Georgia, serif" }}>Emaan Thread</h2>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Measurement Slip</div>
              </td>
              <td style={{ textAlign: "right" }}>
                <div><strong>{customer.name}</strong></div>
                <div style={{ fontSize: 11 }}>{customer.email}</div>
                {customer.phone && <div style={{ fontSize: 11 }}>{customer.phone}</div>}
                {measurementId && <div style={{ fontSize: 10, color: "#6b7280" }}>ID: {measurementId.slice(0, 8).toUpperCase()}</div>}
                <div style={{ fontSize: 11 }}>Gender: {data.gender}</div>
                {data.deliveryDate && (
                  <div style={{ fontSize: 11 }}>
                    Delivery: {new Date(data.deliveryDate).toLocaleDateString()}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ borderColor: "#d1d5db", margin: "8px 0" }} />

        {/* Kameez */}
        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, borderBottom: "2px solid #1a1a1a", paddingBottom: 2 }}>
          {isMale ? "کمیز / Kameez" : "شرٹ / Shirt"}
        </div>
        <table style={{ marginBottom: 12 }}>
          <tbody>
            <Cell label="لمبائی / Length" val1={data.length1} val2={data.length2} />
            <Cell label="کندھا / Shoulder" val1={data.shoulder1} val2={data.shoulder2} />
            <Cell label="سینہ / Chest" val1={data.chest1} val2={data.chest2} />
            <Cell label="کمر / Waist" val1={data.waist1} val2={data.waist2} />
            <Cell label="گھیرا / Gherra" val1={data.gherra1} val2={data.gherra2} />
            <Cell label="گلا / Neck" val1={data.neck1} val2={data.neck2} />
            <Cell label="آستین / Sleeves" val1={data.sleeves1} val2={data.sleeves2} />
            <Cell label="گولائی / Golai" val1={data.golai1} val2={data.golai2} />
            <Cell label="کف / Cuff" val1={data.armcuff1} val2={data.armcuff2} />
            <Cell label="پلیٹ / Plate" val1={data.armplate1} val2={data.armplate2} />
            <Cell label="گول بازو / Gol Bazoo" val1={data.golbazoo1} val2={data.golbazoo2} />
            <Cell label="پٹی / Patti" val1={data.armpatti1} val2={data.armpatti2} />
            <Cell label="کالر نوک / Collar Nok" val1={data.collarnok1} val2={data.collarnok2} />
            <Cell label="بنے / Bane" val1={data.bane1} val2={data.bane2} />
            {!isMale && (
              <>
                <Cell label="گولائی / Golai (L)" val1={data.ladGolai1} val2={data.ladGolai2} />
                <Cell label="موری / Mori" val1={data.ladMori1} val2={data.ladMori2} />
                <Cell label="بیل بازو / Bell Bazoo" val1={data.ladBellbazoo1} val2={data.ladBellbazoo2} />
                <Cell label="چاک / Chaak" val1={data.ladChaak1} val2={data.ladChaak2} />
                <Cell label="ہپ / Hip" val1={data.ladHip1} val2={data.ladHip2} />
              </>
            )}
          </tbody>
        </table>

        {/* Style checkboxes */}
        <div style={{ marginBottom: 8 }}>
          <CheckRow label="Double" val={data.doubleCb} />
          <CheckRow label="Single" val={data.singleCb} />
          <CheckRow label="Gol" val={data.golCb} />
          <CheckRow label="Choras" val={data.chorasCb} />
          <CheckRow label="Bane" val={data.baneCb} />
          <CheckRow label="Collar" val={data.collarCb} />
          <CheckRow label="Round Neck" val={data.roundneck} />
        </div>

        {/* Shalwar */}
        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, borderBottom: "2px solid #1a1a1a", paddingBottom: 2 }}>
          شلوار / Shalwar
        </div>
        <table style={{ marginBottom: 12 }}>
          <tbody>
            <Cell label="لمبائی / Length" val1={data.shalwar1} val2={data.shalwar2} />
            <Cell label="گھیرا / Gherra" val1={data.shalwarGherra1} val2={data.shalwarGherra2} />
            <Cell label="اسن / Assan" val1={data.shalwarAssan1} val2={data.shalwarAssan2} />
            <Cell label="پنچہ / Pancha" val1={data.shalwarPancha1} val2={data.shalwarPancha2} />
            {!isMale && (
              <>
                <Cell label="Simple Shalwar" val1={data.ladSimpleShalwar1} val2={data.ladSimpleShalwar2} />
                <Cell label="Simple Pancha" val1={data.ladSimpleShalwarPancha1} val2={data.ladSimpleShalwarPancha2} />
                <Cell label="Simple Gherra" val1={data.ladSimpleShalwarGherra1} val2={data.ladSimpleShalwarGherra2} />
                <Cell label="Lastic Simple" val1={data.ladLasticSimpleShalwar} val2="" />
                <Cell label="Belt Shalwar" val1={data.ladShalwarBelt1} val2={data.ladShalwarBelt2} />
                <Cell label="Belt Pancha" val1={data.ladShalwarBeltPancha1} val2={data.ladShalwarBeltPancha2} />
                <Cell label="Belt Gherra" val1={data.ladShalwarBeltGherra1} val2={data.ladShalwarBeltGherra2} />
                <Cell label="Lastic Belt" val1={data.ladLasticShalwarBelt} val2="" />
              </>
            )}
          </tbody>
        </table>

        {/* Trouser (gents only) */}
        {isMale && (
          <>
            <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, borderBottom: "2px solid #1a1a1a", paddingBottom: 2 }}>
              ٹراؤزر / Trouser
            </div>
            <table style={{ marginBottom: 12 }}>
              <tbody>
                <Cell label="Length" val1={data.trouserdata1} val2={data.trouserdata2} />
                <Cell label="Gherra" val1={data.trouserdata3} val2={data.trouserdata4} />
                <Cell label="Assan" val1={data.trouserdata5} val2={data.trouserdata6} />
                <Cell label="Side" val1={data.trouserdata7} val2={data.trouserdata8} />
                <Cell label="Front" val1={data.trouserdata9} val2={data.trouserdata10} />
                <Cell label="Pancha" val1={data.trouserdata11} val2={data.trouserdata12} />
                <Cell label="Other" val1={data.trouserdata13} val2="" />
              </tbody>
            </table>
          </>
        )}

        {/* Pockets */}
        {(data.frontPocket || data.sidePocket || data.shalwarPocket) && (
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 8 }}>
            {data.frontPocket && <span>Front Pocket: {data.frontPocket} · </span>}
            {data.sidePocket && <span>Side Pocket: {data.sidePocket} · </span>}
            {data.shalwarPocket && <span>Shalwar Pocket: {data.shalwarPocket}</span>}
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div style={{ marginTop: 8, padding: "6px 8px", background: "#f9fafb", borderRadius: 4, fontSize: 11 }}>
            <strong>Notes:</strong> {data.notes}
          </div>
        )}

        <hr style={{ borderColor: "#d1d5db", margin: "12px 0" }} />
        <div style={{ textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
          Emaan Thread · Tailor Measurement Slip · Generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
