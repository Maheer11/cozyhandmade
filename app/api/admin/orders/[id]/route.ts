import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/email";
import {
  addBusinessDays,
  NGN_DELIVERY_BUSINESS_DAYS,
  INTL_DELIVERY_BUSINESS_DAYS_MIN,
  INTL_DELIVERY_BUSINESS_DAYS_MAX,
} from "@/lib/config";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Nigerian orders get a single fixed estimate; international orders get a range.
function estimatedDeliveryLabel(isNGN: boolean): string {
  const now = new Date();
  if (isNGN) {
    return formatDate(addBusinessDays(now, NGN_DELIVERY_BUSINESS_DAYS));
  }
  const earliest = addBusinessDays(now, INTL_DELIVERY_BUSINESS_DAYS_MIN);
  const latest = addBusinessDays(now, INTL_DELIVERY_BUSINESS_DAYS_MAX);
  return `${formatDate(earliest)} – ${formatDate(latest)}`;
}

function isAdmin(email: string | undefined) {
  return email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

// "pending" / "paid" / "processing" are system-managed — only
// checkout_verified_order() (Stage 2) ever sets those. The admin can only
// perform three manual transitions: ship, deliver, or cancel.
const ADMIN_SETTABLE_STATUSES = ["shipped", "delivered", "cancelled"] as const;

// Which current statuses each manual transition is allowed from.
// "paid" is included alongside "processing" for shipped/cancelled only as a
// backward-compat allowance for orders created before this system existed —
// checkout_verified_order() itself never sets "paid", it goes straight to
// "processing", so no new order should ever reach these "paid" branches.
const ALLOWED_FROM: Record<(typeof ADMIN_SETTABLE_STATUSES)[number], readonly string[]> = {
  shipped: ["processing", "paid"],
  delivered: ["shipped"],
  cancelled: ["pending", "processing", "paid"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check uses anon client; DB writes use service-role to bypass RLS
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status, notes } = await request.json();

    if (status && !ADMIN_SETTABLE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Admin can only mark an order as shipped, delivered, or cancelled — all other statuses are system-managed" },
        { status: 400 }
      );
    }

    const db = createAdminClient() as any;

    // Enforce the transition is coming from a valid current status (e.g. can't
    // "deliver" an order that hasn't shipped yet).
    if (status) {
      const { data: existing, error: fetchError } = await db
        .from("orders")
        .select("status")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (!ALLOWED_FROM[status as (typeof ADMIN_SETTABLE_STATUSES)[number]].includes(existing.status)) {
        return NextResponse.json(
          { error: `Cannot mark order as "${status}" from its current status "${existing.status}"` },
          { status: 400 }
        );
      }
    }

    const update: Record<string, string> = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    // Stock is decremented exactly once, atomically, by checkout_verified_order()
    // at payment-verification time (app/api/payments/paystack/verify/route.ts).
    // Admin status transitions never touch stock_quantity — the old "read stock,
    // then separately update stock" logic that used to live here on the "paid"
    // transition has been removed; it was a second, redundant race-condition path
    // now that orders go straight to "processing" and stock is already reserved.

    // "Mark as Shipped" / "Mark as Delivered" are the only two manual admin
    // actions in the lifecycle — stamp the timestamp the customer-facing page reads.
    if (status === "shipped") update.shipped_at = new Date().toISOString();
    if (status === "delivered") update.delivered_at = new Date().toISOString();

    const { data: updatedOrder, error } = await db
      .from("orders")
      .update(update)
      .eq("id", id)
      .select("id, user_id, delivery_address")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stage 6 — notify the customer inline, in this same request, right after
    // the status write succeeds. No queue/trigger layer.
    if (status === "shipped" || status === "delivered") {
      let toEmail: string | null =
        (updatedOrder?.delivery_address as Record<string, string> | null)?.email ?? null;

      if (!toEmail && updatedOrder?.user_id) {
        const { data: authUser } = await db.auth.admin.getUserById(updatedOrder.user_id);
        toEmail = authUser?.user?.email ?? null;
      }

      if (toEmail) {
        let estimatedDeliveryDate: string | undefined;
        if (status === "shipped") {
          const { data: tx } = await db
            .from("transactions")
            .select("currency")
            .eq("order_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const isNGN = tx?.currency === "NGN";
          estimatedDeliveryDate = estimatedDeliveryLabel(isNGN);
        }

        const result = await sendOrderStatusEmail({
          to: toEmail,
          orderId: id,
          status,
          estimatedDeliveryDate,
        });
        if (!result.sent) console.error(`Order ${id} status email not sent:`, result.error);
      } else {
        console.warn(`No email on file for order ${id} — skipped status notification`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
