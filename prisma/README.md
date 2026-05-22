# Prisma — Hotel Booking Backend

## Prerequisites

- PostgreSQL running and reachable via `DATABASE_URL` in `backend/.env`

## Commands

From `backend/`:

```powershell
# Generate Prisma Client after schema changes
npm run prisma:generate

# Create and apply migrations (development)
npm run prisma:migrate

# Open Prisma Studio
npx prisma studio
```

## Initial migration

The first migration is `migrations/20260521000000_init/`. Apply it with:

```powershell
npm run prisma:migrate
```

If the database is empty, Prisma will create all tables (`User`, `Hotel`, `Room`, `Booking`, `Payment`).

A follow-up migration adds the `SUPER_ADMIN` role: `migrations/20260521120000_add_super_admin_role/`.

## Seeders

All seed scripts live in `prisma/seeders/`:

| File | Purpose |
|------|---------|
| `seeders/super-admin.seeder.ts` | Upsert Super Admin from `.env` |
| `seeders/hotels.seeder.ts` | Upsert demo hotels |
| `seeders/rooms.seeder.ts` | Upsert demo rooms (requires hotels) |
| `seeders/index.ts` | Orchestrates all seeders (`runSeeders`) |
| `seeders/seed.ts` | Prisma entry point — full seed (`npm run seed`) |
| `seeders/seed-hotels.ts` | Hotels only (`npm run seed:hotels`) |
| `seeders/seed-rooms.ts` | Hotels + rooms (`npm run seed:rooms`) |

Add to `backend/.env`:

```env
SEED_SUPER_ADMIN_EMAIL="superadmin@example.com"
SEED_SUPER_ADMIN_PASSWORD="change-me-super-admin"
```

Run after migrations:

```powershell
npm run seed
# or: npm run prisma:seed
```

This runs Super Admin, hotels, and rooms. Login at `/login` with the Super Admin credentials.

### Partial seeds

```powershell
npm run seed:hotels   # hotels only
npm run seed:rooms    # hotels + rooms
```

Re-running is safe: seed data uses fixed IDs and upserts instead of duplicating rows.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Connection refused | Start PostgreSQL; verify `DATABASE_URL` in `.env` |
| Migration drift | Run `npx prisma migrate reset` (dev only — wipes data) |
| Client out of date | Run `npm run prisma:generate` |
