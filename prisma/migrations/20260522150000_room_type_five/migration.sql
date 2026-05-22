-- Remap deprecated room types to the five retained values
UPDATE "Room" SET "roomType" = 'Standard Double'
WHERE "roomType"::text IN (
  'Economy Twin',
  'Superior Queen',
  'Connecting Double',
  'Accessible Room',
  'Studio Apartment',
  'Executive Suite'
);

UPDATE "Room" SET "roomType" = 'Deluxe King'
WHERE "roomType"::text IN ('Penthouse Suite');

UPDATE "Room" SET "roomType" = 'Junior Suite'
WHERE "roomType"::text IN ('Presidential Suite');

-- Drop excess seeded rooms (indices 6–13) when they have no bookings
DELETE FROM "Room" r
WHERE r."id" LIKE 'a1000002-0002-4002-8002-%'
  AND CAST(SUBSTRING(r."id" FROM 29 FOR 4) AS INTEGER) >= 6
  AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."roomId" = r."id");

-- Recreate enum with five values only
ALTER TABLE "Room" ALTER COLUMN "roomType" TYPE TEXT USING ("roomType"::text);
DROP TYPE "RoomType";

CREATE TYPE "RoomType" AS ENUM (
  'Standard Single',
  'Standard Double',
  'Deluxe King',
  'Junior Suite',
  'Family Room'
);

ALTER TABLE "Room" ALTER COLUMN "roomType" TYPE "RoomType" USING ("roomType"::"RoomType");
