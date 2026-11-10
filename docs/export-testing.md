# Export Testing

Status: Phase 2, built 2026-11-07. Etsy only v1, digital products only.

## Export flow

1. Reconciliation check against the verified product facts.
2. Crisp Quality Gate on every product render.
3. Render each template in order through the single rendering path.
4. Rasterize to JPG at the platform pack size.
5. Write the copy paste text pack and the export manifest.
6. No auto publishing. Export produces files and text for the seller to
   upload to Etsy themselves.

## Etsy pack

Values live in `packages/export/src/etsy-pack.json`, verified on official
Etsy pages on 2026-11-05, recorded in `docs/platform-rules.md`:

- Format JPG, quality 92, colour profile sRGB.
- 2000px on the shortest side. First photo at least 635px.
- Up to 20 photos. Title up to 140 characters. Up to 13 tags, each up
  to 20 characters.
- First photo landscape or square, avoid text overlays and collages on
  the first thumbnail.

No hard maximum file size, no maximum pixel dimension, no single
mandatory aspect ratio, and no description character limit were verified,
so none is set. The 1MB figure in the source is an upload warning, not a
hard cap.

## Reconciliation, mandatory before export

Tab count, price, format, and claims must match the real product. The
check in `packages/export/src/reconciliation.ts` compares the listing
values with the verified facts and returns each item with the expected
value, the found value, the action, and the fix in plain language.

- Tab count mismatch: blocks export.
- Price mismatch: blocks export.
- Format mismatch: blocks export. A Google Sheets product must never be
  described as Excel.
- Unverified claim: warns with a fix, it does not silently publish.

The tool does not fix a mismatch by changing a product fact. The seller
fixes the source product or the listing fact, then re-runs the check.
Whether the tool should ever fix a mismatch itself is an open decision
for Ali (PROMPT.md section 5.3).

## sRGB ICC profile

Every exported JPG embeds a real sRGB ICC profile, proved from the file
bytes, never from a config flag.

- `packages/export/src/srgb_icc.py` builds the profile bytes in pure
  Python, stdlib only: ICC v2, display class, RGB input, XYZ PCS, D50
  white point, sRGB primaries, and the sRGB tone response as a 1024
  entry curve. Description tag: "sRGB IEC61966-2.1", 6600 bytes. No
  profile file existed on this machine and no new dependency was added.
  Pillow opens the built profile and reads its description back as
  "sRGB IEC61966-2.1".
- `packages/export/src/rasterize.py` saves every JPG with that profile,
  so Pillow writes it as a JPEG APP2 ICC segment.
- `packages/export/src/icc.ts` reads the profile back out of the JPG
  bytes after rasterizing: it parses the JPEG markers, reassembles the
  APP2 ICC chunks, and checks the header (acsp, mntr, RGB, XYZ) and the
  description tag. A missing or invalid profile blocks the export, so a
  pack can never ship claiming sRGB while the file carries no profile.
- The export manifest records the profile per image (`iccProfile`,
  `iccProfileEmbedded`, `iccVerification`) and at pack level
  (`iccProfile`, `iccVerification`).
- The export tests prove it from the bytes: the APP2 ICC segment and
  the sRGB tag must both be in the file, the parsed description must be
  "sRGB IEC61966-2.1", and Pillow must read the profile back and open it
  as sRGB. A stripped JPG with no profile fails the same check.

## Crisp Quality Gate

In `packages/export/src/quality-gate.ts`:

- Real product renders only at high DPI. A source render must be at
  least as large, in pixels, as the box it is placed in at export size.
  Anything smaller would need upscaling, which the gate forbids, so it
  blocks export with the fix.
- No stretch, no colour change, no crop unless approved.
- Colour profile must be sRGB. Shortest side must be 2000px.
- A sample render blocks a real export. In proof mode it warns instead,
  and the manifest marks the pack as a sample render, never as a
  publishable pack.

## Text pack

`packages/export/src/text-pack.ts` builds the copy paste text pack:
title, description, tags, and pre-publish checklist, in plain text. It
validates the title against the 140 character limit, the tag count
against 13, each tag against 20 characters, and the Etsy tag character
rules, and returns each problem with a fix. An invalid text pack blocks
export.

## Failure handling

Export failures show a plain language error with a fix
(`packages/export/src/errors.ts`) and preserve the saved pack. Work is
written to a temporary directory first and only moved into place on
success, so a failed export never deletes or corrupts an earlier export.
This is tested: a good pack is exported, a bad export is attempted to
the same pack name, and the first manifest and JPG are byte identical
afterwards.

## Rendering path

One rendering path feeds preview and export. `packages/rendering`
builds a render model from the template, the adapted canvas, the
verified facts, and the resolved copy. Preview renders that model as
SVG. Export rasterizes the same model to JPG with
`packages/export/src/rasterize.py` (Python 3, Pillow, DejaVu fonts, no
network). The manifest records `previewExportDifference: null` when the
two agree. If they ever differ, the difference is recorded, never silent.

Known limits of the v1 proof rasterizer:

- The screen content is a schematic drawn from the verified tab names,
  not a real sheet screenshot. A publishable pack must place the seller
  real product render pixels in that box instead. The real proof pack
  below does that with the real renders.
- JPGs are saved in RGB mode with the sRGB ICC profile embedded (see the
  sRGB ICC profile section above). The manifest records the profile per
  image and at pack level, with the byte level proof.
- The rasterizer needs Python 3 with Pillow. If it is missing, export
  fails with a plain language error and the saved pack is preserved.

