import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';

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
  guestCount!: number;
}
