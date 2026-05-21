import { PrismaClient } from '@prisma/client';
import { seedSuperAdmin } from './super-admin.seeder';

export async function runSeeders(prisma: PrismaClient): Promise<void> {
  console.log('[seed] Running database seeders…');
  await seedSuperAdmin(prisma);
  console.log('[seed] All seeders finished.');
}
