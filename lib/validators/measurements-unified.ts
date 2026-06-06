import { z } from "zod";

/**
 * Unified measurement schema — single source of truth for ALL measurements.
 * Used by: user profiles, tailor requests, admin edits, checkout snapshots, print slips.
 *
 * garmentType determines which fields are shown/relevant per category:
 *   male_shalwar_kameez, male_simple_3_piece, male_prince_coat, male_shirt
 *   female_simple_shalwar, female_frock, female_saari, female_lehnga_kurti
 *
 * Each measurement field stores a simple string value (e.g., "42", "42 1/2")
 * matching the blank-line input style of the A4 measurement forms.
 */
export const GARMENT_TYPES = [
  "male_shalwar_kameez",
  "male_simple_3_piece",
  "male_prince_coat",
  "male_shirt",
  "female_simple_shalwar",
  "female_frock",
  "female_saari",
  "female_lehnga_kurti",
] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number];

const mstr = z.string().max(20).default("");

// ─── Simple checkbox string ──────────────────────────────────────────────
const toggle = z.string().default("0");

export const unifiedMeasurementSchema = z.object({
  // Meta
  gender: z.enum(["Male", "Female"]).default("Male"),
  garmentType: z.enum(GARMENT_TYPES).default("male_shalwar_kameez"),
  deliveryDate: z.string().optional(),
  notes: z.string().max(500).default(""),
  status: z.enum(["pending", "complete"]).default("pending"),
  profileName: z.string().min(1, "Profile name is required").max(100).default("Default"),
  isDefault: z.boolean().default(false),
  customerName: z.string().optional(),
  serialNumber: z.string().optional(),

  // ─── Kameez / Coat / Shirt common measurements ───────────────────────
  length1: mstr,
  shoulder1: mstr,
  chest1: mstr,
  waist1: mstr,
  gherra1: mstr,
  neck1: mstr,
  sleeves1: mstr,
  golai1: mstr,
  armcuff1: mstr,
  armplate1: mstr,
  golbazoo1: mstr,
  armpatti1: mstr,
  collarnok1: mstr,
  bane1: mstr,
  ladHip1: mstr,
  hip1: mstr,

  // ─── Style toggles (checkboxes) ────────────────────────────────────────
  doubleCb: toggle,
  singleCb: toggle,
  golCb: toggle,
  chorasCb: toggle,
  baneCb: toggle,
  collarCb: toggle,
  roundneck: toggle,
  straightCb: toggle,
  downCb: toggle,

  // ─── Pockets (text / toggle) ──────────────────────────────────────────
  frontPocket: toggle,
  sidePocket: toggle,
  shalwarPocket: toggle,
  zipCb: toggle,

  // ─── Shalwar (male) ───────────────────────────────────────────────────
  shalwarLength1: mstr,
  shalwarPancha1: mstr,
  shalwarGherra1: mstr,
  shalwarAssan1: mstr,

  // ─── Trouser (male) ───────────────────────────────────────────────────
  trouserLength1: mstr,
  trouserPancha1: mstr,
  trouserTigh1: mstr,
  trouserWaist1: mstr,
  trouserElastic1: mstr,

  // ─── Ladies extras ────────────────────────────────────────────────────
  ladGolai1: mstr,
  ladMori1: mstr,
  ladBellbazoo1: mstr,
  ladChaak1: mstr,
  ladSimpleShalwar1: mstr,
  ladSimpleShalwarPancha1: mstr,
  ladSimpleShalwarGherra1: mstr,
  ladLasticSimpleShalwar: toggle,
  ladShalwarBelt1: mstr,
  ladShalwarBeltPancha1: mstr,
  ladShalwarBeltGherra1: mstr,
  ladLasticShalwarBelt: toggle,
  ladTrouserElastic1: mstr,

  // ─── Fraction slots preserved for backward compat (unused in new A4 forms) ──
  length2: mstr,
  shoulder2: mstr,
  chest2: mstr,
  waist2: mstr,
  gherra2: mstr,
  neck2: mstr,
  sleeves2: mstr,
  golai2: mstr,
  armcuff2: mstr,
  armplate2: mstr,
  golbazoo2: mstr,
  armpatti2: mstr,
  collarnok2: mstr,
  bane2: mstr,
  ladHip2: mstr,
  hip2: mstr,
  ladGolai2: mstr,
  ladMori2: mstr,
  ladBellbazoo2: mstr,
  ladChaak2: mstr,
  ladSimpleShalwar2: mstr,
  ladSimpleShalwarPancha2: mstr,
  ladSimpleShalwarGherra2: mstr,
  ladShalwarBelt2: mstr,
  ladShalwarBeltPancha2: mstr,
  ladShalwarBeltGherra2: mstr,
  shalwarLength2: mstr,
  shalwarPancha2: mstr,
  shalwarGherra2: mstr,
  shalwarAssan2: mstr,
  trouserLength2: mstr,
  trouserPancha2: mstr,
  trouserTigh2: mstr,
  trouserWaist2: mstr,
  trouserElastic2: mstr,
  ladTrouserElastic2: mstr,
});

