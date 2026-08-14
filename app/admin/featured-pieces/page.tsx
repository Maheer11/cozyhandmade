import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { FeaturedPieceItem } from "@/components/AdminFeaturedPieceForm";
import AdminFeaturedPieceActions from "@/components/AdminFeaturedPieceActions";
import { isFeaturedPieceSoldOut, linkedProductStock } from "@/lib/featured-piece-stock";

type LinkedProduct = { stock_quantity: number | null; name: string };

type AdminFeaturedPieceRow = FeaturedPieceItem & {
  // PostgREST returns a single object for this many-to-one embed; the array
  // form is tolerated because the client here is untyped (`as any`).
  products: LinkedProduct | LinkedProduct[] | null;
};

function linkedProductOf(item: AdminFeaturedPieceRow): LinkedProduct | null {
  return (Array.isArray(item.products) ? item.products[0] : item.products) ?? null;
}

export default async function AdminFeaturedPiecesPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // `*` already covers product_id; the embed pulls the linked product's stock
  // and name in the SAME query rather than one lookup per row.
  const { data: items } = await db
    .from("featured_pieces")
    .select(`*, products(stock_quantity, name)`)
    .order("display_order", { ascending: true }) as { data: AdminFeaturedPieceRow[] | null };

  // The homepage hero has no count cap — it renders exactly what's toggled on,
  // here and in Products. Surfacing the running total is the only way the owner
  // can tell "how full is the hero right now" without leaving the page.
  const onHomepageCount = (items ?? []).filter((i) => i.show_on_homepage).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Featured Pieces</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items?.length ?? 0} items in the Featured Pieces collection
            <span className="mx-1.5 text-gray-300">·</span>
            <span className={onHomepageCount > 0 ? "text-gray-700 font-medium" : ""}>
              {onHomepageCount} shown on homepage
            </span>
          </p>
        </div>
        <Link
          href="/admin/featured-pieces/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Item
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Homepage</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(items ?? []).map((item) => {
                const needsAttention = item.price === 0 || !item.description?.trim();
                const missingWeight = item.shipping_weight_grams == null;
                // Stock is the linked product's, not this row's — see
                // lib/featured-piece-stock.ts. null means nothing is linked,
                // which is a misconfiguration the owner has to fix: checkout
                // refuses to sell such a piece.
                const product = linkedProductOf(item);
                const stock = linkedProductStock(item);
                const effectivelySoldOut = isFeaturedPieceSoldOut(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          <Image
                            src={item.product_image}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                            {!item.product_id && (
                              <span
                                title="No product linked — this piece has no stock source and cannot be sold. Edit it and pick a product."
                                className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800"
                              >
                                ⚠ no product
                              </span>
                            )}
                            {missingWeight && (
                              <span
                                title="No shipping weight set — this item's orders fall back to the default (high) weight and may be mispriced."
                                className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800"
                              >
                                ⚠ weight
                              </span>
                            )}
                          </div>
                          {needsAttention && (
                            <p className="text-xs text-amber-600">Needs price/description</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {item.discount_price ? (
                        <span>
                          <span className="line-through text-gray-400 mr-1">€{item.price.toFixed(2)}</span>
                          <span className="font-medium text-gray-900">€{item.discount_price.toFixed(2)}</span>
                        </span>
                      ) : (
                        `€${item.price.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {stock === null ? (
                        <span className="text-red-600 text-xs font-medium">Not linked</span>
                      ) : (
                        <span>
                          <span className={stock <= 0 ? "text-red-600 font-medium" : ""}>{stock}</span>
                          {product?.name && (
                            <span className="block text-[11px] text-gray-400 truncate max-w-[160px]" title={product.name}>
                              via {product.name}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{item.display_order}</td>
                    <td className="px-5 py-3">
                      {item.show_on_homepage ? (
                        <span
                          title="Appears in the homepage hero."
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700"
                        >
                          ● On homepage
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {/* What a customer actually sees: the manual override OR
                          the linked product running out. Showing only the
                          override would claim "Available" for pieces the
                          storefront is already refusing to sell. */}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        effectivelySoldOut ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${effectivelySoldOut ? "bg-red-500" : "bg-green-500"}`} />
                        {effectivelySoldOut ? "Sold Out" : "Available"}
                      </span>
                      {/* Why it's sold out matters: an override the owner set
                          is undone in this admin, an empty product is fixed on
                          the product. */}
                      {effectivelySoldOut && (
                        <span className="block text-[11px] text-gray-400 mt-0.5">
                          {item.sold_out ? "manual override" : stock === null ? "no product linked" : "product out of stock"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <AdminFeaturedPieceActions id={item.id} name={item.name} addedToCollections={item.added_to_collections} productId={item.product_id} />
                    </td>
                  </tr>
                );
              })}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    No Featured Pieces items yet.{" "}
                    <Link href="/admin/featured-pieces/new" className="text-red-700 hover:underline">Add your first one →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
