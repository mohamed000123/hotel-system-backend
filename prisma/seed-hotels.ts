import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { seedHotels } from './seeders/hotels.seeder';

/** Run only the hotel seeder: `npm run seed:hotels` */
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('[seed:hotels] Running hotel seeder…');
  await seedHotels(prisma);
  console.log('[seed:hotels] Done.');
}

main()
  .catch((e) => {
    console.error('[seed:hotels] Failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
