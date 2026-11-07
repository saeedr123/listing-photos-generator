// Contain fit for mockup screens.
// The seller real product render is placed inside the screen area with
// contain fit, centred, no stretch, no colour change, no crop unless the
// seller approved it. A crop approval is recorded on the render, never
// assumed here.

import type { FitResult, Orientation, ScreenArea } from "./types.ts";

export interface FitInput {
  sourceWidth: number;
  sourceHeight: number;
  sourceOrientation: Orientation;
  screen: ScreenArea;
  frameWidth: number;
  frameHeight: number;
  cropApproved: boolean;
}

export function orientationOf(width: number, height: number): Orientation {
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

export function containFit(input: FitInput): FitResult {
  const screenW = (input.screen.w / 1000) * input.frameWidth;
  const screenH = (input.screen.h / 1000) * input.frameHeight;
  const screenX = (input.screen.x / 1000) * input.frameWidth;
  const screenY = (input.screen.y / 1000) * input.frameHeight;
  const scale = Math.min(screenW / input.sourceWidth, screenH / input.sourceHeight);
  const fittedWidth = input.sourceWidth * scale;
  const fittedHeight = input.sourceHeight * scale;
  const offsetX = screenX + (screenW - fittedWidth) / 2;
  const offsetY = screenY + (screenH - fittedHeight) / 2;
  const warnings: string[] = [];

  if (input.sourceOrientation === "landscape" && input.screen.w < input.screen.h) {
    warnings.push(
      "Landscape sheet in a portrait screen area: the sheet will show as a small band with space above and below. Use a portrait screenshot or an approved crop instead. Never stretch to fill.",
    );
  }
  if (input.sourceOrientation === "portrait" && input.screen.w > input.screen.h) {
    warnings.push(
      "Portrait sheet in a landscape screen area: the sheet will show with space on the left and right. Use a landscape screenshot or an approved crop instead. Never stretch to fill.",
    );
  }
  if (!input.cropApproved && (fittedWidth < screenW - 1 || fittedHeight < screenH - 1)) {
    warnings.push(
      "Contain fit leaves empty space in the screen area. That space stays empty. Do not stretch or crop to fill it without seller approval.",
    );
  }
  return {
    scale,
    fittedWidth,
    fittedHeight,
    offsetX,
    offsetY,
    letterboxTop: offsetY - screenY,
    letterboxBottom: screenY + screenH - (offsetY + fittedHeight),
    letterboxLeft: offsetX - screenX,
    letterboxRight: screenX + screenW - (offsetX + fittedWidth),
    stretched: false,
    cropped: false,
    colourChanged: false,
    warnings,
  };
}

/** Check whether a source orientation is allowed in a mockup screen. */
export function orientationAllowed(
  allowed: Orientation[],
  sourceOrientation: Orientation,
): { allowed: boolean; message: string } {
  if (allowed.includes(sourceOrientation)) {
    return { allowed: true, message: `Orientation ${sourceOrientation} is allowed in this mockup.` };
  }
  return {
    allowed: false,
    message: `Orientation ${sourceOrientation} is not allowed in this mockup. Allowed: ${allowed.join(", ")}. Offer a matching screenshot or an approved crop, never stretch.`,
  };
}
