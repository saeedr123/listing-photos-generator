// Reconciliation check, mandatory before export.
// Compares the listing values against the verified product facts. On a
// mismatch the export is blocked or warned, never silently published.
// The tool does not fix a mismatch by changing a product fact. The seller
// fixes the source product or the listing fact, then re-runs the check.
// Open decision (PROMPT.md section 5.3): whether the tool should ever fix a
// mismatch itself is not decided. Until Ali decides, it only flags.

import type { ProductFacts } from "../../template-engine/src/types.ts";

export type ReconciliationAction = "block_export" | "warn";

export interface ReconciliationItem {
  factKey: "tab_count" | "price" | "format" | "claim";
  expected: string;
  found: string;
  result: "match" | "mismatch";
  action: ReconciliationAction;
  fix: string;
}

export interface ReconciliationResult {
  passed: boolean;
  blocked: boolean;
  items: ReconciliationItem[];
  summary: string;
}

export interface ListingValues {
  tabCount: number | null;
  priceList: { amount: number; currency: string } | null;
  priceLaunch: { amount: number; currency: string } | null;
  format: string | null;
  claims: string[];
}

function money(p: { amount: number; currency: string } | null): string {
  if (!p) return "not stated";
  return `${p.currency} ${p.amount.toFixed(2)}`;
}

export function reconcile(
  facts: ProductFacts,
  listing: ListingValues,
): ReconciliationResult {
  const items: ReconciliationItem[] = [];

  items.push({
    factKey: "tab_count",
    expected: String(facts.tabCount),
    found: listing.tabCount === null ? "not stated" : String(listing.tabCount),
    result: listing.tabCount === facts.tabCount ? "match" : "mismatch",
    action: "block_export",
    fix: `Change the tab count in the listing to ${facts.tabCount}, or correct the product fact if the real sheet has a different count.`,
  });

  const expectedPrice = `list ${money(facts.priceList)}, launch ${money(facts.priceLaunch)}`;
  const foundPrice = `list ${money(listing.priceList)}, launch ${money(listing.priceLaunch)}`;
  const priceMatches =
    money(facts.priceList) === money(listing.priceList) &&
    money(facts.priceLaunch) === money(listing.priceLaunch);
  items.push({
    factKey: "price",
    expected: expectedPrice,
    found: foundPrice,
    result: priceMatches ? "match" : "mismatch",
    action: "block_export",
    fix: `Change the price in the listing to ${expectedPrice}, or correct the product fact if the real price is different.`,
  });

  items.push({
    factKey: "format",
    expected: facts.format,
    found: listing.format ?? "not stated",
    result: listing.format === facts.format ? "match" : "mismatch",
    action: "block_export",
    fix: `Change the format in the listing to ${facts.format}. A ${facts.format} product must never be described as another format.`,
  });

  for (const claim of listing.claims) {
    const known = facts.claims.includes(claim) || facts.features.includes(claim);
    items.push({
      factKey: "claim",
      expected: known ? claim : "not a verified product fact",
      found: claim,
      result: known ? "match" : "mismatch",
      action: "warn",
      fix: known
        ? ""
        : `Remove the claim "${claim}" from the listing, or verify it against the real product and add it to the verified facts first.`,
    });
  }

  const blocked = items.some((i) => i.result === "mismatch" && i.action === "block_export");
  const warned = items.filter((i) => i.result === "mismatch" && i.action === "warn");
  const mismatches = items.filter((i) => i.result === "mismatch");
  return {
    passed: mismatches.length === 0,
    blocked,
    items,
    summary:
      mismatches.length === 0
        ? "Reconciliation passed: tab count, price, format, and claims match the real product."
        : blocked
          ? `Reconciliation blocked export: ${mismatches.map((m) => `${m.factKey} (expected ${m.expected}, found ${m.found})`).join("; ")}.`
          : `Reconciliation passed with warnings: ${warned.map((m) => m.factKey).join(", ")}.`,
  };
}
