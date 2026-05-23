-- Persist refresh token rotation state on users
ALTER TABLE "user"
ADD COLUMN "refreshTokenHash" TEXT,
ADD COLUMN "refreshTokenId" TEXT,
ADD COLUMN "refreshTokenIssuedAt" TIMESTAMP(3);
