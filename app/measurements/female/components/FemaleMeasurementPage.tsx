"use client";

import React, { useState } from "react";
import { Printer } from "lucide-react";
import { femaleMeasurementForms } from "../femaleMeasurements";
import { FemalePrintableA4Sheet } from "./FemalePrintableA4Sheet";

export function FemaleMeasurementPage() {
  const [activeId, setActiveId] = useState<string>(femaleMeasurementForms[0].id);

  const activeForm = femaleMeasurementForms.find((f) => f.id === activeId)!;

  return (
    <div className="min-h-screen bg-[#e5e7eb] font-sans">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-[#0f172a] text-white shadow-lg print:hidden">
        <div className="max-w-[240mm] mx-auto flex items-center justify-between px-4 py-3 gap-4 flex-wrap">
          <h1 className="text-base font-extrabold uppercase tracking-widest text-white/90">
            Eman Threads - Female Measurements
          </h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#b08d57] hover:bg-[#c9a265] transition-colors rounded-lg text-sm font-bold shadow cursor-pointer"
          >
            <Printer size={16} />
            Print A4
          </button>
        </div>

        {/* Category tabs */}
        <div className="max-w-[240mm] mx-auto flex gap-0 border-t border-white/10 overflow-x-auto">
          {femaleMeasurementForms.map((form) => (
            <button
              key={form.id}
              onClick={() => setActiveId(form.id)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                form.id === activeId
                  ? "border-[#b08d57] text-[#f1ca90]"
                  : "border-transparent text-white/60 hover:text-white/90"
              }`}
            >
              {form.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── A4 Preview area ── */}
      <div className="py-6 px-4 flex justify-center print:p-0 print:block">
        <div className="a4-scale-wrapper print:!w-auto print:!h-auto">
          <div className="a4-scale-inner">
            <FemalePrintableA4Sheet form={activeForm} />
          </div>
        </div>
      </div>
    </div>
  );
}