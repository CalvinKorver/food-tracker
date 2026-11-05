-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('open_food_facts', 'custom', 'barcode', 'ocr');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "source" "FoodSource" NOT NULL,
    "external_id" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "serving_qty" DOUBLE PRECISION NOT NULL,
    "serving_unit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugar_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium_mg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nutrients_extra" JSONB NOT NULL DEFAULT '{}',
    "source_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","food_id")
);

-- CreateTable
CREATE TABLE "food_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "logged_on" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "food_name_snapshot" TEXT NOT NULL,
    "calories_snapshot" DOUBLE PRECISION NOT NULL,
    "protein_g_snapshot" DOUBLE PRECISION NOT NULL,
    "carbs_g_snapshot" DOUBLE PRECISION NOT NULL,
    "fat_g_snapshot" DOUBLE PRECISION NOT NULL,
    "fiber_g_snapshot" DOUBLE PRECISION NOT NULL,
    "sugar_g_snapshot" DOUBLE PRECISION NOT NULL,
    "sodium_mg_snapshot" DOUBLE PRECISION NOT NULL,
    "nutrients_extra_snapshot" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "foods_user_id_source_idx" ON "foods"("user_id", "source");

-- CreateIndex
CREATE INDEX "foods_name_idx" ON "foods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "foods_source_external_id_key" ON "foods"("source", "external_id");

-- CreateIndex
CREATE INDEX "food_entries_user_id_logged_on_idx" ON "food_entries"("user_id", "logged_on");

-- CreateIndex
CREATE INDEX "food_entries_user_id_created_at_idx" ON "food_entries"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