export type UnifiedMeasurementFormData = z.infer<typeof unifiedMeasurementSchema>;

export const unifiedMeasurementRequestSchema = z.object({
  notes: z.string().max(500).optional(),
  gender: z.enum(["Male", "Female"]).default("Male"),
  garmentType: z.enum(GARMENT_TYPES).default("male_shalwar_kameez"),
  profileName: z.string().max(100).optional(),
  selectedProfileId: z.string().optional(),
  selectedProfileName: z.string().optional(),
});

// ─── Empty default ───────────────────────────────────────────────────────────
function mk(): string { return ""; }
const mkToggle = "0";

export const UNIFIED_MEASUREMENT_EMPTY: UnifiedMeasurementFormData = {
  gender: "Male",
  garmentType: "male_shalwar_kameez",
  deliveryDate: "",
  notes: "",
  status: "pending",
  profileName: "Default",
  isDefault: false,
  customerName: "",
  serialNumber: "",
  // Common measurements
  length1: mk(), length2: mk(), shoulder1: mk(), shoulder2: mk(),
  chest1: mk(), chest2: mk(), waist1: mk(), waist2: mk(),
  gherra1: mk(), gherra2: mk(), neck1: mk(), neck2: mk(),
  sleeves1: mk(), sleeves2: mk(), golai1: mk(), golai2: mk(),
  armcuff1: mk(), armcuff2: mk(), armplate1: mk(), armplate2: mk(),
  golbazoo1: mk(), golbazoo2: mk(), armpatti1: mk(), armpatti2: mk(),
  collarnok1: mk(), collarnok2: mk(), bane1: mk(), bane2: mk(),
  ladHip1: mk(), ladHip2: mk(), hip1: mk(), hip2: mk(),
  // Toggles
  doubleCb: mkToggle, singleCb: mkToggle, golCb: mkToggle, chorasCb: mkToggle,
  baneCb: mkToggle, collarCb: mkToggle, roundneck: mkToggle,
  straightCb: mkToggle, downCb: mkToggle,
  // Pockets
  frontPocket: mkToggle, sidePocket: mkToggle, shalwarPocket: mkToggle,
  zipCb: mkToggle,
  // Shalwar
  shalwarLength1: mk(), shalwarLength2: mk(),
  shalwarPancha1: mk(), shalwarPancha2: mk(),
  shalwarGherra1: mk(), shalwarGherra2: mk(),
  shalwarAssan1: mk(), shalwarAssan2: mk(),
  // Trouser
  trouserLength1: mk(), trouserLength2: mk(),
  trouserPancha1: mk(), trouserPancha2: mk(),
  trouserTigh1: mk(), trouserTigh2: mk(),
  trouserWaist1: mk(), trouserWaist2: mk(),
  trouserElastic1: mk(), trouserElastic2: mk(),
  // Ladies extras
  ladGolai1: mk(), ladGolai2: mk(), ladMori1: mk(), ladMori2: mk(),
  ladBellbazoo1: mk(), ladBellbazoo2: mk(), ladChaak1: mk(), ladChaak2: mk(),
  ladSimpleShalwar1: mk(), ladSimpleShalwar2: mk(),
  ladSimpleShalwarPancha1: mk(), ladSimpleShalwarPancha2: mk(),
  ladSimpleShalwarGherra1: mk(), ladSimpleShalwarGherra2: mk(),
  ladLasticSimpleShalwar: mkToggle,
  ladShalwarBelt1: mk(), ladShalwarBelt2: mk(),
  ladShalwarBeltPancha1: mk(), ladShalwarBeltPancha2: mk(),
  ladShalwarBeltGherra1: mk(), ladShalwarBeltGherra2: mk(),
  ladLasticShalwarBelt: mkToggle,
  ladTrouserElastic1: mk(), ladTrouserElastic2: mk(),
};

