"use client";

import React from "react";
import type { FemaleMeasurementField } from "../femaleMeasurements";

interface FemaleMeasurementRowProps {
  field: FemaleMeasurementField;
  isSide?: boolean;
}

export function FemaleMeasurementRow({ field, isSide }: FemaleMeasurementRowProps) {
  // ── Options row (Zip / Plate pills) ────────────────────────────────────────
  if (field.type === "options-row") {
    return (
      <div style={{ borderBottom: "1.5px solid #93a4bf" }}>
        <div style={{ display: "grid", gridTemplateColumns: isSide ? "1fr" : "35mm 1fr" }}>
          {isSide ? (
            <div style={{
              padding: "2mm 3mm",
              fontWeight: 800,
              color: "#172554",
              fontSize: "14px",
              borderBottom: "1px solid #e2e8f0",
            }}>
              {field.label}
            </div>
          ) : (
            <div style={{
              padding: "3.2mm 3mm",
              fontWeight: 700,
              color: "#172554",
              borderRight: "1.5px solid #93a4bf",
              fontSize: "15px",
              background: "#fbfdff",
            }}>
              {field.label}
            </div>
          )}
          <div style={{ padding: "2mm 3mm", display: "flex", alignItems: "center", gap: "3mm", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3mm", width: "100%" }}>
              {field.pills?.map((pill) => (
                <span key={pill} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2mm",
                  border: "1px solid #cbd5e1",
                  borderRadius: "999px",
                  padding: "1.5mm 2.6mm",
                  fontSize: "10.5px",
                  background: "#f8fafc",
                  color: "#334155",
                }}>
                  <span style={{ width: "5mm", height: "5mm", border: "1.6px solid #172554", display: "inline-block", borderRadius: "1px" }} />
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-grid row (Sleeves with sub-items) ──────────────────────────────────
  if (field.type === "sub-grid") {
    const cols = field.subItems?.length ?? 1;
    return (
      <div style={{
        borderBottom: "1.5px solid #93a4bf",
        minHeight: isSide ? "12mm" : "19mm",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: isSide ? "1fr" : "35mm 1fr" }}>
          {isSide ? (
            <div style={{
              padding: "2mm 3mm",
              fontWeight: 800,
              color: "#172554",
              fontSize: "14px",
              borderBottom: "1px solid #e2e8f0",
            }}>
              {field.label}
            </div>
          ) : (
            <div style={{
              padding: "3.2mm 3mm",
              fontWeight: 700,
              color: "#172554",
              borderRight: "1.5px solid #93a4bf",
              fontSize: "15px",
              background: "#fbfdff",
            }}>
              {field.label}
            </div>
          )}
          <div style={{ padding: "2mm 3mm", display: "flex", alignItems: "center", gap: "3mm", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, width: "100%", gap: "2mm", alignItems: "stretch" }}>
              {field.subItems?.map((sub, i) => (
                <div key={i} style={{
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "2px",
                  minHeight: "15mm",
                  padding: "2mm",
                  fontSize: "12.5px",
                  textAlign: "center",
                  color: "#172554",
                  fontWeight: 650,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}>
                  {sub.label}
                  {!sub.isCheckbox && <span style={{ display: "block", height: "5mm", borderBottom: "1px solid #64748b", marginTop: "2mm" }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: plain input row ──────────────────────────────────────────────
  return (
    <div style={{
      borderBottom: "1.5px solid #93a4bf",
      minHeight: isSide ? "12mm" : "19mm",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: isSide ? "1fr" : "35mm 1fr" }}>
        {isSide ? (
          <div style={{
            padding: "2mm 3mm",
            fontWeight: 800,
            color: "#172554",
            fontSize: "14px",
            borderBottom: "1px solid #e2e8f0",
          }}>
            {field.label}
          </div>
        ) : (
          <div style={{
            padding: "3.2mm 3mm",
            fontWeight: 700,
            color: "#172554",
            borderRight: "1.5px solid #93a4bf",
            fontSize: "15px",
            background: "#fbfdff",
          }}>
            {field.label}
          </div>
        )}
        <div style={{ padding: "2mm 3mm", display: "flex", alignItems: "center", gap: "3mm" }}>
          <div style={{ height: "10mm", borderBottom: "1.5px solid #64748b", flex: 1, minWidth: isSide ? "0" : "32mm" }} />
        </div>
      </div>
    </div>
  );
}