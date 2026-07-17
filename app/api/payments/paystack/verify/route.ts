import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getServerRates } from "@/lib/currency/exchangeRateClient";
import { convertPrice } from "@/lib/currency/pricingUtils";
import { NextResponse } from "next/server";

interface VerifyBody {
  reference: string;
  items: {
    product_id: string; // products.id OR new_in_items.id, depending on `source`
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number; // client-submitted — NEVER trusted, recomputed below
    source?: "product" | "new_in";
    variant?: string; // selected size/tier key into variant_price, if any
  }[];
  total_amount: number; // client-submitted — NEVER trusted, recomputed below
  delivery_address: Record<string, string>;
  currency: string;
}

// Max allowed drift between the recomputed total (converted to NGN) and
// Paystack's confirmed charge before we fail closed and reject the order.
// A flat floor (matches the nearest-100 NGN luxury-rounding step) plus a
// percentage allowance for exchange-rate drift between when the client
// priced the order (its rate can be cached up to 6h) and this server-side
// re-verification.
const ROUNDING_TOLERANCE_NGN = 100;
const RATE_DRIFT_TOLERANCE_PCT = 0.03;

export async function POST(request: Request) {
  try {
    const body: VerifyBody = await request.json();

    if (!body.reference) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }
    if (!body.items?.length) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
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

    const db = createAdminClient() as any;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Recompute the real total server-side. body.items[].unit_price and
    //    body.total_amount are client input and are never trusted for pricing.
    //    Two independent sources of truth here: real catalogue products, and
    //    standalone New In items (own price/discount_price, no products link).
    const productItems = body.items.filter((i) => (i.source ?? "product") === "product");
    const newInItems = body.items.filter((i) => i.source === "new_in");

    const productIds = [...new Set(productItems.map((i) => i.product_id))];
    const newInIds = [...new Set(newInItems.map((i) => i.product_id))];

    const [{ data: products, error: productsError }, { data: newInRows, error: newInError }] = await Promise.all([
      productIds.length
        ? db.from("products").select("id, name, price, variant_price").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      newInIds.length
        ? db.from("new_in_items").select("id, name, price, discount_price, variant_price").in("id", newInIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (
      productsError || newInError ||
      !products || products.length !== productIds.length ||
      !newInRows || newInRows.length !== newInIds.length
    ) {
      console.error("Verify: item lookup mismatch for ref", body.reference, productsError, newInError);
      // TODO: trigger a refund via Paystack's refund API here — the charge succeeded
      // but the order references an item that no longer exists, so it can't be fulfilled.
      return NextResponse.json(
        { error: "One or more items in this order are no longer available. Contact us with ref: " + body.reference },
        { status: 400 }
      );
    }

    type ProductRow = { id: string; name: string; price: number; variant_price: Record<string, number> | null };
    type NewInRow = { id: string; name: string; price: number; discount_price: number | null; variant_price: Record<string, number> | null };

    const productById = new Map<string, ProductRow>((products as ProductRow[]).map((p) => [p.id, p]));
    const newInById = new Map<string, NewInRow>((newInRows as NewInRow[]).map((p) => [p.id, p]));

    let verifiedTotal = 0;
    const verifiedItems = body.items.map((item) => {
      const source = item.source ?? "product";
      let realPrice: number;

      if (source === "new_in") {
        const row = newInById.get(item.product_id)!;
        // A selected size/tier's own price wins over discount_price/price —
        // same precedence as the storefront detail page.
        realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
          ? row.variant_price[item.variant]
          : (row.discount_price ?? row.price);
      } else {
        const row = productById.get(item.product_id)!;
        realPrice = (item.variant && row.variant_price?.[item.variant] !== undefined)
          ? row.variant_price[item.variant]
          : row.price;
      }

      verifiedTotal += realPrice * item.quantity;
      return {
        item_type: source,
        ref_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        unit_price: realPrice, // ← server-verified price; client's value is discarded
      };
    });

    // 3. Convert the recomputed total (EUR — the base currency every price is
    //    stored/entered in) to NGN, since Paystack only ever charges NGN, then
    //    compare to what Paystack actually confirmed was charged (kobo → NGN).
    //    Fail closed on any meaningful mismatch.
    const { rates } = await getServerRates();
    const ngnRate = rates.NGN ?? { base: "EUR" as const, currency: "NGN" as const, rate: 0, fetchedAt: Date.now(), source: "fallback" as const };
    const verifiedTotalNGN = convertPrice(verifiedTotal, ngnRate, "NGN");

    const paystackConfirmedAmount = paystackData.data.amount / 100;
    const amountDiff = Math.abs(paystackConfirmedAmount - verifiedTotalNGN);
    const tolerance = Math.max(ROUNDING_TOLERANCE_NGN, verifiedTotalNGN * RATE_DRIFT_TOLERANCE_PCT);

    if (amountDiff > tolerance) {
      console.error(
        `Payment amount mismatch on ref ${body.reference}: Paystack charged ₦${paystackConfirmedAmount}, ` +
        `recomputed total is €${verifiedTotal} (₦${verifiedTotalNGN} at current rate) — rejecting, no order created.`
      );
      // TODO: trigger a refund via Paystack's refund API here — the charge succeeded
      // but doesn't match real product prices, so the customer should be refunded automatically.
      return NextResponse.json(
        {
          error:
            "Payment amount could not be verified against current prices. This order was not placed and will be reviewed for a refund.",
        },
        { status: 400 }
      );
    }

    // 4. Atomically lock stock, verify availability, decrement it, and create
    //    the order + order_items + transaction — all in one Postgres function
    //    call (see checkout_verified_order() in lib/supabase/schema.sql). This
    //    replaces the old "read stock, then separately update stock" logic,
    //    which was a race condition under concurrent checkouts.
    const { data: orderId, error: rpcError } = await db.rpc("checkout_verified_order", {
      p_user_id: user?.id ?? null,
      p_total_amount: verifiedTotal,
      p_charged_amount: verifiedTotalNGN,
      p_delivery_address: body.delivery_address,
      p_currency: body.currency ?? "NGN",
      p_paystack_reference: body.reference,
      p_payment_channel: paystackData.data.channel ?? "card",
      p_items: verifiedItems,
    });

    if (rpcError) {
      if (rpcError.message?.startsWith("OUT_OF_STOCK:")) {
        const productName = rpcError.message.split("OUT_OF_STOCK:")[1]?.trim();
        // TODO: trigger a refund via Paystack's refund API here — the charge succeeded
        // but stock ran out before it could be reserved, so the customer needs a refund.
        return NextResponse.json(
          { error: `Sorry, ${productName} just sold out. Payment will be refunded.` },
          { status: 400 }
        );
      }
      console.error("checkout_verified_order RPC failed for ref", body.reference, rpcError);
      return NextResponse.json(
        { error: "Payment confirmed but order save failed — contact us with ref: " + body.reference },
        { status: 500 }
      );
    }

    // 5. Update logged-in user's spend + tier (unchanged logic, now using the verified total)
    if (user) {
      const { data: profile } = await db
        .from("profiles")
        .select("total_spent")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newTotal = (profile.total_spent ?? 0) + verifiedTotal;
        const newTier = newTotal >= 750 ? "vip"
                       : newTotal >= 400 ? "gold"
                       : newTotal >= 100 ? "silver"
                       : "bronze";
        await db.from("profiles").update({ total_spent: newTotal, tier: newTier }).eq("id", user.id);
      }
    }

    return NextResponse.json({ success: true, order_id: orderId });

  } catch (err) {
    console.error("Paystack verify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
