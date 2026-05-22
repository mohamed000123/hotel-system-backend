-- Rename tables to lowercase (Prisma @@map)
ALTER TABLE "User" RENAME TO "user";
ALTER TABLE "Hotel" RENAME TO "hotel";
ALTER TABLE "Room" RENAME TO "room";
ALTER TABLE "Booking" RENAME TO "booking";
ALTER TABLE "Payment" RENAME TO "payment";
