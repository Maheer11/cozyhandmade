import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "path";

/**
 * E2E runs against the dedicated test Supabase project + TEST-mode Stripe
 * keys in .env.test — never .env.local, which points at production.
 *
 * How the override works: @next/env only assigns a variable from .env*
 * files when that key is NOT already present in the spawned process's
 * environment. So everything we pass through `webServer.env` below wins
 * over .env.local, while vars we don't pass (Cloudinary, ADMIN_EMAIL, ...)
 * still fall through from .env.local so the dev server boots normally.
 */
const testEnvPath = path.resolve(__dirname, ".env.test");
const { parsed: testEnv, error } = loadEnv({ path: testEnvPath });

if (error || !testEnv) {
  throw new Error(
    `Could not read ${testEnvPath}. Copy .env.test.example to .env.test and fill in TEST-MODE-ONLY credentials.`
  );
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const missing = required.filter((key) => !testEnv[key]);
if (missing.length) {
  throw new Error(`.env.test is missing required keys: ${missing.join(", ")}`);
}

// Guard 1: the Stripe keys must be test-mode. Mirrors tests/setup/testEnv.ts
// so the E2E path has the same protection the vitest path already had.
for (const key of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] as const) {
  if (!testEnv[key].includes("_test_")) {
    throw new Error(`${key} does not look like a Stripe TEST-mode key — refusing to run E2E with it.`);
  }
}

// Guard 2: the Supabase URL must be the project E2E_SUPABASE_TEST_REF names.
// This is what stops a stray .env.test edit from pointing the suite — which
// writes orders and takes payments — at the production project.
const expectedRef = testEnv.E2E_SUPABASE_TEST_REF;
if (!expectedRef) {
  throw new Error(
    "E2E_SUPABASE_TEST_REF is not set in .env.test. It must name the test Supabase project ref, " +
      "so E2E can prove it is not pointed at production."
  );
}
const actualRef = new URL(testEnv.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (actualRef !== expectedRef) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL points at project "${actualRef}" but E2E_SUPABASE_TEST_REF is ` +
      `"${expectedRef}". Refusing to run E2E against an unexpected database.`
  );
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // The checkout flow legitimately needs far more than the 60s default: a cold
  // Turbopack compile, Stripe.js loading and mounting PaymentElement, then up
  // to 45s waiting for the webhook to create the order. At 60s it passed with
  // almost no headroom and failed intermittently inside findCardFrame.
  timeout: 180_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Starts the dev server with .env.test taking precedence over .env.local.
  // Set PLAYWRIGHT_BASE_URL to skip this and drive a server you started
  // yourself — but then it's on you to give it the test credentials.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...Object.fromEntries(required.map((key) => [key, testEnv[key]])),
          // lib/email.ts treats an absent key as "not configured" and returns
          // { sent: false } instead of throwing, so E2E order webhooks don't
          // fire real Resend emails using the live key from .env.local.
          RESEND_API_KEY: "",
          RESEND_FROM_EMAIL: "",
        },
      },
});
