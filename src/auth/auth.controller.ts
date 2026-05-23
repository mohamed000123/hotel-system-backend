import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SkipPasswordChange } from '../common/decorators/skip-password-change.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayloadUser } from '../common/interfaces/jwt-payload.interface';
import { AuthService, AuthUserDto } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_EXPIRES_IN = '15m';

@Controller('auth')
export class AuthController {
  private readonly accessTokenCookieName: string;
  private readonly refreshTokenCookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenCookieName =
      this.configService.get<string>('AUTH_ACCESS_COOKIE_NAME') ??
      this.configService.get<string>('AUTH_COOKIE_NAME', 'access_token');
    this.refreshTokenCookieName = this.configService.get<string>(
      'AUTH_REFRESH_COOKIE_NAME',
      'refresh_token',
    );
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const authResponse = await this.authService.register(dto);
    await this.issueAuthCookies(res, authResponse.user);
    return authResponse;
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const authResponse = await this.authService.login(dto);
    await this.issueAuthCookies(res, authResponse.user);
    return authResponse;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[this.refreshTokenCookieName] as
      | string
      | undefined;
    if (!refreshToken) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      const authResponse = await this.authService.refreshSession(refreshToken);
      await this.issueAuthCookies(res, authResponse.user);
      return authResponse;
    } catch {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[this.refreshTokenCookieName] as
      | string
      | undefined;
    await this.authService.logoutByRefreshToken(refreshToken);
    this.clearAuthCookies(res);
    return { success: true };
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

  private async issueAuthCookies(
    res: Response,
    user: AuthUserDto,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.issueSessionTokens(user);
    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);
  }

  private setAccessTokenCookie(res: Response, token: string) {
    const secure = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = this.parseDurationToMs(ACCESS_TOKEN_EXPIRES_IN);
    res.cookie(this.accessTokenCookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      ...(maxAge !== null ? { maxAge } : {}),
    });
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const secure = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = this.parseDurationToMs(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    res.cookie(this.refreshTokenCookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      ...(maxAge !== null ? { maxAge } : {}),
    });
  }

  private clearAuthCookies(res: Response) {
    const secure = this.configService.get<string>('NODE_ENV') === 'production';
    res.clearCookie(this.accessTokenCookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie(this.refreshTokenCookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }

  private parseDurationToMs(value: string): number | null {
    const normalized = value.trim();
    const match = /^(\d+)([smhd])$/.exec(normalized);
    if (!match) {
      return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if (Number.isNaN(amount) || amount <= 0) {
      return null;
    }

    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return amount * multipliers[unit];
  }
}
