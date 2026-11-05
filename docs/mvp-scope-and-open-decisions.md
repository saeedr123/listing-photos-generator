# MVP Scope and Open Decisions, Listing Photos Generator, Phase 1
Date: 5 November 2026
Status: Scope confirmation for Phase 2 onward. Phase 1 docs only. No code is claimed as built from this document. No live site, no spending, no contacting real people.

## Idea in one line
Listing Photos Generator turns a real digital product into a complete, Etsy ready listing pack: images, title, description, tags, and an export checklist, without inventing anything about the product.

## Version 1 scope, what must work before launch

### Platform and product, v1 only
- Etsy only, digital products only.
- eBay is second, Amazon is third, Phase 2. Later platforms stay in backlog only, see the Later Platforms backlog below.
- English only in v1. Other languages are Phase 2, gated by demand.

### Etsy proof first, then the full set
- Prove v1 first with 2 templates, hero and features, using the Maid of Honor Planner as the test product.
- The Maid of Honor Planner is a Google Sheets planner. Task supplied facts used here, not independently rechecked in this file: 12 tabs, USD 13.97 list price, USD 9.78 launch price. Do not invent new facts about the test product.
- Then build the full 10 templates in v1: hero, features grid, what is inside, how it works, mobile view, sizes and formats, and similar. The full list of 10 template names is confirmed in admin before build, and each template must be distinct.
- 3 niche packs in v1: wedding and events, personal finance, small business planners. Other niches go to backlog.
- Every template and niche pack is admin editable with versioning, preview, and rollback. Nothing content bearing is hard coded.

### Listing pack, per product
- Images in order, a title within Etsy's 140 character limit, description, up to 13 tags each up to 20 characters, and a pre publish checklist.
- Export Etsy ready JPGs, 2000px on the shortest side, plus a copy paste text pack.
- Etsy rules used in v1, from docs/platform-rules.md, checked 2026-11-05: recommended at least 2000px, first photo at least 635px, up to 20 photos and 2 videos of 5 to 15 seconds each, title up to 140 characters, up to 13 tags each up to 20 characters.
- SEO ready copy: title, description keywords in the first few sentences, and tags written from the real product facts, not copied from a competitor listing.
- Share and review link for a draft listing pack, so a partner can check it before export.
- Usage analytics that count usage only, without reading product content.

### Reconciliation check, mandatory
- Before export, the tool compares tab count, price, format, and claims against the real product.
- No silent publish on a mismatch. A mismatch blocks export or shows a clear warning with the fix, and the seller fixes the source product or the listing facts.
- Format must match the real product. A Google Sheets product is never described as Excel, and no .xlsx claim is made for a Sheets product.
- No invented numbers, names, reviews, badges, or claims anywhere in the pack.

### Crisp Quality Gate, Ali standing rule
- Real product only. Every screen is a real render at high DPI from the source PDF or screenshot, never an AI generated fake product screenshot.
- No upscale blur. Source is rendered at or above export size before placement. Never upscale a low resolution source to fill a frame. If the source is too low resolution, block export or show a clear warning with the fix.
- No stretch, no colour change, no crop unless the seller approves it. Contain fit, centred, text sharp and legible, no garbled AI text.
- Templates and mockups are high resolution vector and image assets. Export at Etsy size, 2000px on the shortest side, with a quality check before export.
- AI may help with layout, copy, and composition only, never to invent product content. Any AI assisted layout is labelled as a template, not as a real product photo.
- Proof example: Maid of Honor Planner PDF by PDF workflow, render at 300 dpi, place at crisp size, check text, as in workspace/etsy-maid-of-honor/templates-redesigned/.

