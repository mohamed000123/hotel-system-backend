import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ORG_ADMIN_ROLES } from '../common/constants/role-groups';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { ListHotelsQueryDto } from './dto/list-hotels-query.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelsService } from './hotels.service';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  list(@Query() query: ListHotelsQueryDto) {
    return this.hotelsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hotelsService.findOne(id);
  }

  @Post()
  @Roles(...ORG_ADMIN_ROLES)
  create(@Body() dto: CreateHotelDto) {
    return this.hotelsService.create(dto);
  }

  @Patch(':id')
  @Roles(...ORG_ADMIN_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...ORG_ADMIN_ROLES)
  remove(@Param('id') id: string) {
    return this.hotelsService.remove(id);
  }
}
