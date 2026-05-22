import { PrismaClient } from '@prisma/client';
import { seedHotels } from './hotels.seeder';
import { seedRooms } from './rooms.seeder';
import { seedSuperAdmin } from './super-admin.seeder';

export async function runSeeders(prisma: PrismaClient): Promise<void> {
  console.log('[seed] Running database seeders…');
  await seedSuperAdmin(prisma);
  await seedHotels(prisma);
  await seedRooms(prisma);
  console.log('[seed] All seeders finished.');
}
