import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isAdmin(email: string | undefined) {
  return email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

const VALID_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check uses anon client; DB writes use service-role to bypass RLS
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status, notes } = await request.json();

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = createAdminClient() as any;
    const update: Record<string, string> = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const { error } = await db.from("orders").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
