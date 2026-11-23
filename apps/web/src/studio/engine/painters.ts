// 2D painters shared by the live preview and the export render, so both
// draw the background and the text the same way. The background and the
// text come from the style kit. Nothing here touches the seller design.

import type { BackgroundSpec, BatchItemText, ShotTextLayout, StyleKit, TextArea } from "@listing-photos-generator/mockup-engine/studio";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function paintBackground(ctx: Ctx, widthPx: number, heightPx: number, background: BackgroundSpec): void {
  ctx.save();
  if (background.type === "solid") {
    ctx.fillStyle = background.colour;
  } else if (background.type === "gradient") {
    // 0 degrees runs bottom to top, 90 left to right, 180 top to bottom, like CSS.
    const angle = (background.angleDeg * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const half = (Math.abs(dx) * widthPx + Math.abs(dy) * heightPx) / 2;
    const cx = widthPx / 2;
    const cy = heightPx / 2;
    const gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    gradient.addColorStop(0, background.from);
    gradient.addColorStop(1, background.to);
    ctx.fillStyle = gradient;
  } else {
    // The desk itself is a textured plane in the 3D scene. This colour
    // shows wherever the camera sees past the desk.
    ctx.fillStyle = background.backdropColour;
  }
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.restore();
}

function cssFont(family: string, weight: number, sizePx: number): string {
  return `${weight} ${sizePx}px ${family}`;
}

function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface FittedText {
  sizePx: number;
  lines: string[];
  lineHeight: number;
}

/** Largest font size, from a starting size down, at which the text fits the box. */
function fitText(ctx: Ctx, text: string, family: string, weight: number, box: { w: number; h: number }, startPx: number, maxLines: number): FittedText {
  let sizePx = Math.max(8, Math.floor(startPx));
  for (;;) {
    ctx.font = cssFont(family, weight, sizePx);
    const lines = wrapLines(ctx, text, box.w);
    const lineHeight = sizePx * 1.18;
    const widest = Math.max(0, ...lines.map((line) => ctx.measureText(line).width));
    if ((lines.length <= maxLines && lines.length * lineHeight <= box.h && widest <= box.w) || sizePx <= 8) {
      return { sizePx, lines, lineHeight };
    }
    sizePx = Math.floor(sizePx * 0.94);
  }
}

function toPixels(area: TextArea, widthPx: number, heightPx: number): { x: number; y: number; w: number; h: number } {
  return { x: (area.x / 1000) * widthPx, y: (area.y / 1000) * heightPx, w: (area.w / 1000) * widthPx, h: (area.h / 1000) * heightPx };
}

function alignedX(area: TextArea, box: { x: number; w: number }): number {
  if (area.align === "left") return box.x;
  if (area.align === "right") return box.x + box.w;
  return box.x + box.w / 2;
}

export function paintTextOverlay(
  ctx: Ctx,
  widthPx: number,
  heightPx: number,
  text: BatchItemText,
  layout: ShotTextLayout,
  kit: StyleKit,
): void {
  ctx.save();
  ctx.textBaseline = "middle";

  if (text.headline && layout.headline) {
    const box = toPixels(layout.headline, widthPx, heightPx);
    const fitted = fitText(ctx, text.headline, kit.fonts.headline.family, kit.fonts.headline.weight, box, box.h * 0.8, 2);
    ctx.font = cssFont(kit.fonts.headline.family, kit.fonts.headline.weight, fitted.sizePx);
    ctx.fillStyle = kit.textColour;
    ctx.textAlign = layout.headline.align;
    const blockHeight = fitted.lines.length * fitted.lineHeight;
    fitted.lines.forEach((line, index) => {
      ctx.fillText(line, alignedX(layout.headline!, box), box.y + (box.h - blockHeight) / 2 + fitted.lineHeight * (index + 0.5));
    });
  }

  if (text.bullets.length > 0 && layout.bullets) {
    const box = toPixels(layout.bullets, widthPx, heightPx);
    const rowHeight = box.h / text.bullets.length;
    const dot = Math.min(rowHeight * 0.16, heightPx * 0.012);
    const textBox = { w: box.w - dot * 4, h: rowHeight * 0.8 };
    // One size for every bullet: the size that fits the longest one.
    const sizePx = Math.min(
      ...text.bullets.map((bullet) => fitText(ctx, bullet, kit.fonts.body.family, kit.fonts.body.weight, textBox, heightPx * 0.04, 2).sizePx),
    );
    ctx.font = cssFont(kit.fonts.body.family, kit.fonts.body.weight, sizePx);
    ctx.textAlign = "left";
    text.bullets.forEach((bullet, index) => {
      const centreY = box.y + rowHeight * (index + 0.5);
      ctx.fillStyle = kit.accentColour;
      ctx.beginPath();
      ctx.arc(box.x + dot, centreY, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = kit.textColour;
      const lines = wrapLines(ctx, bullet, textBox.w);
      const lineHeight = sizePx * 1.18;
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, box.x + dot * 4, centreY - ((lines.length - 1) * lineHeight) / 2 + lineIndex * lineHeight);
      });
    });
  }

  if (text.badge && layout.badge && kit.badge.style !== "none") {
    const box = toPixels(layout.badge, widthPx, heightPx);
    ctx.fillStyle = kit.badge.backgroundColour;
    ctx.textAlign = "center";
    if (kit.badge.style === "circle") {
      const radius = Math.min(box.w, box.h) / 2;
      ctx.beginPath();
      ctx.arc(box.x + box.w / 2, box.y + box.h / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      const inner = { w: radius * 1.35, h: radius * 1.1 };
      const fitted = fitText(ctx, text.badge, kit.fonts.body.family, 700, inner, radius * 0.5, 3);
      ctx.font = cssFont(kit.fonts.body.family, 700, fitted.sizePx);
      ctx.fillStyle = kit.badge.textColour;
      const blockHeight = fitted.lines.length * fitted.lineHeight;
      fitted.lines.forEach((line, index) => {
        ctx.fillText(line, box.x + box.w / 2, box.y + box.h / 2 - blockHeight / 2 + fitted.lineHeight * (index + 0.5));
      });
    } else {
      const pillHeight = Math.min(box.h, heightPx * 0.07);
      const inner = { w: box.w * 0.86, h: pillHeight * 0.62 };
      const fitted = fitText(ctx, text.badge, kit.fonts.body.family, 700, inner, pillHeight * 0.5, 1);
      ctx.font = cssFont(kit.fonts.body.family, 700, fitted.sizePx);
      const pillWidth = Math.min(box.w, ctx.measureText(fitted.lines[0] ?? "").width + pillHeight * 1.1);
      const x = layout.badge.align === "left" ? box.x : layout.badge.align === "right" ? box.x + box.w - pillWidth : box.x + (box.w - pillWidth) / 2;
      const y = box.y;
      const radius = pillHeight / 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + pillWidth - radius, y);
      ctx.arc(x + pillWidth - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + radius, y + pillHeight);
      ctx.arc(x + radius, y + radius, radius, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = kit.badge.textColour;
      ctx.fillText(fitted.lines[0] ?? "", x + pillWidth / 2, y + pillHeight / 2);
    }
  }
  ctx.restore();
}
