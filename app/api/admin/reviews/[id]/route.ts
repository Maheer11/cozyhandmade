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

    if (body.platform !== undefined && body.platform !== "whatsapp" && body.platform !== "instagram") {
      return NextResponse.json({ error: "Platform must be whatsapp or instagram" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body.screenshot     !== undefined) update.screenshot     = body.screenshot;
    if (body.platform       !== undefined) update.platform       = body.platform;
    if (body.customer_label !== undefined) update.customer_label = body.customer_label?.trim() || null;
    if (body.location       !== undefined) update.location       = body.location?.trim() || null;
    if (body.review_date    !== undefined) update.review_date    = body.review_date?.trim() || null;
    if (body.rating         !== undefined) update.rating         = body.rating === null || body.rating === "" ? null : Number(body.rating);
    if (body.display_order  !== undefined) update.display_order  = Number(body.display_order);

    const { error } = await db.from("reviews").update(update).eq("id", id);
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
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