### Mockup Library, core v1 feature
- A library of product mockups inside Listing Photos Generator. The seller's real product screenshot or sheet render is placed inside a device or scene frame, so a listing image looks like a finished product photo instead of a flat screenshot. The screen inside the mockup is always the seller's real product. The mockup never invents product content.
- Mockups are admin managed, not hard coded. A mockup entry holds: frame image, screen area coordinates, allowed screen orientations, background, and which niche packs it suits. Nothing about the seller's product is stored in the mockup itself.
- Easy add flow, all without a code change and without a deploy: in admin, upload a frame, mark the screen area, set allowed orientations and niche packs, preview it with a real product render, then enable it. Plus duplicate, edit, hide, and rollback.
- Starter mockups in v1: laptop alone, phone alone, tablet alone, laptop plus phone hero, flat feature frame, straight devices as default.
- Straight devices are the default, because they are Canva friendly with no warp needed. Tilted phone versions are an option, not the default, because a tilted phone warp needs Photopea style warping and can leave white bands.
- Clear warning when a landscape sheet is placed in a portrait phone frame, because it will show as a small band with white above and below unless a portrait screenshot or an approved crop is used.
- A listing set should not mix landscape and portrait frames without a reason.
- Mockups and real screenshots stay labelled differently in the tool. A mockup is a presentation frame. It must never be presented as a real sheet screenshot, and it must never carry another seller's product, watermark, review count, badge, or claim.
- The reconciliation check still applies inside mockups: tab count, price, format, and claims shown on or around the mockup must match the real product.
- Later mockup additions, Phase 2 or later backlog only, each added only after a crisp render test: desk scene, printed planner or book, social square crop, bundle of devices, seasonal backgrounds, and seller uploaded custom frames.

### Reference mockups for the proof templates, structure only
- Hero, laptop plus phone, large screens: workspace/etsy-maid-of-honor/templates-redesigned/redesigned-hero-large-screens-v2.jpg
- Feature, tablet covering most of the image: workspace/etsy-maid-of-honor/templates-redesigned/redesigned-feature-itinerary-large-v2.jpg
- Mirror structure only: device size and position, background, title and subtitle placement, bottom pill bar.
- Do NOT copy competitor badges, review counts, watermarks, or claims, and do NOT lift another seller's product screen into a template.
- If Ali sends a new reference mockup, use that one instead for that mockup only, structure only.

