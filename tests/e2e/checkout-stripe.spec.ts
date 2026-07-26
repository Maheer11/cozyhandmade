import { test, expect } from "@playwright/test";

/**
 * True end-to-end proof that the cart is powered by a real Stripe
 * integration: adds a real product to the cart, goes through checkout in a
 * non-NGN currency, pays with Stripe's official test card inside the real
 * PaymentElement iframe, and waits for the app's own polling to confirm a
 * real order was created (never a client-side assumption).
 *
 * STATUS: selectors updated to Stripe's current documented PaymentElement
 * DOM conventions, but this spec has NOT been run in headed mode against
 * real credentials — this sandbox has no real Stripe test API key for this
 * account and no display server. Do not treat this file's existence as
 * proof it passes. Before relying on it:
 *   1. Run it once with `npx playwright test --headed --debug` against a
 *      real dev server (see requirements below) and fix any selector drift
 *      — Stripe's Elements DOM can change between SDK versions.
 *   2. Once confirmed green, remove this STATUS note.
 *
 * Requires (see STRIPE_SETUP.md):
 *   - `npm run dev` running against TEST-mode Stripe keys and a real test
 *     Supabase project (not production).
 *   - `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`
 *     running alongside it, so the webhook that actually creates the order
 *     is reachable.
 *   - At least one purchasable product in that test project's catalogue.
 */
test("cart -> checkout -> Stripe test card -> real confirmed order", async ({ page }) => {
  await page.goto("/products");

  // Open the first available product and add it to the cart.
  await page.locator("a[href^='/products/']").first().click();
  await page.getByRole("button", { name: /add to cart/i }).click();

  // Force a non-NGN currency so checkout routes to the Stripe path.
  await page.getByRole("button", { name: "Change currency" }).click();
  await page.getByRole("button", { name: "EUR", exact: false }).click();

  await page.goto("/checkout");

  // Shipping step
  await page.locator("#fn").fill("Test");
  await page.locator("#ln").fill("Buyer");
  await page.locator("#em").fill(`e2e-${Date.now()}@example.com`);
  await page.locator("#ph").fill("+44 7700 000000");
  await page.locator("#addr").fill("1 Test Street");
  await page.locator("#city").fill("London");
  await page.locator("#pc").fill("SW1A 1AA");
  await page.getByRole("button", { name: /continue to payment/i }).click();

  // Payment step — Card / Stripe tab
  await page.getByRole("button", { name: /card \/ stripe/i }).click();

  // PaymentElement (unified, current-gen Stripe Elements component) mounts
  // a single cross-origin iframe. Its accessible title has been stable as
  // "Secure payment input frame" across recent Stripe.js versions; the
  // fields inside are addressed by placeholder text (also stable) rather
  // than internal `name`/`id` attributes, which Stripe does not document
  // as a public API and has changed before.
  const stripeFrame = page.frameLocator('iframe[title="Secure payment input frame"]');
  await stripeFrame.getByPlaceholder("Card number").fill("4242424242424242", { timeout: 30_000 });
  await stripeFrame.getByPlaceholder("MM / YY").fill("12/34");
  await stripeFrame.getByPlaceholder("CVC").fill("123");

  await page.getByLabel(/I have read and agree/i).click();
  await page.getByRole("button", { name: /pay .* with stripe/i }).click();

  // The confirmation screen only appears once /api/payments/stripe/status
  // reports the webhook has actually created the order — this is the
  // structural proof there's no fake/client-only confirmation.
  await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/is being lovingly prepared/i)).toBeVisible();
});
