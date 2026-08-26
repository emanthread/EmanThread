"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  composeMeasurementValue,
  MEASUREMENT_FRACTIONS,
  normalizePocketQuantity,
  splitMeasurementValue,
  type MeasurementFraction,
} from "@/lib/measurement-values";
import "./a4-layout.css";

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
  isAdmin?: boolean;
}

/**
 * Shared A4 measurement page layout.
 * Renders a 210mm x 297mm paper card on screen with print-ready @page styles.
 * On mobile (<768px), it stacks vertically rather than constraining to A4 width.
 */
export function A4PageLayout({
  title,
  subtitle = "EMAN THREAD",
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
  isAdmin = false,
}: A4PageLayoutProps) {
  return (
    <>
      <div className={cn("a4-page-root", className)}>
        <div className="a4-scale-wrapper">
          <div className="a4-scale-inner">
            <div className="a4-page">

          {/* Header */}
          <header className="a4-header">
            <div className="a4-logo">
              <img src="/logo.png" alt="Eman Thread" />
            </div>
            <div className="a4-title-area">
              <h1>{title}</h1>
              <h2>{subtitle}</h2>
            </div>
          </header>

          {/* Meta row — admin only */}
          {isAdmin && (
          <div className="a4-meta">
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
          )}

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
  const parts = splitMeasurementValue(value);

  if (!readOnly) {
    return (
      <span className="a4-measurement-control">
        <input
          className="a4-inputline"
          value={parts.whole}
          inputMode="decimal"
          onChange={(event) =>
            onChange(composeMeasurementValue(event.target.value, parts.fraction))
          }
          placeholder={placeholder || ""}
          aria-label="Whole measurement"
        />
        <select
          className="a4-fraction-select"
          value={parts.fraction}
          onChange={(event) =>
            onChange(
              composeMeasurementValue(
                parts.whole,
                event.target.value as MeasurementFraction
              )
            )
          }
          aria-label="Measurement fraction"
        >
          <option value="">Fraction</option>
          {MEASUREMENT_FRACTIONS.map((fraction) => (
            <option key={fraction} value={fraction}>
              {fraction}
            </option>
          ))}
        </select>
      </span>
    );
  }

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

export function A4QuantitySelect({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: "0" | "1" | "2") => void;
  readOnly?: boolean;
}) {
  const quantity = normalizePocketQuantity(value);

  return (
    <div className="a4-quantity-choice">
      <span>{label}</span>
      {readOnly ? (
        <strong>{quantity === "0" ? "—" : quantity}</strong>
      ) : (
        <select
          value={quantity}
          onChange={(event) =>
            onChange(event.target.value as "0" | "1" | "2")
          }
          aria-label={`${label} pocket quantity`}
        >
          <option value="0">None</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      )}
    </div>
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
      onClick={(e) => {
        e.stopPropagation();
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

export function A4MiniToggle({
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
      className="a4-mini"
      onClick={() => {
        if (!readOnly) onChange(!checked);
      }}
      style={{ cursor: readOnly ? "default" : "pointer" }}
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
  const parts = splitMeasurementValue(value);

  return (
    <div className="a4-subitem">
      {label}
      <span className="a4-smallline">
        {readOnly ? (
          <input value={value} disabled />
        ) : (
          <span className="a4-measurement-control a4-measurement-control-small">
            <input
              value={parts.whole}
              inputMode="decimal"
              onChange={(event) =>
                onChange(composeMeasurementValue(event.target.value, parts.fraction))
              }
              aria-label={`${label} whole measurement`}
            />
            <select
              className="a4-fraction-select"
              value={parts.fraction}
              onChange={(event) =>
                onChange(
                  composeMeasurementValue(
                    parts.whole,
                    event.target.value as MeasurementFraction
                  )
                )
              }
              aria-label={`${label} fraction`}
            >
              <option value="">—</option>
              {MEASUREMENT_FRACTIONS.map((fraction) => (
                <option key={fraction} value={fraction}>
                  {fraction}
                </option>
              ))}
            </select>
          </span>
        )}
      </span>
    </div>
  );
}
