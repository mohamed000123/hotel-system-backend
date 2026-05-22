import { Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { PaymentsService } from './payments.service';

@Controller('bookings')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  pay(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayloadUser },
  ) {
    return this.paymentsService.pay(id, req.user);
  }
}
