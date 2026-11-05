# PROJECT: LISTING PHOTOS GENERATOR

## Turns a real digital product into a complete listing pack

Status: Prompt, Phase 1 planning, 5 November 2026. Decisions by Ali, 5 November 2026. No code started. No feature in this prompt is claimed as built until it is implemented and tested in the repository.

Status note: This prompt is the controlling brief. It is not code, and no feature in it is claimed as built until it is implemented and tested in the repository.

This version incorporates the idea in IDEA.md, the brainstorming notes in brainstorming/product-ideas.md and brainstorming/mockup-ideas.md, the platform rules in docs/platform-rules.md, the competitor research in docs/competitor-research.md, and Ali's decisions from 5 November 2026. Where this version changes an earlier note, this version wins.

## What changed from the idea notes, in plain terms

1. Product name: Listing Photos Generator. The name was chosen because listing photos generator is itself a keyword sellers search for.
2. Delivery: The project lives in a GitHub repository as the single source of truth. Work is delivered by commits, branches, tags, and releases in that repository, not by manual file drops.
3. Scope: Version 1 is Etsy only, digital products only. eBay is second, Amazon is third and Phase 2. Later platforms stay in backlog only.
4. Mockup Library: The mockup library is a core version 1 feature, not an add on. It has an easy add flow in admin, a starter set, and a premium quality rule (see section 9).
5. Expansion Proof Rules: Six standing rules, confirmed by Ali, that keep the core platform neutral and make each platform a versioned pack, not a code branch (see section 12).
6. Crisp Quality Gate: A standing rule that only real product renders at high DPI may be used, with no upscale blur, no stretch, no colour change, and no crop unless the seller approves (see section 13).
7. Reconciliation: A reconciliation check before export is mandatory. No silent publish on a mismatch.
8. Trial: Starting default is a 7 day premium trial, no card required, one trial per account, with a clear downgrade rule. All trial values remain configurable in admin, so Ali can change them without code changes.
9. Editability: Nothing content bearing is hard coded. Copy, templates, mockups, platform rules, pricing, limits, trial rules, niche rules, and AI prompts are editable through admin or configuration, with versioning, preview, and rollback.
10. New value features added from review: upload and reconciliation, template engine with a distinctness test, mockup library, export engine with a quality check, AI copy help with guardrails, niche packs, share and review link, dashboard, and admin panel with versioning.
11. Commercial view: Ali confirms Listing Photos Generator should be commercially good as a standalone SaaS business, not only as a free NVConsult add on. Free must be genuinely useful, premium must be compelling, and the NVConsult link must be a growth channel, not a dependency that blocks standalone sales.
12. NVConsult dossier insights applied: This prompt was written after reading the NVConsult competitor dossier at workspace/goals/nvconsult-consultation-business-launch/files/competitor-comparative-data-2026-10-24.md, per the standing AGENTS.md rule. Applied insights: no unverified numbers, no success rates, no approval percentages, no outcome timelines, and no invented claims anywhere in the product or its copy; every page must give the visitor a task or a clear next step in the first screen, so the upload and product check is the front door, not a slogan only hero; transparent pricing beats hidden pricing, so the free limit and paid price must be published in plain words, not hidden behind a trial; checkable trust beats counters, so the checkable proof is the reconciliation checklist itself, not a claim such as sellers earn more.

## 0. DELIVERY METHOD: GITHUB REPOSITORY

0.1. The repository is the product record. All source code, database schema, configuration examples, documentation, tests, and PROJECT_STATUS.md live in the repository.
0.2. No manual delivery replaces the repository. A file sent in chat is a preview only. The delivered version is the version committed and tagged in the repository.
0.3. Repository: saeedr123/listing-photos-generator. Local project: workspace/listing-studio/.
0.4. Repository structure, to be created in Phase 0:
- README.md: what the product is, how to run it, how to deploy it, and links to docs.
- PROMPT.md: this file, kept current when scope decisions change.
- PROJECT_STATUS.md: updated at the end of every phase, with what is done, what is tested, what is pending, and what is blocked. Never mark a feature complete unless it works and has been tested.
- docs/: architecture, database design, platform rules, competitor research, export testing notes, niche pack sources, and feature status.
- apps/web/: the web application.
- packages/: template engine, mockup engine, rendering, export, and AI provider modules, kept separate so they can be tested independently.
- prisma/: schema and migrations, or the equivalent for the chosen stack.
- tests/: automated tests, including template export tests, mockup fit tests, reconciliation tests, and visual regression notes.
- .env.example: every required variable, with no real secrets in the repository.
0.5. Branching: main is always releasable. Feature work happens on short lived branches, merged by pull request with tests passing. Releases are tagged, for example v0.1.0 for the Phase 1 planning release, v1.0.0 for the first commercial core.
0.6. Secrets: No passwords, API keys, Stripe secrets, or tokens in code, commits, or docs. Use environment variables and a secure secret store. Rotate any secret that is ever committed by mistake.
0.7. Remote setup is already done: the GitHub repository is saeedr123/listing-photos-generator, public, owner saeedr123, created by Ali on 2026-11-04, with README.md, IDEA.md, and brainstorming files pushed, all status 201. Work is still committed locally with the same discipline, and no manual file drop is treated as the release.

## 1. PRODUCT OBJECTIVE

Build a tool that turns a real digital product into a complete, platform ready listing pack: images, title, description, tags, and a pre publish checklist, without inventing anything about the product.

The seller uploads the real product: sheet PDFs or screenshots, price, format, and features. The tool reads the actual facts, flags any mismatch, and generates a listing pack that matches the real product.

Do not build a generic AI image wrapper. Build a listing pack system where the product facts, the template, the mockup, the platform rules, and the copy are separate, testable parts.

The product must be suitable for real sellers worldwide, capable of producing crisp, honest, publishable listing images, and capable of operating as a standalone SaaS business.

The test product for version 1 is the Maid of Honor Planner, a Google Sheets planner. Its facts as supplied in earlier work are 12 tabs, Google Sheets format, USD 13.97 list price, and USD 9.78 launch price. Those figures are task supplied, not independently rechecked against a live Etsy listing, so do not present them as verified live prices. Reconfirm them against the real product before they are used in a published pack.

## 2. BRAND, PLACEMENT, AND LOGIN

