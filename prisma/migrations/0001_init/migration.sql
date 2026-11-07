-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "edition" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT,
    "provider_email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "soft_deleted_at" TIMESTAMPTZ(6),
    "hard_deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "edition" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "price_amount_minor" INTEGER,
    "price_currency" TEXT,
    "description_seller" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSourceFile" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "page_count" INTEGER,
    "colour_profile" TEXT,
    "source_kind" TEXT NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ProductSourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVerifiedFact" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "fact_key" TEXT NOT NULL,
    "fact_value_text" TEXT NOT NULL,
    "fact_value_number" DECIMAL(20,6),
    "source_file_id" UUID,
    "verified_by_user_id" UUID NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "verification_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProductVerifiedFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRender" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "source_file_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "dpi_value" INTEGER,
    "fit_mode" TEXT NOT NULL DEFAULT 'contain',
    "crop_approved" BOOLEAN NOT NULL DEFAULT false,
    "crop_approved_by_user_id" UUID,
    "crop_approved_at" TIMESTAMPTZ(6),
    "colour_changed" BOOLEAN NOT NULL DEFAULT false,
    "quality_gate_status" TEXT NOT NULL,
    "quality_gate_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPack" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "niche_pack_id" UUID,
    "niche_pack_version_id" UUID,
    "template_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "language" TEXT NOT NULL DEFAULT 'en',
    "edition" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ListingPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPackImage" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "template_version_id" UUID,
    "mockup_version_id" UUID,
    "product_render_id" UUID,
    "position" INTEGER NOT NULL,
    "image_role" TEXT NOT NULL,
    "storage_key" TEXT,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "shortest_side_px" INTEGER,
    "orientation" TEXT,
    "fit_warning" TEXT,
    "quality_gate_status" TEXT NOT NULL,
    "quality_gate_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ListingPackImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPackCopy" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "copy_prompt_version_id" UUID NOT NULL,
    "title_text" TEXT,
    "title_char_count" INTEGER,
    "description_text" TEXT,
    "tags_text" JSONB,
    "keywords_text" TEXT,
    "checklist_text" JSONB,
    "generation_status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ListingPackCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPackCopyVersion" (
    "id" UUID NOT NULL,
    "listing_pack_copy_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPackCopyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationCheck" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ(6) NOT NULL,
    "checked_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationCheckItem" (
    "id" UUID NOT NULL,
    "reconciliation_check_id" UUID NOT NULL,
    "fact_key" TEXT NOT NULL,
    "expected_value_text" TEXT NOT NULL,
    "generated_value_text" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "override_reason" TEXT,
    "override_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "is_digital_supported" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPack" (
    "id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlatformPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPackVersion" (
    "id" UUID NOT NULL,
    "platform_pack_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "definition_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlatformPackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRule" (
    "id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID,
    "rule_key" TEXT NOT NULL,
    "rule_value_text" TEXT NOT NULL,
    "rule_value_number" DECIMAL(20,6),
    "verification_status" TEXT NOT NULL,
    "source_url" TEXT,
    "check_date" DATE NOT NULL,
    "source_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlatformRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "definition_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyPrompt" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt_purpose" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "CopyPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyPromptVersion" (
    "id" UUID NOT NULL,
    "copy_prompt_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "model_settings_json" JSONB,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CopyPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NichePack" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "NichePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NichePackVersion" (
    "id" UUID NOT NULL,
    "niche_pack_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "definition_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NichePackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NichePackTemplate" (
    "id" UUID NOT NULL,
    "niche_pack_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NichePackTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NichePackMockup" (
    "id" UUID NOT NULL,
    "niche_pack_id" UUID NOT NULL,
    "mockup_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NichePackMockup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mockup" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mockup_kind" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "Mockup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockupVersion" (
    "id" UUID NOT NULL,
    "mockup_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "frame_storage_key" TEXT NOT NULL,
    "frame_width_px" INTEGER NOT NULL,
    "frame_height_px" INTEGER NOT NULL,
    "screen_area_json" JSONB NOT NULL,
    "allowed_orientations_json" JSONB NOT NULL,
    "background" TEXT,
    "warp_required" BOOLEAN NOT NULL DEFAULT false,
    "warp_note" TEXT,
    "crisp_test_status" TEXT NOT NULL,
    "crisp_test_note" TEXT,
    "preview_render_storage_key" TEXT,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "licence_source" TEXT,
    "licence_type" TEXT,
    "licence_date" DATE,
    "licence_storage_location" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MockupVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "export_kind" TEXT NOT NULL,
    "file_format" TEXT NOT NULL,
    "shortest_side_px" INTEGER NOT NULL,
    "storage_key" TEXT,
    "file_size_bytes" INTEGER,
    "image_count" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "reconciliation_check_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportEvent" (
    "id" UUID NOT NULL,
    "export_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,

    CONSTRAINT "ExportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" UUID NOT NULL,
    "export_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "pack_version_id" UUID NOT NULL,
    "template_id" UUID,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" UUID NOT NULL,
    "listing_pack_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform_id" UUID,
    "pack_version_id" UUID,
    "token_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deactivated_at" TIMESTAMPTZ(6),

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_amount_minor" INTEGER,
    "price_currency" TEXT,
    "billing_interval" TEXT,
    "tax_treatment" TEXT,
    "entitlements_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntitlement" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "entitlement_key" TEXT NOT NULL,
    "limit_value_text" TEXT,
    "limit_value_number" DECIMAL(20,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntitlement" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entitlement_key" TEXT NOT NULL,
    "limit_value_text" TEXT,
    "limit_value_number" DECIMAL(20,6),
    "granted_by_user_id" UUID NOT NULL,
    "granted_reason" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "payment_provider" TEXT,
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL,
    "requires_card" BOOLEAN NOT NULL DEFAULT false,
    "ai_credit_allowance" INTEGER,
    "export_allowance" INTEGER,
    "listing_pack_allowance" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICreditLedger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "credits_granted" INTEGER NOT NULL DEFAULT 0,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AICreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "listing_pack_id" UUID,
    "platform_id" UUID,
    "pack_version_id" UUID,
    "copy_prompt_version_id" UUID,
    "operation" TEXT NOT NULL,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageDailyCount" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_date" DATE NOT NULL,
    "event_type" TEXT NOT NULL,
    "platform_id" UUID,
    "pack_version_id" UUID,
    "count_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UsageDailyCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context_json" JSONB,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "platform_id" UUID,
    "pack_version_id" UUID,
    "reason" TEXT,
    "detail_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "plan_scope" TEXT NOT NULL,
    "platform_id" UUID,
    "pack_version_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_edition_idx" ON "User"("edition");

-- CreateIndex
CREATE INDEX "User_deleted_at_idx" ON "User"("deleted_at");

-- CreateIndex
CREATE INDEX "AuthIdentity_user_id_idx" ON "AuthIdentity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_provider_user_id_key" ON "AuthIdentity"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_hash_key" ON "Session"("session_token_hash");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_expires_at_idx" ON "Session"("expires_at");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_user_id_idx" ON "AccountDeletionRequest"("user_id");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_idx" ON "AccountDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "Product_user_id_idx" ON "Product"("user_id");

-- CreateIndex
CREATE INDEX "Product_user_id_status_idx" ON "Product"("user_id", "status");

-- CreateIndex
CREATE INDEX "Product_deleted_at_idx" ON "Product"("deleted_at");

-- CreateIndex
CREATE INDEX "ProductSourceFile_product_id_idx" ON "ProductSourceFile"("product_id");

-- CreateIndex
CREATE INDEX "ProductSourceFile_product_id_source_kind_idx" ON "ProductSourceFile"("product_id", "source_kind");

-- CreateIndex
CREATE INDEX "ProductVerifiedFact_product_id_idx" ON "ProductVerifiedFact"("product_id");

-- CreateIndex
CREATE INDEX "ProductRender_product_id_idx" ON "ProductRender"("product_id");

-- CreateIndex
CREATE INDEX "ProductRender_source_file_id_idx" ON "ProductRender"("source_file_id");

-- CreateIndex
CREATE INDEX "ProductRender_quality_gate_status_idx" ON "ProductRender"("quality_gate_status");

-- CreateIndex
CREATE INDEX "ListingPack_user_id_idx" ON "ListingPack"("user_id");

-- CreateIndex
CREATE INDEX "ListingPack_product_id_idx" ON "ListingPack"("product_id");

-- CreateIndex
CREATE INDEX "ListingPack_product_id_platform_id_pack_version_id_idx" ON "ListingPack"("product_id", "platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "ListingPack_platform_id_pack_version_id_idx" ON "ListingPack"("platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "ListingPack_status_idx" ON "ListingPack"("status");

-- CreateIndex
CREATE INDEX "ListingPackImage_listing_pack_id_idx" ON "ListingPackImage"("listing_pack_id");

-- CreateIndex
CREATE INDEX "ListingPackImage_platform_id_pack_version_id_idx" ON "ListingPackImage"("platform_id", "pack_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPackImage_listing_pack_id_position_key" ON "ListingPackImage"("listing_pack_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPackCopy_listing_pack_id_key" ON "ListingPackCopy"("listing_pack_id");

-- CreateIndex
CREATE INDEX "ListingPackCopy_platform_id_pack_version_id_idx" ON "ListingPackCopy"("platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "ListingPackCopy_copy_prompt_version_id_idx" ON "ListingPackCopy"("copy_prompt_version_id");

-- CreateIndex
CREATE INDEX "ListingPackCopyVersion_listing_pack_copy_id_idx" ON "ListingPackCopyVersion"("listing_pack_copy_id");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPackCopyVersion_listing_pack_copy_id_version_number_key" ON "ListingPackCopyVersion"("listing_pack_copy_id", "version_number");

-- CreateIndex
CREATE INDEX "ReconciliationCheck_listing_pack_id_idx" ON "ReconciliationCheck"("listing_pack_id");

-- CreateIndex
CREATE INDEX "ReconciliationCheck_listing_pack_id_checked_at_idx" ON "ReconciliationCheck"("listing_pack_id", "checked_at");

-- CreateIndex
CREATE INDEX "ReconciliationCheck_status_idx" ON "ReconciliationCheck"("status");

-- CreateIndex
CREATE INDEX "ReconciliationCheckItem_reconciliation_check_id_idx" ON "ReconciliationCheckItem"("reconciliation_check_id");

-- CreateIndex
CREATE INDEX "ReconciliationCheckItem_fact_key_result_idx" ON "ReconciliationCheckItem"("fact_key", "result");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_slug_key" ON "Platform"("slug");

-- CreateIndex
CREATE INDEX "Platform_status_idx" ON "Platform"("status");

-- CreateIndex
CREATE INDEX "PlatformPack_platform_id_idx" ON "PlatformPack"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPack_platform_id_slug_key" ON "PlatformPack"("platform_id", "slug");

-- CreateIndex
CREATE INDEX "PlatformPackVersion_platform_id_idx" ON "PlatformPackVersion"("platform_id");

-- CreateIndex
CREATE INDEX "PlatformPackVersion_status_idx" ON "PlatformPackVersion"("status");

-- CreateIndex
CREATE INDEX "PlatformPackVersion_published_at_idx" ON "PlatformPackVersion"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPackVersion_platform_pack_id_version_number_key" ON "PlatformPackVersion"("platform_pack_id", "version_number");

-- CreateIndex
CREATE INDEX "PlatformRule_platform_id_idx" ON "PlatformRule"("platform_id");

-- CreateIndex
CREATE INDEX "PlatformRule_platform_id_rule_key_idx" ON "PlatformRule"("platform_id", "rule_key");

-- CreateIndex
CREATE INDEX "PlatformRule_verification_status_idx" ON "PlatformRule"("verification_status");

-- CreateIndex
CREATE INDEX "PlatformRule_check_date_idx" ON "PlatformRule"("check_date");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_template_role_idx" ON "Template"("template_role");

-- CreateIndex
CREATE INDEX "Template_is_active_idx" ON "Template"("is_active");

-- CreateIndex
CREATE INDEX "TemplateVersion_status_idx" ON "TemplateVersion"("status");

-- CreateIndex
CREATE INDEX "TemplateVersion_published_at_idx" ON "TemplateVersion"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_template_id_version_number_key" ON "TemplateVersion"("template_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "CopyPrompt_slug_key" ON "CopyPrompt"("slug");

-- CreateIndex
CREATE INDEX "CopyPrompt_prompt_purpose_idx" ON "CopyPrompt"("prompt_purpose");

-- CreateIndex
CREATE INDEX "CopyPromptVersion_status_idx" ON "CopyPromptVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CopyPromptVersion_copy_prompt_id_version_number_key" ON "CopyPromptVersion"("copy_prompt_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "NichePack_slug_key" ON "NichePack"("slug");

-- CreateIndex
CREATE INDEX "NichePack_status_idx" ON "NichePack"("status");

-- CreateIndex
CREATE INDEX "NichePackVersion_status_idx" ON "NichePackVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NichePackVersion_niche_pack_id_version_number_key" ON "NichePackVersion"("niche_pack_id", "version_number");

-- CreateIndex
CREATE INDEX "NichePackTemplate_niche_pack_id_sort_order_idx" ON "NichePackTemplate"("niche_pack_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "NichePackTemplate_niche_pack_id_template_id_key" ON "NichePackTemplate"("niche_pack_id", "template_id");

-- CreateIndex
CREATE INDEX "NichePackMockup_niche_pack_id_sort_order_idx" ON "NichePackMockup"("niche_pack_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "NichePackMockup_niche_pack_id_mockup_id_key" ON "NichePackMockup"("niche_pack_id", "mockup_id");

-- CreateIndex
CREATE UNIQUE INDEX "Mockup_slug_key" ON "Mockup"("slug");

-- CreateIndex
CREATE INDEX "Mockup_mockup_kind_idx" ON "Mockup"("mockup_kind");

-- CreateIndex
CREATE INDEX "Mockup_is_active_is_hidden_idx" ON "Mockup"("is_active", "is_hidden");

-- CreateIndex
CREATE INDEX "MockupVersion_status_idx" ON "MockupVersion"("status");

-- CreateIndex
CREATE INDEX "MockupVersion_crisp_test_status_idx" ON "MockupVersion"("crisp_test_status");

-- CreateIndex
CREATE UNIQUE INDEX "MockupVersion_mockup_id_version_number_key" ON "MockupVersion"("mockup_id", "version_number");

-- CreateIndex
CREATE INDEX "Export_listing_pack_id_idx" ON "Export"("listing_pack_id");

-- CreateIndex
CREATE INDEX "Export_user_id_idx" ON "Export"("user_id");

-- CreateIndex
CREATE INDEX "Export_platform_id_pack_version_id_idx" ON "Export"("platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "Export_status_idx" ON "Export"("status");

-- CreateIndex
CREATE INDEX "Export_created_at_idx" ON "Export"("created_at");

-- CreateIndex
CREATE INDEX "ExportEvent_export_id_idx" ON "ExportEvent"("export_id");

-- CreateIndex
CREATE INDEX "ExportEvent_export_id_created_at_idx" ON "ExportEvent"("export_id", "created_at");

-- CreateIndex
CREATE INDEX "ExportEvent_event_type_idx" ON "ExportEvent"("event_type");

-- CreateIndex
CREATE INDEX "ExportLog_export_id_idx" ON "ExportLog"("export_id");

-- CreateIndex
CREATE INDEX "ExportLog_platform_id_pack_version_id_idx" ON "ExportLog"("platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "ExportLog_created_at_idx" ON "ExportLog"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_hash_key" ON "ShareLink"("token_hash");

-- CreateIndex
CREATE INDEX "ShareLink_listing_pack_id_idx" ON "ShareLink"("listing_pack_id");

-- CreateIndex
CREATE INDEX "ShareLink_user_id_idx" ON "ShareLink"("user_id");

-- CreateIndex
CREATE INDEX "ShareLink_is_active_expires_at_idx" ON "ShareLink"("is_active", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX "Plan_is_active_idx" ON "Plan"("is_active");

-- CreateIndex
CREATE INDEX "PlanEntitlement_plan_id_idx" ON "PlanEntitlement"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEntitlement_plan_id_entitlement_key_key" ON "PlanEntitlement"("plan_id", "entitlement_key");

-- CreateIndex
CREATE INDEX "UserEntitlement_user_id_idx" ON "UserEntitlement"("user_id");

-- CreateIndex
CREATE INDEX "UserEntitlement_user_id_entitlement_key_idx" ON "UserEntitlement"("user_id", "entitlement_key");

-- CreateIndex
CREATE INDEX "UserEntitlement_is_active_expires_at_idx" ON "UserEntitlement"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "Subscription_user_id_idx" ON "Subscription"("user_id");

-- CreateIndex
CREATE INDEX "Subscription_user_id_status_idx" ON "Subscription"("user_id", "status");

-- CreateIndex
CREATE INDEX "Subscription_plan_id_idx" ON "Subscription"("plan_id");

-- CreateIndex
CREATE INDEX "Subscription_provider_subscription_id_idx" ON "Subscription"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "Trial_user_id_idx" ON "Trial"("user_id");

-- CreateIndex
CREATE INDEX "Trial_user_id_status_idx" ON "Trial"("user_id", "status");

-- CreateIndex
CREATE INDEX "Trial_ends_at_idx" ON "Trial"("ends_at");

-- CreateIndex
CREATE INDEX "AICreditLedger_user_id_idx" ON "AICreditLedger"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AICreditLedger_user_id_period_start_period_end_key" ON "AICreditLedger"("user_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "AIUsageLog_user_id_idx" ON "AIUsageLog"("user_id");

-- CreateIndex
CREATE INDEX "AIUsageLog_listing_pack_id_idx" ON "AIUsageLog"("listing_pack_id");

-- CreateIndex
CREATE INDEX "AIUsageLog_created_at_idx" ON "AIUsageLog"("created_at");

-- CreateIndex
CREATE INDEX "AIUsageLog_status_idx" ON "AIUsageLog"("status");

-- CreateIndex
CREATE INDEX "UsageDailyCount_event_date_idx" ON "UsageDailyCount"("event_date");

-- CreateIndex
CREATE INDEX "UsageDailyCount_event_type_idx" ON "UsageDailyCount"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDailyCount_user_id_event_date_event_type_platform_id_p_key" ON "UsageDailyCount"("user_id", "event_date", "event_type", "platform_id", "pack_version_id");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_created_at_idx" ON "SystemLog"("created_at");

-- CreateIndex
CREATE INDEX "SystemLog_user_id_idx" ON "SystemLog"("user_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_admin_user_id_idx" ON "AdminAuditLog"("admin_user_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_target_type_target_id_idx" ON "AdminAuditLog"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_platform_id_pack_version_id_idx" ON "AdminAuditLog"("platform_id", "pack_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_is_enabled_idx" ON "FeatureFlag"("is_enabled");

-- CreateIndex
CREATE INDEX "FeatureFlag_plan_scope_idx" ON "FeatureFlag"("plan_scope");

-- CreateIndex
CREATE INDEX "FeatureFlag_platform_id_pack_version_id_idx" ON "FeatureFlag"("platform_id", "pack_version_id");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceFile" ADD CONSTRAINT "ProductSourceFile_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceFile" ADD CONSTRAINT "ProductSourceFile_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVerifiedFact" ADD CONSTRAINT "ProductVerifiedFact_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVerifiedFact" ADD CONSTRAINT "ProductVerifiedFact_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "ProductSourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVerifiedFact" ADD CONSTRAINT "ProductVerifiedFact_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRender" ADD CONSTRAINT "ProductRender_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRender" ADD CONSTRAINT "ProductRender_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "ProductSourceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRender" ADD CONSTRAINT "ProductRender_crop_approved_by_user_id_fkey" FOREIGN KEY ("crop_approved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_niche_pack_id_fkey" FOREIGN KEY ("niche_pack_id") REFERENCES "NichePack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_niche_pack_version_id_fkey" FOREIGN KEY ("niche_pack_version_id") REFERENCES "NichePackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPack" ADD CONSTRAINT "ListingPack_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "TemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_mockup_version_id_fkey" FOREIGN KEY ("mockup_version_id") REFERENCES "MockupVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackImage" ADD CONSTRAINT "ListingPackImage_product_render_id_fkey" FOREIGN KEY ("product_render_id") REFERENCES "ProductRender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopy" ADD CONSTRAINT "ListingPackCopy_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopy" ADD CONSTRAINT "ListingPackCopy_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopy" ADD CONSTRAINT "ListingPackCopy_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopy" ADD CONSTRAINT "ListingPackCopy_copy_prompt_version_id_fkey" FOREIGN KEY ("copy_prompt_version_id") REFERENCES "CopyPromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopyVersion" ADD CONSTRAINT "ListingPackCopyVersion_listing_pack_copy_id_fkey" FOREIGN KEY ("listing_pack_copy_id") REFERENCES "ListingPackCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPackCopyVersion" ADD CONSTRAINT "ListingPackCopyVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationCheck" ADD CONSTRAINT "ReconciliationCheck_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationCheck" ADD CONSTRAINT "ReconciliationCheck_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationCheck" ADD CONSTRAINT "ReconciliationCheck_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationCheckItem" ADD CONSTRAINT "ReconciliationCheckItem_reconciliation_check_id_fkey" FOREIGN KEY ("reconciliation_check_id") REFERENCES "ReconciliationCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationCheckItem" ADD CONSTRAINT "ReconciliationCheckItem_override_by_user_id_fkey" FOREIGN KEY ("override_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPack" ADD CONSTRAINT "PlatformPack_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPackVersion" ADD CONSTRAINT "PlatformPackVersion_platform_pack_id_fkey" FOREIGN KEY ("platform_pack_id") REFERENCES "PlatformPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPackVersion" ADD CONSTRAINT "PlatformPackVersion_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPackVersion" ADD CONSTRAINT "PlatformPackVersion_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPackVersion" ADD CONSTRAINT "PlatformPackVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRule" ADD CONSTRAINT "PlatformRule_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRule" ADD CONSTRAINT "PlatformRule_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyPromptVersion" ADD CONSTRAINT "CopyPromptVersion_copy_prompt_id_fkey" FOREIGN KEY ("copy_prompt_id") REFERENCES "CopyPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyPromptVersion" ADD CONSTRAINT "CopyPromptVersion_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyPromptVersion" ADD CONSTRAINT "CopyPromptVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackVersion" ADD CONSTRAINT "NichePackVersion_niche_pack_id_fkey" FOREIGN KEY ("niche_pack_id") REFERENCES "NichePack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackVersion" ADD CONSTRAINT "NichePackVersion_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackVersion" ADD CONSTRAINT "NichePackVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackTemplate" ADD CONSTRAINT "NichePackTemplate_niche_pack_id_fkey" FOREIGN KEY ("niche_pack_id") REFERENCES "NichePack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackTemplate" ADD CONSTRAINT "NichePackTemplate_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackMockup" ADD CONSTRAINT "NichePackMockup_niche_pack_id_fkey" FOREIGN KEY ("niche_pack_id") REFERENCES "NichePack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NichePackMockup" ADD CONSTRAINT "NichePackMockup_mockup_id_fkey" FOREIGN KEY ("mockup_id") REFERENCES "Mockup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mockup" ADD CONSTRAINT "Mockup_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupVersion" ADD CONSTRAINT "MockupVersion_mockup_id_fkey" FOREIGN KEY ("mockup_id") REFERENCES "Mockup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupVersion" ADD CONSTRAINT "MockupVersion_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupVersion" ADD CONSTRAINT "MockupVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_reconciliation_check_id_fkey" FOREIGN KEY ("reconciliation_check_id") REFERENCES "ReconciliationCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportEvent" ADD CONSTRAINT "ExportEvent_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "Export"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportEvent" ADD CONSTRAINT "ExportEvent_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "Export"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntitlement" ADD CONSTRAINT "UserEntitlement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntitlement" ADD CONSTRAINT "UserEntitlement_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICreditLedger" ADD CONSTRAINT "AICreditLedger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_listing_pack_id_fkey" FOREIGN KEY ("listing_pack_id") REFERENCES "ListingPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_copy_prompt_version_id_fkey" FOREIGN KEY ("copy_prompt_version_id") REFERENCES "CopyPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageDailyCount" ADD CONSTRAINT "UsageDailyCount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageDailyCount" ADD CONSTRAINT "UsageDailyCount_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageDailyCount" ADD CONSTRAINT "UsageDailyCount_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "PlatformPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

