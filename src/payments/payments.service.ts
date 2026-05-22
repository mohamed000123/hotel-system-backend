import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { BookingAvailabilityService } from '../bookings/booking-availability.service';
import { PrismaService } from '../prisma/prisma.service';

export interface PaymentResponseDto {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  completedAt: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: BookingAvailabilityService,
  ) {}

  async pay(
    bookingId: string,
    actor: JwtPayloadUser,
  ): Promise<PaymentResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== actor.id) {
      throw new ForbiddenException('You may only pay for your own bookings');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    if (booking.payment) {
      throw new ConflictException('Payment already completed for this booking');
    }

    const payment = await this.availability.runSerializable(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });

      if (!current) {
        throw new NotFoundException('Booking not found');
      }
      if (current.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Only pending bookings can be paid');
      }
      if (current.payment) {
        throw new ConflictException(
          'Payment already completed for this booking',
        );
      }

      await this.availability.assertAvailable(
        current.roomId,
        current.checkIn,
        current.checkOut,
        current.id,
        tx,
      );

      const completedAt = new Date();

      const created = await tx.payment.create({
        data: {
          bookingId: current.id,
          amount: current.totalAmount,
          status: PaymentStatus.COMPLETED,
          completedAt,
        },
      });

      await tx.booking.update({
        where: { id: current.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      return created;
    });

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      status: payment.status,
      completedAt: payment.completedAt.toISOString(),
    };
  }
}
