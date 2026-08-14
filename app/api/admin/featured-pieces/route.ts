import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/isAdmin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const { data, error } = await db
      .from("featured_pieces")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const body = await request.json();

    if (!body.name?.trim())          return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!body.product_image?.trim()) return NextResponse.json({ error: "Product image is required" }, { status: 400 });
    if (body.price === undefined || body.price === null || Number.isNaN(Number(body.price))) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    // Stock source is mandatory. Featured pieces have carried no stock counter
    // of their own since migration 013 — one created without a product_id
    // would be a listing with no stock at all, and checkout would reject it
    // (UNLINKED_FEATURED_PIECE) only after the customer had been charged. The
    // FK would catch a bogus id, but as an opaque 500; this returns something
    // the admin form can actually show.
    const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";
    if (!productId) {
      return NextResponse.json({ error: "Pick the product this piece takes its stock from" }, { status: 400 });
    }
    const { data: linkedProduct } = await db
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();
    if (!linkedProduct) {
      return NextResponse.json({ error: "That product no longer exists — pick another" }, { status: 400 });
    }

    const { data, error } = await db
      .from("featured_pieces")
      .insert({
        name:            body.name,
        product_image:   body.product_image,
        lifestyle_image: body.lifestyle_image || null,
        sold_out:        body.sold_out ?? false,
        is_handmade:     body.is_handmade ?? true,
        show_on_homepage: body.show_on_homepage ?? false,
        display_order:   Number(body.display_order ?? 0),
        price:           Number(body.price),
        discount_price:  body.discount_price !== undefined && body.discount_price !== null && body.discount_price !== ""
                            ? Number(body.discount_price) : null,
        colors:          body.colors ?? [],
        sizes:           body.sizes ?? [],
        description:     body.description ?? "",
        sku:             body.sku?.trim() || null,
        // No stock_quantity — deliberately. featured_pieces.stock_quantity is
        // deprecated (migration 013) and this route must never write it again;
        // stock lives on the linked product below.
        product_id:      productId,
        variant_price:   body.variant_price ?? {},
        shipping_weight_grams: body.shipping_weight_grams !== undefined && body.shipping_weight_grams !== null && body.shipping_weight_grams !== ""
                            ? Number(body.shipping_weight_grams) : null,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
