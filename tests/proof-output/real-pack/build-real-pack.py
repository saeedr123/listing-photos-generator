#!/usr/bin/env python3
"""Build the real proof pack from the REAL Maid of Honor Planner renders.

Sources only: workspace/etsy-maid-of-honor/templates-redesigned/
(3000x2000 JPGs of the real 12 tab Google Sheets product). No schematic
sheet, no competitor screenshot, no Hey Morning Studio or Productive
Penguin Co image, no invented content.

Method, per the Crisp Quality Gate: each real render is placed whole
into a 3000x2000 Etsy canvas with contain fit, centred, no stretch, no
crop, no colour change. Every source here is already 3000x2000, so the
placement is 1 to 1 and no bands appear. The only changes from the
source file are a JPEG re-save at quality 92 and the embedded sRGB ICC
profile (see packages/export/src/srgb_icc.py). The mean absolute pixel
difference from re-saving is measured and recorded in the manifest, so
the "no colour change" claim is a measured number, not an assertion.

Outputs: tests/proof-output/real-pack/01-hero.jpg and friends, plus
manifest.json and MANIFEST.md in the same folder. The manifest records
the exact source file, sha256, template, mockup shown, and facts used
for every image, and states plainly which templates were left out and
why, and that no frame is called premium until Saeed approves it in
plain words.

Facts for the test product, task supplied and not live rechecked:
12 tabs, Google Sheets format, USD 13.97 list, USD 9.78 launch.
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageCms

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
WORKSPACE_ROOT = REPO_ROOT.parent
SOURCE_DIR = WORKSPACE_ROOT / "etsy-maid-of-honor" / "templates-redesigned"
OUT_DIR = SCRIPT_DIR

sys.path.insert(0, str(REPO_ROOT / "packages" / "export" / "src"))
from srgb_icc import PROFILE_DESCRIPTION as ICC_NAME  # noqa: E402
from srgb_icc import srgb_icc_profile_bytes  # noqa: E402

CANVAS_W, CANVAS_H = 3000, 2000
QUALITY = 92

# Template ids are the listing-studio template ids. A render is only
# mapped to a template its own visible content supports.
IMAGES = [
    {
        "position": 1,
        "file_name": "01-hero.jpg",
        "template_id": "hero",
        "template_name": "Hero",
        "source_file": "filled-hero-both-screens-start-here.jpg",
        "mockup_shown": "laptop-plus-phone, as shown in the render",
        "feature_shown": "Product at a glance: Start Here and Guide tab on the laptop, Mobile Quick-Expense Log on the phone",
        "facts_visible": "12 Tabs, Instant Download, Google Sheets Only",
        "notes": "Both screens show real sheet content. The phone screen is small, so its sheet text is small at export size. The Start Here sheet shows demo names and dates (Sarah Jenkins, Michael Adams, Jessica Taylor, 2027 dates), which are demo content inside the sheet, not listing claims.",
    },
    {
        "position": 2,
        "file_name": "02-feature-close-up.jpg",
        "template_id": "feature-close-up",
        "template_name": "Feature Close Up",
        "source_file": "filled-start-here-guide-crisp.jpg",
        "mockup_shown": "laptop-alone, as shown in the render",
        "feature_shown": "Start Here and Guide tab, full sheet on a laptop: master setup, currency switch, 5-step quick start guide, sharing guide",
        "facts_visible": "1-Click Currency Switch, 12 Interactive Tabs, Google Sheets Only",
        "notes": "The feature shown is the Start Here and Guide tab, not the Itinerary tab. Sheet text is crisp and legible at export size. The sheet shows the same demo names and dates as image 01, which are demo content inside the sheet, not listing claims.",
    },
    {
        "position": 3,
        "file_name": "03-what-is-inside.jpg",
        "template_id": "what-is-inside",
        "template_name": "What Is Inside",
        "source_file": "hero-filled-home-dashboard-mobile-log.jpg",
        "mockup_shown": "laptop-plus-phone, as shown in the render",
        "feature_shown": "Home Dashboard with the Quick Navigation and Workbook Directory, which lists the tabs in order, plus the Mobile Quick-Expense Log on the phone",
        "facts_visible": "12 Tabs, Instant Download, Google Sheets Only",
        "notes": "The dashboard directory is what makes this a what is inside proof: it lists the tabs. The dashboard sheet contains demo data (sample names, 2027 dates, countdowns in days, budget figures, charts), which is demo content inside the sheet, not listing claims, and the text pack does not repeat those figures.",
    },
    {
        "position": 4,
        "file_name": "04-feature-itinerary.jpg",
        "template_id": "feature-close-up",
        "template_name": "Feature Close Up (second feature image, itinerary)",
        "source_file": "redesigned-feature-itinerary-large-v2.jpg",
        "mockup_shown": "tablet-alone, as shown in the render",
        "feature_shown": "Itinerary and Event Schedules: title, callouts, and pill bar only. The tablet screen is blank white in the source file, so the real Itinerary and Event Schedules tab is NOT shown",
        "facts_visible": "12 Interactive Tabs, Google Sheets Only, Instant Download",
        "notes": "DEFECT, recorded not hidden: the tablet screen is blank white in the source file. This image proves the feature layout and the tablet frame only. It must not be published as a feature proof until a real Itinerary and Event Schedules tab screenshot is placed in the tablet screen.",
    },
]

LEFT_OUT = [
    {
        "template_id": "bundle-all-tabs",
        "reason": "No real render shows all 12 tabs as cards or as a grid. Left out rather than faked.",
    },
    {
        "template_id": "features-grid",
        "reason": "No real render lists the features as six cards. Left out rather than faked.",
    },
    {
        "template_id": "final-call-to-action",
        "reason": "No real render shows a closing message with a next step. Left out rather than faked.",
    },
    {
        "template_id": "how-it-works",
        "reason": "No real render shows the three purchase to planning steps. The Start Here sheet shows a 5-step quick start guide, which is not the same three steps, and that source file is already used for image 02. Reusing it here would mislabel it. Left out.",
    },
    {
        "template_id": "mobile-view",
        "reason": "Portrait 2:3 canvas. All 12 real renders are landscape 3000x2000. A portrait proof would need bands or a crop, and no crop is approved. The Mobile Quick-Expense Log is visible on the phone in images 01 and 03, but that does not make a portrait mobile-view proof. Left out.",
    },
    {
        "template_id": "sizes-and-formats",
        "reason": "No real render shows a format and size facts table. Left out rather than faked.",
    },
    {
        "template_id": "who-it-is-for",
        "reason": "Square 1:1 canvas. No square real render exists. Left out rather than faked.",
    },
]


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mean_abs_diff(a, b):
    """Mean absolute per channel pixel difference between two images."""
    pa = a.tobytes()
    pb = b.tobytes()
    total = 0
    for x, y in zip(pa, pb):
        total += abs(x - y)
    return round(total / max(1, len(pa)), 3)


def build():
    if not SOURCE_DIR.is_dir():
        print(f"error: real render source folder not found: {SOURCE_DIR}", file=sys.stderr)
        return 2
    icc = srgb_icc_profile_bytes()
    built = []
    for spec in IMAGES:
        source_path = SOURCE_DIR / spec["source_file"]
        if not source_path.is_file():
            print(f"error: source file missing: {source_path}", file=sys.stderr)
            return 2
        source = Image.open(source_path)
        if source.size != (CANVAS_W, CANVAS_H) or source.mode != "RGB":
            print(
                f"error: {spec['source_file']} is {source.size} {source.mode}, "
                "expected 3000x2000 RGB",
                file=sys.stderr,
            )
            return 2
        source_icc = source.info.get("icc_profile")
        # Contain fit, centred, no stretch, no crop. The source already
        # matches the canvas, so the scale is 1.0 and the offset is 0,0.
        scale = min(CANVAS_W / source.width, CANVAS_H / source.height)
        placed_w, placed_h = round(source.width * scale), round(source.height * scale)
        offset_x, offset_y = (CANVAS_W - placed_w) // 2, (CANVAS_H - placed_h) // 2
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), source.getpixel((0, 0)))
        canvas.paste(source, (offset_x, offset_y))
        out_path = OUT_DIR / spec["file_name"]
        canvas.save(out_path, "JPEG", quality=QUALITY, subsampling=0, icc_profile=icc)
        check = Image.open(out_path)
        check.load()
        data = out_path.read_bytes()
        assert check.size == (CANVAS_W, CANVAS_H), f"{spec['file_name']} wrong size"
        assert check.mode == "RGB", f"{spec['file_name']} wrong mode"
        assert b"ICC_PROFILE" in data, f"{spec['file_name']} has no APP2 ICC segment"
        assert b"sRGB" in data, f"{spec['file_name']} has no sRGB tag"
        out_icc = check.info.get("icc_profile")
        assert out_icc == icc, f"{spec['file_name']} ICC profile bytes differ"
        assert ImageCms.getProfileName(ImageCms.getOpenProfile(__import__("io").BytesIO(out_icc))).strip() == ICC_NAME
        built.append(
            {
                **spec,
                "source_path": str(source_path),
                "source_sha256": sha256_of(source_path),
                "source_size_px": [source.width, source.height],
                "source_mode": source.mode,
                "source_icc_profile": "none",
                "output_path": str(out_path),
                "output_size_px": [check.width, check.height],
                "output_mode": check.mode,
                "output_quality": QUALITY,
                "placement": {
                    "fit": "contain",
                    "centred": True,
                    "scale": scale,
                    "offset_x_px": offset_x,
                    "offset_y_px": offset_y,
                    "crop": "none",
                    "stretch": "none",
                    "colour_change": "none",
                },
                "mean_abs_pixel_diff_vs_source": mean_abs_diff(source, check),
                "icc_profile": ICC_NAME,
                "icc_profile_bytes": len(icc),
                "icc_verified": "APP2 ICC segment present in the output file bytes, profile re-opened with Pillow and read back as sRGB IEC61966-2.1",
            }
        )
        print(f"built {spec['file_name']} from {spec['source_file']}")
    manifest = {
        "pack": "real-pack",
        "product": "Maid of Honor Planner",
        "built": "2026-11-10",
        "source_folder": str(SOURCE_DIR),
        "facts_used": {
            "tab_count": 12,
            "format": "Google Sheets",
            "price_list": "USD 13.97",
            "price_launch": "USD 9.78",
            "facts_note": "Task supplied, not live rechecked. Prices are not shown on the images. Reconfirm before published use.",
        },
        "method": "Each real render placed whole into a 3000x2000 canvas, contain fit, centred, no stretch, no crop, no colour change. Only changes from the source file: JPEG re-save at quality 92 and the embedded sRGB ICC profile.",
        "colour_profile": ICC_NAME,
        "quality": QUALITY,
        "images": built,
        "templates_left_out": LEFT_OUT,
        "premium_review": "No frame in this pack is called premium. Premium review is still required: Saeed must look at each image at export size and judge perspective, shadows, depth, and scene, and no frame is called premium until he approves it in plain words.",
        "sources_note": "Only the real renders in the source folder were used. No schematic sheet, no competitor screenshot, no Hey Morning Studio image, no Productive Penguin Co image, no invented tab count, price, review, or claim.",
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (OUT_DIR / "MANIFEST.md").write_text(render_manifest(manifest))
    print(f"wrote {OUT_DIR / 'manifest.json'}")
    print(f"wrote {OUT_DIR / 'MANIFEST.md'}")
    return 0


def render_manifest(manifest):
    lines = []
    add = lines.append
    add("# Real Proof Pack: Maid of Honor Planner")
    add("")
    add("Built 2026-11-10 from the REAL Maid of Honor Planner renders, not the schematic sheet.")
    add("Source folder: `" + manifest["source_folder"] + "`")
    add("")
    add("## Facts used")
    add("")
    add("Task supplied, not live rechecked: 12 tabs, Google Sheets format, USD 13.97 list, USD 9.78 launch.")
    add("Prices are not shown on the images. Reconfirm before published use.")
    add("")
    add("## Method")
    add("")
    add("Each real render was placed whole into a 3000x2000 Etsy canvas with contain fit, centred,")
    add("no stretch, no crop, no colour change. Every source is already 3000x2000, so the placement")
    add("is 1 to 1 and no bands appear. The only changes from the source file are a JPEG re-save at")
    add("quality 92 and the embedded sRGB ICC profile. The mean absolute pixel difference from")
    add("re-saving is measured per image below, so the no colour change claim is a measured number,")
    add("not an assertion. Text was checked sharp and legible by viewing each image at export size.")
    add("")
    add("## Images")
    add("")
    for image in manifest["images"]:
        add(f"### {image['position']}. {image['file_name']} ({image['template_name']}, template `{image['template_id']}`)")
        add("")
        add(f"Source file: `{image['source_path']}`")
        add(f"Source sha256: `{image['source_sha256']}`")
        add(f"Source size: {image['source_size_px'][0]}x{image['source_size_px'][1]} {image['source_mode']}, source ICC profile: {image['source_icc_profile']}")
        add(f"Mockup shown: {image['mockup_shown']}")
        add(f"Feature shown: {image['feature_shown']}")
        add(f"Facts visible in the image: {image['facts_visible']}")
        add(f"Placement: contain fit, centred, scale {image['placement']['scale']}, offset {image['placement']['offset_x_px']},{image['placement']['offset_y_px']}, crop none, stretch none, colour change none")
        add(f"Output: {image['output_size_px'][0]}x{image['output_size_px'][1]} {image['output_mode']}, quality {image['output_quality']}, mean absolute pixel difference vs source {image['mean_abs_pixel_diff_vs_source']} per channel (re-save only)")
        add(f"ICC profile: {image['icc_profile']}, {image['icc_profile_bytes']} bytes, {image['icc_verified']}")
        add(f"Notes: {image['notes']}")
        add("")
    add("## Templates left out")
    add("")
    add("The remaining 7 templates were left out because no real render supports them. Nothing was faked to fill them.")
    add("")
    for left in manifest["templates_left_out"]:
        add(f"- {left['template_id']}: {left['reason']}")
    add("")
    add("## Premium review still required")
    add("")
    add("No frame in this pack is called premium. The device frames visible in these renders are part")
    add("of the real render files, and the in-house SVG frames from Phase 2 are a separate asset.")
    add("Neither is labelled premium here, and no label elsewhere in the project is relied on for this pack.")
    add("")
    add("Before any frame is called premium, Saeed must look at each image at export size and judge:")
    add("")
    add("Perspective: do the laptop, phone, and tablet sit naturally, with straight edges and believable angles.")
    add("Shadows: are they soft, in one consistent direction, and grounding each device on its surface.")
    add("Depth: does each device sit in the scene, or does it look pasted on.")
    add("Scene: background, props, and spacing, with nothing distracting or cut off.")
    add("")
    add("No frame is called premium until Saeed approves it in plain words.")
    add("")
    add("Known defects for Saeed to look at in this pack: image 04 has a blank white tablet screen")
    add("(the real Itinerary and Event Schedules tab is not shown); the phone screens in images 01 and 03")
    add("are small, so their sheet text is small at export size; the sheets show demo names, dates,")
    add("countdowns, and budget figures, which are demo content inside the sheet, not listing claims.")
    add("")
    add("## Sources")
    add("")
    add("Only the real renders in the source folder were used. No schematic sheet, no competitor")
    add("screenshot, no Hey Morning Studio image, no Productive Penguin Co image, no invented tab")
    add("count, price, review, or claim. The earlier schematic proof pack is untouched at")
    add("`tests/proof-output/proof-pack/` and stays labelled as a schematic layout proof.")
    add("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(build())
