import { describe, expect, it } from "vitest";
import { addressFromForwardedFor } from "../apps/web/src/lib/caller-address";
import { runtimeDatabaseUrl } from "../apps/web/src/lib/db";

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


describe("runtime database URL", () => {
  it("adds pgbouncer=true for a Neon pooled host only", () => {
    expect(runtimeDatabaseUrl("postgresql://u:p@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/db?sslmode=require")).toBe(
      "postgresql://u:p@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/db?sslmode=require&pgbouncer=true",
    );
    expect(runtimeDatabaseUrl("postgresql://u:p@ep-x-pooler.neon.tech/db?pgbouncer=false")).toBe("postgresql://u:p@ep-x-pooler.neon.tech/db?pgbouncer=false");
    expect(runtimeDatabaseUrl("postgresql://lpg:secret@db:5432/lpg?schema=public")).toBe("postgresql://lpg:secret@db:5432/lpg?schema=public");
    expect(runtimeDatabaseUrl("not a url")).toBe("not a url");
  });
});
