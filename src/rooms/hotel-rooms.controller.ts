import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ROOM_INVENTORY_ROLES } from '../common/constants/role-groups';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import { RoomsService } from './rooms.service';

@Controller('hotels/:hotelId/rooms')
export class HotelRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(
    @Param('hotelId') hotelId: string,
    @Req() req: Request & { user: JwtPayloadUser },
    @Query() query: ListRoomsQueryDto,
  ) {
    return this.roomsService.list(hotelId, req.user, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...ROOM_INVENTORY_ROLES)
  create(
    @Param('hotelId') hotelId: string,
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(hotelId, req.user, dto);
  }
}