2.1. Brand: Listing Photos Generator, as a standalone commercial brand. The name is a keyword sellers search for, and that is a deliberate part of the product.
2.2. Placement: ONE combined application now, split later if needed, the same pattern as Global Career Studio. It is reached from nvconsult.eu (tools section, menu link, and relevant service pages) and directly on its own tools site. Both entry points use the same application, same account, and same listing packs now. There is no second copy of the builder to maintain in version 1.
2.3. NVConsult link, commercial logic: The NVConsult audience (students and workers from Asia, Africa, and beyond, moving to Europe and beyond, plus digital sellers in that audience) is a launch audience and a trust channel, not the only market. The product must also make sense to a visitor who has never heard of NVConsult.
2.4. Login, initial decision: Initially the same login system is used across NVConsult and Global Career Studio and Listing Photos Generator. Implement auth as a modular service with a clear boundary, so a later split (separate logins, or single sign on) is a configuration and migration task, not a rewrite.
2.5. Free tier presentation: Same free tier for everyone, in both entry points. There is no special NVConsult client benefit at launch, and no second public price list. A client benefit through an admin invite code may be added later, not as a second public price list.
2.6. Split ready design: Combined now, split later if needed. The following rules are mandatory, so a later split is a deployment and data partition task, not a rebuild:
- Shared template, mockup, and export engine: templates, mockups, rendering, and export live in shared packages, used by every edition.
- Separate skins and copy per edition: branding, header, landing copy, buttons, and help links are edition configuration, never hard coded into the engine.
- Modular auth service: auth is a separate module with a clear interface, so each edition can later have its own login without rewriting the builder, templates, mockups, or billing.
- Edition tag on every user and listing pack: each User row and each Listing row carries an edition value recording the entry edition. A user who uses both editions will have packs in both partitions, and that case must be resolved explicitly at split time, not silently assigned to one side.
- Separate billing products per edition, even on the same Stripe account: plan and trial products are configured per edition, so they can be moved apart without changing prices for the other edition.
- Separate entry points: nvconsult.eu is the NVConsult journey, the tools site is the commercial journey, even though both open the same application now. The tools site domain is on hold as of 5 November 2026, so use placeholder domain configuration only, do not check domain availability, and do not purchase anything.
- What a split would require, in order: copy the app shell into two deployments, keep the shared engine, partition users and listing packs by the edition tag, move each billing product to its own setup, give each edition its own login if required, retest exports and billing in both deployments, and tell users which door they are now on, with redirects from old links. A split must not be started on the basis of this paragraph alone; it needs a separate decision from Ali, with a migration plan and a test database run first.
2.7. Account data: One seller profile per account, reused across listing packs. A seller must not retype shop details, product facts, or branding for every new listing pack.

## 3. COMPETITOR RESEARCH (PHASE 1, BEFORE BUILDING FEATURES)

Competitor research is documented in docs/competitor-research.md, dated 5 November 2026, with sources, dates, and links. Do not invent research findings. Where a claim cannot be verified from a primary source, mark it as unverified and do not use it to set a feature or price.

Pricing warning, mandatory: Prices in docs/competitor-research.md are SECONDARY SOURCE ONLY. No vendor pricing page was directly rechecked on 5 November 2026, because that task had no live browser. Do NOT quote any competitor price as verified in this prompt, on a sales page, or to a seller. A live recheck of each vendor pricing page is required before any pricing decision. The full unverified list is in docs/competitor-research.md, including the Vela price conflict, the Photoroom free export conflict, the Marmalead trial conflict, and the EHunt price which was not publicly listed.

### 3.1. What the research found

No competitor does the full job. The market splits into four groups, and a seller currently needs several of them to make one listing pack:

- Etsy SEO and listing copy tools: eRank, Marmalead, Alura, EverBee, Sale Samurai, EHunt (formerly EtsyHunt). They do keyword research, titles, tags, descriptions, and audits. None makes photos or mockups, and none checks the listing against the real product.
- Bulk, crosslist, and multi marketplace tools: Vela, now Stocksmith, and InkFrog. Vela does bulk editing and crosslisting for Etsy, Shopify, eBay, and Faire, with an AI Photo Studio on paid plans. InkFrog is CLOSED, shut down 2026-06-01, and must not be treated as a live competitor. Vela renamed itself Stocksmith on 2026-07-01, with no changes to pricing, features, or Etsy connections, per the sources read.
- Amazon tools, Phase 2: Helium 10, Jungle Scout, Sellerise. They do Amazon research, keyword tools, and listing copy. None makes mockups, and none states a reconciliation check against the real product.
- Design and mockup tools: Canva, Placeit by Envato, Smartmockups (now Canva Mockups), Mockey, Photoroom (listed in the task as Foto, and covered as Photoroom as the closest match, with that identification marked UNVERIFIED), Dynamic Mockups, MockupHQ, Printful mockup generator, ListingLint, Pixelcut. They make mockups or edit photos, one at a time, by hand. None generates a title, tag, and description pack, and none checks the mockup against the real product.

### 3.2. The mockup gap is real

No tool in the set was found to offer all of the following together: laptop, phone, tablet, laptop plus phone hero, and flat frame, for a real digital product render, with a contain fit, centred, no stretch, no colour change, and no crop unless the seller approves. That combination is the mockup gap. Placeit is apparel and lifestyle first, with familiar templates across Etsy and no device frame pack for a Google Sheets planner. Smartmockups is device first, with laptop, phone, tablet, and website frames and 5K export, but it is now inside Canva, not a listing pack tool. Mockey is print on demand apparel first. Photoroom edits a photo the seller already has, it does not place a real digital product inside a device frame with a crisp render rule.

### 3.3. Billing complaints found

Billing complaint patterns were found for three tools, and they set the billing rules for this product (see section 11):

- EverBee: Trustpilot 3.2 out of 5 from 55 reviews in the sources read. Annual plans auto renew with no reminder email, and the refund window is 3 days for a monthly plan. One reviewer on 2026-10-03 reported going from USD 9 a month to an annual USD 240 charge, and getting only a pro rated amount after cancelling 8 days after the charge, with access removed at once. Free users call the locked sales, revenue, conversion rate, trends, and Tag Analyzer data the biggest weakness.
- Marmalead: Trustpilot 2.0 out of 5 from 11 reviews in the sources read. Reviewers from 2023 to September 2026 describe being charged after a trial or after cancelling, and two say a refund was refused within 14 days. There is no free plan.
- Canva: Trustpilot 4.0 out of 5 from about 7900 reviews in one October 2026 sample, with 50 percent 5 star and 30 percent 1 star. In a 100 review sample, billing appeared in 11 reviews and cancellation in 10, and every billing or cancellation review was 1 or 2 stars. Themes: charged after believing they had cancelled, refund refused, cancellation did not go through first time, paused subscription resuming and charging on 2026-10-23, support hard to reach. Canva Help Centre states that in most cases Canva subscriptions are not refundable, as outlined in its Terms of Use.

No billing complaint pattern was found in the sources read for eRank, Alura, Sale Samurai, Placeit, Photoroom, Helium 10, Jungle Scout, or Sellerise. Mark that as no pattern found, not as proof of clean billing. Vela billing frustration was found in Shopify App Store reviews as summarised in secondary sources, about the transition from free to paid, with reviewers feeling misled or unfairly charged.

### 3.4. What free limits convert, with evidence

Free limits that convert are the ones that let a seller finish one real listing, then hit a clear wall on the second or third listing. eRank Free gives 5 keyword lookups a day, 5 audits a day, and 1 AI use a day, enough to fix one listing, not to run a shop. EverBee Hobby is free forever, but sales and revenue columns are hidden, so the wall is data, not time. Alura Free gives 5 searches a day and 10 listings to optimise. Sale Samurai Freemium gives 20 keyword searches a month and 10 listing analyses a month, about one product a month. Canva Free leaves the editor free, but Pro elements carry a crown, and background remover and Magic Resize are Pro only. Placeit free is mostly watermarked previews, so the wall is the download itself. Photoroom free is for personal, non-commercial use only in the sources read, so a seller cannot legally use a free export in a listing. Mockey free is the most generous free mockup tier in the set, with 1000 plus templates and unlimited JPG downloads, and the wall is format and resolution, since PNG and 1600 by 2000 need Pro.

Lesson for Listing Photos Generator: give one complete listing pack free, with no watermark and with commercial use, then charge for the second pack, for more platforms, or for higher volume. Do not give a free pack that cannot be published, because that is the Placeit and Photoroom complaint pattern. Do not hide the useful data behind pay, because that is the EverBee complaint pattern. Make the free limit a count, such as one pack, not a watermark or a licence trap.

