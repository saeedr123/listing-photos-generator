-- 0004: ListingPackCopy.copy_prompt_version_id becomes optional.
-- Seller written copy has no AI prompt version. The pack store already
-- writes null for that case ("null means no prompt version was used"),
-- but the column was NOT NULL, so every save of seller copy failed on a
-- real database. Found by the first integration test against Postgres 16,
-- 2026-11-18. Generated with prisma migrate diff. No data is renamed.

-- DropForeignKey
ALTER TABLE "ListingPackCopy" DROP CONSTRAINT "ListingPackCopy_copy_prompt_version_id_fkey";

-- AlterTable
ALTER TABLE "ListingPackCopy" ALTER COLUMN "copy_prompt_version_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ListingPackCopy" ADD CONSTRAINT "ListingPackCopy_copy_prompt_version_id_fkey" FOREIGN KEY ("copy_prompt_version_id") REFERENCES "CopyPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

