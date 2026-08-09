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

    // id/slug is intentionally not accepted here — see POST's comment on
    // why it's locked once created.
    const update: Record<string, unknown> = {};
    if (body.name          !== undefined) update.name          = body.name.trim();
    if (body.description   !== undefined) update.description   = body.description;
    if (body.display_order !== undefined) update.display_order = Number(body.display_order);
    if (body.image         !== undefined) {
      // Empty string clears the manual override, putting the category back
      // into auto mode (falls back to its most recent product's image).
      update.image = body.image?.trim() || null;
    }

    const { error } = await db.from("categories").update(update).eq("id", id);
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

    // products.category is a free-text column, not a foreign key, so the
    // database won't stop this delete on its own — it would just leave
    // those products with a category id that no longer resolves to
    // anything. Block it here instead.
    const [{ count: productCount }, { count: customCount }] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("category", id),
      db.from("custom_products").select("id", { count: "exact", head: true }).eq("category", id),
    ]);
    const total = (productCount ?? 0) + (customCount ?? 0);
    if (total > 0) {
      return NextResponse.json(
        { error: `${total} product${total === 1 ? "" : "s"} still use this category. Move or delete them first.` },
        { status: 400 }
      );
    }

    const { error } = await db.from("categories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
