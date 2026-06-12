"use client";

import React, { useState } from "react";
import {
  A4PageLayout,
  A4Card,
  A4Row,
  A4Input,
  A4Checkbox,
  A4Pill,
  A4SubInput,
  A4MiniToggle,
} from "./A4PageLayout";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";

type Data = UnifiedMeasurementFormData;
type DataKey = keyof Data;

export interface A4MeasurementFormProps {
  data: Data;
  onChange: (data: Data) => void;
  readOnly?: boolean;
  garmentType: Data["garmentType"];
  isAdmin?: boolean;
}

// ─── Field Configurations per garment type, mirroring the HTML layouts ───────

interface FieldConfig {
  label: string;
  key: DataKey;
  type: "text" | "toggle" | "togglegroup";
  group?: string;
  placeholder?: string;
  subInputs?: { label: string; key: DataKey }[];
  toggles?: { label: string; key: DataKey }[];
  groupToggles?: boolean;
  gridCols?: number;
  toggleType?: "mini" | "pill";
  forceSubgrid?: boolean;
}

interface SectionConfig {
  title: string;
  fields: FieldConfig[];
  side?: boolean;
  // Extra toggles/sub-fields shown in the entry area alongside the input
  toggles?: { label: string; key: DataKey }[];
  subInputs?: { label: string; key: DataKey }[];
}

interface FormLayout {
  title: string;
  sections: SectionConfig[];
  rightSections?: SectionConfig[];
}

