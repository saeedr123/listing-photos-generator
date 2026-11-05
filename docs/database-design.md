# Database Design, Listing Photos Generator

Date: 2026-11-05
Status: Phase 1 design only. No migration. No SQL to run. No live database is claimed.
Scope: v1 is Etsy only, digital products only. eBay is second, Amazon is third and Phase 2. Later platforms stay in backlog only. Each later platform is a new platform pack, not a rebuild.
Source rules: ~/workspace/listing-studio/docs/platform-rules.md, check date 2026-11-05, with 23 unverified items. Do not build generator logic on an unverified rule. A rule stored here must carry its verification status, its source URL, and its check date.
Pattern source: ~/workspace/global-career-studio/docs/database-design.md, read for structure only. Do not copy CV tables. This design follows the same split later pattern, the same versioning pattern, and the same soft delete pattern, adapted to listing packs.

## Design principles

1. Shared platform neutral core, platform packs are versioned config, not code branches. Templates and mockups are platform neutral. An export adapter applies a platform pack at export time.
2. Never a hard coded column per platform. There is no etsy_size column, no amazon_size column, and no column named for one platform only. Every table that touches a platform uses platform_id plus pack_version_id.
3. Nothing content bearing is hard coded. All sizes, limits, copy prompts, niche rules, pricing, and trial limits are admin editable, with preview and rollback.
4. Real product first. A listing pack is built from the seller's real product and its verified facts. The screen inside a mockup is always the seller's real product render. Never an AI fake product screenshot. Never an upscale of a low resolution source.
5. Crisp Quality Gate. Real product renders only at high DPI. Block or warn on low resolution. No stretch, no colour change, no crop unless approved by the seller. Export at the shortest side pixel size set by the active platform pack version. For Etsy v1 that value is 2000 px, taken from the pack version, not hard coded in this design.
6. Reconciliation check is mandatory. Product facts (tab count, price, format, claims) must match the real product. No silent publish on mismatch. A mismatch blocks export or records an explicit seller override, with the reason stored.
7. Same login first, modular so it can split later. One integrated app at first. A later split partitions by edition or account tag, see the Split later note at the end.
8. Counts only in analytics and logs. Usage analytics count use. They never store product content, listing copy, prompt text, or source file content.
9. Trial starting default, per Ali 2026-11-05: 7 days, no card, one per account. The length, the card rule, and the one per account rule are config in the Trial and Plan tables, not constants in code. If Ali changes them, admin edits config, no migration is needed for the change itself.
10. Price, payment provider, tax treatment, AI provider, domain, and hosting are open decisions, per IDEA.md. Fields for them are marked to be confirmed below. No price and no tax rate is stated in this file. Repo name and visibility are decided and already live: saeedr123/listing-photos-generator, public, owner saeedr123.

## Conventions used in every table

- id: unique identifier (UUID), primary key, unless a table says otherwise.
- created_at and updated_at: date and time in UTC.
- deleted_at: date and time in UTC, null unless soft deleted. Soft delete is the default delete. Hard delete happens only through the account deletion job, see AccountDeletionRequest.
- edition: text tag on user owned rows, for the split later pattern. Values to be confirmed. It records the entry edition, it is not a hard restriction on which edition a user may use later.
- platform_id: unique identifier (UUID) that points to Platform. Always paired with pack_version_id when a row touches a platform.
- pack_version_id: unique identifier (UUID) that points to PlatformPackVersion. It records exactly which pack version was used, so an old listing pack keeps its old rules even after a pack is updated.
- Storage: files live in object storage and are referenced by a storage key (short text). Files are never stored as blobs in the database.
- Nullable fields: a user content field is nullable where the user may not have that data yet, to avoid forcing an invented value.
- Token fields: a share or review token is stored as a token hash only. The plain token is shown once at creation and is never stored in plain text.
- No secrets: no password hash is ever returned by a read, no payment secret is stored here, and no AI provider key is stored here.

## 1. Users, accounts and auth

### User

Purpose: one account per seller. The same login is used first for the shared tools app.

Fields:
- id: unique identifier (UUID), primary key
- email: short text, unique, required
- name: short text, nullable
- password_hash: short text, required for email sign in, never returned by a read. To be confirmed: whether password sign in stays, or whether email only sign in is used first, as in Global Career Studio.
- role: short text, values user or admin, default user. To be confirmed: whether a separate reviewer role is needed for share and review links.
- edition: short text, entry edition tag, default to be confirmed. See Split later note.
- email_verified_at: date and time in UTC, nullable
- locale: short text, default en for v1. Later languages are gated by demand.
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one User has one AccountProfile in v1, many Products, many ListingPacks, many Exports, many ShareLinks, one Subscription at a time in the usual case (history is kept in Subscription rows), many Trial rows in history but at most one active trial, many AIUsageLog rows, many UsageDailyCount rows, many AdminAuditLog rows as actor where role is admin.

Indexes in plain words: unique index on email. Index on edition. Index on deleted_at for soft delete queries.

### AuthIdentity

Purpose: records how a User signed in, so a later sign in method can be added without changing the User table. To be confirmed: which providers are offered in v1.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- provider: short text, for example email, or a named OAuth provider. Values to be confirmed.
- provider_user_id: short text, the identifier at the provider, nullable for email
- provider_email: short text, nullable
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many AuthIdentity rows belong to one User. One User may have more than one AuthIdentity after a later provider is added.

Indexes in plain words: unique index on provider plus provider_user_id where provider_user_id is present. Index on user_id.

### Session

Purpose: a signed in session for a User. To be confirmed: session lifetime and whether sessions are stored here or in a session store only.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- session_token_hash: short text, hashed token only, required
- expires_at: date and time in UTC, required
- last_seen_at: date and time in UTC, nullable
- created_at: date and time in UTC
- revoked_at: date and time in UTC, nullable

Relationships: many Session rows belong to one User. A session is revoked on sign out and on account deletion.

Indexes in plain words: index on user_id. Index on expires_at. Unique index on session_token_hash.

### AccountDeletionRequest

Purpose: GDPR conscious account deletion. A request is recorded, then a job soft deletes first and hard deletes after the retention rule. Retention period to be confirmed.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- requested_at: date and time in UTC, required
- requested_by: short text, values user or admin, required
- reason: long text, nullable, seller supplied or admin note
- status: short text, values requested, soft_deleted, hard_deleted, cancelled. To be confirmed: exact status list.
- soft_deleted_at: date and time in UTC, nullable
- hard_deleted_at: date and time in UTC, nullable
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one AccountDeletionRequest belongs to one User. Hard delete removes or anonymises the User row and all user owned rows, and deactivates all ShareLinks. Export files in object storage are deleted by the same job, not left behind. To be confirmed: which audit rows are kept after hard delete, and in what anonymised form.

