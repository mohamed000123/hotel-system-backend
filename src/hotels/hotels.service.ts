import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Hotel, HotelStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { ListHotelsQueryDto } from './dto/list-hotels-query.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

export interface HotelResponseDto {
  id: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  status: HotelStatus;
  availableRoomCount: number;
}

export interface HotelListResponseDto {
  data: HotelResponseDto[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListHotelsQueryDto): Promise<HotelListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.HotelWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [hotels, total] = await Promise.all([
      this.prisma.hotel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.hotel.count({ where }),
    ]);

    const countsByHotelId = await this.availableRoomCounts(
      hotels.map((h) => h.id),
    );

    return {
      data: hotels.map((hotel) =>
        this.toResponse(hotel, countsByHotelId.get(hotel.id) ?? 0),
      ),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string): Promise<HotelResponseDto> {
    const hotel = await this.prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const availableRoomCount = await this.refreshAvailableRoomCount(id);

    return this.toResponse(hotel, availableRoomCount);
  }

  /** Recomputes available room count for a hotel (called after room inventory changes). */
  async refreshAvailableRoomCount(hotelId: string): Promise<number> {
    return this.prisma.room.count({
      where: { hotelId, isAvailable: true },
    });
  }

  async create(dto: CreateHotelDto): Promise<HotelResponseDto> {
    const hotel = await this.prisma.hotel.create({
      data: {
        name: dto.name,
        city: dto.city,
        address: dto.address,
        stars: dto.stars,
        status: dto.status,
        timezone: dto.timezone ?? 'UTC',
      },
    });

    return this.toResponse(hotel, 0);
  }

  async update(id: string, dto: UpdateHotelDto): Promise<HotelResponseDto> {
    await this.assertExists(id);

    const hotel = await this.prisma.hotel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.stars !== undefined && { stars: dto.stars }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });

    const availableRoomCount = await this.refreshAvailableRoomCount(id);

    return this.toResponse(hotel, availableRoomCount);
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);

    const blockingBookings = await this.prisma.booking.count({
      where: {
        hotelId: id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    });

    if (blockingBookings > 0) {
      throw new ConflictException(
        'Cannot delete hotel with pending or confirmed bookings',
      );
    }

    await this.prisma.hotel.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<Hotel> {
    const hotel = await this.prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  private async availableRoomCounts(
    hotelIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (hotelIds.length === 0) {
      return map;
    }

    const grouped = await this.prisma.room.groupBy({
      by: ['hotelId'],
      where: {
        hotelId: { in: hotelIds },
        isAvailable: true,
      },
      _count: { id: true },
    });

    for (const row of grouped) {
      map.set(row.hotelId, row._count.id);
    }

    return map;
  }

  private toResponse(hotel: Hotel, availableRoomCount: number): HotelResponseDto {
    return {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      address: hotel.address,
      stars: hotel.stars,
      status: hotel.status,
      availableRoomCount,
    };
  }
}
