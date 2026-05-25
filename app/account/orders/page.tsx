import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: (Database["public"]["Tables"]["order_items"]["Row"])[];
};

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-100",
  paid:       "bg-blue-50 text-blue-700 border-blue-100",
  processing: "bg-purple-50 text-purple-700 border-purple-100",
  shipped:    "bg-sky-50 text-sky-700 border-sky-100",
  delivered:  "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled:  "bg-red-50 text-red-700 border-red-100",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/account/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price, subtotal, product_image)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as unknown as { data: Order[] | null };

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/account" className="text-taupe-dark hover:text-brown transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-taupe-dark font-body">My Account</p>
            <h1 className="font-heading italic text-3xl font-400 text-deep-brown">My Orders</h1>
          </div>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-10 text-center">
            <svg className="w-12 h-12 text-taupe/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <p className="font-heading text-xl italic text-deep-brown mb-2">No orders yet</p>
            <p className="text-sm text-taupe-dark font-body mb-5">Your purchases will appear here after checkout.</p>
            <Link href="/products"
              className="inline-flex items-center px-7 h-11 rounded-none text-cream font-semibold
                         text-sm tracking-wide font-body"
              style={{ backgroundColor: "#8B2035" }}>
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id}
                className="bg-white rounded-2xl border border-cream-darker shadow-sm overflow-hidden">

                {/* Order header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-taupe/10">
                  <div>
                    <p className="text-xs text-taupe-dark font-body">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                    <p className="text-xs font-mono text-brown/60 mt-0.5">{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1
                                      rounded-full border font-body ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                      {order.status}
                    </span>
                    <p className="text-sm font-bold text-deep-brown">
                      ₦{order.total_amount.toLocaleString("en-NG")}
                    </p>
                  </div>
                </div>

                {/* Order items */}
                <div className="px-5 py-4 space-y-3">
                  {order.order_items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cream-darker shrink-0 overflow-hidden">
                        {item.product_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product_image} alt={item.product_name}
                               className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-deep-brown truncate">{item.product_name}</p>
                        <p className="text-xs text-taupe-dark font-body">Qty {item.quantity} × ₦{item.unit_price.toLocaleString("en-NG")}</p>
                      </div>
                      <p className="text-sm font-semibold text-deep-brown shrink-0">
                        ₦{item.subtotal.toLocaleString("en-NG")}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Invoice download */}
                <div className="px-5 py-3 border-t border-taupe/10 flex justify-end">
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold font-body
                               text-brown/70 hover:text-deep-brown transition-colors group"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 group-hover:-translate-y-0.5 transition-transform"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Invoice (PDF)
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
