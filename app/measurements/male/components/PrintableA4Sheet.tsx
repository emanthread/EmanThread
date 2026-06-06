"use client";

import React from "react";
import Image from "next/image";
import type { MeasurementForm } from "../maleMeasurements";
import { MeasurementCard } from "./MeasurementCard";

interface PrintableA4SheetProps {
  form: MeasurementForm;
}

/**
 * A single A4 print sheet (210mm × 297mm) that reproduces the exact visual
 * structure of the HTML reference files:
 * - Watermark "EMAN THREADS"
 * - Logo / title header
 * - Customer / date / order meta row
 * - Measurement cards in split (main + side panel) or full layout
 * - Footer
 */
export function PrintableA4Sheet({ form }: PrintableA4SheetProps) {
  // Separate main vs. side sections
  const mainSections = form.sections.filter((s) => !s.isSide);
  const sideSections = form.sections.filter((s) => s.isSide);
  const isFullLayout = form.layout === "full";

  return (
    <section
      id="tailor-print-card"
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
        {/* Logo area */}
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

        {/* Title */}
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
            Eman Threads
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
            {form.label}
          </h2>
        </div>
      </header>

      {/* ── Meta row (Customer / Date / Order) ── */}
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
          { label: "Customer", value: "" },
          { label: "Date", value: "" },
          { label: "Order #", value: "" },
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
          gridTemplateColumns: isFullLayout ? "1fr" : "1fr 62mm",
          gap: "4mm",
          marginTop: "3mm",
          height: "232mm",
        }}
      >
        {/* Main (left) column */}
        <div style={{ overflowY: "hidden" }}>
          {mainSections.map((section) => (
            <MeasurementCard key={section.title} section={section} isSide={false} />
          ))}
        </div>

        {/* Side (right) column — only for split layout */}
        {!isFullLayout && sideSections.length > 0 && (
          <div style={{ overflowY: "hidden" }}>
            {sideSections.map((section) => (
              <MeasurementCard key={section.title} section={section} isSide={true} />
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
          bottom: "5mm",
          borderTop: "1px solid #cbd5e1",
          paddingTop: "3mm",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9.5px",
          color: "#64748b",
        }}
      >
        <span>Eman Threads — Premium Unstitched Fabrics</span>
        <span>emanthread.com</span>
      </footer>
    </section>
  );
}
