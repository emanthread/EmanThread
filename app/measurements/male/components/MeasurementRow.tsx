"use client";

import React from "react";
import type { MeasurementField } from "../maleMeasurements";
import { CheckboxOption } from "./CheckboxOption";

interface MeasurementRowProps {
  field: MeasurementField;
  isSide?: boolean;
}

/**
 * Renders one row of the measurement card.
 * Mirrors the .row / .label / .entry structure from the HTML references.
 */
export function MeasurementRow({ field, isSide }: MeasurementRowProps) {
  // ── Pocket grid row ───────────────────────────────────────────────────────
  if (field.type === "pocket-grid") {
    return (
      <div
        className={`border-b border-[#93a4bf] last:border-b-0 ${
          isSide ? "min-h-[12mm]" : "min-h-[19mm]"
        }`}
      >
        <div className="grid grid-cols-[35mm_1fr]">
          <div className="py-[3.2mm] px-[3mm] font-bold text-[#172554] border-r border-[#93a4bf] text-[15px] bg-[#fbfdff]">
            {field.label}
          </div>
          <div className="py-[2mm] px-[3mm] flex items-center gap-[3mm] flex-wrap">
            {isSide ? (
              /* Vertical pill layout in the side panel */
              <div className="flex flex-col gap-[1.5mm] w-full">
                {field.pills?.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-[2mm] border border-[#cbd5e1] rounded-full py-[1.8mm] px-[2mm] text-[13px] bg-[#f8fafc] text-[#334155]"
                  >
                    <span className="w-[5mm] h-[5mm] border-[1.6px] border-[#172554] inline-block rounded-[1px]" />
                    {pill}
                  </span>
                ))}
              </div>
            ) : (
              <div
                className={`grid w-full gap-[3mm]`}
                style={{
                  gridTemplateColumns: `repeat(${field.pills?.length ?? 1}, 1fr)`,
                }}
              >
                {field.pills?.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-[2mm] border border-[#cbd5e1] rounded-full py-[1.5mm] px-[2.6mm] text-[10.5px] bg-[#f8fafc] text-[#334155]"
                  >
                    <span className="w-[5mm] h-[5mm] border-[1.6px] border-[#172554] inline-block rounded-[1px]" />
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-grid row (Sleeves / Neck with named input boxes) ─────────────────
  if (field.type === "sub-grid") {
    const hasDualColumns =
      field.checkboxes && field.checkboxes.length > 0 && field.id.includes("sk-sleeves");

    return (
      <div
        className={`border-b border-[#93a4bf] last:border-b-0 ${
          isSide ? "min-h-[12mm]" : "min-h-[19mm]"
        }`}
      >
        <div className="grid grid-cols-[35mm_1fr]">
          <div className="py-[3.2mm] px-[3mm] font-bold text-[#172554] border-r border-[#93a4bf] text-[15px] bg-[#fbfdff]">
            {field.label}
          </div>
          <div className="py-[2mm] px-[3mm] flex items-stretch gap-[3mm] flex-wrap">
            {hasDualColumns ? (
              /* Sleeves with Double/Single alongside sub-grid */
              <div className="flex w-full gap-[3mm]">
                <div
                  className="grid flex-1 gap-[2mm] items-stretch"
                  style={{
                    gridTemplateColumns: `repeat(${field.subItems?.length ?? 1}, 1fr)`,
                  }}
                >
                  {field.subItems?.map((sub, i) => (
                    <SubItemBox
                      key={`${sub.label}-${i}`}
                      label={sub.label}
                      isCheckbox={sub.isCheckbox}
                      id={sub.isCheckbox ? `${field.id}-${sub.label}` : undefined}
                    />
                  ))}
                </div>
                {/* Double / Single checkboxes as a vertical stack */}
                <div className="flex flex-col items-start justify-center gap-[2.2mm] pl-[3mm]">
                  {field.checkboxes?.map((cb, i) => (
                    <CheckboxOption
                      key={`${cb.label}-${i}`}
                      id={`${field.id}-${cb.label}`}
                      label={cb.label}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="grid w-full gap-[2mm] items-stretch"
                  style={{
                    gridTemplateColumns: `repeat(${
                      isSide
                        ? Math.min(field.subItems?.length ?? 1, 2)
                        : field.subItems?.length ?? 1
                    }, 1fr)`,
                  }}
                >
                  {field.subItems?.map((sub, i) => (
                    <SubItemBox
                      key={`${sub.label}-${i}`}
                      label={sub.label}
                      isCheckbox={sub.isCheckbox}
                      id={sub.isCheckbox ? `${field.id}-${sub.label}` : undefined}
                    />
                  ))}
                </div>
                {/* Inline checkboxes (e.g. Neck row's Collar/Bane in shirt) */}
                {field.checkboxes && field.checkboxes.length > 0 && (
                  <div className="flex flex-wrap gap-[2mm] items-center">
                    {field.checkboxes.map((cb, i) => (
                      <CheckboxOption
                        key={`${cb.label}-${i}`}
                        id={`${field.id}-${cb.label}`}
                        label={cb.label}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Checkbox-row (inline checkboxes with an input line) ───────────────────
  if (field.type === "checkbox-row") {
    return (
      <div
        className={`border-b border-[#93a4bf] last:border-b-0 ${
          isSide ? "min-h-[12mm]" : "min-h-[19mm]"
        }`}
      >
        <div className="grid grid-cols-[35mm_1fr]">
          <div className="py-[3.2mm] px-[3mm] font-bold text-[#172554] border-r border-[#93a4bf] text-[15px] bg-[#fbfdff]">
            {field.label}
          </div>
          <div className="py-[2mm] px-[3mm] flex items-center gap-[3mm] flex-wrap">
            {/* Input line */}
            <div className="h-[10mm] border-b border-b-[#64748b] flex-1 min-w-[32mm]" />
            {/* Checkboxes */}
            {field.checkboxes?.map((cb, i) => (
              <CheckboxOption
                key={`${cb.label}-${i}`}
                id={`${field.id}-${cb.label}`}
                label={cb.label}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Default: plain input row ──────────────────────────────────────────────
  return (
    <div
      className={`border-b border-[#93a4bf] last:border-b-0 ${
        isSide ? "min-h-[12mm]" : "min-h-[19mm]"
      }`}
    >
      <div className="grid grid-cols-[35mm_1fr]">
        <div className="py-[3.2mm] px-[3mm] font-bold text-[#172554] border-r border-[#93a4bf] text-[15px] bg-[#fbfdff]">
          {field.label}
        </div>
        <div className="py-[2mm] px-[3mm] flex items-center gap-[3mm]">
          <div className="h-[10mm] border-b border-b-[#64748b] flex-1 min-w-[32mm]" />
        </div>
      </div>
    </div>
  );
}

// ── Sub-item box (named measurement cell) ────────────────────────────────────
function SubItemBox({ label, isCheckbox, id }: { label: string; isCheckbox?: boolean; id?: string }) {
  if (isCheckbox) {
    return (
      <div className="border border-[#cbd5e1] bg-[#f8fafc] rounded-[2px] min-h-[15mm] p-[2mm] text-[12.5px] text-[#172554] font-[650] flex flex-col justify-center items-center">
        <span className="inline-flex items-center gap-[1.5mm] text-[11px] text-[#334155] select-none">
          <span
            id={id}
            className="w-[5mm] h-[5mm] border-[1.6px] border-[#172554] inline-block rounded-[1px] shrink-0"
            aria-hidden="true"
          />
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-[#cbd5e1] bg-[#f8fafc] rounded-[2px] min-h-[15mm] p-[2mm] text-[12.5px] text-center text-[#172554] font-[650] flex flex-col justify-center">
      {label}
      <span className="block h-[5mm] border-b border-b-[#64748b] mt-[2mm]" />
    </div>
  );
}
