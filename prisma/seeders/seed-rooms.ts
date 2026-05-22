import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { seedHotels } from './hotels.seeder';
import { seedRooms } from './rooms.seeder';

/** Run hotel + room seeders: `npm run seed:rooms` */
config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('[seed:rooms] Running hotel seeder…');
  await seedHotels(prisma);
  console.log('[seed:rooms] Running room seeder…');
  await seedRooms(prisma);
  console.log('[seed:rooms] Done.');
}

main()
  .catch((e) => {
    console.error('[seed:rooms] Failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
