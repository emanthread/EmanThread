-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" DATETIME,
    "source" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_isSubscribed_idx" ON "NewsletterSubscriber"("isSubscribed");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_subscribedAt_idx" ON "NewsletterSubscriber"("subscribedAt");
