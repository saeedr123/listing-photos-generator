# Mockup Engine

Status: Phase 2, built 2026-11-07. Etsy only v1, digital products only.
3D mockup studio added 2026-11-16 and 2026-11-17, see "3D mockup studio"
below. The studio follows the 14 November direction change, which is
provisional until Saeed approves it (PROMPT.md section 7.6). The parts
above that heading describe the flat SVG frame library, which is kept as
the basic 2D fallback.

## What it is

The Mockup Library places the seller real product render inside a device
or scene frame, so a listing image looks like a finished product photo
instead of a flat screenshot. The screen inside a mockup is always the
seller real product render, never invented. A mockup is a presentation
frame and must never be presented as a real sheet screenshot.

## Public API

Apps import from `packages/mockup-engine/src/index.ts` only:

- `loadMockups(dir)`, `loadMockupFile(path)`, `validateMockup(m)`
- `containFit(input)`, `orientationOf(w, h)`, `orientationAllowed(allowed, orientation)`
- `checkPremium(mockup)`, `licenceGate(mockup)`
- `validateAddFlow(steps)`, `getMockupById(mockups, id)`,
  `getMockupsForNiche(mockups, niche)`, `rollbackMockupToVersion(current, older, reason)`

## Starter set

| Mockup | Frame | Screen areas | Orientations | Quality label |
|---|---|---|---|---|
| Laptop Alone, Straight | `frames/laptop-alone.svg` | 1, landscape | Landscape | Basic, not premium (relabelled 2026-11-16, version 2) |
| Phone Alone, Straight | `frames/phone-alone.svg` | 1, portrait | Portrait | Basic, not premium (relabelled 2026-11-16, version 2) |
| Tablet Alone, Straight | `frames/tablet-alone.svg` | 1, landscape | Landscape, portrait | Basic, not premium (relabelled 2026-11-16, version 2) |
| Laptop Plus Phone Hero | `frames/laptop-plus-phone.svg` | 2, laptop and phone | Landscape | Basic, not premium (relabelled 2026-11-16, version 2) |
| Flat Feature Frame | `frames/flat-feature-frame.svg` | 1, landscape | Landscape, portrait | Basic, not premium |

Straight devices are the default, no warp. All five frames are built in
house as SVG at high resolution (3000 by 2000, phone 2000 by 3000). No
Adobe Stock watermarked preview, no unlicensed PSD, and no other seller
mockup image was used. Full asset records are in
`packages/mockup-engine/ASSET-REGISTER.md`.

## Fit rules

Contain fit, centred, no stretch, no colour change, no crop unless the
seller approves it. `containFit` returns the scale, fitted size, centred
offsets, and letterbox amounts. A landscape sheet in a portrait phone
warns, offers a portrait screenshot or an approved crop, and never
stretches to fill. The phone screen shows the sheet as a small band with
space above and below unless a portrait screenshot or an approved crop
is used. That warning is tested in `tests/mockup-fit.test.mjs`.

## Premium quality check

Premium means realistic perspective, soft realistic shadows and depth,
and a lifestyle or desk scene, not a flat basic rectangle with a plain
background. `checkPremium` checks six declared criteria: realistic
perspective, soft realistic shadows, depth, lifestyle or desk scene,
realistic materials and edges, and screen crisp at export size.

A flat basic rectangle with a plain background FAILS the premium label,
even if the screen inside it is crisp. The Flat Feature Frame is
labelled basic on purpose and the test proves it fails premium.

The four device frames were declared premium on 2026-11-07 without a
human visual review. That broke PROMPT.md section 9.2. On 2026-11-16
they were relabelled basic at version 2, with the change recorded in
each definition under `changeNote` and `previousVersion`. Their premium
criteria now read false for perspective, materials and edges, shadows,
and depth, because a flat straight on SVG illustration does not meet
them and no review has verified them.

A premium label now needs two things: every criterion true, and an
approved human visual review sign-off (`humanReview` on the definition:
who reviewed, when, who approved, when, decision). `validateMockup`
fails a premium label with no approved sign-off at every status, not
only when published. `checkPremium` reports the missing sign-off as a
failed criterion. No frame in the library is labelled premium today.

## Licence records

Every mockup definition carries a licence record: source, licence type,
licence date, and licence storage location. All five starter frames are
`own-built, owned outright`, built in house on 2026-11-07, so no third
party licence is required. `licenceGate` blocks enabling a frame whose
licence record is incomplete. A frame with no licence record must not be
enabled in the live library.

