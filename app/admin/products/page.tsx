import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { DbProduct } from "@/lib/db-products";
import AdminProductActions from "@/components/AdminProductActions";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: products } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false }) as { data: DbProduct[] | null };

  const missingWeightCount = (products ?? []).filter((p) => p.shipping_weight_grams == null).length;
  // The homepage hero has no count cap — it renders exactly what's toggled on,
  // here and in Featured Pieces. Surfacing the running total is the only way
  // the owner can tell "how full is the hero right now" without leaving the page.
  const onHomepageCount = (products ?? []).filter((p) => p.show_on_homepage).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products?.length ?? 0} items in catalogue
            <span className="mx-1.5 text-gray-300">·</span>
            <span className={onHomepageCount > 0 ? "text-gray-700 font-medium" : ""}>
              {onHomepageCount} shown on homepage
            </span>
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </Link>
      </div>

      {missingWeightCount > 0 && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {missingWeightCount} product{missingWeightCount === 1 ? "" : "s"} {missingWeightCount === 1 ? "has" : "have"} no shipping
          weight set — those orders fall back to the default (high) weight and may be mispriced. Look for the
          <span className="mx-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">⚠ weight</span>
          badge below.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Homepage</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Featured</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(products ?? []).map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  {/* Product name + image */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {product.image && (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</p>
                          {product.shipping_weight_grams == null && (
                            <span
                              title="No shipping weight set — this product's orders fall back to the default (high) weight and may be mispriced."
                              className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800"
                            >
                              ⚠ weight
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono">{product.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{product.category}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-900">€{product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {product.original_price && (
                      <span className="ml-1.5 text-xs text-gray-400 line-through">
                        €{product.original_price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      product.in_stock
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${product.in_stock ? "bg-green-500" : "bg-red-500"}`} />
                      {product.in_stock ? `In stock (${product.stock_quantity})` : "Out of stock"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {product.show_on_homepage ? (
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
                    {product.featured ? (
                      <span className="text-xs text-amber-600 font-medium">★ Featured</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <AdminProductActions productId={product.id} productName={product.name} />
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    No products yet.{" "}
                    <Link href="/admin/products/new" className="text-red-700 hover:underline">Add your first product →</Link>
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
