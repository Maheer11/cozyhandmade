// Server-side re-pricing shared by every payment path that needs to trust
// nothing from the client about what an order actually costs (originally
// written for the Paystack verify route; Stripe's create-intent route uses
// it too). Client-submitted `unit_price`/totals are never trusted — only
// `product_id`/`variant`/`quantity` selections are, and even those are
// validated against the real catalogue here.

export interface CheckoutItemInput {
  product_id: string; // products.id OR new_in_items.id, depending on `source`
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number; // client-submitted — NEVER trusted, recomputed below
  source?: "product" | "new_in";
  variant?: string; // selected size/tier key into variant_price, if any
}

export interface VerifiedItem {
  item_type: "product" | "new_in";
  ref_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number; // server-verified price
}

export class RepriceError extends Error {}

type ProductRow = { id: string; name: string; price: number; variant_price: Record<string, number> | null };
type NewInRow = { id: string; name: string; price: number; discount_price: number | null; variant_price: Record<string, number> | null };

/**
 * Re-fetches real prices from `products`/`new_in_items` and recomputes the
 * true order total, ignoring whatever price the client sent. Throws
 * RepriceError if any referenced item no longer exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function repriceItems(db: any, items: CheckoutItemInput[]): Promise<{ verifiedItems: VerifiedItem[]; verifiedTotal: number }> {
  if (!items?.length) {
    throw new RepriceError("No items in order");
  }

  const productItems = items.filter((i) => (i.source ?? "product") === "product");
  const newInItems = items.filter((i) => i.source === "new_in");

  const productIds = [...new Set(productItems.map((i) => i.product_id))];
  const newInIds = [...new Set(newInItems.map((i) => i.product_id))];

  const [{ data: products, error: productsError }, { data: newInRows, error: newInError }] = await Promise.all([
    productIds.length
      ? db.from("products").select("id, name, price, variant_price").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    newInIds.length
      ? db.from("new_in_items").select("id, name, price, discount_price, variant_price").in("id", newInIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    productsError || newInError ||
    !products || products.length !== productIds.length ||
    !newInRows || newInRows.length !== newInIds.length
  ) {
    throw new RepriceError("One or more items in this order are no longer available.");
  }

  const productById = new Map<string, ProductRow>((products as ProductRow[]).map((p) => [p.id, p]));
  const newInById = new Map<string, NewInRow>((newInRows as NewInRow[]).map((p) => [p.id, p]));

  let verifiedTotal = 0;
  const verifiedItems: VerifiedItem[] = items.map((item) => {
    const source = item.source ?? "product";
    let realPrice: number;

    if (source === "new_in") {
      const row = newInById.get(item.product_id)!;
      // A selected size/tier's own price wins over discount_price/price —
      // same precedence as the storefront detail page.
      realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
        ? row.variant_price[item.variant]
        : (row.discount_price ?? row.price);
    } else {
      const row = productById.get(item.product_id)!;
      realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
        ? row.variant_price[item.variant]
        : row.price;
    }

    verifiedTotal += realPrice * item.quantity;
    return {
      item_type: source,
      ref_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      unit_price: realPrice,
    };
  });

  return { verifiedItems, verifiedTotal };
}
