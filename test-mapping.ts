import { unifiedMeasurementSchema } from './lib/validators/measurements-unified';
import { mapToPrismaFields, mapFromPrismaFields } from './lib/validators/measurements-unified';

const inputData = {
  trouserLength1: "40",
  ladSimpleShalwar1: "38",
  ladShalwarBelt1: "39"
};

console.log("Input:", inputData);

// Simulate parsed
const parsed = unifiedMeasurementSchema.partial().parse(inputData);
console.log("Parsed:", parsed);

// Simulate mapping to Prisma
const prismaFields = mapToPrismaFields(parsed as any);
console.log("To Prisma:", prismaFields);

// Simulate what Prisma returns (it returns these fields on the model)
const prismaRow = {
  ...prismaFields,
  id: "123",
  userId: "user_1"
};

// Simulate mapping back to Frontend
const mappedBack = mapFromPrismaFields(prismaRow as any);
console.log("Mapped Back:", {
  trouserLength1: mappedBack.trouserLength1,
  ladSimpleShalwar1: mappedBack.ladSimpleShalwar1,
  ladShalwarBelt1: mappedBack.ladShalwarBelt1
});
