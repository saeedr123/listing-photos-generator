-- Migration 0002: add the PackVersion table (pack level snapshot).
-- Generated 2026-11-10 with: prisma migrate diff --from-schema-datamodel
-- <committed schema at HEAD> --to-schema-datamodel prisma/schema.prisma
-- --script. Generated from the schema, not hand written. The repo has no
-- migration_lock.toml, so --from-migrations does not work here; the
-- from-schema form above is the reproducible equivalent. Re-running it
-- produces identical output. Not applied to any database yet.
-- CreateTable
CREATE TABLE "PackVersion" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "change_note" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackVersion_listing_pack_id_idx" ON "PackVersion"("listing_pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackVersion_listing_pack_id_version_number_key" ON "PackVersion"("listing_pack_id", "version_number");

-- AddForeignKey
ALTER TABLE "PackVersion" ADD CONSTRAINT "PackVersion_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVersion" ADD CONSTRAINT "PackVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