const CONFIGS: Record<string, FormLayout> = {
  male_shalwar_kameez: {
    title: "Men Shalwar Kameez",
    sections: [
      {
        title: "Kameez Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [
              { label: "Arm Hole Golai", key: "golai1" },
              { label: "Cuff", key: "armcuff1" },
              { label: "Cuff Plate", key: "armplate1" },
              { label: "Gol Bazoo", key: "golbazoo1" },
            ],
            toggles: [
              { label: "Double", key: "doubleCb" },
              { label: "Single", key: "singleCb" },
            ],
            groupToggles: true,
          },
          {
            label: "Neck",
            key: "neck1",
            type: "text",
            subInputs: [
              { label: "Patti Width", key: "armpatti1" },
              { label: "Bane Width", key: "bane1" },
              { label: "Collar Nok", key: "collarnok1" },
            ],
            toggles: [
              { label: "Collar", key: "collarCb" },
              { label: "Bane", key: "baneCb" },
            ],
          },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          {
            label: "Hip",
            key: "ladHip1",
            type: "text",
            toggles: [
              { label: "Gol", key: "golCb" },
              { label: "Choras", key: "chorasCb" },
            ],
          },
        ],
      },
      {
        title: "Pocket",
        fields: [],
        toggles: [
          { label: "Front", key: "frontPocket" },
          { label: "Side", key: "sidePocket" },
        ],
      },
    ],
    rightSections: [],
  },

  male_prince_coat: {
    title: "Prince Coat 3 Piece Suit",
    sections: [
      {
        title: "Coat Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          {
            label: "Shoulder",
            key: "shoulder1",
            type: "text",
            toggles: [
              { label: "Straight", key: "straightCb" },
              { label: "Down", key: "downCb" },
            ],
          },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [{ label: "Arm Hole Golai", key: "golai1" }],
            toggles: [{ label: "Gol Bazoo", key: "golbazoo1" }],
          },
          {
            label: "Neck",
            key: "neck1",
            type: "text",
            toggles: [
              { label: "Collar", key: "collarCb" },
              { label: "Bane", key: "baneCb" },
            ],
          },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          {
            label: "Hip",
            key: "ladHip1",
            type: "text",
            toggles: [
              { label: "Gol", key: "golCb" },
              { label: "Choras", key: "chorasCb" },
            ],
          },
        ],
      },
    ],
    rightSections: [
      {
        title: "Pent",
        fields: [
          { label: "1. Length", key: "trouserLength1", type: "text" },
          { label: "2. Pancha", key: "trouserPancha1", type: "text" },
          { label: "3. Tigh", key: "trouserTigh1", type: "text" },
          { label: "4. Waist", key: "trouserWaist1", type: "text" },
        ],
        side: true,
      },
    ],
  },

  male_simple_3_piece: {
    title: "Simple 3 Piece Suit",
    sections: [
      {
        title: "Coat Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [{ label: "Gol Bazoo", key: "golbazoo1" }],
          },
          {
            label: "Neck",
            key: "neck1",
            type: "text",
            gridCols: 2,
            forceSubgrid: true,
            subInputs: [],
            toggles: [
              { label: "Collar", key: "collarCb" },
              { label: "Bane", key: "baneCb" },
            ],
            toggleType: "mini",
          },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Hip", key: "ladHip1", type: "text" },
        ],
      },
    ],
    rightSections: [
      {
        title: "Pent",
        fields: [
          { label: "1. Length", key: "trouserLength1", type: "text" },
          { label: "2. Pencha", key: "trouserPancha1", type: "text" },
          { label: "3. Tigh", key: "trouserTigh1", type: "text" },
          { label: "4. Assan", key: "trouserAssan1", type: "text" },
          { label: "5. Waist", key: "trouserWaist1", type: "text" },
        ],
        side: true,
      },
    ],
  },

  male_shirt: {
    title: "Shirt",
    sections: [
      {
        title: "Shirt Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [{ label: "Arm Hole Golai", key: "golai1" }],
            toggles: [
              { label: "Caff", key: "armcuff1" },
              { label: "Caff Plate", key: "armplate1" },
            ],
          },
          {
            label: "Neck",
            key: "neck1",
            type: "text",
            gridCols: 3,
            subInputs: [
              { label: "Patti Width", key: "armpatti1" },
              { label: "Bane Width", key: "bane1" },
              { label: "Collar Nok", key: "collarnok1" },
            ],
            toggles: [
              { label: "Collar", key: "collarCb" },
              { label: "Bane", key: "baneCb" },
            ],
            toggleType: "pill",
          },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Hip", key: "ladHip1", type: "text" },
          {
            label: "Pocket",
            key: "frontPocket",
            type: "toggle",
            toggles: [{ label: "Front", key: "frontPocket" }],
          },
        ],
      },
    ],
  },

  female_frock: {
    title: "Ladies Frock",
    sections: [
      {
        title: "Frock Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [
              { label: "Arm Hole Golai", key: "ladGolai1" },
              { label: "Mori", key: "ladMori1" },
            ],
          },
          { label: "Neck", key: "neck1", type: "text" },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Gherra", key: "gherra1", type: "text" },
        ],
      },
    ],
    rightSections: [
      {
        title: "Trouser",
        fields: [
          { label: "1. Length", key: "trouserLength1", type: "text" },
          { label: "2. Pancha", key: "trouserPancha1", type: "text" },
          { label: "3. Tigh", key: "trouserTigh1", type: "text" },
          { label: "4. Elastic", key: "trouserElastic1", type: "text" },
        ],
        side: true,
      },
    ],
  },

  female_simple_shalwar: {
    title: "Ladies Shalwar Kameez",
    sections: [
      {
        title: "Kameez Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [
              { label: "Arm Hole Golai", key: "ladGolai1" },
              { label: "Mori", key: "ladMori1" },
              { label: "Bell Bazoo", key: "ladBellbazoo1" },
            ],
          },
          { label: "Neck", key: "neck1", type: "text" },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Gherra", key: "gherra1", type: "text" },
          { label: "Chaak", key: "ladChaak1", type: "text" },
          {
            label: "Options",
            key: "zipCb",
            type: "toggle",
            toggles: [
              { label: "Zip", key: "zipCb" },
              { label: "Plate", key: "armplate1" },
            ],
          },
        ],
      },
    ],
    rightSections: [],
  },

  female_lehnga_kurti: {
    title: "Lehnga Kurti",
    sections: [
      {
        title: "Kurti Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [
              { label: "Arm Hole Golai", key: "ladGolai1" },
              { label: "Mori", key: "ladMori1" },
            ],
          },
          { label: "Neck", key: "neck1", type: "text" },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Hip", key: "ladHip1", type: "text" },
          { label: "Chaak", key: "ladChaak1", type: "text" },
        ],
      },
    ],
    rightSections: [
      {
        title: "Lehnga",
        fields: [
          { label: "1. Length", key: "trouserLength1", type: "text" },
          { label: "2. Waist", key: "trouserWaist1", type: "text" },
        ],
        side: true,
      },
    ],
  },

  female_saari: {
    title: "Saari Blouse",
    sections: [
      {
        title: "Blouse Measurements",
        fields: [
          { label: "Length", key: "length1", type: "text" },
          { label: "Shoulder", key: "shoulder1", type: "text" },
          {
            label: "Sleeves",
            key: "sleeves1",
            type: "text",
            subInputs: [
              { label: "Arm Hole Golai", key: "ladGolai1" },
              { label: "Mori", key: "ladMori1" },
            ],
          },
          { label: "Neck", key: "neck1", type: "text" },
          { label: "Chest", key: "chest1", type: "text" },
          { label: "Waist", key: "waist1", type: "text" },
          { label: "Hip", key: "ladHip1", type: "text" },
        ],
      },
    ],
    rightSections: [
      {
        title: "Saari",
        fields: [
          { label: "1. Length", key: "trouserLength1", type: "text" },
          { label: "2. Waist", key: "trouserWaist1", type: "text" },
        ],
        side: true,
      },
    ],
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function A4MeasurementForm({
  data,
  onChange,
  readOnly = false,
  garmentType,
  isAdmin = false,
}: A4MeasurementFormProps) {
  const config = CONFIGS[garmentType];
  if (!config) {
    return <div className="p-4 text-center text-muted-foreground">Unknown garment type: {garmentType}</div>;
  }

  const setField = (k: DataKey, value: string) => {
    onChange({ ...data, [k]: value });
  };

  const setToggle = (k: DataKey, checked: boolean) => {
    onChange({ ...data, [k]: checked ? "1" : "0" });
  };

  const hasRightSections = config.rightSections && config.rightSections.length > 0;

  const renderSection = (section: SectionConfig, isSide: boolean) => (
    <A4Card key={section.title} title={section.title}>
      {section.fields.map((field, idx) => {
        const value = String(data[field.key] ?? "");
        const hasSubs = (field.subInputs && field.subInputs.length > 0) || field.forceSubgrid;
        const hasToggles = field.toggles && field.toggles.length > 0;

        return (
          <A4Row key={`${field.key}-${idx}`} label={field.label}>
            {field.type !== "toggle" && (
              <A4Input
                value={value}
                onChange={(v) => setField(field.key, v)}
                readOnly={readOnly}
              />
            )}
            {hasSubs && (
              <div className="a4-subgrid" style={{ gridTemplateColumns: field.gridCols ? `repeat(${field.gridCols}, 1fr)` : undefined }}>
                {field.subInputs?.map((si) => (
                  <A4SubInput
                    key={si.key}
                    label={si.label}
                    value={String(data[si.key] ?? "")}
                    onChange={(v) => setField(si.key, v)}
                    readOnly={readOnly}
                  />
                ))}
                {hasToggles && field.groupToggles && (
                  <div className="a4-subitem double-single">
                    {field.toggles!.map((t) => (
                      <A4MiniToggle
                        key={t.key}
                        label={t.label}
                        checked={String(data[t.key] ?? "0") === "1"}
                        onChange={(v) => setToggle(t.key, v)}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                )}
                {hasToggles && !field.groupToggles && field.toggles!.map((t) => {
                  const ToggleComponent = field.toggleType === "pill" ? A4Pill : A4MiniToggle;
                  return (
                    <div className="a4-subitem" key={t.key} style={{ alignItems: "center" }}>
                      <ToggleComponent
                        label={t.label}
                        checked={String(data[t.key] ?? "0") === "1"}
                        onChange={(v) => setToggle(t.key, v)}
                        readOnly={readOnly}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {!hasSubs && hasToggles && (
              <div style={{ display: "flex", gap: "2mm", marginTop: field.type === "toggle" ? "0" : "2mm", flexWrap: "wrap" }}>
                {field.toggles!.map((t) => (
                  <A4Pill
                    key={t.key}
                    label={t.label}
                    checked={String(data[t.key] ?? "0") === "1"}
                    onChange={(v) => setToggle(t.key, v)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </A4Row>
        );
      })}
      {/* Section-level toggles (e.g., Pocket) */}
      {section.toggles && section.toggles.length > 0 && (
        <div className="a4-row" style={{ borderBottom: "none" }}>
          <div className="a4-label" style={{ borderRight: "none" }}>Pocket</div>
          <div className="a4-entry">
            <div style={{ display: "flex", gap: "3mm", flexWrap: "wrap" }}>
              {section.toggles.map((t) => (
                <A4Pill
                  key={t.key}
                  label={t.label}
                  checked={String(data[t.key] ?? "0") === "1"}
                  onChange={(v) => setToggle(t.key, v)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </A4Card>
  );

  return (
    <div>
      <A4PageLayout
        title={config.title}
        serialNumber={data.serialNumber}
        customerName={data.customerName}
        deliveryDate={data.deliveryDate}
        onSerialChange={(v) => setField("serialNumber", v)}
        onNameChange={(v) => setField("customerName", v)}
        onDeliveryChange={(v) => setField("deliveryDate", v)}
        isAdmin={isAdmin}
        readOnly={readOnly}
        sideChildren={
          garmentType === "male_shalwar_kameez" ? (
            <BottomTypeTabs data={data} onChange={onChange} readOnly={readOnly} variant="mens" />
          ) : garmentType === "female_simple_shalwar" ? (
            <BottomTypeTabs data={data} onChange={onChange} readOnly={readOnly} variant="ladies" />
          ) : hasRightSections
            ? config.rightSections!.map((s) => renderSection(s, true))
            : undefined
        }
      >
          {config.sections.map((s) => renderSection(s, false))}
      </A4PageLayout>
    </div>
  );
}

// ─── Male Shalwar Kameez Bottom Type Switcher ──────────────────────────────

function BottomTypeTabs({
  data,
  onChange,
  readOnly,
  variant,
}: {
  data: Data;
  onChange: (d: Data) => void;
  readOnly: boolean;
  variant: 'mens' | 'ladies';
}) {
  const [bottomType, setBottomType] = useState<"shalwar" | "trouser" | "simple" | "belt">(() => {
    if (variant === 'ladies') {
      if (data.ladShalwarBelt1 || data.ladShalwarBeltPancha1 || data.ladShalwarBeltGherra1) return "belt";
      if (data.trouserLength1 || data.trouserPancha1 || data.trouserTigh1) return "trouser";
      return "simple";
    } else {
      if (data.trouserLength1 || data.trouserPancha1 || data.trouserTigh1) return "trouser";
      return "shalwar";
    }
  });

  React.useEffect(() => {
    if (variant === 'ladies') {
      if (data.ladShalwarBelt1 || data.ladShalwarBeltPancha1 || data.ladShalwarBeltGherra1) {
        setBottomType("belt");
      } else if (data.trouserLength1 || data.trouserPancha1 || data.trouserTigh1) {
        setBottomType("trouser");
      } else {
        setBottomType("simple");
      }
    } else {
      if (data.trouserLength1 || data.trouserPancha1 || data.trouserTigh1) {
        setBottomType("trouser");
      } else {
        setBottomType("shalwar");
      }
    }
  }, [variant, data.serialNumber]);

  const setField = (k: DataKey, v: string) => onChange({ ...data, [k]: v });
  const setToggle = (k: DataKey, v: boolean) => onChange({ ...data, [k]: v ? "1" : "0" });

  const btnStyle = (tab: string): React.CSSProperties => ({
    flex: 1,
    border: "2px solid var(--ink)",
    background: bottomType === tab ? "var(--ink)" : "#fff",
    color: bottomType === tab ? "#fff" : "var(--ink)",
    fontWeight: 800,
    padding: "3mm",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    textTransform: "uppercase"
  });

  return (
    <A4Card title="Bottom Type">
      {variant === 'mens' ? (
        <div style={{ display: "flex", gap: "3mm", padding: "3mm" }}>
          <button type="button" onClick={() => setBottomType("shalwar")} style={btnStyle("shalwar")}>Shalwar</button>
          <button type="button" onClick={() => setBottomType("trouser")} style={btnStyle("trouser")}>Trouser</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2.5mm", padding: "3mm" }}>
          <button type="button" onClick={() => setBottomType("trouser")} style={btnStyle("trouser")}>Trouser</button>
          <button type="button" onClick={() => setBottomType("simple")} style={btnStyle("simple")}>Simple Shalwar</button>
          <button type="button" onClick={() => setBottomType("belt")} style={btnStyle("belt")}>Belt Shalwar</button>
        </div>
      )}

      {/* ── Mens Shalwar Panel ── */}
      {variant === 'mens' && bottomType === "shalwar" && (
        <div className="a4-rows" style={{ marginTop: "3mm" }}>
          <A4Row label="1. Length"><A4Input value={String(data.shalwarLength1 ?? "")} onChange={(v) => setField("shalwarLength1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="2. Pancha"><A4Input value={String(data.shalwarPancha1 ?? "")} onChange={(v) => setField("shalwarPancha1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="3. Gherra"><A4Input value={String(data.shalwarGherra1 ?? "")} onChange={(v) => setField("shalwarGherra1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="4. Elastic"><A4Input value={String(data.shalwarElastic1 ?? "")} onChange={(v) => setField("shalwarElastic1", v)} readOnly={readOnly} /></A4Row>
        </div>
      )}

      {/* ── Shared Trouser Panel (mens + ladies) ── */}
      {bottomType === "trouser" && (
        <div className="a4-rows" style={{ marginTop: "3mm" }}>
          <A4Row label="1. Length"><A4Input value={String(data.trouserLength1 ?? "")} onChange={(v) => setField("trouserLength1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label={variant === 'ladies' ? "2. Pancha (Bottom)" : "2. Pancha"}><A4Input value={String(data.trouserPancha1 ?? "")} onChange={(v) => setField("trouserPancha1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="3. Tigh"><A4Input value={String(data.trouserTigh1 ?? "")} onChange={(v) => setField("trouserTigh1", v)} readOnly={readOnly} /></A4Row>
          {variant === 'mens' ? (
            <>
              <A4Row label="4. Elastic Length"><A4Input value={String(data.trouserElastic1 ?? "")} onChange={(v) => setField("trouserElastic1", v)} readOnly={readOnly} /></A4Row>
              <A4Row label="5. Pocket">
                <div style={{ display: "flex", gap: "3mm" }}>
                  <A4Pill label="Front" checked={String(data.frontPocket ?? "0") === "1"} onChange={(v) => setToggle("frontPocket", v)} readOnly={readOnly} />
                  <A4Pill label="Side" checked={String(data.sidePocket ?? "0") === "1"} onChange={(v) => setToggle("sidePocket", v)} readOnly={readOnly} />
                </div>
              </A4Row>
            </>
          ) : (
            <A4Row label="4. Elastic"><A4Input value={String(data.ladTrouserElastic1 ?? "")} onChange={(v) => setField("ladTrouserElastic1", v)} readOnly={readOnly} /></A4Row>
          )}
        </div>
      )}

      {/* ── Ladies Simple Shalwar Panel ── */}
      {variant === 'ladies' && bottomType === "simple" && (
        <div className="a4-rows" style={{ marginTop: "3mm" }}>
          <A4Row label="1. Length"><A4Input value={String(data.ladSimpleShalwar1 ?? "")} onChange={(v) => setField("ladSimpleShalwar1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="2. Pancha"><A4Input value={String(data.ladSimpleShalwarPancha1 ?? "")} onChange={(v) => setField("ladSimpleShalwarPancha1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="3. Gherra / Assan">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <A4Input value={String(data.ladSimpleShalwarGherra1 ?? "")} onChange={(v) => setField("ladSimpleShalwarGherra1", v)} readOnly={readOnly} />
                <span style={{ fontSize: "11px", fontWeight: 700, marginTop: "1mm" }}>Gherra</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <A4Input value={String(data.ladSimpleShalwarAssan1 ?? "")} onChange={(v) => setField("ladSimpleShalwarAssan1", v)} readOnly={readOnly} />
                <span style={{ fontSize: "11px", fontWeight: 700, marginTop: "1mm" }}>Assan</span>
              </div>
            </div>
          </A4Row>
          <A4Row label="4. Elastic"><A4Input value={String(data.ladLasticSimpleShalwar ?? "")} onChange={(v) => setField("ladLasticSimpleShalwar", v)} readOnly={readOnly} /></A4Row>
        </div>
      )}

      {/* ── Ladies Belt Shalwar Panel ── */}
      {variant === 'ladies' && bottomType === "belt" && (
        <div className="a4-rows" style={{ marginTop: "3mm" }}>
          <A4Row label="1. Length"><A4Input value={String(data.ladShalwarBelt1 ?? "")} onChange={(v) => setField("ladShalwarBelt1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="2. Pancha"><A4Input value={String(data.ladShalwarBeltPancha1 ?? "")} onChange={(v) => setField("ladShalwarBeltPancha1", v)} readOnly={readOnly} /></A4Row>
          <A4Row label="3. Gherra / Assan">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <A4Input value={String(data.ladShalwarBeltGherra1 ?? "")} onChange={(v) => setField("ladShalwarBeltGherra1", v)} readOnly={readOnly} />
                <span style={{ fontSize: "11px", fontWeight: 700, marginTop: "1mm" }}>Gherra</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <A4Input value={String(data.ladShalwarBeltAssan1 ?? "")} onChange={(v) => setField("ladShalwarBeltAssan1", v)} readOnly={readOnly} />
                <span style={{ fontSize: "11px", fontWeight: 700, marginTop: "1mm" }}>Assan</span>
              </div>
            </div>
          </A4Row>
          <A4Row label="4. Elastic"><A4Input value={String(data.ladLasticShalwarBelt ?? "")} onChange={(v) => setField("ladLasticShalwarBelt", v)} readOnly={readOnly} /></A4Row>
        </div>
      )}
    </A4Card>
  );
}
