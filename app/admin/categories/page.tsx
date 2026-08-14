import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { DbCategory } from "@/lib/db-categories";
import AdminCategoryActions from "@/components/AdminCategoryActions";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [{ data: categories }, { data: products }, { data: customProducts }] = await Promise.all([
    db.from("categories").select("*").order("display_order", { ascending: true }) as Promise<{ data: DbCategory[] | null }>,
    db.from("products").select("category") as Promise<{ data: { category: string }[] | null }>,
    db.from("custom_products").select("category") as Promise<{ data: { category: string }[] | null }>,
  ]);

  const productCounts = new Map<string, number>();
  for (const p of [...(products ?? []), ...(customProducts ?? [])]) {
    productCounts.set(p.category, (productCounts.get(p.category) ?? 0) + 1);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories?.length ?? 0} categories</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Category
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Image</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Products</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(categories ?? []).map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{cat.id}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {cat.image ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                        <Image src={cat.image} alt={cat.name} width={40} height={40} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700"
                        title="No manual image set. Using the most recent product's photo automatically"
                      >
                        Auto
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{productCounts.get(cat.id) ?? 0}</td>
                  <td className="px-5 py-3 text-gray-600">{cat.display_order}</td>
                  <td className="px-5 py-3 text-right">
                    <AdminCategoryActions id={cat.id} name={cat.name} />
                  </td>
                </tr>
              ))}
              {(!categories || categories.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    No categories yet.{" "}
                    <Link href="/admin/categories/new" className="text-red-700 hover:underline">Add your first one →</Link>
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
