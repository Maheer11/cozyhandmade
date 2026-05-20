import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface VerifyBody {
  reference: string;
  items: {
    product_id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
  }[];
  total_amount: number;
  delivery_address: Record<string, string>;
  currency: string;
}

export async function POST(request: Request) {
  try {
    const body: VerifyBody = await request.json();

    if (!body.reference) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_your")) {
      return NextResponse.json({ error: "Paystack is not configured yet" }, { status: 503 });
    }

    // 1. Verify the payment with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      }
    );

    if (!paystackRes.ok) {
      return NextResponse.json({ error: "Could not reach Paystack to verify payment" }, { status: 502 });
    }

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== "success") {
      return NextResponse.json(
        { error: `Payment not confirmed by Paystack (status: ${paystackData.data?.status ?? "unknown"})` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Create the order — status is "paid" immediately (Paystack confirmed it)
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        status: "paid",
        total_amount: body.total_amount,
        delivery_address: body.delivery_address,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed after Paystack verify:", orderError);
      return NextResponse.json({ error: "Payment confirmed but order save failed — contact us with ref: " + body.reference }, { status: 500 });
    }

    // 3. Create order items
    await db.from("order_items").insert(
      body.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );

    // 4. Create transaction record — status "success", channel from Paystack response
    await db.from("transactions").insert({
      order_id:           order.id,
      user_id:            user?.id ?? null,
      paystack_reference: body.reference,
      amount:             body.total_amount,
      currency:           body.currency ?? "NGN",
      status:             "success",
      payment_channel:    paystackData.data.channel ?? "card",
      paid_at:            new Date().toISOString(),
    });

    // 5. Update logged-in user's spend + tier
    if (user) {
      const { data: profile } = await db
        .from("profiles")
        .select("total_spent")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newTotal = (profile.total_spent ?? 0) + body.total_amount;
        const newTier  = newTotal >= 1_000_000 ? "vip"
                       : newTotal >= 500_000   ? "gold"
                       : newTotal >= 150_000   ? "silver"
                       : "bronze";
        await db.from("profiles").update({ total_spent: newTotal, tier: newTier }).eq("id", user.id);
      }
    }

    return NextResponse.json({ success: true, order_id: order.id });

  } catch (err) {
    console.error("Paystack verify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