## Easy add flow

Admin adds a mockup in five steps, with no code change and no deploy:
upload a frame, mark the screen area, set allowed orientations and niche
packs, preview it with a real product render, then enable it. Duplicate,
edit, hide, and rollback are version operations. `validateAddFlow`
reports every missing step before enable. A new mockup only joins the
live library after a crisp render test and the premium quality check.

## Free legal images

Followed `docs/free-image-sources.md` exactly, Layer 1 first: all five
frames and all backgrounds in the proof templates are built in house.
No Pexels, Unsplash, or Pixabay image is used in any proof template or
mockup. No stock image is offered standalone, and no stock library is
built into the tool.

Pixabay: the full Pixabay Content License has NOT been read as a legal
decision. Pixabay use requires the full licence to be read in Phase 2
before production use. No Pixabay image is used in the proof templates.
Pexels API key issuance was reported paused in the source doc; no live
API search is relied on.

Every asset used carries source, creator, licence, download date, and
changes in `packages/mockup-engine/ASSET-REGISTER.md`. No asset shows a
recognisable person, logo, or trademark.

## 3D mockup studio

Added 2026-11-16 and 2026-11-17. Provisional until Saeed approves the 14
November direction change (PROMPT.md section 7.6, docs/architecture.md
section 6.7).

### What is built

| Part | Where | State |
|---|---|---|
| Scene engine: GLB load, design as a texture on a named mesh, PBR materials, environment lighting, soft contact shadows, free orbit camera, camera presets, device colours, background from the style kit | `apps/web/src/studio/engine/`, `apps/web/src/studio/components/ShotViewport.tsx` | Built. Checked in a browser, see "How it was tested". |
| Model registry: versioned JSON records, admin managed | `packages/mockup-engine/src/studio/model-registry.ts`, `registry-service.ts`, `/admin/models` | Built. Unit tested and checked in a browser. |
| Print and paper models: A4 sheet, US Letter sheet, fanned stack of 3 (A4 and US Letter), clipboard | `packages/mockup-engine/assets/models/`, `scripts/build-studio-models.mjs` | Built in house. Basic quality. |
| Shots and style kit | `packages/mockup-engine/registry/shots/`, `config/style-kits/`, `/admin/style-kits` | Built. The kit holds placeholder values. The shots are working drafts. |
| Export and batch: offscreen supersampled render, export gate, zip, preview grid | `apps/web/src/studio/engine/render-shot.ts`, `export-set.ts`, `packages/export/src/studio-gate.ts`, `/studio` | Built. Checked in a browser. |
| Colour extraction: 3 to 5 dominant colours, offered as a style kit variant | `packages/mockup-engine/src/studio/colour.ts` | Built. Unit tested and checked in a browser. |

### Library choice

three.js with React Three Fiber, as the brief asks.

- React in this repository is 18.3.1 (`apps/web/package.json`). React Three Fiber 8.x declares `react >=18 <19` as its peer. React Three Fiber 9.x needs React 19. So the matching major is 8: `@react-three/fiber` 8.18.0.
- three is pinned to exactly 0.170.0, not a range, so two installs render with the same code and reference renders stay comparable.
- `@react-three/drei` is not used. The only helper needed was orbit controls, and three.js ships `OrbitControls` itself. Fewer dependencies, fewer licences to track.
- Both packages are MIT licensed. Contact shadows follow the three.js contact shadow example (MIT) and use the blur shaders three.js ships.
- React Three Fiber drives the live preview only. The scene itself is built by a plain three.js module (`scene-builder.ts`) with no React in it, and the export render uses that same module. That is what keeps the preview and the export from drifting apart, as docs/architecture.md section 12.2 requires.

### Model registry

A record holds: model file reference (storage key, bytes, sha256), surfaces (mesh name, screen or paper, aspect, page slot, letterbox colour), allowed orientations, camera presets and the default preset, device colour options, category (laptop, phone, tablet, print, bundle, desk), tags, preview thumbnail, licence record, unbranded confirmation, quality label, premium criteria, human review sign-off, version, status, change note.

Adding a model needs no code change and no deploy:

1. Upload a GLB. The server checks the bytes are a real GLB and lists the meshes and materials it holds.
2. Name the screen mesh, from that list.
3. Set allowed orientations, camera presets (orbit to a view, save it) and device colours.
4. Preview it with a real product render. The preview measures the mesh and warns if the aspect in the record would stretch the design, or if the mesh UVs do not cover the full square.
5. Enable it.

