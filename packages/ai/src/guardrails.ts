// Guardrails for AI copy help. Every check here is mechanical and honest:
// it catches what can be checked from the verified facts, and it never
// claims to catch every paraphrased invention. Human review and the
// reconciliation check before export are still required. A flagged item is
// held for the seller to confirm, never silently fixed and never silently
// published.
//
// Checked mechanically: tab count numbers, price amounts, format tokens,
// review and social proof tokens, title length, tag count and length, tag
// start characters, explicit claim entries, and keyword words against the
// seller's own product words. No em dash or en dash is used in any message.

import type {
  AiSuggestion,
  FlaggedKeyword,
  GuardrailResult,
  MissingInfoPrompt,
  PlatformLimits,
  SuggestionKind,
  VerifiedFacts,
} from "./types.ts";

const STOPWORDS = new Set([
  "a", "an", "and", "for", "in", "my", "of", "on", "the", "to", "with",
  "your", "its", "is", "are",
]);

// Generic descriptors that are not product claims. A keyword may use these
// even when they are not in the seller's own product words. The list is
// deliberately small: a concrete feature or use word must come from the
// seller, not from this list.
const GENERIC_WORDS = new Set([
  "digital", "download", "instant", "planner", "spreadsheet", "sheet",
  "sheets", "template", "file", "organizer", "organiser",
]);

// Format tokens mapped to their canonical format name.
const FORMAT_TOKENS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bgoogle\s+sheets\b/gi, canonical: "Google Sheets" },
  { pattern: /\.xlsx\b/gi, canonical: "Excel" },
  { pattern: /\bxlsx\b/gi, canonical: "Excel" },
  { pattern: /\bexcel\b/gi, canonical: "Excel" },
  { pattern: /\bsheets\b/gi, canonical: "Google Sheets" },
  { pattern: /\bpdf\b/gi, canonical: "PDF" },
  { pattern: /\bcsv\b/gi, canonical: "CSV" },
  { pattern: /\bzip\b/gi, canonical: "ZIP" },
];

const REVIEW_PATTERN =
  /\b(reviews?|customers?|ratings?|stars?|bestsellers?|best\s+sellers?)\b|\bloved\s+by\b|\btrusted\s+by\b/gi;

export function sellerWords(facts: VerifiedFacts): Set<string> {
  const words = new Set<string>();
  const sources = [
    facts.productName,
    facts.format,
    facts.formatDetail,
    ...facts.features,
    ...facts.claims,
  ];
  for (const source of sources) {
    for (const word of source.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length >= 2) {
        words.add(word);
      }
    }
  }
  return words;
}

export function canonicalFormat(facts: VerifiedFacts): string {
  const detail = (facts.formatDetail + " " + facts.format).toLowerCase();
  if (detail.includes("sheets") || facts.format.toLowerCase() === "sheets") {
    return "Google Sheets";
  }
  if (detail.includes("pdf") || facts.format.toLowerCase() === "pdf") {
    return "PDF";
  }
  if (detail.includes("zip") || facts.format.toLowerCase() === "zip") {
    return "ZIP";
  }
  return facts.format;
}

function findTabCountClaims(text: string): number[] {
  const found: number[] = [];
  const pattern = /(\d+)\s*[- ]?\s*(tabs?|sheets?)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    found.push(Number(match[1]));
  }
  return found;
}

function findPriceClaimsMinor(text: string): number[] {
  const found: number[] = [];
  const dollar = /\$\s*(\d[\d,]*(?:\.\d{1,2})?)/g;
  const coded = /(\d[\d,]*(?:\.\d{2}))\s*(USD|EUR|GBP)\b/g;
  let match: RegExpExecArray | null;
  while ((match = dollar.exec(text)) !== null) {
    found.push(Math.round(Number(match[1].replace(/,/g, "")) * 100));
  }
  while ((match = coded.exec(text)) !== null) {
    found.push(Math.round(Number(match[1].replace(/,/g, "")) * 100));
  }
  return found;
}

function findFormatClaims(text: string): string[] {
  const found = new Set<string>();
  for (const token of FORMAT_TOKENS) {
    token.pattern.lastIndex = 0;
    if (token.pattern.test(text)) {
      found.add(token.canonical);
    }
  }
  return [...found];
}

function findReviewClaims(text: string): string[] {
  REVIEW_PATTERN.lastIndex = 0;
  const found: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = REVIEW_PATTERN.exec(text)) !== null) {
    found.push(match[0].toLowerCase());
  }
  return found;
}

