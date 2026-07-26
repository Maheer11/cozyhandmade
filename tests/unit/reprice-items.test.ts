import { describe, it, expect } from "vitest";
import { repriceItems, RepriceError } from "@/lib/checkout/repriceItems";

// Minimal fake Supabase query builder — just enough for repriceItems' two
// `.from(...).select(...).in(...)` calls.
function fakeDb(products: Record<string, unknown>[], newInItems: Record<string, unknown>[]) {
  return {
    from(table: string) {
      const rows = table === "products" ? products : newInItems;
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

  it("prefers new_in discount_price over price when no variant is selected", async () => {
    const db = fakeDb([], [{ id: "n1", name: "New Bag", price: 100, discount_price: 80, variant_price: null }]);
    const { verifiedTotal } = await repriceItems(db, [
      { product_id: "n1", product_name: "New Bag", product_image: null, quantity: 1, unit_price: 1, source: "new_in" },
    ]);
    expect(verifiedTotal).toBe(80);
  });

  it("throws RepriceError when an item no longer exists in the catalogue", async () => {
    const db = fakeDb([], []);
    await expect(
      repriceItems(db, [{ product_id: "does-not-exist", product_name: "Ghost", product_image: null, quantity: 1, unit_price: 10 }])
    ).rejects.toThrow(RepriceError);
  });
});
