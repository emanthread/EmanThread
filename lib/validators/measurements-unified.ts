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
 *
 * NOTE: The `status` field was intentionally removed from this schema.
 * The Prisma MeasurementProfile model has no `status` column — measurement
 * status is inferred from the `source` field:
 *   - source: "profile"       → complete (user-managed)
 *   - source: "tailor_request" → pending until admin fills measurements
 *   - source: "order"          → complete (snapshot at order time)
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
  deliveryDate: z.string().optional().refine(
    (v) => !v || v === "" || !isNaN(Date.parse(v)),
    { message: "Invalid date format" }
  ),
  notes: z.string().max(500).default(""),
  source: z.enum(["profile", "tailor_request", "order"]).default("profile"),
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
  shalwarElastic1: mstr,

  // ─── Trouser (male) ───────────────────────────────────────────────────
  trouserLength1: mstr,
  trouserPancha1: mstr,
  trouserTigh1: mstr,
  trouserAssan1: mstr,
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
  ladSimpleShalwarAssan1: mstr,
  ladLasticSimpleShalwar: mstr,
  ladShalwarBelt1: mstr,
  ladShalwarBeltPancha1: mstr,
  ladShalwarBeltGherra1: mstr,
  ladShalwarBeltAssan1: mstr,
  ladLasticShalwarBelt: mstr,
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
  trouserdata11: z.string().optional(),
  trouserdata12: z.string().optional(),
  trouserdata13: z.string().optional(),
  trouserdata14: z.string().optional(),
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

// ─── Mapper: Zod schema → Prisma model fields ────────────────────────────
// Maps from the unified schema field names to the Prisma MeasurementProfile field names.
// Some fields (trouser*, shalwarLength1) map to legacy Prisma column names.
export function mapToPrismaFields(parsed: UnifiedMeasurementFormData) {
  return {
    gender: parsed.gender,
    garmentType: parsed.garmentType,
    profileName: parsed.profileName,
    customerName: parsed.customerName,
    serialNumber: parsed.serialNumber,
    notes: parsed.notes,
    deliveryDate: parsed.deliveryDate && parsed.deliveryDate !== "" && !isNaN(Date.parse(parsed.deliveryDate))
      ? new Date(parsed.deliveryDate)
      : undefined,
    // Common
    length1: parsed.length1, length2: parsed.length2,
    shoulder1: parsed.shoulder1, shoulder2: parsed.shoulder2,
    chest1: parsed.chest1, chest2: parsed.chest2,
    waist1: parsed.waist1, waist2: parsed.waist2,
    gherra1: parsed.gherra1, gherra2: parsed.gherra2,
    neck1: parsed.neck1, neck2: parsed.neck2,
    sleeves1: parsed.sleeves1, sleeves2: parsed.sleeves2,
    golai1: parsed.golai1, golai2: parsed.golai2,
    armcuff1: parsed.armcuff1, armcuff2: parsed.armcuff2,
    armplate1: parsed.armplate1, armplate2: parsed.armplate2,
    golbazoo1: parsed.golbazoo1, golbazoo2: parsed.golbazoo2,
    armpatti1: parsed.armpatti1, armpatti2: parsed.armpatti2,
    collarnok1: parsed.collarnok1, collarnok2: parsed.collarnok2,
    bane1: parsed.bane1, bane2: parsed.bane2,
    ladHip1: parsed.ladHip1, ladHip2: parsed.ladHip2,
    hip1: parsed.hip1, hip2: parsed.hip2,
    // Toggles
    doubleCb: parsed.doubleCb, singleCb: parsed.singleCb,
    golCb: parsed.golCb, chorasCb: parsed.chorasCb,
    baneCb: parsed.baneCb, collarCb: parsed.collarCb,
    roundneck: parsed.roundneck,
    straightCb: parsed.straightCb,
    downCb: parsed.downCb,
    // Pockets
    frontPocket: parsed.frontPocket,
    sidePocket: parsed.sidePocket,
    shalwarPocket: parsed.shalwarPocket,
    zipCb: parsed.zipCb,
    // Shalwar (legacy shalwar1 maps to shalwarLength1)
    shalwar1: parsed.shalwarLength1 || "",
    shalwar2: parsed.shalwarLength2 || "",
    shalwarPancha1: parsed.shalwarPancha1,
    shalwarPancha2: parsed.shalwarPancha2,
    shalwarGherra1: parsed.shalwarGherra1,
    shalwarGherra2: parsed.shalwarGherra2,
    shalwarAssan1: parsed.shalwarAssan1,
    shalwarAssan2: parsed.shalwarAssan2,
    // Trouser → legacy trouserdata fields
    trouserdata1: parsed.trouserLength1 || "",
    trouserdata2: parsed.trouserPancha1 || "",
    trouserdata3: parsed.trouserTigh1 || "",
    trouserdata4: parsed.trouserWaist1 || "",
    trouserdata5: parsed.trouserElastic1 || "",
    trouserdata6: parsed.trouserLength2 || "",
    trouserdata7: parsed.trouserPancha2 || "",
    trouserdata8: parsed.trouserTigh2 || "",
    trouserdata9: parsed.trouserWaist2 || "",
    trouserdata10: parsed.trouserElastic2 || "",
    trouserdata11: parsed.shalwarElastic1 || parsed.trouserdata11 || "",
    trouserdata12: parsed.trouserAssan1 || parsed.trouserdata12 || "",
    trouserdata13: parsed.ladSimpleShalwarAssan1 || "",
    trouserdata14: parsed.ladShalwarBeltAssan1 || "",
    // Ladies extras
    ladGolai1: parsed.ladGolai1, ladGolai2: parsed.ladGolai2,
    ladMori1: parsed.ladMori1, ladMori2: parsed.ladMori2,
    ladBellbazoo1: parsed.ladBellbazoo1, ladBellbazoo2: parsed.ladBellbazoo2,
    ladChaak1: parsed.ladChaak1, ladChaak2: parsed.ladChaak2,
    ladSimpleShalwar1: parsed.ladSimpleShalwar1,
    ladSimpleShalwar2: parsed.ladSimpleShalwar2,
    ladSimpleShalwarPancha1: parsed.ladSimpleShalwarPancha1,
    ladSimpleShalwarPancha2: parsed.ladSimpleShalwarPancha2,
    ladSimpleShalwarGherra1: parsed.ladSimpleShalwarGherra1,
    ladSimpleShalwarGherra2: parsed.ladSimpleShalwarGherra2,
    ladLasticSimpleShalwar: parsed.ladLasticSimpleShalwar,
    ladShalwarBelt1: parsed.ladShalwarBelt1,
    ladShalwarBelt2: parsed.ladShalwarBelt2,
    ladShalwarBeltPancha1: parsed.ladShalwarBeltPancha1,
    ladShalwarBeltPancha2: parsed.ladShalwarBeltPancha2,
    ladShalwarBeltGherra1: parsed.ladShalwarBeltGherra1,
    ladShalwarBeltGherra2: parsed.ladShalwarBeltGherra2,
    ladLasticShalwarBelt: parsed.ladLasticShalwarBelt,
    // Ladies trouser → legacy lady trouser elastic fields
    ladTrouserdata15: parsed.ladTrouserElastic1 || "",
    ladTrouserdata16: parsed.ladTrouserElastic2 || "",
  };
}

