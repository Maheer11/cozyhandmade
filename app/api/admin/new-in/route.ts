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
      .from("new_in_items")
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

    const { data, error } = await db
      .from("new_in_items")
      .insert({
        name:            body.name,
        product_image:   body.product_image,
        lifestyle_image: body.lifestyle_image || null,
        sold_out:        body.sold_out ?? false,
        is_handmade:     body.is_handmade ?? true,
        display_order:   Number(body.display_order ?? 0),
        price:           Number(body.price),
        discount_price:  body.discount_price !== undefined && body.discount_price !== null && body.discount_price !== ""
                            ? Number(body.discount_price) : null,
        colors:          body.colors ?? [],
        sizes:           body.sizes ?? [],
        description:     body.description ?? "",
        sku:             body.sku?.trim() || null,
        stock_quantity:  Number(body.stock_quantity ?? 0),
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
