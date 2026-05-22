-- Keep one manager per hotel (earliest created); unassign duplicates so the unique index can apply.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "hotelId" ORDER BY "createdAt" ASC) AS rn
  FROM "User"
  WHERE role = 'HOTEL_MANAGER' AND "hotelId" IS NOT NULL
)
UPDATE "User" u
SET "hotelId" = NULL
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "User_hotelId_key" ON "User"("hotelId");
