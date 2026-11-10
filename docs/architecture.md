# Listing Photos Generator: Architecture

Status: Phase 1 planning document, 2026-11-05. No code started. No live site. No spending. No domain purchase. No contact with real people. This document is the architecture record only. It does not claim any feature is built.

Decisions in this document come from Ali, 2026-11-05, and from the source files listed below. Where a value is not decided, this document says so and does not invent it.

Source files used:
- `~/workspace/listing-studio/IDEA.md`
- `~/workspace/listing-studio/brainstorming/product-ideas.md`
- `~/workspace/listing-studio/brainstorming/mockup-ideas.md`
- `~/workspace/listing-studio/docs/platform-rules.md`, check date 2026-11-05, 307 lines in the source file as supplied
- `~/workspace/global-career-studio/PROMPT.md`, sections 0, 2, 16 and 17, for the Global Career Studio pattern

Style rule for this file: no em dashes and no en dashes anywhere. Commas, colons, periods, parentheses and hyphens are used instead.

## 1. Product overview

### 1.1 Idea in one line

Listing Photos Generator turns a real digital product into a complete, Etsy ready listing pack: images, title, description, tags, and an export checklist, without inventing anything about the product.

### 1.2 How it works, in 4 steps

1. Upload and confirm the real product: sheet PDFs or screenshots, price, format, and features. The tool reads the actual facts and flags any mismatch.
2. Pick a niche pack and a template set.
3. Generate the listing pack: images in order, a title within Etsy's 140 character limit, description, 13 tags, and a pre publish checklist.
4. Export Etsy ready JPGs, 2000px on the shortest side and under Etsy's size guidance, plus a copy paste text pack.

### 1.3 v1 scope, decided by Ali, 2026-11-05

- Etsy only, digital products only.
- English only in v1. German, French, and Spanish are Phase 2, gated by demand, the same logic as Global Career Studio.
- 10 image templates in v1: hero, features grid, what is inside, how it works, mobile view, sizes and formats, and similar. Prove it first with 2, hero and features, using the Maid of Honor Planner as the test product, then build the full 10.
- 3 niche packs to test: wedding and events, personal finance, and small business planners. Other niches go to backlog.
- Reconciliation check before export is mandatory: tab count, price, format (Sheets, not Excel, no .xlsx claim), and claims must match the real product. No silent publish on a mismatch.
- No auto publishing in v1. No AI photos pretending to be real product screenshots. No video generation in v1. A video storyboard can be Phase 2.
- Free must be genuinely useful. Trial starting default is 7 days, no card, one per account. Downgrade keeps view and download.
- Domain is on hold. Do not check a domain and do not buy a domain.
- Nothing content bearing is hard coded. Everything editable from admin is covered in section 8.

### 1.4 What this product is not

- It is not an Etsy auto publisher. Export produces files and copy paste text. The seller publishes on Etsy.
- It is not a product invention tool. It does not invent features, tab counts, prices, reviews, badges, or claims.
- It is not a video generator in v1.
- It is not a CV tool. Do not copy CV content from Global Career Studio. Only the delivery, auth, admin, and modular engine patterns are borrowed, as described in section 12.

### 1.5 Test product

The Maid of Honor Planner, a Google Sheets product, is the v1 proof product. Prove hero and features first with real renders from that product, then build the remaining 8 templates. The proof templates are defined in section 5.5 and section 5.6.

## 2. System diagram, text form

```
Seller
  |
  v
Web app (Next.js)
  |-- Upload and product facts (PDF, screenshot, price, format, features)
  |-- Reconciliation check (facts vs product, block or warn on mismatch)
  |-- Template engine (platform neutral layouts)
  |-- Mockup library (platform neutral frames, screen area, preview)
  |-- Copy engine (title, description, tags, checklist, per platform pack)
  |-- Export engine (render, quality gate, platform export adapter)
  |-- Dashboard (listings, exports, credits, subscription, settings)
  |
  v
Shared core (no platform names, sizes, limits or rules inside)
  |-- Upload service, reconciliation service, template engine,
  |   mockup library, export service, auth, billing, analytics
  |
  v
Platform packs (config, versioned, admin editable)
  |-- Etsy pack v1 (live in v1)
  |-- eBay pack (Phase 2, disabled in v1)
  |-- Amazon pack (Phase 2, disabled in v1)
  |-- Later packs (backlog only, section 14)
  |
  v
Storage and jobs
  |-- PostgreSQL (platform neutral data model, section 11)
  |-- Object storage (uploads, renders, exports, signed access)
  |-- Background jobs (render and export jobs that take time)
  |
  v
Admin
  |-- Templates, mockups, copy prompts, niche packs, platform packs,
  |   pricing, trial limits, feature flags, users, logs, analytics
  |-- Versioning, preview, publish, rollback for every change
```

Reading rule for the diagram: the seller never touches the core directly. Every platform rule reaches the seller only through a platform pack. Every template and mockup reaches the seller only through the shared core. Admin changes a pack or a template. The core does not change when a pack changes.

## 3. Platform pack architecture

### 3.1 Principle

The product is one shared core plus separate platform packs. A platform is never a code branch in the core. A platform is a versioned pack of configuration.

This is Ali's confirmed Expansion Proof Rules requirement, stated in full in section 13. This section states how the architecture implements it.

### 3.2 What a platform pack contains

Each platform pack holds, as configuration, not as hard coded core logic:

- Pack identity: platform_id, pack name, pack version, status (draft, preview, enabled, disabled, retired), last verified date, source notes, reviewer.
- Image sizes: export width and height, shortest side minimum, recommended size, maximum size where verified, aspect ratio guidance where verified.
- Image count: maximum images, minimum images, video count and duration where verified.
- File rules: accepted export formats, file size guidance where verified, colour profile where verified.
- Background and text rules: main image background rule, text on main image rule, text on later images rule, watermark rule, border rule, collage rule.
- Title rules: maximum characters, word guidance, banned patterns where verified, required fields where verified.
- Tag and keyword rules: tag count, per tag character limit, allowed characters, keyword placement rules where verified.
- Description rules: description guidance, keyword placement guidance, character limit only where verified.
- Digital product rules: file count, per file size limit, file types, file name rules, variations rule, delivery rule, where verified for that platform.
- Niche suitability: which niche packs suit this platform, and any niche restriction where verified.
- Export settings: export format, quality setting, naming pattern, file ordering, checklist items for that platform.
- Copy prompts: title prompt, description prompt, tag prompt, checklist prompt, as admin editable text, versioned with the pack.
- Feature flags: whether the pack is visible to free users, premium users, trial users, or admin preview only.
- Rollback target: previous pack version to restore if the new version fails review.

A pack must not contain seller product data, seller prices, or seller claims. A pack contains rules only.

### 3.3 Pack lifecycle

1. Draft: admin creates or edits a pack. It is not visible to sellers.
2. Preview: admin previews the pack against a real test listing, with real product renders, and checks every export setting.
3. Enable: admin publishes the pack version. Sellers see it only after publish.
4. Disable: admin disables a pack without deleting it. Existing listings that used it keep their platform_id and pack version, and keep exporting with the version they were made with, unless Ali decides otherwise in a separate decision.
5. Rollback: admin restores a previous pack version. Rollback does not change the core and does not change other packs.
6. Retire: admin retires a pack only after existing listings are handled by a separate migration decision. Retire is never silent.

### 3.4 Etsy pack, v1, the only enabled pack

The Etsy pack is the only enabled pack in v1. Its verified values are in section 7. Every value in the Etsy pack must cite the source in `platform-rules.md` and the check date 2026-11-05. If Etsy changes a rule, admin updates the pack version, records the new source and new check date, previews it, and publishes it. The core does not change.

