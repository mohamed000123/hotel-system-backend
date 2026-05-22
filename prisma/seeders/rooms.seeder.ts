import { HotelStatus, Prisma, PrismaClient } from '@prisma/client';
import { SEED_HOTELS } from './hotels.seeder';

export interface SeedRoomTemplate {
  roomType: string;
  capacity: number;
  basePricePerNight: number;
}

/** Thirteen distinct room types applied to every seeded hotel. */
export const SEED_ROOM_TEMPLATES: SeedRoomTemplate[] = [
  { roomType: 'Standard Single', capacity: 1, basePricePerNight: 89 },
  { roomType: 'Standard Double', capacity: 2, basePricePerNight: 109 },
  { roomType: 'Economy Twin', capacity: 2, basePricePerNight: 99 },
  { roomType: 'Superior Queen', capacity: 2, basePricePerNight: 139 },
  { roomType: 'Deluxe King', capacity: 2, basePricePerNight: 169 },
  { roomType: 'Junior Suite', capacity: 3, basePricePerNight: 199 },
  { roomType: 'Executive Suite', capacity: 3, basePricePerNight: 249 },
  { roomType: 'Family Room', capacity: 4, basePricePerNight: 219 },
  { roomType: 'Connecting Double', capacity: 4, basePricePerNight: 189 },
  { roomType: 'Accessible Room', capacity: 2, basePricePerNight: 129 },
  { roomType: 'Studio Apartment', capacity: 2, basePricePerNight: 179 },
  { roomType: 'Penthouse Suite', capacity: 4, basePricePerNight: 399 },
  { roomType: 'Presidential Suite', capacity: 6, basePricePerNight: 599 },
];

export interface SeedRoomInput {
  id: string;
  hotelId: string;
  roomType: string;
  capacity: number;
  pricePerNight: Prisma.Decimal;
  isAvailable: boolean;
}

/** Stable UUID: hotel index (0001–0012) + room index (0001–0013). */
export function seedRoomId(hotelIndex: number, roomIndex: number): string {
  const h = String(hotelIndex).padStart(4, '0');
  const r = String(roomIndex).padStart(4, '0');
  return `a1000002-0002-4002-8002-${h}${r}0001`;
}

function priceForHotelStars(basePrice: number, stars: number): Prisma.Decimal {
  const multiplier = 0.7 + stars * 0.1;
  const amount = Math.round(basePrice * multiplier * 100) / 100;
  return new Prisma.Decimal(amount);
}

export function buildSeedRooms(): SeedRoomInput[] {
  const rooms: SeedRoomInput[] = [];

  SEED_HOTELS.forEach((hotel, hotelIdx) => {
    const hotelIndex = hotelIdx + 1;
    SEED_ROOM_TEMPLATES.forEach((template, roomIdx) => {
      const roomIndex = roomIdx + 1;
      rooms.push({
        id: seedRoomId(hotelIndex, roomIndex),
        hotelId: hotel.id,
        roomType: template.roomType,
        capacity: template.capacity,
        pricePerNight: priceForHotelStars(template.basePricePerNight, hotel.stars),
        isAvailable: hotel.status === HotelStatus.ACTIVE,
      });
    });
  });

  return rooms;
}

export const SEED_ROOMS = buildSeedRooms();

/**
 * Upserts 13 rooms per seeded hotel (156 total for 12 hotels).
 * Run after {@link seedHotels}.
 */
export async function seedRooms(prisma: PrismaClient): Promise<void> {
  const hotels = await prisma.hotel.findMany({
    where: { id: { in: SEED_HOTELS.map((h) => h.id) } },
    select: { id: true },
  });
  const hotelIds = new Set(hotels.map((h) => h.id));

  if (hotelIds.size === 0) {
    throw new Error(
      '[seed] No seeded hotels found. Run seedHotels first (npm run seed:hotels or full seed).',
    );
  }

  let upserted = 0;
  for (const room of SEED_ROOMS) {
    if (!hotelIds.has(room.hotelId)) {
      continue;
    }
    await prisma.room.upsert({
      where: { id: room.id },
      update: {
        hotelId: room.hotelId,
        roomType: room.roomType,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        isAvailable: room.isAvailable,
      },
      create: room,
    });
    upserted += 1;
  }

  const perHotel = SEED_ROOM_TEMPLATES.length;
  console.log(
    `[seed] Rooms ready: ${upserted} upserted (${perHotel} types × ${hotelIds.size} hotels)`,
  );
}
