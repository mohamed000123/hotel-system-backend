import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SkipPasswordChange } from '../common/decorators/skip-password-change.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @SkipPasswordChange()
  @Get('me')
  getMe(@Req() req: Request & { user: JwtPayloadUser }) {
    return this.authService.getProfile(req.user.id);
  }

  @SkipPasswordChange()
  @Post('change-password')
  changePassword(
    @Req() req: Request & { user: JwtPayloadUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
