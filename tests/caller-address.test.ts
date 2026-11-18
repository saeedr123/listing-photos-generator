import { describe, expect, it } from "vitest";
import { addressFromForwardedFor } from "../apps/web/src/lib/caller-address";

describe("caller address behind a proxy", () => {
  it("uses the address the nearest proxy appended, not one the visitor wrote", () => {
    expect(addressFromForwardedFor("6.6.6.6, 203.0.113.9", 1)).toBe("203.0.113.9");
  });
  it("a single address is the visitor", () => {
    expect(addressFromForwardedFor("203.0.113.9", 1)).toBe("203.0.113.9");
  });
  it("two trusted proxies: two places from the right", () => {
    expect(addressFromForwardedFor("6.6.6.6, 203.0.113.9, 10.0.0.2", 2)).toBe("203.0.113.9");
  });
  it("no header is unknown", () => {
    expect(addressFromForwardedFor(null, 1)).toBe("unknown");
    expect(addressFromForwardedFor("", 1)).toBe("unknown");
  });
  it("more hops than addresses falls back to the leftmost", () => {
    expect(addressFromForwardedFor("203.0.113.9", 3)).toBe("203.0.113.9");
  });
});
