import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import {
  ADMIN_PROVISIONER_ROLES,
  MANAGER_PROVISIONER_ROLES,
} from '../common/constants/role-groups';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  list(
    @Req() req: Request & { user: JwtPayloadUser },
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(req.user, query);
  }

  @Post()
  @Roles(...ADMIN_PROVISIONER_ROLES, ...MANAGER_PROVISIONER_ROLES)
  create(
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(req.user, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_PROVISIONER_ROLES, ...MANAGER_PROVISIONER_ROLES)
  update(
    @Req() req: Request & { user: JwtPayloadUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user, id, dto);
  }
}
