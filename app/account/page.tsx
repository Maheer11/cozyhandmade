import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TierKey = "bronze" | "silver" | "gold" | "vip";

type RecentOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: { product_name: string; quantity: number }[];
};

const TIER_CONFIG: Record<TierKey, { color: string; label: string; min: number; max: number | null }> = {
  bronze: { color: "#CD7F32", label: "Bronze", min: 0,         max: 150_000   },
  silver: { color: "#A8A9AD", label: "Silver", min: 150_000,   max: 500_000   },
  gold:   { color: "#C9A96E", label: "Gold",   min: 500_000,   max: 1_000_000 },
  vip:    { color: "#8B2035", label: "VIP",    min: 1_000_000, max: null      },
};

const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "vip"];

const TIER_JOURNEY_LABELS: Record<TierKey, string> = {
  bronze: "₦0",
  silver: "₦150k",
  gold:   "₦500k",
  vip:    "₦1M",
};

const TIER_BENEFITS: Record<TierKey, string[]> = {
  bronze: [
    "Free standard delivery on orders over ₦50,000",
    "Full order tracking & history",
    "Member-only newsletter & updates",
  ],
  silver: [
    "5% discount on all orders",
    "Priority order processing",
    "Early access to sales & promotions",
    "All Bronze benefits",
  ],
  gold: [
    "10% discount on all orders",
    "Free express delivery on all orders",
    "Early access to new collections",
    "All Silver benefits",
  ],
  vip: [
    "15% discount on all orders",
    "Free express delivery worldwide",
    "Personal stylist consultation",
    "Exclusive product previews",
    "Complimentary gift wrapping",
    "All Gold benefits",
  ],
};

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700",
  paid:       "bg-blue-50 text-blue-700",
  processing: "bg-purple-50 text-purple-700",
  shipped:    "bg-sky-50 text-sky-700",
  delivered:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-red-50 text-red-700",
};

