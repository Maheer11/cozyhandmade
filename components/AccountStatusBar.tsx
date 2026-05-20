"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";

type TierKey = "bronze" | "silver" | "gold" | "vip";

interface ProfileSnap {
  tier: TierKey;
  total_spent: number;
}

const TIER_CONFIG: Record<TierKey, { color: string; label: string; min: number; max: number | null }> = {
  bronze: { color: "#CD7F32", label: "Bronze", min: 0,         max: 150_000   },
  silver: { color: "#A8A9AD", label: "Silver", min: 150_000,   max: 500_000   },
  gold:   { color: "#C9A96E", label: "Gold",   min: 500_000,   max: 1_000_000 },
  vip:    { color: "#8B2035", label: "VIP",    min: 1_000_000, max: null      },
};

const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "vip"];

function getProgress(tier: TierKey, spent: number): number {
  const cfg = TIER_CONFIG[tier];
  if (!cfg.max) return 100;
  return Math.min(((spent - cfg.min) / (cfg.max - cfg.min)) * 100, 100);
}

export default function AccountStatusBar() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileSnap | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("tier, total_spent")
      .eq("id", user.id)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setProfile(data as any));
  }, [user]);

  if (loading || !user || !profile) return null;

  const cfg      = TIER_CONFIG[profile.tier];
  const pct      = getProgress(profile.tier, profile.total_spent);
  const nextIdx  = TIER_ORDER.indexOf(profile.tier) + 1;
  const nextTier = nextIdx < TIER_ORDER.length ? TIER_CONFIG[TIER_ORDER[nextIdx]] : null;
  const toNext   = cfg.max ? cfg.max - profile.total_spent : 0;

  return (
    <div className="w-full bg-white border-b border-cream-darker px-4 py-2 flex items-center gap-3 text-xs font-body">

      {/* Tier badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
        <span className="font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 bg-taupe/20 shrink-0" />

      {/* Spend amount */}
      <span className="text-taupe-dark shrink-0">
        ₦{profile.total_spent.toLocaleString("en-NG")} spent
      </span>

      {/* Progress bar + next tier label */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 bg-cream-darker rounded-full overflow-hidden min-w-[40px]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: cfg.color }}
          />
        </div>
        <span className="text-taupe-dark shrink-0 hidden sm:inline">
          {nextTier
            ? `₦${toNext.toLocaleString("en-NG")} to ${nextTier.label}`
            : "Top tier ✦"}
        </span>
      </div>

      {/* Profile link */}
      <Link
        href="/account"
        className="shrink-0 font-medium transition-colors hover:text-deep-brown"
        style={{ color: "#8B2035" }}
      >
        My Profile →
      </Link>
    </div>
  );
}
