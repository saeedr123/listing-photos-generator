// SVG preview builder and render spec builder.
// Preview is an SVG built from the same render model that export rasterizes.
// Text is wrapped with the same word wrap rules the rasterizer uses, so
// preview and export agree. The SVG never embeds a product render: it shows
// the placement box and label, and the export step places the real pixels.

import type { RenderModel, RenderTextBox } from "./types.ts";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Word wrap using a character width estimate, shared with the rasterizer. */
export function wrapText(text: string, maxWidthPx: number, fontSizePx: number): string[] {
  const charWidth = fontSizePx * 0.52;
  const charsPerLine = Math.max(1, Math.floor(maxWidthPx / charWidth));
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (word.length > charsPerLine) {
        if (current) lines.push(current);
        for (let i = 0; i < word.length; i += charsPerLine) {
          lines.push(word.slice(i, i + charsPerLine));
        }
        current = "";
        continue;
      }
      if (!current) current = word;
      else if (current.length + 1 + word.length <= charsPerLine) current += " " + word;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current || paragraph === "") lines.push(current);
  }
  return lines;
}

export function renderSvg(model: RenderModel): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${model.canvasWidthPx}" height="${model.canvasHeightPx}" viewBox="0 0 ${model.canvasWidthPx} ${model.canvasHeightPx}" role="img">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="${model.background}"/>`);
  if (model.pattern === "subtle-dots") {
    parts.push(
      `<defs><pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="2" fill="#E8CFCB"/></pattern></defs>`,
    );
    parts.push(`<rect width="100%" height="100%" fill="url(#dots)" opacity="0.5"/>`);
  }
  for (const rect of model.rects) {
    parts.push(
      `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="${rect.radius}" fill="${rect.fill}" stroke="${rect.stroke ?? "none"}" opacity="${rect.opacity}"/>`,
    );
  }
  for (const image of model.images) {
    parts.push(
      `<rect x="${image.x}" y="${image.y}" width="${image.w}" height="${image.h}" rx="12" fill="#FFFFFF" stroke="#C9A227" stroke-dasharray="8 6"/>`,
    );
    parts.push(
      `<text x="${image.x + image.w / 2}" y="${image.y + image.h / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#8A6D3B">${escapeXml(image.label)}${image.isSample ? " (SAMPLE)" : ""}</text>`,
    );
  }
  for (const text of model.texts) {
    const lines = wrapText(text.text, text.w, text.fontSizePx).slice(0, text.maxLines);
    const lineHeight = Math.round(text.fontSizePx * 1.3);
    const anchor = text.align === "center" ? "middle" : text.align === "right" ? "end" : "start";
    const x = text.align === "center" ? text.x + text.w / 2 : text.align === "right" ? text.x + text.w : text.x;
    lines.forEach((line, i) => {
      parts.push(
        `<text x="${x}" y="${text.y + (i + 1) * lineHeight}" text-anchor="${anchor}" font-family="${escapeXml(text.fontFamily)}" font-size="${text.fontSizePx}" font-weight="${text.fontWeight}" font-style="${text.fontStyle}" fill="${text.fill}">${escapeXml(line)}</text>`,
      );
    });
  }
  parts.push("</svg>");
  return parts.join("\n");
}

/** Render spec JSON, the exact input the export rasterizer consumes. */
export function toRenderSpec(model: RenderModel): Record<string, unknown> {
  return {
    templateId: model.templateId,
    templateVersion: model.templateVersion,
    canvasWidthPx: model.canvasWidthPx,
    canvasHeightPx: model.canvasHeightPx,
    colourProfile: model.colourProfile,
    background: model.background,
    pattern: model.pattern,
    rects: model.rects,
    texts: model.texts.map((t: RenderTextBox) => ({
      ...t,
      lines: wrapText(t.text, t.w, t.fontSizePx).slice(0, t.maxLines),
    })),
    images: model.images,
    warnings: model.warnings,
  };
}
