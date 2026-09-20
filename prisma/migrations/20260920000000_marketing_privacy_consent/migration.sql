ALTER TABLE "User"
  ADD COLUMN "whatsappMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketingConsentUpdatedAt" TIMESTAMP(3);

CREATE TABLE "MarketingContact" (
  "id" TEXT NOT NULL,
  "normalizedPhone" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "city" TEXT,
  "interest" TEXT,
  "source" TEXT NOT NULL,
  "whatsappMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "phoneMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentVersion" TEXT,
  "consentedAt" TIMESTAMP(3),
  "whatsappOptedOutAt" TIMESTAMP(3),
  "phoneOptedOutAt" TIMESTAMP(3),
  "metaLeadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingContact_normalizedPhone_key" ON "MarketingContact"("normalizedPhone");
CREATE UNIQUE INDEX "MarketingContact_metaLeadId_key" ON "MarketingContact"("metaLeadId");
CREATE INDEX "MarketingContact_source_idx" ON "MarketingContact"("source");
CREATE INDEX "MarketingContact_createdAt_idx" ON "MarketingContact"("createdAt");