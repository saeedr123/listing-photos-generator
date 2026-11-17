#!/usr/bin/env python3
"""Build the test chart designs used as fixtures for the mockup studio.

These are test charts, not product content and not a seller design.
They exist because the repository holds no real design renders yet. Each
chart is made to expose a fit or colour fault at a glance:
- a border on the very edge, so any crop is visible,
- corner labels, so a flip or rotation is visible,
- pure colour patches with their values printed, so any recolour shows,
- fine lines and small text, so blur from upscaling shows.

Usage: python3 scripts/build-test-charts.py
Output: tests/fixtures/designs/*.png
Font: DejaVu Sans from the system fonts (DejaVu Fonts licence).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "designs"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

PATCHES = [
    ("#FF0000", "255 0 0"),
    ("#00FF00", "0 255 0"),
    ("#0000FF", "0 0 255"),
    ("#00FFFF", "0 255 255"),
    ("#FF00FF", "255 0 255"),
    ("#FFFF00", "255 255 0"),
    ("#000000", "0 0 0"),
    ("#808080", "128 128 128"),
    ("#C0C0C0", "192 192 192"),
]

ACCENTS = ["#1F4E79", "#7A3E65", "#2E6B4F", "#8A5A12"]


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(str(FONT_DIR / name), size)


def chart(width, height, title, page_label, accent):
    image = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    unit = min(width, height) / 100.0

    # Border on the outermost pixels. A crop of even a few pixels removes it.
    edge = max(4, int(unit * 0.6))
    draw.rectangle([0, 0, width - 1, height - 1], outline=accent, width=edge)

    # Corner labels.
    corner_font = font(int(unit * 3), bold=True)
    pad = int(unit * 2)
    draw.text((pad, pad), "TOP LEFT", font=corner_font, fill=accent)
    draw.text((width - pad, pad), "TOP RIGHT", font=corner_font, fill=accent, anchor="ra")
    draw.text((pad, height - pad), "BOTTOM LEFT", font=corner_font, fill=accent, anchor="ld")
    draw.text((width - pad, height - pad), "BOTTOM RIGHT", font=corner_font, fill=accent, anchor="rd")

    # Title block.
    y = int(unit * 9)
    draw.rectangle([int(unit * 6), y, width - int(unit * 6), y + int(unit * 10)], fill=accent)
    draw.text((width / 2, y + unit * 5), title, font=font(int(unit * 4.4), bold=True), fill="#FFFFFF", anchor="mm")
    y += int(unit * 13)
    draw.text((width / 2, y), "TEST CHART. NOT A PRODUCT. NOT A SELLER DESIGN.", font=font(int(unit * 2.6), bold=True), fill="#000000", anchor="ma")
    y += int(unit * 5)
    draw.text((width / 2, y), page_label, font=font(int(unit * 3.4)), fill="#333333", anchor="ma")
    y += int(unit * 8)

    # Colour patches with printed values.
    columns = 3
    gap = unit * 2
    patch_w = (width - unit * 12 - gap * (columns - 1)) / columns
    patch_h = unit * 9
    label_font = font(int(unit * 2))
    for index, (colour, label) in enumerate(PATCHES):
        col = index % columns
        row = index // columns
        x0 = unit * 6 + col * (patch_w + gap)
        y0 = y + row * (patch_h + unit * 4)
        draw.rectangle([x0, y0, x0 + patch_w, y0 + patch_h], fill=colour, outline="#000000", width=2)
        draw.text((x0, y0 + patch_h + unit * 0.4), f"sRGB {label}", font=label_font, fill="#000000")
    y += int(3 * (patch_h + unit * 4) + unit * 2)

    # Fine line pairs: 1, 2 and 4 pixel lines.
    x = unit * 6
    for line_width in (1, 2, 4):
        block_w = int(unit * 24)
        for i in range(0, block_w, line_width * 2):
            draw.rectangle([x + i, y, x + i + line_width - 1, y + unit * 6], fill="#000000")
        draw.text((x, y + unit * 6.6), f"{line_width} px lines", font=label_font, fill="#000000")
        x += block_w + unit * 5
    y += int(unit * 12)

    # Small text ladder.
    for size_units in (2.4, 1.8, 1.3, 1.0):
        size = max(8, int(unit * size_units))
        text = f"Sharpness check at {size} px: The quick brown fox jumps over the lazy dog 0123456789"
        # Trim to the printable width, so no line runs off the chart.
        while draw.textlength(text, font=font(size)) > width - unit * 12:
            text = text[:-1]
        draw.text((unit * 6, y), text, font=font(size), fill="#000000")
        y += int(size * 1.6)

    # Grey ramp along the bottom, above the corner labels.
    ramp_y = height - int(unit * 14)
    steps = 16
    ramp_w = (width - unit * 12) / steps
    for i in range(steps):
        level = round(i * 255 / (steps - 1))
        draw.rectangle([unit * 6 + i * ramp_w, ramp_y, unit * 6 + (i + 1) * ramp_w, ramp_y + unit * 5], fill=(level, level, level))
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # A4 portrait at 300 dpi.
    for page in (1, 2, 3):
        image = chart(2480, 3508, f"A4 PORTRAIT TEST CHART {page}", f"PAGE {page} OF 3", ACCENTS[page - 1])
        image.save(OUT / f"test-chart-a4-page-{page}.png", "PNG", optimize=True)
        print("built", f"test-chart-a4-page-{page}.png", image.size)
    # A landscape screen chart, 16 to 10.
    image = chart(3200, 2000, "LANDSCAPE SCREEN TEST CHART", "ONE PAGE", ACCENTS[3])
    image.save(OUT / "test-chart-landscape-16x10.png", "PNG", optimize=True)
    print("built test-chart-landscape-16x10.png", image.size)


if __name__ == "__main__":
    main()
