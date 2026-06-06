"use client";

import React from "react";

interface CheckboxOptionProps {
  label: string;
  id: string;
}

/**
 * A small checkbox pill — matches the `.mini` / `.box` style from the HTML reference.
 * The box is a visual square (not a real HTML checkbox) to mirror the print-friendly
 * look of the approved HTML files exactly.
 */
export function CheckboxOption({ label, id }: CheckboxOptionProps) {
  return (
    <span className="inline-flex items-center gap-[1.5mm] mr-[2mm] text-[11px] text-[#334155] select-none">
      <span
        id={id}
        className="w-[5mm] h-[5mm] border-[1.6px] border-[#172554] inline-block rounded-[1px] shrink-0"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
