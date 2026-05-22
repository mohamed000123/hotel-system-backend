import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { runSeeders } from './index';

// Load backend/.env (credentials for Super Admin seed live here)
config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  await runSeeders(prisma);
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