### 3.5 eBay pack and Amazon pack, Phase 2

eBay is second. Amazon is third, in Phase 2. Both packs exist only as disabled draft placeholders in v1, if they exist at all. They must not be enabled until their rules are rechecked on official sources and recorded in `platform-rules.md` with a new check date.

Known limits from `platform-rules.md`, check date 2026-11-05, that the Phase 2 packs must respect:

- eBay digital is blocked pending a live check in the eBay sell flow. Do not build an eBay digital download pack as a standard Buy It Now listing. eBay in Phase 1 is for physical delivery or for a physical media version only, not a direct equivalent of the Etsy instant download flow. The classified ad route conflict is unresolved.
- Amazon is a physical product marketplace in the verified rules. No standard Amazon digital download listing flow equivalent to Etsy instant downloads was verified. The Amazon pack in Phase 2 must be treated as a physical presentation pack first, unless a separate verified digital route is found and recorded.
- Amazon main image rules are strict: pure white background, product fill at least 85 percent, no text, logos, borders, colour blocks, or watermarks on the main image. A device frame mockup is not a compliant Amazon main image.
- Do not reuse one title or one set of tags across platforms. Etsy, eBay, and Amazon have different title limits and different tag and keyword systems. Generate a separate title and separate keywords per platform from the same verified product facts.

### 3.6 Unverified rules, hard boundary

`platform-rules.md` section 6 lists 23 unverified items. Do not build generator logic on any of them. Do not guess a number for any of them. A pack field for an unverified rule stays empty or marked UNVERIFIED in admin, with no value exported to sellers, until that rule is verified on an official page and the file is updated with a source URL and a new check date. This includes, as examples only: an Etsy hard maximum file size in MB, an Etsy description character limit, an Amazon hard maximum image count, an Amazon file size cap in MB, and an Amazon backend search terms limit.

## 4. Shared core modules and their boundaries

The shared core is platform neutral. No platform name, size, limit, or rule lives inside the core. The core provides the same services to every pack.

### 4.1 Module list

| Module | Owns | Does not own |
|---|---|---|
| Upload | File intake, type and size validation, virus and content checks as configured, storage reference, original file preservation | Platform image rules, product facts, reconciliation decisions |
| Product facts | Seller confirmed facts: price, format, tab count, features, claims, source files | Platform copy, platform export settings |
| Reconciliation | Comparison of facts vs source product, mismatch list, block or warn decision, checklist output | Fixing the seller's source product, publishing to a platform |
| Template engine | Layout, slots, text placement, style tokens, rendering abstraction | Platform sizes, platform text rules, seller product content |
| Mockup library | Frame registry, screen area, orientation rules, preview render, versioning | Seller product content, platform export settings |
| Copy engine | Title, description, tags, checklist generation from verified facts and pack prompts | Inventing product facts, platform rules |
| Export engine | Render at export size, quality gate, format conversion, file naming, export job queue | Platform rules, publishing to a platform |
| Auth | Accounts, sessions, roles, edition tag, login split readiness | Billing prices, template content |
| Billing | Plans, entitlements, trial state, subscription state, invoice records | Template content, platform rules |
| Analytics | Aggregated counts only, section 10 | Product content, personal text, reading seller files for analytics |
| Admin | Versioning, preview, publish, rollback, feature flags, user management, logs | Seller product content, live publishing |

### 4.2 Boundaries, stated plainly

- Upload does not decide if a listing is ready. Reconciliation decides that.
- Template engine does not know Etsy is 2000px. The Etsy pack tells the export adapter that size at export time.
- Mockup library does not know a platform. It knows a frame, a screen area, and allowed orientations. The export adapter applies the platform size.
- Copy engine does not invent facts. It only uses seller confirmed facts and pack prompts. If a fact is missing, it asks the seller, it does not fill the gap.
- Export engine does not publish. It produces files and a text pack. Publishing is the seller's action on the platform.
- Auth does not know prices. Billing does not know template layouts.
- Analytics does not read product content. It counts events only.

### 4.3 Shared engine, split later

Follow the Global Career Studio pattern, PROMPT.md section 2.6:

- Shared template and export engine: templates, rendering, and export live in one package, used by every edition and every platform pack.
- Separate skins and copy per edition: branding, header, landing copy, buttons, and help links are edition configuration, never hard coded into the engine.
- Modular auth service: auth is a separate module with a clear interface, so a later split is a configuration and migration task, not a rewrite.
- Edition tag on every user and listing: each User row and each Listing row carries an edition value recording the entry edition. A user who uses more than one edition will have listings in more than one partition, and that case must be resolved explicitly at split time, not silently assigned to one side.
- Separate billing products per edition, even on the same Stripe account, so they can be moved apart without changing prices for the other edition. Stripe is on hold, see section 9.3. This is a design rule now, not a payment build now.
- Separate entry points: nvconsult.eu is the NVConsult journey, the tools site is the commercial journey, even though both open the same application now. The tools site domain is on hold. Use placeholder domain configuration only.

## 5. Template engine

### 5.1 What a template is

A template is a platform neutral layout plus slots. A template is never built for one platform only unless it is marked as such in admin. The platform export adapter applies the platform size, ratio, and file rules at export time.

A template definition holds:

- Template id, name, version, status, niche packs it suits, intended use.
- Layout structure: sections, order, grid, spacing, text slots, image slots, mockup slots.
- Style tokens: fonts, colours, sizes, spacing, all editable in admin, none hard coded in components where admin copy is required.
- Text slots: title slot, subtitle slot, feature list slot, footer slot, pill bar slot, each with a maximum length rule from the pack at render time, not from the template alone.
- Image slots: hero slot, feature slot, device slot, each with a fit rule (contain, centred, no stretch, no colour change, no crop unless approved).
- Sample content flag: sample text is clearly marked as sample, replaceable in one action, and never exported as if it were the seller's real product.

### 5.2 Distinctness test

A template counts as distinct only if it differs in layout structure, section order, and typography system, not only in colour. Colour variants of the same layout do not count toward the 10. Each template must be documented with its layout, intended market, and best use case. This mirrors the Global Career Studio template distinctness test.

### 5.3 v1 template set, 10 templates

Prove first with 2, hero and features, using the Maid of Honor Planner. Then build the full 10. The set, from IDEA.md, is: hero, features grid, what is inside, how it works, mobile view, sizes and formats, and similar templates to complete the 10. The exact names of templates 7 to 10 are an admin decision at build time, recorded in the template registry, not invented here.

### 5.4 Template lifecycle

Same as a platform pack: draft, preview, publish, disable, rollback. A published template must not change silently for existing sellers without a version note. Every change creates a new version. Preview uses a real product render, not placeholder text, before publish.

### 5.5 Proof templates, reference mockups to mirror, structure only

This is the proof set for v1. Do not invent a new style for these two proof templates. Mirror the structure of the two reference files already in the workspace. Mirror structure only: device size and position, background, title and subtitle placement, and bottom pill bar.

Reference files, verified in the workspace on 2026-11-05:

- Hero, laptop plus phone, large screens:
  `workspace/etsy-maid-of-honor/templates-redesigned/redesigned-hero-large-screens-v2.jpg`
  Size verified: 403,972 bytes, dated Nov 3, 13:52. Dimensions verified: 3000 by 2000 pixels.
- Feature, tablet covering most of the image:
  `workspace/etsy-maid-of-honor/templates-redesigned/redesigned-feature-itinerary-large-v2.jpg`
  Size verified: 422,012 bytes, dated Nov 3, 13:52. Dimensions verified: 3000 by 2000 pixels.