Indexes in plain words: index on user_id. Index on status.

## 2. Products, the seller's real product

### Product

Purpose: the seller's real digital product. One Product can have many ListingPacks, one per platform and pack version.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- edition: short text, entry edition tag, copied from User at creation. Values to be confirmed.
- name: short text, seller supplied, required
- product_type: short text, values to be confirmed. For v1, digital only. Example values to be confirmed: sheets_planner, pdf, other_digital.
- format: short text, seller confirmed format, for example Sheets, PDF, ZIP. Required. This is a verified fact, not a guess. A Sheets product must never be described as Excel, and a .xlsx claim must never be generated for it.
- price_amount_minor: whole number, price in the smallest currency unit, seller supplied, nullable until the seller confirms it. No price is invented here.
- price_currency: short text, currency code, for example USD, EUR, GBP. To be confirmed: default currency and whether multi currency is in v1.
- description_seller: long text, seller supplied summary, nullable
- status: short text, values draft, active, archived, required. Default draft.
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one Product belongs to one User. One Product has many ProductSourceFiles, many ProductVerifiedFacts, many ProductRenders, many ListingPacks, many ReconciliationChecks through ListingPack.

Indexes in plain words: index on user_id. Index on user_id plus status. Index on deleted_at.

### ProductSourceFile

Purpose: the real source files the seller uploads. Sheet PDFs, screenshots, or renders of the actual product. No AI photo pretending to be a real screenshot is stored here as a source file.

Fields:
- id: unique identifier (UUID), primary key
- product_id: unique identifier (UUID), foreign key to Product, required
- storage_key: short text, object storage reference, required
- file_name: short text, original file name as supplied, required
- file_type: short text, for example pdf, jpg, png. To be confirmed: full allowed list for v1.
- file_size_bytes: whole number, required
- width_px: whole number, nullable where the file has no pixel width, for example a PDF page count case. To be confirmed: how PDF page size is recorded.
- height_px: whole number, nullable, same note as width_px
- page_count: whole number, nullable, for PDF sources
- colour_profile: short text, for example sRGB, nullable. To be confirmed: whether colour profile is read at upload or entered by the seller.
- source_kind: short text, values to be confirmed, for example sheet_pdf, screenshot, render. This separates a real screenshot from a mockup frame. A mockup frame is never stored as a ProductSourceFile.
- uploaded_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: many ProductSourceFiles belong to one Product. A ProductSourceFile is the evidence for one or more ProductVerifiedFacts.

Indexes in plain words: index on product_id. Index on product_id plus source_kind.

### ProductVerifiedFact

Purpose: the verified facts about the real product, used by reconciliation. These are the only facts the generator may use in copy and in images. A fact that is not verified here must not appear in a listing pack.

Fields:
- id: unique identifier (UUID), primary key
- product_id: unique identifier (UUID), foreign key to Product, required
- fact_key: short text, required. Controlled values to be confirmed, with at least tab_count, price, format, claim. A claim fact stores one claim at a time, not a bundle of claims.
- fact_value_text: long text, the verified value, required. For tab_count this is the count as text plus the count as a number in fact_value_number. For price this is the display value, with the amount also in fact_value_number where it applies.
- fact_value_number: decimal number, nullable, used where the fact is numeric
- source_file_id: unique identifier (UUID), foreign key to ProductSourceFile, nullable where the fact comes from seller confirmation rather than a file
- verified_by_user_id: unique identifier (UUID), foreign key to User, required
- verified_at: date and time in UTC, required
- verification_note: long text, nullable, how the fact was checked
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many ProductVerifiedFacts belong to one Product. A ProductVerifiedFact may point to one ProductSourceFile as evidence.

Indexes in plain words: index on product_id. Unique index on product_id plus fact_key plus fact_value_text where a fact is meant to be single valued, to be confirmed per fact_key. In practice tab_count, price, and format are single valued per product, claims are many per product, so the unique rule must be per fact_key, not global. Mark this as to be confirmed in implementation.

### ProductRender

Purpose: a real product render made from a ProductSourceFile at high resolution, for use inside templates and mockups. This is a render of the real product, not a generated image. Never upscale a low resolution source to make a render.

Fields:
- id: unique identifier (UUID), primary key
- product_id: unique identifier (UUID), foreign key to Product, required
- source_file_id: unique identifier (UUID), foreign key to ProductSourceFile, required
- storage_key: short text, object storage reference, required
- width_px: whole number, required
- height_px: whole number, required
- dpi_value: whole number, nullable. To be confirmed: how DPI is recorded for a screen render, and what minimum DPI counts as high DPI for the Crisp Quality Gate.
- fit_mode: short text, default contain, values to be confirmed. Contain fit, centred, is the default. No stretch is allowed.
- crop_approved: true or false, default false. A crop is allowed only when the seller approves it, and the approval is recorded here with approved_by and approved_at, see next two fields.
- crop_approved_by_user_id: unique identifier (UUID), foreign key to User, nullable
- crop_approved_at: date and time in UTC, nullable
- colour_changed: true or false, default false. Must stay false for a real product render.
- quality_gate_status: short text, values pass, warn, block, required. Low resolution blocks or warns, per the active platform pack version and the admin quality rule. To be confirmed: exact warn versus block thresholds.
- quality_gate_reason: long text, nullable, plain language reason for warn or block
- created_at: date and time in UTC

Relationships: many ProductRenders belong to one Product and to one ProductSourceFile. A ProductRender is used by many ListingPackImages.

Indexes in plain words: index on product_id. Index on source_file_id. Index on quality_gate_status.

## 3. Listing packs, one product, one platform, one pack version

### ListingPack

Purpose: one complete listing pack for one Product, one platform, and one pack version. A second platform means a second ListingPack row, not a second set of columns on the first row.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- product_id: unique identifier (UUID), foreign key to Product, required
- platform_id: unique identifier (UUID), foreign key to Platform, required
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required
- niche_pack_id: unique identifier (UUID), foreign key to NichePack, nullable until the seller picks a niche pack
- niche_pack_version_id: unique identifier (UUID), foreign key to NichePackVersion, nullable, records the exact niche version used
- template_id: unique identifier (UUID), foreign key to Template, nullable until a template set is picked
- status: short text, values draft, ready_for_review, ready_to_export, exported, archived, required. Default draft.
- language: short text, default en for v1. Later languages are gated by demand.
- edition: short text, entry edition tag, copied from User at creation. Values to be confirmed.
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one ListingPack belongs to one User, one Product, one Platform, and one PlatformPackVersion. One ListingPack has many ListingPackImages, one ListingPackCopy, many ReconciliationChecks, many Exports, many ShareLinks.

Indexes in plain words: index on user_id. Index on product_id. Index on product_id plus platform_id plus pack_version_id. Index on platform_id plus pack_version_id. Index on status.

