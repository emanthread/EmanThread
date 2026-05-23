import { z } from "zod";

const fraction = z.enum(["", "1/2", "1/4", "1/8"]);
const mstr = z.string().max(10).default("");

export const tailorMeasurementSchema = z.object({
  gender: z.enum(["Male", "Female"]).default("Male"),
  deliveryDate: z.string().optional(),
  notes: z.string().max(500).default(""),
  status: z.enum(["pending", "complete"]).default("pending"),

  // Kameez
  length1: mstr, length2: fraction,
  shoulder1: mstr, shoulder2: fraction,
  chest1: mstr, chest2: fraction,
  waist1: mstr, waist2: fraction,
  gherra1: mstr, gherra2: fraction,
  neck1: mstr, neck2: fraction,
  sleeves1: mstr, sleeves2: fraction,
  golai1: mstr, golai2: fraction,
  armcuff1: mstr, armcuff2: fraction,
  armplate1: mstr, armplate2: fraction,
  golbazoo1: mstr, golbazoo2: fraction,
  armpatti1: mstr, armpatti2: fraction,
  collarnok1: mstr, collarnok2: fraction,
  bane1: mstr, bane2: fraction,

  // Checkboxes
  doubleCb: z.string().default("0"),
  singleCb: z.string().default("0"),
  golCb: z.string().default("0"),
  chorasCb: z.string().default("0"),
  baneCb: z.string().default("0"),
  collarCb: z.string().default("0"),
  roundneck: z.string().default("0"),

  // Shalwar
  shalwar1: mstr, shalwar2: fraction,
  shalwarGherra1: mstr, shalwarGherra2: fraction,
  shalwarAssan1: mstr, shalwarAssan2: fraction,
  shalwarPancha1: mstr, shalwarPancha2: fraction,

  // Pockets
  frontPocket: mstr,
  sidePocket: mstr,
  shalwarPocket: mstr,

  // Trouser
  trouserdata1: mstr, trouserdata2: fraction,
  trouserdata3: mstr, trouserdata4: fraction,
  trouserdata5: mstr, trouserdata6: fraction,
  trouserdata7: mstr, trouserdata8: fraction,
  trouserdata9: mstr, trouserdata10: fraction,
  trouserdata11: mstr, trouserdata12: fraction,
  trouserdata13: mstr,
  trouserdata14: z.string().default("0"),

  // Ladies extras
  ladGolai1: mstr, ladGolai2: fraction,
  ladMori1: mstr, ladMori2: fraction,
  ladBellbazoo1: mstr, ladBellbazoo2: fraction,
  ladChaak1: mstr, ladChaak2: fraction,
  ladHip1: mstr, ladHip2: fraction,
  ladSimpleShalwar1: mstr, ladSimpleShalwar2: fraction,
  ladSimpleShalwarPancha1: mstr, ladSimpleShalwarPancha2: fraction,
  ladSimpleShalwarGherra1: mstr, ladSimpleShalwarGherra2: fraction,
  ladLasticSimpleShalwar: mstr,
  ladShalwarBelt1: mstr, ladShalwarBelt2: fraction,
  ladShalwarBeltPancha1: mstr, ladShalwarBeltPancha2: fraction,
  ladShalwarBeltGherra1: mstr, ladShalwarBeltGherra2: fraction,
  ladLasticShalwarBelt: mstr,
  ladTrouserdata15: mstr,
  ladTrouserdata16: z.string().default("0"),
});

export type TailorMeasurementFormData = z.infer<typeof tailorMeasurementSchema>;

export const tailorMeasurementRequestSchema = z.object({
  notes: z.string().max(500).optional(),
  gender: z.enum(["Male", "Female"]).default("Male"),
  selectedProfileId: z.string().optional(),
  selectedProfileName: z.string().optional(),
});

export const TAILOR_MEASUREMENT_EMPTY: TailorMeasurementFormData = {
  gender: "Male", deliveryDate: "", notes: "", status: "pending",
  length1: "", length2: "", shoulder1: "", shoulder2: "",
  chest1: "", chest2: "", waist1: "", waist2: "", gherra1: "", gherra2: "",
  neck1: "", neck2: "", sleeves1: "", sleeves2: "", golai1: "", golai2: "",
  armcuff1: "", armcuff2: "", armplate1: "", armplate2: "",
  golbazoo1: "", golbazoo2: "", armpatti1: "", armpatti2: "",
  collarnok1: "", collarnok2: "", bane1: "", bane2: "",
  doubleCb: "0", singleCb: "0", golCb: "0", chorasCb: "0", baneCb: "0", collarCb: "0", roundneck: "0",
  shalwar1: "", shalwar2: "", shalwarGherra1: "", shalwarGherra2: "",
  shalwarAssan1: "", shalwarAssan2: "", shalwarPancha1: "", shalwarPancha2: "",
  frontPocket: "", sidePocket: "", shalwarPocket: "",
  trouserdata1: "", trouserdata2: "", trouserdata3: "", trouserdata4: "",
  trouserdata5: "", trouserdata6: "", trouserdata7: "", trouserdata8: "",
  trouserdata9: "", trouserdata10: "", trouserdata11: "", trouserdata12: "",
  trouserdata13: "", trouserdata14: "0",
  ladGolai1: "", ladGolai2: "", ladMori1: "", ladMori2: "",
  ladBellbazoo1: "", ladBellbazoo2: "", ladChaak1: "", ladChaak2: "",
  ladHip1: "", ladHip2: "", ladSimpleShalwar1: "", ladSimpleShalwar2: "",
  ladSimpleShalwarPancha1: "", ladSimpleShalwarPancha2: "",
  ladSimpleShalwarGherra1: "", ladSimpleShalwarGherra2: "",
  ladLasticSimpleShalwar: "", ladShalwarBelt1: "", ladShalwarBelt2: "",
  ladShalwarBeltPancha1: "", ladShalwarBeltPancha2: "",
  ladShalwarBeltGherra1: "", ladShalwarBeltGherra2: "",
  ladLasticShalwarBelt: "", ladTrouserdata15: "", ladTrouserdata16: "0",
};
