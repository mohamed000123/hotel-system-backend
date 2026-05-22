import { ConflictException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { BookingAvailabilityService } from '../src/bookings/booking-availability.service';

describe('BookingAvailabilityService', () => {
  const checkIn = new Date('2026-06-01');
  const checkOut = new Date('2026-06-04');
  const roomId = 'room-1';

  function createPrismaMock() {
    const booking = {
      findFirst: jest.fn(),
    };
    const prisma = {
      booking,
      $transaction: jest.fn(),
    };
    return { prisma, booking };
  }

  it('hasOverlap returns false when no conflicting booking exists', async () => {
    const { prisma, booking } = createPrismaMock();
    booking.findFirst.mockResolvedValue(null);

    const service = new BookingAvailabilityService(prisma as never);
    await expect(service.hasOverlap(roomId, checkIn, checkOut)).resolves.toBe(
      false,
    );

    expect(booking.findFirst).toHaveBeenCalledWith({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    });
  });

  it('hasOverlap returns true when a conflicting booking exists', async () => {
    const { prisma, booking } = createPrismaMock();
    booking.findFirst.mockResolvedValue({ id: 'booking-1' });

    const service = new BookingAvailabilityService(prisma as never);
    await expect(service.hasOverlap(roomId, checkIn, checkOut)).resolves.toBe(
      true,
    );
  });

  it('assertAvailable throws ConflictException on overlap', async () => {
    const { prisma, booking } = createPrismaMock();
    booking.findFirst.mockResolvedValue({ id: 'booking-1' });

    const service = new BookingAvailabilityService(prisma as never);
    await expect(
      service.assertAvailable(roomId, checkIn, checkOut),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('runSerializable delegates to prisma.$transaction with Serializable isolation', async () => {
    const { prisma } = createPrismaMock();
    const fn = jest.fn().mockResolvedValue('ok');
    prisma.$transaction.mockResolvedValue('ok');

    const service = new BookingAvailabilityService(prisma as never);
    await service.runSerializable(fn);

    expect(prisma.$transaction).toHaveBeenCalledWith(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
