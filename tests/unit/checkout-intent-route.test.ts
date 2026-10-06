// Runs the real app/api/checkout/intent handler against an in-memory database
// and a fake Stripe that honours idempotency keys the way Stripe does. Each
// test ends by checking the invariant the whole design exists for: one
// PaymentIntent per checkout attempt, and its amount equals the pending
// row's total.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import { FakeSupabase } from "./helpers/fakeSupabase";

interface FakeIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret: string;
}

class FakeStripe {
  intents = new Map<string, FakeIntent>();
  private idempotency = new Map<string, { params: string; id: string }>();
  createCalls = 0;

  paymentIntents = {
    create: async (params: { amount: number; currency: string }, opts?: { idempotencyKey?: string }): Promise<FakeIntent> => {
      const key = opts?.idempotencyKey;
      const serialized = JSON.stringify(params);
      if (key && this.idempotency.has(key)) {
        const seen = this.idempotency.get(key)!;
        if (seen.params !== serialized) {
          throw new Stripe.errors.StripeIdempotencyError({ message: "Keys for idempotent requests can only be used with the same parameters", type: "idempotency_error" });
        }
        return { ...this.intents.get(seen.id)! };
      }
      this.createCalls++;
      const id = `pi_fake_${this.createCalls}`;
      const intent = { id, status: "requires_payment_method", amount: params.amount, currency: params.currency, client_secret: `${id}_secret_x` };
      this.intents.set(id, intent);
      if (key) this.idempotency.set(key, { params: serialized, id });
      return { ...intent };
    },
    retrieve: async (id: string): Promise<FakeIntent> => ({ ...this.intents.get(id)! }),
    update: async (id: string, params: { amount?: number }): Promise<FakeIntent> => {
      const intent = this.intents.get(id)!;
      if (params.amount !== undefined) intent.amount = params.amount;
      return { ...intent };
    },
  };
}

let db: FakeSupabase;
let fakeStripe: FakeStripe;
let currentUser: { id: string } | null;

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => fakeStripe }));

const { POST } = await import("@/app/api/checkout/intent/route");

const ATTEMPT = "6f1c2b8e-4d3a-4e5f-9a1b-2c3d4e5f6a7b";
const IRELAND = { firstName: "Aoife", email: "a@example.com", country: "IE", city: "Cork", postcode: "T12 X1Y2" };
const UK = { ...IRELAND, country: "GB", city: "London", postcode: "SW1A 1AA" };
const DUBLIN = { ...IRELAND, city: "Dublin 8", postcode: "D08 AB12" };

function pay(address: Record<string, string>, expectedTotalCents: number, opts: { attempt?: string; method?: "courier" | "pickup"; unitPrice?: number } = {}) {
  return POST(new Request("http://localhost/api/checkout/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attempt_id: opts.attempt ?? ATTEMPT,
      items: [{ product_id: "p1", product_name: "Bag", product_image: null, quantity: 1, unit_price: opts.unitPrice ?? 85, source: "product" }],
      delivery_address: address,
      delivery_method: opts.method ?? "courier",
      expected_total_cents: expectedTotalCents,
    }),
  }));
}

function pendingRows() {
  return db.table("pending_stripe_orders");
}

/** One intent per attempt, and every intent's amount equals its row's total. */
function expectOneIntentMatchingRow() {
  expect(fakeStripe.intents.size).toBe(1);
  expect(pendingRows()).toHaveLength(1);
  const row = pendingRows()[0];
  const intent = fakeStripe.intents.get(row.payment_intent_id as string)!;
  expect(intent.amount).toBe(Math.round(Number(row.total_amount) * 100));
  expect(intent.currency).toBe("eur");
  expect(row.currency).toBe("EUR");
}

