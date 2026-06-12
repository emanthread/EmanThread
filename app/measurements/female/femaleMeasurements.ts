// ─── Female Measurement Data Configuration ──────────────────────────────────
// Mirrors the exact field order and labels from the HTML reference files.
// Do NOT reorder, rename, or regroup these fields.

export type CheckboxItem = { label: string };
export type SubItem = { label: string; isCheckbox?: boolean };

export type FemaleFieldType =
  | "input"         // plain measurement line
  | "sub-grid"      // row of small labelled boxes (e.g. Sleeves sub-items)
  | "sub-grid-2"    // 2-column sub-grid
  | "checkbox-row"  // inline checkboxes
  | "pocket-grid"   // pocket pills
  | "bottom-type"   // Trouser / Simple Shalwar / Belt Shalwar toggle
  | "options-row"   // Zip / Plate options
  | "section-header"; // visual section break

export interface FemaleMeasurementField {
  id: string;
  label: string;
  type: FemaleFieldType;
  /** Sub-items rendered inside the row (for sub-grid) */
  subItems?: SubItem[];
  /** Checkboxes shown inline with the label */
  checkboxes?: CheckboxItem[];
  /** Pocket pill labels (pocket-grid type) */
  pills?: string[];
}

export interface FemaleBottomTypeOption {
  label: string; // "Trouser" | "Simple Shalwar" | "Belt Shalwar"
  fields: FemaleMeasurementField[];
}

export interface FemaleMeasurementSection {
  title: string;
  fields: FemaleMeasurementField[];
  /** Only used by the Side panel */
  isSide?: boolean;
  /** Bottom type toggle block */
  bottomType?: FemaleBottomTypeOption[];
}

export interface FemaleMeasurementForm {
  id: string;
  label: string;
  layout: "split";
  sections: FemaleMeasurementSection[];
}

// ─── 1. Ladies Frock ──────────────────────────────────────────────────────────
const ladiesFrockForm: FemaleMeasurementForm = {
  id: "ladies-frock",
  label: "Ladies Frock",
  layout: "split",
  sections: [
    {
      title: "Frock Measurements",
      fields: [
        { id: "lf-length",   label: "Length",   type: "input" },
        { id: "lf-shoulder", label: "Shoulder", type: "input" },
        {
          id: "lf-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Mori" },
          ],
        },
        { id: "lf-neck",   label: "Neck",   type: "input" },
        { id: "lf-chest",  label: "Chest",  type: "input" },
        { id: "lf-waist",  label: "Waist",  type: "input" },
        { id: "lf-gherra", label: "Gherra", type: "input" },
      ],
    },
    {
      title: "Trouser",
      isSide: true,
      fields: [
        { id: "lf-trouser-length",  label: "1. Length", type: "input" },
        { id: "lf-trouser-pancha",  label: "2. Pancha", type: "input" },
        { id: "lf-trouser-tigh",    label: "3. Tigh",   type: "input" },
        { id: "lf-trouser-elastic", label: "4. Elastic", type: "input" },
      ],
    },
  ],
};