/**
 * Map garment type to human-readable label
 */
export function garmentTypeLabel(gt: string): string {
  const labels: Record<string, string> = {
    male_shalwar_kameez: "Male Shalwar Kameez",
    male_simple_3_piece: "Male Simple 3 Piece Suit",
    male_prince_coat: "Male Prince Coat 3 Piece Suit",
    male_shirt: "Male Shirt",
    female_simple_shalwar: "Female Simple Shalwar Kameez",
    female_frock: "Female Frock",
    female_saari: "Female Saari",
    female_lehnga_kurti: "Female Lehnga Kurti",
  };
  return labels[gt] || gt.replace(/_/g, " ");
}

/**
 * Garment types grouped by gender for UI
 */
export const GARMENT_TYPES_BY_GENDER = {
  Male: GARMENT_TYPES.filter(g => g.startsWith("male_")),
  Female: GARMENT_TYPES.filter(g => g.startsWith("female_")),
} as const;

/**
 * A4 form visual labels mapped to schema keys per garment type.
 * Each form uses this to know which schema field corresponds to each label.
 */
export interface A4FieldDef {
  label: string;
  key: keyof UnifiedMeasurementFormData;
  type: "text" | "toggle" | "togglegroup";
  group?: string; // for toggles that share a group
}

export const A4_FIELDS: Record<string, { title: string; subtitle: string; fields: Record<string, A4FieldDef[]> }> = {
  male_shalwar_kameez: {
    title: "Men Shalwar Kameez",
    subtitle: "EMAN THREADS",
    fields: {
      "Kameez Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Cuff", key: "armcuff1", type: "text" },
        { label: "Cuff Plate", key: "armplate1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Patti Width", key: "armpatti1", type: "text" },
        { label: "Bane Width", key: "bane1", type: "text" },
        { label: "Collar Nok", key: "collarnok1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
      ],
    },
  },
  male_simple_3_piece: {
    title: "Simple 3 Piece Suit",
    subtitle: "EMAN THREADS",
    fields: {
      "Coat Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
        { label: "Assan", key: "shalwarAssan1", type: "text" },
      ],
    },
  },
  male_prince_coat: {
    title: "Prince Coat 3 Piece Suit",
    subtitle: "EMAN THREADS",
    fields: {
      "Coat Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
      ],
    },
  },
  male_shirt: {
    title: "Shirt",
    subtitle: "EMAN THREADS",
    fields: {
      "Shirt Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Caff", key: "armcuff1", type: "text" },
        { label: "Caff Plate", key: "armplate1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Patti Width", key: "armpatti1", type: "text" },
        { label: "Collar Width", key: "collarnok1", type: "text" },
        { label: "Collar Nok", key: "bane1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
      ],
    },
  },
  female_frock: {
    title: "Ladies Frock",
    subtitle: "EMAN THREADS",
    fields: {
      "Frock Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "ladGolai1", type: "text" },
        { label: "Mori", key: "ladMori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
      ],
    },
  },
  female_simple_shalwar: {
    title: "Ladies Shalwar Kameez",
    subtitle: "EMAN THREADS",
    fields: {
      "Kameez Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "ladGolai1", type: "text" },
        { label: "Mori", key: "ladMori1", type: "text" },
        { label: "Bell Bazoo", key: "ladBellbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
        { label: "Chaak", key: "ladChaak1", type: "text" },
      ],
    },
  },
  female_lehnga_kurti: {
    title: "Lehnga Kurti",
    subtitle: "EMAN THREADS",
    fields: {
      "Kurti Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "ladGolai1", type: "text" },
        { label: "Mori", key: "ladMori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
        { label: "Chaak", key: "ladChaak1", type: "text" },
      ],
    },
  },
  female_saari: {
    title: "Saari Blouse",
    subtitle: "EMAN THREADS",
    fields: {
      "Blouse Measurements": [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "ladGolai1", type: "text" },
        { label: "Mori", key: "ladMori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
      ],
    },
  },
};