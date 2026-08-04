// Customer/admin transactional email. Uses Resend's plain REST API via
// fetch — no SDK dependency, consistent with this repo's minimal-dependency
// style.
//
// THE CONTRACT EVERYTHING HERE DEPENDS ON: nothing in this module ever
// throws. Every path returns { sent: false, error } instead. The Stripe
// webhook calls into this inline, after the order is already committed and
// the event already marked terminal, and it must return 200 regardless of
// what an email provider does. A thrown error here would break that.
// If you add a code path, it must not be able to throw.

const RESEND_API_URL = "https://api.resend.com/emails";

// A hung provider, not a slow one, is the real risk to webhook latency —
// without this an unresponsive socket would stall the response until the
// platform killed the invocation. Resend normally answers in a few hundred
// milliseconds, so this only ever fires on a genuine fault.
const SEND_TIMEOUT_MS = 5000;

export interface SendResult {
  sent: boolean;
  error?: string;
}

interface SendEmailParams {
  /** One address, or several for a single email with multiple recipients. */
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}

/**
 * Parses a comma-separated recipient list from an environment variable.
 *
 * Returns [] for undefined/blank so callers can treat "not configured" and
 * "configured with nothing" identically. Trims, drops empties, and
 * de-duplicates — a repeated address would otherwise send someone the same
 * alert twice.
 */
export function parseRecipients(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const address = part.trim();
    if (address) seen.add(address);
  }
  return [...seen];
}

/**
 * Low-level send. Every template below goes through this.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY / RESEND_FROM_EMAIL not configured — skipping email send");
    return { sent: false, error: "Email service not configured" };
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
        subject: params.subject,
        text: params.text,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend email send failed:", res.status, body);
      return { sent: false, error: `Resend API error ${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    // Covers network faults AND the AbortSignal timeout above — both arrive
    // here as exceptions and must both become a returned result, never a
    // thrown one.
    console.error("Resend email request threw:", err);
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { sent: false, error: timedOut ? "Email send timed out" : "Network error sending email" };
  }
}

/* ─────────────────────────────────────────────────────────
   BUSINESS IDENTITY
   Supplied by the business owner. Do not invent or amend
   these — they are legal identifiers, not copy.
───────────────────────────────────────────────────────── */
const BUSINESS = {
  name: "Cozihandmade",
  addressLines: ["5B Belmayne Avenue, Parkside", "Dublin 13, D13 E6TW, Ireland"],
  registrationNumber: "790221",
  contactEmail: "mahmudmaryam70@gmail.com",
  phone: "+353 89 200 2517",
} as const;

// Replies go to the address the owner actually reads, not the technical
// verified-domain sender the `from:` header has to use.
const REPLY_TO = BUSINESS.contactEmail;

function businessBlock(): string {
  return [
    `  ${BUSINESS.name}`,
    ...BUSINESS.addressLines.map((l) => `  ${l}`),
    `  Company registration number: ${BUSINESS.registrationNumber}`,
    "",
    `  ${BUSINESS.contactEmail}`,
    `  ${BUSINESS.phone}`,
  ].join("\n");
}

/**
 * The statutory cancellation notice the EU Consumer Rights Directive
 * requires an order confirmation to carry.
 *
 * Unconditional by design. Every email this appears in is triggered by the
 * Stripe checkout, and everything sold through that checkout is standard
 * catalogue stock — bespoke commissions go through the /custom-order
 * enquiry form, which never reaches the cart or create-intent and so never
 * produces this email. There is therefore no item type to branch on.
 *
 * Three details here are load-bearing and should not be trimmed as
 * boilerplate:
 *
 *  - "including standard delivery" — the original outbound shipping must be
 *    refunded too, not just the item price.
 *  - Return postage may only be charged to the customer if they were told,
 *    which is what the return-postage sentence does.
 *  - The final paragraph keeps the made-to-specification exemption narrow.
 *    Choosing a colour from options shown on a product page is NOT a
 *    special order and does not remove the right — over-claiming that
 *    exemption is the expensive direction to get wrong.
 */
