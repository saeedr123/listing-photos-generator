# Real Proof Pack: Maid of Honor Planner

Built 2026-11-10 from the REAL Maid of Honor Planner renders, not the schematic sheet.
Source folder: `/home/hatch/workspace/etsy-maid-of-honor/templates-redesigned`

## Facts used

Task supplied, not live rechecked: 12 tabs, Google Sheets format, USD 13.97 list, USD 9.78 launch.
Prices are not shown on the images. Reconfirm before published use.

## Method

Each real render was placed whole into a 3000x2000 Etsy canvas with contain fit, centred,
no stretch, no crop, no colour change. Every source is already 3000x2000, so the placement
is 1 to 1 and no bands appear. The only changes from the source file are a JPEG re-save at
quality 92 and the embedded sRGB ICC profile. The mean absolute pixel difference from
re-saving is measured per image below, so the no colour change claim is a measured number,
not an assertion. Text was checked sharp and legible by viewing each image at export size.

## Images

### 1. 01-hero.jpg (Hero, template `hero`)

Source file: `/home/hatch/workspace/etsy-maid-of-honor/templates-redesigned/filled-hero-both-screens-start-here.jpg`
Source sha256: `44a4d0415f6a1abad35296587fedda1f70905a0c70d0e73e56ceea360e048148`
Source size: 3000x2000 RGB, source ICC profile: none
Mockup shown: laptop-plus-phone, as shown in the render
Feature shown: Product at a glance: Start Here and Guide tab on the laptop, Mobile Quick-Expense Log on the phone
Facts visible in the image: 12 Tabs, Instant Download, Google Sheets Only
Placement: contain fit, centred, scale 1.0, offset 0,0, crop none, stretch none, colour change none
Output: 3000x2000 RGB, quality 92, mean absolute pixel difference vs source 0.2 per channel (re-save only)
ICC profile: sRGB IEC61966-2.1, 6600 bytes, APP2 ICC segment present in the output file bytes, profile re-opened with Pillow and read back as sRGB IEC61966-2.1
Notes: Both screens show real sheet content. The phone screen is small, so its sheet text is small at export size. The Start Here sheet shows demo names and dates (Sarah Jenkins, Michael Adams, Jessica Taylor, 2027 dates), which are demo content inside the sheet, not listing claims.

### 2. 02-feature-close-up.jpg (Feature Close Up, template `feature-close-up`)

Source file: `/home/hatch/workspace/etsy-maid-of-honor/templates-redesigned/filled-start-here-guide-crisp.jpg`
Source sha256: `035bc905713032b44a7bac2a340b06de443c855cc87b966477accca044d099a5`
Source size: 3000x2000 RGB, source ICC profile: none
Mockup shown: laptop-alone, as shown in the render
Feature shown: Start Here and Guide tab, full sheet on a laptop: master setup, currency switch, 5-step quick start guide, sharing guide
Facts visible in the image: 1-Click Currency Switch, 12 Interactive Tabs, Google Sheets Only
Placement: contain fit, centred, scale 1.0, offset 0,0, crop none, stretch none, colour change none
Output: 3000x2000 RGB, quality 92, mean absolute pixel difference vs source 0.175 per channel (re-save only)
ICC profile: sRGB IEC61966-2.1, 6600 bytes, APP2 ICC segment present in the output file bytes, profile re-opened with Pillow and read back as sRGB IEC61966-2.1
Notes: The feature shown is the Start Here and Guide tab, not the Itinerary tab. Sheet text is crisp and legible at export size. The sheet shows the same demo names and dates as image 01, which are demo content inside the sheet, not listing claims.

### 3. 03-what-is-inside.jpg (What Is Inside, template `what-is-inside`)

Source file: `/home/hatch/workspace/etsy-maid-of-honor/templates-redesigned/hero-filled-home-dashboard-mobile-log.jpg`
Source sha256: `f5bbe08a9cada4cdb350645ddf9484ce70ba5c511c4c5b093e31d9ac0150c031`
Source size: 3000x2000 RGB, source ICC profile: none
Mockup shown: laptop-plus-phone, as shown in the render
Feature shown: Home Dashboard with the Quick Navigation and Workbook Directory, which lists the tabs in order, plus the Mobile Quick-Expense Log on the phone
Facts visible in the image: 12 Tabs, Instant Download, Google Sheets Only
Placement: contain fit, centred, scale 1.0, offset 0,0, crop none, stretch none, colour change none
Output: 3000x2000 RGB, quality 92, mean absolute pixel difference vs source 0.243 per channel (re-save only)
ICC profile: sRGB IEC61966-2.1, 6600 bytes, APP2 ICC segment present in the output file bytes, profile re-opened with Pillow and read back as sRGB IEC61966-2.1
Notes: The dashboard directory is what makes this a what is inside proof: it lists the tabs. The dashboard sheet contains demo data (sample names, 2027 dates, countdowns in days, budget figures, charts), which is demo content inside the sheet, not listing claims, and the text pack does not repeat those figures.

