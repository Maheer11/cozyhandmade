import { describe, it, expect } from "vitest";
import {
  orderAmounts,
  toCents,
  decideIntentAction,
  checkChargeMatchesPending,
} from "@/lib/checkout/amounts";
import { priceVerifiedItems } from "@/lib/checkout/quote";
import type { VerifiedItem } from "@/lib/checkout/repriceItems";

const item = (grams: number, price = 85): VerifiedItem => ({
  item_type: "product",
  ref_id: "p1",
  product_name: "Test Bag",
  product_image: null,
  quantity: 1,
  unit_price: price,
  shipping_weight_grams: grams,
});

describe("orderAmounts", () => {
  it("adds subtotal and shipping in whole cents", () => {
    expect(orderAmounts(85, 7)).toEqual({ subtotalEUR: 85, shippingEUR: 7, totalEUR: 92, totalCents: 9200 });
  });

  it("never drifts: Math.round(totalEUR * 100) is always totalCents", () => {
    for (let sub = 0; sub < 300; sub += 0.37) {
      for (const ship of [0, 7, 13.5, 20, 35.99]) {
        const a = orderAmounts(sub, ship);
        expect(toCents(a.totalEUR)).toBe(a.totalCents);
        expect(a.totalCents).toBe(toCents(a.subtotalEUR) + toCents(a.shippingEUR));
      }
    }
  });
});

describe("priceVerifiedItems — shipping is priced from the address at Pay time", () => {
  it("Ireland courier: €85 + €7", () => {
    const q = priceVerifiedItems([item(800)], 85, { country: "IE", city: "Cork" }, "courier");
    expect(q.shippingEUR).toBe(7);
    expect(q.totalCents).toBe(9200);
    expect(q.deliveryMethod).toBe("courier");
  });

  it("UK courier: €85 + €20", () => {
    expect(priceVerifiedItems([item(800)], 85, { country: "GB" }, "courier").totalCents).toBe(10500);
  });

  it("changing country UK → IE changes the total (the 4 Oct case)", () => {
    const uk = priceVerifiedItems([item(800)], 85, { country: "GB" }, "courier");
    const ie = priceVerifiedItems([item(800)], 85, { country: "IE", city: "Galway" }, "courier");
    expect(uk.totalCents).not.toBe(ie.totalCents);
  });

  it("Dublin pickup is free and recorded as pickup", () => {
    const q = priceVerifiedItems([item(800)], 85, { country: "IE", city: "Dublin 8" }, "pickup");
    expect(q.shippingEUR).toBe(0);
    expect(q.deliveryMethod).toBe("pickup");
  });

  it("pickup requested outside Dublin is priced as courier, never free", () => {
    const q = priceVerifiedItems([item(800)], 85, { country: "IE", city: "Cork", postcode: "T12 X1Y2" }, "pickup");
    expect(q.shippingEUR).toBe(7);
    expect(q.deliveryMethod).toBe("courier");
  });

  it("missing country falls back to the most expensive zone, never €0", () => {
    expect(priceVerifiedItems([item(800)], 85, { country: "" }, "courier").shippingEUR).toBeGreaterThan(0);
  });
});

describe("decideIntentAction — one PaymentIntent per checkout attempt", () => {
  it("first Pay press creates", () => {
    expect(decideIntentAction(null, 9200).kind).toBe("create");
  });
  it("retry after a declined card reuses the same intent", () => {
    expect(decideIntentAction({ status: "requires_payment_method", amount: 9200 }, 9200).kind).toBe("reuse");
  });
  it("country changed after a decline updates the same intent's amount", () => {
    expect(decideIntentAction({ status: "requires_payment_method", amount: 10500 }, 9200).kind).toBe("update_amount");
  });
  it("an attempt that already went through is never charged again", () => {
    expect(decideIntentAction({ status: "succeeded", amount: 9200 }, 9200).kind).toBe("already_paid");
    expect(decideIntentAction({ status: "processing", amount: 9200 }, 9200).kind).toBe("already_paid");
  });
  it("a cancelled intent can't be reused — start a new attempt", () => {
    expect(decideIntentAction({ status: "canceled", amount: 9200 }, 9200).kind).toBe("restart");
  });
});

describe("checkChargeMatchesPending — the webhook's gate before any order", () => {
  it("accepts an exact EUR match", () => {
    expect(checkChargeMatchesPending({ amount_received: 9200, currency: "eur" }, { total_amount: 92, currency: "EUR" })).toEqual({ ok: true });
  });
  it("accepts a numeric total that arrives as a string", () => {
    expect(checkChargeMatchesPending({ amount_received: 9200, currency: "eur" }, { total_amount: "92.00", currency: "EUR" }).ok).toBe(true);
  });
  it("rejects €85 received against a €92 order (shipping missing) and reports both", () => {
    expect(checkChargeMatchesPending({ amount_received: 8500, currency: "eur" }, { total_amount: 92, currency: "EUR" })).toEqual({
      ok: false, expectedCents: 9200, receivedCents: 8500, expectedCurrency: "EUR", receivedCurrency: "EUR",
    });
  });
  it("rejects a currency mismatch even when the number matches", () => {
    expect(checkChargeMatchesPending({ amount_received: 9200, currency: "gbp" }, { total_amount: 92, currency: "EUR" }).ok).toBe(false);
  });
  it("rejects a one-cent difference — no tolerance", () => {
    expect(checkChargeMatchesPending({ amount_received: 9199, currency: "eur" }, { total_amount: 92, currency: "EUR" }).ok).toBe(false);
  });
});
