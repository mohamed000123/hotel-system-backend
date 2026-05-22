import { SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHANGE_KEY = 'skipPasswordChange';

/** Allow route when user must change password (e.g. GET /auth/me, POST /auth/change-password). */
export const SkipPasswordChange = () => SetMetadata(SKIP_PASSWORD_CHANGE_KEY, true);