/**
 * Reverse mapper: Prisma MeasurementProfile row → UnifiedMeasurementFormData.
 * Strips meta/relational fields and reverses legacy column name mappings
 * so the result can be used directly in UnifiedMeasurementForm or A4MeasurementForm.
 */
/**
 * Check if a value is a UUID (either hyphen-separated or space-separated).
 * UUIDs in measurement fields are always data corruption and must be filtered out.
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function mapFromPrismaFields(row: Record<string, unknown>): UnifiedMeasurementFormData {
  const metaKeys = new Set([
    "id", "userId", "user", "createdAt", "updatedAt", "deletedAt",
    "requestedAt", "source", "status",
  ]);

  const result: Record<string, unknown> = { ...UNIFIED_MEASUREMENT_EMPTY };

  for (const [key, val] of Object.entries(row)) {
    if (metaKeys.has(key)) continue;
    if (val == null || val === "") continue;
    // Skip values that look like UUIDs — they're corrupted measurement data
    if (typeof val === "string" && isUuid(val)) continue;

    // Reverse legacy trouserdata mappings
    if (key === "trouserdata1") { result["trouserLength1"] = val; }
    else if (key === "trouserdata2") { result["trouserPancha1"] = val; }
    else if (key === "trouserdata3") { result["trouserTigh1"] = val; }
    else if (key === "trouserdata4") { result["trouserWaist1"] = val; }
    else if (key === "trouserdata5") { result["trouserElastic1"] = val; }
    else if (key === "trouserdata6") { result["trouserLength2"] = val; }
    else if (key === "trouserdata7") { result["trouserPancha2"] = val; }
    else if (key === "trouserdata8") { result["trouserTigh2"] = val; }
    else if (key === "trouserdata9") { result["trouserWaist2"] = val; }
    else if (key === "trouserdata10") { result["trouserElastic2"] = val; }
    else if (key === "trouserdata11") { result["shalwarElastic1"] = val; }
    else if (key === "trouserdata12") { result["trouserAssan1"] = val; }
    else if (key === "trouserdata13") { result["ladSimpleShalwarAssan1"] = val; }
    else if (key === "trouserdata14") { result["ladShalwarBeltAssan1"] = val; }
    // Reverse shalwar legacy names
    else if (key === "shalwar1") { result["shalwarLength1"] = val; }
    else if (key === "shalwar2") { result["shalwarLength2"] = val; }
    // Reverse ladies trouser legacy names
    else if (key === "ladTrouserdata15") { result["ladTrouserElastic1"] = val; }
    else if (key === "ladTrouserdata16") { result["ladTrouserElastic2"] = val; }
    // Direct pass-through for names that match
    else if (key in result) { result[key] = val; }
  }

  return result as UnifiedMeasurementFormData;
}

// ─── Empty default ───────────────────────────────────────────────────────────
function mk(): string { return ""; }
const mkToggle = "0";

export const UNIFIED_MEASUREMENT_EMPTY: UnifiedMeasurementFormData = {
  gender: "Male",
  garmentType: "male_shalwar_kameez",
  deliveryDate: "",
  notes: "",
  source: "profile",
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
  shalwarElastic1: mk(),
  // Trouser
  trouserLength1: mk(), trouserLength2: mk(),
  trouserPancha1: mk(), trouserPancha2: mk(),
  trouserTigh1: mk(), trouserTigh2: mk(),
  trouserAssan1: mk(),
  trouserWaist1: mk(), trouserWaist2: mk(),
  trouserElastic1: mk(), trouserElastic2: mk(),
  // Ladies extras
  ladGolai1: mk(), ladGolai2: mk(), ladMori1: mk(), ladMori2: mk(),
  ladBellbazoo1: mk(), ladBellbazoo2: mk(), ladChaak1: mk(), ladChaak2: mk(),
  ladSimpleShalwar1: mk(), ladSimpleShalwar2: mk(),
  ladSimpleShalwarPancha1: mk(), ladSimpleShalwarPancha2: mk(),
  ladSimpleShalwarGherra1: mk(), ladSimpleShalwarGherra2: mk(),
  ladSimpleShalwarAssan1: mk(),
  ladLasticSimpleShalwar: mk(),
  ladShalwarBelt1: mk(), ladShalwarBelt2: mk(),
  ladShalwarBeltPancha1: mk(), ladShalwarBeltPancha2: mk(),
  ladShalwarBeltGherra1: mk(), ladShalwarBeltGherra2: mk(),
  ladShalwarBeltAssan1: mk(),
  ladLasticShalwarBelt: mk(),
  ladTrouserElastic1: mk(), ladTrouserElastic2: mk(),
  trouserdata11: mk(), trouserdata12: mk(), trouserdata13: mk(), trouserdata14: mk(),
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
        { label: "Hip", key: "ladHip1", type: "text" },
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
        { label: "Bane Width", key: "bane1", type: "text" },
        { label: "Collar Nok", key: "collarnok1", type: "text" },
        { label: "Collar", key: "collarCb", type: "toggle" },
        { label: "Bane", key: "baneCb", type: "toggle" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "ladHip1", type: "text" },
        { label: "Pocket", key: "frontPocket", type: "toggle" },
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
        { label: "Options", key: "zipCb", type: "toggle" },
      ],
      "Trouser": [
        { label: "1. Length", key: "trouserLength1", type: "text" },
        { label: "2. Pancha (Bottom)", key: "trouserPancha1", type: "text" },
        { label: "3. Tigh", key: "trouserTigh1", type: "text" },
        { label: "4. Elastic", key: "ladTrouserElastic1", type: "text" },
      ],
      "Simple Shalwar": [
        { label: "1. Length", key: "ladSimpleShalwar1", type: "text" },
        { label: "2. Pancha", key: "ladSimpleShalwarPancha1", type: "text" },
        { label: "3. Gherra", key: "ladSimpleShalwarGherra1", type: "text" },
        { label: "Assan", key: "ladSimpleShalwarAssan1", type: "text" },
        { label: "4. Elastic", key: "ladLasticSimpleShalwar", type: "text" },
      ],
      "Belt Shalwar": [
        { label: "1. Length", key: "ladShalwarBelt1", type: "text" },
        { label: "2. Pancha", key: "ladShalwarBeltPancha1", type: "text" },
        { label: "3. Gherra", key: "ladShalwarBeltGherra1", type: "text" },
        { label: "Assan", key: "ladShalwarBeltAssan1", type: "text" },
        { label: "4. Elastic", key: "ladLasticShalwarBelt", type: "text" },
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