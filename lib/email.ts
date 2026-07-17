// Order-status customer notifications (Stage 6). Called inline, in the same
// request, right after an admin status update succeeds — no queue/trigger layer.
// Uses Resend's plain REST API via fetch — no SDK dependency needed, consistent
// with this repo's existing minimal-dependency style.

const RESEND_API_URL = "https://api.resend.com/emails";

interface OrderStatusEmailParams {
  to: string;
  orderId: string;
  status: "shipped" | "delivered";
  estimatedDeliveryDate?: string; // only meaningful for "shipped"
}

export async function sendOrderStatusEmail(
  params: OrderStatusEmailParams
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY / RESEND_FROM_EMAIL not configured — skipping order status email");
    return { sent: false, error: "Email service not configured" };
  }

  const ref = params.orderId.slice(0, 8).toUpperCase();
  const subject =
    params.status === "shipped"
      ? `Your order #${ref} has shipped!`
      : `Your order #${ref} has been delivered`;

  const lines = [`Order #${ref}`, `Status: ${params.status === "shipped" ? "Shipped" : "Delivered"}`];
  if (params.status === "shipped" && params.estimatedDeliveryDate) {
    lines.push(`Estimated delivery: ${params.estimatedDeliveryDate}`);
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject,
        text: lines.join("\n"),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend email send failed:", res.status, body);
      return { sent: false, error: `Resend API error ${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error("Resend email request threw:", err);
    return { sent: false, error: "Network error sending email" };
  }
}
