"use client";

import React from "react";
import { cn } from "@/lib/utils";
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