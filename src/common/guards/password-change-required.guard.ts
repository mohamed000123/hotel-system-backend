import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHANGE_KEY } from '../decorators/skip-password-change.decorator';
import { JwtPayloadUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayloadUser }>();
    const user = request.user;
    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'You must change your password before continuing',
      );
    }

    return true;
  }
}
