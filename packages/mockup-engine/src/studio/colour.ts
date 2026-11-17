// Colour maths and dominant colour extraction.
// Extraction reads the pixels of the uploaded design and returns 3 to 5
// dominant colours, offered as a style kit variant. It only reads. It
// never writes to the design, so the design own colours never change.

import type { BackgroundSpec, StyleKit } from "./types.ts";
import { isHexColour } from "./validate-common.ts";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  if (!isHexColour(hex)) throw new Error(`Not a hex colour: ${JSON.stringify(hex)}.`);
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function rgbToHex(rgb: Rgb): string {
  const part = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${part(rgb[0])}${part(rgb[1])}${part(rgb[2])}`.toUpperCase();
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const linear = hexToRgb(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** HSL saturation, 0 to 1. */
export function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * lightness - 1));
}

/** Mix two colours. amount 0 gives a, 1 gives b. */
export function mixColours(a: string, b: string, amount: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

export interface DominantColour {
  hex: string;
  /** Share of the sampled pixels, 0 to 1. */
  share: number;
}

export interface ColourExtractionOptions {
  /** How many colours to return at most. The studio config sets 3 to 5. */
  maxColours: number;
  minColours: number;
  /** Colours closer than this in RGB distance count as one colour. */
  mergeDistance: number;
  /** Upper bound on sampled pixels, so a large design stays fast. */
  maxSamples: number;
}

export interface ColourExtractionResult {
  colours: DominantColour[];
  sampledPixels: number;
  /** True when the design holds fewer distinct colours than the minimum. Nothing is invented to fill the gap. */
  fewerThanMinimum: boolean;
}

interface Box {
  pixels: Rgb[];
}

function channelRange(pixels: Rgb[], channel: number): number {
  let min = 255;
  let max = 0;
  for (const p of pixels) {
    if (p[channel] < min) min = p[channel];
    if (p[channel] > max) max = p[channel];
  }
  return max - min;
}

function average(pixels: Rgb[]): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of pixels) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  const n = pixels.length || 1;
  return [r / n, g / n, b / n];
}

/**
 * Dominant colours by median cut. Deterministic: the same pixels always
 * give the same colours in the same order. Fully transparent pixels are
 * skipped.
 */
export function extractDominantColours(
  rgba: ArrayLike<number>,
  widthPx: number,
  heightPx: number,
  options: ColourExtractionOptions,
): ColourExtractionResult {
  if (rgba.length < widthPx * heightPx * 4) throw new Error("Pixel data is shorter than width times height times 4.");
  if (options.maxColours < 1 || options.minColours < 1 || options.minColours > options.maxColours) {
    throw new Error("Colour count limits are not valid.");
  }
  const total = widthPx * heightPx;
  const step = Math.max(1, Math.ceil(Math.sqrt(total / Math.max(1, options.maxSamples))));
  const samples: Rgb[] = [];
  for (let y = 0; y < heightPx; y += step) {
    for (let x = 0; x < widthPx; x += step) {
      const i = (y * widthPx + x) * 4;
      if (rgba[i + 3] < 128) continue;
      samples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    }
  }
  if (samples.length === 0) return { colours: [], sampledPixels: 0, fewerThanMinimum: true };

  let boxes: Box[] = [{ pixels: samples }];
  const targetBoxes = options.maxColours * 3;
  while (boxes.length < targetBoxes) {
    let pick = -1;
    let pickScore = 0;
    let pickChannel = 0;
    boxes.forEach((box, index) => {
      if (box.pixels.length < 2) return;
      for (let channel = 0; channel < 3; channel++) {
        const score = channelRange(box.pixels, channel) * Math.sqrt(box.pixels.length);
        if (score > pickScore) {
          pickScore = score;
          pick = index;
          pickChannel = channel;
        }
      }
    });
    if (pick < 0 || pickScore === 0) break;
    const sorted = [...boxes[pick].pixels].sort((a, b) => a[pickChannel] - b[pickChannel] || a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    // Split at the first value change at or after the median, so one flat
    // colour never ends up on both sides of the cut.
    let cut = Math.floor(sorted.length / 2);
    while (cut < sorted.length && cut > 0 && sorted[cut][pickChannel] === sorted[cut - 1][pickChannel]) cut++;
    if (cut >= sorted.length) {
      cut = Math.floor(sorted.length / 2);
      while (cut > 0 && sorted[cut][pickChannel] === sorted[cut - 1][pickChannel]) cut--;
    }
    if (cut <= 0 || cut >= sorted.length) break;
    boxes = [...boxes.slice(0, pick), { pixels: sorted.slice(0, cut) }, { pixels: sorted.slice(cut) }, ...boxes.slice(pick + 1)];
  }

  // Merge boxes that landed on nearly the same colour, largest first.
  const candidates = boxes
    .map((box) => ({ rgb: average(box.pixels), count: box.pixels.length }))
    .sort((a, b) => b.count - a.count || rgbToHex(a.rgb).localeCompare(rgbToHex(b.rgb)));
  const merged: { rgb: Rgb; count: number }[] = [];
  for (const candidate of candidates) {
    const near = merged.find(
      (m) => Math.hypot(m.rgb[0] - candidate.rgb[0], m.rgb[1] - candidate.rgb[1], m.rgb[2] - candidate.rgb[2]) < options.mergeDistance,
    );
    if (near) {
      const sum = near.count + candidate.count;
      near.rgb = [
        (near.rgb[0] * near.count + candidate.rgb[0] * candidate.count) / sum,
        (near.rgb[1] * near.count + candidate.rgb[1] * candidate.count) / sum,
        (near.rgb[2] * near.count + candidate.rgb[2] * candidate.count) / sum,
      ];
      near.count = sum;
    } else {
      merged.push({ rgb: candidate.rgb, count: candidate.count });
    }
  }
  merged.sort((a, b) => b.count - a.count || rgbToHex(a.rgb).localeCompare(rgbToHex(b.rgb)));
  const colours = merged.slice(0, options.maxColours).map((m) => ({ hex: rgbToHex(m.rgb), share: m.count / samples.length }));
  return { colours, sampledPixels: samples.length, fewerThanMinimum: colours.length < options.minColours };
}

export const DESIGN_COLOURS_VARIANT_SUFFIX = "--design-colours";

/**
 * Build a style kit variant from the colours of a design. The variant is
 * an offer: it is returned, not saved, and the seller chooses whether to
 * use it. Backgrounds are light tints of the design colours, so the
 * design stays the strongest thing in the image. The design is not an
 * input here and cannot be changed by this function.
 */
export function buildKitVariantFromColours(kit: StyleKit, colours: DominantColour[], tintAmount: number): StyleKit {
  if (colours.length === 0) throw new Error("No colours were extracted from the design, so no variant can be built.");
  const white = "#FFFFFF";
  // Prefer colours with some hue for tints. Fall back to all colours.
  const hued = colours.filter((c) => saturation(c.hex) > 0.12 && relativeLuminance(c.hex) < 0.92);
  const tintSources = (hued.length > 0 ? hued : colours).map((c) => c.hex);
  const backgroundColours = tintSources.map((hex) => mixColours(hex, white, tintAmount));
  const primary = backgroundColours[0];
  const secondary = backgroundColours[1] ?? mixColours(primary, white, 0.5);

  const accentSource = [...(hued.length > 0 ? hued : colours)].sort(
    (a, b) => saturation(b.hex) - saturation(a.hex) || b.share - a.share,
  )[0];
  const accentColour = accentSource ? accentSource.hex : kit.accentColour;

  const darkest = [...colours].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex))[0].hex;
  const textColour = contrastRatio(darkest, primary) >= contrastRatio(kit.textColour, primary) ? darkest : kit.textColour;

  let background: BackgroundSpec;
  if (kit.background.type === "solid") {
    background = { type: "solid", colour: primary };
  } else if (kit.background.type === "gradient") {
    background = { type: "gradient", from: primary, to: secondary, angleDeg: kit.background.angleDeg };
  } else {
    background = { ...kit.background, backdropColour: primary };
  }
  const badgeText = contrastRatio(white, accentColour) >= contrastRatio(textColour, accentColour) ? white : textColour;

  return {
    ...kit,
    id: `${kit.id}${DESIGN_COLOURS_VARIANT_SUFFIX}`,
    slug: `${kit.slug}${DESIGN_COLOURS_VARIANT_SUFFIX}`,
    name: `${kit.name} (design colours)`,
    variantOf: kit.id,
    backgroundColours,
    accentColour,
    textColour,
    background,
    badge: { ...kit.badge, backgroundColour: accentColour, textColour: badgeText },
    // A shot level background override would hide the variant, so the
    // variant uses its own background on every shot.
    shots: kit.shots.map((shot) => ({ ...shot, background: null })),
    changeNote: `Variant of ${kit.id} version ${kit.version} built from the colours of the uploaded design. Not saved.`,
  };
}
