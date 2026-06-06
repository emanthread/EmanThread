"use client";

import React, { useState } from "react";
import type { FemaleMeasurementField, FemaleBottomTypeOption } from "../femaleMeasurements";
import { FemaleMeasurementRow } from "./FemaleMeasurementRow";

interface FemaleBottomTypeSelectorProps {
  options: FemaleBottomTypeOption[];
  isSide?: boolean;
}

export function FemaleBottomTypeSelector({ options, isSide }: FemaleBottomTypeSelectorProps) {
  const [selected, setSelected] = useState<string>(options[0]?.label ?? "");

  const activeOption = options.find((o) => o.label === selected);

  return (
    <div>
      {/* Toggle buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2.5mm",
          padding: "3.5mm",
          borderBottom: "1.5px solid #93a4bf",
          background: "#fff",
        }}
      >
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => setSelected(option.label)}
            style={{
              border: "2px solid #172554",
              background: selected === option.label ? "#172554" : "#f8fafc",
              color: selected === option.label ? "#fff" : "#172554",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              borderRadius: "4px",
              padding: isSide ? "3.2mm 2mm" : "2.8mm 2mm",
              cursor: "pointer",
              fontSize: isSide ? "15px" : "12.5px",
              transition: "all 0.15s ease",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Active panel fields */}
      {activeOption && (
        <div>
          {activeOption.fields.map((field) => (
            <FemaleMeasurementRow key={field.id} field={field} isSide={isSide} />
          ))}
        </div>
      )}
    </div>
  );
}