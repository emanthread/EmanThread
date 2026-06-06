"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";
import {
  UNIFIED_MEASUREMENT_EMPTY,
  GARMENT_TYPES,
  garmentTypeLabel,
} from "@/lib/validators/measurements-unified";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormMode = "edit" | "readonly" | "print";

export interface UnifiedMeasurementFormProps {
  data: Partial<UnifiedMeasurementFormData>;
  mode?: FormMode;
  onChange?: (data: UnifiedMeasurementFormData) => void;
  onSave?: (data: UnifiedMeasurementFormData) => Promise<void>;
  saving?: boolean;
  garmentTypeFixed?: string; // if set, garment type is not editable
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  measurementId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DataKey = keyof UnifiedMeasurementFormData;
type Data = UnifiedMeasurementFormData;

const FRACTIONS = ["", "1/2", "1/4", "1/8"] as const;

/** Extract whole number and fraction from a compound value like "42 1/2" */
function parseValue(val: string): { whole: string; frac: string } {
  const parts = (val || "").split(" ");
  return { whole: parts[0] || "", frac: parts[1] || "" };
}

function formatValue(whole: string, frac: string): string {
  return [whole, frac].filter(Boolean).join(" ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  label,
  urdu,
  k1,
  k2,
  data,
  onChange,
  readOnly,
}: {
  label: string;
  urdu?: string;
  k1: DataKey;
  k2: DataKey;
  data: Data;
  onChange: (k: DataKey, v: string) => void;
  readOnly: boolean;
}) {
  const v = parseValue(String(data[k1] ?? ""));
  return (
    <div className="grid grid-cols-12 items-center gap-1 py-1.5 border-b border-border/30">
      <div className="col-span-4 sm:col-span-5 text-xs font-medium leading-tight">
        {urdu && <span className="text-muted-foreground text-[10px] block">{urdu}</span>}
        {label}
      </div>
      <div className="col-span-4 sm:col-span-4">
        {readOnly ? (
          <span className="text-sm font-semibold px-2">{v.whole || "—"}</span>
        ) : (
          <Input
            type="number"
            min={0}
            step={1}
            value={v.whole}
            onChange={(e) => onChange(k1, formatValue(e.target.value, v.frac))}
            className="h-7 text-xs"
            placeholder="0"
          />
        )}
      </div>
      <div className="col-span-4 sm:col-span-3">
        {readOnly ? (
          <span className="text-xs text-muted-foreground px-1">{v.frac || ""}</span>
        ) : (
          <Select
            value={v.frac || "__none__"}
            onValueChange={(fv) => onChange(k1, formatValue(v.whole, fv === "__none__" ? "" : fv))}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {FRACTIONS.filter(Boolean).map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  k,
  data,
  onChange,
  readOnly,
}: {
  label: string;
  k: DataKey;
  data: Data;
  onChange: (k: DataKey, v: string) => void;
  readOnly: boolean;
}) {
  const checked = String(data[k] ?? "0") === "1";
  return (
    <label className={cn("flex items-center gap-2 cursor-pointer text-xs py-0.5", readOnly && "cursor-default")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(k, e.target.checked ? "1" : "0")}
        disabled={readOnly}
        className="h-3.5 w-3.5 rounded"
      />
      {label}
    </label>
  );
}

function TextRow({
  label,
  k,
  data,
  onChange,
  readOnly,
}: {
  label: string;
  k: DataKey;
  data: Data;
  onChange: (k: DataKey, v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-1 py-1.5 border-b border-border/30">
      <div className="col-span-5 text-xs font-medium">{label}</div>
      <div className="col-span-7">
        {readOnly ? (
          <span className="text-sm font-semibold px-2">{String(data[k] ?? "") || "—"}</span>
        ) : (
          <Input
            value={String(data[k] ?? "")}
            onChange={(e) => onChange(k, e.target.value)}
            className="h-7 text-xs"
            placeholder="e.g. 2"
          />
        )}
      </div>
    </div>
  );
}

// ─── Section mapping: which canonical fields to show per garment type ─────────

interface SectionDef {
  title: string;
  fields: { label: string; urdu?: string; k1: DataKey; k2: DataKey }[];
  checkboxes?: { label: string; k: DataKey }[];
  textInputs?: { label: string; k: DataKey }[];
}

function getSections(gt: string): SectionDef[] {
  const isMale = gt.startsWith("male_");

  // All garment types share these core fields
  const kameezSection: SectionDef = {
    title: isMale ? "کمیز / Kameez" : "شرٹ / Shirt",
    fields: [
      { label: "Length", urdu: "لمبائی", k1: "length1", k2: "length2" },
      { label: "Shoulder", urdu: "کندھا", k1: "shoulder1", k2: "shoulder2" },
      { label: "Chest", urdu: "سینہ", k1: "chest1", k2: "chest2" },
      { label: "Waist", urdu: "کمر", k1: "waist1", k2: "waist2" },
    ],
  };

  switch (gt) {
    case "male_shalwar_kameez":
      return [
        {
          ...kameezSection,
          fields: [
            ...kameezSection.fields,
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Golai", urdu: "گولائی", k1: "golai1", k2: "golai2" },
            { label: "Cuff", urdu: "کف", k1: "armcuff1", k2: "armcuff2" },
            { label: "Plate", urdu: "پلیٹ", k1: "armplate1", k2: "armplate2" },
            { label: "Gol Bazoo", urdu: "گول بازو", k1: "golbazoo1", k2: "golbazoo2" },
            { label: "Patti", urdu: "پٹی", k1: "armpatti1", k2: "armpatti2" },
            { label: "Collar Nok", urdu: "کالر نوک", k1: "collarnok1", k2: "collarnok2" },
            { label: "Bane", urdu: "بنے", k1: "bane1", k2: "bane2" },
          ],
          checkboxes: [
            { label: "Double", k: "doubleCb" },
            { label: "Single", k: "singleCb" },
            { label: "Gol", k: "golCb" },
            { label: "Choras", k: "chorasCb" },
            { label: "Bane", k: "baneCb" },
            { label: "Collar", k: "collarCb" },
            { label: "Round Neck", k: "roundneck" },
          ],
        },
        {
          title: "شلوار / Shalwar",
          fields: [
            { label: "Length", urdu: "لمبائی", k1: "shalwar1", k2: "shalwar2" },
            { label: "Gherra", urdu: "گھیرا", k1: "shalwarGherra1", k2: "shalwarGherra2" },
            { label: "Assan", urdu: "اسن", k1: "shalwarAssan1", k2: "shalwarAssan2" },
            { label: "Pancha", urdu: "پنچہ", k1: "shalwarPancha1", k2: "shalwarPancha2" },
          ],
        },
        {
          title: "ٹراؤزر / Trouser",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Gherra", k1: "trouserdata3", k2: "trouserdata4" },
            { label: "Assan", k1: "trouserdata5", k2: "trouserdata6" },
            { label: "Side", k1: "trouserdata7", k2: "trouserdata8" },
            { label: "Front", k1: "trouserdata9", k2: "trouserdata10" },
            { label: "Pancha", k1: "trouserdata11", k2: "trouserdata12" },
          ],
          textInputs: [{ label: "Other", k: "trouserdata13" }],
        },
        {
          title: "Pockets / جیب",
          fields: [],
          textInputs: [
            { label: "Front Pocket", k: "frontPocket" },
            { label: "Side Pocket", k: "sidePocket" },
            { label: "Shalwar Pocket", k: "shalwarPocket" },
          ],
        },
      ];

    case "male_simple_3_piece":
      return [
        {
          title: "کوٹ / Coat",
          fields: [
            ...kameezSection.fields,
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Assan", urdu: "اسن", k1: "shalwarAssan1", k2: "shalwarAssan2" },
          ],
        },
        {
          title: "پینٹ / Pent",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Pancha", k1: "trouserdata11", k2: "trouserdata12" },
            { label: "Tigh", k1: "trouserdata3", k2: "trouserdata4" },
            { label: "Waist", k1: "trouserdata5", k2: "trouserdata6" },
          ],
        },
      ];

    case "male_prince_coat":
      return [
        {
          title: "پرنس کوٹ / Prince Coat",
          fields: [
            ...kameezSection.fields,
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Sleeves (Straight)", urdu: "آستین (سیدھی)", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "golai1", k2: "golai2" },
          ],
          checkboxes: [
            { label: "Straight", k: "singleCb" },
            { label: "Down", k: "doubleCb" },
            { label: "Gol", k: "golCb" },
            { label: "Choras", k: "chorasCb" },
          ],
        },
        {
          title: "پینٹ / Pent",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Pancha (Tight)", k1: "trouserdata11", k2: "trouserdata12" },
            { label: "Waist", k1: "trouserdata5", k2: "trouserdata6" },
          ],
        },
      ];

    case "male_shirt":
      return [
        {
          title: "قمیض / Shirt",
          fields: [
            ...kameezSection.fields,
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "golai1", k2: "golai2" },
            { label: "Cuff", urdu: "کف", k1: "armcuff1", k2: "armcuff2" },
            { label: "Cuff Plate", urdu: "کف پلیٹ", k1: "armplate1", k2: "armplate2" },
            { label: "Patti Width", urdu: "پٹی چوڑائی", k1: "armpatti1", k2: "armpatti2" },
            { label: "Collar Nok", urdu: "کالر نوک", k1: "collarnok1", k2: "collarnok2" },
            { label: "Hip", urdu: "ہپ", k1: "ladHip1", k2: "ladHip2" },
          ],
          checkboxes: [
            { label: "Collar", k: "collarCb" },
            { label: "Bane", k: "baneCb" },
          ],
          textInputs: [
            { label: "Front Pocket", k: "frontPocket" },
          ],
        },
      ];

    // -- Female types --
    case "female_simple_shalwar":
      return [
        {
          title: "شرٹ / Shirt",
          fields: [
            { label: "Length", urdu: "لمبائی", k1: "length1", k2: "length2" },
            { label: "Shoulder", urdu: "کندھا", k1: "shoulder1", k2: "shoulder2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "ladGolai1", k2: "ladGolai2" },
            { label: "Mori", urdu: "موری", k1: "ladMori1", k2: "ladMori2" },
            { label: "Bell Bazoo", k1: "ladBellbazoo1", k2: "ladBellbazoo2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Chest", urdu: "سینہ", k1: "chest1", k2: "chest2" },
            { label: "Waist", urdu: "کمر", k1: "waist1", k2: "waist2" },
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
            { label: "Chaak", urdu: "چاک", k1: "ladChaak1", k2: "ladChaak2" },
          ],
        },
        {
          title: "ٹراؤزر / Trouser",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Pancha (Bottom)", k1: "trouserdata11", k2: "trouserdata12" },
            { label: "Tigh", k1: "trouserdata3", k2: "trouserdata4" },
            { label: "Elastic", k1: "ladTrouserdata15", k2: "ladTrouserdata16" as DataKey },
          ],
        },
        {
          title: "شلوار / Shalwar",
          fields: [
            { label: "Length", k1: "ladSimpleShalwar1", k2: "ladSimpleShalwar2" },
            { label: "Pancha", k1: "ladSimpleShalwarPancha1", k2: "ladSimpleShalwarPancha2" },
            { label: "Gherra", k1: "ladSimpleShalwarGherra1", k2: "ladSimpleShalwarGherra2" },
            { label: "Elastic", k1: "ladLasticSimpleShalwar", k2: "ladTrouserdata16" as DataKey },
          ],
        },
        {
          title: "پلازو / Plazo / Belt Shalwar",
          fields: [
            { label: "Length", k1: "ladShalwarBelt1", k2: "ladShalwarBelt2" },
            { label: "Pancha", k1: "ladShalwarBeltPancha1", k2: "ladShalwarBeltPancha2" },
            { label: "Gherra", k1: "ladShalwarBeltGherra1", k2: "ladShalwarBeltGherra2" },
            { label: "Elastic", k1: "ladLasticShalwarBelt", k2: "ladTrouserdata16" as DataKey },
          ],
        },
      ];

    case "female_frock":
      return [
        {
          title: "فراک / Frock",
          fields: [
            { label: "Length", urdu: "لمبائی", k1: "length1", k2: "length2" },
            { label: "Shoulder", urdu: "کندھا", k1: "shoulder1", k2: "shoulder2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "ladGolai1", k2: "ladGolai2" },
            { label: "Mori", urdu: "موری", k1: "ladMori1", k2: "ladMori2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Chest", urdu: "سینہ", k1: "chest1", k2: "chest2" },
            { label: "Waist", urdu: "کمر", k1: "waist1", k2: "waist2" },
            { label: "Gherra", urdu: "گھیرا", k1: "gherra1", k2: "gherra2" },
          ],
        },
        {
          title: "ٹراؤزر / Trouser",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Pancha", k1: "trouserdata11", k2: "trouserdata12" },
            { label: "Tigh", k1: "trouserdata3", k2: "trouserdata4" },
            { label: "Elastic", k1: "ladTrouserdata15", k2: "ladTrouserdata16" as DataKey },
          ],
        },
      ];

    case "female_saari":
      return [
        {
          title: "ساڑی بلاؤز / Saari Blouse",
          fields: [
            { label: "Length", urdu: "لمبائی", k1: "length1", k2: "length2" },
            { label: "Shoulder", urdu: "کندھا", k1: "shoulder1", k2: "shoulder2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "ladGolai1", k2: "ladGolai2" },
            { label: "Mori", urdu: "موری", k1: "ladMori1", k2: "ladMori2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Chest", urdu: "سینہ", k1: "chest1", k2: "chest2" },
            { label: "Waist", urdu: "کمر", k1: "waist1", k2: "waist2" },
            { label: "Hip", urdu: "ہپ", k1: "ladHip1", k2: "ladHip2" },
          ],
        },
        {
          title: "ساڑی / Saari",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Waist", k1: "trouserdata3", k2: "trouserdata4" },
          ],
        },
      ];

    case "female_lehnga_kurti":
      return [
        {
          title: "کرتی / Kurti",
          fields: [
            { label: "Length", urdu: "لمبائی", k1: "length1", k2: "length2" },
            { label: "Shoulder", urdu: "کندھا", k1: "shoulder1", k2: "shoulder2" },
            { label: "Sleeves", urdu: "آستین", k1: "sleeves1", k2: "sleeves2" },
            { label: "Arm Hole Golai", k1: "ladGolai1", k2: "ladGolai2" },
            { label: "Mori", urdu: "موری", k1: "ladMori1", k2: "ladMori2" },
            { label: "Neck", urdu: "گلا", k1: "neck1", k2: "neck2" },
            { label: "Chest", urdu: "سینہ", k1: "chest1", k2: "chest2" },
            { label: "Waist", urdu: "کمر", k1: "waist1", k2: "waist2" },
            { label: "Hip", urdu: "ہپ", k1: "ladHip1", k2: "ladHip2" },
            { label: "Chaak", urdu: "چاک", k1: "ladChaak1", k2: "ladChaak2" },
          ],
        },
        {
          title: "لیہنگا / Lehnga",
          fields: [
            { label: "Length", k1: "trouserdata1", k2: "trouserdata2" },
            { label: "Waist", k1: "trouserdata3", k2: "trouserdata4" },
          ],
        },
      ];

    default:
      return [kameezSection];
  }
}

// ─── Print slip generator ─────────────────────────────────────────────────────

function generatePrintHTML(
  data: Data,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string,
  measurementId?: string
): string {
  const gt = data.garmentType;
  const isMale = gt.startsWith("male_");
  const sections = getSections(gt);

  function esc(s: string) {
    return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"");
  }

