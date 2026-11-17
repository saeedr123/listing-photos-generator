# Asset Register

Phase 2, 2026-11-07. Every image asset used by the template engine,
mockup engine, and proof exports. No asset is hard coded into a template
or mockup definition as product content.

## Own built frames (Layer 1)

All frames were built in house as SVG at high resolution, 2026-11-07,
creator Listing Photos Generator, in house. Licence: own-built, owned
outright. No third party licence required. No Adobe Stock preview, no
unlicensed PSD, no other seller image used. No recognisable person, logo,
or trademark in any frame.

| Asset | File | Changes from source |
|---|---|---|
| Laptop Alone, Straight | `frames/laptop-alone.svg` | Built in house. Desk scene, soft shadow, plant, no people. |
| Phone Alone, Straight | `frames/phone-alone.svg` | Built in house. Desk scene, soft shadow, coffee cup, no people. |
| Tablet Alone, Straight | `frames/tablet-alone.svg` | Built in house. Linen surface, soft shadow, small vase, no people. |
| Laptop Plus Phone Hero | `frames/laptop-plus-phone.svg` | Built in house. Desk scene, soft shadows, plant, coffee cup, no people. |
| Flat Feature Frame | `frames/flat-feature-frame.svg` | Built in house. Plain background, basic frame only, labelled basic not premium. |

## Own built backgrounds

Blush backgrounds and subtle dot patterns in the 10 templates are
defined in the template JSON files as colour values, built in house.
No stock photo is used as a background in any proof template.

## Free stock images

None used in Phase 2. No Pexels, Unsplash, or Pixabay image is used in
any template, mockup, or proof export. No stock image is offered
standalone, and no stock library is built into the tool.

## Pixabay licence note

The full Pixabay Content License has NOT been read as a legal decision.
Pixabay use requires the full licence to be read in Phase 2 before
production use. No Pixabay image is used in the proof templates. Do not
use Pixabay images in a published pack until that read is done and
recorded here.

## Pexels and Unsplash note

Pexels is first choice and Unsplash second choice per
`docs/free-image-sources.md`, only as transformed elements inside a
finished listing image, never standalone, never unaltered resale, never
as a stock library inside the tool. No image from either source is used
yet. Any future use must record source, photographer, image page URL,
licence name, download date, and what was changed, in this register.

## 3D mockup studio assets, 2026-11-16

Every asset below carries the same licence record in its registry file
(source, licence type, licence date, storage location). Adobe Stock and
ls.graphics were direction only. No code, model, preview, PSD or image
was copied or traced from them or from any other vendor or seller.

### 3D models (GLB), own built

Built in house from plain geometry by `scripts/build-studio-models.mjs`,
2026-11-16, creator Listing Photos Generator, in house. Licence:
own-built, owned outright. Generic and unbranded: no logo, no trademark,
no image texture in any file. All labelled basic. Registry records:
`packages/mockup-engine/registry/models/`.

| Asset | File | Notes |
|---|---|---|
| Laptop, generic | `assets/models/laptop-generic.glb` | Screen 16 to 10. |
| Phone, generic | `assets/models/phone-generic.glb` | Portrait screen. Rectangular screen, so no corner of a design is cut. |
| Tablet, generic, landscape | `assets/models/tablet-generic-landscape.glb` | Screen 4 to 3. |
| Tablet, generic, portrait | `assets/models/tablet-generic-portrait.glb` | Screen 3 to 4. |
| A4 sheet | `assets/models/paper-a4.glb` | 210 by 297 mm, subtle curl. |
| US Letter sheet | `assets/models/paper-us-letter.glb` | 215.9 by 279.4 mm, subtle curl. |
| Fanned stack of 3 A4 sheets | `assets/models/paper-fan-a4.glb` | Page 1 on top. |
| Fanned stack of 3 US Letter sheets | `assets/models/paper-fan-us-letter.glb` | Page 1 on top. |
| Clipboard with an A4 sheet | `assets/models/clipboard-a4.glb` | Board colour options. |

### Texture, own built

| Asset | File | Notes |
|---|---|---|
| Light wood desk | `assets/textures/desk-light-wood.jpg` | Generated from seeded noise by `scripts/build-studio-textures.py`, 2026-11-16. Not a photo. Own-built, owned outright. Record: `registry/textures/desk-light-wood.json`. |

### Lighting, own built, no HDRI file

| Asset | File | Notes |
|---|---|---|
| Soft studio | `registry/lighting/studio-soft.json` | A lighting rig written as numbers and built at run time. No HDRI file exists in the repository, so there is no HDRI to licence. An HDRI added later needs its own licence record before it can be used. |

### Fonts

No font file is shipped. The draft style kit names the generic CSS
families `serif` and `sans-serif`, which resolve to whatever the browser
has. A style kit that names a font file must carry a licence record for
it, and validation refuses it otherwise. Brand fonts are an open
decision for Saeed.

### Test charts, not product content

| Asset | File | Notes |
|---|---|---|
| A4 portrait test charts, pages 1 to 3 | `tests/fixtures/designs/test-chart-a4-page-*.png` | Built in house by `scripts/build-test-charts.py`, 2026-11-16. Text set in DejaVu Sans from the system fonts (DejaVu Fonts licence, a free licence). These are test charts. They are not a product and not a seller design. |
| Landscape screen test chart | `tests/fixtures/designs/test-chart-landscape-16x10.png` | Same. |
| Reference renders | `tests/visual/reference/*.png` | Renders of the test charts on the own built models. |

### Software libraries used by the studio

| Library | Version | Licence | Use |
|---|---|---|---|
| three | 0.170.0 | MIT | 3D rendering, GLB loading and export, orbit controls, blur shaders. |
| @react-three/fiber | 8.18.0 | MIT | Live preview canvas. |

Not checked: the full licence text of each transitive dependency. The
two rows above are the direct additions, with the licence each package
declares in its own package.json.
