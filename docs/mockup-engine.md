# Mockup Engine

Status: Phase 2, built 2026-11-07. Etsy only v1, digital products only.

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
| Laptop Alone, Straight | `frames/laptop-alone.svg` | 1, landscape | Landscape | Premium (declared, see below) |
| Phone Alone, Straight | `frames/phone-alone.svg` | 1, portrait | Portrait | Premium (declared, see below) |
| Tablet Alone, Straight | `frames/tablet-alone.svg` | 1, landscape | Landscape, portrait | Premium (declared, see below) |
| Laptop Plus Phone Hero | `frames/laptop-plus-phone.svg` | 2, laptop and phone | Landscape | Premium (declared, see below) |
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

The four other frames pass the declared criteria check. That check is
not a human visual review. A human visual review at export size is still
required before the live library calls any frame premium. This is
recorded in each mockup definition under `crispTestNote`.

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