### ListingPackImage

Purpose: one image in a ListingPack, in order. The image is built from a real ProductRender inside a Template and, where used, a Mockup. No image here invents product content.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, required
- platform_id: unique identifier (UUID), foreign key to Platform, required, copied from ListingPack
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required, copied from ListingPack
- template_version_id: unique identifier (UUID), foreign key to TemplateVersion, nullable until a template version is applied
- mockup_version_id: unique identifier (UUID), foreign key to MockupVersion, nullable where no mockup is used
- product_render_id: unique identifier (UUID), foreign key to ProductRender, required where the image shows the product. Nullable only for a text only supporting image, to be confirmed whether text only images are allowed in v1.
- position: whole number, image order in the pack, starting at 1, required
- image_role: short text, values to be confirmed, for example hero, features_grid, what_is_inside, how_it_works, mobile_view, sizes_and_formats. The v1 set is 10 templates, proved first with hero and features.
- storage_key: short text, object storage reference, nullable until the image is rendered
- width_px: whole number, nullable until rendered
- height_px: whole number, nullable until rendered
- shortest_side_px: whole number, nullable until rendered. For Etsy v1 the export target is 2000 px, taken from the pack version.
- orientation: short text, values landscape, portrait, square, nullable until rendered. To be confirmed: whether orientation is stored here or derived from width and height.
- fit_warning: short text, nullable, for example landscape sheet in a portrait phone frame will show as a small band. A warning is stored, never silently fixed by stretching.
- quality_gate_status: short text, values pass, warn, block, required once rendered. Default to be confirmed before render.
- quality_gate_reason: long text, nullable
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many ListingPackImages belong to one ListingPack. Each points to one TemplateVersion, optionally one MockupVersion, and one ProductRender.

Indexes in plain words: index on listing_pack_id. Unique index on listing_pack_id plus position. Index on platform_id plus pack_version_id.

### ListingPackCopy

Purpose: the copy for one ListingPack, generated from verified facts only, per platform. One ListingPack has one ListingPackCopy row in v1. A new copy generation creates a new version of this row, see ListingPackCopyVersion below, it does not overwrite history silently. To be confirmed: whether copy versions live in this table with a version number, or in a separate version table.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, required, unique in v1
- platform_id: unique identifier (UUID), foreign key to Platform, required, copied from ListingPack
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required, copied from ListingPack
- copy_prompt_version_id: unique identifier (UUID), foreign key to CopyPromptVersion, required, records exactly which prompt version generated this copy
- title_text: long text, nullable until generated. Must fit the title limit in the active pack version, for Etsy 140 characters, taken from the pack version, not hard coded.
- title_char_count: whole number, nullable, counted at generation
- description_text: long text, nullable until generated
- tags_text: long text, nullable until generated, stored as a JSON array of strings in v1. For Etsy this is up to 13 tags, each up to 20 characters, taken from the pack version. For eBay and Amazon, tags are not copied from Etsy, see platform-rules.md.
- keywords_text: long text, nullable, platform specific keywords where the platform defines them, not Etsy tags reused.
- checklist_text: long text, nullable, stored as a JSON array of checklist items, the pre publish checklist for this platform and pack version
- generation_status: short text, values draft, generated, reviewed, approved, required. Default draft.
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one ListingPackCopy belongs to one ListingPack. It points to one PlatformPackVersion and one CopyPromptVersion.

Indexes in plain words: unique index on listing_pack_id. Index on platform_id plus pack_version_id. Index on copy_prompt_version_id.

### ListingPackCopyVersion

Purpose: version history for listing copy, so a regeneration or an edit can be previewed and rolled back. Rollback creates a new version from a snapshot, it does not overwrite history.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_copy_id: unique identifier (UUID), foreign key to ListingPackCopy, required
- version_number: whole number, required, increments per copy
- snapshot_json: JSON object, the full copy snapshot (title, description, tags, keywords, checklist), required
- status: short text, values draft, published, retired, required
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC

Relationships: many ListingPackCopyVersions belong to one ListingPackCopy.

Indexes in plain words: index on listing_pack_copy_id. Unique index on listing_pack_copy_id plus version_number.

### ReconciliationCheck

Purpose: the mandatory reconciliation check for one ListingPack before export. No silent publish on mismatch.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, required
- platform_id: unique identifier (UUID), foreign key to Platform, required, copied from ListingPack
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required, copied from ListingPack
- status: short text, values pass, fail, blocked, required
- checked_at: date and time in UTC, required
- checked_by: short text, values system or user, required. To be confirmed: whether a human reviewer can also run the check.
- created_at: date and time in UTC

Relationships: one ReconciliationCheck belongs to one ListingPack. One ReconciliationCheck has many ReconciliationCheckItems. A ListingPack may have many ReconciliationChecks over time, the latest pass is the one that allows export.

Indexes in plain words: index on listing_pack_id. Index on listing_pack_id plus checked_at. Index on status.

### ReconciliationCheckItem

Purpose: one fact checked inside a ReconciliationCheck.

Fields:
- id: unique identifier (UUID), primary key
- reconciliation_check_id: unique identifier (UUID), foreign key to ReconciliationCheck, required
- fact_key: short text, required, same controlled values as ProductVerifiedFact, at least tab_count, price, format, claim
- expected_value_text: long text, the verified fact value, required
- generated_value_text: long text, the value found in the generated copy or image, required
- result: short text, values match, mismatch, required
- action: short text, values block_export, warn, allow_with_override, required. To be confirmed: exact action list.
- override_reason: long text, nullable, required where action is allow_with_override
- override_by_user_id: unique identifier (UUID), foreign key to User, nullable
- created_at: date and time in UTC

Relationships: many ReconciliationCheckItems belong to one ReconciliationCheck.

Indexes in plain words: index on reconciliation_check_id. Index on fact_key plus result.

## 4. Platforms, platform packs and pack versions

### Platform

Purpose: a registry of platforms. v1 has Etsy only as active. eBay and Amazon are registered as Phase 2, not active. Later platforms (Shopify, TikTok Shop, Facebook Marketplace, Instagram Shopping, Walmart Marketplace, Google Shopping, Pinterest Shopping, Shopee, Lazada, Daraz, WooCommerce) stay in backlog only, each as a future Platform row plus a PlatformPack, not as code or columns.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required, for example etsy, ebay, amazon. Later slugs to be confirmed at pack creation.
- name: short text, required, for example Etsy
- status: short text, values active, phase_2, backlog, retired, required. Default backlog, except Etsy which is active in v1.
- is_digital_supported: true or false, nullable until verified. For Etsy this is true, with an instant download flow verified on 2026-11-05. For eBay and Amazon this is not assumed, see platform-rules.md section 2.8 and 3.8.
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one Platform has many PlatformPacks, many PlatformRules, many ListingPacks, many Exports.

