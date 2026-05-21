import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

const STAFF_ROLES = [Role.ADMIN, Role.HOTEL_MANAGER] as const;

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];

  @ValidateIf((o: CreateUserDto) => o.role === Role.HOTEL_MANAGER)
  @IsUUID()
  hotelId?: string;
}
