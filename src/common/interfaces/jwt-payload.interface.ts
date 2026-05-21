import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  hotelId?: string | null;
}

export interface JwtPayloadUser {
  id: string;
  email: string;
  role: Role;
  hotelId?: string | null;
}
