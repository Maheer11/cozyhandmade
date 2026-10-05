// Runs the real webhook route handler against an in-memory database (no
// Supabase, no network). Covers: the same event delivered twice creates one
// order; a charge that doesn't match the staged total creates no order and
// logs both amounts; a resolved row is never processed again.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import { FakeSupabase } from "./helpers/fakeSupabase";

const WEBHOOK_SECRET = "whsec_unit_test";
const stripe = new Stripe("sk_test_unit");
let db: FakeSupabase;

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => stripe }));
vi.mock("@/lib/checkout/updateSpendTier", () => ({ updateSpendTier: async () => {} }));
vi.mock("@/lib/checkout/emailDeliveries", () => ({
  claimEmailDelivery: async () => "duplicate",
  sendClaimedEmail: async () => {},
  deliverEmail: async () => {},
}));
vi.mock("@/lib/email", () => ({
  parseRecipients: () => [],
  sendOrderConfirmationEmail: async () => ({ ok: true }),
  sendRefundNotificationEmail: async () => ({ ok: true }),
  sendAdminNewOrderEmail: async () => ({ ok: true }),
}));

const { POST } = await import("@/app/api/payments/stripe/webhook/route");

function stagePending(paymentIntentId: string, totalEUR: number, shippingEUR: number) {
  db.table("pending_stripe_orders").push({
    payment_intent_id: paymentIntentId,
    user_id: "user-1",
    items: [{ item_type: "product", ref_id: "p1", product_name: "Bag", product_image: null, quantity: 1, unit_price: totalEUR - shippingEUR, shipping_weight_grams: 800 }],
    delivery_address: { country: "IE", city: "Cork", email: "a@example.com", delivery_method: "courier" },
    total_amount: totalEUR,
    subtotal_amount: totalEUR - shippingEUR,
    shipping_amount: shippingEUR,
    currency: "EUR",
    resolved_at: null,
  });
}

function succeededEvent(eventId: string, paymentIntentId: string, amountReceived: number, currency = "eur") {
  return {
    id: eventId,
    object: "event",
    type: "payment_intent.succeeded",
    livemode: false,
    data: { object: { id: paymentIntentId, object: "payment_intent", status: "succeeded", amount: amountReceived, amount_received: amountReceived, currency } },
  };
}

function deliver(event: object, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return POST(new Request("http://localhost/api/payments/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  }));
}

describe("Stripe webhook — order recording", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    db = new FakeSupabase({ stripe_webhook_events: ["event_id"], pending_stripe_orders: ["payment_intent_id"] });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("rejects a bad signature before touching the database", async () => {
    stagePending("pi_1", 92, 7);
    const res = await deliver(succeededEvent("evt_1", "pi_1", 9200), "whsec_wrong");
    expect(res.status).toBe(400);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("matching charge: one order with the shipping amount, and resolved_at is set", async () => {
    stagePending("pi_1", 92, 7);
    const res = await deliver(succeededEvent("evt_1", "pi_1", 9200));
    expect(res.status).toBe(200);
    expect(db.rpcCalls).toHaveLength(1);
    expect(db.rpcCalls[0].args).toMatchObject({ p_total_amount: 92, p_shipping_amount: 7, p_charged_amount: 92, p_stripe_reference: "pi_1" });
    expect(db.table("pending_stripe_orders")[0].resolved_at).toBeTruthy();
  });

  it("the same event delivered twice creates ONE order", async () => {
    stagePending("pi_1", 92, 7);
    const event = succeededEvent("evt_1", "pi_1", 9200);
    const first = await deliver(event);
    const second = await deliver(event);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ note: "duplicate event, already processed" });
    expect(db.rpcCalls).toHaveLength(1);
  });

  it("a different event for an already-resolved intent creates no second order", async () => {
    stagePending("pi_1", 92, 7);
    await deliver(succeededEvent("evt_1", "pi_1", 9200));
    const res = await deliver(succeededEvent("evt_2", "pi_1", 9200));
    expect(await res.json()).toMatchObject({ note: "already processed" });
    expect(db.rpcCalls).toHaveLength(1);
  });

  it("€85 received for a €92 order: NO order, both amounts logged, not retried", async () => {
    stagePending("pi_1", 92, 7);
    const res = await deliver(succeededEvent("evt_1", "pi_1", 8500));
    expect(res.status).toBe(200); // acknowledged so Stripe stops retrying
    expect(db.rpcCalls).toHaveLength(0);
    const logged = errorSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).toContain("expected 9200 EUR");
    expect(logged).toContain("received 8500 EUR");
    expect(db.table("pending_stripe_orders")[0].resolved_at).toBeNull();
    expect(db.table("stripe_webhook_events")[0].status).toBe("done");
  });

  it("right number, wrong currency: NO order", async () => {
    stagePending("pi_1", 92, 7);
    await deliver(succeededEvent("evt_1", "pi_1", 9200, "gbp"));
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("paid intent with no staged row: NO order, logged for refund", async () => {
    const res = await deliver(succeededEvent("evt_1", "pi_unknown", 8500));
    expect(res.status).toBe(200);
    expect(db.rpcCalls).toHaveLength(0);
    expect(errorSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n")).toContain("PAID WITH NO STAGED ORDER");
  });
});
