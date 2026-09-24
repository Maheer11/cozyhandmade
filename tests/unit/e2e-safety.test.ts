import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  assertSafeBaseURL,
  assertTestSupabaseUrl,
  assertStripeTestKey,
  isAllowedHost,
  resolveDevServerEnv,
} from "../e2e/safety";

describe("assertSafeBaseURL", () => {
  it("allows localhost", () => {
    expect(() => assertSafeBaseURL("http://localhost:3000", false)).not.toThrow();
    expect(() => assertSafeBaseURL("http://127.0.0.1:3000", false)).not.toThrow();
  });
  it("blocks a remote URL unless opted in", () => {
    expect(() => assertSafeBaseURL("https://shop.example.com", false)).toThrow(/Refusing/);
    expect(() => assertSafeBaseURL("https://shop.example.com", true)).not.toThrow();
  });
});

describe("assertTestSupabaseUrl", () => {
  it("accepts only the named test project", () => {
    expect(() => assertTestSupabaseUrl("https://testref.supabase.co", "testref")).not.toThrow();
    expect(() => assertTestSupabaseUrl("https://prodref.supabase.co", "testref")).toThrow(/production/);
  });
  it("fails closed when the test ref or URL is missing", () => {
    expect(() => assertTestSupabaseUrl("https://prodref.supabase.co", undefined)).toThrow(/E2E_SUPABASE_TEST_REF/);
    expect(() => assertTestSupabaseUrl(undefined, "testref")).toThrow(/not set/);
  });
  it("allows a local Supabase stack", () => {
    expect(() => assertTestSupabaseUrl("http://127.0.0.1:54321", undefined)).not.toThrow();
  });
});

describe("assertStripeTestKey", () => {
  it("rejects live keys", () => {
    expect(() => assertStripeTestKey("K", "sk_live_abc")).toThrow();
    expect(() => assertStripeTestKey("K", "sk_test_abc")).not.toThrow();
  });
});

describe("resolveDevServerEnv", () => {
  it("follows Next's load order: .env.local beats .env", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-env-"));
    fs.writeFileSync(path.join(dir, ".env"), "X=from-env\n");
    fs.writeFileSync(path.join(dir, ".env.local"), "X=from-local\n");
    expect(resolveDevServerEnv("X", dir)).toBe("from-local");
    expect(resolveDevServerEnv("MISSING", dir)).toBeUndefined();
  });
});

describe("isAllowedHost", () => {
  const opts = { baseHost: "localhost", supabaseHost: "testref.supabase.co" };
  it("allows app, test Supabase and Stripe", () => {
    expect(isAllowedHost("localhost", opts)).toBe(true);
    expect(isAllowedHost("testref.supabase.co", opts)).toBe(true);
    expect(isAllowedHost("js.stripe.com", opts)).toBe(true);
  });
  it("blocks everything else, including look-alikes", () => {
    expect(isAllowedHost("prodref.supabase.co", opts)).toBe(false);
    expect(isAllowedHost("evilstripe.com", opts)).toBe(false);
    expect(isAllowedHost("cozyhandmade.com", opts)).toBe(false);
  });
});
