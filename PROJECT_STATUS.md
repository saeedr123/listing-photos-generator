# Listing Photos Generator: Project Status

## Status, 2026-11-05

Phase 1 is complete: research and planning docs only. No code is built. No live site change is made. No spending. No contact with real people. No GitHub push was made in Phase 1 docs work; the parent will push these docs and verify.

Repository, already live: saeedr123/listing-photos-generator, public, owner saeedr123, created by Ali on 2026-11-04, with README.md, IDEA.md, and brainstorming files pushed, all status 201. Local project: ~/workspace/listing-studio/

## Phase 1 files, all checked clean of em dashes and en dashes

- PROMPT.md, 609 lines: full controlling brief, following the Global Career Studio PROMPT.md pattern. Etsy only v1, platform packs, Expansion Proof Rules, Crisp Quality Gate, Premium Mockup Quality rule, Mockup Library easy add flow, reference mockups, competitor listing images reference, Later Platforms backlog, open decisions with no invented values.
- docs/platform-rules.md, 307 lines: verified Etsy, eBay, and Amazon image and listing rules from official sources only, check date 2026-11-05, with conflicts recorded and 23 unverified items in section 6.
- docs/competitor-research.md, 383 lines: real competitors for listing photo and listing pack tools, with sources and dates, billing and cancellation complaint patterns, and 25 unverified items. Prices are secondary source only, no vendor pricing page was directly rechecked on 2026-11-05, so no price in this file may be quoted as verified.
- docs/architecture.md, 783 lines: platform pack architecture, shared core, template engine, Mockup Library, export engine, admin versioning, auth and billing, Expansion Proof Rules, Later Platforms backlog, Crisp Quality Gate, Premium Mockup Quality rule, competitor listing images reference, proof templates.
- docs/database-design.md, 1005 lines: plain design form, no migration yet. Users, products, listing packs, templates, mockups, platform packs, niche packs, exports, subscriptions, entitlements, trials, AI usage, analytics, admin audit log, feature flags. Platform neutral, with platform_id and pack_version_id, never a column per platform.
- docs/mvp-scope-and-open-decisions.md, 171 lines: v1 scope, what is NOT in v1, Phase 2 backlog, Expansion Proof Rules, Later Platforms backlog, Crisp Quality Gate, Premium Mockup Quality rule, competitor listing images reference, open decisions with no invented values.
- references/competitor-listing-images-2026-11-05.md: summary of Ali's 27 premium reference listing images, Hey Morning Studio and Productive Penguin Co sets, structure only, with the do not copy list.

## Decisions from Ali, 2026-11-05, recorded in these docs

- Start building, keep the structure open for all major eshop platforms, initially Etsy and eBay, with Amazon as third. Recommendation used: Etsy first, eBay second, Amazon third / Phase 2.
- V1 narrowed to Etsy only, digital products only. eBay second, Amazon third, later platforms stay in backlog only.
- Later Platforms backlog, after Amazon, in groups: next Shopify, TikTok Shop, Facebook Marketplace, Instagram Shopping; then Walmart Marketplace, Google Shopping, Pinterest Shopping; then Shopee, Lazada, Daraz, plus WooCommerce as a store platform pack. All their rules are to be verified from official sources in Phase 2, before that platform is built. No rules or prices invented for them.
- Expansion Proof Rules, confirmed standing requirement: shared platform neutral core, platform packs are versioned config not code branches, templates and mockups platform neutral plus export adapter, data model platform neutral with platform_id and pack version, all rules admin editable with preview and rollback, expansion test that a new pack can be added without changing existing Etsy listings, templates, or exports, and without a database migration that renames existing data.
- Mockup Library is a core v1 feature. Easy add flow in admin: upload a frame, mark the screen area, set allowed orientations and niche packs, preview with a real product render, then enable, no code change and no deploy, plus duplicate, edit, hide, and rollback.
- Crisp Quality Gate, standing rule: high quality crisp outputs only, not AI junk. Real product renders only at high DPI, never upscale low resolution, block or warn on low resolution, no stretch, no colour change, no crop unless approved, export at Etsy 2000px on the shortest side, AI only for layout and copy, never to invent product content.
- Premium Mockup Quality, standing rule, Ali correction: current mockups are very basic, they need premium quality. Realistic frames with correct perspective, soft realistic shadows and depth, lifestyle or desk scenes, not flat basic rectangles. Adobe Stock is direction and inspiration only, no watermarked previews, unlicensed PSDs, or another seller's mockup images. Frames built in house at high resolution, or properly licensed, licence recorded.
- Reference mockups for the proof templates, structure only: hero redesigned-hero-large-screens-v2.jpg, laptop plus phone, large screens; feature redesigned-feature-itinerary-large-v2.jpg, tablet covering most of the image. Both in workspace/etsy-maid-of-honor/templates-redesigned/, both 3000 by 2000 pixels.
- Competitor listing images reference, structure only: 27 images, Hey Morning Studio and Productive Penguin Co, large serif title, small caps subtitle, blush background, white cards, feature pages with large sheet preview, closing How it works, Why us, FAQ, Ready When You Are pages. Do NOT copy tab counts, review counts, badges, watermarks, branding, sheet screenshots, prices, or device claims from them. Ali's sheet has 12 tabs.
- Domain on hold. Do not check domain availability and do not purchase anything.

