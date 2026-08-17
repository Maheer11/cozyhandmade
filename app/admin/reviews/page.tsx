import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { ReviewItem } from "@/components/AdminReviewForm";
import AdminReviewActions from "@/components/AdminReviewActions";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: reviews } = await db
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true }) as { data: ReviewItem[] | null };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reviews?.length ?? 0} reviews shown on the site</p>
        </div>
        <Link
          href="/admin/reviews/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Review
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Screenshot</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(reviews ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-100 relative shrink-0">
                      <Image src={r.screenshot} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {[r.customer_label, r.location].filter(Boolean).join(" · ") || (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{r.platform}</td>
                  <td className="px-5 py-3 text-gray-600">{r.display_order}</td>
                  <td className="px-5 py-3 text-right">
                    <AdminReviewActions id={r.id} label={r.customer_label ?? ""} />
                  </td>
                </tr>
              ))}
              {(!reviews || reviews.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    No reviews yet.{" "}
                    <Link href="/admin/reviews/new" className="text-red-700 hover:underline">Add your first one →</Link>
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
