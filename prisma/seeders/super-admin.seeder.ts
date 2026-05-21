import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Creates or updates the Super Admin from backend/.env:
 *   SEED_SUPER_ADMIN_EMAIL
 *   SEED_SUPER_ADMIN_PASSWORD
 */
export async function seedSuperAdmin(prisma: PrismaClient): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing Super Admin seed credentials. Add SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD to backend/.env',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.SUPER_ADMIN,
      hotelId: null,
    },
    create: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      hotelId: null,
    },
  });

  console.log(`[seed] Super Admin ready: ${user.email} (role: ${user.role})`);
}
