import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  HotelStatus,
  Prisma,
  Role,
  Room,
} from '@prisma/client';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { HotelsService } from '../hotels/hotels.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {
  roomTypeEnumToLabel,
  roomTypeLabelToEnum,
} from './room-types';

export interface RoomResponseDto {
  id: string;
  hotelId: string;
  roomType: string;
  capacity: number;
  pricePerNight: number;
  isAvailable: boolean;
}

export interface RoomListResponseDto {
  data: RoomResponseDto[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotelsService: HotelsService,
  ) {}

  async list(
    hotelId: string,
    actor: JwtPayloadUser,
    query: ListRoomsQueryDto,
  ): Promise<RoomListResponseDto> {
    const hotel = await this.assertHotelExists(hotelId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = { hotelId };

    const isInventoryManager =
      actor.role === Role.HOTEL_MANAGER && actor.hotelId === hotelId;

    if (isInventoryManager) {
      this.assertCanManageHotel(actor, hotelId);
    } else {
      if (hotel.status !== HotelStatus.ACTIVE) {
        throw new ForbiddenException(
          'Rooms are only visible for active hotels',
        );
      }
      where.isAvailable = true;

      const dateRange = this.parseOptionalDateRange(query.checkIn, query.checkOut);
      if (dateRange) {
        where.NOT = {
          bookings: {
            some: {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
              },
              checkIn: { lt: dateRange.checkOut },
              checkOut: { gt: dateRange.checkIn },
            },
          },
        };
      }
    }

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy: [{ roomType: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data: rooms.map((room) => this.toResponse(room)),
      page,
      limit,
      total,
    };
  }

  async create(
    hotelId: string,
    actor: JwtPayloadUser,
    dto: CreateRoomDto,
  ): Promise<RoomResponseDto> {
    await this.assertHotelExists(hotelId);
    this.assertCanManageHotel(actor, hotelId);

    const room = await this.prisma.room.create({
      data: {
        hotelId,
        roomType: roomTypeLabelToEnum(dto.roomType),
        capacity: dto.capacity,
        pricePerNight: dto.pricePerNight,
        isAvailable: dto.isAvailable,
      },
    });

    await this.hotelsService.refreshAvailableRoomCount(hotelId);

    return this.toResponse(room);
  }

  async update(
    id: string,
    actor: JwtPayloadUser,
    dto: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    const existing = await this.prisma.room.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    this.assertCanManageHotel(actor, existing.hotelId);

    const room = await this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.roomType !== undefined && {
          roomType: roomTypeLabelToEnum(dto.roomType),
        }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.pricePerNight !== undefined && {
          pricePerNight: dto.pricePerNight,
        }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    await this.hotelsService.refreshAvailableRoomCount(room.hotelId);

    return this.toResponse(room);
  }

  private assertCanManageHotel(actor: JwtPayloadUser, hotelId: string): void {
    if (actor.role !== Role.HOTEL_MANAGER) {
      throw new ForbiddenException('Insufficient permissions for room inventory');
    }
    if (!actor.hotelId || actor.hotelId !== hotelId) {
      throw new ForbiddenException(
        'You may only manage rooms for your assigned hotel',
      );
    }
  }

  private async assertHotelExists(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  private parseOptionalDateRange(
    checkIn?: string,
    checkOut?: string,
  ): { checkIn: Date; checkOut: Date } | null {
    if (checkIn === undefined && checkOut === undefined) {
      return null;
    }
    if (checkIn === undefined || checkOut === undefined) {
      throw new BadRequestException(
        'checkIn and checkOut must both be provided to filter by stay dates',
      );
    }

    const checkInDate = this.parseDate(checkIn);
    const checkOutDate = this.parseDate(checkOut);
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    return { checkIn: checkInDate, checkOut: checkOutDate };
  }

  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return parsed;
  }

  private toResponse(room: Room): RoomResponseDto {
    return {
      id: room.id,
      hotelId: room.hotelId,
      roomType: roomTypeEnumToLabel(room.roomType),
      capacity: room.capacity,
      pricePerNight: Number(room.pricePerNight),
      isAvailable: room.isAvailable,
    };
  }
}
