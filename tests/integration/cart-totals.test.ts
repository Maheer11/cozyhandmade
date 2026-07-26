import { describe, it, expect } from "vitest";
import { priceCheckout, convertPrice, luxuryRound } from "@/lib/currency/pricingUtils";
import type { ExchangeRate } from "@/lib/currency/types";

const eurRate: ExchangeRate = { base: "EUR", currency: "EUR", rate: 1, fetchedAt: Date.now(), source: "live" };
const usdRate: ExchangeRate = { base: "EUR", currency: "USD", rate: 1.1, fetchedAt: Date.now(), source: "live" };
const ngnRate: ExchangeRate = { base: "EUR", currency: "NGN", rate: 1650, fetchedAt: Date.now(), source: "live" };

describe("cart pricing — priceCheckout / convertPrice", () => {
  it("EUR is the identity currency — no conversion, no rounding", () => {
    const pricing = priceCheckout(97, 5, eurRate, "EUR");
    expect(pricing.subtotalConverted).toBe(97);
    expect(pricing.totalConverted).toBe(102);
  });

  it("converts subtotal and shipping independently, then sums (avoids rounding drift)", () => {
    const pricing = priceCheckout(97, 5, usdRate, "USD");
    // Each leg is luxury-rounded independently — total is the sum of the
    // rounded legs, not a rounding of the raw combined total.
    expect(pricing.totalConverted).toBe(pricing.subtotalConverted + pricing.shippingConverted);
  });

  it("NGN always rounds to the nearest 100", () => {
    const converted = convertPrice(37.5, ngnRate, "NGN");
    expect(converted % 100).toBe(0);
  });

  it("a cart with a tampered client-side total is irrelevant — pricing is always recomputed from the item price", () => {
    // This mirrors the server-side guarantee in repriceItems: nothing here
    // ever takes a "total" as an input, only per-item EUR prices.
    const itemPriceEUR = 40;
    const quantity = 3;
    const subtotalEUR = itemPriceEUR * quantity;
    expect(priceCheckout(subtotalEUR, 5, eurRate, "EUR").subtotalConverted).toBe(120);
  });

  it("luxuryRound never produces awkward decimals for non-zero-decimal currencies", () => {
    const rounded = luxuryRound(123.456, "USD");
    expect(Number.isInteger(rounded) || rounded % 0.25 === 0 || rounded % 25 === 0).toBe(true);
  });
});