### 3.5. What is missing that Listing Photos Generator could fill

1. Reconciliation against the real product. No competitor in the set checks tab count, price, format, or claims against the real product before publishing. One independent test in the sources read found an AI description generator inventing material claims. Listing Photos Generator must make reconciliation the product, not a feature: a pre publish checklist that blocks a pack when the tab count, price, format, or a claim does not match the real product.
2. No invented claims in titles, descriptions, or tags. Competitors generate copy from keyword data or from a text prompt, not from verified product facts. This tool must generate copy only from facts the seller confirms, and must flag any keyword that would add a false claim, such as a format, a tab count, or a use the product does not have.
3. Crisp real product renders. Competitors stretch, crop, recolour, or replace the product with a stock scene. This tool must enforce contain fit, centred, no stretch, no colour change, and no crop unless the seller approves, and that rule must be visible in the export, not just in a help page.
4. One listing pack, not scattered subscriptions. A seller currently needs Canva or Placeit for photos, eRank or Marmalead for keywords, Alura for copy, and EverBee for research. Listing Photos Generator must deliver images, title, description, tags, and a pre publish checklist as one pack for one product, in Etsy sizes first.
5. Platform specific exports in one pass. Etsy needs 2000 pixels on the shortest side and a clean first photo. eBay needs about 1600 by 1600 and up to 24 photos. Amazon Phase 2 needs pure white RGB 255,255,255, 85 percent fill, and no text on the main image. No Etsy first tool in the set exports all three correctly from the same real product render. This tool must build the Etsy pack first, then eBay, then Amazon, with the Amazon main image rule enforced as a separate export, not as a recolour of the Etsy hero.
6. A free pack that can actually be published. The converting free limits in the set are count based and usable. The complained about free limits are watermarked, non-commercial, or data hidden. This tool must give one complete, watermark free, commercially usable pack free, then charge for more packs or more platforms.
7. Transparent billing, learned from the complaint patterns. State renewal, refund, and cancellation in plain words before payment, send a renewal reminder, and do not use a trial that converts silently.
8. Digital product device frames. This tool must own the digital product device set: laptop, phone, tablet, laptop plus phone hero, and flat frame, all from the same real Sheets render, with no stretch and no crop unless approved.
9. Platform structure kept open. No tool in the set was found to offer a single listing pack that starts on Etsy and then reuses the same verified facts for later platforms without retyping. This tool must keep the product facts in one place, so a later platform export does not invent new claims. That structure must be built in Phase 1, even if the exports ship later. Version 1 is Etsy only, digital products only.
10. A checklist, not just images. ListingLint is a checker, not a maker. Vela scores listings F- to A+. Neither delivers a full pack with a checklist that a seller can sign off. This tool must deliver the checklist with the pack, with each item tied to a real product fact, such as tab count, price, format, and platform image size.

Research must also answer, with evidence, not opinion, before any pricing decision:
- What free limits actually convert, and where users complain about paywalls, watermarks, or locked downloads.
- Which mockup and template sets are genuinely different, and which are colour variants.
- Where export breaks, and where text in an image is not sharp or legible.
- What listing copy claims competitors make, and what complaints exist about invented claims.
- What import, niche pack, and version features exist, and what is missing.

## 4. SCOPE CONTROL: VERSION 1, PHASE 2, AND NON GOALS

Version 1 is a functional, polished core product, not every idea in this prompt at once. Advanced features come after the core is tested and usable.

Version 1 must include:
- Auth, seller profile, dashboard, and listing pack storage.
- Upload and reconciliation for a real digital product.
- Template engine with 10 distinct templates, proved first with 2, hero and features, using the Maid of Honor Planner as the test product.
- Mockup library as a core feature, with the starter set in section 9 and the easy add flow in section 9.
- Export engine with Etsy settings and a quality check before export.
- AI copy help with guardrails, within a stated credit limit.
- Niche packs for the version 1 set only.
- English only.
- Free and premium gating, 7 day trial default, and billing through Stripe or another suitable provider if Stripe is not available at launch.
- Share and review link.
- Admin panel for templates, mockups, prompts, niche packs, platform packs, entitlements, trial, and users.

Phase 2 backlog, explicitly not version 1, to be built after version 1 is validated:
- eBay pack, second platform. Note: eBay digital is restricted, see section 12. Treat eBay digital as blocked pending a live check in the eBay sell flow. For Phase 1, eBay is a second platform for physical delivery or for a physical media version only, not a direct equivalent of the Etsy instant download flow.
- Amazon pack, third platform. Amazon is strictest, with a pure white main image, product fill at least 85 percent, and no text on the main image. Do not build Amazon logic on unverified rules. The Amazon pack must be treated as a physical presentation pack first, unless a separate verified digital route is found and recorded in docs/platform-rules.md.
- Later platforms backlog, see section 12.
- Video storyboard for a listing video, not video generation in version 1.
- Multi language listings, gated by demand, the same logic as Global Career Studio: English first, German, French, and Spanish only after demand is shown.
- Additional niche packs beyond the version 1 set, each tested with a real product first.
- Additional mockups: desk scene, printed planner or book, bundle of devices, seasonal backgrounds, seller uploaded custom frames, and social square crop, each added only after it is tested for crisp rendering and for the no stretch, no colour change rule.
- Additional templates beyond the version 1 set of 10.

Non goals for version 1: auto publishing to Etsy, AI photos pretending to be real product screenshots, video generation, a jobs board, employer hiring tools, recruitment agency features, and any feature that requires inventing product facts, prices, or platform rules. No auto publishing in version 1. No AI photos pretending to be real screenshots. No video generation in version 1.

## 5. UPLOAD AND RECONCILIATION

5.1. Upload the real product: sheet PDFs, screenshots, or renders of the actual product, plus price, format, and features. The tool reads the actual facts and flags any mismatch.
5.2. Reconciliation check, mandatory before export: tab count, price, format (Sheets, not Excel, no .xlsx claim), and claims must match the real product. No silent publish on a mismatch.
5.3. On a mismatch, the tool must stop the export or show a clear warning with the fix, and must not silently publish. Whether the tool should fix a mismatch itself, or only flag it and let the seller fix the source product, is an open question to test with real sellers before building, see section 20.
5.4. The reconciliation check still applies inside mockups: tab count, price, format, and claims shown on or around the mockup must match the real product.
5.5. Etsy digital rule: some digital items, like audio files, do not have visual elements, and representative imagery may be used for those, as long as it does not mislead buyers. All other digital downloads should include a visual preview or excerpt of the content buyers will receive. For the Maid of Honor Planner, the pack must show a real visual preview or excerpt of the actual Sheets content, not only a device frame with placeholder text. Mockups are supporting images, not a substitute for a true preview.
5.6. Sample content: sample content for first time users must be clearly marked as sample, replaceable in one action, and never exported as if it were the seller's real product.

## 6. TEMPLATE ENGINE

Version 1 ships 10 distinct image templates. Prove it first with 2, hero and features, using the Maid of Honor Planner as the test product, then build the full 10.

The version 1 set is:
1. Hero
2. Features grid
3. What is inside
4. How it works
5. Mobile view
6. Sizes and formats
7. Feature close up
8. Bundle or all tabs overview
9. Who it is for
10. Final call to action

