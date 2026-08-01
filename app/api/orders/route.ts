import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateSpendTier } from "@/lib/checkout/updateSpendTier";
import { repriceItems, RepriceError, type CheckoutItemInput } from "@/lib/checkout/repriceItems";
import { calculateShipping, isDublinPickupEligible, type ShippingItemInput } from "@/lib/checkout/shipping";
import { getServerRates } from "@/lib/currency/exchangeRateClient";
import { convertPrice } from "@/lib/currency/pricingUtils";
import type { CurrencyCode } from "@/lib/currency/types";
import { NextResponse } from "next/server";

interface CreateOrderBody {
  items: CheckoutItemInput[]; // unit_price is client input — never trusted, recomputed below
  delivery_address: Record<string, string>;
  payment_method: "bank_transfer" | "swift_transfer";
  order_ref: string;
  currency: CurrencyCode;
  // "pickup" only ever honoured if isDublinPickupEligible(delivery_address)
  // independently confirms it below — never taken on the client's word.
  delivery_method?: "courier" | "pickup";
}

export async function POST(request: Request) {
  try {
    const body: CreateOrderBody = await request.json();

    if (!body.items?.length || !body.order_ref) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!body.delivery_address) {
      return NextResponse.json({ error: "Missing delivery address" }, { status: 400 });
    }

    // Admin client bypasses RLS — safe here because this is a server-side API route
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    // Auth client just to read the current user (may be null for guest checkout)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Recompute the real subtotal server-side — body.items[].unit_price is
    // client input and is never trusted for pricing (same guarantee the
    // Stripe create-intent route gives; bank transfer has no card network to
    // verify the charge against, so this recomputation is the only check
    // there is on what actually gets recorded).
    let verifiedItems, verifiedTotal;
    try {
      ({ verifiedItems, verifiedTotal } = await repriceItems(db, body.items));
    } catch (err) {
      if (err instanceof RepriceError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Shipping — same weight-based calculation and the same shared module as
    // the Stripe path, from the weights repriceItems just verified and the
    // delivery country. No client-submitted total is used anywhere below.
    const shippingItems: ShippingItemInput[] = verifiedItems.map((item) => ({
      quantity: item.quantity,
      shippingWeightGrams: item.shipping_weight_grams,
      productName: item.product_name,
    }));
    const shippingQuote = calculateShipping(shippingItems, body.delivery_address.country);
    // Free Dublin pickup — re-derived from the delivery address itself, not
    // trusted from body.delivery_method alone, same guarantee as create-intent.
    const isPickup = body.delivery_method === "pickup" && isDublinPickupEligible(body.delivery_address as { country: string; city?: string; postcode?: string });
    const shippingEUR = isPickup ? 0 : shippingQuote.priceEUR;
    const orderTotalEUR = verifiedTotal + shippingEUR;

    // Convert the verified EUR total to the customer's currency for the
    // transaction record — what the bank-transfer instructions actually told
    // them to send. There's no card network confirming this was received (a
    // human checks the bank statement separately), so unlike Stripe there's
    // no independent charge to cross-check against — this conversion is the
    // authoritative figure for what should have been transferred.
    const { rates } = await getServerRates();
    const rate = rates[body.currency] ?? { base: "EUR" as const, currency: body.currency, rate: 1, fetchedAt: Date.now(), source: "fallback" as const };
    const chargedAmount = body.currency === "EUR" ? orderTotalEUR : convertPrice(orderTotalEUR, rate, body.currency);

    // 1. Create the order
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        status: "pending",
        total_amount: orderTotalEUR,
        delivery_address: body.delivery_address,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 2. Create each order item — from the server-verified snapshot, not the
    // client's. order_items.product_id has a FK to products(id) — a
    // new_in_items id would violate it, so New In items are stored the same
    // way any non-catalog line item is: product_id null, with the
    // name/image/price snapshot fields set.
    const { error: itemsError } = await db
      .from("order_items")
      .insert(
        verifiedItems.map((item) => ({
          order_id: order.id,
          product_id: item.item_type === "new_in" ? null : item.ref_id,
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
        stripe_session_id: body.order_ref,
        amount: chargedAmount,
        currency: body.currency,
        status: "pending",
        payment_channel: body.payment_method,
      });

    if (txError) {
      console.error("Transaction record failed (non-fatal):", txError);
    }

    // 4. Update logged-in user's total_spent and tier
    if (user) {
      await updateSpendTier(db, user.id, orderTotalEUR);
    }

    // Same fields /api/payments/stripe/status returns on "completed" — the
    // confirmation screen reads from these DB-verified figures for every
    // payment path, not from a client-side recomputation, regardless of
    // whether the order arrived via this synchronous route or via the
    // Stripe webhook's async polling.
    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_ref: body.order_ref,
      total_amount_eur: orderTotalEUR,
      charged_amount: chargedAmount,
      currency: body.currency,
      payment_channel: body.payment_method,
    });

  } catch (err) {
    console.error("Unexpected error in /api/orders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
