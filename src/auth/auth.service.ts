import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthUserDto {
  id: string;
  email: string;
  role: Role;
  hotelId: string | null;
  mustChangePassword: boolean;
}

export interface AuthResponseDto {
  user: AuthUserDto;
}

interface RefreshTokenPayload extends JwtPayload {
  tokenId: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: Role.GUEST,
        hotelId: null,
        mustChangePassword: false,
      },
    });

    return { user: this.toAuthUser(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { user: this.toAuthUser(user) };
  }

  async refreshSession(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const refreshSession = user as typeof user & {
      refreshTokenHash?: string | null;
      refreshTokenId?: string | null;
    };
    const storedTokenHash = refreshSession.refreshTokenHash ?? null;
    const storedTokenId = refreshSession.refreshTokenId ?? null;
    const incomingTokenHash = this.hashToken(refreshToken);
    const hashMatches =
      !!storedTokenHash &&
      this.secureEquals(storedTokenHash, incomingTokenHash);
    const tokenIdMatches = !!storedTokenId && storedTokenId === payload.tokenId;
    if (!hashMatches || !tokenIdMatches) {
      // Replay detection: if a rotated/old token is reused, invalidate the session.
      await this.clearRefreshSession(user.id);
      throw new UnauthorizedException('Refresh token replay detected');
    }

    return { user: this.toAuthUser(user) };
  }

  async issueSessionTokens(user: AuthUserDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.buildAccessToken(user);
    const refreshTokenId = randomUUID();
    const refreshToken = this.buildRefreshToken(user, refreshTokenId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenId,
        refreshTokenIssuedAt: new Date(),
      } as any,
    });

    return { accessToken, refreshToken };
  }

  async logoutByRefreshToken(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.clearRefreshSession(payload.sub);
    } catch {
      // Invalid/expired refresh token should still clear client cookies in controller.
    }
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.mustChangePassword) {
      throw new BadRequestException(
        'Password change is not required for this account',
      );
    }

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const sameAsCurrent = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (sameAsCurrent) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return this.toAuthUser(updated);
  }

  toAuthUser(user: {
    id: string;
    email: string;
    role: Role;
    hotelId: string | null;
    mustChangePassword: boolean;
  }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      mustChangePassword: user.mustChangePassword,
    };
  }

  buildAccessToken(user: {
    id: string;
    email: string;
    role: Role;
    hotelId: string | null;
    mustChangePassword: boolean;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    };
    return this.jwtService.sign(payload);
  }

  buildRefreshToken(
    user: {
    id: string;
    email: string;
    role: Role;
    hotelId: string | null;
    },
    tokenId: string,
  ): string {
    const secret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_SECRET');
    const payload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      tokenId,
      type: 'refresh',
    };
    return this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const secret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_SECRET');
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.tokenId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return payload;
  }

  private async clearRefreshSession(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenId: null,
        refreshTokenIssuedAt: null,
      } as any,
    });
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private secureEquals(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }
}
