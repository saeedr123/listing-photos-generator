#!/usr/bin/env python3
"""Rasterize a render spec to a JPG at export size.

Input: a render spec JSON produced by packages/rendering (toRenderSpec),
plus a quality value. Output: an sRGB JPEG, 2000px on the shortest side,
matching the spec canvas size.

This is the v1 proof rasterizer. It draws layout, text, and a schematic
sheet preview inside product render boxes. The schematic is NOT a real
sheet screenshot: it is drawn from the verified tab names in the spec so
layout can be proved at export size. A publishable pack must place the
seller real product render pixels in that box instead. The export manifest
records whether the render was a sample, and the quality gate blocks a
sample render from a real export unless proof mode is on.

Fonts: DejaVu, bundled on the system. No network, no stock images.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def font_for(family, size, weight, style):
    """Pick the closest available DejaVu variant.

    Not every style exists on this system: there is no DejaVuSerif italic
    and no DejaVuSans oblique. Never fall back silently to the tiny default
    bitmap font, which made titles render unreadably small. Pick the
    nearest real variant instead and warn on stderr.
    """
    name = (family or "").lower()
    if "courier" in name or "mono" in name:
        if weight >= 700 and style == "italic":
            candidates = ["DejaVuSansMono-BoldOblique.ttf"]
        elif weight >= 700:
            candidates = ["DejaVuSansMono-Bold.ttf"]
        elif style == "italic":
            candidates = ["DejaVuSansMono-Oblique.ttf"]
        else:
            candidates = ["DejaVuSansMono.ttf"]
    elif "georgia" in name or "serif" in name or "times" in name:
        if weight >= 700:
            candidates = ["DejaVuSerif-Bold.ttf"]
        else:
            candidates = ["DejaVuSerif.ttf"]
    else:
        if weight >= 700:
            candidates = ["DejaVuSans-Bold.ttf"]
        else:
            candidates = ["DejaVuSans.ttf"]
    for base in candidates:
        path = FONT_DIR / base
        if path.exists():
            return ImageFont.truetype(str(path), int(size))
    print(f"warning: no font file found for {family} {weight} {style}, using default",
          file=sys.stderr)
    return ImageFont.load_default()


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def fit_text(draw, text, font, max_width):
    """Shorten a line with an ellipsis until it fits the box width."""
    if draw.textlength(text, font=font) <= max_width:
        return text
    while text and draw.textlength(text + "...", font=font) > max_width:
        text = text[:-1]
    return text + "..." if text else text


def draw_sheet(draw, box, sheet_lines):
    """Schematic sheet preview inside a product render box.

    Drawn from verified tab names only. Labelled as a schematic in the
    export manifest, never presented as a real sheet screenshot.
    Row text is sized from the row height and shortened to fit, so rows
    never overlap and long tab names never run past the box edge.
    """
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    draw.rounded_rectangle([x, y, x + w, y + h], radius=12, fill=(255, 255, 255),
                           outline=(201, 162, 39), width=3)
    header_h = max(28, int(h * 0.09))
    header_font = font_for("Arial", max(14, int(header_h * 0.5)), 400, "normal")
    draw.rounded_rectangle([x + 2, y + 2, x + w - 2, y + header_h], radius=10,
                           fill=(43, 43, 43))
    draw.rectangle([x + 2, y + header_h - 12, x + w - 2, y + header_h], fill=(43, 43, 43))
    draw.text((x + 18, y + 8), "Google Sheets", font=header_font, fill=(255, 255, 255))
    row_h = max(26, int((h - header_h - 20) / max(1, len(sheet_lines))))
    row_font = font_for("Arial", max(12, int(row_h * 0.55)), 400, "normal")
    for i, line in enumerate(sheet_lines[:12]):
        ry = y + header_h + 12 + i * row_h
        if ry + row_h > y + h - 8:
            break
        fill = (247, 232, 230) if i % 2 == 0 else (255, 255, 255)
        draw.rectangle([x + 10, ry, x + w - 10, ry + row_h - 4], fill=fill)
        fitted = fit_text(draw, line, row_font, w - 36)
        draw.text((x + 18, ry + 4), fitted, font=row_font, fill=(43, 43, 43))
        draw.line([x + 10, ry + row_h - 4, x + w - 10, ry + row_h - 4],
                  fill=(229, 213, 210), width=1)


def main():
    if len(sys.argv) != 3:
        print("usage: rasterize.py <spec.json> <output.jpg>", file=sys.stderr)
        return 2
    spec_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    spec = json.loads(spec_path.read_text())
    width = int(spec["canvasWidthPx"])
    height = int(spec["canvasHeightPx"])
    img = Image.new("RGB", (width, height), hex_to_rgb(spec["background"]))
    draw = ImageDraw.Draw(img, "RGBA")

    if spec.get("pattern") == "subtle-dots":
        for dx in range(24, width, 48):
            for dy in range(24, height, 48):
                draw.ellipse([dx - 2, dy - 2, dx + 2, dy + 2], fill=(232, 207, 203))

    for rect in spec.get("rects", []):
        draw.rounded_rectangle(
            [rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]],
            radius=int(rect.get("radius", 0)), fill=hex_to_rgb(rect["fill"]),
            outline=hex_to_rgb(rect["stroke"]) if rect.get("stroke") else None, width=2)

    for image in spec.get("images", []):
        box = {"x": image["x"], "y": image["y"], "w": image["w"], "h": image["h"]}
        if image.get("kind") == "product-render":
            screens = image.get("mockupScreens") or []
            if screens:
                # One sub-box per screen area in the mockup frame, so a
                # laptop plus phone hero draws two screens, not one big sheet.
                for area in screens:
                    sub = {
                        "x": box["x"] + int(area["x"] / 1000 * box["w"]),
                        "y": box["y"] + int(area["y"] / 1000 * box["h"]),
                        "w": int(area["w"] / 1000 * box["w"]),
                        "h": int(area["h"] / 1000 * box["h"]),
                    }
                    draw_sheet(draw, sub, image.get("sheetLines", []))
                    draw.rounded_rectangle(
                        [sub["x"] - 8, sub["y"] - 8, sub["x"] + sub["w"] + 8,
                         sub["y"] + sub["h"] + 8], radius=14,
                        outline=(28, 28, 28), width=8)
                    # Base bar only under a landscape screen, which is the
                    # laptop in a laptop plus phone frame. A portrait phone
                    # screen never gets a laptop base.
                    if area.get("landscape"):
                        draw.polygon(
                            [(sub["x"] - 20, sub["y"] + sub["h"] + 10),
                             (sub["x"] + sub["w"] + 20, sub["y"] + sub["h"] + 10),
                             (sub["x"] + sub["w"] + 44, sub["y"] + sub["h"] + 44),
                             (sub["x"] - 44, sub["y"] + sub["h"] + 44)],
                            fill=(143, 143, 143))
            else:
                draw_sheet(draw, box, image.get("sheetLines", []))
                if image.get("mockupKind"):
                    draw.rounded_rectangle(
                        [box["x"] - 10, box["y"] - 10, box["x"] + box["w"] + 10,
                         box["y"] + box["h"] + 10], radius=18,
                        outline=(28, 28, 28), width=10)
                    if "laptop" in image["mockupKind"]:
                        draw.polygon([(box["x"] - 30, box["y"] + box["h"] + 12),
                                      (box["x"] + box["w"] + 30, box["y"] + box["h"] + 12),
                                      (box["x"] + box["w"] + 60, box["y"] + box["h"] + 52),
                                      (box["x"] - 60, box["y"] + box["h"] + 52)],
                                     fill=(143, 143, 143))
        else:
            draw.rounded_rectangle([box["x"], box["y"], box["x"] + box["w"],
                                    box["y"] + box["h"]], radius=12,
                                   outline=(201, 162, 39), width=3)
            label_font = font_for("Arial", 28, 400, "normal")
            draw.text((box["x"] + box["w"] / 2, box["y"] + box["h"] / 2),
                      image.get("label", "Image"), font=label_font,
                      fill=(138, 109, 59), anchor="mm")

    for text in spec.get("texts", []):
        font = font_for(text.get("fontFamily", "Arial"), text["fontSizePx"],
                        text.get("fontWeight", 400), text.get("fontStyle", "normal"))
        line_h = int(text["fontSizePx"] * 1.3)
        align = text.get("align", "left")
        for i, line in enumerate(text.get("lines", [])):
            ty = text["y"] + (i + 1) * line_h
            if align == "center":
                draw.text((text["x"] + text["w"] / 2, ty), line, font=font,
                          fill=hex_to_rgb(text["fill"]), anchor="ma")
            elif align == "right":
                draw.text((text["x"] + text["w"], ty), line, font=font,
                          fill=hex_to_rgb(text["fill"]), anchor="ra")
            else:
                draw.text((text["x"], ty), line, font=font,
                          fill=hex_to_rgb(text["fill"]), anchor="la")

    quality = int(spec.get("quality", 92))
    img.save(out_path, "JPEG", quality=quality, subsampling=0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
