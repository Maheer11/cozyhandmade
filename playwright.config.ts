import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "path";
import { assertSafeBaseURL } from "./tests/e2e/safety";

// Test-only settings (E2E_SUPABASE_TEST_REF etc.) live in the gitignored
// .env.test — see .env.test.example.
loadEnv({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
assertSafeBaseURL(baseURL, process.env.E2E_ALLOW_REMOTE_BASE_URL === "1");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
    // Service workers bypass context.route, so they'd slip past the
    // network allowlist in tests/e2e/fixtures.ts.
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Assumes `npm run dev` (or a preview build) is already running against
  // TEST-mode Stripe keys — see STRIPE_SETUP.md. Not auto-started here since
  // it needs .env.local wired to a real test Supabase project + Stripe CLI
  // webhook forwarding running alongside it.
});
