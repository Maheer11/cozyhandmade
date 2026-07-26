import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Polled by the browser after stripe.confirmPayment() resolves. The webhook
// is the only thing that ever creates an order — this route just lets the
// UI know once that has actually happened, so the confirmation screen never
// shows before a real order exists.
export async function GET(request: Request) {
  const paymentIntentId = new URL(request.url).searchParams.get("payment_intent_id");
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment_intent_id" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db
    .from("transactions")
    .select("order_id")
    .eq("stripe_session_id", paymentIntentId)
    .maybeSingle();

  if (transaction) {
    return NextResponse.json({ status: "completed", order_id: transaction.order_id });
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
