-- AlterTable: add quantity display fields with backfill from servings
ALTER TABLE "food_entries" ADD COLUMN "quantity_value" DOUBLE PRECISION;
ALTER TABLE "food_entries" ADD COLUMN "quantity_unit" TEXT;

UPDATE "food_entries"
SET
  "quantity_value" = "servings",
  "quantity_unit" = 'serving'
WHERE "quantity_value" IS NULL OR "quantity_unit" IS NULL;

ALTER TABLE "food_entries" ALTER COLUMN "quantity_value" SET NOT NULL;
ALTER TABLE "food_entries" ALTER COLUMN "quantity_unit" SET NOT NULL;
