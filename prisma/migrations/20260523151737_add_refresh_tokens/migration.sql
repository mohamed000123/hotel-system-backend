-- AlterTable
ALTER TABLE "booking" RENAME CONSTRAINT "Booking_pkey" TO "booking_pkey";

-- AlterTable
ALTER TABLE "hotel" RENAME CONSTRAINT "Hotel_pkey" TO "hotel_pkey";

-- AlterTable
ALTER TABLE "payment" RENAME CONSTRAINT "Payment_pkey" TO "payment_pkey";

-- AlterTable
ALTER TABLE "room" RENAME CONSTRAINT "Room_pkey" TO "room_pkey";

-- AlterTable
ALTER TABLE "user" RENAME CONSTRAINT "User_pkey" TO "user_pkey";

-- RenameForeignKey
ALTER TABLE "booking" RENAME CONSTRAINT "Booking_hotelId_fkey" TO "booking_hotelId_fkey";

-- RenameForeignKey
ALTER TABLE "booking" RENAME CONSTRAINT "Booking_roomId_fkey" TO "booking_roomId_fkey";

-- RenameForeignKey
ALTER TABLE "booking" RENAME CONSTRAINT "Booking_userId_fkey" TO "booking_userId_fkey";

-- RenameForeignKey
ALTER TABLE "payment" RENAME CONSTRAINT "Payment_bookingId_fkey" TO "payment_bookingId_fkey";

-- RenameForeignKey
ALTER TABLE "room" RENAME CONSTRAINT "Room_hotelId_fkey" TO "room_hotelId_fkey";

-- RenameForeignKey
ALTER TABLE "user" RENAME CONSTRAINT "User_hotelId_fkey" TO "user_hotelId_fkey";

-- RenameIndex
ALTER INDEX "Booking_roomId_checkIn_checkOut_status_idx" RENAME TO "booking_roomId_checkIn_checkOut_status_idx";

-- RenameIndex
ALTER INDEX "Hotel_city_idx" RENAME TO "hotel_city_idx";

-- RenameIndex
ALTER INDEX "Hotel_name_idx" RENAME TO "hotel_name_idx";

-- RenameIndex
ALTER INDEX "Payment_bookingId_key" RENAME TO "payment_bookingId_key";

-- RenameIndex
ALTER INDEX "Room_hotelId_idx" RENAME TO "room_hotelId_idx";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "user_email_key";

-- RenameIndex
ALTER INDEX "User_hotelId_key" RENAME TO "user_hotelId_key";
