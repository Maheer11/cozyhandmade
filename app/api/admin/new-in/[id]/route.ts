import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isAdmin(email: string | undefined) {
  return email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const body = await request.json();

    const update: Record<string, unknown> = {};
    if (body.name            !== undefined) update.name            = body.name;
    if (body.product_image   !== undefined) update.product_image   = body.product_image;
    if (body.lifestyle_image !== undefined) update.lifestyle_image = body.lifestyle_image || null;
    if (body.sold_out        !== undefined) update.sold_out        = body.sold_out;
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
    if (body.stock_quantity  !== undefined) update.stock_quantity  = Number(body.stock_quantity);
    if (body.variant_price   !== undefined) update.variant_price   = body.variant_price;

    const { error } = await db.from("new_in_items").update(update).eq("id", id);
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
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const { error } = await db.from("new_in_items").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