Duplicate, edit, hide and roll back are version operations. Every save is a new version document. Nothing is edited in place and nothing is deleted. Rollback stores an older snapshot as a new version in preview status, so it never goes live by itself.

A model can only be enabled when: the model file is in storage, every named mesh and material is really in the file, the licence record is complete (source, type, date, storage location), the admin has confirmed no brand logo, and the admin has previewed it with a real product render.

Requirement for an uploaded GLB: the screen mesh UVs must map the full 0 to 1 square to the visible screen, with the origin at the top left (the glTF convention).

Storage: records and uploaded files go through the object storage interface in `packages/storage`. Records kept in the repository (`packages/mockup-engine/registry/`) are read only seeds. An admin edit of a seeded record is stored as the next version in object storage. The repository file is not rewritten. This is stop point 1 in the brief: no production storage provider is chosen. See docs/architecture.md section 6.7.

### Fit and colour rules, and how the engine keeps them

- Contain fit, centred, no stretch, no crop. The design is drawn onto a texture canvas that has exactly the aspect of the surface, at the design's own pixel size, with whole pixel offsets. The mesh UVs stay a plain square, so no shader scales the design unevenly. Maths in `surface-fit.ts`.
- No recolour. The design is shown with an unlit material that skips tone mapping. Measured on the full size renders of the test charts: the pure red, green, blue, cyan, magenta, yellow, grey and white patches come out with exactly their source values.
- The price of that rule: a design surface takes no shading. A sheet of paper does not darken where another sheet overlaps it, and a screen shows no reflection. Depth comes from the model shape and the contact shadow on the ground. Lit paper would look more real and would change the design colours, which the Crisp Quality Gate forbids. This is a decision for Saeed.
- Never upscaled. The engine measures where each surface lands in the output image. The export gate blocks an image whose design has fewer pixels than its placement.
- Landscape content on a portrait screen, or portrait content on a landscape screen: a warning with the offer of a matching screenshot or an approved crop. The design is shown as a band. It is never stretched.
- The empty band takes the surface letterbox colour from the registry record. Screens use a light neutral grey, paper uses white.
- No brand logos. Every built in device is generic geometry with no logo. No built in model holds any image texture, which a test checks.

### Shots, style kit and batch

- A shot is model(s) plus camera plus lighting plus background. A shot holds no colour and no wording. Those come from the style kit.
- A style kit holds background colours, accent colour, fonts, badge style and wording, text slots (headline, feature bullets), and the ordered shot list. A shot entry in the kit can override the background (solid, gradient, or desk texture).
- `config/style-kits/modustemplates.json` did not exist. A schema valid draft was created with placeholder values, marked `isPlaceholder: true`, status draft. A kit with placeholder values cannot be published.
- The 10 shots are working drafts in preview status. `docs/shot-list.md` does not exist and was not invented.
- Batch: one design (one image per page) plus one style kit gives the ordered set, target 7 to 10 images (from `config/studio.json`). With the 3 page test charts the draft kit gives 10 images: hero, angled hero, laptop plus phone, phone view, tablet view, printed sheet, sheet on a clipboard, fanned pages, what is inside, formats and sizes.
- A shot that needs more pages than the design has is left out with the reason shown. A page is never repeated or invented to fill it.
- The formats and sizes shot shows the page on an A4 sheet and a US Letter sheet. It carries a seller note: only include it if the product is delivered in both sizes.
- Platform values come from the platform pack and nowhere else: export size (shortest side), format, colour profile, JPG quality, image limit, first image orientation, and the rule to avoid text on the first image. The mockup engine and the scene engine hold no pixel size. A test changes the pack value and shows the output size follows.
- Proof mode: while the kit is a draft or holds placeholder values, or any model or shot used is in preview status, the set is a proof. The zip name ends in `-proof` and the manifest says `publishable: false` with the reasons. Today every set is a proof.

### Export

1. The browser renders each shot offscreen at 2 times the output size on each side, then reduces it onto the kit background and draws the kit text. Result: a lossless PNG.
2. The PNG goes to `POST /api/studio/gate`, which runs the rendered image gate in `packages/export` (size from the pack, sRGB, no colour change, no stretch, no unapproved crop, no upscaled design, no transparency), then encodes the JPG with the sRGB ICC profile embedded, then reads the profile back from the JPG bytes.
3. The browser packs the JPGs in listing order with a `manifest.json` into a zip.