// ─── 2. Ladies Shalwar Kameez ────────────────────────────────────────────────
const ladiesShalwarKameezForm: FemaleMeasurementForm = {
  id: "ladies-shalwar-kameez",
  label: "Ladies Shalwar Kameez",
  layout: "split",
  sections: [
    {
      title: "Kameez Measurements",
      fields: [
        { id: "lsk-length",   label: "Length",   type: "input" },
        { id: "lsk-shoulder", label: "Shoulder", type: "input" },
        {
          id: "lsk-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Mori" },
            { label: "Bell Bazoo" },
          ],
        },
        { id: "lsk-neck",  label: "Neck",  type: "input" },
        { id: "lsk-chest", label: "Chest", type: "input" },
        { id: "lsk-waist", label: "Waist", type: "input" },
        { id: "lsk-gherra", label: "Gherra", type: "input" },
        { id: "lsk-chaak",  label: "Chaak",  type: "input" },
        {
          id: "lsk-options",
          label: "Options",
          type: "options-row",
          pills: ["Zip", "Plate"],
        },
      ],
      bottomType: [
        {
          label: "Trouser",
          fields: [
            { id: "lsk-trouser-length",  label: "1. Length", type: "input" },
            { id: "lsk-trouser-pancha",  label: "2. Pancha (Bottom)", type: "input" },
            { id: "lsk-trouser-tigh",    label: "3. Tigh",   type: "input" },
            { id: "lsk-trouser-elastic", label: "4. Elastic", type: "input" },
          ],
        },
        {
          label: "Simple Shalwar",
          fields: [
            { id: "lsk-simple-length",  label: "1. Length", type: "input" },
            { id: "lsk-simple-pancha",  label: "2. Pancha", type: "input" },
            {
              id: "lsk-simple-gherra-assan",
              label: "3. Gherra / Assan",
              type: "sub-grid",
              subItems: [{ label: "Gherra" }, { label: "Assan" }],
            },
            { id: "lsk-simple-elastic", label: "4. Elastic", type: "input" },
          ],
        },
        {
          label: "Belt Shalwar",
          fields: [
            { id: "lsk-belt-length",  label: "1. Length", type: "input" },
            { id: "lsk-belt-pancha",  label: "2. Pancha", type: "input" },
            {
              id: "lsk-belt-gherra-assan",
              label: "3. Gherra / Assan",
              type: "sub-grid",
              subItems: [{ label: "Gherra" }, { label: "Assan" }],
            },
            { id: "lsk-belt-elastic", label: "4. Elastic", type: "input" },
          ],
        },
      ],
    },
  ],
};

// ─── 3. Lehnga Kurti ─────────────────────────────────────────────────────────
const lehngaKurtiForm: FemaleMeasurementForm = {
  id: "lehnga-kurti",
  label: "Lehnga Kurti",
  layout: "split",
  sections: [
    {
      title: "Kurti Measurements",
      fields: [
        { id: "lk-length",   label: "Length",   type: "input" },
        { id: "lk-shoulder", label: "Shoulder", type: "input" },
        {
          id: "lk-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Mori" },
          ],
        },
        { id: "lk-neck",  label: "Neck",  type: "input" },
        { id: "lk-chest", label: "Chest", type: "input" },
        { id: "lk-waist", label: "Waist", type: "input" },
        { id: "lk-hip",   label: "Hip",   type: "input" },
        { id: "lk-chak",  label: "Chak",  type: "input" },
      ],
    },
    {
      title: "Lehnga",
      isSide: true,
      fields: [
        { id: "lk-lehnga-length", label: "1. Length", type: "input" },
        { id: "lk-lehnga-waist",  label: "2. Waist",  type: "input" },
      ],
    },
  ],
};

// ─── 4. Saari Blouse ─────────────────────────────────────────────────────────
const saariBlouseForm: FemaleMeasurementForm = {
  id: "saari-blouse",
  label: "Saari Blouse",
  layout: "split",
  sections: [
    {
      title: "Blouse Measurements",
      fields: [
        { id: "sb-length",   label: "Length",   type: "input" },
        { id: "sb-shoulder", label: "Shoulder", type: "input" },
        {
          id: "sb-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Mori" },
          ],
        },
        { id: "sb-neck",  label: "Neck",  type: "input" },
        { id: "sb-chest", label: "Chest", type: "input" },
        { id: "sb-waist", label: "Waist", type: "input" },
        { id: "sb-hip",   label: "Hip",   type: "input" },
      ],
    },
    {
      title: "Saari",
      isSide: true,
      fields: [
        { id: "sb-saari-length", label: "1. Length", type: "input" },
        { id: "sb-saari-waist",  label: "2. Waist",  type: "input" },
      ],
    },
  ],
};

// ─── Exported list ────────────────────────────────────────────────────────────
export const femaleMeasurementForms: FemaleMeasurementForm[] = [
  ladiesFrockForm,
  ladiesShalwarKameezForm,
  lehngaKurtiForm,
  saariBlouseForm,
];
