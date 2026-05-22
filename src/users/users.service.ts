import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponseDto {
  id: string;
  email: string;
  role: Role;
  hotelId: string | null;
  createdAt: Date;
}

export interface UserListResponseDto {
  data: UserResponseDto[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: JwtPayloadUser,
    query: ListUsersQueryDto,
  ): Promise<UserListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    if (actor.role === Role.SUPER_ADMIN) {
      if (query.role && query.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Super Admin may only list Admin accounts',
        );
      }
      const where = { role: Role.ADMIN };
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.user.count({ where }),
      ]);
      return {
        data: users.map((u) => this.toResponse(u)),
        page,
        limit,
        total,
      };
    }

    if (actor.role === Role.ADMIN) {
      if (query.role && query.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only list Hotel Manager accounts',
        );
      }
      const where = { role: Role.HOTEL_MANAGER };
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.user.count({ where }),
      ]);
      return {
        data: users.map((u) => this.toResponse(u)),
        page,
        limit,
        total,
      };
    }

    throw new ForbiddenException('You do not have permission for this action');
  }

  async create(actor: JwtPayloadUser, dto: CreateUserDto): Promise<UserResponseDto> {
    this.assertCanCreate(actor, dto);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (dto.role === Role.HOTEL_MANAGER) {
      await this.assertHotelExists(dto.hotelId!);
      await this.assertHotelHasNoManager(dto.hotelId!);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const mustChangePassword = this.requiresPasswordChangeOnFirstLogin(
      actor.role,
      dto.role,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        hotelId: dto.role === Role.HOTEL_MANAGER ? dto.hotelId! : null,
        mustChangePassword,
      },
    });

    return this.toResponse(user);
  }

  async update(
    actor: JwtPayloadUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    this.assertCanUpdate(actor, target, dto);

    const nextRole = dto.role ?? target.role;
    let nextHotelId = target.hotelId;

    if (dto.role !== undefined) {
      if (dto.role === Role.HOTEL_MANAGER) {
        if (!dto.hotelId) {
          throw new BadRequestException('hotelId is required for Hotel Manager');
        }
        await this.assertHotelExists(dto.hotelId);
        nextHotelId = dto.hotelId;
      } else {
        nextHotelId = null;
      }
    } else if (dto.hotelId !== undefined) {
      if (target.role !== Role.HOTEL_MANAGER && nextRole !== Role.HOTEL_MANAGER) {
        throw new BadRequestException('hotelId is only allowed for Hotel Manager');
      }
      if (dto.hotelId) {
        await this.assertHotelExists(dto.hotelId);
      }
      nextHotelId = dto.hotelId;
    }

    if (nextRole === Role.HOTEL_MANAGER && !nextHotelId) {
      throw new BadRequestException('hotelId is required for Hotel Manager');
    }

    if (nextRole === Role.HOTEL_MANAGER && nextHotelId) {
      await this.assertHotelHasNoManager(nextHotelId, target.id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: nextRole,
        hotelId: nextRole === Role.HOTEL_MANAGER ? nextHotelId : null,
      },
    });

    return this.toResponse(user);
  }

  async remove(actor: JwtPayloadUser, id: string): Promise<void> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    this.assertCanDelete(actor, target);

    const bookingCount = await this.prisma.booking.count({
      where: { userId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete account with existing bookings',
      );
    }

    await this.prisma.user.delete({ where: { id } });
  }

  private assertCanCreate(actor: JwtPayloadUser, dto: CreateUserDto): void {
    if (actor.role === Role.SUPER_ADMIN) {
      if (dto.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Super Admin may only create Admin accounts',
        );
      }
      if (dto.hotelId) {
        throw new BadRequestException('hotelId is not allowed when creating an Admin');
      }
      return;
    }

    if (actor.role === Role.ADMIN) {
      if (dto.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only create Hotel Manager accounts',
        );
      }
      if (!dto.hotelId) {
        throw new BadRequestException('hotelId is required for Hotel Manager');
      }
      return;
    }

    throw new ForbiddenException('You do not have permission for this action');
  }

  private assertCanUpdate(
    actor: JwtPayloadUser,
    target: { id: string; role: Role },
    dto: UpdateUserDto,
  ): void {
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('The Super Admin account cannot be modified');
    }

    if (target.role === Role.GUEST) {
      throw new ForbiddenException('Guest accounts cannot be modified through this API');
    }

    if (actor.role === Role.SUPER_ADMIN) {
      if (target.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Super Admin may only manage Admin accounts',
        );
      }
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Super Admin may only assign the Admin role',
        );
      }
      if (dto.hotelId) {
        throw new BadRequestException('hotelId is not allowed for Admin accounts');
      }
      return;
    }

    if (actor.role === Role.ADMIN) {
      if (target.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only manage Hotel Manager accounts',
        );
      }
      if (dto.role === Role.ADMIN) {
        throw new ForbiddenException(
          'Admins may only assign the Hotel Manager role',
        );
      }
      if (dto.role && dto.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only assign the Hotel Manager role',
        );
      }
      return;
    }

    throw new ForbiddenException('You do not have permission for this action');
  }

  private assertCanDelete(
    actor: JwtPayloadUser,
    target: { role: Role },
  ): void {
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('The Super Admin account cannot be deleted');
    }

    if (target.role === Role.GUEST) {
      throw new ForbiddenException(
        'Guest accounts cannot be deleted through this API',
      );
    }

    if (actor.role === Role.ADMIN) {
      if (target.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only delete Hotel Manager accounts',
        );
      }
      return;
    }

    throw new ForbiddenException('You do not have permission for this action');
  }

  /**
   * Staff provisioned with a temporary password must change it on first login.
   * Super Admin → Admin; Admin → Hotel Manager (per role matrix).
   */
  private requiresPasswordChangeOnFirstLogin(
    actorRole: Role,
    createdRole: Role,
  ): boolean {
    return (
      (actorRole === Role.SUPER_ADMIN && createdRole === Role.ADMIN) ||
      (actorRole === Role.ADMIN && createdRole === Role.HOTEL_MANAGER)
    );
  }

  private async assertHotelExists(hotelId: string): Promise<void> {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new BadRequestException('Assigned hotel does not exist');
    }
  }

  private async assertHotelHasNoManager(
    hotelId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const existingManager = await this.prisma.user.findFirst({
      where: {
        role: Role.HOTEL_MANAGER,
        hotelId,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (existingManager) {
      throw new ConflictException(
        'This hotel already has a manager. Cannot assign two managers to the same hotel.',
      );
    }
  }

  private toResponse(user: {
    id: string;
    email: string;
    role: Role;
    hotelId: string | null;
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      createdAt: user.createdAt,
    };
  }
}
