// Copy prompt management, pure helpers. Prompts live in
// config/copy-prompts.json, versioned, changeable without code changes.
// Each prompt carries a version, a preview, and a rollback target. No
// prompt text is hard coded here.

import type { CopyPrompt, SuggestionKind } from "./types.ts";

export function getPrompt(prompts: CopyPrompt[], purpose: SuggestionKind | "niche_tailoring"): CopyPrompt | null {
  const published = prompts.filter(
    (prompt) => prompt.purpose === purpose && prompt.status === "published",
  );
  if (published.length === 0) {
    return null;
  }
  published.sort((a, b) => b.version - a.version);
  return published[0];
}

export function getPromptVersion(
  prompts: CopyPrompt[],
  slug: string,
  version: number,
): CopyPrompt | null {
  return prompts.find((prompt) => prompt.slug === slug && prompt.version === version) ?? null;
}

// Rollback target for a prompt version: the earlier version to restore, or
// null when there is no earlier version. Rollback creates a new version
// from the old text, it never overwrites history.
export function rollbackTarget(prompt: CopyPrompt): number | null {
  return prompt.rollbackToVersion;
}

export function listPromptVersions(prompts: CopyPrompt[], slug: string): CopyPrompt[] {
  return prompts
    .filter((prompt) => prompt.slug === slug)
    .sort((a, b) => a.version - b.version);
}

export function validatePrompts(prompts: CopyPrompt[]): string[] {
  const problems: string[] = [];
  const purposes = new Set<string>();
  for (const prompt of prompts) {
    purposes.add(prompt.purpose);
    if (prompt.version < 1) {
      problems.push("Prompt " + prompt.slug + " has no version number.");
    }
    if (prompt.promptText.trim() === "") {
      problems.push("Prompt " + prompt.slug + " version " + prompt.version + " has no prompt text.");
    }
    if (prompt.preview.trim() === "") {
      problems.push("Prompt " + prompt.slug + " version " + prompt.version + " has no preview.");
    }
    if (prompt.rollbackToVersion !== null && prompt.rollbackToVersion >= prompt.version) {
      problems.push(
        "Prompt " + prompt.slug + " version " + prompt.version + " has a rollback target that is not an earlier version.",
      );
    }
    if (
      prompt.promptText.includes("\u2014") ||
      prompt.promptText.includes("\u2013") ||
      prompt.preview.includes("\u2014") ||
      prompt.preview.includes("\u2013")
    ) {
      problems.push("Prompt " + prompt.slug + " contains an em dash or en dash.");
    }
  }
  for (const purpose of ["title", "description", "tags", "checklist"]) {
    if (!purposes.has(purpose)) {
      problems.push("No prompt exists for purpose: " + purpose + ".");
    }
  }
  return problems;
}