Indexes in plain words: unique index on slug. Index on status.

### PlatformPack

Purpose: the admin editable pack for one platform. The pack holds the rules for that platform as config. A new platform is a new PlatformPack, not a code branch.

Fields:
- id: unique identifier (UUID), primary key
- platform_id: unique identifier (UUID), foreign key to Platform, required
- slug: short text, unique per platform, required, for example etsy_digital_v1. To be confirmed: slug naming rule.
- name: short text, required
- is_active: true or false, default false until a version is published
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one PlatformPack belongs to one Platform. One PlatformPack has many PlatformPackVersions.

Indexes in plain words: unique index on platform_id plus slug. Index on platform_id.

### PlatformPackVersion

Purpose: one version of a PlatformPack. Publish, preview, and rollback live here. Rollback creates a new version from an older snapshot, it does not overwrite history.

Fields:
- id: unique identifier (UUID), primary key
- platform_pack_id: unique identifier (UUID), foreign key to PlatformPack, required
- platform_id: unique identifier (UUID), foreign key to Platform, required, copied from PlatformPack
- version_number: whole number, required, increments per pack
- definition_json: JSON object, required, the full pack definition. This holds all sizes, limits, copy prompts references, niche rules, image rules, title and tag limits, file types, and export settings for this version. No size or limit in this JSON is hard coded in code. Values in the JSON are taken from verified rules only, see PlatformRule.
- status: short text, values draft, preview, published, retired, required. Only one published version per pack at a time.
- published_at: date and time in UTC, nullable
- published_by_user_id: unique identifier (UUID), foreign key to User, nullable, admin who published
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many PlatformPackVersions belong to one PlatformPack and one Platform. A PlatformPackVersion is referenced by many ListingPacks, ListingPackImages, ListingPackCopies, ReconciliationChecks, and Exports as pack_version_id.

Indexes in plain words: unique index on platform_pack_id plus version_number. Index on platform_id. Index on status. Index on published_at.

### PlatformRule

Purpose: one verified platform rule, with its source and check date, so the generator never builds on an unverified rule. This is the database form of platform-rules.md.

Fields:
- id: unique identifier (UUID), primary key
- platform_id: unique identifier (UUID), foreign key to Platform, required
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable until the rule is attached to a pack version. To be confirmed: whether a rule is attached at pack version creation or lives independently and is referenced by the pack definition.
- rule_key: short text, required, for example title_max_chars, image_shortest_side_px, max_images, tag_max_count. Controlled list to be confirmed.
- rule_value_text: long text, the rule value as stated, required
- rule_value_number: decimal number, nullable, where the rule is numeric
- verification_status: short text, values verified, unverified, disputed, conflict, required. A rule marked unverified, disputed, or conflict must not be used as a hard generator limit.
- source_url: long text, official source URL only, required where verification_status is verified. Competitor blogs and third party guides are leads only, never the source for a rule.
- check_date: date, the date the source was checked, required. For v1 rules this is 2026-11-05.
- source_note: long text, nullable, for example page did not render full text, or older version said a different value.
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many PlatformRules belong to one Platform. A PlatformRule may belong to one PlatformPackVersion.

Indexes in plain words: index on platform_id. Index on platform_id plus rule_key. Index on verification_status. Index on check_date.

## 5. Templates and copy prompts

Templates are platform neutral. A template does not carry a platform_id. A platform is applied only when the template is used in a ListingPack or an Export, through platform_id plus pack_version_id on those rows.

### Template

Purpose: one template set entry, for example hero, features grid, what is inside. v1 has 10 templates, proved first with hero and features using the Maid of Honor Planner as the test product.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required
- name: short text, required
- template_role: short text, required, for example hero, features_grid, what_is_inside, how_it_works, mobile_view, sizes_and_formats. Full v1 role list to be confirmed.
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one Template has many TemplateVersions, many NichePackTemplates, many ListingPacks.

Indexes in plain words: unique index on slug. Index on template_role. Index on is_active.

### TemplateVersion

Purpose: one version of a Template. Publish, preview, and rollback live here. Rollback creates a new version from an older snapshot, it does not overwrite history.

Fields:
- id: unique identifier (UUID), primary key
- template_id: unique identifier (UUID), foreign key to Template, required
- version_number: whole number, required, increments per template
- definition_json: JSON object, required, the full template definition (layout, section order, typography, colour palette, spacing, safe border, image slots, text slots). Nothing content bearing is hard coded outside this JSON.
- status: short text, values draft, preview, published, retired, required. Only one published version per template at a time.
- published_at: date and time in UTC, nullable
- published_by_user_id: unique identifier (UUID), foreign key to User, nullable, admin who published
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many TemplateVersions belong to one Template. A TemplateVersion is referenced by many ListingPackImages.

Indexes in plain words: unique index on template_id plus version_number. Index on status. Index on published_at.

### CopyPrompt

Purpose: one copy prompt, for example title prompt, description prompt, tags prompt, checklist prompt. Prompts are admin editable, not hard coded.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required
- name: short text, required
- prompt_purpose: short text, required, for example title, description, tags, checklist. To be confirmed: full purpose list.
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one CopyPrompt has many CopyPromptVersions. A CopyPrompt is referenced by PlatformPackVersion definition_json by slug, and by ListingPackCopy through CopyPromptVersion.

Indexes in plain words: unique index on slug. Index on prompt_purpose.

### CopyPromptVersion

Purpose: one version of a CopyPrompt. Publish, preview, and rollback live here. Rollback creates a new version from an older snapshot, it does not overwrite history.

Fields:
- id: unique identifier (UUID), primary key
- copy_prompt_id: unique identifier (UUID), foreign key to CopyPrompt, required
- version_number: whole number, required, increments per prompt
- prompt_text: long text, required, the full prompt text for this version
- model_settings_json: JSON object, nullable, model settings for this version. Provider and model names to be confirmed. No provider key is stored here.
- status: short text, values draft, preview, published, retired, required. Only one published version per prompt at a time.
- published_at: date and time in UTC, nullable
- published_by_user_id: unique identifier (UUID), foreign key to User, nullable, admin who published
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many CopyPromptVersions belong to one CopyPrompt. A CopyPromptVersion is referenced by many ListingPackCopies as copy_prompt_version_id.

Indexes in plain words: unique index on copy_prompt_id plus version_number. Index on status.

## 6. Niche packs

### NichePack

Purpose: one niche pack, for example wedding and events, personal finance, small business planners. v1 tests three niches. Other niches go to backlog.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required
- name: short text, required
- description: long text, nullable, admin description of who the niche is for
- status: short text, values active, backlog, retired, required. Default backlog, except the three v1 test niches which are active.
- is_active: true or false, default false until a version is published
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete

