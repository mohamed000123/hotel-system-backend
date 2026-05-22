import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ROOM_CAPACITY_MAX } from '../../rooms/room-limits';

export class CreateBookingDto {
  @IsUUID()
  hotelId!: string;

  @IsUUID()
  roomId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ROOM_CAPACITY_MAX)
  guestCount!: number;
}