function getProgress(tierKey: TierKey, totalSpent: number) {
  const cfg = TIER_CONFIG[tierKey];
  if (!cfg.max) return 100;
  return Math.min(((totalSpent - cfg.min) / (cfg.max - cfg.min)) * 100, 100);
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() as unknown as { data: Profile | null };

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at, order_items(product_name, quantity)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3) as unknown as { data: RecentOrder[] | null };

  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id) as unknown as { count: number | null };

  // Compute total spent live from confirmed orders — never rely on cached profile value
  const { data: spendRows } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("user_id", user.id)
    .in("status", ["paid", "processing", "shipped", "delivered"]) as unknown as {
      data: { total_amount: number }[] | null;
    };

  const totalSpent = (spendRows ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const tierKey: TierKey =
    totalSpent >= 1_000_000 ? "vip"
    : totalSpent >= 500_000 ? "gold"
    : totalSpent >= 150_000 ? "silver"
    : "bronze";
  const cfg        = TIER_CONFIG[tierKey];
  const pct        = getProgress(tierKey, totalSpent);
  const tierIdx    = TIER_ORDER.indexOf(tierKey);
  const nextTier   = tierIdx < TIER_ORDER.length - 1 ? TIER_CONFIG[TIER_ORDER[tierIdx + 1]] : null;
  const toNext     = cfg.max ? cfg.max - totalSpent : 0;
  const orders     = recentOrders ?? [];

  return (
    <div className="min-h-screen bg-cream pt-8 pb-28 px-4 lg:py-12">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Page header */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-taupe-dark font-body">My Account</p>
          <h1 className="font-heading italic text-3xl font-400 text-deep-brown mt-1">
            {profile?.full_name ?? user.email?.split("@")[0]}
          </h1>
        </div>

        {/* Tier hero card */}
        <div className="bg-white rounded-2xl border border-cream-darker shadow-sm overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: cfg.color }} />
          <div className="p-6">

            {/* Avatar + name + spend */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-2xl font-body"
                style={{ backgroundColor: cfg.color }}
              >
                {(profile?.full_name as string | undefined)?.[0]?.toUpperCase()
                  ?? user.email?.[0]?.toUpperCase()
                  ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-widest font-body mb-0.5"
                  style={{ color: cfg.color }}
                >
                  {cfg.label} Member
                </p>
                <p className="text-2xl font-heading italic text-deep-brown">
                  ₦{totalSpent.toLocaleString("en-NG")}
                </p>
                <p className="text-xs text-taupe-dark font-body">Total lifetime spend</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-deep-brown">{(profile?.coin_balance ?? 0).toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wide text-taupe-dark font-body">Coins</p>
              </div>
            </div>

            {/* Progress bar to next tier */}
            {nextTier ? (
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-body">
                  <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-taupe-dark">
                    ₦{toNext.toLocaleString("en-NG")} more to {nextTier.label}
                  </span>
                </div>
                <div className="h-2 bg-cream-darker rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-taupe-dark font-body mt-1">
                  <span>{pct.toFixed(0)}% of the way there</span>
                  <span style={{ color: nextTier.color }}>{nextTier.label} unlocks at ₦{cfg.max?.toLocaleString("en-NG")}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <p className="text-xs text-taupe-dark font-body mb-0.5">You&apos;ve reached our highest tier</p>
                <p className="font-heading italic text-lg" style={{ color: cfg.color }}>Welcome to VIP ✦</p>
              </div>
            )}
          </div>
        </div>

        {/* Tier journey timeline */}
        <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5">
          <h2 className="font-heading italic text-lg text-deep-brown mb-5">Your Tier Journey</h2>
          <div className="flex items-start">
            {TIER_ORDER.map((tk, i) => {
              const tcfg      = TIER_CONFIG[tk];
              const isReached = i <= tierIdx;
              const isActive  = i === tierIdx;
              const isLast    = i === TIER_ORDER.length - 1;
              const nextReached = i + 1 <= tierIdx;

              return (
                <div key={tk} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    {/* Left line */}
                    {i > 0 && (
                      <div
                        className="flex-1 h-0.5"
                        style={{ backgroundColor: isReached ? tcfg.color : "#E8E0D8" }}
                      />
                    )}
                    {/* Dot */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border-2 font-bold"
                      style={{
                        backgroundColor: isActive || isReached ? tcfg.color : "white",
                        borderColor:     isActive || isReached ? tcfg.color : "#E8E0D8",
                        color:           isActive || isReached ? "white" : "#C4B5A8",
                      }}
                    >
                      {isReached && !isActive ? "✓" : isActive ? "★" : "·"}
                    </div>
                    {/* Right line */}
                    {!isLast && (
                      <div
                        className="flex-1 h-0.5"
                        style={{ backgroundColor: nextReached ? TIER_CONFIG[TIER_ORDER[i + 1]].color : "#E8E0D8" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[10px] font-semibold mt-1.5 uppercase tracking-wide font-body"
                    style={{ color: isActive || isReached ? tcfg.color : "#C4B5A8" }}
                  >
                    {tcfg.label}
                  </p>
                  <p className="text-[9px] text-taupe-dark font-body">{TIER_JOURNEY_LABELS[tk]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Orders",      value: (orderCount ?? 0).toString() },
            { label: "Total Spent", value: totalSpent >= 1000 ? `₦${(totalSpent / 1000).toFixed(0)}k` : `₦${totalSpent}` },
            { label: "Coins",       value: (profile?.coin_balance ?? 0).toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-cream-darker shadow-sm p-4 text-center">
              <p className="text-xl font-bold text-deep-brown">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-taupe-dark font-body mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Current tier benefits */}
        <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-heading italic text-lg text-deep-brown">{cfg.label} Benefits</h2>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-white font-body font-semibold uppercase tracking-wide"
              style={{ backgroundColor: cfg.color }}
            >
              Active
            </span>
          </div>
          <ul className="space-y-2.5">
            {TIER_BENEFITS[tierKey].map((benefit, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-xs mt-0.5 shrink-0" style={{ color: cfg.color }}>✓</span>
                <span className="text-deep-brown font-body">{benefit}</span>
              </li>
            ))}
          </ul>
          {nextTier && (
            <div className="mt-4 pt-4 border-t border-cream-darker">
              <p className="text-xs text-taupe-dark font-body">
                Spend ₦{toNext.toLocaleString("en-NG")} more to unlock{" "}
                <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.label}</span> benefits.
              </p>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-cream-darker shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-taupe/10">
            <h2 className="font-heading italic text-lg text-deep-brown">Recent Orders</h2>
            <Link href="/account/orders" className="text-xs font-body text-brown hover:underline">
              View all →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-taupe-dark font-body mb-2">No orders yet.</p>
              <Link href="/products" className="text-xs font-body hover:underline" style={{ color: "#8B2035" }}>
                Shop now →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-taupe/10">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-xs font-mono text-brown/50">{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-taupe-dark font-body mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {" · "}
                      {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-deep-brown">
                      ₦{order.total_amount.toLocaleString("en-NG")}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-body uppercase tracking-wide ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/account/orders"
            className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 flex flex-col gap-2 hover:border-taupe/50 transition-colors">
            <svg className="w-5 h-5 text-brown/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <p className="text-sm font-semibold text-deep-brown">My Orders</p>
            <p className="text-xs text-taupe-dark font-body">View purchase history</p>
          </Link>
          <Link href="/products"
            className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 flex flex-col gap-2 hover:border-taupe/50 transition-colors">
            <svg className="w-5 h-5 text-brown/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <p className="text-sm font-semibold text-deep-brown">Shop</p>
            <p className="text-xs text-taupe-dark font-body">Browse our collection</p>
          </Link>
        </div>

        {/* Account details */}
        <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5">
          <h2 className="font-heading italic text-lg text-deep-brown mb-3">Account Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-taupe-dark font-body">Email</span>
              <span className="font-medium text-deep-brown">{user.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex justify-between">
                <span className="text-taupe-dark font-body">Phone</span>
                <span className="font-medium text-deep-brown">{profile.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-taupe-dark font-body">Member since</span>
              <span className="font-medium text-deep-brown">
                {new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