Distinctness test, mandatory: A template counts as distinct only if it differs in layout structure, section order, and typography system, not only in colour. Colour variants of the same layout do not count toward the 10. Each template must be documented with its layout, intended platform, intended niche, and best use case.

Support in version 1:
- Templates are platform neutral layouts plus a platform export adapter. A template is never built for one platform only unless marked as such.
- Templates are admin managed, not hard coded. New templates can be added, duplicated, edited, enabled, or hidden without a code change, with preview and versioning.
- A template entry holds: layout definition, text areas, image areas, allowed orientations, background, and which niche packs it suits. Nothing about the seller's product is stored in the template itself.
- Orientation consistency: a listing set must not mix landscape and portrait frames without a reason. The Maid of Honor Template 08 portrait slip is the warning example.
- Every template must pass the Crisp Quality Gate in section 13 before it is enabled.

## 7. MOCKUP LIBRARY

### 7.1. What it is

A library of product mockups inside Listing Photos Generator. The seller's real product screenshot or sheet render is placed inside a device or scene frame, so a listing image looks like a finished product photo instead of a flat screenshot. The screen inside the mockup is always the seller's real product. The mockup never invents product content.

A mockup is a presentation frame. It must never be presented as a real sheet screenshot, and it must never carry another seller's product, watermark, review count, badge, or claim.

### 7.2. Starter mockups for version 1

- Laptop alone, straight on, for desktop products such as Google Sheets planners.
- Phone alone, straight on, for mobile view.
- Tablet alone, straight on.
- Laptop plus phone hero, the combination already proven in the Maid of Honor Planner blush set, with large screens covering most of the image.
- Flat feature frame, for a single sheet or feature close up.
- Straight device versions are the default, because they are Canva friendly with no warp needed. Tilted phone versions are an option, not the default, because a tilted phone warp needs Photopea style warping and can leave white bands.

### 7.3. Easy add flow, mandatory in version 1

In admin, a new mockup can be added without a code change and without a deploy:
1. Upload a frame.
2. Mark the screen area.
3. Set allowed orientations and niche packs.
4. Preview it with a real product render.
5. Enable it.
Plus duplicate, edit, hide, and rollback, with versioning, the same rule as templates and copy.

A mockup entry holds: frame image, screen area coordinates, allowed screen orientations, background, and which niche packs it suits. Nothing about the seller's product is stored in the mockup itself.

A new mockup is only added to the live library after a crisp render test: contain fit, centred, no stretch, no colour change, no crop unless approved, and after the premium quality check in section 9.

### 7.4. Fit problems the mockup engine must solve

- Landscape sheet in a portrait phone: show a warning, offer a portrait screenshot or an approved crop, never stretch to fill. A landscape sheet in a portrait phone will show as a small band with white above and below unless a portrait screenshot or an approved crop is used.
- Wide sheet in a narrow phone: offer zoom out or a horizontal scroll preview note, never pretend the sheet is phone optimised when it is not.
- Straight versus tilted: straight is the default for Canva friendly use. Tilted needs a warp step, like Photopea, and must be tested for white bands and blur.
- Orientation consistency: a listing set should not mix landscape and portrait frames without a reason.

### 7.5. Later mockups, backlog only

Desk scene, printed planner or book, bundle of devices, seasonal backgrounds, seller uploaded custom frames, social square crop, and before and after frame, each added only after it is tested for crisp rendering and for the no stretch, no colour change rule. A printed planner or book is for sellers who also sell a printable version, clearly separated from a Sheets product, never mixed in one listing claim. A before and after frame uses only real sheet data, no invented before example. A social square crop is exported separately from the Etsy landscape set, so Etsy sizes stay consistent.

## 8. REFERENCE MOCKUPS FOR THE PROOF TEMPLATES

Use these references for structure only. Do not invent a new style, and do not lift another seller's product screen into a template.

- Hero, laptop plus phone, large screens: workspace/etsy-maid-of-honor/templates-redesigned/redesigned-hero-large-screens-v2.jpg.
- Feature, tablet covering most of the image: workspace/etsy-maid-of-honor/templates-redesigned/redesigned-feature-itinerary-large-v2.jpg.

Mirror structure only: device size and position, background, title and subtitle placement, bottom pill bar. Do NOT copy competitor badges, review counts, watermarks, or claims, and do NOT lift another seller's product screen into a template. If Ali sends a new reference mockup, use that one instead for that mockup only, structure only.

### 8.1. Competitor listing images, premium direction, structure only

Ali sent 27 competitor listing images, Hey Morning Studio and Productive Penguin Co Maid of Honor Planner sets, as premium direction. Full summary: workspace/listing-studio/references/competitor-listing-images-2026-11-05.md. Source files are in workspace/user/media_library/image/.

Take structure only: large serif title, small caps subtitle, blush background, white cards, feature pages with large sheet preview, realistic device mockups, closing How it works, Why us, FAQ, Ready When You Are pages. In detail: large serif title, small caps subtitle with bold key words, soft blush background with faint hearts and stars, white cards with soft shadow, rounded corners, clear section hierarchy; feature pages with one clear benefit title, one short benefit line, then a large real sheet preview, with small callout pills or badges at the top and bottom; device mockups with large laptop, tablet, and phone frames with realistic shadows and depth, screens covering most of the frame, not flat basic rectangles; closing pages with How it works in 3 steps, Why us in 3 cards, FAQ in 4 cards, Ready When You Are with Instant Download, Instruction, and Support.

