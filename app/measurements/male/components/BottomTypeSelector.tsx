"use client";

import React, { useState } from "react";
import type { MeasurementField, BottomTypeOption } from "../maleMeasurements";
import { MeasurementRow } from "./MeasurementRow";

interface BottomTypeSelectorProps {
  options: BottomTypeOption[];
  isSide?: boolean;
}

/**
 * Shalwar / Trouser toggle + conditional field display.
 * Only the selected option's fields are rendered — matching the HTML reference
 * `.bottom-panel.active { display: block }` behaviour.
 */
export function BottomTypeSelector({ options, isSide }: BottomTypeSelectorProps) {
  const [selected, setSelected] = useState<string>(options[0]?.label ?? "");

  const activeOption = options.find((o) => o.label === selected);

  return (
    <div className="mt-[3mm]">
      {/* Toggle buttons */}
      <div
        className={`grid gap-[3mm] p-[3mm] border-b border-[#93a4bf] bg-white ${
          isSide
            ? "grid-cols-1 gap-[2.5mm] p-[3.5mm]"
            : "grid-cols-2"
        }`}
      >
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => setSelected(option.label)}
            className={`border-2 font-extrabold uppercase tracking-wide rounded-[4px] cursor-pointer transition-colors duration-150 ${
              isSide
                ? "text-[14.5px] py-[3.2mm] px-[2mm]"
                : "text-[11px] py-[3mm] px-[2mm]"
            } ${
              selected === option.label
                ? "bg-[#172554] text-white border-[#172554]"
                : "bg-[#f8fafc] text-[#172554] border-[#172554]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Active panel fields */}
      {activeOption && (
        <div>
          {activeOption.fields.map((field: MeasurementField) => (
            <MeasurementRow key={field.id} field={field} isSide={isSide} />
          ))}
        </div>
      )}
    </div>
  );
}
