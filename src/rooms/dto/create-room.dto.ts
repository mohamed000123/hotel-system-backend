import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import {
  ROOM_CAPACITY_MAX,
  ROOM_CAPACITY_MIN,
  ROOM_PRICE_MAX,
  ROOM_PRICE_MIN,
} from '../room-limits';
import { ROOM_TYPE_OPTIONS } from '../room-types';

export class CreateRoomDto {
  @IsIn(ROOM_TYPE_OPTIONS)
  roomType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(ROOM_CAPACITY_MIN)
  @Max(ROOM_CAPACITY_MAX)
  capacity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(ROOM_PRICE_MIN)
  @Max(ROOM_PRICE_MAX)
  pricePerNight!: number;

  @IsBoolean()
  isAvailable!: boolean;
}
