// Text fit rules for long content.
// Long titles, long feature lists, and long tag phrases must never overflow
// a text area, overlap another area, or get clipped silently. The renderer
// asks this module first and either wraps, shortens with a visible marker,
// or reports that the content does not fit so the seller can shorten it.

export interface FitCheck {
  fits: boolean;
  linesNeeded: number;
  action: "fits" | "wrap" | "shorten" | "does-not-fit";
  message: string;
  fittedText: string;
}

/** Rough character width estimate per character, relative to font size. */
const CHAR_WIDTH_FACTOR = 0.52;

/**
 * Estimate how many lines a string needs in a box of a given width, at a
 * given font size. This is an estimate for layout planning, not a substitute
 * for the rasterizer legibility check at export size.
 */
export function estimateLines(
  text: string,
  boxWidthPx: number,
  fontSizePx: number,
): number {
  if (!text) return 0;
  const charWidth = fontSizePx * CHAR_WIDTH_FACTOR;
  const charsPerLine = Math.max(1, Math.floor(boxWidthPx / charWidth));
  let lines = 0;
  for (const word of text.split(/\s+/)) {
    void word;
  }
  // Word wrap simulation: pack words into lines of charsPerLine.
  let current = 0;
  for (const word of text.split(/\s+/)) {
    if (word.length > charsPerLine) {
      lines += Math.ceil(word.length / charsPerLine);
      current = 0;
      continue;
    }
    if (current === 0) {
      lines += 1;
      current = word.length;
    } else if (current + 1 + word.length <= charsPerLine) {
      current += 1 + word.length;
    } else {
      lines += 1;
      current = word.length;
    }
  }
  return lines;
}

export function checkTextFit(
  text: string,
  boxWidthPx: number,
  fontSizePx: number,
  maxLines: number,
  maxChars: number | null,
): FitCheck {
  if (maxChars !== null && text.length > maxChars) {
    return {
      fits: false,
      linesNeeded: estimateLines(text, boxWidthPx, fontSizePx),
      action: "shorten",
      message: `Text is ${text.length} characters, over the ${maxChars} character limit for this area. Shorten it before export.`,
      fittedText: text.slice(0, maxChars),
    };
  }
  const lines = estimateLines(text, boxWidthPx, fontSizePx);
  if (lines <= maxLines) {
    return {
      fits: true,
      linesNeeded: lines,
      action: lines > 1 ? "wrap" : "fits",
      message: `Text fits in ${lines} line(s).`,
      fittedText: text,
    };
  }
  return {
    fits: false,
    linesNeeded: lines,
    action: "does-not-fit",
    message: `Text needs ${lines} lines but this area allows ${maxLines}. Shorten the text or pick a template with a larger text area.`,
    fittedText: text,
  };
}

/** Truncate with a visible marker, only when the seller has approved shortening. */
export function shortenWithMarker(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 3)).trimEnd() + "...";
}
