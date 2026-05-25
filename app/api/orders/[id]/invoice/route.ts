import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { renderToBuffer }    from "@react-pdf/renderer";
import { InvoiceDocument }   from "@/lib/invoice-pdf";
import { NextResponse }      from "next/server";
import React                 from "react";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth — user must be logged in AND own the order (or be admin)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient() as any;

  const { data: order, error } = await db
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price, subtotal)")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin && order.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull latest transaction for payment channel + reference
  const { data: tx } = await db
    .from("transactions")
    .select("payment_channel, paystack_reference")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invoiceData = {
    orderId:            order.id,
    createdAt:          order.created_at,
    status:             order.status,
    items:              order.order_items ?? [],
    total_amount:       order.total_amount,
    delivery_address:   order.delivery_address ?? null,
    payment_channel:    tx?.payment_channel  ?? null,
    paystack_reference: tx?.paystack_reference ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(InvoiceDocument, { data: invoiceData }) as any;
  const buffer  = await renderToBuffer(element);
  const ref     = order.id.slice(0, 8).toUpperCase();
  const uint8   = new Uint8Array(buffer);

  return new Response(uint8, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${ref}.pdf"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
