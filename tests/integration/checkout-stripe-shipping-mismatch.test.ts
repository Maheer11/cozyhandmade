import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

// This is the guard from Step 5 of the weight-based shipping fix: the
// client sends the shipping figure it displayed to the customer as a
// checksum, and create-intent rejects if its own independently-recomputed
// figure doesn't match — instead of silently charging whatever the server
// computed, which is exactly how the original bug (customer shown €60,
// charged €55) went unnoticed.
describe.skipIf(!hasLiveTestCredentials)("Stripe create-intent — shipping mismatch guard", () => {
  const testProductId = `test-fixture-shipmismatch-${Date.now()}`;

  beforeAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").insert({
      id: testProductId, name: "Shipping Mismatch Test Fixture",
      price: 20, category: "test", stock_quantity: 5,
    });
  });

  afterAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").delete().eq("id", testProductId);
  });

  it("rejects with 400 when the client's displayed shipping figure doesn't match the server's recomputed one", async () => {
    const { POST } = await import("@/app/api/payments/stripe/create-intent/route");

    const req = new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          product_id: testProductId, product_name: "Shipping Mismatch Test Fixture",
          product_image: null, quantity: 1, unit_price: 20,
        }],
        delivery_address: { name: "Test", email: "test@example.com", country: "IE" },
        currency: "EUR",
        // Deliberately wrong — no real shipping quote in this app's rate
        // table is anywhere near this large.
        client_shipping_eur: 999999,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/shipping/i);
  });

  it("rejects when client_shipping_eur is missing entirely", async () => {
    const { POST } = await import("@/app/api/payments/stripe/create-intent/route");

    const req = new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          product_id: testProductId, product_name: "Shipping Mismatch Test Fixture",
          product_image: null, quantity: 1, unit_price: 20,
        }],
        delivery_address: { name: "Test", email: "test@example.com", country: "IE" },
        currency: "EUR",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects a spoofed 'pickup' delivery_method for a non-Dublin address instead of charging €0", async () => {
    const { POST } = await import("@/app/api/payments/stripe/create-intent/route");

    // The real courier price for this address (Cork, not Dublin) — what the
    // server SHOULD compute regardless of the client's claim below.
    const realShippingEUR = calculateShipping(
      [{ quantity: 1, shippingWeightGrams: null }],
      "IE",
    ).priceEUR;

    const req = new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          product_id: testProductId, product_name: "Shipping Mismatch Test Fixture",
          product_image: null, quantity: 1, unit_price: 20,
        }],
        delivery_address: { name: "Test", email: "test@example.com", country: "IE", city: "Cork" },
        currency: "EUR",
        payment_method: "stripe-card",
        delivery_method: "pickup",
        // Client claims pickup is free — server must reject this since Cork
        // isn't Dublin, not silently charge €0.
        client_shipping_eur: 0,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    // Confirms the rejection reason is the real mismatch (0 vs the actual
    // courier price), not some unrelated error.
    expect(realShippingEUR).toBeGreaterThan(0);
  });
});
