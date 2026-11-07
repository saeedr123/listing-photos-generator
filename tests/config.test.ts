import { describe, expect, it } from "vitest";
import etsyPack from "../config/platform-packs/etsy.v1.json";
import nichePacks from "../config/niche-packs.json";
import plans from "../config/plans.json";
import siteCopy from "../config/site-copy.json";

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  } else if (value !== null && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}

describe("Etsy platform pack (verified rules only)", () => {
  it("is version 1 for Etsy", () => {
    expect(etsyPack.platform_id).toBe("etsy");
    expect(etsyPack.version).toBe(1);
    expect(etsyPack.verification.check_date).toBe("2026-11-05");
  });

  it("uses verified Etsy image rules", () => {
    expect(etsyPack.image.recommended_shortest_side_px).toBe(2000);
    expect(etsyPack.image.max_images).toBe(20);
    expect(etsyPack.image.max_videos).toBe(2);
    expect(etsyPack.export.shortest_side_px).toBe(2000);
    expect(etsyPack.export.format).toBe("jpg");
    expect(etsyPack.export.colour_profile).toBe("sRGB");
    expect(etsyPack.first_photo.min_px).toBe(635);
  });

  it("uses verified Etsy title and tag rules", () => {
    expect(etsyPack.title.max_chars).toBe(140);
    expect(etsyPack.tags.max_count).toBe(13);
    expect(etsyPack.tags.max_chars_each).toBe(20);
  });

  it("uses verified Etsy digital file rules", () => {
    expect(etsyPack.digital.max_files).toBe(5);
    expect(etsyPack.digital.max_file_size_mb_each).toBe(20);
    expect(etsyPack.digital.file_name_max_chars).toBe(70);
    expect(etsyPack.digital.variations_allowed).toBe(false);
  });

  it("marks unverified items as unverified, with no invented cap", () => {
    expect(etsyPack.image.hard_max_file_size_mb).toBeNull();
    expect(etsyPack.image.max_pixel_dimension).toBeNull();
    expect(etsyPack.description.character_limit).toBeNull();
    expect(etsyPack.unverified).toContain(
      "Etsy hard maximum file size in MB for listing images",
    );
    expect(etsyPack.unverified).toContain("Etsy description character limit");
  });
});

describe("Plans config", () => {
  it("has free and premium plans with no decided price", () => {
    const slugs = plans.plans.map((plan) => plan.slug);
    expect(slugs).toEqual(["free", "premium"]);
    for (const plan of plans.plans) {
      expect(plan.price_amount_minor).toBeNull();
      expect(plan.price_currency).toBeNull();
    }
  });

  it("keeps the trial at 7 days, no card, one per account", () => {
    expect(plans.trial.duration_days).toBe(7);
    expect(plans.trial.requires_card).toBe(false);
    expect(plans.trial.one_per_account).toBe(true);
  });

  it("gives one complete free pack", () => {
    const free = plans.plans.find((plan) => plan.slug === "free");
    expect(free?.entitlements.max_listing_packs).toBe(1);
  });
});

describe("Niche packs config", () => {
  it("has exactly the 3 version 1 packs", () => {
    expect(nichePacks.packs).toHaveLength(3);
    expect(nichePacks.packs.map((pack) => pack.slug)).toEqual([
      "wedding-and-events",
      "personal-finance",
      "small-business-planners",
    ]);
  });

  it("marks every pack as needing real product testing before AI use", () => {
    for (const pack of nichePacks.packs) {
      expect(pack.last_verified_date).toBeTruthy();
      expect(pack.needs_real_product_testing).toBe(true);
      expect(pack.ai_generation_ready).toBe(false);
      expect(pack.source_notes).toBeTruthy();
    }
  });
});

describe("No em dash or en dash in config copy", () => {
  it("finds no em dash or en dash in any config file", () => {
    // Written as escapes so this test file itself holds no dash character.
    const emDash = "\u2014";
    const enDash = "\u2013";
    for (const config of [etsyPack, nichePacks, plans, siteCopy]) {
      for (const text of collectStrings(config)) {
        expect(text).not.toContain(emDash);
        expect(text).not.toContain(enDash);
      }
    }
  });
});