function checkTextClaims(text: string, facts: VerifiedFacts): string[] {
  const violations: string[] = [];
  const expectedFormat = canonicalFormat(facts);

  for (const count of findTabCountClaims(text)) {
    if (facts.tabCount === null) {
      violations.push(
        "States " + count + " tabs, but no tab count is confirmed for this product.",
      );
    } else if (count !== facts.tabCount) {
      violations.push(
        "States " + count + " tabs, but the verified tab count is " + facts.tabCount + ".",
      );
    }
  }

  const confirmedPrices = [facts.priceListMinor, facts.priceLaunchMinor].filter(
    (value): value is number => value !== null,
  );
  for (const minor of findPriceClaimsMinor(text)) {
    if (confirmedPrices.length === 0) {
      violations.push(
        "States a price, but no price is confirmed for this product.",
      );
    } else if (!confirmedPrices.includes(minor)) {
      violations.push(
        "States a price that does not match the confirmed product price.",
      );
    }
  }

  for (const format of findFormatClaims(text)) {
    if (format !== expectedFormat) {
      violations.push(
        "States format " + format + ", but the verified format is " + expectedFormat + ".",
      );
    }
  }

  for (const review of findReviewClaims(text)) {
    violations.push(
      "States review or social proof (" + review + ") that is not a verified product fact.",
    );
  }

  return violations;
}

// Check one explicit claim entry, as shown in a pack claims list. A claim
// passes only when it matches a verified claim or feature, or when it is a
// tab count or format statement that agrees with the verified facts.
// Ordinary prose is not checked by this function; prose is checked by
// checkTextClaims through validateSuggestion.
export function checkClaimText(claim: string, facts: VerifiedFacts): string[] {
  const cleaned = claim.trim().toLowerCase();
  if (cleaned === "") {
    return ["An empty claim was supplied."];
  }
  const verified = [...facts.claims, ...facts.features].map((entry) =>
    entry.trim().toLowerCase(),
  );
  if (verified.includes(cleaned)) {
    return [];
  }
  const textViolations = checkTextClaims(claim, facts);
  const tabMatches = findTabCountClaims(claim);
  const formatMatches = findFormatClaims(claim);
  if (textViolations.length === 0 && (tabMatches.length > 0 || formatMatches.length > 0)) {
    return [];
  }
  if (textViolations.length > 0) {
    return textViolations;
  }
  return [
    "Claim \"" + claim.trim() + "\" is not in the verified product facts.",
  ];
}

export function missingInfoFor(
  facts: VerifiedFacts,
  kinds: SuggestionKind[],
): MissingInfoPrompt[] {
  const missing: MissingInfoPrompt[] = [];
  const needs = new Set(kinds);
  if (facts.productName.trim() === "") {
    missing.push({
      field: "product_name",
      prompt: "Tell us the real product name, so the copy can name it.",
    });
  }
  if (facts.format.trim() === "" && facts.formatDetail.trim() === "") {
    missing.push({
      field: "format",
      prompt: "Tell us the real product format, for example Google Sheets or PDF, so the copy states the right format.",
    });
  }
  if ((needs.has("description") || needs.has("tags")) && facts.features.length === 0 && facts.claims.length === 0) {
    missing.push({
      field: "features",
      prompt: "List the real features of the product, one per line, so the copy describes only what the product has.",
    });
  }
  if (needs.has("checklist") && facts.tabCount === null) {
    missing.push({
      field: "tab_count",
      prompt: "Tell us the real tab count from the product, so the checklist can state it. Do not guess it.",
    });
  }
  return missing;
}

