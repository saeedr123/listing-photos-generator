# Listing Photos Generator: app idea

Status: idea only, 2026-11-04. No code started. No prompt approved yet. Domain for the shared tools website is on hold separately.

## Idea in one line
Listing Photos Generator turns a real digital product into a complete, Etsy ready listing pack: images, title, description, tags, and an export checklist, without inventing anything about the product.

## How it works, in 4 steps
1. Upload and confirm the real product: sheet PDFs or screenshots, price, format, and features. The tool reads the actual facts and flags any mismatch.
2. Pick a niche pack and a template set.
3. Generate the listing pack: images in order, a title within Etsy's 140 character limit, description, 13 tags, and a pre publish checklist.
4. Export Etsy ready JPGs, 2000px on the shortest side and under Etsy's size limit, plus a copy paste text pack.

## Proposed v1 scope
- Etsy only, digital products only. Shopify and Amazon listing formats are Phase 2, but the architecture is ready for them.
- 10 image templates: hero, features grid, what is inside, how it works, mobile view, sizes and formats, and similar. Prove it first with 2, hero and features, using the Maid of Honor Planner as the test product, then build the full 10.
- 3 niche packs to test: wedding and events, personal finance, and small business planners. Other niches go to backlog.
- English only in v1. German, French, and Spanish are Phase 2, gated by demand, the same logic as Global Career Studio.
- A reconciliation check before export is mandatory: tab count, price, format (Sheets, not Excel, no .xlsx claim), and claims must match the real product. No silent publish on a mismatch.
- Crisp render rule built in: contain fit, centred, no stretch, no colour change, no crop unless the seller approves it, and a clear warning when landscape content goes into a portrait phone.
- Borrowed from Global Career Studio: GitHub repo as the single source of truth, one integrated app, same login at first, modular so it can split later, 10 distinct templates in v1, nothing hard coded, templates and copy editable in admin with versioning, preview, and rollback, free must be genuinely useful, premium trial 7 days, no card, one per account, downgrade keeps view and download, competitor research first with sources and dates, no fabricated features, reviews, or prices, share and review link, SEO ready copy, analytics that count usage without reading product content.
- Not in v1: auto publishing to Etsy, AI photos pretending to be real product screenshots, and video generation. A video storyboard can be Phase 2.

## NEW: Product Mockup Library (added 2026-11-04, at Ali's request)

### What it is
A library of product mockups inside Listing Photos Generator. The seller's real product screenshot or sheet render is placed inside a device or scene frame, so a listing image looks like a finished product photo instead of a flat screenshot. The screen inside the mockup is always the seller's real product. The mockup never invents product content.

### Starter mockups for v1
- Laptop alone, straight on, for desktop products such as Google Sheets planners
- Phone alone, straight on, for mobile view
- Tablet alone, straight on
- Laptop plus phone hero, the combination already proven in the Maid of Honor Planner blush set
- Flat feature frame, for a single sheet or feature close up
- Straight device versions are the default, because they are Canva friendly with no warp needed. Tilted phone versions are an option, not the default, because a tilted phone warp needs Photopea style warping and can leave white bands.

### Expandable by design, not a fixed set
- Mockups are admin managed, not hard coded. New mockups can be added, duplicated, edited, enabled, or hidden without a code change, with preview and versioning, the same rule as templates and copy.
- A mockup entry holds: frame image, screen area coordinates, allowed screen orientations, background, and which niche packs it suits. Nothing about the seller's product is stored in the mockup itself.
- Later additions can include, as Phase 2 or later backlog: desk scene, printed planner or book, social square crop, bundle of devices, seasonal backgrounds, and seller uploaded custom frames, each added only after it is tested for crisp rendering and for the no stretch, no colour change rule.

### Rules carried over from the Maid of Honor Planner work
- Contain fit, centred, no stretch, no colour change, no crop unless the seller approves it.
- Clear warning when a landscape sheet is placed in a portrait phone frame, because it will show as a small band with white above and below unless a portrait screenshot or an approved crop is used.
- Mockup graphics and real screenshots stay labelled differently in the tool. A mockup is a presentation frame. It must never be presented as a real sheet screenshot, and it must never carry another seller's product, watermark, review count, badge, or claim.
- The reconciliation check still applies inside mockups: tab count, price, format, and claims shown on or around the mockup must match the real product.

### Why this fits
This fixes the exact pain from the Maid of Honor Planner work: a hero that needs a large laptop and phone covering most of the image, a phone that cannot fill with a landscape sheet, and templates that drift between landscape and portrait. With a mockup library, the seller picks a frame that fits the real shape of their product, instead of stretching the product to fit a frame.

## Open decisions, not invented
Price, Stripe and VAT treatment, domain, hosting, AI provider, and repo name and visibility (private recommended pre launch, like Studio).
