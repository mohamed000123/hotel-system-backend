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

## Seeders (Super Admin)

Seed scripts live in `prisma/seeders/`:

| File | Purpose |
|------|---------|
| `seeders/super-admin.seeder.ts` | Upsert Super Admin from `.env` |
| `seeders/index.ts` | Runs all seeders |
| `seed.ts` | Prisma entry point (loads `backend/.env`) |

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

This creates/updates the Super Admin. Login at `/login` with those credentials.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Connection refused | Start PostgreSQL; verify `DATABASE_URL` in `.env` |
| Migration drift | Run `npx prisma migrate reset` (dev only — wipes data) |
| Client out of date | Run `npm run prisma:generate` |
