// Reconciliation check, mandatory before export. Compares the verified
// product facts with what the pack shows in copy and on images.
// Flag only: on a mismatch the check stops the export and shows the fix.
// The tool never changes a product fact by itself, and never silently
// publishes on a mismatch. Whether the tool should fix a mismatch itself
// is an open question for real sellers, so flag only is implemented.

import type { ListingPack, ProductFacts, ReconciliationItem, ReconciliationResult } from "./types.ts";
import { formatPrice } from "./test-product.ts";

export interface DisplayedValues {
  // What the pack shows. Null means the pack does not state that fact.
  tabCount: number | null;
  priceListMinor: number | null;
  priceLaunchMinor: number | null;
  currency: string | null;
  formatText: string | null;
  claims: string[];
  // Full copy text, used only to search for banned format claims.
  // No copy text is stored in the result.
  copyText: string;
}

function money(minor: number | null, currency: string | null): string {
  return formatPrice(minor, currency);
}

export function reconcilePack(facts: ProductFacts, displayed: DisplayedValues, hasSampleContent: boolean): ReconciliationResult {
  const items: ReconciliationItem[] = [];

  // Tab count.
  if (facts.tabCount === null) {
    items.push({
      factKey: "tab_count",
      expected: "Tab count not confirmed",
      found: displayed.tabCount === null ? "Not stated in the pack" : String(displayed.tabCount),
      result: "mismatch",
      fix: "Confirm the real tab count from the product, then enter it in the product facts.",
      action: "block_export",
    });
  } else if (displayed.tabCount === null) {
    items.push({
      factKey: "tab_count",
      expected: String(facts.tabCount) + " tabs",
      found: "Not stated in the pack",
      result: "mismatch",
      fix: "Add the tab count (" + facts.tabCount + ") to the pack, or remove any tab claim from the pack.",
      action: "block_export",
    });
  } else if (displayed.tabCount !== facts.tabCount) {
    items.push({
      factKey: "tab_count",
      expected: String(facts.tabCount) + " tabs",
      found: String(displayed.tabCount) + " tabs",
      result: "mismatch",
      fix: "Change the pack to " + facts.tabCount + " tabs, or correct the product facts if the real product has a different count.",
      action: "block_export",
    });
  } else {
    items.push({
      factKey: "tab_count",
      expected: String(facts.tabCount) + " tabs",
      found: String(displayed.tabCount) + " tabs",
      result: "match",
      fix: "",
      action: "warn",
    });
  }

  // Price. The price is not shown in listing copy: Etsy titles must not
  // include price information. So a pack that does not state a price is not
  // a mismatch. A pack that states a different price is a mismatch.
  if (displayed.priceListMinor === null) {
    items.push({
      factKey: "price",
      expected: money(facts.priceListMinor, facts.currency),
      found: "Price not stated in the pack copy",
      result: "match",
      fix: "",
      action: "warn",
    });
  } else if (facts.priceListMinor === null) {
    items.push({
      factKey: "price",
      expected: "Price not confirmed",
      found: money(displayed.priceListMinor, displayed.currency),
      result: "mismatch",
      fix: "Confirm the real list price from the product, then enter it in the product facts.",
      action: "block_export",
    });
  } else if (displayed.priceListMinor !== facts.priceListMinor || displayed.currency !== facts.currency) {
    items.push({
      factKey: "price",
      expected: money(facts.priceListMinor, facts.currency),
      found: money(displayed.priceListMinor, displayed.currency),
      result: "mismatch",
      fix: "Change the pack price to " + money(facts.priceListMinor, facts.currency) + ", or correct the product facts if the real price is different.",
      action: "block_export",
    });
  } else {
    items.push({
      factKey: "price",
      expected: money(facts.priceListMinor, facts.currency),
      found: money(displayed.priceListMinor, displayed.currency),
      result: "match",
      fix: "",
      action: "warn",
    });
  }

  // Format: Sheets, not Excel, no .xlsx claim.
  const copyLower = displayed.copyText.toLowerCase();
  const formatText = (displayed.formatText ?? "").toLowerCase();
  const claimsExcel = copyLower.includes("excel") || copyLower.includes(".xlsx") || formatText.includes("excel") || formatText.includes(".xlsx");
  if (facts.format === "Sheets" && claimsExcel) {
    items.push({
      factKey: "format",
      expected: "Google Sheets",
      found: "Excel or .xlsx claim in the pack",
      result: "mismatch",
      fix: "Remove every Excel and .xlsx mention. This product is Google Sheets.",
      action: "block_export",
    });
  } else if (displayed.formatText === null || displayed.formatText.trim() === "") {
    items.push({
      factKey: "format",
      expected: facts.formatDetail || facts.format,
      found: "Not stated in the pack",
      result: "mismatch",
      fix: "Add the format (" + (facts.formatDetail || facts.format) + ") to the pack.",
      action: "block_export",
    });
  } else if (!formatText.includes(facts.format.toLowerCase()) && !formatText.includes(facts.formatDetail.toLowerCase())) {
    items.push({
      factKey: "format",
      expected: facts.formatDetail || facts.format,
      found: displayed.formatText,
      result: "mismatch",
      fix: "Change the pack format to " + (facts.formatDetail || facts.format) + ".",
      action: "block_export",
    });
  } else {
    items.push({
      factKey: "format",
      expected: facts.formatDetail || facts.format,
      found: displayed.formatText,
      result: "match",
      fix: "",
      action: "warn",
    });
  }

  // Claims: every claim shown must be a verified claim.
  for (const claim of displayed.claims) {
    if (!facts.claims.includes(claim)) {
      items.push({
        factKey: "claim",
        expected: "Verified claims only",
        found: claim,
        result: "mismatch",
        fix: "Remove this claim from the pack, or verify it against the real product and add it to the product facts first.",
        action: "block_export",
      });
    }
  }
  if (displayed.claims.length === 0) {
    items.push({
      factKey: "claim",
      expected: "Verified claims only",
      found: "No claims in the pack",
      result: "match",
      fix: "",
      action: "warn",
    });
  }

  // Sample content is never exported as if it were the seller's real product.
  if (hasSampleContent) {
    items.push({
      factKey: "sample_content",
      expected: "Seller's real product",
      found: "Sample content still in the pack",
      result: "mismatch",
      fix: "Replace the sample content with your real product facts and files, using the Replace sample action.",
      action: "block_export",
    });
  }

  const mismatches = items.filter((i) => i.result === "mismatch");
  const canExport = mismatches.length === 0;
  return {
    status: canExport ? "pass" : "blocked",
    checkedAt: new Date().toISOString(),
    items,
    canExport,
    summary: canExport
      ? "All checked facts match the real product."
      : mismatches.length + " mismatch" + (mismatches.length === 1 ? "" : "es") + " found. Export is blocked until each one is fixed.",
  };
}