### 4. 04-feature-itinerary.jpg (Feature Close Up (second feature image, itinerary), template `feature-close-up`)

Source file: `/home/hatch/workspace/etsy-maid-of-honor/templates-redesigned/redesigned-feature-itinerary-large-v2.jpg`
Source sha256: `55b1b2c776ffee39c2178f548885267a69551a7663403603a944ff552850e1bd`
Source size: 3000x2000 RGB, source ICC profile: none
Mockup shown: tablet-alone, as shown in the render
Feature shown: Itinerary and Event Schedules: title, callouts, and pill bar only. The tablet screen is blank white in the source file, so the real Itinerary and Event Schedules tab is NOT shown
Facts visible in the image: 12 Interactive Tabs, Google Sheets Only, Instant Download
Placement: contain fit, centred, scale 1.0, offset 0,0, crop none, stretch none, colour change none
Output: 3000x2000 RGB, quality 92, mean absolute pixel difference vs source 0.13 per channel (re-save only)
ICC profile: sRGB IEC61966-2.1, 6600 bytes, APP2 ICC segment present in the output file bytes, profile re-opened with Pillow and read back as sRGB IEC61966-2.1
Notes: DEFECT, recorded not hidden: the tablet screen is blank white in the source file. This image proves the feature layout and the tablet frame only. It must not be published as a feature proof until a real Itinerary and Event Schedules tab screenshot is placed in the tablet screen.

## Templates left out

The remaining 7 templates were left out because no real render supports them. Nothing was faked to fill them.

- bundle-all-tabs: No real render shows all 12 tabs as cards or as a grid. Left out rather than faked.
- features-grid: No real render lists the features as six cards. Left out rather than faked.
- final-call-to-action: No real render shows a closing message with a next step. Left out rather than faked.
- how-it-works: No real render shows the three purchase to planning steps. The Start Here sheet shows a 5-step quick start guide, which is not the same three steps, and that source file is already used for image 02. Reusing it here would mislabel it. Left out.
- mobile-view: Portrait 2:3 canvas. All 12 real renders are landscape 3000x2000. A portrait proof would need bands or a crop, and no crop is approved. The Mobile Quick-Expense Log is visible on the phone in images 01 and 03, but that does not make a portrait mobile-view proof. Left out.
- sizes-and-formats: No real render shows a format and size facts table. Left out rather than faked.
- who-it-is-for: Square 1:1 canvas. No square real render exists. Left out rather than faked.

## Premium review still required

No frame in this pack is called premium. The device frames visible in these renders are part
of the real render files, and the in-house SVG frames from Phase 2 are a separate asset.
Neither is labelled premium here, and no label elsewhere in the project is relied on for this pack.

Before any frame is called premium, Saeed must look at each image at export size and judge:

Perspective: do the laptop, phone, and tablet sit naturally, with straight edges and believable angles.
Shadows: are they soft, in one consistent direction, and grounding each device on its surface.
Depth: does each device sit in the scene, or does it look pasted on.
Scene: background, props, and spacing, with nothing distracting or cut off.

No frame is called premium until Saeed approves it in plain words.

Known defects for Saeed to look at in this pack: image 04 has a blank white tablet screen
(the real Itinerary and Event Schedules tab is not shown); the phone screens in images 01 and 03
are small, so their sheet text is small at export size; the sheets show demo names, dates,
countdowns, and budget figures, which are demo content inside the sheet, not listing claims.

## Sources

Only the real renders in the source folder were used. No schematic sheet, no competitor
screenshot, no Hey Morning Studio image, no Productive Penguin Co image, no invented tab
count, price, review, or claim. The earlier schematic proof pack is untouched at
`tests/proof-output/proof-pack/` and stays labelled as a schematic layout proof.