  function rowHtml(label: string, v1: string, v2: string): string {
    const val = [v1, v2].filter(Boolean).join(" ");
    if (!val) return "";
    return `<tr><td style="padding:2px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;width:52%;">${esc(label)}</td><td style="padding:2px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;font-weight:600;">${esc(val)}</td></tr>`;
  }

  function sectionHtml(title: string, rows: string): string {
    if (!rows) return "";
    return `<div style="margin-bottom:6px;"><div style="font-size:10px;font-weight:700;border-bottom:1.5px solid #1a1a1a;padding-bottom:1px;margin-bottom:3px;">${esc(title)}</div><table style="width:100%;border-collapse:collapse;">${rows}</table></div>`;
  }

  let body = "";

  for (const section of sections) {
    let rows = "";
    for (const f of section.fields) {
      const v1 = String(data[f.k1] ?? "");
      const v2 = String(data[f.k2] ?? "");
      rows += rowHtml(f.label, v1, v2);
    }
    body += sectionHtml(section.title, rows);

    if (section.checkboxes) {
      const checks = section.checkboxes
        .filter((c) => String(data[c.k] ?? "0") === "1")
        .map((c) => `<span style="display:inline-block;margin:1px 4px;background:#f3f4f6;border-radius:3px;padding:1px 5px;font-size:9px;">✓ ${esc(c.label)}</span>`)
        .join("");
      if (checks) {
        body += `<div style="margin-bottom:6px;font-size:9px;color:#374151;">${checks}</div>`;
      }
    }

    if (section.textInputs) {
      const texts = section.textInputs
        .filter((t) => String(data[t.k] ?? "").trim())
        .map((t) => `${esc(t.label)}: ${esc(String(data[t.k] ?? ""))}`)
        .join(" · ");
      if (texts) {
        body += `<div style="font-size:9px;color:#4b5563;margin-bottom:4px;">${texts}</div>`;
      }
    }
  }

