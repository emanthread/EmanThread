// ─── Male Measurement Data Configuration ────────────────────────────────────
// Mirrors the exact field order and labels from the HTML reference files.
// Do NOT reorder, rename, or regroup these fields.

export type CheckboxItem = { label: string };
export type SubItem = { label: string; isCheckbox?: boolean };

export type FieldType =
  | "input"         // plain measurement line
  | "sub-grid"      // row of small labelled boxes (e.g. Sleeves sub-items)
  | "sub-grid-2"    // 2-column sub-grid
  | "checkbox-row"  // inline checkboxes
  | "pocket-grid"   // pocket pills
  | "bottom-type"   // Shalwar / Trouser toggle
  | "section-header"; // visual section break

export interface MeasurementField {
  id: string;
  label: string;
  type: FieldType;
  /** Sub-items rendered inside the row (for sub-grid / checkbox-row) */
  subItems?: SubItem[];
  /** Checkboxes shown inline with the label */
  checkboxes?: CheckboxItem[];
  /** Pocket pill labels (pocket-grid type) */
  pills?: string[];
}

export interface BottomTypeOption {
  label: string; // "Shalwar" | "Trouser"
  fields: MeasurementField[];
}

export interface MeasurementSection {
  title: string;
  fields: MeasurementField[];
  /** Only used by the Side panel (Pent section) */
  isSide?: boolean;
  /** Shalwar/Trouser toggle block */
  bottomType?: BottomTypeOption[];
}

export interface MeasurementForm {
  id: string;
  label: string;
  /** "full" = shirt (no side panel), "split" = main + side layout */
  layout: "full" | "split";
  sections: MeasurementSection[];
}

// ─── 1. Male Shalwar Kameez ────────────────────────────────────────────────
const shalwarKameezForm: MeasurementForm = {
  id: "shalwar-kameez",
  label: "Male Shalwar Kameez",
  layout: "split",
  sections: [
    {
      title: "Kameez",
      fields: [
        { id: "sk-length",   label: "Length",   type: "input" },
        { id: "sk-shoulder", label: "Shoulder", type: "input" },
        {
          id: "sk-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Cuff" },
            { label: "Cuff Plate" },
            { label: "Gol Bazoo" },
          ],
          // Double / Single shown as a separate column-style block inside Sleeves row
          checkboxes: [{ label: "Double" }, { label: "Single" }],
        },
        {
          id: "sk-neck",
          label: "Neck",
          type: "sub-grid",
          subItems: [
            { label: "Patti Width" },
            { label: "Bane Width" },
            { label: "Collar Nok" },
            { label: "Collar", isCheckbox: true },
            { label: "Bane Width", isCheckbox: true },
          ],
        },
        { id: "sk-chest", label: "Chest", type: "input" },
        { id: "sk-waist", label: "Waist", type: "input" },
        { id: "sk-hip",   label: "Hip",   type: "input" },
        {
          id: "sk-pocket",
          label: "Pocket",
          type: "pocket-grid",
          pills: ["Front", "Side", "Shalwar"],
        },
      ],
      bottomType: [
        {
          label: "Shalwar",
          fields: [
            { id: "shal-length", label: "Length", type: "input" },
            { id: "shal-pancha", label: "Pancha", type: "input" },
            { id: "shal-tigh",   label: "Tigh",   type: "input" },
            { id: "shal-gherra", label: "Gherra", type: "input" },
            { id: "shal-assan",  label: "Assan",  type: "input" },
            { id: "shal-zip",    label: "Zip",    type: "input" },
          ],
        },
        {
          label: "Trouser",
          fields: [
            { id: "trsr-length",        label: "Length",        type: "input" },
            { id: "trsr-pancha",        label: "Pancha",        type: "input" },
            { id: "trsr-tigh",          label: "Tigh",          type: "input" },
            { id: "trsr-elastic-length",label: "Elastic Length",type: "input" },
            { id: "trsr-pocket",        label: "Pocket",        type: "input" },
            { id: "trsr-zip",           label: "Zip",           type: "input" },
          ],
        },
      ],
    },
  ],
};