// Flag a keyword that would add a false claim. A flagged keyword is held
// for the seller to confirm, never added silently. The check covers tab
// count numbers, format tokens, price tokens, review tokens, words that
// are not in the seller's own product words, tag length, and tag start
// characters. Limits are passed in, never hard coded.
export function flagKeyword(
  keyword: string,
  facts: VerifiedFacts,
  limits?: PlatformLimits,
): FlaggedKeyword {
  const reasons: string[] = [];
  const cleaned = keyword.trim();
  if (cleaned === "") {
    return { keyword, reasons: ["Keyword is empty."] };
  }
  if (cleaned.startsWith("'") || cleaned.startsWith("-")) {
    reasons.push("Keyword must not start with an apostrophe or a hyphen.");
  }
  if (limits && [...cleaned].length > limits.tagMaxChars) {
    reasons.push(
      "Keyword is " + [...cleaned].length + " characters, maximum is " + limits.tagMaxChars + ".",
    );
  }
  for (const count of findTabCountClaims(cleaned)) {
    if (facts.tabCount === null) {
      reasons.push("Keyword states " + count + " tabs, but no tab count is confirmed.");
    } else if (count !== facts.tabCount) {
      reasons.push(
        "Keyword states " + count + " tabs, but the verified tab count is " + facts.tabCount + ".",
      );
    }
  }
  for (const minor of findPriceClaimsMinor(cleaned)) {
    const confirmed = [facts.priceListMinor, facts.priceLaunchMinor].filter(
      (value): value is number => value !== null,
    );
    if (confirmed.length === 0 || !confirmed.includes(minor)) {
      reasons.push("Keyword states a price that is not a confirmed product price.");
    }
  }
  const expectedFormat = canonicalFormat(facts);
  for (const format of findFormatClaims(cleaned)) {
    if (format !== expectedFormat) {
      reasons.push(
        "Keyword states format " + format + ", but the verified format is " + expectedFormat + ".",
      );
    }
  }
  for (const review of findReviewClaims(cleaned)) {
    reasons.push("Keyword states review or social proof (" + review + ") that is not verified.");
  }
  const words = sellerWords(facts);
  for (const word of cleaned.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word === "" || STOPWORDS.has(word) || GENERIC_WORDS.has(word)) {
      continue;
    }
    if (/^\d+$/.test(word)) {
      continue;
    }
    if (!words.has(word)) {
      reasons.push(
        "Word '" + word + "' is not in the seller's own product words. Confirm with the seller before using it.",
      );
    }
  }
  return { keyword: cleaned, reasons };
}

export function validateSuggestion(
  facts: VerifiedFacts,
  suggestion: AiSuggestion,
  limits: PlatformLimits,
): GuardrailResult {
  const violations: string[] = [];
  const missingInfo = missingInfoFor(facts, [suggestion.kind]);
  const flaggedKeywords: FlaggedKeyword[] = [];

  const parts: string[] = [];
  if (suggestion.text) {
    parts.push(suggestion.text);
  }
  if (suggestion.tags) {
    parts.push(suggestion.tags.join(", "));
  }
  if (suggestion.checklist) {
    parts.push(suggestion.checklist.join(". "));
  }
  const fullText = parts.join(" ");
  violations.push(...checkTextClaims(fullText, facts));

  if (suggestion.kind === "title" && suggestion.text !== null) {
    if ([...suggestion.text].length > limits.titleMaxChars) {
      violations.push(
        "Title is " + [...suggestion.text].length + " characters, maximum is " + limits.titleMaxChars + ".",
      );
    }
  }
  if (suggestion.tags) {
    if (suggestion.tags.length > limits.tagMaxCount) {
      violations.push(
        "Too many tags: " + suggestion.tags.length + " given, maximum is " + limits.tagMaxCount + ".",
      );
    }
    for (const tag of suggestion.tags) {
      if ([...tag].length > limits.tagMaxChars) {
        violations.push(
          "Tag \"" + tag + "\" is " + [...tag].length + " characters, maximum is " + limits.tagMaxChars + ".",
        );
      }
      const flagged = flagKeyword(tag, facts, limits);
      if (flagged.reasons.length > 0) {
        flaggedKeywords.push(flagged);
        for (const reason of flagged.reasons) {
          if (reason.startsWith("Keyword states") || reason.startsWith("Keyword is") || reason.startsWith("Keyword must")) {
            violations.push("Tag \"" + tag + "\": " + reason);
          }
        }
      }
    }
  }
  if (suggestion.kind === "tags" && suggestion.tags) {
    for (const tag of suggestion.tags) {
      const flagged = flagKeyword(tag, facts, limits);
      if (flagged.reasons.length > 0 && !flaggedKeywords.some((entry) => entry.keyword === tag)) {
        flaggedKeywords.push(flagged);
      }
    }
  }

  return {
    ok: violations.length === 0 && missingInfo.length === 0,
    violations,
    missingInfo,
    flaggedKeywords,
  };
}

// Labels that keep AI output honest in the interface. An AI assisted layout
// is a template, never a real product photo. A mockup is a presentation
// frame, never a real product screenshot.
export function aiLayoutLabel(): string {
  return "AI assisted layout. This is a template, not a real product photo.";
}

export function mockupFrameLabel(): string {
  return "Mockup frame. This is a presentation frame, not a real product screenshot.";
}

export function suggestionLabel(): string {
  return "Suggestion, not a final fact. Edit it, accept it, or reject it.";
}
