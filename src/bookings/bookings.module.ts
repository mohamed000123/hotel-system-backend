import { Module } from '@nestjs/common';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingAvailabilityService],
  exports: [BookingsService, BookingAvailabilityService],
})
export class BookingsModule {}
