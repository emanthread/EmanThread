"use client";

import React from "react";
import Image from "next/image";
import type { FemaleMeasurementForm, FemaleMeasurementField, FemaleBottomTypeOption } from "../femaleMeasurements";
import { FemaleMeasurementRow } from "./FemaleMeasurementRow";
import { FemaleBottomTypeSelector } from "./FemaleBottomTypeSelector";

interface FemalePrintableA4SheetProps {
  form: FemaleMeasurementForm;
}

export function FemalePrintableA4Sheet({ form }: FemalePrintableA4SheetProps) {
  const mainSections = form.sections.filter((s) => !s.isSide);
  const sideSections = form.sections.filter((s) => s.isSide);

  return (
    <section
      className="relative bg-white overflow-hidden"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "6mm",
        border: "1px solid #cbd5e1",
        boxShadow: "0 10px 30px rgba(15,23,42,.15)",
        margin: "8px auto",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Arial, sans-serif",
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      {/* ── Watermark ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "28mm",
          left: "10mm",
          right: "10mm",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: "37px",
          letterSpacing: "5px",
          color: "#0f172a10",
          fontWeight: 700,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        EMAN THREADS
      </div>

      {/* ── Header ── */}
      <header
        style={{
          border: "2px solid #172554",
          display: "grid",
          gridTemplateColumns: "36mm 1fr",
          minHeight: "30mm",
          position: "relative",
          background: "linear-gradient(180deg,#fff,#f8fafc)",
        }}
      >
        <div
          style={{
            borderRight: "2px solid #172554",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src="/logo-circle.jpg"
            alt="Eman Threads Logo"
            width={100}
            height={100}
            style={{ maxWidth: "31mm", maxHeight: "29mm", objectFit: "contain" }}
            priority
          />
        </div>
        <div style={{ padding: "4mm 5mm 3mm", textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              letterSpacing: "0.5px",
              color: "#172554",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {form.id === "ladies-frock" ? "Ladies Frock" :
             form.id === "ladies-shalwar-kameez" ? "Ladies Shalwar Kameez" :
             form.id === "lehnga-kurti" ? "Lehnga Kurti" :
             "Saari Blouse"}
          </h1>
          <h2
            style={{
              margin: "1mm 0 0",
              fontFamily: "Georgia, serif",
              fontSize: "30px",
              letterSpacing: "3px",
              color: "#0f172a99",
              fontWeight: 400,
            }}
          >
            EMAN THREADS
          </h2>
        </div>
      </header>

      {/* ── Meta row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          border: "2px solid #172554",
          borderTop: 0,
          height: "12mm",
          fontSize: "11px",
          fontWeight: 600,
          color: "#172554",
        }}
      >
        {[
          { label: "Serial#" },
          { label: "Name" },
          { label: "Delivery Date" },
        ].map((meta, i, arr) => (
          <div
            key={meta.label}
            style={{
              padding: "3mm",
              borderRight: i < arr.length - 1 ? "1.5px solid #172554" : "none",
            }}
          >
            {meta.label}:{" "}
            <span
              style={{
                display: "inline-block",
                minWidth: "35mm",
                borderBottom: "1px solid #94a3b8",
                height: "4mm",
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Content area ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 62mm",
          gap: "4mm",
          marginTop: "3mm",
        }}
      >
        {/* Main (left) column */}
        <div style={{ overflowY: "hidden" }}>
          {mainSections.map((section) => (
            <FemaleCard key={section.title} section={section} isSide={false} />
          ))}
        </div>

        {/* Side (right) column */}
        {sideSections.length > 0 && (
          <div style={{ overflowY: "hidden" }}>
            {sideSections.map((section) => (
              <FemaleCard key={section.title} section={section} isSide={true} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          position: "absolute",
          left: "12mm",
          right: "12mm",
          bottom: "8mm",
          borderTop: "1px solid #cbd5e1",
          paddingTop: "3mm",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9.5px",
          color: "#64748b",
        }}
      >
        <span>emanthread.com</span>
        <span></span>
      </footer>
    </section>
  );
}

// ─── Female Card ──────────────────────────────────────────────────────────────
function FemaleCard({
  section,
  isSide,
}: {
  section: { title: string; fields: FemaleMeasurementField[]; bottomType?: FemaleBottomTypeOption[] };
  isSide?: boolean;
}) {
  return (
    <div
      style={{
        border: "2px solid #172554",
        background: "#fff",
        borderRadius: "3px",
        overflow: "hidden",
        marginBottom: isSide ? "4mm" : "5mm",
      }}
    >
      <h3
        style={{
          margin: 0,
          background: "#f1f5f9",
          color: "#172554",
          fontSize: isSide ? "14px" : "15px",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          padding: "3.5mm 4mm",
          borderBottom: "2px solid #172554",
          fontWeight: 800,
        }}
      >
        {section.title}
      </h3>
      <div>
        {section.fields.map((field) => (
          <FemaleMeasurementRow key={field.id} field={field} isSide={isSide} />
        ))}
      </div>
      {section.bottomType && section.bottomType.length > 0 && (
        <FemaleBottomTypeSelector options={section.bottomType} isSide={isSide} />
      )}
    </div>
  );
}