## How to run the tests

From `~/workspace/listing-studio`:

```
./tests/run-tests.sh
```

Or directly:

```
node --test tests/template-distinctness.test.mjs tests/mockup-fit.test.mjs tests/rendering.test.mjs tests/reconciliation.test.mjs tests/export.test.mjs tests/real-pack.test.mjs
```

Test outputs are written under `tests/.tmp-export-output/` and removed
after the run. A durable proof export is kept in
`tests/proof-output/proof-pack/`.

## Test results, 2026-11-10

Command: `./tests/run-tests.sh`

Result: 56 tests, 56 pass, 0 fail.

- Template distinctness: 9 tests. Mockup fit: 13 tests. Rendering: 8
  tests. Reconciliation: 6 tests. Export: 15 tests, including the two
  new sRGB ICC tests (profile proved from the JPG bytes, stripped JPG
  fails the same check). Real proof pack: 5 tests (builder runs, every
  image 3000x2000 RGB with an sRGB ICC profile in its bytes, manifest
  names the source file for every image, no frame called premium, 7
  templates left out with reasons).

## Test results, 2026-11-07

Command: `./tests/run-tests.sh`

Result: 49 tests, 49 pass, 0 fail.

- Template distinctness: 9 tests. 10 templates, all valid, all distinct,
  colour only variant fails, no product facts in templates.
- Mockup fit: 13 tests. 5 starter mockups, contain fit, landscape sheet
  in portrait phone warns, orientation check, flat frame fails premium,
  easy add flow steps.
- Rendering: 8 tests. Etsy adapter sizes, same model for preview and
  export, missing token warns, long content flagged, SVG escaping.
- Reconciliation: 6 tests. All match passes, tab count, price, and
  format mismatches block, unverified claim warns.
- Export: 13 tests. JPG 2000px shortest side, sRGB, order, legibility
  (pixel variance and colour count, plus visual inspection of the proof
  JPGs), portrait and landscape in one pack, text pack valid, blocks on
  reconciliation, low resolution, and sample render, failed export
  preserves the saved pack, long titles and long tag phrases fail.

Bugs found by running the tests and fixed in this phase, not hidden:

- The rasterizer fell back to a tiny default bitmap font for italic
  serif and oblique sans, because those DejaVu variants do not exist on
  this machine. Titles rendered unreadably small. Fixed by picking the
  nearest real font variant and warning on stderr.
- The hero proof first drew one big sheet instead of a laptop plus a
  phone. Fixed by placing each mockup screen area separately.
- Sheet rows overlapped in the laptop screen and long tab names ran past
  the phone screen edge. Fixed by sizing row text from row height and
  shortening lines to fit.
- The phone screen wrongly got a laptop base bar. Fixed by marking each
  screen landscape or portrait from the mockup frame dimensions.
- The VM `/tmp` is a 512M tmpfs and was full when the export tests first
  ran. Test outputs now live under `tests/.tmp-export-output/`.

## Proof output

`tests/proof-output/proof-pack/` holds the two proof templates rendered
at export size: `01-hero.jpg` and `02-feature-close-up.jpg`, both
3000 by 2000, RGB JPEG, plus SVG previews, render specs, `text-pack.txt`,
and `manifest.json`. The manifest marks `sampleRender: true` and
`proofMode: true`. Both JPGs were visually inspected: large crisp title,
legible subtitle, laptop and phone screens with legible tab rows, pill
bar below, no overlapping text.

## Real proof pack

`tests/proof-output/real-pack/` holds the proof pack built from the REAL
Maid of Honor Planner renders in
`workspace/etsy-maid-of-honor/templates-redesigned/`, not the schematic
sheet. Built by `tests/proof-output/real-pack/build-real-pack.py`
(Python 3, Pillow, no network), verified by `tests/real-pack.test.mjs`.

Method: each real render is placed whole into a 3000x2000 Etsy canvas
with contain fit, centred, no stretch, no crop, no colour change. Every
source is already 3000x2000, so the placement is 1 to 1. The only
changes from the source file are a JPEG re-save at quality 92 and the
embedded sRGB ICC profile. The mean absolute pixel difference from
re-saving is measured per image (0.13 to 0.24 per channel across the
four images) and recorded in the manifest.

Built (4 images): `01-hero.jpg` (hero, filled laptop plus phone),
`02-feature-close-up.jpg` (feature close up, Start Here and Guide tab on
a laptop), `03-what-is-inside.jpg` (what is inside, Home Dashboard
directory plus Mobile Quick-Expense Log on the phone),
`04-feature-itinerary.jpg` (feature close up, Itinerary and Event
Schedules layout, tablet screen blank in the source, recorded as a
defect, layout proof only).

Left out (7 templates, named with reasons in the manifest, nothing
faked): bundle-all-tabs, features-grid, final-call-to-action,
how-it-works, mobile-view (portrait canvas, all real renders are
landscape), sizes-and-formats, who-it-is-for (square canvas, no square
real render exists).

`MANIFEST.md` in the same folder records, for every image, the exact
source file path and sha256, template, mockup shown, facts used, and
placement, plus the facts for the test product (12 tabs, Google Sheets
format, USD 13.97 list, USD 9.78 launch, task supplied, not live
rechecked). It states that no frame in this pack is called premium, what
Saeed must look at in review (perspective, shadows, depth, scene), and
that no frame is called premium until he approves it in plain words.
The earlier schematic proof pack is untouched and stays labelled as a
schematic layout proof.