Relationships: one NichePack has many NichePackVersions, many NichePackTemplates, many NichePackMockups, many ListingPacks.

Indexes in plain words: unique index on slug. Index on status.

### NichePackVersion

Purpose: one version of a NichePack. Publish, preview, and rollback live here, same pattern as templates and platform packs.

Fields:
- id: unique identifier (UUID), primary key
- niche_pack_id: unique identifier (UUID), foreign key to NichePack, required
- version_number: whole number, required, increments per niche pack
- definition_json: JSON object, required, the full niche definition (tone, vocabulary, buyer language, template order, mockup suitability, copy prompt references, niche rules). No niche rule is hard coded outside this JSON.
- status: short text, values draft, preview, published, retired, required. Only one published version per niche pack at a time.
- published_at: date and time in UTC, nullable
- published_by_user_id: unique identifier (UUID), foreign key to User, nullable, admin who published
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many NichePackVersions belong to one NichePack. A NichePackVersion is referenced by many ListingPacks as niche_pack_version_id.

Indexes in plain words: unique index on niche_pack_id plus version_number. Index on status.

### NichePackTemplate

Purpose: link table. Which templates belong to which niche pack, and in which order. A template is platform neutral, a niche pack is platform neutral, the link is also platform neutral. Platform rules are applied later by the export adapter.

Fields:
- id: unique identifier (UUID), primary key
- niche_pack_id: unique identifier (UUID), foreign key to NichePack, required
- template_id: unique identifier (UUID), foreign key to Template, required
- sort_order: whole number, required, order inside the niche pack
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many NichePackTemplates belong to one NichePack and one Template.

Indexes in plain words: unique index on niche_pack_id plus template_id. Index on niche_pack_id plus sort_order.

### NichePackMockup

Purpose: link table. Which mockups suit which niche pack. A mockup itself holds no seller product, so this link holds only suitability, not product content.

Fields:
- id: unique identifier (UUID), primary key
- niche_pack_id: unique identifier (UUID), foreign key to NichePack, required
- mockup_id: unique identifier (UUID), foreign key to Mockup, required
- sort_order: whole number, required
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many NichePackMockups belong to one NichePack and one Mockup.

Indexes in plain words: unique index on niche_pack_id plus mockup_id. Index on niche_pack_id plus sort_order.

## 7. Mockups and mockup versions, core v1 feature

A mockup is a presentation frame. The screen inside it is always the seller's real product render. A mockup never invents product content, and it is never labelled as a real screenshot. Mockups are platform neutral. Platform fit is checked at ListingPackImage and Export time, through platform_id plus pack_version_id on those rows.

### Mockup

Purpose: one mockup entry in the library. Starter v1 set: laptop alone straight on, phone alone straight on, tablet alone straight on, laptop plus phone hero, flat feature frame. Later additions are Phase 2 or backlog, for example desk scene, printed planner or book, bundle of devices, seasonal backgrounds, social square crop, seller uploaded custom frames.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required
- name: short text, required
- mockup_kind: short text, required, for example laptop_alone, phone_alone, tablet_alone, laptop_plus_phone, flat_feature_frame. Later kinds to be confirmed at creation.
- is_active: true or false, default false until a version is published and enabled
- is_hidden: true or false, default false. Hidden mockups stay in history but are not offered to sellers.
- created_by_user_id: unique identifier (UUID), foreign key to User, required, admin who created it
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deleted_at: date and time in UTC, nullable, soft delete. Hiding is preferred over deleting. Deleting is soft only.

Relationships: one Mockup has many MockupVersions, many NichePackMockups, many ListingPackImages through MockupVersion.

Indexes in plain words: unique index on slug. Index on mockup_kind. Index on is_active plus is_hidden.

### MockupVersion

Purpose: one version of a Mockup. This is where the easy add flow in admin lands: upload a frame, mark the screen area, set allowed orientations and niche packs, preview with a real product render, then enable. No code change and no deploy. Duplicate, edit, hide, and rollback live here. Rollback creates a new version from an older snapshot, it does not overwrite history.

Fields:
- id: unique identifier (UUID), primary key
- mockup_id: unique identifier (UUID), foreign key to Mockup, required
- version_number: whole number, required, increments per mockup
- frame_storage_key: short text, object storage reference to the frame image, required
- frame_width_px: whole number, required
- frame_height_px: whole number, required
- screen_area_json: JSON object, required, screen area coordinates inside the frame (x, y, width, height, in plain numbers, with the coordinate unit to be confirmed, for example pixels at frame size, or 0 to 1000 scale)
- allowed_orientations_json: JSON array of strings, required, for example landscape, portrait. The screen area must fit the allowed orientations without stretch.
- background: short text, nullable, background description or colour reference for this version. To be confirmed: whether background is a colour value, a storage key, or a named style.
- warp_required: true or false, default false. Straight devices are the default and need no warp. A tilted phone version needs a warp step and must be tested for white bands and blur before it is enabled.
- warp_note: long text, nullable, plain language note where warp is required
- crisp_test_status: short text, values not_tested, pass, fail, required. A new mockup is only added to the live library after a crisp render test: contain fit, centred, no stretch, no colour change, no crop unless approved.
- crisp_test_note: long text, nullable, what was tested and what the result was
- preview_render_storage_key: short text, object storage reference to the preview render with a real product, nullable until preview is run. Preview uses a real product render, never a fake product screenshot.
- status: short text, values draft, preview, published, retired, required. Only one published version per mockup at a time.
- published_at: date and time in UTC, nullable
- published_by_user_id: unique identifier (UUID), foreign key to User, nullable, admin who published
- created_by_user_id: unique identifier (UUID), foreign key to User, required
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many MockupVersions belong to one Mockup. A MockupVersion is referenced by many ListingPackImages as mockup_version_id.

Indexes in plain words: unique index on mockup_id plus version_number. Index on status. Index on crisp_test_status.

## 8. Exports and export history

### Export

Purpose: one export of one ListingPack for one platform and pack version. Export files are in object storage, referenced by storage key, never as blobs here.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, required
- user_id: unique identifier (UUID), foreign key to User, required
- platform_id: unique identifier (UUID), foreign key to Platform, required
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required
- export_kind: short text, values to be confirmed, for example images_zip, copy_text_pack, full_pack. Full pack is images plus copy text.
- file_format: short text, required, for example jpg for Etsy v1 images. Taken from the pack version, not hard coded.
- shortest_side_px: whole number, required at export, for Etsy v1 this is 2000 px, taken from the pack version.
- storage_key: short text, object storage reference, nullable until the export is ready
- file_size_bytes: whole number, nullable until ready
- image_count: whole number, nullable, count of images in this export
- status: short text, values queued, processing, ready, failed, required. Default queued.
- error_message: long text, nullable, plain language only, no system details
- reconciliation_check_id: unique identifier (UUID), foreign key to ReconciliationCheck, required before an export can be ready. An export with no passing reconciliation check must not be marked ready.
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one Export belongs to one ListingPack, one User, one Platform, and one PlatformPackVersion. One Export has many ExportEvents.

