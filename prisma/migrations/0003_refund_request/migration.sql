-- Migration 0003: add the RefundRequest table (refund requests pending admin review).
-- Generated 2026-11-11 with: prisma migrate diff --from-schema-datamodel
-- <committed schema at HEAD> --to-schema-datamodel prisma/schema.prisma
-- --script. Generated from the schema, not hand written. The repo has no
-- migration_lock.toml, so --from-migrations does not work here; the
-- from-schema form above is the reproducible equivalent. Re-running it
-- produces identical output. Not applied to any database yet.
-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_admin_review',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "policy_text" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefundRequest_user_id_idx" ON "RefundRequest"("user_id");

-- CreateIndex
CREATE INDEX "RefundRequest_requested_at_idx" ON "RefundRequest"("requested_at");

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

