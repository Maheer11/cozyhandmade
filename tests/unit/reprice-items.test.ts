import { describe, it, expect } from "vitest";
import { repriceItems, RepriceError } from "@/lib/checkout/repriceItems";

// Minimal fake Supabase query builder — just enough for repriceItems' two
// `.from(...).select(...).in(...)` calls.
function fakeDb(products: Record<string, unknown>[], featuredPieces: Record<string, unknown>[]) {
  return {
    from(table: string) {
      const rows = table === "products" ? products : featuredPieces;
      return {
        select() {
          return {
            in(_col: string, ids: string[]) {
              return Promise.resolve({ data: rows.filter((r) => ids.includes(r.id as string)), error: null });
            },
          };
        },
      };
    },
  };
}

// Featured pieces stopped owning stock in migration 013: they inherit the
// stock of the product they link to, and their own `sold_out` boolean survives
// only as a manual override on top of that. `products` here is the embedded
// row Supabase returns for `select("..., products(stock_quantity)")`.
function featuredPiece(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    name: "New Bag",
    price: 100,
    discount_price: 80,
    variant_price: null,
    shipping_weight_grams: null,
    sold_out: false,
    product_id: "p-linked",
    products: { stock_quantity: 5 },
    ...overrides,
  };
}

describe("repriceItems", () => {
  it("throws when there are no items", async () => {
    await expect(repriceItems(fakeDb([], []), [])).rejects.toThrow(RepriceError);
  });

  it("ignores client-submitted unit_price and recomputes from the real product row", async () => {
    const db = fakeDb([{ id: "p1", name: "Vase", price: 40, variant_price: null }], []);
    const { verifiedItems, verifiedTotal } = await repriceItems(db, [
      { product_id: "p1", product_name: "Vase (tampered name)", product_image: null, quantity: 2, unit_price: 1 /* tampered */ },
    ]);
    expect(verifiedItems[0].unit_price).toBe(40);
    expect(verifiedTotal).toBe(80);
  });

  it("prefers a selected variant's own price over the base price", async () => {
    const db = fakeDb([{ id: "p1", name: "Scarf", price: 20, variant_price: { L: 25 } }], []);
    const { verifiedTotal } = await repriceItems(db, [
      { product_id: "p1", product_name: "Scarf", product_image: null, quantity: 1, unit_price: 20, variant: "L" },
    ]);
    expect(verifiedTotal).toBe(25);
  });

  it("prefers featured_piece discount_price over price when no variant is selected", async () => {
    const db = fakeDb([], [featuredPiece()]);
    const { verifiedTotal } = await repriceItems(db, [
      { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "featured_piece" },
    ]);
    expect(verifiedTotal).toBe(80);
  });

  // Backward compat: carts persisted before the New In → Featured Pieces
  // rename still carry source: "new_in". repriceItems must still resolve
  // those against the featured_pieces table exactly like "featured_piece".
  it("still reprices legacy source: 'new_in' items against the featured_pieces table", async () => {
    const db = fakeDb([], [featuredPiece()]);
    const { verifiedItems, verifiedTotal } = await repriceItems(db, [
      { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "new_in" },
    ]);
    expect(verifiedTotal).toBe(80);
    expect(verifiedItems[0].item_type).toBe("new_in");
  });

  // ── Availability, resolved through the linked product ──

  it("reprices a featured piece whose linked product has stock", async () => {
    const db = fakeDb([], [featuredPiece({ products: { stock_quantity: 3 } })]);
    const { verifiedTotal } = await repriceItems(db, [
      { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 2, unit_price: 1, source: "featured_piece" },
    ]);
    expect(verifiedTotal).toBe(160);
  });

  it("rejects a featured piece whose linked product is out of stock", async () => {
    const db = fakeDb([], [featuredPiece({ products: { stock_quantity: 0 } })]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "featured_piece" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  it("rejects more than the linked product's stock, even when some is left", async () => {
    const db = fakeDb([], [featuredPiece({ products: { stock_quantity: 2 } })]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 3, unit_price: 1, source: "featured_piece" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  // Two featured pieces backed by the SAME product compete for one stock
  // number — the database groups them that way, and so must this.
  it("sums quantities across featured pieces sharing one linked product", async () => {
    const db = fakeDb([], [
      featuredPiece({ id: "n1", name: "Bag A", products: { stock_quantity: 3 } }),
      featuredPiece({ id: "n2", name: "Bag B", products: { stock_quantity: 3 } }),
    ]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "Bag A", product_image: null, quantity: 2, unit_price: 1, source: "featured_piece" },
        { product_id: "n2", product_name: "Bag B", product_image: null, quantity: 2, unit_price: 1, source: "featured_piece" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  // The manual override is exactly that: it wins over a stocked product.
  it("rejects a featured piece flagged sold_out even when its product has stock", async () => {
    const db = fakeDb([], [featuredPiece({ sold_out: true, products: { stock_quantity: 10 } })]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "featured_piece" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  // A piece with no product_id has no stock source at all. Treating that as
  // "unlimited" would sell stock that does not exist, so it is unavailable —
  // checkout_verified_order() raises UNLINKED_FEATURED_PIECE for the same row.
  it("rejects a featured piece with no linked product", async () => {
    const db = fakeDb([], [featuredPiece({ product_id: null, products: null })]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "featured_piece" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  // Legacy carts (source: "new_in") go through the same availability rules.
  it("applies the same availability rules to legacy 'new_in' items", async () => {
    const db = fakeDb([], [featuredPiece({ products: { stock_quantity: 0 } })]);
    await expect(
      repriceItems(db, [
        { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "new_in" },
      ])
    ).rejects.toThrow(RepriceError);
  });

  it("throws RepriceError when an item no longer exists in the catalogue", async () => {
    const db = fakeDb([], []);
    await expect(
      repriceItems(db, [{ product_id: "does-not-exist", product_name: "Ghost", product_image: null, quantity: 1, unit_price: 10 }])
    ).rejects.toThrow(RepriceError);
  });
});
