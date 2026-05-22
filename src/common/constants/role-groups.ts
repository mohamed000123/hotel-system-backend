import { Role } from '@prisma/client';

/** Roles that may manage the hotel catalog (use on hotel mutation endpoints). */
export const ORG_ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

/** Roles that may provision and manage Admin accounts. */
export const ADMIN_PROVISIONER_ROLES: Role[] = [Role.SUPER_ADMIN];

/** Roles that may provision and manage Hotel Manager accounts. */
export const MANAGER_PROVISIONER_ROLES: Role[] = [Role.ADMIN];

/** Roles that may list and manage room inventory (assigned hotel only). */
export const ROOM_INVENTORY_ROLES: Role[] = [Role.HOTEL_MANAGER];
