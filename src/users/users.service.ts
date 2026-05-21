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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: JwtPayloadUser, query: ListUsersQueryDto): Promise<UserResponseDto[]> {
    if (actor.role === Role.SUPER_ADMIN) {
      if (query.role && query.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Super Admin may only list Admin accounts',
        );
      }
      const users = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => this.toResponse(u));
    }

    if (actor.role === Role.ADMIN) {
      if (query.role && query.role !== Role.HOTEL_MANAGER) {
        throw new ForbiddenException(
          'Admins may only list Hotel Manager accounts',
        );
      }
      const users = await this.prisma.user.findMany({
        where: { role: Role.HOTEL_MANAGER },
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => this.toResponse(u));
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
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        hotelId: dto.role === Role.HOTEL_MANAGER ? dto.hotelId! : null,
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

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: nextRole,
        hotelId: nextRole === Role.HOTEL_MANAGER ? nextHotelId : null,
      },
    });

    return this.toResponse(user);
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

  private async assertHotelExists(hotelId: string): Promise<void> {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new BadRequestException('Assigned hotel does not exist');
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
