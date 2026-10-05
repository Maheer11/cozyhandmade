import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { config as loadEnv } from "dotenv";
import path from "path";

/**
 * Resets the E2E test project to a known state so the checkout spec is
 * repeatable. Without this the run is single-use: each pass consumes a unit of
 * stock and leaves order/transaction rows behind, so the spec would go green a
 * few times and then start failing as out-of-stock.
 *
 * Called from beforeEach rather than afterEach on purpose:
 *   - a crashed or interrupted run can't skip it, so the next run still starts
 *     clean (an afterEach that never executes leaves the DB dirty forever);
 *   - the rows a failing run produced survive for inspection instead of being
 *     deleted by the very teardown you want to read.
 */

const { parsed } = loadEnv({ path: path.resolve(__dirname, "../../../.env.test") });

/** Name and starting stock of the row the spec buys from. */
export const SEED_PRODUCT_NAME = "E2E Test Tote";
export const SEED_PRODUCT_STOCK = 5;

/**
 * Tables truncated between runs, ordered children-first. `orders` is last
 * because order_items cascades from it — but transactions and email_deliveries
 * are only SET NULL, so they must be cleared explicitly or they'd accumulate
 * as orphans with a null order_id.
 */
const TABLES = [
  "transactions",
  "email_deliveries",
  "refunds",
  "pending_stripe_orders",
  "stripe_webhook_events",
  "orders",
] as const;

/**
 * Service-role client for the test project. The key bypasses RLS entirely, so
 * this re-asserts the project identity rather than trusting that
 * playwright.config.ts already did — this module is importable on its own, and
 * pointing it at production would wipe real orders.
 */
function testDb() {
  const url = parsed?.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = parsed?.SUPABASE_SERVICE_ROLE_KEY;
  const expectedRef = parsed?.E2E_SUPABASE_TEST_REF;

  if (!url || !serviceKey || !expectedRef) {
    throw new Error(
      ".env.test must define NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and E2E_SUPABASE_TEST_REF before E2E can reset test data."
    );
  }

  const actualRef = new URL(url).hostname.split(".")[0];
  if (actualRef !== expectedRef) {
    throw new Error(
      `Refusing to touch data: NEXT_PUBLIC_SUPABASE_URL points at "${actualRef}" but E2E_SUPABASE_TEST_REF is "${expectedRef}".`
    );
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * Retries a query that failed before reaching the database. Some networks
 * intermittently take longer than undici's 10s connect timeout to reach
 * Supabase, which surfaces as `TypeError: fetch failed` and failed whole runs.
 * Only that transport error is retried, since every query here is idempotent;
 * a real PostgREST error (bad column, RLS, missing table) returns immediately.
 */
async function withNetworkRetry<T extends { error: { message: string } | null }>(
  query: () => PromiseLike<T>,
  attempts = 3
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const result = await query();
    if (!result.error?.message.includes("fetch failed") || attempt >= attempts) return result;
  }
}

/** Current stock of the seeded product, for asserting the webhook decremented it. */
export async function seedProductStock(): Promise<number> {
  const db = testDb();
  const { data, error } = await withNetworkRetry(() =>
    db.from("products").select("stock_quantity").eq("name", SEED_PRODUCT_NAME).single()
  );
  if (error) throw new Error(`Failed reading ${SEED_PRODUCT_NAME} stock: ${error.message}`);
  return data.stock_quantity as number;
}

export async function resetTestData(): Promise<void> {
  const db = testDb();

  // Every one of these tables has created_at, so this matches all rows.
  for (const table of TABLES) {
    const { error } = await withNetworkRetry(() =>
      db.from(table).delete().gte("created_at", "1970-01-01")
    );
    if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);
  }

  const { data, error } = await withNetworkRetry(() =>
    db
      .from("products")
      .update({ stock_quantity: SEED_PRODUCT_STOCK })
      .eq("name", SEED_PRODUCT_NAME)
      .select("id")
  );
  if (error) throw new Error(`Failed restoring ${SEED_PRODUCT_NAME} stock: ${error.message}`);
  if (!data?.length) {
    throw new Error(
      `No product named "${SEED_PRODUCT_NAME}" in the test project — seed the catalogue before running E2E.`
    );
  }
}

/**
 * The test customer the spec signs in as. Checkout requires an account, and
 * orders.user_id references profiles, so this must be a real user in the test
 * project: TEST_CHECKOUT_USER_ID + TEST_CHECKOUT_PASSWORD in .env.test. The
 * email is looked up from the id so it can't drift out of sync with it.
 */
export async function testCustomer(): Promise<{ email: string; password: string }> {
  const userId = parsed?.TEST_CHECKOUT_USER_ID;
  const password = parsed?.TEST_CHECKOUT_PASSWORD;
  if (!userId || !password) {
    throw new Error(".env.test must define TEST_CHECKOUT_USER_ID and TEST_CHECKOUT_PASSWORD so E2E can sign in.");
  }
  const { data, error } = await testDb().auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    throw new Error(`TEST_CHECKOUT_USER_ID does not match a user with an email in the test project: ${error?.message ?? "no email"}`);
  }
  return { email: data.user.email, password };
}

export interface PendingOrderRow {
  payment_intent_id: string;
  total_amount: number;
  shipping_amount: number | null;
  resolved_at: string | null;
}

/** Every staged payment since the last reset (resetTestData clears the table). */
export async function pendingOrders(): Promise<PendingOrderRow[]> {
  const { data, error } = await withNetworkRetry(() =>
    testDb().from("pending_stripe_orders").select("payment_intent_id, total_amount, shipping_amount, resolved_at")
  );
  if (error) throw new Error(`Failed reading pending_stripe_orders: ${error.message}`);
  return (data ?? []) as PendingOrderRow[];
}

/** What Stripe itself says it charged for an intent — read with the TEST key only. */
export async function stripeCharge(paymentIntentId: string): Promise<{ amountReceived: number; currency: string; status: string }> {
  const key = parsed?.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY in .env.test must be a sk_test_ key.");
  const intent = await new Stripe(key).paymentIntents.retrieve(paymentIntentId);
  return { amountReceived: intent.amount_received, currency: intent.currency, status: intent.status };
}
