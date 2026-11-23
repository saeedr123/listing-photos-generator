-- 0006: RateLimitHit table.
-- Rate limits were counted in one process's memory. Hosting with many
-- copies of the app (Vercel) needs a shared count, kept here. Generated
-- with prisma migrate diff. New table only, nothing renamed.

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitHit_key_at_idx" ON "RateLimitHit"("key", "at");

