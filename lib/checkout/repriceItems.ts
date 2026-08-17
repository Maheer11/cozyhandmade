// Server-side re-pricing shared by every payment path that needs to trust
// nothing from the client about what an order actually costs (originally
// written for the Paystack verify route; Stripe's create-intent route uses
// it too). Client-submitted `unit_price`/totals are never trusted — only
// `product_id`/`variant`/`quantity` selections are, and even those are
// validated against the real catalogue here.

import {
  FEATURED_PIECE_STOCK_SELECT,
  isFeaturedPieceSoldOut,
  linkedProductStock,
  type EmbeddedProductStock,
} from "@/lib/featured-piece-stock";

export interface CheckoutItemInput {
  product_id: string; // products.id OR featured_pieces.id, depending on `source`
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number; // client-submitted — NEVER trusted, recomputed below
  // "new_in" accepted alongside "featured_piece" for backward compat — carts
  // persisted in localStorage before the New In → Featured Pieces rename
  // still carry the old value, and it must still reprice/checkout correctly.
  source?: "product" | "new_in" | "featured_piece";
  variant?: string; // selected size/tier key into variant_price, if any
}

export interface VerifiedItem {
  // Legacy 'new_in' is preserved as-is on `item_type` for already-placed
  // orders; new orders always write 'featured_piece'. See the comment on
  // CheckoutItemInput.source above.
  item_type: "product" | "new_in" | "featured_piece";
  ref_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number; // server-verified price
  // Server-verified billable weight — read from the DB row here, same as
  // unit_price, never trusted from the client. null means the admin hasn't
  // set one yet; lib/checkout/shipping.ts's calculateShipping() is what
  // applies the DEFAULT_ITEM_WEIGHT_GRAMS fallback for that case, not here.
  shipping_weight_grams: number | null;
}

export class RepriceError extends Error {}

type ProductRow = { id: string; name: string; price: number; variant_price: Record<string, number> | null; shipping_weight_grams: number | null };
type FeaturedPieceRow = {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  variant_price: Record<string, number> | null;
  shipping_weight_grams: number | null;
  // Availability inputs. Featured pieces have had no stock counter of their own
  // since migration 013 — `sold_out` is the owner's manual override and the
  // linked product carries the actual stock. See lib/featured-piece-stock.ts.
  sold_out: boolean | null;
  product_id: string | null;
  products: EmbeddedProductStock;
};

// Accepts both the current 'featured_piece' value and the legacy 'new_in'
// value that older persisted carts/orders may still carry, from before the
// New In → Featured Pieces rename.
function isFeaturedPieceSource(source: CheckoutItemInput["source"]): boolean {
  return source === "featured_piece" || source === "new_in";
}

/**
 * Re-fetches real prices from `products`/`featured_pieces` and recomputes the
 * true order total, ignoring whatever price the client sent. Throws
 * RepriceError if any referenced item no longer exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function repriceItems(db: any, items: CheckoutItemInput[]): Promise<{ verifiedItems: VerifiedItem[]; verifiedTotal: number }> {
  if (!items?.length) {
    throw new RepriceError("No items in order");
  }

  const productItems = items.filter((i) => (i.source ?? "product") === "product");
  const featuredPieceItems = items.filter((i) => isFeaturedPieceSource(i.source));

  const productIds = [...new Set(productItems.map((i) => i.product_id))];
  const featuredPieceIds = [...new Set(featuredPieceItems.map((i) => i.product_id))];

  const [{ data: products, error: productsError }, { data: featuredPieceRows, error: featuredPieceError }] = await Promise.all([
    productIds.length
      ? db.from("products").select("id, name, price, variant_price, shipping_weight_grams").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    featuredPieceIds.length
      ? db
          .from("featured_pieces")
          .select(`id, name, price, discount_price, variant_price, shipping_weight_grams, sold_out, ${FEATURED_PIECE_STOCK_SELECT}`)
          .in("id", featuredPieceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    productsError || featuredPieceError ||
    !products || products.length !== productIds.length ||
    !featuredPieceRows || featuredPieceRows.length !== featuredPieceIds.length
  ) {
    throw new RepriceError("One or more items in this order are no longer available.");
  }

  const productById = new Map<string, ProductRow>((products as ProductRow[]).map((p) => [p.id, p]));
  const featuredPieceById = new Map<string, FeaturedPieceRow>((featuredPieceRows as FeaturedPieceRow[]).map((p) => [p.id, p]));

  // ── Availability, server-side ──
  // Prices are re-derived below; availability has to be re-derived here too,
  // because the client's copy of it can be minutes old (or forged). Featured
  // pieces take their stock from the linked product since migration 013, so
  // there are three ways one can be unbuyable: the owner's manual sold_out
  // override, an empty linked product, or no linked product at all.
  //
  // checkout_verified_order() enforces all three again inside the payment
  // transaction and is the real authority — this check exists so the customer
  // is stopped BEFORE being charged, rather than charged and refunded.
  //
  // Quantities are summed per linked product first: two featured pieces
  // sharing one product, or the same piece appearing twice, compete for a
  // single stock number, exactly as the database groups them.
  const quantityByProductId = new Map<string, number>();
  for (const item of featuredPieceItems) {
    const row = featuredPieceById.get(item.product_id)!;
    if (isFeaturedPieceSoldOut(row)) {
      throw new RepriceError(`${row.name} is no longer available.`);
    }
    const productId = row.product_id!; // non-null: isFeaturedPieceSoldOut() rejects unlinked rows
    quantityByProductId.set(productId, (quantityByProductId.get(productId) ?? 0) + item.quantity);
  }
  for (const [productId, quantity] of quantityByProductId) {
    // The row is only needed for its name in the error; any piece pointing at
    // this product will do.
    const row = [...featuredPieceById.values()].find((p) => p.product_id === productId)!;
    const stock = linkedProductStock(row) ?? 0;
    if (quantity > stock) {
      throw new RepriceError(`${row.name} only has ${stock} left.`);
    }
  }

  let verifiedTotal = 0;
  const verifiedItems: VerifiedItem[] = items.map((item) => {
    const source = item.source ?? "product";
    let realPrice: number;
    let weightGrams: number | null;

    if (isFeaturedPieceSource(source)) {
      const row = featuredPieceById.get(item.product_id)!;
      // A selected size/tier's own price wins over discount_price/price —
      // same precedence as the storefront detail page.
      realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
        ? row.variant_price[item.variant]
        : (row.discount_price ?? row.price);
      weightGrams = row.shipping_weight_grams;
    } else {
      const row = productById.get(item.product_id)!;
      realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
        ? row.variant_price[item.variant]
        : row.price;
      weightGrams = row.shipping_weight_grams;
    }

    verifiedTotal += realPrice * item.quantity;
    return {
      item_type: source,
      ref_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      unit_price: realPrice,
      shipping_weight_grams: weightGrams,
    };
  });

  return { verifiedItems, verifiedTotal };
}
