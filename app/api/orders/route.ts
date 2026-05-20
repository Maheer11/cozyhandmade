import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface OrderItemInput {
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  total_amount: number;
  delivery_address: Record<string, string>;
  payment_method: "bank_transfer" | "paystack_card" | "stripe_card" | "swift_transfer";
  order_ref: string;
  currency: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateOrderBody = await request.json();

    if (!body.items?.length || !body.total_amount || !body.order_ref) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Create the order
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        status: "pending",
        total_amount: body.total_amount,
        delivery_address: body.delivery_address,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 2. Create each order item
    const { error: itemsError } = await db
      .from("order_items")
      .insert(
        body.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      );

    if (itemsError) {
      console.error("Order items insert failed:", itemsError);
      await db.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Failed to save order items" }, { status: 500 });
    }

    // 3. Create the transaction record
    const { error: txError } = await db
      .from("transactions")
      .insert({
        order_id: order.id,
        user_id: user?.id ?? null,
        paystack_reference: body.order_ref,
        amount: body.total_amount,
        currency: body.currency,
        status: "pending",
        payment_channel: body.payment_method,
      });

    if (txError) {
      console.error("Transaction record failed (non-fatal):", txError);
    }

    // 4. Update logged-in user's total_spent and tier
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

        await db
          .from("profiles")
          .update({ total_spent: newTotal, tier: newTier })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_ref: body.order_ref,
    });

  } catch (err) {
    console.error("Unexpected error in /api/orders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
