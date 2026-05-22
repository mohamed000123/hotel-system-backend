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
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('quote')
  quote(
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.quote(req.user, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(req.user, dto);
  }

  @Get()
  list(
    @Req() req: Request & { user: JwtPayloadUser },
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.list(req.user, query);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.bookingsService.cancel(id, req.user);
  }
}
