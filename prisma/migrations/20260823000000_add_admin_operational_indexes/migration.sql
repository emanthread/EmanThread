-- Additive indexes for growing admin product, order, payment, and stitching queues.
-- No existing rows are changed or removed.

CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

CREATE INDEX "Order_stitchingDeliveryDate_status_idx"
ON "Order"("stitchingDeliveryDate", "status");

CREATE INDEX "MeasurementProfile_status_source_deletedAt_updatedAt_idx"
ON "MeasurementProfile"("status", "source", "deletedAt", "updatedAt");

CREATE INDEX "ManualPaymentSubmission_status_createdAt_idx"
ON "ManualPaymentSubmission"("status", "createdAt");

CREATE INDEX "ManualPaymentSubmission_status_flagged_createdAt_idx"
ON "ManualPaymentSubmission"("status", "flagged", "createdAt");

CREATE INDEX "ManualPaymentSubmission_status_expiresAt_idx"
ON "ManualPaymentSubmission"("status", "expiresAt");
