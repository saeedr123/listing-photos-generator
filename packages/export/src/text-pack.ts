// Copy paste text pack for Etsy.
// Title, description, tags, and checklist in plain text the seller can
// paste into Etsy. Values come from verified product facts and resolved
// copy only. Limits come from the platform pack, never hard coded here.

import type { PlatformPack } from "../../template-engine/src/platform-adapter.ts";

export interface TextPackInput {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  pack: PlatformPack;
}

export interface TextPackIssue {
  code: string;
  message: string;
  fix: string;
}

export interface TextPackResult {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  issues: TextPackIssue[];
  valid: boolean;
}

export function buildTextPack(input: TextPackInput): TextPackResult {
  const issues: TextPackIssue[] = [];
  const { pack } = input;

  if (input.title.length > pack.title.maxChars) {
    issues.push({
      code: "title-too-long",
      message: `Title is ${input.title.length} characters, over the Etsy limit of ${pack.title.maxChars}.`,
      fix: `Shorten the title to ${pack.title.maxChars} characters or fewer, keeping the most important traits first.`,
    });
  }
  if (input.title.toLowerCase().includes("perfect") || input.title.toLowerCase().includes("beautiful")) {
    issues.push({
      code: "title-subjective-word",
      message: "Title uses a subjective word such as perfect or beautiful. Etsy guidance moves those words to the description.",
      fix: "Move the subjective word to the description and keep the title factual.",
    });
  }
  if (input.tags.length > pack.tags.maxCount) {
    issues.push({
      code: "too-many-tags",
      message: `There are ${input.tags.length} tags, over the Etsy limit of ${pack.tags.maxCount}.`,
      fix: `Keep the ${pack.tags.maxCount} most relevant tags and drop the rest.`,
    });
  }
  input.tags.forEach((tag, i) => {
    if (tag.length > pack.tags.maxCharsPerTag) {
      issues.push({
        code: "tag-too-long",
        message: `Tag ${i + 1} "${tag}" is ${tag.length} characters, over the ${pack.tags.maxCharsPerTag} character limit per tag.`,
        fix: "Shorten the tag to a shorter phrase that still describes the product.",
      });
    }
    if (/^['-]/.test(tag)) {
      issues.push({
        code: "tag-bad-start",
        message: `Tag ${i + 1} "${tag}" starts with an apostrophe or hyphen, which Etsy tags cannot do.`,
        fix: "Rewrite the tag so it does not start with an apostrophe or hyphen.",
      });
    }
    if (/[^a-zA-Z0-9 '\-]/.test(tag)) {
      issues.push({
        code: "tag-bad-chars",
        message: `Tag ${i + 1} "${tag}" contains characters Etsy tags do not allow.`,
        fix: "Use only letters, numbers, spaces, apostrophes, and hyphens in tags.",
      });
    }
  });

  return {
    title: input.title,
    description: input.description,
    tags: input.tags,
    checklist: input.checklist,
    issues,
    valid: issues.length === 0,
  };
}

export function renderTextPackPlain(result: TextPackResult): string {
  const lines: string[] = [];
  lines.push("TITLE");
  lines.push(result.title);
  lines.push("");
  lines.push("DESCRIPTION");
  lines.push(result.description);
  lines.push("");
  lines.push("TAGS");
  result.tags.forEach((tag, i) => lines.push(`${i + 1}. ${tag}`));
  lines.push("");
  lines.push("PRE-PUBLISH CHECKLIST");
  result.checklist.forEach((item, i) => lines.push(`[ ] ${i + 1}. ${item}`));
  return lines.join("\n");
}
