import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Assumes `npm run dev` (or a preview build) is already running against
  // TEST-mode Stripe keys — see STRIPE_SETUP.md. Not auto-started here since
  // it needs .env.local wired to a real test Supabase project + Stripe CLI
  // webhook forwarding running alongside it.
});