What to mirror, structure only:

- Hero: laptop plus phone, large screens covering most of the image, title and subtitle placement above or beside the devices as in the reference, bottom pill bar as in the reference.
- Feature: tablet covering most of the image, title and subtitle placement as in the reference, bottom pill bar as in the reference.

What NOT to copy:

- Do not copy any competitor badges, review counts, watermarks, or claims from reference sets.
- Do not lift another seller's product screen into a template. The screen inside every proof template must be the seller's own real product render, from the Maid of Honor Planner source in v1 proof work, or from the seller's own upload in live use.
- Do not copy text claims from a reference file as if they were product facts. Text in a proof template comes only from the reconciliation checked product facts.

Replacement rule: if Ali sends a new reference mockup in chat, the parent will pass it on. Use that new reference instead for that mockup only, structure only, with the same no copy rules above. Do not apply a new reference to the other proof template unless Ali says so.

### 5.6 Premium Mockup Quality rule, standing rule, Ali correction, 2026-11-05

Current mockups are very basic. They need premium quality. This is a standing rule for the mockup library and for the proof templates.

Reference for direction only: Adobe Stock mockups search, 158,380 results, at https://stock.adobe.com/cz/search/templates?k=mockups

Relevant premium examples from that search, for direction only:

- Laptop Air Mockup Presentation Screen Set
- Modern laptop on a desk mockup
- Laptop and Smartphone Mockup
- Isolated laptop and smartphone mockup set
- Phone Mockup 15 Pro Set
- Smartphone Screen Mockup In Woman Handheld
- Modern Monitor Mockup

Premium means:

- Realistic device frames with correct perspective.
- Soft realistic shadows and depth.
- Lifestyle or desk scenes, not flat basic rectangles with a plain background.
- Devices must look like real photos.
- Screens must stay crisp.
- Text must stay sharp.

The Maid of Honor v2 hero in section 5.5 is still the proof layout, but its frame quality must be raised to this premium standard before it is called done. Do not call a basic frame premium. A basic frame is a basic frame until it meets the premium points above and passes the Crisp Quality Gate in section 15.

Licensing guardrail, mandatory:

- Use Adobe Stock only as direction and inspiration.
- Do not lift watermarked previews, unlicensed PSDs, or another seller's mockup images into the tool.
- Premium frames must be built in house at high resolution, or properly licensed, with the licence recorded in admin against the mockup version.
- If a frame needs a licence, list it as an open decision with no price invented. Do not buy anything. Do not invent a licence price or a licence term.
- A mockup with no licence record, where a licence is required, stays in draft and is not published.

### 5.7 Competitor listing images reference, structure only, Ali, 2026-11-05

Ali sent 27 premium reference listing images for Maid of Honor or similar tracker mockups. Full summary: workspace/listing-studio/references/competitor-listing-images-2026-11-05.md. Source files are in workspace/user/media_library/image/. Sets: Hey Morning Studio and Productive Penguin Co Maid of Honor Planner sets.

Take idea from them, structure only: premium layout, large serif title, small caps subtitle with bold key words, soft blush background, white cards with soft shadow, feature pages with one benefit title and a large real sheet preview, device mockups with realistic shadows and depth, closing pages for How it works in 3 steps, Why us in 3 cards, FAQ in 4 cards, and Ready When You Are with Instant Download, Instruction, Support, plus a reviews panel layout.