## Verified platform rules, in brief

- Etsy: recommended at least 2000px, first photo at least 635px, up to 20 photos and 2 videos 5 to 15 seconds, JPG, GIF, PNG, SVG, HEIC only, sRGB, first photo avoid text overlays and collages, at least one unedited photo of the actual item, title up to 140 characters, up to 13 tags each up to 20 characters, digital files up to 5 files at 20MB each.
- eBay: at least 1 picture, up to 24 pictures, minimum 500px on longest side, recommended about 1600 by 1600px, JPEG, PNG, GIF, TIFF, BMP, WEBP, HEIC, AVIF, max 12MB each, main photo whole item face on, no borders, text, artwork or watermarks, title up to 80 characters, digital items need eBay approval outside Everything Else.
- Amazon, strictest: 500 to 10,000px on longest side, larger than 1,000px preferred for zoom, main image pure white RGB 255, 255, 255, product fills at least 85 percent of frame, whole product shown once, no text, logos, borders or watermarks, title must not exceed 200 characters, 5 bullet points.

## Main competitor findings, in brief

- No competitor does the full job: images plus title, description, tags and checklist, with reconciliation against the real product.
- Mockup gap is real: Placeit is lifestyle and apparel first, Mockey is POD first, Photoroom edits a photo rather than placing a real digital product in a device frame.
- Billing complaints found: EverBee silent annual renewal with 3 day refund window, Marmalead charged after trial or cancellation with refunds refused, Canva refunds mostly not given and cancellation friction.
- InkFrog is closed, shut down 2026-06-01. Vela renamed Stocksmith 2026-07-01.

## Unverified items, do not build on these

- Platform rules: 23 items in docs/platform-rules.md section 6, including Amazon hard max images, Amazon file size cap, Amazon mandatory aspect ratio, Amazon backend search terms at 250 bytes, and any standard Amazon digital download flow. Etsy hard file size cap and description character limit are also unverified.
- Competitor research: 25 items in docs/competitor-research.md, including direct vendor pricing page recheck on 2026-11-05, which was NOT done, Vela price conflicts, Photoroom free plan conflicts, and Trustpilot scores from small samples.
- A live browser recheck is required before any competitor price is quoted, and before Amazon is built.

## What still needs a premium frame rebuild, question for Ali

The Maid of Honor v2 hero is still the proof layout, but its frame quality must be raised to the premium standard before it is called done. Do not call a basic frame premium. What still needs a premium frame rebuild: the v2 hero frame itself, and the feature tablet frame, both need realistic perspective, soft realistic shadows and depth, and a lifestyle or desk scene, built in house at high resolution or properly licensed, before they are called premium. No premium frame has been built in Phase 1, because Phase 1 is docs only.

## Open decisions, blockers for commercial launch, not for Phase 1 planning

Price, Stripe and VAT, AI provider, domain (on hold), hosting, legal wording, mockup frame licences (which frames are built in house vs licensed, licence source, type, and cost, nothing bought until Ali approves), whether reconciliation should fix or only flag a mismatch, whether the trial should be per account or per listing pack, whether mockups are free for all or premium, which niche pack converts first, template names for templates 7 to 10, and all later platform rules. No values were invented for any of these.

## What is NOT built yet

No code, no database migration, no live site, no Stripe integration, no AI provider integration, no eBay pack, no Amazon pack, no later platform pack, no auto publishing, no video generation, no multi language. Phase 2 code starts only after Ali approves Phase 1.

## Next step, after Ali approves Phase 1

Phase 2, in the order in PROMPT.md: architecture and database design finalisation, design system, auth, template engine with the 2 proof templates first, builder, export engine, AI, monetization, admin, testing, deployment preparation, with eBay and Amazon as later phases, not v1.
