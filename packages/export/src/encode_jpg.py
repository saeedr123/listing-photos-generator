#!/usr/bin/env python3
"""Encode a rendered PNG as the platform JPG with an embedded sRGB profile.

Used for images that arrive already rendered, such as the 3D mockup
studio renders. The pixels are not resized, cropped or recoloured here:
the script only checks the size, refuses transparency, and writes a JPEG
with the same sRGB ICC profile the rest of the export engine embeds (see
srgb_icc.py in this folder).

Usage: encode_jpg.py IN.png OUT.jpg QUALITY EXPECTED_WIDTH EXPECTED_HEIGHT
Exit codes: 0 ok, 2 bad input, 3 size mismatch, 4 transparency found.
"""
import sys

from PIL import Image
from srgb_icc import srgb_icc_profile_bytes


def main():
    if len(sys.argv) != 6:
        print("usage: encode_jpg.py IN.png OUT.jpg QUALITY WIDTH HEIGHT", file=sys.stderr)
        return 2
    in_path, out_path = sys.argv[1], sys.argv[2]
    quality, width, height = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    try:
        img = Image.open(in_path)
        img.load()
    except Exception as error:  # noqa: BLE001
        print(f"The image could not be read: {error}", file=sys.stderr)
        return 2
    if img.format != "PNG":
        print(f"Expected a PNG from the renderer, got {img.format}.", file=sys.stderr)
        return 2
    if img.size != (width, height):
        print(f"Image is {img.size[0]}x{img.size[1]}px, expected {width}x{height}px.", file=sys.stderr)
        return 3
    if img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info:
        alpha = img.convert("RGBA").getchannel("A")
        if alpha.getextrema()[0] < 255:
            print("The image has transparent pixels. Transparent parts would turn black after upload.", file=sys.stderr)
            return 4
    rgb = img.convert("RGB")
    rgb.save(out_path, "JPEG", quality=quality, subsampling=0, icc_profile=srgb_icc_profile_bytes())
    print(f"encoded {out_path} {width}x{height}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
