-- CreateTable: customer_measurements
-- This table is FULLY ISOLATED from all existing tables.
-- No foreign keys to users, orders, or MeasurementProfile.
-- One phone can have multiple rows (multiple names/measurements).

CREATE TABLE IF NOT EXISTS "customer_measurements" (
  "id"            TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "phone"         VARCHAR(30)   NOT NULL,
  "customer_name" VARCHAR(150)  NOT NULL,

  -- Garment meta
  "garment_type"  VARCHAR(60)   NOT NULL DEFAULT 'male_shalwar_kameez',
  "gender"        VARCHAR(20)   NOT NULL DEFAULT 'Male',

  -- ── KAMEEZ / SHIRT ───────────────────────────────────────────────
  "length1"       VARCHAR(20)   NOT NULL DEFAULT '',
  "length2"       VARCHAR(20)   NOT NULL DEFAULT '',
  "shoulder1"     VARCHAR(20)   NOT NULL DEFAULT '',
  "shoulder2"     VARCHAR(20)   NOT NULL DEFAULT '',
  "chest1"        VARCHAR(20)   NOT NULL DEFAULT '',
  "chest2"        VARCHAR(20)   NOT NULL DEFAULT '',
  "waist1"        VARCHAR(20)   NOT NULL DEFAULT '',
  "waist2"        VARCHAR(20)   NOT NULL DEFAULT '',
  "gherra1"       VARCHAR(20)   NOT NULL DEFAULT '',
  "gherra2"       VARCHAR(20)   NOT NULL DEFAULT '',
  "neck1"         VARCHAR(20)   NOT NULL DEFAULT '',
  "neck2"         VARCHAR(20)   NOT NULL DEFAULT '',
  "sleeves1"      VARCHAR(20)   NOT NULL DEFAULT '',
  "sleeves2"      VARCHAR(20)   NOT NULL DEFAULT '',
  "golai1"        VARCHAR(20)   NOT NULL DEFAULT '',
  "golai2"        VARCHAR(20)   NOT NULL DEFAULT '',
  "armcuff1"      VARCHAR(20)   NOT NULL DEFAULT '',
  "armcuff2"      VARCHAR(20)   NOT NULL DEFAULT '',
  "armplate1"     VARCHAR(20)   NOT NULL DEFAULT '',
  "armplate2"     VARCHAR(20)   NOT NULL DEFAULT '',
  "golbazoo1"     VARCHAR(20)   NOT NULL DEFAULT '',
  "golbazoo2"     VARCHAR(20)   NOT NULL DEFAULT '',
  "armpatti1"     VARCHAR(20)   NOT NULL DEFAULT '',
  "armpatti2"     VARCHAR(20)   NOT NULL DEFAULT '',
  "collarnok1"    VARCHAR(20)   NOT NULL DEFAULT '',
  "collarnok2"    VARCHAR(20)   NOT NULL DEFAULT '',
  "bane1"         VARCHAR(20)   NOT NULL DEFAULT '',
  "bane2"         VARCHAR(20)   NOT NULL DEFAULT '',
  "hip1"          VARCHAR(20)   NOT NULL DEFAULT '',
  "hip2"          VARCHAR(20)   NOT NULL DEFAULT '',

  -- ── KAMEEZ TOGGLES ───────────────────────────────────────────────
  "double_cb"     VARCHAR(10)   NOT NULL DEFAULT '0',
  "single_cb"     VARCHAR(10)   NOT NULL DEFAULT '0',
  "gol_cb"        VARCHAR(10)   NOT NULL DEFAULT '0',
  "choras_cb"     VARCHAR(10)   NOT NULL DEFAULT '0',
  "bane_cb"       VARCHAR(10)   NOT NULL DEFAULT '0',
  "collar_cb"     VARCHAR(10)   NOT NULL DEFAULT '0',
  "roundneck"     VARCHAR(10)   NOT NULL DEFAULT '0',
  "straight_cb"   VARCHAR(10)   NOT NULL DEFAULT '0',
  "down_cb"       VARCHAR(10)   NOT NULL DEFAULT '0',

  -- ── SHALWAR ──────────────────────────────────────────────────────
  "shalwar1"                VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar2"                VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_gherra1"         VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_gherra2"         VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_assan1"          VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_assan2"          VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_pancha1"         VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_pancha2"         VARCHAR(20) NOT NULL DEFAULT '',
  "front_pocket"            VARCHAR(20) NOT NULL DEFAULT '',
  "side_pocket"             VARCHAR(20) NOT NULL DEFAULT '',
  "shalwar_pocket"          VARCHAR(20) NOT NULL DEFAULT '',
  "zip_cb"                  VARCHAR(10) NOT NULL DEFAULT '0',

  -- ── TROUSER ──────────────────────────────────────────────────────
  "trouserdata1"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata2"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata3"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata4"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata5"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata6"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata7"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata8"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata9"  VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata10" VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata11" VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata12" VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata13" VARCHAR(20) NOT NULL DEFAULT '',
  "trouserdata14" VARCHAR(10) NOT NULL DEFAULT '0',

  -- ── LADIES BOTTOM ─────────────────────────────────────────────────
  "lad_golai1"                    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_golai2"                    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_mori1"                     VARCHAR(20) NOT NULL DEFAULT '',
  "lad_mori2"                     VARCHAR(20) NOT NULL DEFAULT '',
  "lad_bellbazoo1"                VARCHAR(20) NOT NULL DEFAULT '',
  "lad_bellbazoo2"                VARCHAR(20) NOT NULL DEFAULT '',
  "lad_chaak1"                    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_chaak2"                    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_hip1"                      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_hip2"                      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar1"           VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar2"           VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar_pancha1"    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar_pancha2"    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar_gherra1"    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_simple_shalwar_gherra2"    VARCHAR(20) NOT NULL DEFAULT '',
  "lad_lastic_simple_shalwar"     VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt1"             VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt2"             VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt_pancha1"      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt_pancha2"      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt_gherra1"      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_shalwar_belt_gherra2"      VARCHAR(20) NOT NULL DEFAULT '',
  "lad_lastic_shalwar_belt"       VARCHAR(20) NOT NULL DEFAULT '',
  "lad_trouserdata15"             VARCHAR(20) NOT NULL DEFAULT '',
  "lad_trouserdata16"             VARCHAR(10) NOT NULL DEFAULT '0',
  "lad_trouser_elastic1"          VARCHAR(20) NOT NULL DEFAULT '',

  -- ── META ─────────────────────────────────────────────────────────
  "notes"         TEXT          NOT NULL DEFAULT '',
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "deleted_at"    TIMESTAMPTZ,

  CONSTRAINT "customer_measurements_pkey" PRIMARY KEY ("id")
);

-- Index for fast phone lookups (the primary search key)
CREATE INDEX IF NOT EXISTS "idx_customer_measurements_phone"
  ON "customer_measurements"("phone");

-- Index for name searches
CREATE INDEX IF NOT EXISTS "idx_customer_measurements_name"
  ON "customer_measurements"("customer_name");

-- Index for soft-delete filtering
CREATE INDEX IF NOT EXISTS "idx_customer_measurements_deleted"
  ON "customer_measurements"("deleted_at");

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_customer_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_measurements_updated_at ON "customer_measurements";
CREATE TRIGGER trg_customer_measurements_updated_at
  BEFORE UPDATE ON "customer_measurements"
  FOR EACH ROW EXECUTE FUNCTION update_customer_measurements_updated_at();
