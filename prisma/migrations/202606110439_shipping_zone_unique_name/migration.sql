-- Add unique constraint to ShippingZone.name
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_name_key" UNIQUE ("name");