const WITHDRAWAL_RIGHTS = [
  "YOUR RIGHT TO CANCEL",
  "",
  "  You can cancel this order within 14 days of receiving it, for any",
  "  reason, and you don't have to give one.",
  "",
  `  To cancel, email ${BUSINESS.contactEmail} with your order number`,
  "  before those 14 days are up. A clear statement that you wish to",
  "  cancel is enough — a model cancellation form is available on request.",
  "",
  "  Send the items back within 14 days of telling us. Return postage is",
  "  at your cost, unless the item arrived faulty, damaged, or wasn't what",
  "  you ordered.",
  "",
  "  We'll refund everything you paid, including standard delivery, within",
  "  14 days of the items reaching us, to the card you paid with.",
  "",
  "  This is your legal right under EU consumer law. Our 30-day returns",
  "  policy sits alongside it as an additional promise, not a replacement.",
  "",
  "  Pieces made specially to your own specification — a bespoke",
  "  commission, or a combination we don't otherwise offer — are exempt",
  "  from this right. Choosing from the options shown on a product page",
  "  is not a special order.",
].join("\n");

const RULE = "────────────────────────────────";

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);
  } catch {
    // An unrecognised currency code must not take down an email send.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/* ─────────────────────────────────────────────────────────
   ORDER STATUS (existing — output deliberately unchanged)
───────────────────────────────────────────────────────── */
interface OrderStatusEmailParams {
  to: string;
  orderId: string;
  status: "shipped" | "delivered";
  estimatedDeliveryDate?: string; // only meaningful for "shipped"
}

export async function sendOrderStatusEmail(params: OrderStatusEmailParams): Promise<SendResult> {
  const ref = orderRef(params.orderId);
  const subject =
    params.status === "shipped"
      ? `Your order #${ref} has shipped!`
      : `Your order #${ref} has been delivered`;

  const lines = [`Order #${ref}`, `Status: ${params.status === "shipped" ? "Shipped" : "Delivered"}`];
  if (params.status === "shipped" && params.estimatedDeliveryDate) {
    lines.push(`Estimated delivery: ${params.estimatedDeliveryDate}`);
  }

  return sendEmail({ to: params.to, subject, text: lines.join("\n"), replyTo: REPLY_TO });
}

/* ─────────────────────────────────────────────────────────
   SHARED ORDER SHAPES
───────────────────────────────────────────────────────── */
export interface OrderEmailItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface DeliveryAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  email?: string;
}

// The customer-facing reference. Matches what sendOrderStatusEmail has
// always used, so the confirmation and the later "shipped" email agree.
export function orderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

function addressBlock(a: DeliveryAddress): string {
  return [
    [a.firstName, a.lastName].filter(Boolean).join(" "),
    a.address,
    [a.city, a.postcode].filter(Boolean).join(", "),
    a.country,
  ]
    .filter((l) => l && l.trim())
    .map((l) => `  ${l}`)
    .join("\n");
}

function itemLines(items: OrderEmailItem[], currency: string): string {
  return items
    .map((i) => `  ${i.product_name}  x${i.quantity}   ${formatMoney(i.unit_price * i.quantity, currency)}`)
    .join("\n");
}

