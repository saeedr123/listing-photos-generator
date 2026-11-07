// Pure helpers for Listing Photos Generator.
// Every limit is passed in by the caller, from the active platform pack
// version or plan config. No platform name, size, or limit lives here.

export function countChars(text: string): number {
  return [...text].length;
}

export function isTitleWithinLimit(title: string, maxChars: number): boolean {
  return countChars(title) <= maxChars;
}

export function isTagWithinLimit(tag: string, maxChars: number): boolean {
  return countChars(tag) <= maxChars;
}

export type TagValidation = {
  valid: boolean;
  errors: string[];
};

export function validateTags(
  tags: string[],
  maxCount: number,
  maxCharsEach: number,
): TagValidation {
  const errors: string[] = [];
  if (tags.length > maxCount) {
    errors.push(
      `Too many tags: ${tags.length} given, maximum is ${maxCount}.`,
    );
  }
  for (const tag of tags) {
    if (!isTagWithinLimit(tag, maxCharsEach)) {
      errors.push(
        `Tag "${tag}" is ${countChars(tag)} characters, maximum is ${maxCharsEach}.`,
      );
    }
    if (tag.startsWith("'") || tag.startsWith("-")) {
      errors.push(`Tag "${tag}" must not start with an apostrophe or a hyphen.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function trialEndsAt(startsAt: Date, durationDays: number): Date {
  const ends = new Date(startsAt);
  ends.setUTCDate(ends.getUTCDate() + durationDays);
  return ends;
}
