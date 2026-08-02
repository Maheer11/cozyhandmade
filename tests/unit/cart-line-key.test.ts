import { describe, it, expect } from "vitest";
import { cartLineKey, capQuantity } from "@/components/CartContext";

// cartLineKey is what decides whether an add-to-cart merges into an existing
// line or opens a new one. Before it existed, the cart keyed on product id
// alone: adding a second TIER of the same item bumped the first tier's
// quantity and silently discarded the tier the customer actually chose —
// wrong item shipped, wrong total charged, badge still incremented.
describe("cartLineKey", () => {
  const vase = { id: "vase-1", source: "new_in" as const };

  it("distinguishes two variants of the same row — the bug this exists to prevent", () => {
    expect(cartLineKey({ ...vase, variant: "With Stand" }))
      .not.toBe(cartLineKey({ ...vase, variant: "Without Stand" }));
  });

  it("treats the same row + same variant as the same line, so quantity still merges", () => {
    expect(cartLineKey({ ...vase, variant: "With Stand" }))
      .toBe(cartLineKey({ ...vase, variant: "With Stand" }));
  });

  it("distinguishes a variant selection from no selection at all", () => {
    expect(cartLineKey({ ...vase, variant: "With Stand" })).not.toBe(cartLineKey(vase));
  });

  it("distinguishes the same id across the products and new_in tables", () => {
    expect(cartLineKey({ id: "x", source: "product" }))
      .not.toBe(cartLineKey({ id: "x", source: "new_in" }));
  });

  // `source` was added after the cart shipped, so carts persisted in
  // localStorage before then have it undefined. Those must keep resolving to
  // the same line as an explicit "product" — otherwise upgrading the app
  // would split every existing customer's cart into duplicate lines.
  it("normalises a missing source to 'product' so pre-existing stored carts don't split", () => {
    expect(cartLineKey({ id: "x" })).toBe(cartLineKey({ id: "x", source: "product" }));
  });

  // Colour carries no price of its own, so it is deliberately NOT part of
  // `variant` (that key feeds the variant_price lookup, which is keyed by
  // size). It still has to split cart lines: two colours of one size used to
  // merge, and the customer received two of whichever they added first.
  it("distinguishes two colours of the same item and size", () => {
    const scarf = { id: "scarf-1", source: "product" as const, variant: "Large" };
    expect(cartLineKey({ ...scarf, color: "Rust" }))
      .not.toBe(cartLineKey({ ...scarf, color: "Charcoal" }));
  });

  it("still merges the same colour and size", () => {
    const line = { id: "scarf-1", source: "product" as const, variant: "Large", color: "Rust" };
    expect(cartLineKey(line)).toBe(cartLineKey({ ...line }));
  });

  it("distinguishes colour from variant — a colour must not be readable as a size", () => {
    expect(cartLineKey({ id: "x", source: "product", variant: "Rust" }))
      .not.toBe(cartLineKey({ id: "x", source: "product", color: "Rust" }));
  });

  it("normalises a missing colour, so items added before colour was tracked don't split", () => {
    expect(cartLineKey({ id: "x", source: "product", variant: "Large" }))
      .toBe(cartLineKey({ id: "x", source: "product", variant: "Large", color: undefined }));
  });

  it("does not collide across ids that share a prefix", () => {
    expect(cartLineKey({ id: "vase", source: "product", variant: "1:big" }))
      .not.toBe(cartLineKey({ id: "vase:1", source: "product", variant: "big" }));
  });
});

// capQuantity is the cart's stock ceiling. It is a usability guard, not an
// enforcement boundary — the authoritative check is checkout_verified_order()
// server-side. Its job is to stop an ordinary customer paying for five of a
// stock-of-one handmade item and then being refunded.
describe("capQuantity", () => {
  it("clamps a requested quantity down to the available stock", () => {
    expect(capQuantity(5, 1)).toBe(1);
    expect(capQuantity(4, 3)).toBe(3);
  });

  it("leaves a quantity at or under the cap alone", () => {
    expect(capQuantity(2, 3)).toBe(2);
    expect(capQuantity(3, 3)).toBe(3);
  });

  // The quick-add buttons on listing cards have no stock data to pass, so an
  // absent cap must mean "unknown", never "zero" — otherwise every quick-add
  // line would collapse to a single unit.
  it("treats an unknown cap as no cap at all", () => {
    expect(capQuantity(7, undefined)).toBe(7);
  });

  // A snapshot cap can go stale to 0 if the item sold out after being added.
  // Returning 0 would make the line silently vanish while the customer is
  // editing it; letting it stand and be rejected at checkout is clearer.
  it("never returns zero for a stale sold-out cap", () => {
    expect(capQuantity(3, 0)).toBe(1);
    expect(capQuantity(1, 0)).toBe(1);
  });
});