// ─── 2. Male Simple 3 Piece Suit ───────────────────────────────────────────
const simple3PieceSuitForm: MeasurementForm = {
  id: "simple-3-piece-suit",
  label: "Male Simple 3 Piece Suit",
  layout: "split",
  sections: [
    {
      title: "Coat",
      fields: [
        { id: "s3-length",   label: "Length",   type: "input" },
        { id: "s3-shoulder", label: "Shoulder", type: "input" },
        {
          id: "s3-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [{ label: "Gol Bazoo", isCheckbox: true }],
        },
        {
          id: "s3-neck",
          label: "Neck",
          type: "sub-grid",
          subItems: [
            { label: "Collar", isCheckbox: true },
            { label: "Bane", isCheckbox: true },
          ],
        },
        { id: "s3-chest",  label: "Chest",  type: "input" },
        { id: "s3-waist",  label: "Waist",  type: "input" },
        { id: "s3-hip",    label: "Hip",    type: "input" },
      ],
    },
    {
      title: "Pent",
      isSide: true,
      fields: [
        { id: "s3-pent-length", label: "Length", type: "input" },
        { id: "s3-pent-pancha", label: "Pancha", type: "input" },
        { id: "s3-pent-tigh",   label: "Tigh",   type: "input" },
        { id: "s3-pent-waist",  label: "Waist",  type: "input" },
      ],
    },
  ],
};

// ─── 3. Male Prince Coat 3 Piece Suit ──────────────────────────────────────
const princeCoatForm: MeasurementForm = {
  id: "prince-coat-3-piece-suit",
  label: "Male Prince Coat 3 Piece Suit",
  layout: "split",
  sections: [
    {
      title: "Coat",
      fields: [
        { id: "pc-length", label: "Length", type: "input" },
        {
          id: "pc-shoulder",
          label: "Shoulder",
          type: "checkbox-row",
          checkboxes: [{ label: "Straight" }, { label: "Down" }],
        },
        {
          id: "pc-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Gol Bazoo", isCheckbox: true },
          ],
        },
        {
          id: "pc-neck",
          label: "Neck",
          type: "sub-grid",
          subItems: [
            { label: "Collar", isCheckbox: true },
            { label: "Bane", isCheckbox: true },
          ],
        },
        { id: "pc-chest", label: "Chest", type: "input" },
        { id: "pc-waist", label: "Waist", type: "input" },
        {
          id: "pc-hip",
          label: "Hip",
          type: "checkbox-row",
          checkboxes: [{ label: "Gol" }, { label: "Choras" }],
        },
      ],
    },
    {
      title: "Pent",
      isSide: true,
      fields: [
        { id: "pc-pent-length", label: "Length", type: "input" },
        { id: "pc-pent-pancha", label: "Pancha", type: "input" },
        { id: "pc-pent-tigh",   label: "Tigh",   type: "input" },
        { id: "pc-pent-waist",  label: "Waist",  type: "input" },
      ],
    },
  ],
};

// ─── 4. Male Shirt ─────────────────────────────────────────────────────────
const shirtForm: MeasurementForm = {
  id: "shirt",
  label: "Male Shirt",
  layout: "full",
  sections: [
    {
      title: "Shirt",
      fields: [
        { id: "sh-length",   label: "Length",   type: "input" },
        { id: "sh-shoulder", label: "Shoulder", type: "input" },
        {
          id: "sh-sleeves",
          label: "Sleeves",
          type: "sub-grid",
          subItems: [
            { label: "Arm Hole Golai" },
            { label: "Caff", isCheckbox: true },
            { label: "Caff Plate", isCheckbox: true },
          ],
        },
        {
          id: "sh-neck",
          label: "Neck",
          type: "sub-grid",
          subItems: [
            { label: "Patti Width" },
            { label: "Collar Width" },
            { label: "Collar Nok" },
          ],
          checkboxes: [{ label: "Collar" }, { label: "Bane" }],
        },
        { id: "sh-chest", label: "Chest", type: "input" },
        { id: "sh-waist", label: "Waist", type: "input" },
        { id: "sh-hip",   label: "Hip",   type: "input" },
        {
          id: "sh-pocket",
          label: "Pocket",
          type: "pocket-grid",
          pills: ["Front"],
          checkboxes: [{ label: "Front" }],
        },
      ],
    },
  ],
};

// ─── Exported list ──────────────────────────────────────────────────────────
export const maleMeasurementForms: MeasurementForm[] = [
  shalwarKameezForm,
  simple3PieceSuitForm,
  princeCoatForm,
  shirtForm,
];
