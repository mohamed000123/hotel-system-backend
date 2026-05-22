import { Module } from '@nestjs/common';
import { HotelsModule } from '../hotels/hotels.module';
import { HotelRoomsController } from './hotel-rooms.controller';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [HotelsModule],
  controllers: [HotelRoomsController, RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
