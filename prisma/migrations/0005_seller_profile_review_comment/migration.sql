-- 0005: SellerProfile and ReviewComment tables.
-- Seller profiles and review comments lived only in the browser demo
-- store. These tables let the server keep them. Generated with prisma
-- migrate diff. New tables only, nothing renamed.

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "edition" TEXT NOT NULL,
    "values_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" UUID NOT NULL,
    "share_link_id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "author_label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_user_id_key" ON "SellerProfile"("user_id");

-- CreateIndex
CREATE INDEX "ReviewComment_listing_pack_id_idx" ON "ReviewComment"("listing_pack_id");

-- CreateIndex
CREATE INDEX "ReviewComment_share_link_id_idx" ON "ReviewComment"("share_link_id");

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_share_link_id_fkey" FOREIGN KEY ("share_link_id") REFERENCES "ShareLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

