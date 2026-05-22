import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const LIST_ROLES = [Role.ADMIN, Role.HOTEL_MANAGER] as const;

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LIST_ROLES)
  role?: (typeof LIST_ROLES)[number];
}
