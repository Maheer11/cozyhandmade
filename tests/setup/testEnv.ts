import { config } from "dotenv";
import path from "path";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to load test env in a production environment.");
}

config({ path: path.resolve(process.cwd(), ".env.test") });

for (const key of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] as const) {
  const value = process.env[key];
  if (value && !value.includes("_test_")) {
    throw new Error(`${key} does not look like a Stripe TEST-mode key — refusing to run tests with it.`);
  }
}

// Same guard as playwright.config.ts: integration tests insert products,
// orders and pending payments, so a Supabase URL that isn't the project
// E2E_SUPABASE_TEST_REF names (e.g. production) stops the whole run.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const expectedRef = process.env.E2E_SUPABASE_TEST_REF;
  const actualRef = new URL(supabaseUrl).hostname.split(".")[0];
  if (!expectedRef || actualRef !== expectedRef) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL points at project "${actualRef}" but E2E_SUPABASE_TEST_REF is ` +
        `"${expectedRef ?? "(not set)"}". Refusing to run tests against an unexpected database.`
    );
  }
}

// True once real test-mode Stripe + a real test Supabase project are wired
// up. Integration tests that need live network calls skip (not fail) when
// this is false, since those credentials are the test author's to provide.
export const hasLiveTestCredentials = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_WEBHOOK_SECRET &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL
);
