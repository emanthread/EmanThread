"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type DataKey = string;

export interface A4PageLayoutProps {
  title: string;
  subtitle?: string;
  formTitle?: string;
  children: React.ReactNode;
  sideChildren?: React.ReactNode;
  serialNumber?: string;
  customerName?: string;
  deliveryDate?: string;
  onSerialChange?: (v: string) => void;
  onNameChange?: (v: string) => void;
  onDeliveryChange?: (v: string) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Shared A4 measurement page layout.
 * Renders a 210mm x 297mm paper card on screen with print-ready @page styles.
 * On mobile (<768px), it stacks vertically rather than constraining to A4 width.
 */
export function A4PageLayout({
  title,
  subtitle = "EMAN THREADS",
  formTitle,
  children,
  sideChildren,
  serialNumber,
  customerName,
  deliveryDate,
  onSerialChange,
  onNameChange,
  onDeliveryChange,
  readOnly = false,
  className,
}: A4PageLayoutProps) {
  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        .a4-page-root {
          --ink: #172554;
          --muted: #64748b;
          --line: #93a4bf;
          --soft: #f8fafc;
          --gold: #b08d57;
          --brand: #0f172a;
        }
        .a4-page {
          width: 210mm;
          height: 297mm;
          margin: 8px auto;
          background: #fff;
          padding: 6mm;
          border: 1px solid #cbd5e1;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
          position: relative;
          overflow: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
          color: var(--brand);
        }
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            background: #fff;
          }
          .a4-page {
            margin: 0;
            border: 0;
            box-shadow: none;
            width: 210mm;
            height: 297mm;
          }
          .a4-print-btn {
            display: none !important;
          }
        }
        @media screen and (max-width: 800px) {
          .a4-page {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
          }
        }
        .a4-watermark {
          position: absolute;
          top: 28mm;
          left: 10mm;
          right: 10mm;
          text-align: center;
          font-family: Georgia, serif;
          font-size: 37px;
          letter-spacing: 5px;
          color: #0f172a10;
          font-weight: 700;
          pointer-events: none;
        }
        .a4-header {
          border: 2px solid var(--ink);
          display: grid;
          grid-template-columns: 36mm 1fr;
          min-height: 30mm;
          position: relative;
          background: linear-gradient(180deg, #fff, #f8fafc);
        }
        .a4-logo {
          border-right: 2px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--ink);
          font-size: 28px;
        }
        .a4-logo span {
          border: 2px solid var(--ink);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .a4-title-area {
          padding: 4mm 5mm 3mm;
          text-align: center;
        }
        .a4-title-area h1 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 0.5px;
          color: var(--ink);
          font-weight: 800;
          text-transform: uppercase;
        }
        .a4-title-area h2 {
          margin: 1mm 0 0;
          font-family: Georgia, serif;
          font-size: 30px;
          letter-spacing: 3px;
          color: #0f172a99;
        }
        .a4-meta {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          border: 2px solid var(--ink);
          border-top: 0;
          height: 12mm;
          font-size: 11px;
          font-weight: 600;
          color: var(--ink);
        }
        .a4-meta > div {
          padding: 3mm;
          border-right: 1.5px solid var(--ink);
        }
        .a4-meta > div:last-child {
          border-right: 0;
        }
        .a4-meta-input {
          display: inline-block;
          min-width: 35mm;
          border: none;
          border-bottom: 1px solid #94a3b8;
          height: 4mm;
          background: transparent;
          outline: none;
          font-size: 11px;
          font-weight: 600;
          color: var(--ink);
        }
        .a4-grid {
          display: grid;
          grid-template-columns: 1fr 62mm;
          gap: 4mm;
          margin-top: 3mm;
        }
        .a4-grid-full {
          display: block;
        }
        @media screen and (max-width: 800px) {
          .a4-grid {
            display: block;
          }
        }
        .a4-card {
          border: 2px solid var(--ink);
          background: #fff;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 3mm;
        }
        .a4-card h3 {
          margin: 0;
          background: #f1f5f9;
          color: var(--ink);
          font-size: 15px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 3.5mm 4mm;
          border-bottom: 2px solid var(--ink);
        }
        .a4-rows {
          display: grid;
        }
        .a4-row {
          display: grid;
          grid-template-columns: 35mm 1fr;
          min-height: 19mm;
          border-bottom: 1.5px solid var(--line);
        }
        .a4-row:last-child {
          border-bottom: 0;
        }
        .a4-label {
          padding: 3.2mm 3mm;
          font-weight: 700;
          color: var(--ink);
          border-right: 1.5px solid var(--line);
          font-size: 15px;
          background: #fbfdff;
        }
        .a4-entry {
          padding: 2mm 3mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          flex-wrap: wrap;
        }
        .a4-inputline {
          height: 10mm;
          border-bottom: 1.5px solid #64748b;
          flex: 1;
          min-width: 32mm;
          border-top: none;
          border-left: none;
          border-right: none;
          background: transparent;
          font-size: 14px;
          padding: 0 2mm;
          outline: none;
          border-radius: 0;
          font-family: inherit;
        }
        .a4-inputline:focus {
          border-bottom-color: var(--ink);
        }
        .a4-inputline:disabled {
          border-bottom-color: #cbd5e1;
          color: #64748b;
          -webkit-text-fill-color: #64748b;
        }
        .a4-box {
          width: 5mm;
          height: 5mm;
          border: 1.6px solid var(--ink);
          display: inline-block;
          border-radius: 1px;
          cursor: pointer;
          position: relative;
        }
        .a4-box.checked::after {
          content: "✓";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          color: var(--ink);
          font-weight: 700;
        }
        .a4-box.disabled {
          cursor: default;
          opacity: 0.6;
        }
        .a4-pill {
          display: inline-flex;
          align-items: center;
          gap: 2mm;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 1.5mm 2.6mm;
          font-size: 10.5px;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
        }
        .a4-pill:hover {
          border-color: var(--ink);
        }
        .a4-subgrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          width: 100%;
          gap: 2mm;
        }
        .a4-subitem {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 2px;
          min-height: 15mm;
          padding: 2mm;
          font-size: 12.5px;
          text-align: center;
          color: var(--ink);
          font-weight: 650;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .a4-subitem .a4-smallline {
          display: block;
          height: 5mm;
          border-bottom: 1px solid #64748b;
          margin-top: 2mm;
        }
        .a4-subitem .a4-smallline input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #64748b;
          height: 100%;
          background: transparent;
          text-align: center;
          font-size: 12px;
          outline: none;
        }
        .a4-side .a4-row {
          grid-template-columns: 1fr;
          min-height: 13mm;
        }
        .a4-side .a4-label {
          border-right: 0;
          border-bottom: 1px solid #e2e8f0;
          padding: 2mm 3mm;
          font-weight: 800;
          font-size: 14px;
        }
        .a4-side .a4-entry {
          min-height: 8mm;
        }
        .a4-footer {
          position: absolute;
          left: 12mm;
          right: 12mm;
          bottom: 5mm;
          border-top: 1px solid #cbd5e1;
          padding-top: 3mm;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #64748b;
        }
        .a4-scale-wrapper {
          display: flex;
          justify-content: center;
        }
        .a4-scale-inner {
          transform: scale(0.65);
          transform-origin: top center;
        }
        @media print {
          .a4-scale-inner {
            transform: none;
            transform-origin: initial;
          }
        }
      `}</style>

      <div className={cn("a4-page-root", className)}>
        <div className="a4-scale-wrapper">
          <div className="a4-scale-inner">
            <div className="a4-page">
          <div className="a4-watermark">EMAN THREADS</div>

          {/* Header */}
          <header className="a4-header">
            <div className="a4-logo">
              <span>ET</span>
            </div>
            <div className="a4-title-area">
              <h1>{title}</h1>
              <h2>{subtitle}</h2>
            </div>
          </header>

          {/* Meta row */}
          <div className="a4-meta">
            <div>
              Serial#:{" "}
              <input
                className="a4-meta-input"
                value={serialNumber || ""}
                onChange={(e) => onSerialChange?.(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              Name:{" "}
              <input
                className="a4-meta-input"
                value={customerName || ""}
                onChange={(e) => onNameChange?.(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              Delivery Date:{" "}
              <input
                className="a4-meta-input"
                value={deliveryDate || ""}
                onChange={(e) => onDeliveryChange?.(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Main content */}
          <div className={cn(sideChildren ? "a4-grid" : "a4-grid-full")}>
            <section>{children}</section>
            {sideChildren && <aside className="a4-side">{sideChildren}</aside>}
          </div>

          {/* Footer */}
              <div className="a4-footer">
                <span>emanthread.com</span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────

export function A4Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="a4-card">
      <h3>{title}</h3>
      <div className="a4-rows">{children}</div>
    </div>
  );
}

export function A4Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="a4-row">
      <div className="a4-label">{label}</div>
      <div className="a4-entry">{children}</div>
    </div>
  );
}

export function A4Input({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      className="a4-inputline"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      placeholder={placeholder || ""}
    />
  );
}

export function A4Checkbox({
  checked,
  onChange,
  readOnly,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <span
      className={cn("a4-box", checked && "checked", readOnly && "disabled")}
      onClick={() => {
        if (!readOnly) onChange(!checked);
      }}
    />
  );
}

export function A4Pill({
  label,
  checked,
  onChange,
  readOnly,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <span
      className="a4-pill"
      onClick={() => {
        if (!readOnly) onChange(!checked);
      }}
    >
      <A4Checkbox checked={checked} onChange={onChange} readOnly={readOnly} />
      {label}
    </span>
  );
}

export function A4SubInput({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="a4-subitem">
      {label}
      <span className="a4-smallline">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      </span>
    </div>
  );
}