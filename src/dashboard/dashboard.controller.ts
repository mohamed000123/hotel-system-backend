import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { DASHBOARD_ROLES } from '../common/constants/role-groups';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(...DASHBOARD_ROLES)
  getStats(@Req() req: Request & { user: JwtPayloadUser }) {
    return this.dashboardService.getStats(req.user);
  }
}
