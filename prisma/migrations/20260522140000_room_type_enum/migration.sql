-- Normalize legacy free-text room types before enum conversion
UPDATE "Room"
SET "roomType" = 'Standard Single'
WHERE "roomType" NOT IN (
  'Standard Single',
  'Standard Double',
  'Economy Twin',
  'Superior Queen',
  'Deluxe King',
  'Junior Suite',
  'Executive Suite',
  'Family Room',
  'Connecting Double',
  'Accessible Room',
  'Studio Apartment',
  'Penthouse Suite',
  'Presidential Suite'
);

-- CreateEnum
DROP TYPE IF EXISTS "RoomType";
CREATE TYPE "RoomType" AS ENUM (
  'Standard Single',
  'Standard Double',
  'Economy Twin',
  'Superior Queen',
  'Deluxe King',
  'Junior Suite',
  'Executive Suite',
  'Family Room',
  'Connecting Double',
  'Accessible Room',
  'Studio Apartment',
  'Penthouse Suite',
  'Presidential Suite'
);

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "roomType" TYPE "RoomType" USING ("roomType"::"RoomType");
