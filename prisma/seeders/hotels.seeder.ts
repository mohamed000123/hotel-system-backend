import { HotelStatus, PrismaClient } from '@prisma/client';

export interface SeedHotelInput {
  id: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  status: HotelStatus;
  timezone: string;
}

/** Stable IDs so re-running the seeder upserts instead of duplicating rows. */
export const SEED_HOTELS: SeedHotelInput[] = [
  {
    id: 'a1000001-0001-4001-8001-000000000001',
    name: 'Grand Plaza Hotel',
    city: 'New York',
    address: '123 Broadway, New York, NY 10001',
    stars: 5,
    status: HotelStatus.ACTIVE,
    timezone: 'America/New_York',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000002',
    name: 'Harbor View Inn',
    city: 'Boston',
    address: '45 Atlantic Ave, Boston, MA 02110',
    stars: 4,
    status: HotelStatus.ACTIVE,
    timezone: 'America/New_York',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000003',
    name: 'Lakeside Retreat',
    city: 'Chicago',
    address: '200 Michigan Ave, Chicago, IL 60601',
    stars: 4,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Chicago',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000004',
    name: 'Sunset Boulevard Suites',
    city: 'Los Angeles',
    address: '8900 Sunset Blvd, Los Angeles, CA 90069',
    stars: 5,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000005',
    name: 'Pacific Pearl Resort',
    city: 'San Francisco',
    address: '1 Fishermans Wharf, San Francisco, CA 94133',
    stars: 5,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000006',
    name: 'Desert Oasis Lodge',
    city: 'Phoenix',
    address: '500 Camelback Rd, Phoenix, AZ 85016',
    stars: 3,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Phoenix',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000007',
    name: 'Riverwalk Boutique',
    city: 'San Antonio',
    address: '300 E River Walk, San Antonio, TX 78205',
    stars: 4,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Chicago',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000008',
    name: 'Capital City Hotel',
    city: 'Washington',
    address: '1600 Pennsylvania Ave NW, Washington, DC 20500',
    stars: 4,
    status: HotelStatus.ACTIVE,
    timezone: 'America/New_York',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000009',
    name: 'Mountain Crest Inn',
    city: 'Denver',
    address: '77 Larimer St, Denver, CO 80202',
    stars: 3,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Denver',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000010',
    name: 'Old Town Guesthouse',
    city: 'Seattle',
    address: '12 Pike St, Seattle, WA 98101',
    stars: 2,
    status: HotelStatus.INACTIVE,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000011',
    name: 'Garden District Hotel',
    city: 'New Orleans',
    address: '2200 St Charles Ave, New Orleans, LA 70130',
    stars: 4,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Chicago',
  },
  {
    id: 'a1000001-0001-4001-8001-000000000012',
    name: 'Beacon Hill Lodge',
    city: 'Portland',
    address: '88 NW Everett St, Portland, OR 97209',
    stars: 3,
    status: HotelStatus.ACTIVE,
    timezone: 'America/Los_Angeles',
  },
];

/**
 * Upserts 12 demo hotels (11 active, 1 inactive for catalog and pagination testing).
 */
export async function seedHotels(prisma: PrismaClient): Promise<void> {
  for (const hotel of SEED_HOTELS) {
    await prisma.hotel.upsert({
      where: { id: hotel.id },
      update: {
        name: hotel.name,
        city: hotel.city,
        address: hotel.address,
        stars: hotel.stars,
        status: hotel.status,
        timezone: hotel.timezone,
      },
      create: hotel,
    });
  }

  const active = SEED_HOTELS.filter((h) => h.status === HotelStatus.ACTIVE).length;
  const inactive = SEED_HOTELS.length - active;
  console.log(
    `[seed] Hotels ready: ${SEED_HOTELS.length} total (${active} active, ${inactive} inactive)`,
  );
}
