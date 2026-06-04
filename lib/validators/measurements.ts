import { z } from 'zod'

// We keep these for backwards compatibility or if any old code imports them,
// but they can be relaxed to accept any string.
const fraction = z.string().optional().default('')

export const gentsMeasurementsSchema = z.object({
  length: fraction,
  shoulder: fraction,
  sleeves: fraction,
  golai: fraction,
  caff: fraction,
  plate: fraction,
  golbazoo: fraction,
  neck: fraction,
  chest: fraction,
  collarnok: fraction,
  bane: fraction,
  patti: fraction,
  waist: fraction,
  gherra: fraction,
  shalwar: fraction,
  shalwargherra: fraction,
  shalwarassan: fraction,
  shalwarpancha: fraction,
  trouser: fraction,
  trousergherra: fraction,
  trouserassan: fraction,
  trouserside: fraction,
  trouserfront: fraction,
  trouserpancha: fraction,
}).passthrough()

export const ladiesMeasurementsSchema = z.object({
  length: fraction,
  shoulder: fraction,
  sleeves: fraction,
  golai: fraction,
  mori: fraction,
  bellbazoo: fraction,
  neck: fraction,
  chest: fraction,
  waist: fraction,
  gherra: fraction,
  shalwar: fraction,
  shalwargherra: fraction,
  shalwarassan: fraction,
  shalwarpancha: fraction,
}).passthrough()

// A unified styling schema that encompasses all the new boolean/string flags
export const unifiedStylingSchema = z.object({
  sleeve_stitching: z.enum(['SINGLE', 'DOUBLE']).optional(),
  gol_bazoo: z.boolean().optional(),
  patti: z.boolean().optional(),
  bane: z.boolean().optional(),
  nok: z.boolean().optional(),
  collar: z.boolean().optional(),
  shalwar_type: z.enum(['GOL', 'CHORAS']).optional(),
  pocket_front: z.boolean().optional(),
  pocket_side: z.boolean().optional(),
  pocket_shalwar: z.boolean().optional(),
  trouser_elastic: z.boolean().optional(),
  trouser_pocket: z.boolean().optional(),
  zip: z.boolean().optional(),
  plate: z.boolean().optional(),
  tailorNotes: z.string().optional(),
  
  // Legacy fields for backward compatibility
  sleeve_style: z.enum(['single', 'double']).optional(),
  waist_style: z.enum(['gol', 'choras']).optional(),
  sidepocket: z.string().optional(),
  frontpocket: z.string().optional(),
  shalwarpocket: z.string().optional(),
  includeShirt: z.boolean().optional(),
}).passthrough()

// NOTE: measurements field uses z.record(z.string(), z.string()).passthrough()
// to preserve all garment-type-specific fields that the wizard collects.
export const createMeasurementProfileSchema = z.object({
  profileName: z.string().min(1).max(100),
  garmentType: z.string().min(1).max(50),
  measurements: z.record(z.string(), z.string()).optional().default({}),
  stylingPrefs: unifiedStylingSchema.optional(),
  notes: z.string().max(500).optional(),
  isDefault: z.boolean().optional().default(false),
})

export const updateMeasurementProfileSchema = createMeasurementProfileSchema.partial()

export type GentsMeasurements = z.infer<typeof gentsMeasurementsSchema>
export type LadiesMeasurements = z.infer<typeof ladiesMeasurementsSchema>
export type UnifiedStyling = z.infer<typeof unifiedStylingSchema>
export type CreateMeasurementProfileInput = z.infer<typeof createMeasurementProfileSchema>
export type UpdateMeasurementProfileInput = z.infer<typeof updateMeasurementProfileSchema>