import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';

const STAFF_ROLES = [Role.ADMIN, Role.HOTEL_MANAGER] as const;

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsEnum(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];

  @ValidateIf((o: CreateUserDto) => o.role === Role.HOTEL_MANAGER)
  @IsUUID()
  hotelId?: string;
}
