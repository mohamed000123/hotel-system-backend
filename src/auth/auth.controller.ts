import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
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

  @Get('me')
  getMe(@Req() req: Request & { user: JwtPayloadUser }) {
    const { id, email, role, hotelId } = req.user;
    return this.authService.toAuthUser({
      id,
      email,
      role,
      hotelId: hotelId ?? null,
    });
  }
}