Do NOT copy, ever: 20 Tabs or 16 Tabs or any tab count that is not the seller's real count (Ali's sheet has 12 tabs), 13,000 plus customers or 700 plus reviews or any review text or names, Chartered Accountant, ADHD Friendly, Excel, Works On Any Device, or Choose Any Currency badges unless verified for the real product, Hey Morning Studio watermark or Productive Penguin Co branding, any sheet screenshot inside those images (another seller's product), or any price or device claim from them.

Replace all competitor content with the seller's verified content, checked by the reconciliation check. If a layout cannot be built with real content at crisp quality, do not fake it with AI generated product content.

### 5.8 Niche packs

Niche packs are configuration, not code. A niche pack holds: niche id, name, version, copy prompts, template set, mockup set, colour and style tokens, and suitability notes. v1 niche packs to test: wedding and events, personal finance, and small business planners. Other niches go to backlog. A niche pack is added the same way as a platform pack: draft, preview, publish, rollback, with no core change.

## 6. Mockup library

### 6.1 What a mockup is

A mockup is a presentation frame. The screen inside it is always the seller's real product. A mockup never invents features, tab counts, prices, reviews, badges, or claims, and it is never labelled as a real screenshot.

A mockup entry holds: frame image, screen area coordinates, allowed screen orientations, background, and which niche packs it suits. Nothing about the seller's product is stored in the mockup itself.

### 6.2 Mockup library is a core v1 feature

The Mockup Library is a core v1 feature, not a later add on. It lives in the shared core, so every platform pack can use it through the export adapter.

### 6.3 Starter mockups, v1

- Laptop alone, straight on, for desktop products such as Google Sheets planners.
- Phone alone, straight on, for mobile view.
- Tablet alone, straight on.
- Laptop plus phone hero, the combination already proven in the Maid of Honor Planner blush set.
- Flat feature frame, for a single sheet or feature close up.
- Straight device versions are the default, because they are Canva friendly with no warp needed. Tilted phone versions are an option, not the default, because a tilted phone warp needs Photopea style warping and can leave white bands.

Later additions, as Phase 2 or later backlog, each added only after it is tested for crisp rendering and for the no stretch, no colour change rule: desk scene, printed planner or book, social square crop, bundle of devices, seasonal backgrounds, and seller uploaded custom frames.

### 6.4 Easy add flow, admin, no code change and no deploy

In admin, to add a mockup:

1. Upload a frame: upload the high resolution frame image. The frame must meet the Premium Mockup Quality rule in section 5.6 and the Crisp Quality Gate in section 15 before it can be published.
2. Mark the screen area: mark the screen area coordinates on the frame, with a preview that shows the area on the frame.
3. Set allowed orientations and niche packs: set which screen orientations are allowed (landscape, portrait, or both, with a warning rule for a mismatch), and which niche packs the mockup suits.
4. Preview it with a real product render: preview the mockup with a real product render placed in the screen area, at export size, and check text sharpness, fit, and colour.
5. Enable it: publish the mockup version. Enabling needs no code change and no deploy.

Also support, without a code change and without a deploy: duplicate, edit, hide, and rollback to a previous version. Every change creates a new mockup version, with preview, publish, and rollback, the same rule as templates and copy.

A new mockup is only added to the live library after a crisp render test: contain fit, centred, no stretch, no colour change, no crop unless approved.

### 6.5 Fit problems the mockup engine must solve

- Landscape sheet in a portrait phone: show a warning, offer a portrait screenshot or an approved crop, never stretch to fill. A landscape sheet in a portrait phone will show as a small band with white above and below unless a portrait screenshot or an approved crop is used.
- Wide sheet in a narrow phone: offer zoom out or a horizontal scroll preview note, never pretend the sheet is phone optimised when it is not.
- Straight versus tilted: straight is the default. Tilted needs a warp step, like Photopea, and must be tested for white bands and blur.
- Orientation consistency: a listing set should not mix landscape and portrait frames without a reason. The Maid of Honor Template 08 portrait slip is the warning example.
- Mockups are supporting images on Etsy and eBay, where a clean main image is still required, and they are not a compliant Amazon main image, which must show the product alone on pure white. Do not use a device frame mockup as the Amazon main image.

### 6.6 Labelling rule

Mockup graphics and real screenshots stay labelled differently in the tool. A mockup is a presentation frame. It must never be presented as a real sheet screenshot, and it must never carry another seller's product, watermark, review count, badge, or claim. The reconciliation check still applies inside mockups: tab count, price, format, and claims shown on or around the mockup must match the real product.

## 7. Export engine and Etsy export settings

### 7.1 Export engine

The export engine takes a platform neutral listing (templates plus mockups plus copy) and a platform pack, and produces platform ready files through a platform export adapter. The adapter is the only place where platform sizes and file rules are applied.

Export steps:

1. Select the platform pack and pack version for the listing.
2. Render each template and mockup at or above export size, from source PDF or screenshot, at high DPI, before placement.
3. Run the Crisp Quality Gate, section 15, and the reconciliation check, section 8 of the core flow in section 4 and section 7.3 below.
4. Convert to the platform export format, apply the platform colour profile, and name files in platform order.
5. Produce the copy paste text pack: title, description, tags, and checklist, per the pack.
6. Deliver a download: images plus text pack, with an export history record. No auto publishing.

Export failures must show a plain language error and preserve the seller's listing. An export failure must never delete or corrupt the saved listing.

### 7.2 Etsy export settings, verified, check date 2026-11-05

Source: `platform-rules.md`, sections 1.1 to 1.8. All values below are verified on official Etsy pages on 2026-11-05, unless marked UNVERIFIED. Do not build on an UNVERIFIED value.

Image size and ratio:

- Recommended: listing photos at least 2000px width and height.
- First photo minimum for search visibility: first listing photo at least 635px width and height, to avoid showing up lower in searches.
- First photo orientation: first photo should be horizontal (landscape) or square, so the centre focal point appears in cropped thumbnail views.
- Thumbnails crop: use the listing thumbnail adjustment tool to set and preview how the image may look across Etsy. Keep a safe border so the image can be cropped to square, portrait, and landscape thumbnails without losing the product.
- Tension recorded in the source: the same help page says first photo should be horizontal or square, and in its thumbnail section says avoid square crops and upload horizontal or landscape images. Generator rule: use a landscape or square master, keep the product centred with a safe border, and do not rely on edge text surviving a crop.
- UNVERIFIED: a single mandatory aspect ratio for Etsy listing images.

Image count:

- Up to 20 photos and 2 videos, 5 to 15 seconds each, per listing. Note: an older excerpt said 1 video. Use the current page value of 2 videos.

Main image background and text:

- First thumbnail: avoid text overlays, collages, or using a collection of images for the first thumbnail when optimising for search.
- Background: keep the background simple, a clean neutral background ensures the focus stays on the product. This is guidance, not a pure white background rule.
- First photo clarity: make the first listing photo the clearest, most realistic representation of the item buyers will receive.
- Accuracy: all images must accurately reflect the item's true appearance, including colour, condition, scale, and materials.
- Unedited photo: for most products, include at least one unedited photo of the actual item against a real background. This photo does not need to be the first image. Videos can complement photos but do not replace the required unedited photo. See the policy page for exceptions by product type.
- Editing on other images: outside the required unedited photo, photo editing tools including AI may be used to adjust lighting or colour, crop or resize images, or change backgrounds, provided the final result remains an accurate representation. Do not use editing to hide flaws, conceal damage, or edit an item's appearance to make it look different from what the buyer will receive. Do not use images that create false expectations.
- Watermark note on the unedited photo: the policy page says a seller is allowed to crop, add a watermark, resize, or change the file format of the unedited photo, but must not use AI powered tools to do so, otherwise systems may flag the photo as AI edited.
- Consequence for misleading images: if the item received is materially different from the image, Etsy may issue the buyer a refund and the seller may be responsible for the refund amount. Etsy may remove misleading listings. Repeated violations may result in additional enforcement action, up to and including shop removal.

File types and file size:

- Image file types: .jpg, .gif, .png, .svg, or .heic. These are the only image file types Etsy supports. Animated .gif files and transparent .png files are not supported. If a file contains transparency, the transparent parts will appear black on Etsy.
- Practical upload warning: images larger than 1MB in file size may not finish uploading, especially on a slower internet connection.
- UNVERIFIED: a hard maximum file size in MB for Etsy listing images. The official page gives the 1MB upload warning above, not a hard cap. Do not state a hard cap as an Etsy rule.
- Colour profile: convert images to sRGB before uploading to ensure colours on the site match the originals. Etsy converts images to use the sRGB colour profile. CMYK colour profile is for print only.
- UNVERIFIED: a stated maximum pixel dimension for Etsy listing images.

Title:

- Maximum: a listing title can be up to 140 characters long. Consider using less than 15 words when including the traits that make the item special. Clearly state what the item is and any key details. Avoid repetition as well as subjective words, for example "perfect". There is no need to add information about price or shipping to the title. Only include holidays, special occasions, or recipient types if they are essential to what the item is.
- Handbook guidance: consider using less than 15 words, include the most important traits upfront, move subjective words like "perfect" or "beautiful" to the description, try not to repeat words, do not add price, shipping, or sales information.

Tags:

- Count: add up to 13 tags that describe the item.
- Length per tag: each tag can contain up to 20 characters.
- Characters allowed: tags can only include spaces, letters, numbers. A seller is able to use the apostrophe and hyphen within words and phrases, but cannot start a tag with these characters.
- Use: a single tag can be a short descriptive phrase, for example "silver earrings" or "minimalist jewelry". Tags should use accurate and relevant words and phrases. Use a diverse array of tags.
- Handbook advice: add 13 tags to all listings. Tags should be multi-word phrases and use natural sounding language.
- Attributes: attributes also act like tags and can help an item match with a shopper's search. If a phrase appears in attributes, it does not need to be added as a separate tag.
- Description keywords: Etsy search considers keywords and phrases within listing descriptions when ranking listings. Aim to incorporate relevant keywords in the first few sentences. Avoid copying the title verbatim or simply listing top keywords.
- UNVERIFIED: an official Etsy description character limit.

Digital product rules, Etsy:

- Two categories: instant downloads (ready-made files the buyer can access immediately upon purchase) and made-to-order downloads (custom files made to a buyer's specification, sent upon completion).
- Digital files count and size: upload up to 5 digital files. The maximum size for each file is 20 MB. This applies to instant downloads at listing creation and to made-to-order files at order completion.
- Digital file types: .bmp, .doc, .gif, .jpeg, .jpg, .mobi, .mov, .mp3, .mpeg, .pdf, .png, .psp, .rtf, .stl, .txt, .zip, .ePUB, .iBook.
- File names: file names are limited to 70 alphanumeric characters, periods, underscores, or hyphens. The file names buyers see are the same ones uploaded. There is no way of editing the name after uploading.
- No file, no publish: a seller will be unable to publish or save an instant digital listing if there is no file attached to it.
- Variations: no variations for digital items. Variations are unavailable for digital listings.
- Digital delivery: if the listing is for a digital item, buyers will download the files uploaded immediately after purchase.
- Digital image rule: some digital items, like audio files, do not have visual elements. For those listings, representative imagery may be used, including AI generated images, as long as it does not mislead buyers about what they are purchasing. All other digital downloads should include a visual preview or excerpt of the content buyers will receive.
- Generator implication for the Maid of Honor Planner: the pack must show a real visual preview or excerpt of the actual Sheets content, not only a device frame with placeholder text. Mockups are supporting images, not a substitute for a true preview. The preview must match the real tab count, price, format, and claims in the reconciliation check.

Etsy export defaults for this tool, derived only from the verified values above:

- Export format: JPG, sRGB.
- Export size: 2000px on the shortest side. This is the tool default, from the Etsy recommended at least 2000px width and height.
- Export order: hero first, then features and supporting images in listing order, with the unedited preview included as required by the policy.
- Text pack: title up to 140 characters, description with keywords in the first few sentences, 13 tags each up to 20 characters, plus a pre publish checklist.
- Quality gate before export: section 15. No export passes the gate with a low resolution source, a stretched image, or an unreconciled mismatch.

### 7.3 Reconciliation check, mandatory before export

Before export, check tab count, price, format, and claims against the real product. The check compares:

- Tab count in the copy and on images vs tab count in the source product.
- Price in the copy and on images vs seller confirmed price.
- Format in the copy and on images vs real format (Sheets, not Excel, no .xlsx claim unless the real product is .xlsx).
- Claims in the copy and on images vs real features in the source product.

On mismatch: stop a silent publish. Show the mismatch list in plain language, with the source fact and the listing fact side by side, and the fix for each item. The seller fixes the source product or the listing fact, then re-runs the check. The tool does not silently fix a mismatch by changing a product fact.

Open question from brainstorming, not decided: do sellers want the tool to fix a mismatch, or only to flag it and let them fix the source product? Do not build an auto fix until Ali decides.

## 8. Admin, with versioning, preview, rollback, and feature flags

### 8.1 Admin scope

Admin includes: user management, template management, mockup management, AI prompt management, niche pack management, platform pack management, feature controls, free and premium entitlements, trial configuration, subscription management, AI usage analytics, export monitoring, and system logs. This follows Global Career Studio PROMPT.md section 16.

Administrators must be able to add templates, add mockups, change plan limits, change trial rules, add niche packs, add platform packs, and update AI prompts without rewriting application code.

### 8.2 Versioning, preview, publish, rollback

- Versioning for templates, mockups, prompts, niche packs, and platform packs: every change creates a new version, with preview, publish, and rollback. A published template or pack must not change silently for existing sellers without a version note.
- Content governance: platform packs and niche packs show source, last verified date, and reviewer. Out of date packs are flagged for review. Do not silently keep showing an out of date pack as current.
- Preview: preview a new version against a real product render and a real test listing before publish. Preview is not a screenshot alone. It is a full render at export size.
- Rollback: restore a previous version in one action, without a code change and without a deploy, and without changing the core or other packs. Rollback records who rolled back, when, and why.
- Change log: every admin change is logged with time, actor, action, and version, without logging seller product content or secrets.

### 8.3 Feature flags

Turn a template, mockup, language, niche pack, platform pack, or AI feature on or off per plan or globally, without a deployment. Flags cover: free vs premium visibility, trial visibility, admin preview only, and disabled. A disabled item is hidden from sellers but kept in admin with its version history.

### 8.4 Export monitoring

Export success rate, failure rate by template and format, and average export time, without logging product content. Export failures are logged with template id, pack id, pack version, format, and error type, never with the seller's product text or images.

### 8.5 Usage analytics in admin

Counts of listings, exports, AI credits used, trial starts, trial conversions, and cancellations, aggregated, without reading personal product text for analytics. See section 10.

## 9. Auth and billing modules

### 9.1 Auth

- Same login first, modular so it can split later, same pattern as Global Career Studio, PROMPT.md section 2. Auth is a separate module with a clear interface.
- Initially one shared login system for NVConsult and Listing Photos Generator. A later split (separate logins, or single sign on) is a configuration and migration task, not a rewrite.
- Edition tag on every User row and every Listing row, recording the entry edition. Resolve a user who uses both editions explicitly at split time, not silently.
- Secure authentication, role based permissions, rate limiting on auth endpoints, with clear user facing messages when a limit is hit.
- Users can only access their own listings, unless they explicitly share a read only link. Admin access to user listings is logged, limited, and only for support with a recorded reason.
- Account deletion: delete account, listings, uploads, renders, exports, and AI logs for that account on request, with a confirmation and a completion record. Backups must expire on a stated schedule.

### 9.2 Free and premium, starting defaults, configurable, not final pricing

Free, starting defaults, configurable in admin:

- Basic listing pack builder.
- A selected set of templates from the v1 set of 10, configurable in admin.
- Basic AI copy credits, with a clear monthly credit count shown in the dashboard.
- Standard JPG exports.
- Limited listing storage, starting default to be set in admin, configurable.
- No watermark trap: free exports are genuinely usable. Limits are on template choice, listing count, AI credits, and premium exports, not on making the free listing look deliberately broken.

Premium, starting defaults, configurable in admin:

- Access to all 10 v1 templates, and later all templates as they are added.
- Advanced AI copy generation, higher AI usage limits, and niche specific copy tailoring.
- Full mockup library, including premium frames.
- High resolution exports and full export sets.
- More listing storage, configurable.
- Priority for new templates, mockups, niche packs, and platform packs as they are released.

Trial, starting default, configurable in admin:

- Duration: 7 days. No card required. One trial per account. Admin can set additional eligibility rules, for example one trial per payment method or per email domain block for abuse.
- Trial features: full premium features during trial, within a stated AI credit allowance and export allowance set in admin.
- Conversion rules: at trial end, the user downgrades to Free automatically, with no charge if no card was taken, and with a charge only after clear authorization if a card was taken. The user keeps viewing and downloading listings they created. Premium editing, premium templates, premium mockups, and premium exports lock until they subscribe. The system must never lock a user out of viewing their own listing.
- Billing terms disclosure: trial length, what happens at trial end, monthly and annual prices, renewal date, and cancel method must be shown before trial start and before any payment, in plain language, on the checkout and account pages.
- Never charge without appropriate authorization. No dark patterns, no hidden renewal, no pre ticked consent.

Open questions from brainstorming, not decided: is a 7 day trial, no card, one per account, the right trial for a listing tool, or should the trial be per listing pack? Should mockups be free for all, or a premium feature, when the core listing pack is free to build and paid to export in full? Do not decide these here. Record them as open decisions in section 16.

### 9.3 Payments, Stripe, VAT, and open decisions

- Support monthly and annual subscriptions through Stripe, or another suitable provider if Stripe is not available for the business at launch. Annual must show the saving clearly, as monthly equivalent and total.
- Tax and invoicing: as a Czech trade business, include VAT handling and invoice generation for EU customers in the payment design, and confirm the exact VAT treatment with Ali's accountant before launch. Do not invent tax rates in code comments as if they were advice.
- Cancel: cancel in the account, in a small number of clicks, with immediate confirmation, end of period access, and a clear record. Do not require contacting support to cancel.
- Refunds: publish a refund policy before launch, and handle refund requests through Stripe and admin, with a log.
- Stripe status: Stripe is on hold in the Global Career Studio pattern, and no Stripe integration work beyond a null placeholder config is assumed here. Price, Stripe account, VAT treatment, and currency are open decisions for Ali, not invented values. See section 16.
- Separate billing products per edition, even on the same Stripe account, so they can be moved apart without changing prices for the other edition.

### 9.4 Provider agnostic adapters, standing rule, 2026-11-10

Billing, AI, email, object storage, auth, and hosting are all swappable through a provider interface or a config choice. No provider is hard coded into the core. Adding or swapping a provider means registering one implementation and naming it in config. It never means rewriting the builder, the templates, the mockups, or the billing core. No real provider key, account, or live charge exists in this build for any of the six areas. The stub stays the only working provider for billing and AI, the email hook sends nothing until a provider send step is registered, auth runs on the local stub or the Prisma provider, object storage has no provider chosen, and hosting has no provider chosen.

| Area | Interface file | Config key | Working implementation now |
|---|---|---|---|
| Billing | `packages/billing/src/provider.ts` (`BillingProvider`, registry `registerBillingProvider`, resolver `createBillingProvider`) | `billing_provider` in `config/plans.json` (value `stripe_stub`) | `StripeStubProvider` in `packages/billing/src/stripe-stub.ts`, charge always 0. Stripe later is one more registered provider under its own name, with keys in the secure secret store, never in code. |
| AI | `packages/ai/src/provider.ts` (`AiProvider`, registry `registerAiProvider`, resolver `createProvider`) | `provider.name` in `config/copy-prompts.json`, overridable by `AI_PROVIDER` in env (see `packages/ai/src/loaders.ts`) | `DevelopmentStubProvider` in the same file, no network call, no key, no spending. A named provider with no registered factory throws instead of silently using the stub. |
| Email | `packages/billing/src/email-hook.ts` (`EmailHook`, registry `registerEmailProvider`, resolver `createEmailHook`) | `EMAIL_PROVIDER` in env, with `EMAIL_FROM_ADDRESS` and `EMAIL_API_KEY` (see `.env.example`) | No send implementation. The hook returns sent false with reason `no_email_provider_configured` or `email_provider_not_implemented`. A later provider registers a send step only. |
| Object storage | No storage module exists yet, so no interface file exists yet. Files are only `storage_key` references in the data model (see `docs/database-design.md`), never blobs in the database and never a named provider in code. When upload storage is built, it must follow this same rule: one storage interface, one registered implementation, provider named by config. | `OBJECT_STORAGE_PROVIDER` in env (see `.env.example`), with bucket, region, and credentials by env name only | None. No provider chosen, no bucket, no key. |
| Auth | `packages/auth/src/stub-provider.ts` (`AuthProvider` interface), registry `packages/auth/src/provider-registry.ts` (`registerAuthProvider`, `resolveAuthProvider`) | `provider` in `AuthConfig` (`packages/auth/src/config.ts`, value `email`) | `LocalStubAuthProvider` (development only) and `PrismaAuthProvider`, both under the name `email`; server wiring registers the stub in development and the Prisma provider in production. Google sign-in is a separate placeholder in `packages/auth/src/google-provider.ts` and is not an `AuthProvider` implementation yet. |
| Hosting | No host is named in code. Hosting, database, and object storage providers are deployment config choices only (see `docs/deployment.md`). | Env and deployment config only, for example `NEXT_PUBLIC_APP_URL` and `APP_URL` in `.env.example` | None. No hosting provider is chosen, no deployment is executed, no domain is bought. |

Rules for every new provider: the core calls only the interface, never the implementation; the provider name comes from config, never from a hard coded import in the core; an unknown or unregistered provider name throws or reports not configured, it never silently falls back to the stub and pretends to be that provider; credentials live in env or the secure secret store, never in code, config, docs, or logs; and a provider swap is proved by a test that registers a fake second provider, calls it through the interface, and shows the core still works (see `tests/billing-provider.test.mjs`).

## 10. Analytics without reading product content

Analytics measure use, not content. This follows the Global Career Studio rule: usage analytics that count use without reading product content.

Count, aggregated only:

- Signups, trial starts, trial conversions, cancellations, churn.
- Listings created, templates used, mockups used, niche packs used, platform packs used.
- Exports by format, export success and failure, average export time.
- AI credits used, AI suggestions accepted or rejected, by count only.
- Share and review link views, by count only.

Do not track, for analytics or marketing:

- Product text, sheet content, tab names, prices in product files, or personal details in listings.
- Job description text, where a job description is ever pasted for copy tailoring.
- Seller product images, except as needed to render an export the seller requested.

Feedback loop: in product feedback for templates, mockups, and AI suggestions, with a simple rating and optional comment, reviewed in admin, used to improve templates, mockups, and prompts. Feedback is optional and never blocks export.

## 11. Data model, platform neutral

### 11.1 Rule

The data model is platform neutral: platform_id and pack version on listings, templates, mockups, and exports, never a hard coded column per platform such as etsy_size. Adding a platform is adding a pack and rows that reference it, not adding a column.

### 11.2 Core tables, names as logical models, not a final schema

- User: id, edition, email, role, trial state, subscription state, created date, deleted date where applicable.
- Listing: id, user id, edition, platform_id, pack version, niche pack id, template set version, product facts snapshot, reconciliation state, status (draft, ready, exported), created date, updated date.
- ProductSource: id, listing id, file reference, file type, upload date, render reference, DPI and dimensions as measured, never as claimed.
- Template: id, name, version, status, layout definition reference, style tokens, niche pack ids, created date, published date.
- Mockup: id, name, version, status, frame image reference, screen area coordinates, allowed orientations, background, niche pack ids, licence record, created date, published date.
- NichePack: id, name, version, status, copy prompts, template ids, mockup ids, created date.
- PlatformPack: id, platform_id, version, status, sizes, ratios, image count, title rules, tag rules, background and text rules, export settings, niche suitability, copy prompts, last verified date, source notes, reviewer.
- Export: id, listing id, platform_id, pack version, template versions, mockup versions, format, size, file references, quality gate result, reconciliation result, created date.
- CopyPack: id, listing id, platform_id, pack version, title, description, tags, checklist, prompt versions used.
- Entitlement: id, user id, plan, template access, mockup access, export allowance, AI credit allowance, storage limit, valid dates.
- Trial: id, user id, start date, end date, eligibility record, conversion state.
- ShareLink: id, listing id, read only token, expiry, view count.
- AdminLog: id, actor, action, target type, target id, version, time, reason. No product content, no secrets.
- AnalyticsEvent: id, event type, template id, mockup id, platform_id, pack version, plan, time. No product content, no personal text.

### 11.3 Rules for the model

- Every listing, template, mockup, and export carries platform_id and pack version where a platform applies. A template or mockup that is platform neutral carries no platform size, only its own version.
- No column named for one platform only. No etsy_size, no amazon_title, no ebay_tags as a column. Those values live inside the PlatformPack configuration for that platform.
- Sample content is flagged as sample in the data, never stored as if it were the seller's real product.
- File references point to object storage, not to blobs in the database. Originals and renders are stored separately where feasible.
- Deletion: delete account, listings, uploads, renders, exports, and AI logs for that account on request, with a completion record. Backups expire on a stated schedule.

## 12. Tech stack recommendation, following the Global Career Studio pattern

### 12.1 Environment inspected

Environment checked for this document, 2026-11-05, in this workspace:

- Node v24.22.1, npm 10.9.4, Python 3.12.3.
- No local Postgres installed. No psql and no pg_isready found on this machine.
- Therefore use a hosted Postgres service for development and production, or a containerized Postgres, not a local Postgres install assumption. This matches Global Career Studio PROMPT.md section 17, which records the same environment finding on 2026-11-04.

Do not assume a local Postgres, a local object store, or a local AI key. All of those are configuration, with placeholders and .env.example entries, no real secrets in the repository.

### 12.2 Recommended stack

Prefer, following Global Career Studio PROMPT.md section 17:

- Next.js, React, TypeScript, Tailwind CSS.
- PostgreSQL, Prisma ORM.
- Secure authentication, modular AI provider integration.
- Object storage for photos, renders, and exports, with signed access, not in the database as blobs, and with deletion on document deletion where the user requests it.
- Background processing where required, for example render jobs and export jobs that take time.

Separate, as modules with clear boundaries, following section 17:

- Seller profile data.
- Listing content.
- Template definitions.
- Rendering logic.
- AI generation.
- Subscription entitlements.
- Export processing.
- Niche and platform packs.
- Authentication and authorization.

Build a reusable template engine and rendering abstraction, so a new template is a template definition plus styles, not a copy of the whole builder. The same rendering abstraction must feed JPG export and preview, so a listing does not look different in preview and in export without a documented reason.

Modularity for login split: auth is a separate module with an interface, so changing from shared NVConsult login to separate logins, or to single sign on, does not require rewriting the builder, templates, or billing.

### 12.3 Repository and delivery, following Global Career Studio PROMPT.md section 0

- The repository is the product record. All source code, database schema, configuration examples, documentation, tests, and PROJECT_STATUS.md live in the repository.
- No manual delivery replaces the repository. A file sent in chat is a preview only. The delivered version is the version committed and tagged in the repository.
- Repository structure, to be created in Phase 0: README.md, PROMPT.md, PROJECT_STATUS.md, docs (architecture, API documentation, database design, export testing notes, platform pack sources, feature status), apps/web (the Next.js application), packages (template engine, rendering, export, mockup, and AI provider modules, kept separate so they can be tested independently), prisma (schema and migrations), tests (automated tests, including template export tests and visual regression notes), .env.example (every required variable, with no real secrets in the repository).
- Branching: main is always releasable. Feature work happens on short lived branches, merged by pull request with tests passing. Releases are tagged.
- Secrets: no passwords, API keys, Stripe secrets, or tokens in code, commits, or docs. Use environment variables and a secure secret store. Rotate any secret that is ever committed by mistake.
- Remote setup is already done: the GitHub repository is saeedr123/listing-photos-generator, public, created by Ali on 2026-11-04, with README.md, IDEA.md, and brainstorming files pushed, all status 201. Work is committed locally with the same discipline, and no manual file drop is treated as the release.
- No GitHub push in Phase 1 docs work. This document is Phase 1 only.

### 12.4 Testing, export and visual

Automated tests, mandatory for every template and mockup, adapted from Global Career Studio PROMPT.md section 13:

- Long content, long titles, long feature lists, long tag phrases.
- Real product renders, not placeholder text, for every template and mockup.
- Landscape and portrait source shapes, including the landscape sheet in a portrait phone case.
- Single image and full set exports, at Etsy export size.
- Visual regression: a reference render per template and per mockup, compared on change, with human review of any visual diff before release.
- Export failure handling: a failed export shows a plain language error and preserves the listing.
- Definition of done, for every phase: code is in the repository, tests pass, the feature is tested as a visitor (logged out where relevant, mobile, full click through), export output is inspected where relevant, docs are updated, and PROJECT_STATUS.md is updated. A preview or screenshot alone does not count as done.

## 13. Expansion Proof Rules, named section, Ali confirmed standing requirement

These six rules are a standing requirement from Ali, confirmed 2026-11-05. They override earlier wording that treated later platforms as code branches or as hard coded sizes.

### Rule 1: Shared core, separate packs

Upload, reconciliation, template engine, mockup library, export, auth, billing, and analytics are platform neutral, with no platform name, size, limit, or rule inside the core.

### Rule 2: Platform packs are config, not code branches

Each platform is a versioned pack holding sizes, ratios, image count, title and tag rules, background and text rules, export settings, and niche suitability. Adding a platform is adding a pack, with preview, enable and disable, and rollback, without changing core or existing packs.

### Rule 3: Templates and mockups are platform neutral layouts plus a platform export adapter

A template is never built for one platform only unless marked as such. A mockup is never built for one platform only unless marked as such. The export adapter applies the platform size and file rules at export time.

### Rule 4: Data model is platform neutral

Platform_id and pack version are on listings, templates, mockups, and exports, never a hard coded column per platform such as etsy_size. See section 11.

### Rule 5: Rules are admin editable, versioned, never hard coded

Sizes, limits, copy prompts, niche rules, pricing, and trial limits are editable in admin with preview and rollback, same as Global Career Studio. No size, limit, prompt, price, or trial value is hard coded in the core where admin editing is required.

### Rule 6: Expansion test

State the test that a new platform pack can be added without changing existing Etsy listings, templates, or exports, and without a database migration that renames existing data.

Expansion test, to be run before any new platform pack is enabled:

1. Create a new platform pack in admin as a draft, with a new platform_id, a new pack version, and verified rules from official sources, with a new check date.
2. Preview the new pack against a copy of a test listing. Do not touch the live Etsy listing.
3. Confirm the core code is unchanged: no core file changed, no core module changed, no existing pack file changed.
4. Confirm existing Etsy listings are unchanged: open an existing Etsy listing, check its platform_id, pack version, template versions, mockup versions, and export files. All must be identical to before the test.
5. Confirm existing templates are unchanged: template versions, layouts, and style tokens are identical to before the test.
6. Confirm existing exports are unchanged: export files, sizes, and file names for existing Etsy exports are identical to before the test.
7. Confirm no database migration renames existing data: the only database change allowed for adding a pack is adding new rows for the new pack. No column rename, no column drop, no data rewrite of existing listings, templates, mockups, or exports.
8. Enable the new pack only if steps 3 to 7 pass. If any step fails, disable the draft, record the failure, and fix the pack or the adapter before retrying.
9. After enable, re-run the Etsy export for the test listing and confirm the Etsy output is byte identical in size and layout to the pre test Etsy output, except for a version note where the pack version is recorded.

If the test cannot be run, the pack is not enabled. If the test fails, the pack is not enabled.

## 14. Later Platforms backlog, after Amazon, in groups

v1 is Etsy only. eBay is second. Amazon is third, in Phase 2. The platforms below are backlog only, after Amazon, in the groups Ali decided on 2026-11-05. Do not build them in v1. Do not invent their image rules or prices. Mark all their rules as to be verified from official sources in Phase 2, before that platform is built.

### Group 1, next after Amazon

- Shopify. Why it fits: own store product pages.
- TikTok Shop. Why it fits: TikTok traffic, which fits Ali's TikTok traffic.
- Facebook Marketplace. Why it fits: social commerce.
- Instagram Shopping. Why it fits: social commerce.

### Group 2, then

- Walmart Marketplace. Why it fits: large US marketplace.
- Google Shopping. Why it fits: large US marketplace.
- Pinterest Shopping. Why it fits: vertical lifestyle discovery.

### Group 3, then

- Shopee. Why it fits: Asia region marketplace.
- Lazada. Why it fits: Asia region marketplace.
- Daraz. Why it fits: Pakistan region marketplace.
- WooCommerce, as a store platform pack. Why it fits: own store product pages.

Order note: the groups above are the order Ali gave. Within a group, the build order is an admin decision at Phase 2 time, after official rules are verified for that platform. No platform in this backlog is enabled until its rules are verified on official sources, recorded in `platform-rules.md` with a source URL and a new check date, and the pack passes the expansion test in section 13, rule 6.

## 15. Crisp Quality Gate, named section, Ali standing rule

Real product only. Every screen is a real render at high DPI from source PDF or screenshot, never an AI generated fake product screenshot. No upscale blur. Source rendered at or above export size before placement, never upscale low resolution to fill a frame. Block export or show a clear warning with the fix if source is too low resolution. No stretch, no colour change, no crop unless seller approves, contain fit, centred, text sharp and legible, no garbled AI text, no invented numbers, names, or claims. Templates and mockups are high resolution vector and image assets, export at Etsy size 2000px on shortest side, with a quality check before export. AI may help with layout, copy, and composition only, never invent product content, any AI assisted layout labelled as a template, not as a real product photo.

Proof example: Maid of Honor Planner PDF by PDF workflow, render at 300 dpi, place at crisp size, check text, as in `workspace/etsy-maid-of-honor/templates-redesigned/`.

### 15.1 Gate checks, before export

Run these checks before any export. A failed check blocks export or shows a clear warning with the fix, as stated per check below.

1. Source resolution: source rendered at or above export size before placement. If the source is below export size, block export and show: source is too low resolution, re-render the source at 300 dpi or higher, or upload a higher resolution screenshot, then retry. Never upscale low resolution to fill a frame.
2. No upscale blur: no render step upscales a low resolution source. If an upscale would be needed, block export with the fix in check 1.
3. No stretch: contain fit, centred. If a source ratio does not fit a frame, show the fit warning and offer a real portrait screenshot or an approved crop. Never stretch.
4. No colour change: no colour shift, no filter, no background change inside the product screen. Seasonal backgrounds and frame colours must never change the product colours inside the screen.
5. No crop unless seller approves: no silent crop. If a crop is needed for a platform thumbnail or a phone frame, show the crop preview and get seller approval before export.
6. Text sharp and legible: text in the render is sharp at export size, with no garbled AI text. If text is not legible at export size, block export and show the fix: use a larger source render, a larger frame, or a shorter text slot.
7. No invented numbers, names, or claims: every number, name, and claim on an image matches the reconciliation checked product facts. If a claim has no source fact, remove it or flag it in the reconciliation check.
8. Template and mockup assets: templates and mockups are high resolution vector and image assets. A low resolution frame or template asset fails the gate and stays in draft.
9. Export size: export at Etsy size 2000px on shortest side in v1, sRGB, JPG, per section 7.2. The gate checks the final export file size, not only the preview size.
10. AI labelling: AI may help with layout, copy, and composition only, never invent product content. Any AI assisted layout is labelled as a template, not as a real product photo. A mockup is labelled as a presentation frame, never as a real screenshot.

### 15.2 Premium frame quality and the gate

A premium frame under section 5.6 must pass this gate and the premium points in section 5.6 before it is called done. A basic frame does not pass the premium test. Do not call a basic frame premium. The Maid of Honor v2 hero layout in section 5.5 is the proof layout, but its frame quality must be raised to the premium standard before it is called done.

## 16. Security and privacy, GDPR conscious, no training on user product data

- Secure authentication, role based permissions, file upload validation, rate limiting, secure API access, data deletion, GDPR conscious data management, secure environment variables, and audit logs. This follows Global Career Studio PROMPT.md section 18.
- Upload validation: file type, size, and content checks for uploads, with rejection messages that do not leak system details.
- Rate limiting on auth, AI generation, and export endpoints, with clear user facing messages when a limit is hit.
- No training on user data: user listings, product files, product text, and copy drafts are never used to train AI models, unless the user gives separate, explicit consent for a specific purpose. State this in the privacy policy.
- Data deletion: delete account, listings, uploads, renders, exports, and AI logs for that account on request, with a confirmation and a completion record. Backups must expire on a stated schedule.
- Access control: users can only access their own listings, unless they explicitly share a read only link. Admin access to user listings is logged, limited, and only for support with a recorded reason.
- Audit logs: login, subscription changes, trial starts, export failures, and admin changes are logged with time, actor, and action, without logging product content or secrets.
- Object storage: uploads, renders, and exports are stored in object storage with signed access, not in the database as blobs, and with deletion on listing deletion where the user requests it.
- Legal documents: privacy policy, terms, and refund policy need final wording, with a legal check for GDPR and consumer rights, before a commercial launch. Do not invent legal wording in code or docs as if it were advice.

## 17. Open decisions, not invented

These are not blockers for Phase 1 planning, but they are blockers for a commercial launch, and must be decided by Ali, not invented here.

- Final price for monthly and annual premium, and currency. Starting defaults in section 9.2 are configuration defaults, not prices.
- Stripe account owner, business details, and VAT treatment confirmation. Stripe is on hold. No Stripe integration work beyond a null placeholder config is assumed here.
- AI provider choice and budget cap for AI credits, plus fallback provider if the primary is unavailable. No AI provider, key, or budget cap is set in this document.
- Domain or subdomain for the tools site, and the exact nvconsult.eu link locations. Domain is on hold. Do not check domain availability and do not purchase anything. Use placeholder domain configuration only.
- Hosting provider for the Next.js app, hosted Postgres provider, and object storage provider. No provider is chosen in this document. No deployment is executed in Phase 1.
- GitHub repository name, owner, and visibility. Decided and already live: saeedr123/listing-photos-generator, public, owner saeedr123. No GitHub push in Phase 1 docs work; the parent will push these docs and verify.
- Privacy policy, terms, and refund policy final wording, with a legal check for GDPR and consumer rights. Refund window, human review turnaround, and human review price, where relevant, are explicit owner to confirm placeholders, never invented.
- Premium frame licences: if a premium frame needs a licence, list it as an open decision with no price invented. Do not buy anything. Record the licence in admin against the mockup version when a licence is obtained.
- Trial shape: is a 7 day trial, no card, one per account, the right trial for a listing tool, or should the trial be per listing pack? Open, from brainstorming.
- Mockup pricing: should mockups be free for all, or a premium feature, when the core listing pack is free to build and paid to export in full? Open, from brainstorming.
- Mismatch handling: do sellers want the tool to fix a mismatch, or only to flag it and let them fix the source product? Open, from brainstorming.
- Niche conversion: which niche pack actually converts first: wedding planners, finance planners, or small business planners? Open, to be tested with real sellers, not decided here.
- Template names for templates 7 to 10 in the v1 set of 10. To be recorded in the template registry at build time.

Until these are decided, the system must be built with placeholders and configuration, not with invented prices, invented legal wording, or a fake payment flow.

## 18. What Phase 1 does not do

- No code.
- No live site change.
- No spending.
- No contacting real people.
- No GitHub push.
- No browser task.
- No domain check or purchase.
- No Stripe build beyond a null placeholder config.
- No AI provider key or budget cap.
- No build on any of the 23 unverified items in `platform-rules.md` section 6.
- No invented prices, licence prices, tax rates, or platform rules for backlog platforms.

## 19. Sources and check dates

- Platform rules: `~/workspace/listing-studio/docs/platform-rules.md`, check date 2026-11-05, official sources only, 23 unverified items in section 6.
- Global Career Studio pattern: `~/workspace/global-career-studio/PROMPT.md`, sections 0, 2, 16 and 17, status 2026-11-04, with Phase 2 increment notes to 2026-11-05 in the source file.
- Product idea: `~/workspace/listing-studio/IDEA.md`, 2026-11-04, with mockup library added 2026-11-04.
- Brainstorming: `~/workspace/listing-studio/brainstorming/product-ideas.md` and `mockup-ideas.md`, 2026-11-04, ideas only, not decisions.
- Proof reference files: `workspace/etsy-maid-of-honor/templates-redesigned/redesigned-hero-large-screens-v2.jpg` and `redesigned-feature-itinerary-large-v2.jpg`, both dated Nov 3, 13:52, both 3000 by 2000 pixels, sizes verified in section 5.5.
- Premium direction reference: Adobe Stock mockups search, https://stock.adobe.com/cz/search/templates?k=mockups , 158,380 results as sent by Ali, 2026-11-05, direction and inspiration only, see section 5.6 for the licensing guardrail.
- Environment check for this document: Node v24.22.1, npm 10.9.4, Python 3.12.3, no local Postgres, checked 2026-11-05.

End of architecture document.
