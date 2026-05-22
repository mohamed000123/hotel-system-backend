import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SEED_HOTELS } from './hotels.seeder';

const DEMO_PASSWORD_ENV = 'SEED_DEMO_PASSWORD';
const DEFAULT_DEMO_PASSWORD = 'DemoPass123!';

export interface DemoUserSeed {
  email: string;
  role: Role;
  hotelId: string | null;
}

/** Stable demo accounts for quickstart smoke tests (upserted on every seed). */
export const SEED_DEMO_USERS: DemoUserSeed[] = [
  { email: 'admin@demo.local', role: Role.ADMIN, hotelId: null },
  {
    email: 'manager@demo.local',
    role: Role.HOTEL_MANAGER,
    hotelId: SEED_HOTELS[0].id,
  },
  { email: 'guest@demo.local', role: Role.GUEST, hotelId: null },
];

/**
 * Upserts demo Admin, Hotel Manager (Grand Plaza), and Guest.
 * Password: SEED_DEMO_PASSWORD in backend/.env, or {@link DEFAULT_DEMO_PASSWORD}.
 */
export async function seedDemoUsers(prisma: PrismaClient): Promise<void> {
  const password = process.env[DEMO_PASSWORD_ENV]?.trim() || DEFAULT_DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  for (const demo of SEED_DEMO_USERS) {
    if (demo.role === Role.HOTEL_MANAGER && demo.hotelId) {
      const hotel = await prisma.hotel.findUnique({ where: { id: demo.hotelId } });
      if (!hotel) {
        throw new Error(
          `[seed] Demo manager hotel ${demo.hotelId} not found. Run seedHotels first.`,
        );
      }
    }

    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        passwordHash,
        role: demo.role,
        hotelId: demo.hotelId,
      },
      create: {
        email: demo.email,
        passwordHash,
        role: demo.role,
        hotelId: demo.hotelId,
      },
    });

    console.log(`[seed] Demo user ready: ${user.email} (role: ${user.role})`);
  }

  console.log(
    `[seed] Demo login password: set ${DEMO_PASSWORD_ENV} in backend/.env or use default documented in quickstart`,
  );
}