describe("POST /api/checkout/intent", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    db = new FakeSupabase({ pending_stripe_orders: ["payment_intent_id", "checkout_attempt_id"] });
    db.table("products").push({ id: "p1", name: "Bag", price: 85, variant_price: null, shipping_weight_grams: 800 });
    fakeStripe = new FakeStripe();
    currentUser = { id: "user-1" };
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("guests can pay: one intent, staged with no user", async () => {
    currentUser = null;
    const res = await pay(IRELAND, 9200);
    expect(res.status).toBe(200);
    expectOneIntentMatchingRow();
    expect(pendingRows()[0]).toMatchObject({ total_amount: 92, user_id: null, checkout_attempt_id: ATTEMPT });
  });

  it("a guest's attempt id can't be continued from an account", async () => {
    currentUser = null;
    await pay(IRELAND, 9200);
    currentUser = { id: "user-1" };
    const res = await pay(IRELAND, 9200);
    expect(res.status).toBe(403);
    expect(fakeStripe.createCalls).toBe(1);
  });

  it("Pay creates one intent for items + Irish shipping, staged with the breakdown", async () => {
    const res = await pay(IRELAND, 9200);
    expect(res.status).toBe(200);
    expect((await res.json()).client_secret).toBe("pi_fake_1_secret_x");
    expectOneIntentMatchingRow();
    expect(pendingRows()[0]).toMatchObject({
      total_amount: 92, subtotal_amount: 85, shipping_amount: 7, user_id: "user-1", checkout_attempt_id: ATTEMPT,
      delivery_address: { country: "IE", delivery_method: "courier" },
    });
  });

  it("the price comes from the database, not the request body", async () => {
    const res = await pay(IRELAND, 9200, { unitPrice: 1 });
    expect(res.status).toBe(200);
    expect(fakeStripe.intents.get("pi_fake_1")!.amount).toBe(9200);
  });

  it("page showing a stale total: refused with the server's figure, nothing created", async () => {
    const res = await pay(IRELAND, 8500); // page thinks €85, server says €92
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "price_changed", quote: { total_cents: 9200, shipping_eur: 7 } });
    expect(fakeStripe.createCalls).toBe(0);
    expect(pendingRows()).toHaveLength(0);
  });

  it("country UK → IE between Pay presses: same intent, amount updated, row updated", async () => {
    expect((await pay(UK, 10500)).status).toBe(200);
    // (card declined — intent stays requires_payment_method)
    expect((await pay(IRELAND, 9200)).status).toBe(200);
    expectOneIntentMatchingRow();
    expect(fakeStripe.intents.get("pi_fake_1")!.amount).toBe(9200);
    expect(pendingRows()[0]).toMatchObject({ total_amount: 92, shipping_amount: 7, delivery_address: { country: "IE" } });
  });

  it("back and forth GB/IE/pickup several times: still one intent, last figure wins", async () => {
    await pay(UK, 10500);
    await pay(IRELAND, 9200);
    await pay(DUBLIN, 8500, { method: "pickup" });
    await pay(UK, 10500);
    await pay(IRELAND, 9200);
    expect(fakeStripe.createCalls).toBe(1);
    expectOneIntentMatchingRow();
    expect(pendingRows()[0].total_amount).toBe(92);
  });

  it("declined card then retry: the same intent and secret, nothing new", async () => {
    const first = await (await pay(IRELAND, 9200)).json();
    const retry = await (await pay(IRELAND, 9200)).json();
    expect(retry.client_secret).toBe(first.client_secret);
    expect(fakeStripe.createCalls).toBe(1);
    expectOneIntentMatchingRow();
  });

  it("double tap (two requests at once): one intent, both get the same secret", async () => {
    const [a, b] = await Promise.all([pay(IRELAND, 9200), pay(IRELAND, 9200)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect((await a.json()).client_secret).toBe((await b.json()).client_secret);
    expect(fakeStripe.createCalls).toBe(1);
    expectOneIntentMatchingRow();
  });

  it("Pay again after the attempt was already paid: refused, never charged twice", async () => {
    await pay(IRELAND, 9200);
    fakeStripe.intents.get("pi_fake_1")!.status = "succeeded";
    const res = await pay(IRELAND, 9200);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "already_paid", payment_intent_id: "pi_fake_1" });
    expect(fakeStripe.createCalls).toBe(1);
  });

  it("free pickup outside Dublin is refused (priced as courier)", async () => {
    const res = await pay(IRELAND, 8500, { method: "pickup" });
    expect(res.status).toBe(409);
    expect(fakeStripe.createCalls).toBe(0);
  });

  it("another customer's attempt id is refused", async () => {
    await pay(IRELAND, 9200);
    currentUser = { id: "user-2" };
    const res = await pay(IRELAND, 9200);
    expect(res.status).toBe(403);
    expect(fakeStripe.createCalls).toBe(1);
  });
});
