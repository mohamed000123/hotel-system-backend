import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  HotelStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingQuoteDto } from './dto/booking-quote.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

const GUEST_CANCEL_MIN_MS = 24 * 60 * 60 * 1000;

export interface BookingResponseDto {
  id: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nights: number;
  totalAmount: number;
  status: BookingStatus;
  /** Present for guest lists: whether cancel is allowed (24h before check-in). */
  cancellable?: boolean;
}

export interface BookingListResponseDto {
  data: BookingResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface ValidatedBookingContext {
  hotel: { id: string; status: HotelStatus; timezone: string };
  room: {
    id: string;
    hotelId: string;
    capacity: number;
    pricePerNight: Prisma.Decimal;
    isAvailable: boolean;
  };
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalAmount: Prisma.Decimal;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: BookingAvailabilityService,
  ) {}

  async quote(
    actor: JwtPayloadUser,
    dto: CreateBookingDto,
  ): Promise<BookingQuoteDto> {
    const ctx = await this.validateBookingInput(dto);
    await this.availability.assertAvailable(
      ctx.room.id,
      ctx.checkIn,
      ctx.checkOut,
    );
    return {
      nights: ctx.nights,
      totalAmount: Number(ctx.totalAmount),
    };
  }

  async create(
    actor: JwtPayloadUser,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const ctx = await this.validateBookingInput(dto);

    const booking = await this.availability.runSerializable(async (tx) => {
      await this.availability.assertAvailable(
        ctx.room.id,
        ctx.checkIn,
        ctx.checkOut,
        undefined,
        tx,
      );

      return tx.booking.create({
        data: {
          userId: actor.id,
          hotelId: ctx.hotel.id,
          roomId: ctx.room.id,
          checkIn: ctx.checkIn,
          checkOut: ctx.checkOut,
          guestCount: dto.guestCount,
          nights: ctx.nights,
          totalAmount: ctx.totalAmount,
          status: BookingStatus.PENDING,
        },
      });
    });

    return this.toResponse(booking);
  }

  async list(
    actor: JwtPayloadUser,
    query: ListBookingsQueryDto,
  ): Promise<BookingListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (actor.role === Role.GUEST) {
      where.userId = actor.id;
    } else if (actor.role === Role.HOTEL_MANAGER) {
      if (!actor.hotelId) {
        throw new ForbiddenException('Hotel manager has no assigned hotel');
      }
      where.hotelId = actor.hotelId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.hotelId) {
      if (actor.role === Role.HOTEL_MANAGER && actor.hotelId !== query.hotelId) {
        throw new ForbiddenException(
          'You may only view bookings for your assigned hotel',
        );
      }
      where.hotelId = query.hotelId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    let hotelTimezones: Map<string, string> | undefined;
    if (actor.role === Role.GUEST && bookings.length > 0) {
      const hotelIds = [...new Set(bookings.map((b) => b.hotelId))];
      const hotels = await this.prisma.hotel.findMany({
        where: { id: { in: hotelIds } },
        select: { id: true, timezone: true },
      });
      hotelTimezones = new Map(hotels.map((h) => [h.id, h.timezone]));
    }

    return {
      data: bookings.map((b) =>
        this.toResponse(b, {
          guestCancellation:
            actor.role === Role.GUEST
              ? { hotelTimezone: hotelTimezones?.get(b.hotelId) ?? 'UTC' }
              : undefined,
        }),
      ),
      page,
      limit,
      total,
    };
  }

  async cancel(
    id: string,
    actor: JwtPayloadUser,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrThrow(id);

    if (booking.userId !== actor.id) {
      throw new ForbiddenException('You may only cancel your own bookings');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException('Only pending or confirmed bookings can be cancelled');
    }

    if (actor.role === Role.GUEST) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: booking.hotelId },
        select: { timezone: true },
      });
      if (!hotel) {
        throw new NotFoundException('Hotel not found');
      }
      this.assertGuestCancellationWindow(booking.checkIn, hotel.timezone);
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    return this.toResponse(updated);
  }

  async findByIdForPayment(id: string): Promise<Booking> {
    return this.findBookingOrThrow(id);
  }

  private async validateBookingInput(
    dto: CreateBookingDto,
  ): Promise<ValidatedBookingContext> {
    const checkIn = this.parseDate(dto.checkIn);
    const checkOut = this.parseDate(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: dto.hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    if (hotel.status === HotelStatus.INACTIVE) {
      throw new BadRequestException(
        'New bookings are not allowed for inactive hotels',
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.hotelId !== hotel.id) {
      throw new BadRequestException('Room does not belong to the selected hotel');
    }
    if (!room.isAvailable) {
      throw new ConflictException(
        'The room is not available for the selected dates',
      );
    }

    if (dto.guestCount > room.capacity) {
      throw new BadRequestException(
        `Guest count cannot exceed room capacity (${room.capacity})`,
      );
    }

    this.assertCheckInNotInPast(checkIn, hotel.timezone);

    const nights = this.calculateNights(checkIn, checkOut);
    const totalAmount = new Prisma.Decimal(room.pricePerNight).mul(nights);

    return {
      hotel: {
        id: hotel.id,
        status: hotel.status,
        timezone: hotel.timezone,
      },
      room,
      checkIn,
      checkOut,
      nights,
      totalAmount,
    };
  }

  private assertCheckInNotInPast(checkIn: Date, timezone: string): void {
    const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    const checkInStr = this.formatDateOnly(checkIn);
    if (checkInStr < today) {
      throw new BadRequestException(
        'Check-in date cannot be before today at the hotel',
      );
    }
  }

  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return parsed;
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / msPerDay,
    );
    if (nights < 1) {
      throw new BadRequestException('Stay must be at least one night');
    }
    return nights;
  }

  private async findBookingOrThrow(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private assertGuestCancellationWindow(
    checkIn: Date,
    hotelTimezone: string,
  ): void {
    if (!this.guestCancellationAllowed(checkIn, hotelTimezone)) {
      throw new BadRequestException(
        'Reservations can only be cancelled at least 24 hours before check-in',
      );
    }
  }

  private guestCancellationAllowed(
    checkIn: Date,
    hotelTimezone: string,
  ): boolean {
    const checkInStr = this.formatDateOnly(checkIn);
    const checkInStart = fromZonedTime(
      `${checkInStr}T00:00:00`,
      hotelTimezone,
    );
    return checkInStart.getTime() - Date.now() >= GUEST_CANCEL_MIN_MS;
  }

  private isCancellableByGuest(
    booking: Booking,
    hotelTimezone: string,
  ): boolean {
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      return false;
    }
    return this.guestCancellationAllowed(booking.checkIn, hotelTimezone);
  }

  private toResponse(
    booking: Booking,
    context?: { guestCancellation?: { hotelTimezone: string } },
  ): BookingResponseDto {
    const response: BookingResponseDto = {
      id: booking.id,
      hotelId: booking.hotelId,
      roomId: booking.roomId,
      checkIn: this.formatDateOnly(booking.checkIn),
      checkOut: this.formatDateOnly(booking.checkOut),
      guestCount: booking.guestCount,
      nights: booking.nights,
      totalAmount: Number(booking.totalAmount),
      status: booking.status,
    };

    if (context?.guestCancellation) {
      response.cancellable = this.isCancellableByGuest(
        booking,
        context.guestCancellation.hotelTimezone,
      );
    }

    return response;
  }
}
