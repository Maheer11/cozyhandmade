import { createClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const db = createClient() as any;
    const body = await request.json();

    const { error, data } = await db
      .from("custom_products")
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating custom product:", error);
    return NextResponse.json({ error: "Failed to create custom product" }, { status: 500 });
  }
}
