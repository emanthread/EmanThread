import { unifiedMeasurementSchema } from './lib/validators/measurements-unified.ts';
import { mapToPrismaFields, mapFromPrismaFields, UNIFIED_MEASUREMENT_EMPTY } from './lib/validators/measurements-unified.ts';

const inputData = {
  ...UNIFIED_MEASUREMENT_EMPTY,
  trouserLength1: "40",
  ladSimpleShalwar1: "38",
  ladShalwarBelt1: "39"
};

const parsed = unifiedMeasurementSchema.partial().parse(inputData);
const prismaFields = mapToPrismaFields(parsed as any);

const prismaRow = { ...prismaFields };

const mappedBack = mapFromPrismaFields(prismaRow as any);

console.log("Mapped Back:", {
  trouserLength1: mappedBack.trouserLength1,
  ladSimpleShalwar1: mappedBack.ladSimpleShalwar1,
  ladShalwarBelt1: mappedBack.ladShalwarBelt1
});

if (mappedBack.trouserLength1 === "40" && mappedBack.ladSimpleShalwar1 === "38" && mappedBack.ladShalwarBelt1 === "39") {
  console.log("SUCCESS!");
} else {
  console.log("FAILED!");
}
