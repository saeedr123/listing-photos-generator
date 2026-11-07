// Sample content for first time users. Sample content is clearly marked
// as sample, replaceable in one action, and never exported as if it were
// the seller's real product. Reconciliation blocks export while sample
// content is present. No sample content uses a real seller's product, a
// competitor's product, or any invented review, badge, or claim.

import type { ListingPackCopy, ProductFacts } from "./types.ts";

export const SAMPLE_MARKER = "Sample content";

// A clearly labelled sample pack copy. Every value is generic and marked
// sample. It exists only so a new seller can see the builder working before
// they upload their real product.
export function sampleCopy(): ListingPackCopy {
  return {
    title: SAMPLE_MARKER + ": Your Planner Title Goes Here",
    description:
      SAMPLE_MARKER + ": Describe your real product here. Replace this text with facts from your real product before export.",
    tags: ["sample", "planner"],
    checklist: ["Replace the sample title with your real product title.", "Replace the sample description with real product facts."],
    claimsShown: [],
    generationStatus: "draft",
  };
}

export function sampleFacts(): ProductFacts {
  return {
    productName: SAMPLE_MARKER + ": Example Planner",
    format: "Sheets",
    formatDetail: "Google Sheets",
    tabCount: null,
    priceListMinor: null,
    priceLaunchMinor: null,
    currency: null,
    claims: [],
    features: [],
    verificationNote: SAMPLE_MARKER + ": no facts verified. Replace with your real product.",
  };
}

// Replace sample content in one action. Returns the pack copy and facts
// with sample values cleared, ready for the seller's real values.
export function clearSampleContent(copy: ListingPackCopy, facts: ProductFacts): { copy: ListingPackCopy; facts: ProductFacts } {
  return {
    copy: {
      title: "",
      description: "",
      tags: [],
      checklist: [],
      claimsShown: [],
      generationStatus: "draft",
    },
    facts: {
      ...facts,
      productName: "",
      tabCount: null,
      priceListMinor: null,
      priceLaunchMinor: null,
      currency: null,
      claims: [],
      features: [],
      verificationNote: "",
    },
  };
}

export function containsSampleMarker(text: string): boolean {
  return text.includes(SAMPLE_MARKER);
}