/* ─────────────────────────────────────────────────────────
   ORDER CONFIRMATION
───────────────────────────────────────────────────────── */
export interface OrderConfirmationParams {
  to: string;
  orderId: string;
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
  /** Pricing currency for the figures above — always EUR today. */
  currency: string;
  /** What Stripe actually captured, in chargedCurrency. */
  chargedAmount: number;
  chargedCurrency: string;
  deliveryAddress: DeliveryAddress;
  estimatedDays: string;
  placedAt: Date;
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationParams): Promise<SendResult> {
  const ref = orderRef(params.orderId);
  const firstName = params.deliveryAddress.firstName?.trim() || "there";

  const totals = [
    `  Subtotal          ${formatMoney(params.subtotal, params.currency)}`,
    `  Shipping          ${formatMoney(params.shipping, params.currency)}`,
    `  Total paid        ${formatMoney(params.total, params.currency)}`,
  ];

  // Only mention the charge currency when it differs from the pricing
  // currency — for the common EUR case a second identical line would just
  // read as a duplicate charge.
  if (params.chargedCurrency.toUpperCase() !== params.currency.toUpperCase()) {
    totals.push(
      "",
      `  Charged as        ${formatMoney(params.chargedAmount, params.chargedCurrency)}`,
      "                    (converted at checkout)",
    );
  }

  const text = [
    `Hi ${firstName},`,
    "",
    "Thank you for your order. Every piece is made by hand, and yours is now",
    "being prepared with care.",
    "",
    RULE,
    `ORDER #${ref}`,
    `Placed ${params.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    RULE,
    "",
    "WHAT YOU ORDERED",
    "",
    itemLines(params.items, params.currency),
    "",
    ...totals,
    "",
    "Paid by card via Stripe.",
    "",
    "DELIVERING TO",
    "",
    addressBlock(params.deliveryAddress),
    "",
    `  Estimated delivery: ${params.estimatedDays}`,
    "",
    RULE,
    "",
    WITHDRAWAL_RIGHTS,
    "",
    RULE,
    "",
    "WHO YOU BOUGHT FROM",
    "",
    businessBlock(),
    "",
    "Questions about your order? Reply to this email and we'll help.",
  ].join("\n");

  return sendEmail({ to: params.to, subject: `Order confirmed — #${ref}`, text, replyTo: REPLY_TO });
}

/* ─────────────────────────────────────────────────────────
   REFUND NOTIFICATION (out of stock)
───────────────────────────────────────────────────────── */
export interface RefundNotificationParams {
  to: string;
  productName: string | null;
  amount: number;
  currency: string;
  deliveryAddress: DeliveryAddress;
}

export async function sendRefundNotificationEmail(params: RefundNotificationParams): Promise<SendResult> {
  const firstName = params.deliveryAddress.firstName?.trim() || "there";
  const item = params.productName?.trim() || "An item in your order";

  const text = [
    `Hi ${firstName},`,
    "",
    "I'm sorry — this is the email nobody wants to send.",
    "",
    `${item} sold out in the moments between your payment going through and`,
    "your order being finalised. Because every piece is handmade, we often",
    "have only one or two of a design, and occasionally two people reach the",
    "last one at the same time.",
    "",
    "Your payment has been refunded in full.",
    "",
    `  Refunded          ${formatMoney(params.amount, params.currency)}`,
    "  Back to           the card you paid with",
    "  Expected          5-10 business days, depending on your bank",
    "",
    "No order was created, and there is nothing you need to do. You have not",
    "been charged for anything.",
    "",
    "If the refund hasn't reached you within 10 business days, please reply",
    "to this email and we'll chase it with our payment provider.",
    "",
    "We'd love to make something for you another time.",
    "",
    RULE,
    "",
    businessBlock(),
  ].join("\n");

  return sendEmail({
    to: params.to,
    // No withdrawal-rights block: no order exists, so there is no contract
    // to withdraw from.
    subject: `Your payment has been refunded — ${item} sold out`,
    text,
    replyTo: REPLY_TO,
  });
}

/* ─────────────────────────────────────────────────────────
   ADMIN NEW-ORDER ALERT
───────────────────────────────────────────────────────── */
export interface AdminNewOrderParams {
  /** One or more addresses — a single email, not one per recipient. */
  to: string | string[];
  orderId: string;
  items: OrderEmailItem[];
  shipping: number;
  total: number;
  currency: string;
  deliveryAddress: DeliveryAddress;
  estimatedDays: string;
  placedAt: Date;
}

export async function sendAdminNewOrderEmail(params: AdminNewOrderParams): Promise<SendResult> {
  const ref = orderRef(params.orderId);
  const customerName = [params.deliveryAddress.firstName, params.deliveryAddress.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown";

  const text = [
    "New order received.",
    "",
    `  Order      #${ref}`,
    `  Placed     ${params.placedAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}`,
    `  Total      ${formatMoney(params.total, params.currency)}`,
    `  Customer   ${customerName} · ${params.deliveryAddress.email ?? "no email on file"}`,
    "",
    "ITEMS",
    "",
    itemLines(params.items, params.currency),
    "",
    "DELIVERING TO",
    "",
    addressBlock(params.deliveryAddress),
    "",
    `  Shipping charged: ${formatMoney(params.shipping, params.currency)} (${params.estimatedDays})`,
    "",
    "Mark as shipped in the dashboard when it goes out.",
  ].join("\n");

  return sendEmail({
    to: params.to,
    subject: `New order — ${formatMoney(params.total, params.currency)} — ${customerName}`,
    text,
  });
}
