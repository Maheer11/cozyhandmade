import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail, parseAdminEmails } from "@/lib/auth/isAdmin";

// This is an authorisation boundary — everything below the admin layout and
// every /api/admin route depends on it. The fail-closed cases matter more
// than the happy path.

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAIL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases", () => {
    expect(parseAdminEmails("A@x.test, B@Y.test ")).toEqual(["a@x.test", "b@y.test"]);
  });

  it("returns nothing for unset or blank input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails(" , , ")).toEqual([]);
  });

  it("de-duplicates, including across casing", () => {
    expect(parseAdminEmails("a@x.test,A@X.test")).toEqual(["a@x.test"]);
  });
});

describe("isAdminEmail", () => {
  it("grants access to every address on the list", () => {
    process.env.ADMIN_EMAILS = "her@example.test,him@example.test";
    expect(isAdminEmail("her@example.test")).toBe(true);
    expect(isAdminEmail("him@example.test")).toBe(true);
  });

  it("denies anyone not on the list", () => {
    process.env.ADMIN_EMAILS = "her@example.test,him@example.test";
    expect(isAdminEmail("stranger@example.test")).toBe(false);
  });

  it("matches regardless of casing, so a capitalised login still works", () => {
    process.env.ADMIN_EMAILS = "her@example.test";
    expect(isAdminEmail("Her@Example.test")).toBe(true);
    expect(isAdminEmail("  her@example.test  ")).toBe(true);
  });

  // The single most important case. Without the explicit empty-list guard,
  // an unset env var and an undefined email would compare equal and hand
  // full dashboard access to an unauthenticated visitor.
  it("denies everyone when no allowlist is configured at all", () => {
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("anyone@example.test")).toBe(false);
  });

  it("denies a blank or whitespace-only email even with a list configured", () => {
    process.env.ADMIN_EMAILS = "her@example.test";
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("denies everyone when the list is configured but empty", () => {
    process.env.ADMIN_EMAILS = "  ,  ";
    expect(isAdminEmail("her@example.test")).toBe(false);
  });

  // Backwards compatibility: existing deployments only set ADMIN_EMAIL.
  it("still honours the older single-valued ADMIN_EMAIL", () => {
    process.env.ADMIN_EMAIL = "solo@example.test";
    expect(isAdminEmail("solo@example.test")).toBe(true);
    expect(isAdminEmail("someone@example.test")).toBe(false);
  });

  it("prefers ADMIN_EMAILS when both are set", () => {
    process.env.ADMIN_EMAIL = "old@example.test";
    process.env.ADMIN_EMAILS = "new@example.test";
    expect(isAdminEmail("new@example.test")).toBe(true);
    expect(isAdminEmail("old@example.test")).toBe(false);
  });

  it("does not treat a substring or prefix as a match", () => {
    process.env.ADMIN_EMAILS = "her@example.test";
    expect(isAdminEmail("her@example.test.attacker.com")).toBe(false);
    expect(isAdminEmail("other-her@example.test")).toBe(false);
  });
});
