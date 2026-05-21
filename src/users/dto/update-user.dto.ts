import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';

const ASSIGNABLE_ROLES = [Role.ADMIN, Role.HOTEL_MANAGER] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(ASSIGNABLE_ROLES)
  role?: (typeof ASSIGNABLE_ROLES)[number];

  @ValidateIf((o: UpdateUserDto) => o.role === Role.HOTEL_MANAGER)
  @IsOptional()
  @IsUUID()
  hotelId?: string | null;
}
