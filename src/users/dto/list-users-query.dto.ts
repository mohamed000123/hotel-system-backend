import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

const LIST_ROLES = [Role.ADMIN, Role.HOTEL_MANAGER] as const;

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(LIST_ROLES)
  role?: (typeof LIST_ROLES)[number];
}
