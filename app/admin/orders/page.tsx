import { createClient } from "@/lib/supabase/server";
import AdminOrderStatus from "@/components/AdminOrderStatus";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: Record<string, string> | null;
  order_items: { product_name: string; quantity: number; unit_price: number }[];
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: orders } = await db
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price)")
    .order("created_at", { ascending: false }) as { data: OrderRow[] | null };

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orders?.length ?? 0} total orders</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Items</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders ?? []).map((order) => {
                const addr = order.delivery_address;
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    {/* ID + date */}
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs text-gray-500">{order.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="text-gray-900 font-medium text-xs truncate max-w-[130px]">
                        {addr?.name ?? "Guest"}
                      </p>
                      {addr?.email && (
                        <p className="text-gray-400 text-xs truncate max-w-[130px]">{addr.email}</p>
                      )}
                      {addr?.city && (
                        <p className="text-gray-400 text-[10px]">{addr.city}{addr.country ? `, ${addr.country}` : ""}</p>
                      )}
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4">
                      <ul className="space-y-0.5 max-w-[180px]">
                        {order.order_items.map((item, i) => (
                          <li key={i} className="text-xs text-gray-600 truncate">
                            <span className="font-medium text-gray-800">{item.quantity}×</span> {item.product_name}
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">
                      ₦{order.total_amount.toLocaleString("en-NG")}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-5 py-4">
                      <AdminOrderStatus orderId={order.id} current={order.status} />
                    </td>
                  </tr>
                );
              })}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
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
