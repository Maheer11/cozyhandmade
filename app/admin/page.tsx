import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: totalProducts },
    { data: revenueData },
    { data: recentOrders },
  ] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("orders").select("total_amount").neq("status", "cancelled"),
    db.from("orders")
      .select("id, status, total_amount, created_at, delivery_address")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, o: { total_amount: number }) => sum + (o.total_amount ?? 0),
    0
  );

  const STATUS_DOT: Record<string, string> = {
    pending:    "bg-amber-400",
    paid:       "bg-blue-400",
    processing: "bg-purple-400",
    shipped:    "bg-sky-400",
    delivered:  "bg-emerald-400",
    cancelled:  "bg-red-400",
  };

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your store</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString("en-NG")}`, sub: "all time", color: "#8B2035" },
          { label: "Total Orders",  value: (totalOrders ?? 0).toString(),               sub: "all time",      color: "#C9A96E" },
          { label: "Pending Orders", value: (pendingOrders ?? 0).toString(),             sub: "need attention", color: "#D97706" },
          { label: "Products",      value: (totalProducts ?? 0).toString(),             sub: "in catalogue",   color: "#059669" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
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
        <Link
          href="/admin/orders"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          View All Orders
        </Link>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-gray-500 hover:text-gray-700">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(recentOrders ?? []).map((order: {
                id: string; status: string; total_amount: number; created_at: string;
                delivery_address: Record<string, string> | null;
              }) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-5 py-3 text-gray-600 max-w-[120px] truncate">
                    {(order.delivery_address as Record<string, string> | null)?.name ?? "Guest"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    ₦{order.total_amount.toLocaleString("en-NG")}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[order.status] ?? "bg-gray-300"}`} />
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!recentOrders || recentOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No orders yet.
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
