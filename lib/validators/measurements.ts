import { z } from 'zod'

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
})

export const gentsStylingSchema = z.object({
  sleeve_style: z.enum(['single', 'double']).optional(),
  bane: z.boolean().optional().default(false),
  collar: z.boolean().optional().default(false),
  waist_style: z.enum(['gol', 'choras']).optional(),
  sidepocket: z.string().optional().default(''),
  frontpocket: z.string().optional().default(''),
  shalwarpocket: z.string().optional().default(''),
})

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
})

export const ladiesStylingSchema = z.object({
  sidepocket: z.string().optional().default(''),
  frontpocket: z.string().optional().default(''),
  shalwarpocket: z.string().optional().default(''),
})

export const createMeasurementProfileSchema = z.object({
  profileName: z.string().min(1).max(100),
  garmentType: z.string().min(1).max(50),
  measurements: z.union([gentsMeasurementsSchema, ladiesMeasurementsSchema]),
  stylingPrefs: z.union([gentsStylingSchema, ladiesStylingSchema]).optional(),
  notes: z.string().max(500).optional(),
  isDefault: z.boolean().optional().default(false),
})

export const updateMeasurementProfileSchema = createMeasurementProfileSchema.partial()

export type GentsMeasurements = z.infer<typeof gentsMeasurementsSchema>
export type GentsStyling = z.infer<typeof gentsStylingSchema>
export type LadiesMeasurements = z.infer<typeof ladiesMeasurementsSchema>
export type LadiesStyling = z.infer<typeof ladiesStylingSchema>
export type CreateMeasurementProfileInput = z.infer<typeof createMeasurementProfileSchema>
export type UpdateMeasurementProfileInput = z.infer<typeof updateMeasurementProfileSchema>
