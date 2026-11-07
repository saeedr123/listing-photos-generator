// Test product facts for the Maid of Honor Planner.
// Source: tests/fixtures/maid-of-honor-facts.json, the shared test product
// record. Prices in that fixture are task supplied, not independently
// rechecked against a live Etsy listing. Do not present them as verified
// live prices. Reconfirm them against the real product before they are used
// in a published pack.

import type { ProductFacts } from "./types.ts";

export const maidOfHonorFacts: ProductFacts = {
  productName: "Maid of Honor Planner",
  format: "Sheets",
  formatDetail: "Google Sheets",
  tabCount: 12,
  priceListMinor: 1397,
  priceLaunchMinor: 978,
  currency: "USD",
  claims: ["Google Sheets only", "Instant download", "12 interactive tabs"],
  features: [
    "Master To-Do List",
    "Master Budget and Split Calculator",
    "Itinerary and Event Schedules",
    "MOH Speech Builder",
    "Mobile Quick-Expense Log",
    "Printable Bridal Suite Kit",
  ],
  verificationNote:
    "Task supplied facts from tests/fixtures/maid-of-honor-facts.json, not independently rechecked against a live Etsy listing. " +
    "Reconfirm tab count, price, and format against the real product before publishing.",
};

export function formatPrice(minor: number | null, currency: string | null): string {
  if (minor === null || currency === null) {
    return "Price not confirmed";
  }
  const amount = (minor / 100).toFixed(2);
  return currency + " " + amount;
}
