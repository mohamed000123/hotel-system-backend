import { Body, Controller, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { ROOM_INVENTORY_ROLES } from '../common/constants/role-groups';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Patch(':id')
  @Roles(...ROOM_INVENTORY_ROLES)
  update(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, req.user, dto);
  }
}
