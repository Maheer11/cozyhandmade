import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateShipping,
  resolveShippingZone,
  lookupBandPrice,
  isDublinPickupEligible,
  DEFAULT_ITEM_WEIGHT_GRAMS,
  type WeightBand,
} from "@/lib/checkout/shipping";

describe("resolveShippingZone", () => {
  it("resolves each documented zone from its ISO alpha-2 code", () => {
    expect(resolveShippingZone("IE")).toBe("domestic");
    expect(resolveShippingZone("GB")).toBe("uk");
    expect(resolveShippingZone("FR")).toBe("eu");
    expect(resolveShippingZone("DE")).toBe("eu");
    expect(resolveShippingZone("US")).toBe("north_america");
    expect(resolveShippingZone("CA")).toBe("north_america");
    expect(resolveShippingZone("NG")).toBe("nigeria");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveShippingZone(" ie ")).toBe("domestic");
    expect(resolveShippingZone("gb")).toBe("uk");
  });

  it("falls back to rest_of_world for an unrecognised code", () => {
    expect(resolveShippingZone("ZZ")).toBe("rest_of_world");
  });

  it("falls back to rest_of_world for the checkout form's non-ISO 'Other' value", () => {
    expect(resolveShippingZone("Other")).toBe("rest_of_world");
  });

  it("falls back to rest_of_world for null/undefined/empty country — never a cheaper zone on ambiguity", () => {
    expect(resolveShippingZone(null)).toBe("rest_of_world");
    expect(resolveShippingZone(undefined)).toBe("rest_of_world");
    expect(resolveShippingZone("")).toBe("rest_of_world");
  });
});

describe("lookupBandPrice — band boundaries and parcel-splitting above the largest band", () => {
  const bands: WeightBand[] = [
    { maxGrams: 500, priceEUR: 5 },
    { maxGrams: 1000, priceEUR: 8 },
  ];

  it("picks the band exactly at its maxGrams boundary (inclusive)", () => {
    expect(lookupBandPrice(bands, 500)).toBe(5);
    expect(lookupBandPrice(bands, 1000)).toBe(8);
  });

  it("one gram over a boundary rolls into the next band, not the same one", () => {
    expect(lookupBandPrice(bands, 501)).toBe(8); // over 500g -> next band (1000g), not 5
  });

  it("one gram over the LAST band's boundary is priced as two parcels: one full + one for the remainder", () => {
    // 1001g = one 1000g parcel (8) + one 1g parcel (rounds up to the 500g band, 5)
    expect(lookupBandPrice(bands, 1001)).toBe(8 + 5);
  });

  it("an exact multiple of the largest band is priced as that many full parcels, no remainder", () => {
    expect(lookupBandPrice(bands, 2000)).toBe(8 * 2); // exactly 2x the 1000g band
  });

  it("splits a large order into full parcels plus a real remainder band, not an invented per-kg rate", () => {
    // 2500g = two full 1000g parcels (8 each) + one 500g parcel (5)
    expect(lookupBandPrice(bands, 2500)).toBe(8 + 8 + 5);
  });
});