// Build the displayed values from a pack by reading what the pack actually
// shows in its copy. The check must read the pack, not the facts, or it
// would always pass. Tab count, price, and format are parsed from the copy
// text; checklist entries are treated as the claims the pack shows.
export function displayedValuesFromPack(pack: ListingPack): DisplayedValues {
  const copyText = pack.copy.title + "\n" + pack.copy.description + "\n" + pack.copy.tags.join(" ") + "\n" + pack.copy.checklist.join("\n");
  const tabMatch = copyText.match(/(\d+)\s*tabs?/i);
  const priceMatch = copyText.match(/(USD|EUR|GBP)\s*(\d+(?:\.\d{1,2})?)/i);
  const lower = copyText.toLowerCase();
  let formatText: string | null = null;
  if (lower.includes("google sheets")) {
    formatText = "Google Sheets";
  } else if (lower.includes("excel") || lower.includes(".xlsx")) {
    formatText = "Excel";
  } else if (lower.includes("sheets")) {
    formatText = "Sheets";
  } else if (lower.includes("pdf")) {
    formatText = "PDF";
  }
  return {
    tabCount: tabMatch ? parseInt(tabMatch[1] as string, 10) : null,
    priceListMinor: priceMatch ? Math.round(parseFloat(priceMatch[2] as string) * 100) : null,
    priceLaunchMinor: null,
    currency: priceMatch ? (priceMatch[1] as string).toUpperCase() : null,
    formatText,
    claims: pack.copy.claimsShown.slice(),
    copyText,
  };
}