Indexes in plain words: index on listing_pack_id. Index on user_id. Index on platform_id plus pack_version_id. Index on status. Index on created_at.

### ExportEvent

Purpose: export history. One row per export event, so a retry or a failure is visible in history and a successful export is never overwritten by a later failure.

Fields:
- id: unique identifier (UUID), primary key
- export_id: unique identifier (UUID), foreign key to Export, required
- event_type: short text, values to be confirmed, for example queued, started, rendered, ready, failed, downloaded, re_exported
- status: short text, values queued, processing, ready, failed, required
- detail: long text, nullable, plain language detail only, no product content, no copy text
- duration_ms: whole number, nullable, time taken for this event where it applies
- created_at: date and time in UTC
- created_by_user_id: unique identifier (UUID), foreign key to User, nullable, where a user triggered the event

Relationships: many ExportEvents belong to one Export.

Indexes in plain words: index on export_id. Index on export_id plus created_at. Index on event_type.

### ExportLog

Purpose: counts only export log for admin and analytics, separate from ExportEvent history. No product content, no copy text, no file content.

Fields:
- id: unique identifier (UUID), primary key
- export_id: unique identifier (UUID), foreign key to Export, required
- platform_id: unique identifier (UUID), foreign key to Platform, required
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, required
- template_id: unique identifier (UUID), foreign key to Template, nullable
- format: short text, for example jpg, required
- status: short text, values ready, failed, required
- duration_ms: whole number, nullable
- created_at: date and time in UTC

Relationships: many ExportLogs belong to one Export. This mirrors the Global Career Studio ExportLog pattern, with platform_id plus pack_version_id added.

Indexes in plain words: index on export_id. Index on platform_id plus pack_version_id. Index on created_at.

## 9. Share and review links

### ShareLink

Purpose: a share or review link for a draft ListingPack, so a partner can check it before export. Read only view only. No edit through a share link.

Fields:
- id: unique identifier (UUID), primary key
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, required
- user_id: unique identifier (UUID), foreign key to User, required, owner who created the link
- platform_id: unique identifier (UUID), foreign key to Platform, nullable where the link is for the whole pack rather than one platform export. To be confirmed: whether a share link is per ListingPack or per platform.
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable, paired with platform_id where platform_id is present
- token_hash: short text, hashed token only, required, unique. The plain token is shown once at creation.
- purpose: short text, values share, review, required. To be confirmed: whether share and review need different expiry or access rules.
- is_active: true or false, default true
- expires_at: date and time in UTC, nullable. To be confirmed: default expiry, if any.
- view_count: whole number, default 0, count only, no viewer identity stored here
- created_at: date and time in UTC
- updated_at: date and time in UTC
- deactivated_at: date and time in UTC, nullable

Relationships: many ShareLinks belong to one ListingPack and one User. A ShareLink is deactivated on ListingPack deletion and on account deletion, so a deleted pack never stays reachable through an old link.

Indexes in plain words: unique index on token_hash. Index on listing_pack_id. Index on user_id. Index on is_active plus expires_at.

## 10. Plans, subscriptions, entitlements, trials

No price and no tax rate is stated in this file. Price, payment provider, and tax treatment are to be confirmed. The fields below hold config, not decisions.

### Plan

Purpose: one plan, for example free and premium. Plan names and slugs to be confirmed. Free must be genuinely useful, per IDEA.md.

Fields:
- id: unique identifier (UUID), primary key
- slug: short text, unique, required, for example free, premium. To be confirmed: full plan list.
- name: short text, required
- price_amount_minor: whole number, nullable for free, and configurable, not hard coded. Amount to be confirmed. Do not set a price from this file.
- price_currency: short text, nullable. Currency to be confirmed.
- billing_interval: short text, nullable, for example monthly, annual. To be confirmed.
- tax_treatment: short text, nullable. To be confirmed. No tax rate is stated here.
- entitlements_json: JSON object, nullable, summary of entitlements for display only. The authoritative entitlements live in PlanEntitlement rows, not only in this JSON.
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one Plan has many PlanEntitlements, many Subscriptions, many Trials.

Indexes in plain words: unique index on slug. Index on is_active.

### PlanEntitlement

Purpose: one entitlement on one Plan, admin editable, so changing an entitlement never needs a code change. Entitlement keys to be confirmed, with at least max listing packs, templates allowed, mockups allowed, export formats allowed, max AI credits per month, and max storage, following the Global Career Studio pattern.

Fields:
- id: unique identifier (UUID), primary key
- plan_id: unique identifier (UUID), foreign key to Plan, required
- entitlement_key: short text, required, for example max_listing_packs, max_ai_credits_per_month, export_formats_allowed
- limit_value_text: long text, nullable, the limit as text or JSON where the limit is a list
- limit_value_number: decimal number, nullable, where the limit is numeric
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many PlanEntitlements belong to one Plan.

Indexes in plain words: unique index on plan_id plus entitlement_key. Index on plan_id.

### UserEntitlement

Purpose: an entitlement granted to one User directly, for example an admin grant or a trial grant, separate from the User's Plan. This keeps a grant visible and revocable, instead of hiding it in a Plan change.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- entitlement_key: short text, required, same controlled keys as PlanEntitlement
- limit_value_text: long text, nullable
- limit_value_number: decimal number, nullable
- granted_by_user_id: unique identifier (UUID), foreign key to User, required, admin who granted it
- granted_reason: long text, nullable
- expires_at: date and time in UTC, nullable
- is_active: true or false, default true
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many UserEntitlements belong to one User.

Indexes in plain words: index on user_id. Index on user_id plus entitlement_key. Index on is_active plus expires_at.

### Subscription

Purpose: one subscription for one User on one Plan. Payment provider to be confirmed. Do not assume a provider from this file.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- plan_id: unique identifier (UUID), foreign key to Plan, required
- payment_provider: short text, nullable. To be confirmed.
- provider_customer_id: short text, nullable. To be confirmed: provider field names.
- provider_subscription_id: short text, nullable. To be confirmed: provider field names.
- status: short text, values to be confirmed, for example active, past_due, cancelled, trialing. Exact list depends on the payment provider, to be confirmed.
- current_period_start: date and time in UTC, nullable
- current_period_end: date and time in UTC, nullable
- cancel_at_period_end: true or false, default false
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many Subscriptions belong to one User and one Plan. History is kept, a cancelled subscription row is not deleted.

Indexes in plain words: index on user_id. Index on user_id plus status. Index on plan_id. Index on provider_subscription_id where present.

### Trial