describe("calculateShipping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sums weight × quantity across items in an order", () => {
    const quote = calculateShipping(
      [
        { quantity: 3, shippingWeightGrams: 800 },
        { quantity: 2, shippingWeightGrams: 100 },
      ],
      "IE",
    );
    expect(quote.totalWeightGrams).toBe(3 * 800 + 2 * 100);
  });

  it("falls back to DEFAULT_ITEM_WEIGHT_GRAMS for a null weight and logs a warning naming the product", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const quote = calculateShipping(
      [{ quantity: 1, shippingWeightGrams: null, productName: "Mystery Blanket" }],
      "IE",
    );
    expect(quote.totalWeightGrams).toBe(DEFAULT_ITEM_WEIGHT_GRAMS);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Mystery Blanket");
  });

  it("falls back to DEFAULT_ITEM_WEIGHT_GRAMS for an undefined weight too", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const quote = calculateShipping([{ quantity: 1, shippingWeightGrams: undefined }], "IE");
    expect(quote.totalWeightGrams).toBe(DEFAULT_ITEM_WEIGHT_GRAMS);
  });

  it("does not warn when every item has a known weight", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    calculateShipping([{ quantity: 1, shippingWeightGrams: 500 }], "IE");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("resolves the correct zone/customs/estimatedDays for each documented zone", () => {
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "IE")).toMatchObject({
      zone: "domestic", customsApplies: false, estimatedDays: "within 7 business days",
    });
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "GB")).toMatchObject({
      zone: "uk", customsApplies: true, estimatedDays: "7-14 business days",
    });
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "FR")).toMatchObject({
      zone: "eu", customsApplies: false, estimatedDays: "7-14 business days",
    });
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "US")).toMatchObject({
      zone: "north_america", customsApplies: true, estimatedDays: "7-14 business days",
    });
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "NG")).toMatchObject({
      zone: "nigeria", customsApplies: true, estimatedDays: "7-14 business days",
    });
    expect(calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "ZZ")).toMatchObject({
      zone: "rest_of_world", customsApplies: true, estimatedDays: "7-14 business days",
    });
  });

  // Ireland is the ONLY zone allowed to quote a shorter estimate than the
  // international range — a regression that let any other zone drift down to
  // domestic's figure would under-promise transit the business can't control.
  it("quotes the domestic estimate for Ireland alone — every other zone gets the international range", () => {
    const intl = ["GB", "FR", "US", "CA", "NG", "AU", "ZZ"];
    for (const country of intl) {
      expect(
        calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], country).estimatedDays,
      ).toBe("7-14 business days");
    }
    expect(
      calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "IE").estimatedDays,
    ).toBe("within 7 business days");
  });

  it("rounds the returned price to the nearest cent", () => {
    const quote = calculateShipping([{ quantity: 1, shippingWeightGrams: 100 }], "IE");
    expect(quote.priceEUR).toBe(Math.round(quote.priceEUR * 100) / 100);
  });

  it("is a pure function — same inputs always produce the same output", () => {
    const items = [{ quantity: 2, shippingWeightGrams: 1200 }];
    const a = calculateShipping(items, "GB");
    const b = calculateShipping(items, "GB");
    expect(a).toEqual(b);
  });
});

describe("isDublinPickupEligible", () => {
  it("is eligible for an Irish address whose city mentions Dublin", () => {
    expect(isDublinPickupEligible({ country: "IE", city: "Dublin", postcode: "" })).toBe(true);
    expect(isDublinPickupEligible({ country: "IE", city: "Dublin 4", postcode: "" })).toBe(true);
    expect(isDublinPickupEligible({ country: "ie", city: "  dublin  ", postcode: "" })).toBe(true);
  });

  it("is eligible for an Irish address with a Dublin Eircode routing key, regardless of city text", () => {
    expect(isDublinPickupEligible({ country: "IE", city: "Somewhere", postcode: "D02 AF30" })).toBe(true);
    expect(isDublinPickupEligible({ country: "IE", city: "", postcode: "d6w1234" })).toBe(true);
  });

  it("is NOT eligible for a non-Dublin Irish address", () => {
    expect(isDublinPickupEligible({ country: "IE", city: "Cork", postcode: "T12 ABC1" })).toBe(false);
    expect(isDublinPickupEligible({ country: "IE", city: "Galway", postcode: "" })).toBe(false);
  });

  it("is NOT eligible outside Ireland, even if the city is literally named Dublin", () => {
    // Dublin, Ohio / Dublin, California, etc — country is the deciding factor.
    expect(isDublinPickupEligible({ country: "US", city: "Dublin", postcode: "43017" })).toBe(false);
  });

  it("is NOT eligible when country is missing or empty", () => {
    expect(isDublinPickupEligible({ country: "", city: "Dublin", postcode: "" })).toBe(false);
  });

  it("does not false-positive on an Eircode routing key that merely starts with D but isn't Dublin's", () => {
    // D means Donegal county town isn't a real Eircode prefix, but this
    // guards against a routing key like "D99" (not an actual Dublin key,
    // which only go up to D24 + D6W) being misread as Dublin.
    expect(isDublinPickupEligible({ country: "IE", city: "", postcode: "D99 X123" })).toBe(false);
  });
});