Do NOT copy: 20 or 16 tabs (Ali's sheet has 12), 13,000 plus customers or 700 plus reviews or any review text, Chartered Accountant, ADHD Friendly, Excel, Works On Any Device, Choose Any Currency, Hey Morning Studio watermark, Productive Penguin Co branding, any sheet screenshot inside those images, any price or device claim. Those images show another seller's product, with its own data, figures, names, and dates. Ali's own sheet PDFs are the only sheet content to place in templates.

Use them as template and mockup direction for Etsy only v1, Maid of Honor Planner as test product, with Ali's real 12 tab sheet, real figures, and real claims only, checked by the reconciliation check. Mirror layout, typography, colour system, device size, and callout style. Replace all competitor content with the seller's verified content, checked by the reconciliation check. If a layout cannot be built with the seller's real content at crisp quality, do not fake it with AI generated product content.

The Maid of Honor v2 hero is still the proof layout, but its frame quality must be raised to the premium standard in section 9 before it is called done.

## 9. PREMIUM MOCKUP QUALITY RULE

Standing rule, Ali correction, 5 November 2026: current mockups are very basic, they need premium quality. Do not call a basic frame premium.

### 9.1. Reference direction

Reference Ali sent: Adobe Stock mockups search, 158,380 results, https://stock.adobe.com/cz/search/templates?k=mockups

Relevant premium examples from that search, as direction only:
- Laptop Air Mockup Presentation Screen Set
- Modern laptop on a desk mockup
- Laptop and Smartphone Mockup
- Isolated laptop and smartphone mockup set
- Phone Mockup 15 Pro Set
- Smartphone Screen Mockup In Woman Handheld
- Modern Monitor Mockup

### 9.2. What premium means

Premium means: realistic device frames with correct perspective, soft realistic shadows and depth, lifestyle or desk scenes, not flat basic rectangles with a plain background. Devices must look like real photos, screens must stay crisp, text must stay sharp.

A premium frame is judged on: correct perspective and proportions, realistic materials and edges, soft realistic shadows and depth that ground the device in the scene, a lifestyle or desk scene that adds context without competing with the screen, and a screen that stays crisp and legible at export size.

A flat basic rectangle with a plain background is not premium, even if the screen inside it is crisp. Do not ship it as premium, and do not label it premium in the library, in admin, or in marketing copy.

### 9.3. Licensing guardrail, mandatory

Use Adobe Stock only as direction and inspiration. Do NOT lift watermarked previews, unlicensed PSDs, or another seller's mockup images into the tool.

Premium frames must be built in house at high resolution, or properly licensed, with the licence recorded. Record for each licensed frame: source, licence type, licence date, and where the licence is stored. A frame with no licence record must not be enabled in the live library.

If a frame needs a licence, list it as an open decision with no price invented, do not buy anything. See section 20.

### 9.4. Proof gate

The Maid of Honor v2 hero is still the proof layout, but its frame quality must be raised to this premium standard before it is called done. A proof template is not done when the layout matches. It is done when the layout matches AND the frame meets the premium standard in 9.2 AND the screen passes the Crisp Quality Gate in section 14.

## 10. EXPORT ENGINE

Support Etsy export in version 1: Etsy ready JPGs, 2000px on the shortest side and under Etsy's size limit, plus a copy paste text pack.

Requirements:
- Export at Etsy size, 2000px on the shortest side, with a quality check before export.
- sRGB colour profile, so colours on the site match the originals. Etsy converts images to use the sRGB colour profile. CMYK is for print only.
- JPG export in version 1. PNG, and other formats where a later platform pack requires them, are later platform exports, not version 1 Etsy exports.
- Images in order, matching the template order chosen by the seller.
- Copy paste text pack: title, description, tags, and checklist, in plain text the seller can paste into Etsy.
- No auto publishing in version 1. Export produces files and text for the seller to upload to Etsy themselves.

Etsy rules used in version 1, from docs/platform-rules.md, checked 2026-11-05:
- Recommended: listing photos at least 2000 px width and height.
- First photo minimum for search visibility: first listing photo at least 635 px width and height, or the listing can show up lower in searches.
- First photo orientation: first photo should be horizontal (landscape) or square, so the centre focal point appears in cropped thumbnail views. Note a tension inside one official page: the same help page says first photo should be horizontal or square, and in its thumbnail section says avoid square crops and upload horizontal or landscape images. Both statements are recorded in docs/platform-rules.md. Generator rule: use a landscape or square master, keep the product centred with a safe border, and do not rely on edge text surviving a crop.
- Maximum: up to 20 photos and 2 videos, 5 to 15 seconds each, per listing. An older version of the same help page said 1 video. Use the current page value of 2 videos.
- First thumbnail: avoid text overlays, collages, or using a collection of images for the first thumbnail when optimising the first listing for search.
- Background: keep the background simple, a clean neutral background ensures the focus stays on the product. This is guidance, not a pure white background rule.
- First photo clarity: make the first listing photo the clearest, most realistic representation of the item buyers will receive.
- Accuracy: all images must accurately reflect the item's true appearance, including colour, condition, scale, and materials.
- File types: .jpg, .gif, .png, .svg, or .heic. Animated .gif files and transparent .png files are not supported. If a file contains transparency, the transparent parts will appear black on Etsy.
- Practical upload warning: images larger than 1MB in file size may not finish uploading, especially on a slower internet connection. This is a warning, not a verified hard cap. Do not state a hard cap as an Etsy rule.
- Title: up to 140 characters. Consider less than 15 words. Include the most important traits upfront, move subjective words like perfect or beautiful to the description, try not to repeat words, do not add price, shipping, or sales information.
- Tags: up to 13 tags, each up to 20 characters. Tags can only include spaces, letters, and numbers. A seller is able to use the apostrophe and hyphen within words and phrases, but cannot start a tag with these characters. Tags should be multi-word phrases and use natural sounding language. Attributes also act like tags, and if a phrase appears in attributes, it does not need to be added as a separate tag.
- Description keywords: Etsy search considers keywords and phrases within listing descriptions when ranking listings. Aim to incorporate relevant keywords in the first few sentences. Avoid copying the title verbatim or simply listing top keywords.
- Digital files: upload up to five digital files, maximum 20 MB each. File names are limited to 70 alphanumeric characters, periods, underscores, or hyphens. No file, no publish: a seller will be unable to publish or save an instant digital listing if there is no file attached to it. No variations for digital items.
- Unverified Etsy items, do not build on them: hard maximum file size in MB, maximum pixel dimension, single mandatory aspect ratio, and description character limit. The full list of 23 unverified items across Etsy, eBay, and Amazon is in docs/platform-rules.md section 6.

Export failures must show a plain language error and preserve the seller's listing pack. An export failure must never delete or corrupt the saved pack.

Automated tests, mandatory for every template and mockup:
- Long content (long feature lists, long titles, long tag phrases).
- Real product renders at export size, with text legibility checked.
- Landscape and portrait orientations, and the landscape sheet in a portrait phone warning.
- Premium frame check, per section 9, with a basic frame failing the premium label.
- Visual regression: a reference render per template and mockup, compared on change, with human review of any visual diff before release.

## 11. AI COPY HELP, WITH GUARDRAILS

AI helps with layout, copy, and composition only. AI never invents product content.

Generate and improve: listing titles within the platform limit, descriptions from verified product facts, tags from the seller's own product words, and checklist wording.

Support niche pack tailoring using the seller's confirmed product facts. Tailoring must highlight relevant features from the seller's own product, and must not add features, tab counts, formats, prices, or claims the seller does not have.

Guardrails, mandatory:
- Never fabricate product facts, tab counts, prices, formats, features, reviews, or claims.
- Ask the seller for missing information, with a clear missing info prompt, instead of filling a gap with invented text.
- Every AI suggestion is editable, accept or reject, and shown as a suggestion, not as a final fact.
- AI prompts are managed in admin, versioned, and changeable without code changes.
- Uploaded product files are treated as seller data, not training data, and are deletable with the listing pack.
- AI output quality is checked per niche pack in version 1. A niche pack is not launched for AI generation until sample outputs have been reviewed for grammar, tone, and accuracy against a real product.
- Any AI assisted layout is labelled as a template, not as a real product photo.
- No AI photos pretending to be real screenshots. No AI generated fake product screenshot, ever.

## 12. NICHE PACKS

Version 1 ships 3 niche packs to test: wedding and events, personal finance, and small business planners. Other niches go to backlog.

For each pack, include: niche specific template suggestions, copy tone guidance, keyword starting points from the seller's own product words, and mockup suitability. Each pack must carry a last verified date and source notes in admin. If a pack is out of date, mark it as needing review, do not silently keep showing it as current.

Expansion rule: Add a new niche only after its pack is researched, sourced, and tested with a real product in that niche. Do not add niches by copying another pack and changing the name.

English only in version 1. German, French, and Spanish are Phase 2, gated by demand, the same logic as Global Career Studio.

## 13. PLATFORM PACKS AND EXPANSION PROOF RULES

### 13.1. Platform order

Version 1: Etsy only, digital products only.
Second: eBay.
Third, Phase 2: Amazon.
Later platforms stay in backlog only, see 13.3.

Etsy is the only platform in docs/platform-rules.md with a native digital download flow verified on an official help page.

eBay rules used for planning, from docs/platform-rules.md, checked 2026-11-05:
- Minimum 500 px on the longest side. Recommended about 1600 by 1600 px. Aspect ratio 1:1 or 16:9 looks best.
- Up to 24 pictures per listing. At least one picture is required.
- Main photo: no added text, artwork, or marketing material. No added borders. No watermarks of any type. No graphics such as badges, logos, copyright notices, or watermarks. Photos must accurately represent the item. Placeholder images are not allowed.
- Accepted formats: JPEG, PNG, GIF, TIFF, BMP, WEBP, HEIC, AVIF. Maximum file size 12MB each.
- Title: up to 80 characters. Subtitle, a paid optional upgrade, up to 55 characters.
- No verified separate tag field for eBay in this check. Do not generate 13 tags for eBay by copying the Etsy rule. Keywords belong in the title, subtitle, item specifics, and description.
- eBay digital is restricted and unresolved: sellers need eBay approval to list electronically delivered items outside the Everything Else, Information Products category, and third party reporting in 2026 says eBay removed the ability to create new Classified Ads in non-vehicle categories, while eBay help material still carries older language about the classified ad route. This check did not resolve that conflict on an official eBay page. Do not build an eBay digital download pack as a standard Buy It Now listing. Treat eBay digital as blocked pending a live check in the eBay sell flow.

Amazon rules used for planning, from docs/platform-rules.md, checked 2026-11-05:
- Main image: pure white background, RGB 255,255,255. Product fills at least 85 percent of the image frame. Main image shows the product only, whole, with one unit plus any accessories included in the purchase.
- Size: 500 to 10,000 px on the longest side. Larger than 1,000 px on the longest side preferred for zoom. Optimal size of 1,600 px or more is reported in Seller Central material, not verified in a full standalone help page read here.
- No text or graphics on main image: no text, logos, borders, colour blocks, watermarks, or other graphics.
- Formats: JPEG, TIFF, PNG, or non-animated GIF. JPEG is preferred.
- Title: must not exceed 200 characters including spaces. Conflict recorded: a 2026 Seller Central discussion reports a split into Item name 75 characters plus Item highlights 125 characters. Do not build Amazon title logic on the 200 character total alone without rechecking the current Seller Central title fields.
- Recommendation, not a verified hard cap: at least 1 main image plus at least 6 additional images and 1 video. Hard caps of 7 or 9 images in third party guides are not verified.
- No standard Amazon digital download listing flow, equivalent to the Etsy instant download flow, was verified on an official Seller Central page in this check. Do not assume a Google Sheets planner, a PDF, or a ZIP file can be listed on Amazon as a downloadable product in the same way as on Etsy. A separate Amazon digital route check is required in Phase 2, for example Kindle Direct Publishing, Amazon Digital Services, or a physical media version, before any Amazon digital pack is built.
- Do not build Amazon logic on unverified rules. The full list of 23 unverified items is in docs/platform-rules.md section 6, including Amazon file size cap, mandatory aspect ratio, shortest side minimum, 72 dpi minimum, backend search terms limit, description and bullet limits, category title exceptions, category style guide rules, digital download flow, and colour profile requirement.

Cross platform rules:
- Master image: export a square master at 2000 by 2000 px or larger, in sRGB, as JPEG. That size meets the Etsy recommended 2000 px, the eBay recommended 1600 by 1600 px, and the Amazon zoom preference of larger than 1000 px on the longest side. It does not by itself meet the Amazon pure white main image rule, which depends on background and content, not only on size.
- Titles: do not reuse one title across platforms. Etsy allows 140 characters, eBay allows 80 characters, Amazon allows 200 characters in total with a reported 75 plus 125 split. Generate a separate title per platform from the same verified product facts.
- Tags: do not reuse Etsy tags on eBay or Amazon. Etsy uses up to 13 tags, each up to 20 characters. eBay has no verified separate tag field in this check. Amazon backend search terms are UNVERIFIED in this check at less than 250 bytes. Generate keywords per platform, from the title, item specifics or attributes, and description, as each platform defines them.
- Mockups: real product render inside device frames is a supporting image on Etsy and eBay, where a clean main image is still required, and it is not a compliant Amazon main image, which must show the product alone on pure white. Do not use a device frame mockup as the Amazon main image.
- Text on images: Etsy first image, avoid text overlays and collages. eBay, no added text, artwork, marketing material, borders, or watermarks on any listing photo. Amazon main image, no text, logos, borders, colour blocks, watermarks, or other graphics. Put feature text, tab lists, prices, and claims in the listing copy and in later supporting images only where the platform allows it, and always reconcile that text against the real product.

### 13.2. Expansion Proof Rules, standing requirement confirmed by Ali

1. Shared core, separate packs: upload, reconciliation, template engine, mockup library, export, auth, billing, and analytics are platform neutral, with no platform name, size, limit, or rule inside the core.
2. Platform packs are config, not code branches: each platform is a versioned pack holding sizes, ratios, image count, title and tag rules, background and text rules, export settings, and niche suitability. Adding a platform is adding a pack, with preview, enable and disable, and rollback, without changing core or existing packs.
3. Templates and mockups are platform neutral layouts plus a platform export adapter. A template is never built for one platform only unless marked as such.
4. Data model is platform neutral: platform_id and pack version on listings, templates, mockups, and exports, never a hard coded column per platform such as etsy_size.
5. Rules are admin editable, versioned, never hard coded: sizes, limits, copy prompts, niche rules, pricing, and trial limits are editable in admin with preview and rollback, the same as Global Career Studio.
6. Expansion test: a new platform pack can be added without changing existing Etsy listings, templates, or exports, and without a database migration that renames existing data.

### 13.3. Later Platforms backlog, after Amazon, in groups

In this order, per Ali 5 November 2026. All their rules are to be verified from official sources in Phase 2, before that platform is built. Do NOT invent their image rules or prices.

Group 1, next after Amazon: Shopify, TikTok Shop, Facebook Marketplace, Instagram Shopping.
Group 2: Walmart Marketplace, Google Shopping, Pinterest Shopping.
Group 3: Shopee, Lazada, Daraz, plus WooCommerce as a store platform pack.

Why each fits:
- Shopify and WooCommerce are own store product pages.
- TikTok Shop fits Ali's TikTok traffic.
- Facebook Marketplace and Instagram Shopping are social commerce.
- Walmart Marketplace and Google Shopping are large US marketplaces.
- Pinterest Shopping is vertical lifestyle discovery.
- Shopee, Lazada, and Daraz are Asia and Pakistan region marketplaces.

Mark all their rules as to be verified from official sources in Phase 2, before that platform is built.

## 14. CRISP QUALITY GATE

Standing rule, confirmed by Ali: real product only, every screen is a real render at high DPI from source PDF or screenshot, never an AI generated fake product screenshot.

- No upscale blur: source rendered at or above export size before placement, never upscale low resolution to fill a frame. Block export or show a clear warning with the fix if source is too low resolution.
- No stretch, no colour change, no crop unless seller approves. Contain fit, centred, text sharp and legible, no garbled AI text, no invented numbers, names, or claims.
- Templates and mockups are high resolution vector and image assets. Export at Etsy size 2000px on shortest side, with a quality check before export.
- AI may help with layout, copy, and composition only, never invent product content. Any AI assisted layout is labelled as a template, not as a real product photo.
- Proof example: Maid of Honor Planner PDF by PDF workflow, render at 300 dpi, place at crisp size, check text, as in workspace/etsy-maid-of-honor/templates-redesigned/.
- The premium mockup rule in section 9 sits on top of this gate. A frame can pass the crisp gate and still fail the premium label if it is a flat basic rectangle with a plain background.

## 15. SHARE AND REVIEW LINK, DASHBOARD

15.1. Share and review link: A read only share link for a listing pack, for a partner or reviewer to view and comment, without editing the original.
15.2. Dashboard: Include seller profile, saved listing packs, pack history, templates, mockups, downloads, AI credits, subscription, and account settings.
15.3. Allow sellers to reuse their product facts across multiple packs, and to create platform specific versions from one product without retyping the product facts.
15.4. Download history and export history, so a seller can see what they exported, when, and in which format.
15.5. Cold start: A new seller must be able to produce a usable first pack in one session, with guided prompts, a product check, and a preview that updates live.

## 16. FREE AND PREMIUM SUBSCRIPTION MODEL

Implement two access levels, with all entitlements configurable in admin. Do not hardcode pricing or usage limits throughout the application. Pricing, limits, and trial rules live in configuration and admin, with a change log.

### FREE, starting defaults (configurable, not final pricing)
- Basic listing pack builder.
- A complete, watermark free, commercially usable first pack free. The free limit is a count, such as one pack, not a watermark or a licence trap.
- Selected templates from the version 1 set of 10.
- Basic AI copy credits, with a clear monthly credit count shown in the dashboard.
- Standard JPG exports at Etsy size.
- Limited pack storage, starting default configurable in admin.
- Basic customization (colours and fonts within the free template set).
- No watermark trap: Free exports are genuinely usable. Limits are on template choice, pack count, AI credits, and premium exports, not on making the free pack look deliberately broken.

### PREMIUM, starting defaults (configurable)
- Access to all 10 version 1 templates, and later all templates as they are added.
- Full mockup library, including premium frames.
- Advanced AI generation, higher AI usage limits, and niche specific tailoring.
- More pack storage, configurable.
- More platforms as they are added, starting with eBay, then Amazon.
- Advanced customization, and premium pack bundles (images plus title, description, tags, and checklist as one pack).
- Priority for new templates, mockups, niche packs, and platform packs as they are released.

### PREMIUM TRIAL, starting defaults (configurable)
- Duration: 7 days. The prompt adopts 7 days as the starting default, but duration remains configurable in admin, so Ali can change it without code changes.
- Eligibility: One trial per account. Admin can set additional eligibility rules, for example one trial per payment method or per email domain block for abuse. No card required to start the trial.
- Trial features: Full premium features during trial, within a stated AI credit allowance and export allowance set in admin.
- Conversion rules: At trial end, the user downgrades to Free automatically, with no charge if no card was taken, and with a charge only after clear authorization if a card was taken. The user keeps viewing and downloading packs they created. Premium editing, premium templates, premium mockups, and premium exports lock until they subscribe. The system must never lock a user out of viewing their own listing pack.
- Billing terms disclosure: Trial length, what happens at trial end, monthly and annual prices, renewal date, and cancel method must be shown before trial start and before any payment, in plain language, on the checkout and account pages. Send a renewal reminder before renewal. Do not use a trial that converts silently.
- Never charge without appropriate authorization. No dark patterns, no hidden renewal, no pre ticked consent.

### SUBSCRIPTIONS AND PAYMENTS
- Support monthly and annual subscriptions through Stripe, or another suitable provider if Stripe is not available for the business at launch. Annual must show the saving clearly, as monthly equivalent and total.
- Tax and invoicing: As a Czech trade business, include VAT handling and invoice generation for EU customers in the payment design, and confirm the exact VAT treatment with Ali's accountant before launch. Do not invent tax rates in code comments as if they were advice.
- Cancel: Cancel in the account, in a small number of clicks, with immediate confirmation, end of period access, and a clear record. Do not require contacting support to cancel.
- Refunds: Publish a refund policy before launch, and handle refund requests through Stripe and admin, with a log.

## 17. ADMIN PANEL

Include user management, template management, mockup management, AI prompt management, niche pack management, platform pack management, feature controls, free and premium entitlements, trial configuration, subscription management, AI usage analytics, export monitoring, and system logs.

Administrators must be able to add templates, add mockups through the easy add flow in section 7.3, change plan limits, change trial rules, add niche packs, add platform packs, and update AI prompts without rewriting application code.

Add, from review:
- Versioning for templates, mockups, prompts, niche packs, and platform packs: every change creates a new version, with preview, publish, and rollback. A published template or mockup must not change silently for existing sellers without a version note.
- Content governance: Niche packs and platform packs show source, last verified date, and reviewer. Out of date packs are flagged for review.
- Export monitoring: Export success rate, failure rate by template, mockup, and format, and average export time, without logging product content.
- Usage analytics: Counts of packs, exports, AI credits used, trial starts, trial conversions, and cancellations, aggregated, without reading personal product content for analytics.
- Feature flags: Turn a template, mockup, niche pack, platform pack, or AI feature on or off per plan or globally, without a deployment.
- Mockup licence records: Each licensed frame shows source, licence type, licence date, and where the licence is stored. A frame with no licence record must not be enabled.

## 18. TECHNICAL ARCHITECTURE

Inspect the development environment before selecting final technologies. Environment checked 4 November 2026 for Global Career Studio: Node 24.22.1 and npm 10.9.4 available, Python 3.12.3 available, no local Postgres installed. Recheck the environment in Phase 0 for this project, and do not assume a local Postgres install. Therefore use a hosted Postgres service for development and production, or a containerized Postgres, not a local Postgres install assumption.

Prefer: Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, secure authentication, modular AI provider integration, object storage for uploads and exports, and background processing where required (for example, export jobs, render jobs, and AI jobs that take time).

Separate, as modules with clear boundaries:
- Seller profile data.
- Product facts and listing pack content.
- Template definitions.
- Mockup definitions and screen area mapping.
- Rendering logic.
- AI generation.
- Subscription entitlements.
- Export processing.
- Niche and platform packs.
- Authentication and authorization.

Build a reusable template engine and rendering abstraction, so a new template is a template definition plus styles, not a copy of the whole builder. The same rendering abstraction must feed JPG export and preview, so a pack does not look different in each output without a documented reason.

Modularity for login split: Auth is a separate module with an interface, so changing from shared login to separate login, or to single sign on, does not require rewriting the builder, templates, mockups, or billing.

Object storage: Uploads and generated exports are stored in object storage with signed access, not in the database as blobs, and with deletion on pack deletion where the user requests it.

Platform neutrality, mandatory: The core holds no platform name, size, limit, or rule. All platform rules live in versioned platform packs, per section 13.2.

## 19. SECURITY AND PRIVACY

Implement secure authentication, role based permissions, file upload validation, rate limiting, secure API access, data deletion, GDPR conscious data management, secure environment variables, and audit logs.

Product files and listing packs are seller business data. Protect them appropriately.

Add, from review:
- Upload validation: file type, size, and content checks for product PDFs, screenshots, and mockup frames, with rejection messages that do not leak system details.
- Rate limiting on auth, AI generation, and export endpoints, with clear user facing messages when a limit is hit.
- No training on user data: Seller product files, listing packs, and copy are never used to train AI models, unless the seller gives separate, explicit consent for a specific purpose. State this in the privacy policy.
- Data deletion: Delete account, listing packs, uploads, exports, and AI logs for that account on request, with a confirmation and a completion record. Backups must expire on a stated schedule.
- Access control: Users can only access their own listing packs, unless they explicitly share a read only link. Admin access to user packs is logged, limited, and only for support with a recorded reason.
- Audit logs: Login, subscription changes, trial starts, export failures, and admin changes are logged with time, actor, and action, without logging product content or secrets.

## 20. GROWTH, SEO, AND ANALYTICS

Add, as part of the product, not as an afterthought:
- SEO landing pages per template, per niche pack, and per platform pack, generated from template, niche, and platform data, with real content, not thin placeholder pages. The product name itself, Listing Photos Generator, is a keyword sellers search for, and landing pages must use it in plain words.
- NVConsult content link: Guides and country pages on nvconsult.eu link to the relevant listing tool pages, and tool pages link back to NVConsult consultation where relevant, with no hard coded URLs in templates.
- Analytics: Measure signups, trial starts, conversions, template use, mockup use, export success, and churn, aggregated and privacy conscious. Do not track product content, product text, or personal details for marketing analytics.
- Feedback loop: In product feedback for templates, mockups, and AI suggestions, with a simple rating and optional comment, reviewed in admin, used to improve templates, mockups, and prompts.

## 21. DEVELOPMENT APPROACH

Do not attempt to build everything in one unstructured generation. Work in phases, with a tested, reviewable increment at the end of each phase:

Phase 0. Repository setup: Create the GitHub repository structure, README, PROMPT.md, PROJECT_STATUS.md, .env.example, linting, and CI test skeleton. Confirm remote, visibility, and branch rules with Ali.
Phase 1. Research and planning: Competitor research doc, platform rules doc, architecture doc, database design, MVP scope confirmation, and open decisions list (price, Stripe account, AI provider, domain, hosting, mockup frame licensing). No feature code is claimed complete in this phase.
Phase 2. Architecture and database design: Finalize schema, template engine design, mockup engine design, rendering abstraction, auth module boundary, entitlement model, and platform pack model, with the Expansion Proof Rules in section 13.2 as acceptance tests.
Phase 3. Design system and frontend: Design tokens, components, dashboard shell, and mobile layouts, with no hard coded copy in components where admin copy is required.
Phase 4. Authentication and user profiles: Shared login initial implementation, seller profile reuse, and account settings.
Phase 5. Template engine: Engine plus the 2 proof templates first, hero and features, with the Maid of Honor Planner, then the full version 1 set of 10 templates, each passing the distinctness test, the Crisp Quality Gate, and visual checks.
Phase 6. Builder: Upload and reconciliation, niche pack choice, template and mockup choice, live preview, autosave, version history, and share and review link.
Phase 7. Export: Export engine plus automated template and mockup tests for long content, real product renders, orientations, and premium frame checks. Etsy export first.
Phase 8. AI copy help: AI writer, niche tailoring, prompt management in admin, credit limits, and guardrails.
Phase 9. Monetization: Entitlements, trial, Stripe monthly and annual, VAT invoices, cancel and refund flows.
Phase 10. Admin panel: Full admin panel, mockup easy add flow, versioning, feature flags, platform pack management, and monitoring.
Phase 11. Testing: Full test suite, visual regression, export tests, reconciliation tests, mockup fit tests, security checks, and a pre launch checklist.
Phase 12. Deployment preparation: Production hosting, backups, monitoring, terms, privacy policy, refund policy, and launch checklist.

Later phases, not version 1:
- eBay phase: eBay platform pack, after a live check resolves the eBay digital route, with separate titles and no Etsy tag reuse.
- Amazon phase: Amazon platform pack, after the standalone Amazon image guide is rechecked in Seller Central, with a pure white main image as a separate export, and after a separate verified digital route is found or a physical presentation route is decided.
- Later platforms phases: one phase per platform group in section 13.3, each starting with a live official source check, then a versioned platform pack, with no core change.

Prioritize a functional, polished core product before adding advanced features. If a phase reveals that a feature cannot meet quality or export standards, cut scope for that release and record it in PROJECT_STATUS.md, rather than shipping a broken version and claiming it is complete.

Definition of done, for every phase: Code is in the repository, tests pass, the feature is tested as a visitor (logged out where relevant, mobile, full click through), export output is inspected where relevant, docs are updated, and PROJECT_STATUS.md is updated. A preview or screenshot alone does not count as done.

## 22. DELIVERABLES, VIA THE REPOSITORY

Provide, in the repository, not as manual drops:
- Complete source code.
- Database schema and migrations.
- Environment variable example (.env.example).
- Installation instructions.
- Development instructions.
- Deployment instructions.
- Automated tests, with test reports in CI.
- API documentation.
- Architecture documentation.
- Feature status documentation, kept current in PROJECT_STATUS.md and docs/feature-status.md.

Maintain PROJECT_STATUS.md throughout development. Never claim a feature is complete unless it works and has been tested.

## 23. OPEN DECISIONS, STILL NEEDED BEFORE PAYMENTS AND AI GO LIVE

These are not blockers for Phase 0 and Phase 1, but they are blockers for a commercial launch, and must be decided by Ali, not invented by Muse:
- Final price for monthly and annual premium, and currency. Starting defaults in section 16 are configuration defaults, not prices. No competitor price in section 3 may be used as the price. A live recheck of competitor pricing pages is required before any pricing decision.
- Stripe account owner, business details, and VAT treatment confirmation. Confirm the exact VAT treatment with Ali's accountant before launch. Do not invent tax rates.
- AI provider choice and budget cap for AI credits, plus fallback provider if the primary is unavailable.
- Domain or subdomain for the tools site, and the exact nvconsult.eu link locations. Note, 5 November 2026: the tools site domain is on hold. Do not check domain availability and do not purchase anything until Ali reopens it. Use placeholder domain configuration only.
- Hosting provider for the web app, hosted Postgres provider, and object storage provider.
- GitHub repository name, owner, and visibility. Decided and already live: saeedr123/listing-photos-generator, public, owner saeedr123.
- Privacy policy, terms, and refund policy final wording, with a legal check for GDPR and consumer rights.
- Mockup frame licensing: which premium frames are built in house, which need a licence, the licence source and type for each licensed frame, and the licence cost, with no price invented. Do not buy any licence until Ali approves it. Adobe Stock is direction and inspiration only, see section 9.3.
- Reconciliation behaviour to test with real sellers: should the tool fix a mismatch, or only flag it and let the seller fix the source product.
- Trial shape to test with real sellers: is a 7 day trial, no card, one per account, the right trial for a listing tool, or should the trial be per listing pack.
- Mockup pricing to test with real sellers: should mockups be free for all, or a premium feature, when the core listing pack is free to build and paid to export in full.
- Which niche pack actually converts first: wedding planners, finance planners, or small business planners. Test with real sellers before building further niche packs.

Until these are decided, the system must be built with placeholders and configuration, not with invented prices, invented legal wording, or a fake payment flow.

## 24. FINAL OBJECTIVE

Deliver a complete, commercially viable Listing Photos Generator that can operate as a standalone SaaS business, with a polished version 1 core for Etsy digital products, a clear Phase 2 path to eBay, Amazon, and later platforms, and a repository that Ali owns and can hand to another developer without losing the history.

The application must be suitable for worldwide sellers and capable of producing crisp, honest, publishable listing packs, with premium mockups, real product renders only, and no invented product facts.

Build for real sellers, not merely for a visual demonstration.

End of prompt.
