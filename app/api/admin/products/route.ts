import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isAdmin(email: string | undefined) {
  return email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ products: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const body = await request.json();

    const { data, error } = await db
      .from("products")
      .insert({
        name:           body.name,
        price:          Number(body.price),
        original_price: body.original_price ? Number(body.original_price) : null,
        category:       body.category,
        description:    body.description ?? null,
        details:        body.details ?? [],
        tags:           body.tags ?? [],
        image:          body.image ?? null,
        images:         body.images ?? [],
        stock_quantity: Number(body.stock_quantity ?? 0),
        colors:         body.colors ?? [],
        sizes:          body.sizes ?? [],
        variant_stock:  body.variant_stock ?? {},
        featured:       body.featured ?? false,
        rating:         Number(body.rating ?? 5.0),
        review_count:   Number(body.review_count ?? 0),
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