  if (data.notes) {
    body += `<div style="margin-top:4px;padding:4px 6px;background:#f9fafb;border-radius:3px;font-size:9px;"><strong>Notes:</strong> ${esc(data.notes)}</div>`;
  }

  const customerDiv = [
    customerName && `<div style="font-size:10px;font-weight:700;">${esc(customerName)}</div>`,
    customerEmail && `<div style="font-size:9px;color:#6b7280;">${esc(customerEmail)}</div>`,
    customerPhone && `<div style="font-size:9px;color:#6b7280;">${esc(customerPhone)}</div>`,
    measurementId && `<div style="font-size:8px;color:#9ca3af;">ID: ${measurementId.slice(0, 8).toUpperCase()}</div>`,
    `<div style="font-size:9px;">${garmentTypeLabel(gt)}</div>`,
    data.deliveryDate && `<div style="font-size:9px;">Delivery: ${new Date(data.deliveryDate).toLocaleDateString()}</div>`,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html><head>
  <title>Measurement Slip – ${esc(customerName || "")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 8mm; width: 105mm; min-height: 148mm; }
    table { width: 100%; border-collapse: collapse; }
    @page { size: A6 portrait; margin: 4mm; }
    @media print { body { padding: 0; } }
  </style>
</head><body onload="window.print()" onafterprint="window.close()">
  <table style="width:100%;margin-bottom:6px;border-bottom:1.5px solid #1a1a1a;padding-bottom:5px;">
    <tr><td><div style="font-family:Georgia,serif;font-size:14px;font-weight:700;line-height:1.2;">Emaan Thread</div>
    <div style="font-size:9px;color:#6b7280;">Tailor Measurement Slip</div></td>
    <td style="text-align:right;vertical-align:top;">${customerDiv}</td></tr>
  </table>
  ${body}
  <hr style="border-color:#d1d5db;margin:6px 0;" />
  <div style="text-align:center;font-size:8px;color:#9ca3af;">Emaan Thread · ${new Date().toLocaleDateString()}</div>
</body></html>`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UnifiedMeasurementForm({
  data: initialData,
  mode = "edit",
  onChange,
  onSave,
  saving = false,
  garmentTypeFixed,
  customerName,
  customerEmail,
  customerPhone,
  measurementId,
}: UnifiedMeasurementFormProps) {
  const readOnly = mode === "readonly" || mode === "print";
  const [data, setData] = useState<Data>({
    ...UNIFIED_MEASUREMENT_EMPTY,
    ...initialData,
  });

  const set = useCallback(
    (k: DataKey, v: string) => {
      if (readOnly) return;
      const next = { ...data, [k]: v };
      setData(next);
      onChange?.(next);
    },
    [data, readOnly, onChange]
  );

  const setGarmentType = useCallback(
    (gt: string) => {
      if (readOnly || garmentTypeFixed) return;
      const next = { ...data, garmentType: gt as Data["garmentType"] };
      setData(next);
      onChange?.(next);
    },
    [data, readOnly, garmentTypeFixed, onChange]
  );

  const sections = getSections(data.garmentType);
  const isMale = data.garmentType.startsWith("male_");

  const handlePrint = () => {
    const win = window.open("about:blank", "_blank", "width=500,height=700");
    if (!win) return;
    const html = generatePrintHTML(data, customerName, customerEmail, customerPhone, measurementId);
    win.document.write(html);
    win.document.close();
  };

  const handleSubmit = async () => {
    if (!onSave) return;
    await onSave(data);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Meta ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <Select
            value={data.gender}
            onValueChange={(v) => set("gender", v)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male (مرد)</SelectItem>
              <SelectItem value="Female">Female (عورت)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Garment Type</Label>
          <Select
            value={data.garmentType}
            onValueChange={setGarmentType}
            disabled={readOnly || !!garmentTypeFixed}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GARMENT_TYPES.map((gt) => (
                <SelectItem key={gt} value={gt}>
                  {garmentTypeLabel(gt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Badge
            className={cn(
              "mt-1 capitalize",
              data.status === "complete"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            )}
          >
            {data.status}
          </Badge>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Delivery Date</Label>
          <Input
            type="date"
            value={data.deliveryDate || ""}
            onChange={(e) => set("deliveryDate", e.target.value)}
            disabled={readOnly}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* ── Fields grid: 2 columns ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className={idx >= 2 ? "md:col-span-2" : ""}>
            <h3 className="font-semibold text-sm mb-2 pb-1 border-b-2">
              {section.title}
            </h3>
            {section.fields.length > 0 && (
              <div className="text-[10px] text-muted-foreground grid grid-cols-12 mb-1">
                <span className="col-span-4 sm:col-span-5">Field</span>
                <span className="col-span-4">Value</span>
                <span className="col-span-3">Fraction</span>
              </div>
            )}
            {section.fields.map((f, fi) => (
              <FieldRow
                key={fi}
                label={f.label}
                urdu={f.urdu}
                k1={f.k1}
                k2={f.k2}
                data={data}
                onChange={set}
                readOnly={readOnly}
              />
            ))}
            {section.checkboxes && section.checkboxes.length > 0 && (
              <div className="mt-2 p-2 bg-muted/20 rounded-md">
                <p className="text-xs font-medium mb-1">Style / قسم</p>
                <div className="flex flex-wrap gap-3">
                  {section.checkboxes.map((c, ci) => (
                    <CheckRow
                      key={ci}
                      label={c.label}
                      k={c.k}
                      data={data}
                      onChange={set}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            )}
            {section.textInputs && section.textInputs.length > 0 && (
              <div className="mt-2 space-y-1">
                {section.textInputs.map((t, ti) => (
                  <TextRow
                    key={ti}
                    label={t.label}
                    k={t.k}
                    data={data}
                    onChange={set}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-1">
        <Label className="text-xs">Notes / نوٹ</Label>
        {readOnly ? (
          <p className="text-sm bg-muted/20 rounded-lg p-3 italic">
            {data.notes || "No notes provided."}
          </p>
        ) : (
          <Textarea
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Special instructions..."
            className="text-sm"
          />
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-between items-center">
        {mode === "print" && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Slip (A6)
          </Button>
        )}
        {mode === "edit" && onSave && (
          <Button onClick={handleSubmit} disabled={saving} className="ml-auto">
            {saving ? "Saving..." : "Save Measurements"}
          </Button>
        )}
      </div>
    </div>
  );
}
