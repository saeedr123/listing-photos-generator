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
  real product render pixels in that box instead.
- JPGs are saved in RGB mode, which is sRGB for web JPEG, and the
  manifest records colour profile sRGB. No ICC profile file is embedded,
  because no sRGB ICC profile file is present on this machine. Embed a
  real sRGB ICC profile when the app ships its own profile asset.
- The rasterizer needs Python 3 with Pillow. If it is missing, export
  fails with a plain language error and the saved pack is preserved.

## How to run the tests

From `~/workspace/listing-studio`:

```
./tests/run-tests.sh
```

Or directly:

```
node --test tests/template-distinctness.test.mjs tests/mockup-fit.test.mjs tests/rendering.test.mjs tests/reconciliation.test.mjs tests/export.test.mjs
```

Test outputs are written under `tests/.tmp-export-output/` and removed
after the run. A durable proof export is kept in
`tests/proof-output/proof-pack/`.

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
