#!/usr/bin/env python3
"""Build the in house desk texture for the mockup studio.

The texture is generated from seeded noise in this file. It is not a
photo and it is not taken, traced or converted from any stock library.
It tiles: the noise is filtered in the frequency domain, which is
periodic by construction.

Usage: python3 scripts/build-studio-textures.py
Output: packages/mockup-engine/assets/textures/desk-light-wood.jpg
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "packages" / "mockup-engine" / "assets" / "textures"
SIZE = 1024
SEED = 20261116


def periodic_noise(rng, size, stretch_x, stretch_y, falloff):
    """Band limited noise that wraps at the edges."""
    white = rng.standard_normal((size, size))
    spectrum = np.fft.fft2(white)
    fy = np.fft.fftfreq(size)[:, None] * stretch_y
    fx = np.fft.fftfreq(size)[None, :] * stretch_x
    radius = np.sqrt(fx * fx + fy * fy)
    radius[0, 0] = 1.0
    spectrum = spectrum / np.power(radius, falloff)
    spectrum[0, 0] = 0
    noise = np.real(np.fft.ifft2(spectrum))
    noise -= noise.min()
    noise /= noise.max()
    return noise


def main():
    rng = np.random.default_rng(SEED)
    # Long grain: slow change along X and fast change along Y, so streaks
    # run left to right, along the planks.
    grain = periodic_noise(rng, SIZE, 1.0, 0.06, 1.6)
    fine = periodic_noise(rng, SIZE, 2.0, 0.25, 1.1)
    tone = periodic_noise(rng, SIZE, 0.5, 0.5, 2.2)
    value = 0.55 * grain + 0.2 * fine + 0.25 * tone

    # Four planks down the tile, each with its own slight tone shift and
    # a thin dark seam. Plank count divides the tile, so seams wrap too.
    planks = 4
    rows = np.arange(SIZE)
    plank_index = (rows * planks) // SIZE
    shifts = rng.uniform(-0.05, 0.05, planks)
    value = value + shifts[plank_index][:, None]
    seam = np.abs(((rows * planks) % SIZE) - 0) < (planks * 1.5)
    value[seam, :] -= 0.16

    value = np.clip(value, 0, 1)
    light = np.array([232, 214, 190], dtype=np.float64)
    dark = np.array([196, 170, 138], dtype=np.float64)
    rgb = dark[None, None, :] + (light - dark)[None, None, :] * value[:, :, None]
    image = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / "desk-light-wood.jpg", "JPEG", quality=90, optimize=False, subsampling=0)
    print("built desk-light-wood.jpg", image.size)


if __name__ == "__main__":
    main()
