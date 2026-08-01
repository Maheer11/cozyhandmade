import { describe, it, expect, afterEach } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";

// Regression guard for the second confirmation-flow bug: /api/payments/
// stripe/status previously had zero awareness of the refunds table, so a
// refunded (out-of-stock) payment intent looked identical to a genuinely
// still-processing one — pending_stripe_orders is kept (not deleted) on
// refund, so it fell into "pending" forever and the customer saw "taking
// too long" instead of the true, already-resolved outcome. These tests
// seed DB rows directly rather than running a full charge, since the
// behaviour under test is the status route's own branching logic, not the
// webhook/refund-issuing code (already covered elsewhere).
describe.skipIf(!hasLiveTestCredentials)("/api/payments/stripe/status — refund awareness", () => {
  const cleanupPaymentIntentIds: string[] = [];

  afterEach(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    for (const id of cleanupPaymentIntentIds.splice(0)) {
      await db.from("refunds").delete().eq("payment_intent_id", id);
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", id);
    }
  });

  it("returns a distinct 'refunded' result when a succeeded refunds row exists and no order does", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { GET: status } = await import("@/app/api/payments/stripe/status/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const paymentIntentId = `pi_test_refunded_${Date.now()}`;
    cleanupPaymentIntentIds.push(paymentIntentId);
    await db.from("refunds").insert({
      payment_intent_id: paymentIntentId,
      amount: 62, currency: "EUR", reason: "out_of_stock",
      product_name: "Status Test Fixture", status: "succeeded", stripe_refund_id: "re_fake_for_test",
    });

    const res = await status(new Request(`http://localhost/api/payments/stripe/status?payment_intent_id=${paymentIntentId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("refunded");
    expect(body.reason).toBe("out_of_stock");
    expect(body.product_name).toBe("Status Test Fixture");
    expect(body.amount).toBe(62);
    expect(body.currency).toBe("EUR");
    // Must never be reported as still pending/unknown alongside this.
    expect(body.status).not.toBe("pending");
  });

  it("still returns 'pending' for a genuinely in-flight payment with neither an order nor a refund yet", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { GET: status } = await import("@/app/api/payments/stripe/status/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const paymentIntentId = `pi_test_inflight_${Date.now()}`;
    cleanupPaymentIntentIds.push(paymentIntentId);
    await db.from("pending_stripe_orders").insert({
      payment_intent_id: paymentIntentId,
      user_id: null,
      items: [{ item_type: "product", ref_id: "does-not-matter", product_name: "x", product_image: null, quantity: 1, unit_price: 1 }],
      delivery_address: { name: "Test", email: "test@example.com" },
      total_amount: 1, currency: "EUR",
    });

    const res = await status(new Request(`http://localhost/api/payments/stripe/status?payment_intent_id=${paymentIntentId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
  });

  it("a refund attempt still in 'pending' status (not yet succeeded) does not short-circuit as refunded", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { GET: status } = await import("@/app/api/payments/stripe/status/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const paymentIntentId = `pi_test_refundpending_${Date.now()}`;
    cleanupPaymentIntentIds.push(paymentIntentId);
    // A refund attempt has been recorded (per the refund migration's
    // "upsert before calling Stripe" design) but hasn't resolved yet — the
    // customer's payment is genuinely still being sorted out, not
    // definitively refunded.
    await db.from("refunds").insert({
      payment_intent_id: paymentIntentId,
      amount: 20, currency: "EUR", reason: "out_of_stock",
      product_name: "Status Test Fixture", status: "pending",
    });
    await db.from("pending_stripe_orders").insert({
      payment_intent_id: paymentIntentId,
      user_id: null,
      items: [{ item_type: "product", ref_id: "does-not-matter", product_name: "x", product_image: null, quantity: 1, unit_price: 20 }],
      delivery_address: { name: "Test", email: "test@example.com" },
      total_amount: 20, currency: "EUR",
    });

    const res = await status(new Request(`http://localhost/api/payments/stripe/status?payment_intent_id=${paymentIntentId}`));
    const body = await res.json();
    expect(body.status).toBe("pending"); // not "refunded" yet
  });
});
