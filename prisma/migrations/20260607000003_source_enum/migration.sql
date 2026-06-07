-- Part C: Convert source column from plain String to MeasurementSource enum
-- This gives compile-time type safety in TypeScript/Prisma

-- Step 1: Drop the old default (text cannot auto-cast to enum)
ALTER TABLE "MeasurementProfile" ALTER COLUMN "source" DROP DEFAULT;

-- Step 2: Create the enum type
CREATE TYPE "MeasurementSource" AS ENUM ('profile', 'tailor_request', 'order');

-- Step 3: Convert the source column to use the enum type
ALTER TABLE "MeasurementProfile" 
  ALTER COLUMN "source" TYPE "MeasurementSource" USING "source"::"MeasurementSource";

-- Step 4: Set the new default on the column
ALTER TABLE "MeasurementProfile" 
  ALTER COLUMN "source" SET DEFAULT 'profile'::"MeasurementSource";