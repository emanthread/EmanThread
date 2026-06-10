-- AlterTable
ALTER TABLE "StitchingPrice" ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'Male';

-- DropIndex (remove old single-column unique constraint)
DROP INDEX IF EXISTS "StitchingPrice_fabricType_key";

-- CreateIndex (new composite unique constraint)
CREATE UNIQUE INDEX "StitchingPrice_fabricType_gender_key" ON "StitchingPrice"("fabricType", "gender");