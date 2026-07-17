import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { NewInItem } from "@/components/AdminNewInForm";
import AdminNewInActions from "@/components/AdminNewInActions";

export default async function AdminNewInPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: items } = await db
    .from("new_in_items")
    .select("*")
    .order("display_order", { ascending: true }) as { data: NewInItem[] | null };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New In</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items?.length ?? 0} items in the New In collection</p>
        </div>
        <Link
          href="/admin/new-in/new"
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
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(items ?? []).map((item) => {
                const needsAttention = item.price === 0 || !item.description?.trim();
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
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                          {needsAttention && (
                            <p className="text-xs text-amber-600">Needs price/description</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {item.discount_price ? (
                        <span>
                          <span className="line-through text-gray-400 mr-1">£{item.price.toFixed(2)}</span>
                          <span className="font-medium text-gray-900">£{item.discount_price.toFixed(2)}</span>
                        </span>
                      ) : (
                        `£${item.price.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{item.stock_quantity}</td>
                    <td className="px-5 py-3 text-gray-600">{item.display_order}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.sold_out ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.sold_out ? "bg-red-500" : "bg-green-500"}`} />
                        {item.sold_out ? "Sold Out" : "Available"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <AdminNewInActions id={item.id} name={item.name} />
                    </td>
                  </tr>
                );
              })}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                    No New In items yet.{" "}
                    <Link href="/admin/new-in/new" className="text-red-700 hover:underline">Add your first one →</Link>
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
