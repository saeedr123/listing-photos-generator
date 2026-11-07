# Template Engine

Status: Phase 2, built 2026-11-07. Etsy only v1, digital products only.

## What it is

The template engine turns a platform neutral template definition into a
listing image layout. A template is a JSON definition in
`packages/template-engine/templates/`, managed by admin, versioned, with
preview and rollback. Nothing about a seller product is stored in a
template. Content arrives as tokens such as `{{product.name}}` or
`{{product.tabCount}}`, resolved against verified product facts at render
time. A template that cannot resolve a token reports it as a warning,
never invents a value.

## Public API

Apps import from `packages/template-engine/src/index.ts` only:

- `loadTemplates(dir)`, `loadTemplateFile(path)`, `validateTemplate(t)`
- `checkDistinctness(templates)`, `distinctnessSignature(t)`
- `rollbackToVersion(current, olderSnapshot, reason)`
- `getTemplateById(templates, id)`, `getTemplateByRole(templates, role)`
- `checkTextFit(text, boxWidthPx, fontSizePx, maxLines, maxChars)`
- `adaptTemplateForPlatform(template, pack)`, `canvasSizeForAspect(ratio, shortestSidePx)`

Platform values never live in this package. The platform export adapter
applies the platform pack at export time. Etsy v1 values are read from
`packages/export/src/etsy-pack.json`, which cites
`docs/platform-rules.md`, check date 2026-11-05.

## Template definition

Each template holds: layout definition (sections, order, grid, canvas),
typography system (title, subtitle, body, label), text areas, image areas,
mockup slots, allowed orientations, background, and niche packs it suits.
Image areas are contain fit, centred, no stretch, no colour change, no
crop. A template entry also holds `previousVersion` and `changeNote` for
rollback, and `referenceStructure` naming the structure it mirrors.

## v1 set of 10

| # | Template | Layout structure | Canvas | Typography | Intended niche | Best use |
|---|---|---|---|---|---|---|
| 1 | Hero | Title top, devices centre, pill bar bottom | 3:2 landscape | Italic serif title, small caps subtitle | Wedding and events | First listing image, product at a glance on laptop and phone |
| 2 | Features Grid | Title top left, 2 by 3 card grid | 3:2 landscape | Bold sans title, regular sans body | Small business planners | Six features as scannable cards, no device |
| 3 | What Is Inside | Left title rail, numbered two column tab list | 3:2 landscape | Serif bold upper title, serif italic subtitle | Wedding and events | Answers what the buyer gets, every tab in order |
| 4 | How It Works | Title top, three step horizontal row | 3:2 landscape | Extra bold sans upper title, medium sans subtitle | Wedding and events | Removes the how does it work question in 3 steps |
| 5 | Mobile View | Device centre, title below | 2:3 portrait | Serif italic title, letter spaced caps subtitle | Wedding and events | Shows the product on a phone, for mobile buyers |
| 6 | Sizes and Formats | Left facts panel, right device, spec table | 3:2 landscape | Bold sans title, mono body | Small business planners | Answers format and size questions before they become messages |
| 7 | Feature Close Up | Title top, tablet dominant, callouts beside | 3:2 landscape | Serif bold italic title, small caps subtitle | Wedding and events | One feature per image, one real sheet tab large |
| 8 | Bundle and All Tabs Overview | Title top, 4 by 3 mini card grid | 3:2 landscape | Black sans upper title, bold sans subtitle | Wedding and events | Whole workbook at a glance, one card per tab |
| 9 | Who It Is For | Centred title, three audience cards | 1:1 square | Serif regular title, serif italic body | Wedding and events | Answers who the product is for |
| 10 | Final Call to Action | Centred title, fact strip, recap strip | 3:2 landscape | Extra bold sans title, serif italic subtitle | Wedding and events | Last image, one centred message, no new claim |

All 10 are platform neutral and suit all three v1 niche packs
(wedding and events, personal finance, small business planners). The
`intendedNiche` column names the niche each template was designed around
first, not the only niche it suits.

## Proof templates

Hero and Feature Close Up were built first, using the Maid of Honor
Planner as the test product, with real facts only: 12 tabs, Google Sheets
format, USD 13.97 list, USD 9.78 launch. Prices are task supplied, not
independently rechecked against a live Etsy listing, and must be
reconfirmed before published use.

Structure only was mirrored from:

- Hero: `workspace/etsy-maid-of-honor/templates-redesigned/redesigned-hero-large-screens-v2.jpg`
  (laptop plus phone, large screens, title top, bottom pill bar).
- Feature Close Up: `workspace/etsy-maid-of-honor/templates-redesigned/redesigned-feature-itinerary-large-v2.jpg`
  (tablet covering most of the image).

No competitor badge, review count, watermark, claim, price, or sheet
screenshot was copied. The screen inside each proof template is a
schematic drawn from the verified 12 tab names, marked as a sample render
in the export manifest. It is not a real sheet screenshot, and it must be
replaced by the seller real product render before any published use.

## Distinctness test

Mandatory, per PROMPT.md section 6. A template counts as distinct only
if it differs in layout structure, section order, AND typography system,
not only in colour. Colour variants do not count. The test in
`tests/template-distinctness.test.mjs` checks all 10 templates pairwise
and also proves that a colour only copy of the hero fails. All 10 pass.

## Orientation rule

A listing set must not mix landscape and portrait frames without a
reason. Mobile View is the one reasoned portrait page in the set, a
phone-first page. Who It Is For is square, so it also works as a social
crop later. Every other template is landscape 3:2.

## Versioning and rollback

Every change creates a new version. `rollbackToVersion` stamps an older
snapshot as the next version with status `preview` and a rollback note.
It never overwrites history. Preview before publishing.

## Adding a template

Add a JSON file in `packages/template-engine/templates/`, run the test
suite, and confirm the distinctness test still passes. No code change is
needed. If the new template only changes colours, the distinctness test
will fail it, by design.

## Implementation notes

- Source is TypeScript, run directly by Node 24 type stripping. Internal
  imports use `.ts` specifiers, which Node resolves. If the app later
  adopts a bundler or `tsc` build, align the TypeScript config
  (`allowImportingTsExtensions` or a rewrite to `.js` specifiers) before
  changing these imports.
- Text fit uses a character width estimate for layout planning. The
  export legibility check at export size is the final check, not the
  estimate.
