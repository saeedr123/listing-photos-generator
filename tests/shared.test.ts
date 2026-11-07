import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  countChars,
  trialEndsAt,
  validateTags,
} from "../packages/shared/src/checks";

describe("shared checks", () => {
  it("counts characters", () => {
    expect(countChars("hello")).toBe(5);
    expect(countChars("")).toBe(0);
  });

  it("validates tags against pack limits", () => {
    const ok = validateTags(["wedding planner", "budget sheet"], 13, 20);
    expect(ok.valid).toBe(true);
    expect(ok.errors).toEqual([]);

    const tooMany = validateTags(Array.from({ length: 14 }, () => "tag"), 13, 20);
    expect(tooMany.valid).toBe(false);

    const tooLong = validateTags(["a very long tag phrase here"], 13, 20);
    expect(tooLong.valid).toBe(false);

    const badStart = validateTags(["-bad tag"], 13, 20);
    expect(badStart.valid).toBe(false);
  });

  it("adds trial days to the start date", () => {
    const starts = new Date("2026-11-07T00:00:00.000Z");
    expect(trialEndsAt(starts, 7).toISOString()).toBe(
      "2026-11-14T00:00:00.000Z",
    );
  });
});

describe("Prisma schema", () => {
  it("defines all 43 tables from docs/database-design.md", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const models = schema.match(/^model \w+ \{/gm) ?? [];
    expect(models).toHaveLength(43);
    for (const name of [
      "User",
      "Product",
      "ProductVerifiedFact",
      "ListingPack",
      "ListingPackCopy",
      "ListingPackCopyVersion",
      "Template",
      "TemplateVersion",
      "Mockup",
      "MockupVersion",
      "PlatformPack",
      "PlatformPackVersion",
      "NichePack",
      "NichePackVersion",
      "CopyPrompt",
      "CopyPromptVersion",
      "Plan",
      "Trial",
    ]) {
      expect(schema).toContain(`model ${name} {`);
    }
  });

  it("keeps the schema platform neutral", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).not.toMatch(/\betsy_size\b/);
    expect(schema).not.toMatch(/\bamazon_title\b/);
    expect(schema).not.toMatch(/\bebay_tags\b/);
    expect(schema).toContain("platform_id");
    expect(schema).toContain("pack_version_id");
  });

  it("records the mockup licence on MockupVersion", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("licence_source");
    expect(schema).toContain("licence_type");
    expect(schema).toContain("licence_date");
    expect(schema).toContain("licence_storage_location");
  });

  it("carries an edition tag on User and ListingPack", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const userBlock = schema.slice(
      schema.indexOf("model User {"),
      schema.indexOf("model AuthIdentity {"),
    );
    const packBlock = schema.slice(
      schema.indexOf("model ListingPack {"),
      schema.indexOf("model ListingPackImage {"),
    );
    expect(userBlock).toContain("edition");
    expect(packBlock).toContain("edition");
  });
});
