import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Polled by the browser after stripe.confirmPayment() resolves. The webhook
// is the only thing that ever creates an order (or issues a refund) — this
// route just lets the UI know once that has actually happened, so the
// confirmation screen never shows before a real order exists, and so a
// customer whose item sold out mid-checkout sees the truth (refunded, not
// charged) instead of polling forever for an order that was never going to
// be created by design.
export async function GET(request: Request) {
  const paymentIntentId = new URL(request.url).searchParams.get("payment_intent_id");
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment_intent_id" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db
    .from("transactions")
    .select("order_id, amount, currency, payment_channel")
    .eq("stripe_session_id", paymentIntentId)
    .maybeSingle();

  if (transaction) {
    // total_amount is always the base EUR ledger figure (see orders'
    // schema comment) regardless of what currency was actually charged —
    // the confirmation screen needs both: the real charged amount/currency
    // for display, and the EUR figure only incidentally.
    const { data: order } = await db
      .from("orders")
      .select("total_amount")
      .eq("id", transaction.order_id)
      .maybeSingle();

    return NextResponse.json({
      status: "completed",
      order_id: transaction.order_id,
      total_amount_eur: order?.total_amount ?? null,
      charged_amount: transaction.amount,
      currency: transaction.currency,
      payment_channel: transaction.payment_channel,
    });
  }

  // Checked BEFORE the generic "still pending" branch — a refunded,
  // out-of-stock order still has its pending_stripe_orders row (kept, not
  // deleted, for reconciliation — see the refund migration's comment), so
  // without this check it would otherwise fall into "pending" forever,
  // which is exactly the bug this endpoint exists to fix.
  const { data: refund } = await db
    .from("refunds")
    .select("reason, product_name, amount, currency, status")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (refund && refund.status === "succeeded") {
    return NextResponse.json({
      status: "refunded",
      reason: refund.reason,
      product_name: refund.product_name,
      amount: refund.amount,
      currency: refund.currency,
    });
  }

  const { data: pending } = await db
    .from("pending_stripe_orders")
    .select("payment_intent_id")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (pending) {
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json({ status: "unknown" });
}
