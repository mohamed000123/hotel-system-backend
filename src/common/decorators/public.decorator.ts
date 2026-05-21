import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Routes that skip JWT authentication (used until auth module adds its own public routes). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
