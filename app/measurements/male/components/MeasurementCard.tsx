"use client";

import React from "react";
import type { MeasurementSection } from "../maleMeasurements";
import { MeasurementRow } from "./MeasurementRow";
import { BottomTypeSelector } from "./BottomTypeSelector";

interface MeasurementCardProps {
  section: MeasurementSection;
  isSide?: boolean;
}

/**
 * One card (bordered box with a header) containing measurement rows.
 * Matches .card / .card h3 / .rows from the HTML reference.
 */
export function MeasurementCard({ section, isSide }: MeasurementCardProps) {
  return (
    <div
      className={`border-2 border-[#172554] bg-white rounded-[3px] overflow-hidden ${
        isSide ? "mb-[4mm]" : "mb-[3mm]"
      }`}
    >
      {/* Card header */}
      <h3
        className={`m-0 bg-[#f1f5f9] text-[#172554] uppercase tracking-[0.8px] border-b-2 border-[#172554] font-extrabold ${
          isSide
            ? "text-[16px] py-[3.5mm] px-[4mm]"
            : "text-[15px] py-[3.5mm] px-[4mm]"
        }`}
      >
        {section.title}
      </h3>

      {/* Measurement rows */}
      <div>
        {section.fields.map((field) => (
          <MeasurementRow key={field.id} field={field} isSide={isSide} />
        ))}
      </div>

      {/* Bottom type selector (Shalwar / Trouser) — only for Shalwar Kameez */}
      {section.bottomType && section.bottomType.length > 0 && (
        <BottomTypeSelector options={section.bottomType} isSide={isSide} />
      )}
    </div>
  );
}
