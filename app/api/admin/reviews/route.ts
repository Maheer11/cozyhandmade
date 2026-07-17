import { createAdminClient } from "@/lib/supabase/admin";
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

    const db = createAdminClient() as any;
    const { data, error } = await db
      .from("reviews")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reviews: data });
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

    const db = createAdminClient() as any;
    const body = await request.json();

    if (!body.screenshot?.trim()) return NextResponse.json({ error: "Screenshot image is required" }, { status: 400 });
    if (body.platform !== "whatsapp" && body.platform !== "instagram") {
      return NextResponse.json({ error: "Platform must be whatsapp or instagram" }, { status: 400 });
    }

    const { data, error } = await db
      .from("reviews")
      .insert({
        screenshot:     body.screenshot,
        platform:       body.platform,
        customer_label: body.customer_label?.trim() || null,
        location:       body.location?.trim() || null,
        review_date:    body.review_date?.trim() || null,
        rating:         body.rating !== undefined && body.rating !== null && body.rating !== ""
                          ? Number(body.rating) : 5,
        display_order:  Number(body.display_order ?? 0),
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