Purpose: one trial for one User on one Plan. Starting default: 7 days, no card, one per account. That default is config here, not a constant in code.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- plan_id: unique identifier (UUID), foreign key to Plan, required
- starts_at: date and time in UTC, required
- ends_at: date and time in UTC, required. Default is starts_at plus 7 days in v1, configurable in admin.
- status: short text, values active, converted, expired, cancelled, required
- requires_card: true or false, default false in v1, configurable
- ai_credit_allowance: whole number, nullable, credits granted by this trial. Amount to be confirmed.
- export_allowance: whole number, nullable, exports allowed by this trial. Amount to be confirmed.
- listing_pack_allowance: whole number, nullable, listing packs allowed by this trial. Amount to be confirmed.
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many Trial rows belong to one User in history, at most one active trial per account. Enforce one per account with a unique index on user_id where status is active, to be confirmed in implementation, plus a check at creation.

Indexes in plain words: index on user_id. Index on user_id plus status. Index on ends_at.

## 11. AI usage

AI provider and model are to be confirmed. No provider key is stored here. No prompt text, no product content, and no generated copy is stored in the AI log tables. Generated copy lives only in ListingPackCopy and its versions.

### AICreditLedger

Purpose: credits granted and used per User per period.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- period_start: date and time in UTC, required
- period_end: date and time in UTC, required
- credits_granted: whole number, required, default 0
- credits_used: whole number, required, default 0
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many AICreditLedger rows belong to one User. One ledger row covers one period per user.

Indexes in plain words: unique index on user_id plus period_start plus period_end. Index on user_id.

### AIUsageLog

Purpose: one AI generation event, with credits consumed, provider, model, and success or failure, without logging the full text.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required
- listing_pack_id: unique identifier (UUID), foreign key to ListingPack, nullable where the generation is not tied to a pack yet
- platform_id: unique identifier (UUID), foreign key to Platform, nullable where the generation is platform neutral, for example a draft title before a platform is picked. Where a platform applies, platform_id is paired with pack_version_id.
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable, paired with platform_id where platform_id is present
- copy_prompt_version_id: unique identifier (UUID), foreign key to CopyPromptVersion, nullable, records which prompt version was used
- operation: short text, required, for example generate_title, generate_description, generate_tags, generate_checklist. Full list to be confirmed.
- credits_consumed: whole number, required, default 0. A failed generation must not consume a credit without a log row and a retry path. To be confirmed: retry rule.
- provider: short text, nullable. To be confirmed.
- model: short text, nullable. To be confirmed.
- status: short text, values success, failed, required
- error_message: long text, nullable, plain language only, no system details
- created_at: date and time in UTC

Relationships: many AIUsageLog rows belong to one User, optionally one ListingPack, optionally one PlatformPackVersion, optionally one CopyPromptVersion.

Indexes in plain words: index on user_id. Index on listing_pack_id. Index on created_at. Index on status.

## 12. Usage analytics, counts only

### UsageDailyCount

Purpose: daily counts of use, per User, per event type, per platform where it applies. Counts only. No product content, no listing copy, no prompt text, no source file content, no file names, and no viewer identity.

Fields:
- id: unique identifier (UUID), primary key
- user_id: unique identifier (UUID), foreign key to User, required. To be confirmed: whether anonymous aggregate counts without user_id are also kept, for a public total.
- event_date: date, required, the day the count covers, in UTC
- event_type: short text, required, for example listing_pack_created, export_completed, mockup_used, ai_generation, share_link_viewed, reconciliation_failed. Full list to be confirmed.
- platform_id: unique identifier (UUID), foreign key to Platform, nullable where the event is platform neutral
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable, paired with platform_id where platform_id is present
- count_value: whole number, required, default 0
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: many UsageDailyCount rows belong to one User, optionally one Platform and one PlatformPackVersion.

Indexes in plain words: unique index on user_id plus event_date plus event_type plus platform_id plus pack_version_id, with nulls handled as a single bucket per event, to be confirmed in implementation. Index on event_date. Index on event_type.

### SystemLog

Purpose: system log rows for errors and admin visible events. No secrets, no product content, no copy text.

Fields:
- id: unique identifier (UUID), primary key
- level: short text, values info, warning, error, required
- message: long text, required, plain language only
- context_json: JSON object, nullable, counts and identifiers only, no secrets, no product content
- user_id: unique identifier (UUID), foreign key to User, nullable where the event has no user
- created_at: date and time in UTC

Relationships: many SystemLog rows may belong to one User, or to no user.

Indexes in plain words: index on level. Index on created_at. Index on user_id.

## 13. Admin audit log and feature flags

### AdminAuditLog

Purpose: every admin action is logged here, with a reason. Admin access to a user product, listing pack, or export must include a reason and must be logged here.

Fields:
- id: unique identifier (UUID), primary key
- admin_user_id: unique identifier (UUID), foreign key to User, required, the admin who acted
- action: short text, required, for example publish_template_version, rollback_mockup_version, enable_platform_pack, grant_entitlement, view_user_product. Full action list to be confirmed.
- target_type: short text, required, for example Template, Mockup, PlatformPack, ListingPack, Product, User, Plan
- target_id: unique identifier (UUID), required, the id of the target row
- platform_id: unique identifier (UUID), foreign key to Platform, nullable where the action touches a platform. Where present, it is paired with pack_version_id.
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable, paired with platform_id where platform_id is present
- reason: long text, required for admin access to user content, nullable otherwise. To be confirmed: which actions always require a reason.
- detail_json: JSON object, nullable, identifiers and counts only, no product content, no copy text
- created_at: date and time in UTC

Relationships: many AdminAuditLog rows belong to one admin User. A row points to one target by target_type plus target_id.

Indexes in plain words: index on admin_user_id. Index on target_type plus target_id. Index on action. Index on created_at. Index on platform_id plus pack_version_id where present.

### FeatureFlag

Purpose: turn a template, language, platform pack, niche pack, mockup, or AI feature on or off, per plan or globally, without a deployment.

Fields:
- id: unique identifier (UUID), primary key
- key: short text, unique, required, for example mockup_library_enabled, amazon_pack_enabled, ai_tags_enabled. Full key list to be confirmed.
- name: short text, required, plain language name for admin
- is_enabled: true or false, default false
- plan_scope: short text, values to be confirmed, for example all, free, premium. This follows the Global Career Studio pattern. To be confirmed: whether trial scope is a separate value.
- platform_id: unique identifier (UUID), foreign key to Platform, nullable where the flag is for one platform only. Where present, it is paired with pack_version_id where a pack version applies.
- pack_version_id: unique identifier (UUID), foreign key to PlatformPackVersion, nullable, paired with platform_id where platform_id is present
- description: long text, nullable
- created_at: date and time in UTC
- updated_at: date and time in UTC

