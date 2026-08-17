import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/isAdmin";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient() as any;
    const { data, error } = await db.from("categories").select("*").order("display_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ categories: data });
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

    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const baseSlug = slugify(body.name);
    if (!baseSlug) return NextResponse.json({ error: "Name must contain at least one letter or number" }, { status: 400 });

    // id/slug is assigned once here and never editable afterward — products
    // reference it by this value, so changing it later would silently
    // orphan every product already tagged with the old id.
    let id = baseSlug;
    for (let suffix = 2; suffix <= 50; suffix++) {
      const { data: existing } = await db.from("categories").select("id").eq("id", id).maybeSingle();
      if (!existing) break;
      id = `${baseSlug}-${suffix}`;
    }

    const { data, error } = await db
      .from("categories")
      .insert({
        id,
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        image: body.image?.trim() || null,
        display_order: Number(body.display_order ?? 0),
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
