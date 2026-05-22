import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardStatsDto {
  totalHotels: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  revenueTotal: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(actor: JwtPayloadUser): Promise<DashboardStatsDto> {
    const hotelWhere = this.buildHotelScope(actor);
    const bookingWhere = this.buildBookingScope(actor);

    const [
      totalHotels,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      revenueAggregate,
    ] = await Promise.all([
      this.prisma.hotel.count({ where: hotelWhere }),
      this.prisma.booking.count({ where: bookingWhere }),
      this.prisma.booking.count({
        where: { ...bookingWhere, status: BookingStatus.CONFIRMED },
      }),
      this.prisma.booking.count({
        where: { ...bookingWhere, status: BookingStatus.PENDING },
      }),
      this.prisma.booking.aggregate({
        where: { ...bookingWhere, status: BookingStatus.CONFIRMED },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalHotels,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      revenueTotal: Number(revenueAggregate._sum.totalAmount ?? 0),
    };
  }

  private buildHotelScope(actor: JwtPayloadUser): Prisma.HotelWhereInput {
    if (actor.role === Role.HOTEL_MANAGER) {
      this.assertManagerHotelAssigned(actor);
      return { id: actor.hotelId! };
    }
    return {};
  }

  private buildBookingScope(actor: JwtPayloadUser): Prisma.BookingWhereInput {
    if (actor.role === Role.HOTEL_MANAGER) {
      this.assertManagerHotelAssigned(actor);
      return { hotelId: actor.hotelId! };
    }
    return {};
  }

  private assertManagerHotelAssigned(actor: JwtPayloadUser): void {
    if (!actor.hotelId) {
      throw new ForbiddenException(
        'Hotel Manager must have an assigned hotel to view dashboard metrics',
      );
    }
  }
}