Relationships: one FeatureFlag may point to one Platform and optionally one PlatformPackVersion. A flag does not own a template or a mockup, it only gates it.

Indexes in plain words: unique index on key. Index on is_enabled. Index on plan_scope. Index on platform_id plus pack_version_id where present.

## Versioning, publish, preview, rollback

Versioning applies to TemplateVersion, MockupVersion, PlatformPackVersion, NichePackVersion, CopyPromptVersion, and ListingPackCopyVersion. The pattern is the same for each:

- A draft version is created first, never published directly from an edit to a live version.
- Preview uses the draft version with a real product render, never with fake product content. For a mockup, preview is a real product render inside the frame. For a template, preview is a real product render inside the template. For a platform pack, preview is a listing pack rendered against the draft pack version, with its limits shown, not silently applied.
- Publish marks one version as published and retires the previous published version. Only one published version exists per parent at a time.
- Rollback creates a new version whose definition is copied from an older version, then publishes that new version. History is never overwritten. The old versions stay retired, not deleted.
- Every publish and every rollback is recorded in AdminAuditLog, with admin_user_id, action, target_type, target_id, and reason.
- A ListingPack records the exact versions it used: template_version_id on each ListingPackImage, mockup_version_id where a mockup is used, pack_version_id on the ListingPack itself, niche_pack_version_id, and copy_prompt_version_id on ListingPackCopy. An old listing pack keeps its old versions even after a new version is published. An export records the same pack_version_id, so an export can be traced back to the exact rules that produced it.

## Expansion proof

A new platform pack must be addable without changing existing Etsy listings, templates, or exports, and without a migration that renames existing data. This design supports that proof in four ways:

1. No per platform columns exist. A new platform is a new Platform row, a new PlatformPack row, and a new PlatformPackVersion row, plus PlatformRule rows for its verified rules.
2. Templates, mockups, niche packs, and copy prompts are platform neutral. They carry no platform_id. A platform is applied only on ListingPack, ListingPackImage, ListingPackCopy, ReconciliationCheck, Export, and AIUsageLog, through platform_id plus pack_version_id.
3. ListingPack and Export always store pack_version_id. An existing Etsy ListingPack keeps its Etsy pack_version_id when an eBay or Amazon pack is added. Its rules do not change.
4. Limits live in PlatformPackVersion definition_json and in PlatformRule rows, not in code and not in a column per platform. Adding a limit for a new platform is a new pack version, not a schema change.

Expansion test to run before a new pack is called ready, to be confirmed in a test plan, not in this design: create a new PlatformPackVersion for a backlog platform, generate a test ListingPack against it, and confirm that all existing Etsy ListingPacks, TemplateVersions, MockupVersions, and Exports still read their original pack_version_id and still render the same counts and limits.

## Soft delete and data deletion on account request

- Soft delete is the default. User, Product, Template, CopyPrompt, NichePack, Mockup, ListingPack, and ProductSourceFile carry deleted_at. A soft deleted row is hidden from sellers and from listing generation, but stays for history, audit, and rollback until hard delete.
- ShareLinks are deactivated on ListingPack deletion and on account deletion. A deleted pack never stays reachable through an old link.
- Sessions are revoked on account deletion. AuthIdentity rows are removed as part of the account deletion job.
- AccountDeletionRequest records the request, the soft delete time, and the hard delete time. Retention period to be confirmed. Hard delete removes or anonymises the User row and all user owned rows, and deletes export files in object storage. What audit rows are kept after hard delete, and in what anonymised form, is to be confirmed.
- AdminAuditLog rows are not deleted by a single user deletion, except where anonymisation is required. The exact retention rule for AdminAuditLog is to be confirmed.
- No hard delete is run from a normal delete button. Hard delete runs only through the account deletion job, with a status in AccountDeletionRequest.

## Split later note

Same pattern as Global Career Studio. Combined now, split later if needed.

- Every User row and every user owned row carries an edition tag. In this design that is the edition field on User, Product, and ListingPack. Values to be confirmed for Listing Photos Generator. In Global Career Studio the values are nvconsult and commercial, with a default of commercial for rows created without an explicit entry edition. Do not copy those values here without a decision. The edition value records the entry edition, it is not a hard restriction on which edition a user may use later.
- A later split partitions users, products, listing packs, exports, and share links by this edition value, after a separate decision and a test migration.
- A user who uses both editions will have rows in both partitions. That case must be resolved explicitly at split time, not silently assigned to one side.
- Billing products are configured per edition, even on the same payment provider account, so they can be moved apart later. Payment provider to be confirmed.
- Platform packs, templates, mockups, niche packs, and copy prompts are shared config. At split time, decide explicitly whether shared config is copied to both sides, kept on one side, or split by edition. Do not assume shared config splits automatically with user rows.

## Indexes summary, in plain words

- Unique: User email, AuthIdentity provider plus provider user id, Template slug, CopyPrompt slug, NichePack slug, Mockup slug, Platform slug, PlatformPack platform plus slug, Plan slug, FeatureFlag key, ShareLink token hash, ListingPackCopy listing pack id, ListingPackImage listing pack plus position, AICreditLedger user plus period start plus period end, UsageDailyCount user plus date plus event type plus platform plus pack version (null handling to be confirmed).
- Foreign key indexes: every foreign key listed above is indexed, at least user_id, product_id, listing_pack_id, template_id, mockup_id, platform_id, pack_version_id, niche_pack_id, plan_id, and copy_prompt_version_id, so lookups by owner, by product, by pack, and by platform stay fast without scanning whole tables.
- Status and date indexes: status on ListingPack, ReconciliationCheck, Export, Trial, Subscription, and PlatformPackVersion; created_at on Export, ExportEvent, ExportLog, AIUsageLog, AdminAuditLog, and SystemLog; ends_at on Trial; expires_at on Session and ShareLink.
- Soft delete index: deleted_at on User, Product, ListingPack, Template, Mockup, NichePack, and CopyPrompt, so active only queries do not scan deleted rows.

## Tables list

User, AuthIdentity, Session, AccountDeletionRequest, Product, ProductSourceFile, ProductVerifiedFact, ProductRender, ListingPack, ListingPackImage, ListingPackCopy, ListingPackCopyVersion, ReconciliationCheck, ReconciliationCheckItem, Platform, PlatformPack, PlatformPackVersion, PlatformRule, Template, TemplateVersion, CopyPrompt, CopyPromptVersion, NichePack, NichePackVersion, NichePackTemplate, NichePackMockup, Mockup, MockupVersion, Export, ExportEvent, ExportLog, ShareLink, Plan, PlanEntitlement, UserEntitlement, Subscription, Trial, AICreditLedger, AIUsageLog, UsageDailyCount, SystemLog, AdminAuditLog, FeatureFlag.

Total: 41 tables.

End of database design, Phase 1.
