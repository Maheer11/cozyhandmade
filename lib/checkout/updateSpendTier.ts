// Bumps a customer's lifetime spend + loyalty tier after a completed order.
// Shared between every order-creation path (originally inline in the
// Paystack verify route).

const TIER_THRESHOLDS: [number, "vip" | "gold" | "silver" | "bronze"][] = [
  [750, "vip"],
  [400, "gold"],
  [100, "silver"],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateSpendTier(db: any, userId: string, orderTotal: number): Promise<void> {
  const { data: profile } = await db
    .from("profiles")
    .select("total_spent")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const newTotal = (profile.total_spent ?? 0) + orderTotal;
  const newTier = TIER_THRESHOLDS.find(([threshold]) => newTotal >= threshold)?.[1] ?? "bronze";

  await db.from("profiles").update({ total_spent: newTotal, tier: newTier }).eq("id", userId);
}
