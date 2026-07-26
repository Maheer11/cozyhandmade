import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("lib/stripe/env — live-key guard", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripeSecretKey } = await import("@/lib/stripe/env");
    expect(() => getStripeSecretKey()).toThrow(/not set/);
  });

  it("throws on a LIVE secret key outside production — this is the guarantee that tests/dev can never touch the live account", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.STRIPE_SECRET_KEY = "sk_live_shouldNeverBeUsedHere";
    const { getStripeSecretKey } = await import("@/lib/stripe/env");
    expect(() => getStripeSecretKey()).toThrow(/Refusing to use a non-test-mode/);
  });

  it("accepts a TEST secret key outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    const { getStripeSecretKey } = await import("@/lib/stripe/env");
    expect(getStripeSecretKey()).toBe("sk_test_abc123");
  });

  it("throws on a LIVE publishable key outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_shouldNeverBeUsedHere";
    const { getStripePublishableKey } = await import("@/lib/stripe/env");
    expect(() => getStripePublishableKey()).toThrow(/Refusing to use a non-test-mode/);
  });

  it("allows a live secret key when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.STRIPE_SECRET_KEY = "sk_live_abc123";
    const { getStripeSecretKey } = await import("@/lib/stripe/env");
    expect(getStripeSecretKey()).toBe("sk_live_abc123");
  });
});
