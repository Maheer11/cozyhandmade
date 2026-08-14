// Featured Pieces stopped owning stock in migration
// 013_featured_pieces_stock_from_product.sql. Each row links to a product via
// `product_id` and inherits that product's stock_quantity; the row's own
// `sold_out` boolean survives as a MANUAL OVERRIDE the owner can flip to pull
// a piece from sale early, even while the linked product still has stock.
//
// Everything that renders or gates a featured piece resolves availability
// through here so the rule lives in exactly one place — the storefront, the
// admin list and the server-side checkout re-verification must never disagree
// about whether something is buyable.

/**
 * Shape of the embedded product row Supabase returns for
 * `select("..., products(stock_quantity)")`. PostgREST returns a single object
 * for a many-to-one embed like this one, but older/looser client typings (and
 * the `as any` clients used throughout this codebase) can surface it as a
 * one-element array, so both are accepted rather than trusting one shape.
 */
export type EmbeddedProductStock =
  | { stock_quantity: number | null }
  | { stock_quantity: number | null }[]
  | null;

/** A featured_pieces row with its linked product embedded. */
export interface FeaturedPieceStockSource {
  sold_out?: boolean | null;
  product_id?: string | null;
  products?: EmbeddedProductStock;
}

/**
 * Columns every featured-piece read needs in order to resolve availability.
 * Appended to the caller's own column list so the join happens in the SAME
 * query — one round trip, no N+1 per card.
 */
export const FEATURED_PIECE_STOCK_SELECT = "product_id, products(stock_quantity)";

/**
 * Stock of the linked product, or null when the piece is misconfigured (no
 * product_id, or the embed is missing). Null is deliberately distinct from 0:
 * callers that need to warn the owner about a broken link can tell the two
 * apart, while callers that only care about buyability treat both as
 * unavailable via {@link isFeaturedPieceSoldOut}.
 */
export function linkedProductStock(item: FeaturedPieceStockSource): number | null {
  if (!item.product_id) return null;
  const embedded = Array.isArray(item.products) ? item.products[0] : item.products;
  if (!embedded || embedded.stock_quantity == null) return null;
  return embedded.stock_quantity;
}

/**
 * Effective availability, matching checkout_verified_order() exactly:
 * unavailable when the manual override is on, when there is no linked product,
 * or when the linked product has no stock left.
 */
export function isFeaturedPieceSoldOut(item: FeaturedPieceStockSource): boolean {
  if (item.sold_out) return true;
  const stock = linkedProductStock(item);
  return stock === null || stock <= 0;
}

/**
 * Quantity a customer may actually add to their cart — 0 whenever the piece is
 * unavailable for any reason, so an override or a broken link can never be
 * bypassed by the quantity stepper.
 */
export function featuredPieceMaxQuantity(item: FeaturedPieceStockSource): number {
  if (isFeaturedPieceSoldOut(item)) return 0;
  return linkedProductStock(item) ?? 0;
}
