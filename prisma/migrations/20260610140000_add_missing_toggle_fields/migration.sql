-- AlterTable: Add missing toggle columns for straightCb, downCb, zipCb
ALTER TABLE "MeasurementProfile" 
ADD COLUMN "straightCb" TEXT NOT NULL DEFAULT '0',
ADD COLUMN "downCb" TEXT NOT NULL DEFAULT '0',
ADD COLUMN "zipCb" TEXT NOT NULL DEFAULT '0';