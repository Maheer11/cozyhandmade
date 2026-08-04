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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const body = await request.json();

    const update: Record<string, unknown> = {};
    if (body.name          !== undefined) update.name           = body.name;
    if (body.price         !== undefined) update.price          = Number(body.price);
    if (body.original_price !== undefined) update.original_price = body.original_price ? Number(body.original_price) : null;
    if (body.category      !== undefined) update.category       = body.category;
    if (body.description   !== undefined) update.description    = body.description;
    if (body.details       !== undefined) update.details        = body.details;
    if (body.tags          !== undefined) update.tags           = body.tags;
    if (body.image         !== undefined) update.image          = body.image;
    if (body.images        !== undefined) update.images         = body.images;
    if (body.stock_quantity !== undefined) update.stock_quantity = Number(body.stock_quantity);
    if (body.colors        !== undefined) update.colors         = body.colors;
    if (body.sizes         !== undefined) update.sizes          = body.sizes;
    if (body.variant_stock !== undefined) update.variant_stock  = body.variant_stock;
    if (body.variant_price !== undefined) update.variant_price  = body.variant_price;
    if (body.featured      !== undefined) update.featured       = body.featured;
    if (body.is_handmade   !== undefined) update.is_handmade    = body.is_handmade;
    if (body.rating        !== undefined) update.rating         = Number(body.rating);
    if (body.review_count  !== undefined) update.review_count   = Number(body.review_count);
    if (body.shipping_weight_grams !== undefined) {
      update.shipping_weight_grams = body.shipping_weight_grams === null || body.shipping_weight_grams === ""
        ? null : Number(body.shipping_weight_grams);
    }

    const { error } = await db.from("products").update(update).eq("id", id);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