### Competitor listing images reference, structure only, Ali, 2026-11-05
- Ali sent 27 premium reference listing images for Maid of Honor or similar tracker mockups. Full summary: workspace/listing-studio/references/competitor-listing-images-2026-11-05.md. Source files are in workspace/user/media_library/image/. Sets: Hey Morning Studio and Productive Penguin Co Maid of Honor Planner sets.
- Take idea from them, structure only: premium layout, large serif title, small caps subtitle with bold key words, soft blush background, white cards with soft shadow, feature pages with one benefit title and a large real sheet preview, device mockups with realistic shadows and depth, closing pages for How it works in 3 steps, Why us in 3 cards, FAQ in 4 cards, and Ready When You Are with Instant Download, Instruction, Support, plus a reviews panel layout.
- Do NOT copy, ever: 20 Tabs or 16 Tabs or any tab count that is not the seller's real count (Ali's sheet has 12 tabs), 13,000 plus customers or 700 plus reviews or any review text or names, Chartered Accountant, ADHD Friendly, Excel, Works On Any Device, or Choose Any Currency badges unless verified for the real product, Hey Morning Studio watermark or Productive Penguin Co branding, any sheet screenshot inside those images (another seller's product), or any price or device claim from them.
- Replace all competitor content with the seller's verified content, checked by the reconciliation check. If a layout cannot be built with real content at crisp quality, do not fake it with AI generated product content.

### Premium Mockup Quality, standing rule, Ali correction 2026-11-05
- Current mockups are very basic. They need premium quality. Do not call a basic frame premium.
- Reference Ali sent, for direction and inspiration only: Adobe Stock mockups search, 158,380 results, https://stock.adobe.com/cz/search/templates?k=mockups
- Relevant premium examples from that reference: Laptop Air Mockup Presentation Screen Set, Modern laptop on a desk mockup, Laptop and Smartphone Mockup, Isolated laptop and smartphone mockup set, Phone Mockup 15 Pro Set, Smartphone Screen Mockup In Woman Handheld, Modern Monitor Mockup.
- Premium means: realistic device frames with correct perspective, soft realistic shadows and depth, lifestyle or desk scenes, not flat basic rectangles with a plain background. Devices must look like real photos, screens must stay crisp, text must stay sharp.
- The Maid of Honor v2 hero is still the proof layout, but its frame quality must be raised to this premium standard before it is called done.
- Licensing guardrail: use Adobe Stock only as direction and inspiration. Do NOT lift watermarked previews, unlicensed PSDs, or another seller's mockup images into the tool. Premium frames must be built in house at high resolution, or properly licensed, with the licence recorded.
- If a frame needs a licence, list it as an open decision with no price invented. Do not buy anything.

### Free and trial, starting defaults, all configurable in admin
- Free must be genuinely useful. A free pack the seller cannot publish is not a free pack.
- Trial starting default: 7 days, no card, one per account.
- Downgrade keeps view and download.
- Free limit, premium price, trial length, and export allowance are admin editable with preview and rollback. No price is set in this file.

### Auth and accounts
- Same login first, modular so it can split later. One integrated app at first, following the Global Career Studio pattern.
- One account, one profile at first. No second separate builder for NVConsult.

## What is NOT in v1
- eBay, Amazon, or any later platform pack. Etsy only in v1.
- Auto publishing to Etsy.
- AI photos pretending to be real product screenshots.
- Video generation. A video storyboard can be Phase 2.
- Multi language listings. English only in v1.
- Physical products. Digital products only in v1.
- A job board, employer tools, or visa advice. Visa advice stays on NVConsult, with a link, not inside this tool.
- Any invented price, invented legal wording, or fake payment flow.

## Phase 2 backlog, explicitly not version 1
- eBay pack, second. Note from docs/platform-rules.md: eBay digital delivery is restricted and the classified ad route is unresolved. Treat eBay digital as blocked pending a live check in the eBay sell flow. Do not build an eBay digital download pack as a standard Buy It Now listing.
- Amazon pack, third. Amazon is strictest: main image pure white, product fills at least 85 percent, title must not exceed 200 characters. 23 items in docs/platform-rules.md are marked unverified for Amazon. Do not build Amazon logic on unverified rules. A live recheck of Amazon rules is required before Amazon is built, including the reported 75 plus 125 character title split and the hard image cap.
- Later platforms, in groups, see the Later Platforms backlog below.
- Shopify and Amazon listing formats, built on the same reconciliation and export engine.
- Video storyboard for a listing video, not video generation in v1.
- Multi language listings, gated by demand: German, French, and Spanish only after demand is shown, same logic as Global Career Studio.
- Later mockups: desk scene, printed planner or book, social square crop, bundle of devices, seasonal backgrounds, seller uploaded custom frames.
- Later niche packs beyond the v1 three.
- Templates beyond the v1 10, only after the v1 10 are proved.

## Expansion Proof Rules, Ali confirmed standing requirement
- Shared platform neutral core. Platform packs are versioned config, not code branches.
- Templates and mockups are platform neutral, plus an export adapter per platform.
- Data model is platform neutral, with platform_id and pack version. Never per platform columns.
- All sizes, limits, copy prompts, niche rules, pricing, and trial limits are admin editable with preview and rollback.
- Expansion test: a new pack can be added without changing existing Etsy listings, templates, or exports, and without a migration that renames existing data.
- These rules are recorded here and in docs/competitor-research.md, and they apply to every later platform pack.

## Later Platforms backlog, after Amazon, in groups
Rules for each platform are to be verified from official sources in Phase 2, before that platform is built. Do NOT invent their image rules or prices.

Group 1, next after Amazon:
- Shopify. Why it fits: own store product pages.
- TikTok Shop. Why it fits: fits Ali's TikTok traffic.
- Facebook Marketplace. Why it fits: social commerce.
- Instagram Shopping. Why it fits: social commerce.

Group 2:
- Walmart Marketplace. Why it fits: large US marketplace.
- Google Shopping. Why it fits: large US marketplace.
- Pinterest Shopping. Why it fits: vertical lifestyle discovery.

Group 3:
- Shopee. Why it fits: Asia region marketplace.
- Lazada. Why it fits: Asia region marketplace.
- Daraz. Why it fits: Pakistan region marketplace.
- WooCommerce, as a store platform pack. Why it fits: own store product pages.

## Competitor findings used in this scope
From docs/competitor-research.md, checked 2026-11-05:
- No competitor does the full job: images plus title, description, tags, checklist, with reconciliation.
- Mockup gap is real. Placeit is lifestyle and apparel first. Mockey is print on demand first. Photoroom edits a photo rather than placing a real digital product in a device frame.
- Billing complaints found: EverBee silent annual renewal with 3 day refund window, Marmalead charged after trial or cancellation with refunds refused, Canva refunds mostly not given and cancellation friction. Listing Photos Generator must publish its free limit, price, trial, and refund terms in plain words, with renewal reminders, not hide them.
- Prices in docs/competitor-research.md are SECONDARY SOURCE ONLY. No vendor pricing page was directly rechecked on 2026-11-05. Do NOT quote any competitor price as verified. Mark prices as secondary only and needing a live recheck before any pricing decision.
- InkFrog is closed, shut down 2026-06-01. Do not use it as a live competitor.
- Vela renamed Stocksmith on 2026-07-01.

## Definition of done, for every later phase
Code is in the repository, tests pass, the feature is tested as a visitor (logged out where relevant, mobile, full click through), export output is inspected where relevant, docs are updated, and project status is updated. A preview or screenshot alone does not count as done. Never claim a feature is complete unless it works and has been tested.

## Open decisions, blockers for commercial launch, not for Phase 1 planning
No value is invented for any item below. Until these are decided, build with configuration and placeholders, not with invented prices, invented legal wording, or a fake payment flow.

1. Price: Premium monthly and annual price, currency, free limit, and any regional pricing. A live recheck of competitor prices is required before any pricing decision, because prices in docs/competitor-research.md are secondary source only and were not directly rechecked on 2026-11-05.
2. Stripe and VAT: Account owner, business details, VAT treatment confirmation with accountant, invoice format, refund policy, and trial and billing disclosure wording.
3. AI provider: Provider, model, budget cap, fallback provider, and credit cost per generation.
4. Domain: Domain or subdomain for the tools site. Domain is on hold. Do not check or buy a domain.
5. Hosting: App host, hosted database provider, object storage provider, backup and rollback plan, data location for GDPR.
6. GitHub: Repository name and visibility. Decided and already live: saeedr123/listing-photos-generator, public, owner saeedr123, with README.md, IDEA.md, and brainstorming files pushed on 2026-11-04, all status 201.
7. Legal: Privacy policy, terms, refund policy, and trial and billing disclosure final wording, with a legal check for GDPR and consumer rights.
8. Mockup frame licences: If a premium frame needs a licence, list it here with no price invented. Do not buy anything. Licence must be recorded for every licensed frame used.
9. Amazon rules recheck: Live recheck of Amazon rules in Seller Central before Amazon is built, including title fields, image cap, file size cap, and digital download route. Do not build Amazon logic on the 23 unverified items in docs/platform-rules.md.
10. eBay digital route check: Live check in the eBay sell flow before any eBay digital pack is built, because the classified ad route is unresolved.
11. Brand: Final brand presentation for Listing Photos Generator versus NVConsult, logo, colours, and footer operator line, consistent with NVConsult trade name rules where the link is shown.
12. Launch market: Primary launch market for pricing and niche packs, and whether EUR or USD is the launch currency.

## Phase 2 next steps, after Ali approves Phase 1
- Finalize architecture and database design, with platform neutral data model, platform_id and pack version, per the Expansion Proof Rules above.
- Build the template engine with the first 2 templates as a proof, hero and features, using the Maid of Honor Planner, and prove Etsy export quality before adding the remaining 8.
- Build the Mockup Library with the starter set at premium quality, per the Premium Mockup Quality rule above, and prove the easy add flow in admin before adding later mockups.
- Then build the listing pack generator, reconciliation check, and export, in that order, with export tests after each template batch.

End of MVP scope and open decisions, Phase 1.