Nothing is published automatically.

### Determinism

Determinism here means: same camera, same screen bounds, same pixel size, and a pixel diff under a stated threshold against one reference render. Byte identical output across GPUs is not a requirement and is not claimed.

- Reference browser: Chromium 153 headless (Playwright build), ANGLE on SwiftShader, Linux x86_64. Named in `config/studio.json`.
- Threshold, in `config/studio.json`: a pixel counts as different when a channel differs by more than 12 of 255. At most 0.2 percent of pixels may differ, and the mean absolute difference may be at most 0.5.
- Screen bounds: each corner of each surface may move at most 0.5 px.
- One reference render per shot is stored in `tests/visual/reference/`, with its framing record. References are stored reduced by 4 (750 by 500 for a 3000 by 2000 render), to keep the repository small. The comparison reduces the new render the same way first.
- Measured: every shot rendered twice in one session matched itself with zero differing pixels. Every shot rendered again in a new session on the production build matched its stored reference with zero differing pixels.
- Not measured: any other browser, any real GPU. Fonts are generic families with no font file, so text can differ on a machine with other system fonts.

### How it was tested

Automated, in `tests/run-tests.sh` (123 tests for the studio parts):

- `tests/studio-registry.test.mjs`: registry validation, add flow, version operations, premium label rules, licence records, migration of the 5 SVG frames, and a new GLB model added through the registry service with no code change, then used in a shot and a batch plan.
- `tests/studio-fit.test.mjs`: texture fit maths, crisp check, stretch check.
- `tests/studio-batch.test.mjs`: shot and style kit validation, batch set order, colour extraction, pixel diff and framing comparison, studio config.
- `tests/studio-export.test.mjs`: rendered image gate from pack values, JPG with the embedded sRGB profile proved from the bytes, zip writer.
- `tests/storage.test.mjs`: storage interface contract, key safety, provider swap, versioned documents.

In a browser, by `tests/visual/studio-visual.cjs --e2e`, on the production build, 2026-11-17, in the reference browser only:

- All 10 shots: framing, output size and pixels match the stored references.
- Export: the zip holds 10 JPGs in order plus the manifest. Each JPG is 3000 by 2000, RGB, with the sRGB profile in its bytes.
- Admin: a GLB was uploaded, its screen mesh named, a wrong aspect caught by the preview, a draft saved, enable refused before the preview step, then enabled, found in the studio catalog, served from object storage, then hidden. A style kit edit was refused for a bad colour, saved as a new version, and rolled back.
- Live viewport: orbit by drag, device colour change and the design colours variant were looked at in screenshots.

That script is not part of `npm test` or CI. It needs a running web app and a browser with WebGL.

### Not built, or not verified

- No human visual review of any render. The reference renders record what the engine draws today, not an approved look. No model is labelled premium.
- No real product render was used. The repository holds none. All checks used the test charts in `tests/fixtures/designs/`, which are test charts, not product content. So `previewedWithRealRender` is false on every built in model and they are in preview status, not published.
- Only the reference browser was used: headless Chromium with a software GPU. Not checked on a real GPU, in Firefox or Safari, or on a phone. Not checked by a person using a mouse.
- HDRI files: the lighting preset type and the loader path exist, but no HDRI asset exists, so that path has never run.
- Font files: the kit can name a font file with a licence record, and the loader exists, but no font file exists, so that path has never run.
- Preview thumbnails: the record field and the upload kind exist. The admin screen does not set a thumbnail.
- The premium label cannot be set from the admin screen. There is no sign-off form yet. The rule itself is enforced in validation.
- Duplicate and roll back of a model were tested through the registry service, not by clicking the admin buttons.
- Design input is images only (PNG, JPG, WebP), one per page. PDF pages are not rasterised in the studio.
- Sellers cannot edit the text. Headline, bullets and badge come from the style kit, which is admin edited.
- Category `desk` has no prop models. Category `bundle` has no single file model: laptop plus phone is a shot with two models.
- Not wired to listing packs, the reconciliation check, entitlements, export history, or rate limits. `/studio` and `POST /api/studio/gate` are open to any visitor, like the existing builder demo. Gate and rate limit them before any deployment.
- The export gate trusts the placement numbers the browser reports. It checks the real PNG size and transparency itself.
- No server side or queued render runner. Only the browser runner exists.
- No production object storage adapter.
