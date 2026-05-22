import { HotelStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHotelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @IsEnum(HotelStatus)
  status!: HotelStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;
}
