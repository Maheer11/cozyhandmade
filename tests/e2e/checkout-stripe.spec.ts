import { test, expect, type Page, type FrameLocator } from "@playwright/test";
import {
  resetTestData,
  seedProductStock,
  SEED_PRODUCT_STOCK,
  testCustomer,
  pendingOrders,
  stripeCharge,
} from "./fixtures/testData";

// Restores stock and clears order rows so the spec is repeatable — see
// fixtures/testData.ts for why this runs before rather than after.
test.beforeEach(async () => {
  await resetTestData();
});

/**
 * Resolves the PaymentElement iframe that actually holds the card inputs.
 * Several frames share the title "Secure payment input frame", and they mount
 * asynchronously, so poll until one of them exposes the card-number field.
 */
async function findCardFrame(page: Page, timeoutMs = 45_000): Promise<FrameLocator> {
  const deadline = Date.now() + timeoutMs;
  const frames = page.locator('iframe[title="Secure payment input frame"]');
  while (Date.now() < deadline) {
    for (let i = 0; i < (await frames.count()); i++) {
      const candidate = frames.nth(i).contentFrame();
      if (await candidate.getByLabel("Card number").count()) return candidate;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    'No "Secure payment input frame" exposed a "Card number" field within ' +
      `${timeoutMs}ms — Stripe's PaymentElement DOM has likely drifted again.`
  );
}

/**
 * True end-to-end proof that the cart is powered by a real Stripe
 * integration: adds a real product to the cart, pays with Stripe's official
 * test card inside the real PaymentElement iframe, and waits for the app's own
 * polling to confirm a real order was created (never a client-side assumption).
 *
 * Stripe's Elements DOM is not a public API and has drifted before, so if this
 * fails at the card fields, re-inspect the frames rather than assuming the
 * integration broke — findCardFrame above throws with that hint.
 *
 * Requires (see STRIPE_SETUP.md):
 *   - .env.test filled in. playwright.config.ts starts the dev server itself
 *     with those values taking precedence over .env.local, and refuses to run
 *     if the Stripe keys aren't test-mode or the Supabase URL doesn't match
 *     E2E_SUPABASE_TEST_REF. (Set PLAYWRIGHT_BASE_URL to drive a server you
 *     started yourself instead — then the test credentials are on you.)
 *   - `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`
 *     running alongside it, with its signing secret in .env.test as
 *     STRIPE_WEBHOOK_SECRET, so the webhook that actually creates the order
 *     is reachable.
 *   - The seed product from fixtures/testData.ts present in the test project's
 *     catalogue; beforeEach restores its stock and clears prior order rows.
 */
test("cart -> checkout -> Stripe test card -> real confirmed order", async ({ page }) => {
  await page.goto("/products");

  // Open the first available product and add it to the cart.
  await page.locator("a[href^='/products/']").first().click();
  await page.getByRole("button", { name: /add to cart/i }).click();

  // The storefront is already EUR for a fresh visitor: detectRegion's cascade
  // is profile -> this visitor's own past explicit pick -> a hard EUR default,
  // with no IP layer, and NGN isn't even offered in the picker (Stripe can't
  // charge it). So there's nothing to switch — but assert it rather than
  // assume, so this fails loudly if the default ever moves off a
  // Stripe-chargeable currency instead of silently testing the wrong path.
  await expect(page.getByRole("banner").getByLabel("Change currency")).toContainText("EUR");

  // Signing in is optional: a guest sees the shipping form straight away,
  // with a "Sign in" link above it. This test signs in through that link,
  // and the login page sends them straight back to /checkout via ?next=.
  // The cart lives in localStorage, so it survives the round trip.
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: /shipping information/i })).toBeVisible();
  // The prompt's own link (the navbar has a generic "Sign In" too).
  await page.locator("a[href='/auth/login?next=/checkout']").click();
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
  const customer = await testCustomer();
  await page.locator("#email").fill(customer.email);
  await page.locator("#password").fill(customer.password);
  await page.locator("button[type='submit']").click();
  // Wait for the real checkout path. (The login URL itself ends in
  // "%2Fcheckout", so a plain regex on the URL passes too early.) A rejected
  // password shows "Invalid login credentials" — fail on that immediately.
  const loginError = page.getByText(/invalid login credentials|email not confirmed/i);
  const signIn = await Promise.race([
    page.waitForURL((url) => url.pathname === "/checkout", { timeout: 30_000 }).then(() => "signed-in", () => "timeout"),
    loginError.waitFor({ timeout: 30_000 }).then(() => "rejected", () => "timeout"),
  ]);
  if (signIn === "rejected") {
    throw new Error(`Sign-in failed: "${await loginError.textContent()}". Check TEST_CHECKOUT_PASSWORD matches TEST_CHECKOUT_USER_ID in the test project.`);
  }
  if (signIn !== "signed-in") throw new Error("Sign-in did not reach /checkout within 30s.");

  // Shipping step — an Irish address outside Dublin, so courier shipping
  // applies (Ireland is the default country; no dropdown needed).
  await page.locator("#fn").fill("Test");
  await page.locator("#ln").fill("Buyer");
  await page.locator("#em").fill(customer.email);
  await page.locator("#ph").fill("+353 87 000 0000");
  await page.locator("#addr").fill("1 Test Street");
  await page.locator("#city").fill("Cork");
  await page.locator("#pc").fill("T12 X1Y2");
  await expect(page.getByText(/shipping within ireland/i)).toBeVisible();
  await page.getByRole("button", { name: /continue to payment/i }).click();

  // Payment step. There is no payment-method tab to choose: card via Stripe is
  // the only method now that the Nigerian bank-transfer mode is gone, so
  // PaymentElement mounts as soon as the step renders.

  // PaymentElement mounts SEVERAL cross-origin iframes that all share the
  // accessible title "Secure payment input frame" — currently a hidden
  // accessory-target frame plus the one holding the real card fields. Which
  // index is which is a Stripe internal, so rather than hardcode a position
  // or an internal src name, find the frame by what it contains and let
  // Playwright retry while PaymentElement finishes mounting.
  // Addressed by aria-label, not placeholder: the card-number field's
  // placeholder is the sample number "1234 1234 1234 1234", and the CVC
  // field's is "CVC" while its accessible name is "Security code".
  const stripeFrame = await findCardFrame(page);
  await stripeFrame.getByLabel("Card number").fill("4242424242424242");
  await stripeFrame.getByLabel("Expiration date").fill("12/34");
  await stripeFrame.getByLabel("Security code").fill("123");

  // Accept the terms from the keyboard. This is deliberate: the control used to
  // be a <span onClick> with no real input, so it was unreachable this way, and
  // driving it by keyboard keeps that regression caught.
  const termsCheckbox = page.getByRole("checkbox");
  await termsCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(termsCheckbox).toBeChecked();

  const payButton = page.getByRole("button", { name: /pay .* with stripe/i });
  await expect(payButton).toBeEnabled();

  // Accepting must NOT pop the Terms modal. <button> is a labelable element, so
  // when the Terms button was the label's only labelable descendant the label
  // forwarded every click to it and the modal covered the pay button. A real
  // checkbox now sits first inside the label, which takes that forwarding.
  await expect(page.getByRole("dialog", { name: /terms and conditions/i })).toHaveCount(0);

  await payButton.click();

  // The confirmation screen only appears once /api/payments/stripe/status
  // reports the webhook has actually created the order — this is the
  // structural proof there's no fake/client-only confirmation.
  await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/is being lovingly prepared/i)).toBeVisible();

  // Stock is decremented by the webhook, not the browser, so this is a second
  // server-side proof that the purchase was real rather than a UI illusion.
  expect(await seedProductStock()).toBe(SEED_PRODUCT_STOCK - 1);

  // The rule the checkout fix exists for: exactly one PaymentIntent for this
  // paid order, resolved by the webhook, and Stripe charged exactly the
  // staged total — shipping included.
  const rows = await pendingOrders();
  expect(rows).toHaveLength(1);
  expect(rows[0].resolved_at).toBeTruthy();
  expect(Number(rows[0].shipping_amount)).toBeGreaterThan(0);
  const charge = await stripeCharge(rows[0].payment_intent_id);
  expect(charge.status).toBe("succeeded");
  expect(charge.currency).toBe("eur");
  expect(charge.amountReceived).toBe(Math.round(Number(rows[0].total_amount) * 100));
});
