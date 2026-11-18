// Fact check for the text placed on listing images (headline, bullets,
// badge). Text on an image does not have to state every product fact, so
// a fact that is not mentioned is fine. A fact that IS stated must match
// the verified product facts, or the export is blocked with the fix.

import { formatPrice } from "./test-product.ts";
import { displayedValuesFromText } from "./reconciliation.ts";
import type { ProductFacts, ReconciliationItem, ReconciliationResult } from "./types.ts";

export interface StudioText {
  headline: string;
  bullets: string[];
  badge: string;
}

export function studioTextAsString(text: StudioText): string {
  return [text.headline, ...text.bullets, text.badge].map((part) => part.trim()).filter(Boolean).join("\n");
}

export function checkStudioText(facts: ProductFacts, text: StudioText, hasSampleContent: boolean): ReconciliationResult {
  const shown = studioTextAsString(text);
  const displayed = displayedValuesFromText(shown, []);
  const items: ReconciliationItem[] = [];

  if (displayed.tabCount !== null) {
    if (facts.tabCount === null) {
      items.push({ factKey: "tab_count", expected: "Tab count not confirmed", found: String(displayed.tabCount), result: "mismatch", fix: "Confirm the real tab count in the product facts, or remove the tab count from the image text.", action: "block_export" });
    } else if (displayed.tabCount !== facts.tabCount) {
      items.push({ factKey: "tab_count", expected: String(facts.tabCount), found: String(displayed.tabCount), result: "mismatch", fix: `The image text says ${displayed.tabCount} tabs. The product has ${facts.tabCount}. Correct the image text.`, action: "block_export" });
    } else {
      items.push({ factKey: "tab_count", expected: String(facts.tabCount), found: String(displayed.tabCount), result: "match", fix: "", action: "warn" });
    }
  }

  if (displayed.priceListMinor !== null) {
    const matches = facts.priceListMinor !== null && displayed.priceListMinor === facts.priceListMinor && displayed.currency === facts.currency;
    items.push({
      factKey: "price",
      expected: facts.priceListMinor === null ? "Price not confirmed" : formatPrice(facts.priceListMinor, facts.currency),
      found: formatPrice(displayed.priceListMinor, displayed.currency),
      result: matches ? "match" : "mismatch",
      fix: matches ? "" : "Correct the price in the image text, or remove it. Etsy shows the price itself.",
      action: matches ? "warn" : "block_export",
    });
  }

  if (displayed.formatText !== null) {
    const stated = displayed.formatText.toLowerCase();
    const claimsExcel = stated === "excel";
    const matches = !(facts.format === "Sheets" && claimsExcel) && (stated.includes(facts.format.toLowerCase()) || (facts.formatDetail !== "" && facts.formatDetail.toLowerCase().includes(stated)));
    items.push({
      factKey: "format",
      expected: facts.formatDetail || facts.format,
      found: displayed.formatText,
      result: matches ? "match" : "mismatch",
      fix: matches ? "" : `The image text says ${displayed.formatText}. The product is ${facts.formatDetail || facts.format}. Correct the image text.`,
      action: matches ? "warn" : "block_export",
    });
  }

  if (hasSampleContent) {
    items.push({ factKey: "sample_content", expected: "The seller real product", found: "Sample content", result: "mismatch", fix: "Replace the sample content with your real product before exporting images.", action: "block_export" });
  }

  const blocked = items.filter((item) => item.action === "block_export");
  const status = blocked.length > 0 ? "blocked" : "pass";
  return {
    status,
    checkedAt: new Date().toISOString(),
    items,
    canExport: blocked.length === 0,
    summary: blocked.length > 0 ? `${blocked.length} fact${blocked.length === 1 ? "" : "s"} in the image text do not match the product. ${blocked.map((item) => item.fix).join(" ")}` : "The image text matches the product facts.",
  };
}
