import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/isAdmin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const body = await request.json();

    const update: Record<string, unknown> = {};
    if (body.name            !== undefined) update.name            = body.name;
    if (body.product_image   !== undefined) update.product_image   = body.product_image;
    if (body.lifestyle_image !== undefined) update.lifestyle_image = body.lifestyle_image || null;
    if (body.sold_out        !== undefined) update.sold_out        = body.sold_out;
    if (body.is_handmade     !== undefined) update.is_handmade     = body.is_handmade;
    if (body.show_on_homepage !== undefined) update.show_on_homepage = !!body.show_on_homepage;
    if (body.display_order   !== undefined) update.display_order   = Number(body.display_order);
    if (body.price           !== undefined) update.price           = Number(body.price);
    if (body.discount_price  !== undefined) {
      update.discount_price = body.discount_price === null || body.discount_price === ""
        ? null : Number(body.discount_price);
    }
    if (body.colors          !== undefined) update.colors          = body.colors;
    if (body.sizes           !== undefined) update.sizes           = body.sizes;
    if (body.description     !== undefined) update.description     = body.description;
    if (body.sku             !== undefined) update.sku             = body.sku?.trim() || null;
    if (body.variant_price   !== undefined) update.variant_price   = body.variant_price;

    // body.stock_quantity is deliberately ignored, not forwarded:
    // featured_pieces.stock_quantity is deprecated (migration 013) and stock
    // belongs to the linked product. A stale client still sending it must not
    // be able to resurrect the second counter.
    if (body.product_id !== undefined) {
      const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";
      // Explicitly clearing the link is not offered: a piece with no stock
      // source is unsellable, and silently accepting "" would turn a UI slip
      // into a listing that fails at checkout.
      if (!productId) {
        return NextResponse.json({ error: "Pick the product this piece takes its stock from" }, { status: 400 });
      }
      const { data: linkedProduct } = await db
        .from("products")
        .select("id")
        .eq("id", productId)
        .maybeSingle();
      if (!linkedProduct) {
        return NextResponse.json({ error: "That product no longer exists, pick another" }, { status: 400 });
      }
      update.product_id = productId;
    }

    if (body.shipping_weight_grams !== undefined) {
      update.shipping_weight_grams = body.shipping_weight_grams === null || body.shipping_weight_grams === ""
        ? null : Number(body.shipping_weight_grams);
    }
    if (body.added_to_collections !== undefined) update.added_to_collections = !!body.added_to_collections;

    const { error } = await db.from("featured_pieces").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const { error } = await db.from("featured_pieces").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
