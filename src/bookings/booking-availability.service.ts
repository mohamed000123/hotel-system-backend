import { ConflictException, Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AVAILABILITY_CONFLICT_MESSAGE =
  'The room is not available for the selected dates';

@Injectable()
export class BookingAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns true when another PENDING/CONFIRMED booking overlaps the date range.
   */
  async hasOverlap(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    const conflict = await client.booking.findFirst({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
      },
      select: { id: true },
    });
    return conflict !== null;
  }

  async assertAvailable(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const overlap = await this.hasOverlap(
      roomId,
      checkIn,
      checkOut,
      excludeBookingId,
      client,
    );
    if (overlap) {
      throw new ConflictException(AVAILABILITY_CONFLICT_MESSAGE);
    }
  }

  /**
   * Serializable transaction wrapper for create/pay flows that must prevent double booking.
   */
  async runSerializable<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}
