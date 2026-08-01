"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe/client";
import { useCart } from "@/components/CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { socialLinks, whatsappLink } from "@/lib/social-links";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import type { } from "@/lib/products";
import type { CheckoutPricing, CurrencyCode } from "@/lib/currency/types";
import { formatCurrency } from "@/lib/currency/pricingUtils";
import { CURRENCIES } from "@/lib/currency/constants";
import { calculateShipping, isDublinPickupEligible, type ShippingItemInput, type ShippingZone } from "@/lib/checkout/shipping";

/* ─── Types ─────────────────────────────────────────────── */
type CheckoutMode  = "nigerian" | "international";
// "refunded" — the item sold out mid-checkout; the webhook already
// refunded automatically and no order was (or ever will be) created. A
// distinct step from "confirmation", which always implies a real order.
type Step          = "shipping" | "payment" | "confirmation" | "refunded";
type IntlPayMethod = "bank-transfer" | "stripe-card";
type ShipInfo = {
  firstName: string; lastName: string; email: string; phone: string;
  address: string; city: string; postcode: string; country: string; state: string;
};

// DB-verified order summary — returned by whichever endpoint actually
// created the order (Stripe path: /api/payments/stripe/status once the
// webhook has run; bank-transfer paths: /api/orders directly, since those
// create synchronously). The confirmation screen reads ONLY from this, for
// every payment path, never from a client-side recomputed value — see the
// "Total Paid" bug this replaces.
interface OrderConfirmationSummary {
  totalAmountEUR: number | null;
  chargedAmount: number;
  currency: CurrencyCode;
  paymentChannel: string;
}

/* ─── International bank account details (from env) ─────── */
const BANK: Record<string, { label: string; network: string; fields: [string, string][] }> = {
  EUR: {
    label:   "EUR — SEPA Transfer",
    network: "SEPA · arrives same/next business day",
    fields:  [
      ["IBAN",     process.env.NEXT_PUBLIC_BANK_EUR_IBAN ?? ""],
      ["BIC/SWIFT",process.env.NEXT_PUBLIC_BANK_EUR_BIC  ?? ""],
      ["Name",     process.env.NEXT_PUBLIC_BANK_EUR_NAME ?? ""],
    ],
  },
  GBP: {
    label:   "GBP — UK Bank Transfer",
    network: "Faster Payments · arrives within hours",
    fields:  [
      ["Sort Code", process.env.NEXT_PUBLIC_BANK_GBP_SORT    ?? ""],
      ["Account",   process.env.NEXT_PUBLIC_BANK_GBP_ACCOUNT ?? ""],
      ["Name",      process.env.NEXT_PUBLIC_BANK_GBP_NAME    ?? ""],
    ],
  },
  USD: {
    label:   "USD — US Bank Transfer (ACH)",
    network: "ACH · arrives 1–2 business days",
    fields:  [
      ["Routing No.", process.env.NEXT_PUBLIC_BANK_USD_ROUTING ?? ""],
      ["Account No.", process.env.NEXT_PUBLIC_BANK_USD_ACCOUNT ?? ""],
      ["Name",        process.env.NEXT_PUBLIC_BANK_USD_NAME    ?? ""],
    ],
  },
};

const STEPS = [
  { key: "shipping" as Step, label: "Shipping", n: 1 },
  { key: "payment"  as Step, label: "Payment",  n: 2 },
  { key: "confirmation" as Step, label: "Confirm", n: 3 },
];

const NG_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT – Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];
const NG_STATE_OPTIONS = NG_STATES.map((s) => ({ value: s, label: s }));

const COUNTRY_OPTIONS = [
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "Other", label: "Other" },
];

/* ═════════════════════════════════════════════════════════
   TERMS & CONDITIONS MODAL
═════════════════════════════════════════════════════════ */
function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
         role="dialog" aria-modal="true" aria-label="Terms and Conditions">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col
                      bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
             style={{ backgroundColor: "#8B2035" }}>
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/60 font-system">Cozi Handmade</p>
            <h2 className="font-heading italic text-white text-lg font-400 leading-tight">
              Terms & Conditions
            </h2>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white
                       hover:bg-white/20 transition-colors duration-150"
            aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 text-xs text-stone-700 leading-relaxed space-y-4 font-system">

          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            Last updated: {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>

          {[
            {
              title: "1. Acceptance of Terms",
              body: `By placing an order on Cozi Handmade ("we", "us", "our"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please do not proceed with your purchase.`,
            },
            {
              title: "2. Handmade Products",
              body: `All items sold on this platform are handcrafted by skilled artisans. Because each piece is made by hand, there may be slight variations in colour, texture, size, and pattern compared to the product photographs. These variations are a natural characteristic of handmade goods and are not considered defects. Product images are for illustrative purposes only.`,
            },
            {
              title: "3. Pricing & Payment",
              body: `Prices are displayed in your selected currency and are subject to change without notice. For Nigerian customers, payment is processed in Nigerian Naira (NGN) via local bank transfer. For international customers, payment is processed in your selected currency via Stripe or bank transfer. All transactions are encrypted. We reserve the right to cancel any order if payment cannot be verified.`,
            },
            {
              title: "4. Bank Transfer Orders",
              body: `If you choose bank transfer, your order is only confirmed once we have verified receipt of the exact amount including your unique reference number. Orders will not be dispatched before payment confirmation. We aim to confirm bank transfers within 1–2 business hours. We are not responsible for transfers sent without the correct reference number.`,
            },
            {
              title: "5. Shipping & Delivery",
              body: `Domestic (Nigeria): We ship to all 36 states and FCT. Estimated delivery is 2–10 business days from dispatch. International: We ship worldwide. Estimated delivery is 2–14 working days depending on your location and local customs processing. We are not responsible for delays caused by customs, border controls, or third-party couriers. Tracked shipping is included on all orders.`,
            },
            {
              title: "6. Returns & Refunds",
              body: `We offer a 30-day return policy on all items in their original, unused condition. Items must be returned in original packaging. Handmade items that show signs of use, washing, or damage will not be accepted for return. Return shipping costs are the responsibility of the customer unless the item is faulty or incorrectly sent. Refunds are processed within 5–10 business days of receiving the returned item.`,
            },
            {
              title: "7. Faulty or Incorrect Items",
              body: `If you receive a faulty or incorrect item, please contact us within 48 hours of delivery with your order reference and photographs of the issue. We will arrange a replacement or full refund at no cost to you.`,
            },
            {
              title: "8. Intellectual Property",
              body: `All designs, photographs, text, and branding on this platform are the exclusive property of Cozi Handmade. Reproduction, distribution, or use of any content without prior written consent is strictly prohibited.`,
            },
            {
              title: "9. Limitation of Liability",
              body: `To the fullest extent permitted by law, Cozi Handmade shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the value of the order placed.`,
            },
            {
              title: "10. Privacy",
              body: `We collect only the personal information necessary to process your order (name, address, email, phone number). We do not sell or share your data with third parties except our payment processor (Stripe) and courier services required to fulfil your order. Your data is stored securely and handled in accordance with applicable data protection laws.`,
            },
            {
              title: "11. Governing Law",
              body: `These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes shall first be attempted to be resolved amicably. If unresolved, disputes shall be subject to the jurisdiction of Nigerian courts, without prejudice to your statutory consumer rights in your country of residence.`,
            },
            {
              title: "12. Contact Us",
              body: `If you have any questions about these Terms, please contact us via the email or WhatsApp listed on our website. We aim to respond within 1 business day.`,
            },
          ].map(({ title, body }) => (
            <div key={title}>
              <p className="font-semibold text-stone-900 mb-1" style={{ color: "#4A1020" }}>{title}</p>
              <p>{body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 border-t border-stone-100">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white tracking-wide
                       transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "#8B2035" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable checkbox + "I agree" line ─────────────────── */
function TermsCheckbox({
  accepted, onChange, onShowTerms,
}: {
  accepted: boolean;
  onChange: (v: boolean) => void;
  onShowTerms: () => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group mt-5">
      {/* Custom checkbox */}
      <span
        onClick={() => onChange(!accepted)}
        className="mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center
                   transition-all duration-200"
        style={{
          borderColor: accepted ? "#8B2035" : "#D1C4B8",
          backgroundColor: accepted ? "#8B2035" : "white",
        }}>
        {accepted && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="text-xs leading-relaxed" style={{ color: "#4A1020" }}>
        I have read and agree to the{" "}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onShowTerms(); }}
          className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color: "#8B2035" }}>
          Terms &amp; Conditions
        </button>
        , including the payment, shipping, and returns policy. I understand that all
        items are handmade and slight variations may occur.
      </span>
    </label>
  );
}

/* ─── Shared icon primitives ────────────────────────────── */
function IcoShield() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IcoBadge() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
function IcoTruck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
function IcoReturn() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IcoArrow() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IcoWarning() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
    </svg>
  );
}

/* ─── Logo marks ─────────────────────────────────────────── */
function LogoVisa() {
  return (
    <svg viewBox="0 0 54 20" className="h-3.5 w-auto">
      <text x="1" y="15" fontStyle="italic" fontWeight="800" fontSize="15" fill="#1A1F71">VISA</text>
    </svg>
  );
}
function LogoMastercard() {
  return (
    <svg viewBox="0 0 44 26" className="h-5 w-auto">
      <circle cx="16" cy="13" r="12" fill="#EB001B" />
      <circle cx="28" cy="13" r="12" fill="#F79E1B" opacity="0.88" />
    </svg>
  );
}
function LogoStripe() {
  return (
    <svg viewBox="0 0 50 18" className="h-3.5 w-auto">
      <text x="0" y="14" fontFamily="system-ui,-apple-system,Helvetica,sans-serif"
            fontWeight="700" fontSize="16" fill="#635BFF">stripe</text>
    </svg>
  );
}
function LogoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 bg-white rounded-lg border border-stone-200 shadow-sm h-8 flex items-center justify-center">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP BAR
───────────────────────────────────────────────────────── */
function StepBar({ current, mode }: { current: Step; mode: CheckoutMode }) {
  const idx   = STEPS.findIndex((s) => s.key === current);
  const color = mode === "nigerian" ? "#008751" : "#8B2035";
  return (
    <ol className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = s.key === current;
        return (
          <li key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                   style={{ backgroundColor: done ? "#C9A96E" : active ? color : "#E8E0D5",
                            color: done || active ? "#FFF8F0" : "#9B8B7A" }}>
                {done
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  : s.n}
              </div>
              <span className="text-[10px] font-medium"
                    style={{ color: active ? color : "#9B8B7A" }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-14 sm:w-20 h-px mx-2 mb-5 transition-colors duration-300"
                   style={{ backgroundColor: done ? "#C9A96E" : "rgba(155,139,122,0.25)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────────────────────────────────────────────────
   FORM FIELDS
   Shared warm-neutral border/surface + a single umber (#792F00) focus
   treatment across every field in checkout — border colour change plus a
   soft matching ring, not a competing browser-default outline on top.
───────────────────────────────────────────────────────── */
const FIELD_BASE =
  "w-full h-12 px-4 rounded-xl bg-[#FAF6F0] text-deep-brown text-sm font-system " +
  "placeholder:text-[#9C8570]/70 focus:outline-none transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#F0EBE3]";
const FIELD_OK = "border border-[#E4D8C8] focus:border-[#792F00] focus:ring-2 focus:ring-[#792F00]/20";
const FIELD_ERROR = "border-2 border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-system">
      <IcoWarning />
      {message}
    </p>
  );
}

function Field({
  id, label, type = "text", inputMode, autoComplete, placeholder, value, onChange, onBlur,
  error, span2 = false,
}: {
  id: string; label: string; type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "search" | "url" | "none" | "decimal";
  autoComplete?: string;
  placeholder: string;
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  error?: string; span2?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-system">
        {label}
      </label>
      <input
        id={id} type={type} inputMode={inputMode} autoComplete={autoComplete}
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`${FIELD_BASE} ${error ? FIELD_ERROR : FIELD_OK}`}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

interface SelectOption { value: string; label: string; }

// Fully custom listbox — NOT a native <select>. Native <select> option
// popups render as an unstyleable OS/browser list in every browser (a real
// CSS platform limitation, not something fixable with classNames on the
// <select> itself), which is exactly what looked out of place against the
// rest of this hand-styled checkout form. This renders its own dropdown
// panel so both the closed trigger AND the open option list match the
// site's design — at the cost of implementing keyboard nav / a11y
// ourselves instead of getting it for free from the browser.
function SelectField({ id, label, value, onChange, onBlur, error, options, placeholder, span2 = false }: {
  id: string; label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  error?: string; options: SelectOption[]; placeholder?: string; span2?: boolean;
}) {
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

  // Close on outside click/tap, same as any native dropdown would.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onBlur]);

  // Keep the highlighted option scrolled into view as it changes via keyboard.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  function openList() {
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function selectIndex(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    onBlur?.();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        selectIndex(highlighted);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        // Typeahead: typing letters jumps to the first matching option,
        // same behaviour a native <select> gives you for free.
        if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
          if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
          typeaheadRef.current += e.key.toLowerCase();
          const match = options.findIndex((o) => o.label.toLowerCase().startsWith(typeaheadRef.current));
          if (match >= 0) setHighlighted(match);
          typeaheadTimerRef.current = setTimeout(() => { typeaheadRef.current = ""; }, 600);
        }
    }
  }

  return (
    <div className={span2 ? "sm:col-span-2" : ""} ref={containerRef}>
      <label id={`${id}-label`} htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-system">
        {label}
      </label>
      <div className="relative">
        <button
          type="button" id={id}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={handleTriggerKeyDown}
          role="combobox" aria-haspopup="listbox" aria-expanded={open}
          aria-labelledby={`${id}-label`} aria-controls={`${id}-listbox`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${FIELD_BASE} flex items-center justify-between text-left pr-10 cursor-pointer ${error ? FIELD_ERROR : FIELD_OK}`}>
          <span className={selectedLabel ? "" : "text-[#9C8570]/70"}>
            {selectedLabel || placeholder || "Select…"}
          </span>
        </button>
        <svg
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9C8570] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>

        {open && (
          <ul
            ref={listRef} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}
            tabIndex={-1}
            className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-[#E4D8C8]
                       bg-white shadow-lg py-1 font-system text-sm">
            {options.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => { e.preventDefault(); selectIndex(i); }}
                className={`px-4 py-2.5 cursor-pointer flex items-center justify-between
                            ${i === highlighted ? "bg-[#FAF6F0]" : ""}
                            ${opt.value === value ? "text-[#792F00] font-semibold" : "text-deep-brown"}`}>
                {opt.label}
                {opt.value === value && (
                  <svg className="w-3.5 h-3.5 text-[#792F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST BADGES
───────────────────────────────────────────────────────── */
function TrustBadges({ mode }: { mode: CheckoutMode }) {
  const badges = [
    { ico: <IcoShield />, label: "SSL Secured",    sub: "256-bit encryption",                         green: true  },
    { ico: <IcoBadge />,  label: mode === "nigerian" ? "Bank Verified" : "PCI-DSS Level 1",
                           sub:  mode === "nigerian" ? "Manual transfer" : "Stripe certified",         green: true  },
    { ico: <IcoTruck />,  label: "Tracked Delivery", sub: "Real-time updates",                        green: false },
    { ico: <IcoReturn />, label: "Easy Returns",    sub: "30-day guarantee",                          green: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {badges.map((b) => (
        <div key={b.label}
             className={`flex items-start gap-2.5 rounded-lg border p-3
                         ${b.green ? "bg-emerald-50 border-emerald-100" : "bg-white border-stone-100"}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                           ${b.green ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
            {b.ico}
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold leading-tight ${b.green ? "text-emerald-900" : "text-stone-800"}`}>{b.label}</p>
            <p className={`text-[10px] leading-tight mt-0.5 ${b.green ? "text-emerald-600" : "text-stone-500"}`}>{b.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PAYMENT LOGOS
───────────────────────────────────────────────────────── */
function PaymentLogos({ mode }: { mode: CheckoutMode }) {
  return (
    <div className="pt-4 border-t border-stone-100 mt-4">
      <p className="text-[10px] text-stone-400 uppercase tracking-[0.15em] font-medium mb-3 text-center">
        We accept
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {mode === "nigerian" ? (
          <>
            <LogoBadge><LogoVisa /></LogoBadge>
            <LogoBadge><LogoMastercard /></LogoBadge>
          </>
        ) : (
          <>
            <LogoBadge><LogoStripe /></LogoBadge>
            <LogoBadge><LogoVisa /></LogoBadge>
            <LogoBadge><LogoMastercard /></LogoBadge>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ORDER SUMMARY — receipt-style, printable
───────────────────────────────────────────────────────── */
function OrderSummary({ items, pricing, mode, orderRef, estimatedDays, customsApplies }: {
  items: ReturnType<typeof useCart>["items"];
  pricing: CheckoutPricing;
  mode: CheckoutMode;
  orderRef: string;
  estimatedDays: string;
  customsApplies: boolean;
}) {
  const { formatAmount } = useCurrency();

  return (
    <div className="space-y-3 font-system">

      <div id="order-receipt-wrapper">
        {/* Clean card — one soft border, no shadow, no receipt motifs */}
        <div className="bg-white rounded-2xl border border-[#E4D8C8] p-5">

          <div className="flex items-center justify-between mb-4">
            <div>
              {/* Always "Order Summary" here — this component never renders
                  after payment is confirmed (that's ConfirmationScreen), so
                  it must never claim to be a receipt for money not yet taken. */}
              <h2 className="font-heading text-lg text-deep-brown leading-tight">Order Summary</h2>
              <p className="text-[11px] text-taupe-dark mt-0.5">#{orderRef}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="print:hidden shrink-0 w-8 h-8 rounded-full border border-[#E4D8C8] flex items-center
                         justify-center text-[#792F00] hover:bg-[#FAF6F0] transition-colors duration-150"
              aria-label="Print order summary">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            </button>
          </div>

          {/* Line items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {/* Thumbnail — falls back to a plain tinted square if no image */}
                <div className="w-12 h-12 rounded-lg bg-[#FAF6F0] border border-[#E4D8C8] shrink-0 overflow-hidden">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-deep-brown leading-snug truncate">{item.name}</p>
                  <p className="text-xs text-taupe-dark mt-0.5 tabular-nums">
                    Qty {item.quantity} · {formatAmount(item.price)} each
                  </p>
                </div>
                <p className="text-sm font-semibold text-deep-brown tabular-nums shrink-0">
                  {formatAmount(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E4D8C8] my-4" />

          {/* Subtotals — small uppercase labels, larger values */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase tracking-wide text-taupe-dark">Subtotal</span>
              <span className="text-sm text-deep-brown tabular-nums">{pricing.formattedSubtotal}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase tracking-wide text-taupe-dark">Shipping</span>
              <span className="text-sm text-deep-brown tabular-nums">{pricing.formattedShipping}</span>
            </div>
          </div>

          {/* Total — visually heaviest block, separated */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "#792F00" }}>
            <span className="text-xs font-semibold tracking-wide text-white uppercase">Total</span>
            <span className="text-lg font-bold text-white tabular-nums">{pricing.formattedTotal}</span>
          </div>

          <p className="text-[10px] text-center mt-3 text-taupe-dark">
            {mode === "nigerian"
              ? "Processed via Bank Transfer · NGN"
              : `Processed via Stripe · PCI-DSS Level 1 · ${pricing.currency}`}
          </p>

          <p className="text-[10px] text-center mt-1.5 text-taupe-dark">
            Estimated delivery: <strong>{estimatedDays}</strong>
          </p>

          {customsApplies && (
            <p className="mt-3 text-[10px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Customers outside the EU may be charged import duties or taxes on delivery.
              These are set by your country and are not included in this price.
            </p>
          )}
        </div>
      </div>

      {/* Trust badges + payment logos */}
      <div className="print:hidden bg-white rounded-2xl border border-[#E4D8C8] p-4">
        <TrustBadges mode={mode} />
        <PaymentLogos mode={mode} />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SHIPPING STEP
═════════════════════════════════════════════════════════ */
/* Pure validation — used by both the desktop "Continue" button (inside
   ShippingStep) and the mobile sticky-bar one (in CheckoutPage), so both
   trigger points agree on what counts as a complete, submittable address. */
type ShipErrors = Partial<Record<keyof ShipInfo, string>>;

function validateShip(ship: ShipInfo, mode: CheckoutMode): ShipErrors {
  const errors: ShipErrors = {};
  const isNG = mode === "nigerian";

  if (!ship.firstName.trim()) errors.firstName = "First name is required.";
  if (!ship.lastName.trim())  errors.lastName  = "Last name is required.";
  if (!ship.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ship.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!ship.phone.trim()) errors.phone = "Phone number is required.";
  if (!ship.address.trim()) errors.address = "Street address is required.";
  if (!ship.city.trim()) errors.city = "City / town is required.";

  if (isNG) {
    if (!ship.state) errors.state = "Select your state.";
  } else {
    if (!ship.postcode.trim()) errors.postcode = "Postcode / ZIP is required.";
    if (!ship.country) errors.country = "Select your country.";
  }

  return errors;
}

function ShippingStep({
  mode, ship, setShip, fieldError, onFieldBlur, onNext, estimatedDays, customsApplies,
  pickupEligible, deliveryMethod, setDeliveryMethod,
}: {
  mode: CheckoutMode; ship: ShipInfo;
  setShip: (s: ShipInfo) => void;
  fieldError: (key: keyof ShipInfo) => string | undefined;
  onFieldBlur: (key: keyof ShipInfo) => void;
  onNext: () => void;
  estimatedDays: string;
  customsApplies: boolean;
  pickupEligible: boolean;
  deliveryMethod: "courier" | "pickup";
  setDeliveryMethod: (m: "courier" | "pickup") => void;
}) {
  const accent = mode === "nigerian" ? "#008751" : "#8B2035";
  const isNG   = mode === "nigerian";
  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
      <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">Shipping Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="fn" label="First Name" placeholder={isNG ? "e.g. Amaka" : "e.g. Jane"}
               autoComplete="given-name"
               value={ship.firstName} onChange={(v) => setShip({ ...ship, firstName: v })}
               onBlur={() => onFieldBlur("firstName")} error={fieldError("firstName")} />
        <Field id="ln" label="Last Name"  placeholder={isNG ? "e.g. Okonkwo" : "e.g. Smith"}
               autoComplete="family-name"
               value={ship.lastName}  onChange={(v) => setShip({ ...ship, lastName: v })}
               onBlur={() => onFieldBlur("lastName")} error={fieldError("lastName")} />
        <Field id="em" label="Email Address" type="email" inputMode="email" autoComplete="email"
               placeholder={isNG ? "e.g. amaka@gmail.com" : "e.g. jane@example.com"}
               value={ship.email} onChange={(v) => setShip({ ...ship, email: v })}
               onBlur={() => onFieldBlur("email")} error={fieldError("email")} span2 />
        <Field id="ph" label="Phone" type="tel" inputMode="tel" autoComplete="tel"
               placeholder={isNG ? "e.g. +234 080 0000 0000" : "e.g. +44 7700 000000"}
               value={ship.phone} onChange={(v) => setShip({ ...ship, phone: v })}
               onBlur={() => onFieldBlur("phone")} error={fieldError("phone")} span2 />
        <Field id="addr" label="Street Address" autoComplete="address-line1"
               placeholder={isNG ? "e.g. 12 Allen Avenue, Ikeja" : "e.g. 12 Willow Lane"}
               value={ship.address} onChange={(v) => setShip({ ...ship, address: v })}
               onBlur={() => onFieldBlur("address")} error={fieldError("address")} span2 />
        <Field id="city" label="City / Town" autoComplete="address-level2"
               placeholder={isNG ? "e.g. Lagos" : "e.g. London"}
               value={ship.city} onChange={(v) => setShip({ ...ship, city: v })}
               onBlur={() => onFieldBlur("city")} error={fieldError("city")} />
        {isNG ? (
          <SelectField id="state" label="State" value={ship.state}
                       onChange={(v) => setShip({ ...ship, state: v })}
                       onBlur={() => onFieldBlur("state")} error={fieldError("state")}
                       options={NG_STATE_OPTIONS} placeholder="Select state…" />
        ) : (
          <>
            <Field id="pc" label="Postcode / ZIP" placeholder="e.g. SW1A 1AA" autoComplete="postal-code"
                   value={ship.postcode} onChange={(v) => setShip({ ...ship, postcode: v })}
                   onBlur={() => onFieldBlur("postcode")} error={fieldError("postcode")} />
            <SelectField id="country" label="Country" value={ship.country}
                         onChange={(v) => setShip({ ...ship, country: v })}
                         onBlur={() => onFieldBlur("country")} error={fieldError("country")}
                         options={COUNTRY_OPTIONS} span2 />
          </>
        )}
      </div>

      {!isNG && pickupEligible && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800 mb-2">
            Your address is in Dublin — how would you like to receive your order?
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-colors
                               ${deliveryMethod === "courier" ? "border-emerald-400 bg-white" : "border-emerald-100 bg-emerald-50/50"}`}>
              <input type="radio" name="deliveryMethod" checked={deliveryMethod === "courier"}
                     onChange={() => setDeliveryMethod("courier")} className="accent-emerald-600" />
              <span className="text-emerald-900 font-medium">Standard courier delivery</span>
            </label>
            <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-colors
                               ${deliveryMethod === "pickup" ? "border-emerald-400 bg-white" : "border-emerald-100 bg-emerald-50/50"}`}>
              <input type="radio" name="deliveryMethod" checked={deliveryMethod === "pickup"}
                     onChange={() => setDeliveryMethod("pickup")} className="accent-emerald-600" />
              <span className="text-emerald-900 font-medium">Pick up in Dublin — Free</span>
            </label>
          </div>
        </div>
      )}

      {isNG ? (
        <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-system">
          <div className="w-4 h-4 shrink-0 text-emerald-600"><IcoBadge /></div>
          We ship to all 36 Nigerian states + FCT · Delivery: {estimatedDays}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 font-system">
            <div className="w-4 h-4 shrink-0 text-blue-500"><IcoTruck /></div>
            {deliveryMethod === "pickup" ? "Local pickup" : "International shipping"} · Estimated: <strong>{estimatedDays}</strong>
          </div>
          {customsApplies && (
            <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 font-system">
              <div className="w-4 h-4 shrink-0 text-amber-500 mt-0.5"><IcoWarning /></div>
              Customers outside the EU may be charged import duties or taxes on delivery. These are set
              by your country and are not included in this price.
            </div>
          )}
        </>
      )}

      <div className="hidden lg:flex justify-end mt-6">
        <button onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-none text-cream font-semibold
                     text-sm tracking-wide hover:-translate-y-px transition-all duration-200 shadow-sm font-system"
          style={{ backgroundColor: accent }}>
          Continue to Payment <IcoArrow />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   NIGERIAN PAYMENT STEP  — Bank Transfer only (always NGN)
═════════════════════════════════════════════════════════ */
function NigerianPaymentStep({ orderTotalNGN, orderRef, onBack, onBankTransferConfirm, isSubmitting, submitError, termsAccepted, setTermsAccepted, onShowTerms }: {
  orderTotalNGN: number;
  orderRef: string;
  onBack: () => void;
  onBankTransferConfirm: () => void;
  isSubmitting: boolean;
  submitError: string;
  termsAccepted: boolean; setTermsAccepted: (v: boolean) => void; onShowTerms: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const formattedNGN = `₦${orderTotalNGN.toLocaleString("en-NG")}`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const BANK = [
    ["Account Number", process.env.NEXT_PUBLIC_BANK_NGN_ACCOUNT ?? "", "acct"],
    ["Bank",           process.env.NEXT_PUBLIC_BANK_NGN_BANK    ?? "", "bank"],
    ["Account Name",   process.env.NEXT_PUBLIC_BANK_NGN_NAME    ?? "", "name"],
    ["Amount",         formattedNGN,                                   "amt"],
    ["Reference",      orderRef,                                       "ref"],
  ] as [string, string, string][];

  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
      <h2 className="font-heading font-600 text-deep-brown text-xl mb-2">Payment</h2>
      <p className="text-xs text-taupe-dark mb-5">Complete your payment by bank transfer.</p>

      <div>
        <p className="text-sm text-stone-600 mb-4 leading-relaxed">
          Transfer the <strong>exact amount</strong> below and include your reference number so we can
          match your payment. Orders are processed within 1–2 hours of confirmation.
        </p>

        <div className="rounded-2xl overflow-hidden shadow-sm border border-stone-200 mb-4">
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-stone-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                 style={{ backgroundColor: "#FEF3C7" }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                   stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-stone-800 text-xs font-semibold">Nigerian Bank Transfer</p>
              <p className="text-stone-400 text-[10px]">NGN · Any local bank accepted</p>
            </div>
          </div>
          <div className="bg-white px-5 py-4 space-y-3.5">
            {BANK.map(([label, value, key]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-semibold truncate tabular-nums ${key === "ref" ? "text-gold" : "text-stone-900"}`}>
                    {value}
                  </p>
                </div>
                <button onClick={() => copyText(value, key)}
                  className={`shrink-0 text-[10px] px-2.5 py-1 rounded font-medium transition-all duration-200
                              ${copied === key ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                  {copied === key ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          <p className="text-xs text-amber-800 leading-relaxed">
            Always include your <strong>reference number</strong> in the transfer narration. We&apos;ll send a WhatsApp confirmation once received.
          </p>
        </div>

        <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} onShowTerms={onShowTerms} />

        {submitError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {submitError}
          </p>
        )}

        <button onClick={onBankTransferConfirm} disabled={!termsAccepted || isSubmitting}
          className="mt-5 w-full lg:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 lg:py-3
                     rounded-none text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-sm
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                     enabled:hover:-translate-y-px enabled:shadow-sm"
          style={{ backgroundColor: "#008751" }}>
          {isSubmitting ? "Saving order…" : <>I&apos;ve Sent the Payment <IcoCheck /></>}
        </button>
      </div>

      <div className="hidden lg:flex mt-6">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-none border-2 border-stone-200
                     text-stone-500 font-medium text-sm hover:border-stone-400 hover:text-stone-700 transition-all duration-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   STRIPE CARD FORM — mounted inside <Elements>, owns confirmPayment +
   the post-payment "wait for webhook to actually create the order" poll.
   The webhook is the only thing that ever creates an order — this only
   calls onSuccess once /api/payments/stripe/status confirms it happened.
═════════════════════════════════════════════════════════ */
function StripeCardForm({ formattedTotal, orderRef, termsAccepted, setTermsAccepted, onShowTerms, onSuccess, onRefunded }: {
  formattedTotal: string;
  orderRef: string;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onShowTerms: () => void;
  onSuccess: (orderId: string, summary: OrderConfirmationSummary) => void;
  onRefunded: (info: { reason: string; productName: string | null }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [waitingForOrder, setWaitingForOrder] = useState(false);

  async function pollForOrder(paymentIntentId: string) {
    setWaitingForOrder(true);
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await fetch(`/api/payments/stripe/status?payment_intent_id=${encodeURIComponent(paymentIntentId)}`);
        const data = await res.json();
        if (data.status === "completed" && data.order_id) {
          onSuccess(data.order_id, {
            totalAmountEUR: data.total_amount_eur,
            chargedAmount: data.charged_amount,
            currency: data.currency,
            paymentChannel: data.payment_channel,
          });
          return;
        }
        if (data.status === "refunded") {
          // The item sold out before checkout_verified_order could reserve
          // it — the webhook already refunded automatically. No order will
          // ever exist for this payment_intent_id by design, so there is
          // nothing to keep polling for; stop immediately rather than
          // waiting out the rest of the loop.
          onRefunded({ reason: data.reason, productName: data.product_name });
          return;
        }
      } catch {
        // transient — keep polling
      }
    }
    setWaitingForOrder(false);
    setError(`Your payment succeeded and we're finishing your order — this is taking a little longer than usual. Contact us with order reference ${orderRef} if you don't hear from us soon.`);
  }

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setError("");
    setSubmitting(true);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Payment failed. Please check your card details and try again.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setError(`Payment status: ${paymentIntent?.status ?? "unknown"}. Please try again.`);
        return;
      }

      await pollForOrder(paymentIntent.id);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || waitingForOrder;

  return (
    <div>
      <PaymentElement />

      <div className="mt-4">
        <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} onShowTerms={onShowTerms} />
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button type="button" onClick={handleSubmit} disabled={!termsAccepted || !stripe || busy}
        className="mt-5 w-full lg:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 lg:py-3
                   rounded-none text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-sm
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                   enabled:hover:-translate-y-px"
        style={{ backgroundColor: "#635BFF" }}>
        {waitingForOrder ? "Confirming your order…" : submitting ? "Processing payment…" : <>Pay <span className="tabular-nums">{formattedTotal}</span> with Stripe <IcoArrow /></>}
      </button>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
        <div className="text-emerald-600"><IcoShield /></div>
        PCI-DSS Level 1 compliant · Stripe certified
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   INTERNATIONAL PAYMENT STEP  — Bank Transfer or Stripe
═════════════════════════════════════════════════════════ */
function InternationalPaymentStep({
  formattedTotal, orderRef, currency, intlMethod, setIntlMethod,
  onBack, onTransferConfirm,
  clientSecret, intentError, onStripeSuccess, onStripeRefunded,
  isSubmitting, submitError,
  termsAccepted, setTermsAccepted, onShowTerms,
}: {
  formattedTotal: string;
  orderRef: string;
  currency: string;
  intlMethod: IntlPayMethod;
  setIntlMethod: (m: IntlPayMethod) => void;
  onBack: () => void;
  onTransferConfirm: () => void;
  clientSecret: string | null;
  intentError: string | null;
  onStripeSuccess: (orderId: string, summary: OrderConfirmationSummary) => void;
  onStripeRefunded: (info: { reason: string; productName: string | null }) => void;
  isSubmitting: boolean;
  submitError: string;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onShowTerms: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  // Pick the matching bank account, fall back to EUR (the home currency)
  const bankInfo  = BANK[currency] ?? BANK.EUR;
  const isFallback = !BANK[currency] && currency !== "EUR";

  const copyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val.replace(/\s/g, ""));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
      <h2 className="font-heading font-600 text-deep-brown text-xl mb-2">Payment</h2>
      <p className="text-xs text-taupe-dark mb-5">Choose how you&apos;d like to pay.</p>

      {/* ── Tabs ── */}
      <div className="flex border border-stone-200 rounded-none overflow-hidden mb-6">
        <button onClick={() => setIntlMethod("bank-transfer")}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                      ${intlMethod === "bank-transfer" ? "text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          style={intlMethod === "bank-transfer" ? { backgroundColor: "#059669" } : {}}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l2.25 2.25M6.75 5.25l-2.25 2.25M21 21l-2.25-2.25m0 0l-2.25-2.25M17.25 18.75l2.25-2.25M3 3l3.75 3.75M21 3l-3.75 3.75M3 21l3.75-3.75M12 12h.008v.008H12V12z"/>
          </svg>
          Bank Transfer
        </button>
        <div className="w-px bg-stone-200" />
        <button onClick={() => setIntlMethod("stripe-card")}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                      ${intlMethod === "stripe-card" ? "text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          style={intlMethod === "stripe-card" ? { backgroundColor: "#635BFF" } : {}}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
          </svg>
          Card / Stripe
        </button>
      </div>

      {/* ════════ BANK TRANSFER TAB ════════ */}
      {intlMethod === "bank-transfer" && (
        <div>
          {/* Currency fallback notice */}
          {isFallback && (
            <div className="flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
              <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
              </svg>
              <p className="text-xs text-blue-800 leading-relaxed">
                We don&apos;t have a <strong>{currency}</strong> account yet. Please convert to <strong>EUR</strong> first
                using your bank or <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Wise</a>,
                then transfer to our EUR IBAN below.
              </p>
            </div>
          )}

          <p className="text-sm text-stone-600 mb-4 leading-relaxed">
            Transfer the <strong>exact amount</strong> and include your reference number so we can
            match your payment. Orders are confirmed within 1 business day.
          </p>

          {/* Account detail card */}
          <div className="rounded-2xl overflow-hidden shadow-sm border border-stone-200 mb-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-stone-100">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-100">
                <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918"/>
                </svg>
              </div>
              <div>
                <p className="text-stone-800 text-xs font-semibold">{bankInfo.label}</p>
                <p className="text-stone-400 text-[10px]">{bankInfo.network}</p>
              </div>
            </div>

            <div className="bg-white px-5 py-4 space-y-3.5">
              {bankInfo.fields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-stone-900 truncate tabular-nums">{value}</p>
                  </div>
                  <button onClick={() => copyText(value, label)}
                    className={`shrink-0 text-[10px] px-2.5 py-1 rounded font-medium transition-all duration-200
                                ${copied === label ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                    {copied === label ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}

              {/* Amount row */}
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-100">
                <div className="min-w-0">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">Amount</p>
                  <p className="text-sm font-bold text-stone-900 tabular-nums">{formattedTotal}</p>
                </div>
                <button onClick={() => copyText(formattedTotal.replace(/[^\d.]/g, ""), "amount")}
                  className={`shrink-0 text-[10px] px-2.5 py-1 rounded font-medium transition-all duration-200
                              ${copied === "amount" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                  {copied === "amount" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              Always add your <strong>order reference</strong> to the transfer note — this is how we identify your payment.
              We&apos;ll email you once it&apos;s confirmed.
            </p>
          </div>

          <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} onShowTerms={onShowTerms} />

          {submitError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {submitError}
            </p>
          )}

          <button onClick={onTransferConfirm} disabled={!termsAccepted || isSubmitting}
            className="mt-5 w-full lg:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 lg:py-3
                       rounded-none text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-sm
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                       enabled:hover:-translate-y-px"
            style={{ backgroundColor: "#059669" }}>
            {isSubmitting ? "Saving order…" : <>I&apos;ve Sent the Transfer <IcoCheck /></>}
          </button>
        </div>
      )}

      {/* ════════ STRIPE CARD TAB ════════ */}
      {intlMethod === "stripe-card" && (
        <div>
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-5">
            <div className="text-emerald-600 shrink-0"><IcoShield /></div>
            <span className="text-xs text-emerald-700 font-medium">256-bit SSL encryption active</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 text-[10px] font-medium">SECURE</span>
            </div>
          </div>

          <div className="rounded-t-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#635BFF" }}>
            <LogoStripe />
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#EB001B]" />
                <div className="w-5 h-5 rounded-full bg-[#F79E1B] -ml-2.5 opacity-90" />
              </div>
              <svg viewBox="0 0 40 16" className="h-3 w-auto">
                <text x="1" y="12" fontStyle="italic" fontWeight="800" fontSize="12" fill="white">VISA</text>
              </svg>
            </div>
          </div>

          <div className="bg-white border border-t-0 border-stone-200 rounded-b-xl p-5 mb-5">
            {intentError ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {intentError}
              </p>
            ) : !clientSecret ? (
              <div className="flex items-center gap-2 text-xs text-stone-500 py-6 justify-center">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Preparing secure payment…
              </div>
            ) : (
              <Elements stripe={getStripePromise()} options={{ clientSecret }}>
                <StripeCardForm
                  formattedTotal={formattedTotal}
                  orderRef={orderRef}
                  termsAccepted={termsAccepted}
                  setTermsAccepted={setTermsAccepted}
                  onShowTerms={onShowTerms}
                  onSuccess={onStripeSuccess}
                  onRefunded={onStripeRefunded}
                />
              </Elements>
            )}
          </div>
        </div>
      )}

      <div className="hidden lg:flex mt-6">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-none border-2 border-stone-200
                     text-stone-500 font-medium text-sm hover:border-stone-400 hover:text-stone-700 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   CONFIRMATION SCREEN
═════════════════════════════════════════════════════════ */
function ConfirmationScreen({ mode, intlMethod, orderRef, firstName, summary, estimatedDays }: {
  mode: CheckoutMode; intlMethod: IntlPayMethod;
  orderRef: string; firstName: string;
  summary: OrderConfirmationSummary;
  estimatedDays: string;
}) {
  // Nigeria is bank-transfer-only, so every Nigerian order is "pending" until
  // manually confirmed. International Stripe orders only ever reach this
  // screen once the webhook has confirmed the charge, so they're never
  // pending; international bank-transfer orders are pending like Nigeria's.
  const isPending = mode === "nigerian" || (mode === "international" && intlMethod === "bank-transfer");
  // DB-verified — the actual amount recorded on transactions.amount, not a
  // client-side recomputation. Formatted directly in the currency it was
  // actually charged/instructed in, no re-conversion needed.
  const displayAmount = formatCurrency(summary.chargedAmount, CURRENCIES[summary.currency]);
  const isStripe = summary.paymentChannel === "stripe_card";

  return (
    <div className="min-h-screen bg-cream flex items-start justify-center px-4 pt-10 pb-24 font-system">
      <div className="w-full max-w-md">

        {/* Status icon */}
        <div className="text-center mb-6">
          {isPending ? (
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-amber-100">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-100">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}

          <p className={`text-[10px] uppercase tracking-[0.2em] font-medium mb-1
                         ${isPending ? "text-amber-600" : "text-emerald-600"}`}>
            {isPending ? "Awaiting Payment" : "Order Confirmed"}
          </p>
          <h1 className="font-heading text-3xl font-700 text-deep-brown mb-2">
            {isPending ? "Transfer received soon" : `Thank you${firstName ? `, ${firstName}` : ""}!`}
          </h1>
          <p className="text-brown/70 text-sm leading-relaxed max-w-xs mx-auto">
            {isPending
              ? "We'll confirm your bank transfer within 1–2 hours and notify you via WhatsApp."
              : `Order ${orderRef} is being lovingly prepared by our artisans.`}
          </p>
        </div>

        {/* Order card */}
        <div className="bg-white rounded-2xl border border-cream-darker p-5 mb-4 shadow-sm">
          <h2 className="font-heading text-base font-600 text-deep-brown mb-3 pb-2 border-b border-taupe/15">
            Order Details
          </h2>
          <div className="space-y-2 text-sm mb-3">
            {[
              ["Order Ref",  orderRef],
              [isPending ? "Amount to Transfer" : "Total Paid", displayAmount],
              // DB-verified — payment_channel as actually recorded on the
              // transaction, not inferred from local tab-selection state.
              ["Payment via", isStripe ? `Stripe (${summary.currency})` : `Bank Transfer (${summary.currency})`],
              ["Estimated Delivery", estimatedDays],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-taupe-dark">{label}</span>
                <span className="font-semibold text-deep-brown text-right max-w-[55%] tabular-nums">{value}</span>
              </div>
            ))}
          </div>

          {isPending ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <span className="text-xs text-amber-700">Payment pending · WhatsApp update within 1–2 hrs</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-emerald-500 shrink-0"><IcoCheck /></div>
              <span className="text-xs text-emerald-700">Payment confirmed · Tracked delivery included</span>
            </div>
          )}

          {/* Payment security indicator — understated, only for genuine
              Stripe-confirmed orders (never shown for bank-transfer/NGN,
              which weren't secured "by Stripe"). DB-verified via
              payment_channel, same reasoning as "Payment via" above. */}
          {isStripe && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-taupe/10">
              <div className="text-taupe-dark shrink-0"><IcoShield /></div>
              <span className="text-[11px] text-taupe-dark">Secured by</span>
              <LogoStripe />
            </div>
          )}
        </div>

        {/* Share */}
        <div className="bg-white rounded-2xl border border-cream-darker p-4 shadow-sm mb-4 text-center">
          <p className="text-xs font-semibold text-deep-brown mb-1">Share the love</p>
          <p className="text-[10px] text-taupe-dark mb-3">Tag us when your order arrives</p>
          <div className="flex items-center justify-center gap-4">
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
               aria-label="Follow Cozi Handmade on Instagram"
               className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400
                          hover:text-[#E4405F] transition-colors duration-200">
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
               aria-label="Chat with Cozi Handmade on WhatsApp"
               className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400
                          hover:text-[#25D366] transition-colors duration-200">
              <WhatsAppIcon className="w-5 h-5" />
            </a>
          </div>
        </div>

        <Link href="/products"
          className="flex items-center justify-center w-full h-12 rounded-none text-cream font-semibold
                     text-sm tracking-wide hover:opacity-90 transition-opacity shadow-sm"
          style={{ backgroundColor: "#8B2035" }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SOLD OUT / AUTO-REFUNDED  — the item sold out mid-checkout;
   checkout_verified_order raised OUT_OF_STOCK and the webhook already
   refunded automatically. No order was created and none will be — this is
   a resolution, not a pending/error state, so the tone and status icon are
   deliberately different from both ConfirmationScreen's states.
═════════════════════════════════════════════════════════ */
function SoldOutRefundedScreen({ productName }: { productName: string | null }) {
  return (
    <div className="min-h-screen bg-cream flex items-start justify-center px-4 pt-10 pb-24 font-system">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-amber-100">
            <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium mb-1 text-amber-600">
            Sold Out
          </p>
          <h1 className="font-heading text-3xl font-700 text-deep-brown mb-2">
            You have not been charged
          </h1>
          <p className="text-brown/70 text-sm leading-relaxed max-w-xs mx-auto">
            {productName ? `"${productName}" sold out` : "This item sold out"} just as your payment
            completed — we&apos;ve automatically refunded you in full. We&apos;re sorry for the disappointment.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-darker p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="text-emerald-500 shrink-0"><IcoCheck /></div>
            <span className="text-xs text-emerald-700">Refund confirmed · Funds return in 5–10 business days, depending on your bank</span>
          </div>
        </div>

        <Link href="/products"
          className="flex items-center justify-center w-full h-12 rounded-none text-cream font-semibold
                     text-sm tracking-wide hover:opacity-90 transition-opacity shadow-sm"
          style={{ backgroundColor: "#8B2035" }}>
          Browse Similar Pieces
        </Link>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   MAIN PAGE  — mode auto-derived from selected currency
═════════════════════════════════════════════════════════ */
export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { currency, priceCheckout } = useCurrency();

  // NGN → Nigerian checkout (bank transfer only). Any other currency → international (Stripe or bank transfer).
  const mode: CheckoutMode = currency === "NGN" ? "nigerian" : "international";
  const accent = mode === "nigerian" ? "#008751" : "#8B2035";

  const [step,          setStep]          = useState<Step>("shipping");
  const [intlMethod,    setIntlMethod]    = useState<IntlPayMethod>("bank-transfer");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms,     setShowTerms]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const [savedOrderId,  setSavedOrderId]  = useState<string | null>(null);
  const [orderRef]                        = useState(() =>
    `WIL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  );

  // What the confirmation screen renders from — DB-verified, returned by
  // whichever endpoint actually created the order (never a client-side
  // recomputed value, and never affected by clearCart() emptying the cart
  // right after this is set, since it's a plain snapshot, not derived from
  // live cart state). See OrderConfirmationSummary's own comment.
  const [confirmed, setConfirmed] = useState<{ summary: OrderConfirmationSummary; estimatedDays: string } | null>(null);
  // Set when the item sold out mid-checkout and the webhook already
  // refunded automatically — a distinct outcome from a normal order, with
  // no order/total to show at all.
  const [soldOut, setSoldOut] = useState<{ reason: string; productName: string | null } | null>(null);
  const [shipTouched, setShipTouched] = useState<Partial<Record<keyof ShipInfo, boolean>>>({});
  const [showAllShipErrors, setShowAllShipErrors] = useState(false);
  const [ship, setShip] = useState<ShipInfo>({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", postcode: "", country: mode === "nigerian" ? "NG" : "GB", state: "",
  });

  // Free customer pickup — only ever offered for addresses that actually
  // resolve to Dublin (see isDublinPickupEligible; MadeCozi's stockhouse is
  // there). `deliveryMethod` is the customer's choice; `pickupEligible` is
  // recomputed from the live address on every render, so if they pick
  // "pickup" and then edit the address to somewhere else, the effective
  // method silently falls back to the standard courier rather than staying
  // stuck offering a pickup that no longer makes sense.
  const [deliveryMethod, setDeliveryMethod] = useState<"courier" | "pickup">("courier");
  const pickupEligible = isDublinPickupEligible(ship);
  const effectiveDeliveryMethod = pickupEligible ? deliveryMethod : "courier";

  // Shipping — lib/checkout/shipping.ts is the single source of truth,
  // imported here for display AND by create-intent for the server-side
  // charge (never a second, local implementation). Recomputed on every
  // render so changing the delivery country immediately updates the
  // displayed price — cheap, pure, no network call.
  //
  // `total` (cart subtotal) is in EUR — the base currency every price is
  // stored/entered in. `chargedTotal` is the properly-converted amount in
  // the customer's selected currency — that's what's actually
  // charged/displayed/transferred (NGN via bank transfer when
  // mode === "nigerian"). Both the Stripe path (create-intent) and the bank
  // transfer path (/api/orders) independently recompute subtotal + shipping
  // server-side and never trust a client-submitted total — create-intent's
  // client_shipping_eur check additionally rejects outright if its figure
  // and the server's ever diverge; /api/orders simply ignores the client's
  // total_amount/charged_amount entirely and stores its own.
  const shippingItems: ShippingItemInput[] = items.map((item) => ({
    quantity: item.quantity,
    shippingWeightGrams: item.shippingWeightGrams,
    productName: item.name,
  }));
  const shippingQuote: { zone: ShippingZone; priceEUR: number; estimatedDays: string; customsApplies: boolean } =
    calculateShipping(shippingItems, ship.country);
  const shippingEUR = effectiveDeliveryMethod === "pickup" ? 0 : shippingQuote.priceEUR;
  const estimatedDaysDisplay = effectiveDeliveryMethod === "pickup"
    ? "Ready for pickup within 1-2 business days"
    : shippingQuote.estimatedDays;
  // Pickup is a local handoff, not an international shipment — never show
  // the customs-duties notice for it even if the underlying zone would
  // otherwise have customsApplies true (it won't for domestic/IE, but this
  // keeps the display correct if that ever changes).
  const customsAppliesDisplay = effectiveDeliveryMethod === "pickup" ? false : shippingQuote.customsApplies;
  const pricing        = priceCheckout(total, shippingEUR);
  const chargedTotal  = pricing.totalConverted;

  const shipErrors = validateShip(ship, mode);
  function shipFieldError(key: keyof ShipInfo) {
    return (shipTouched[key] || showAllShipErrors) ? shipErrors[key] : undefined;
  }
  function handleShipFieldBlur(key: keyof ShipInfo) {
    setShipTouched((t) => ({ ...t, [key]: true }));
  }
  function handleContinueToPayment() {
    if (Object.keys(shipErrors).length > 0) {
      setShowAllShipErrors(true);
      return;
    }
    setStep("payment");
  }

  // Stripe PaymentIntent — created once the customer reaches the Card/Stripe
  // tab. The server re-prices from the cart here (never trusts client
  // totals), so this is also the point where a stale/tampered cart would be
  // caught, before any card details are even collected.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError,  setIntentError]  = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "international" || step !== "payment" || intlMethod !== "stripe-card") return;
    if (clientSecret || intentError) return; // already have one, or already failed — don't refetch on every render

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payments/stripe/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              product_id: item.id,
              product_name: item.name,
              product_image: item.image,
              quantity: item.quantity,
              unit_price: item.price,
              source: item.source ?? "product",
              variant: item.variant,
            })),
            delivery_address: ship,
            currency,
            // Checksum, not an input to the charge — the server recomputes
            // shipping independently from its own weight lookup and rejects
            // if this doesn't match. See create-intent's doc comment.
            client_shipping_eur: shippingEUR,
            // Server independently re-checks Dublin eligibility against
            // delivery_address before ever honouring "pickup" — this is
            // never trusted on its own to produce a €0 charge.
            delivery_method: effectiveDeliveryMethod,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setIntentError(data.error ?? "Could not start secure payment. Please try again.");
          return;
        }
        setClientSecret(data.client_secret);
      } catch {
        if (!cancelled) setIntentError("Network error — please check your connection and try again.");
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step, intlMethod]);

  async function handleBankTransferConfirm() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            product_image: item.image,
            quantity: item.quantity,
            unit_price: item.price,
            source: item.source ?? "product",
            variant: item.variant,
          })),
          // total_amount/charged_amount are NOT sent — /api/orders recomputes
          // both server-side (repriceItems + calculateShipping) and ignores
          // any client-submitted total, same guarantee as the Stripe path.
          delivery_address: ship,
          payment_method: "bank_transfer",
          order_ref: orderRef,
          currency: "NGN",
          delivery_method: effectiveDeliveryMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not save your order. Please try again.");
        return;
      }
      setSavedOrderId(data.order_id);
      // DB-verified figures from the same response that confirms the order
      // was created — not a client-side recomputation, so clearing the
      // cart on the next line can never change what the receipt displays.
      setConfirmed({
        summary: {
          totalAmountEUR: data.total_amount_eur,
          chargedAmount: data.charged_amount,
          currency: data.currency,
          paymentChannel: data.payment_channel,
        },
        estimatedDays: estimatedDaysDisplay,
      });
      clearCart(); // order now genuinely exists in the DB — safe to empty
      setStep("confirmation");
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // The webhook is what actually creates the order — this only runs once
  // StripeCardForm's own polling has confirmed that's happened (via
  // /api/payments/stripe/status, which returns these same DB-verified
  // figures), so clearing the cart here (and not any earlier) can never
  // empty it for a payment that hasn't actually gone through.
  function handleStripeSuccess(orderId: string, summary: OrderConfirmationSummary) {
    setSavedOrderId(orderId);
    setConfirmed({ summary, estimatedDays: estimatedDaysDisplay });
    clearCart();
    setStep("confirmation");
  }

  // The item sold out mid-checkout — checkout_verified_order raised
  // OUT_OF_STOCK and the webhook already refunded automatically (see
  // app/api/payments/stripe/webhook/route.ts). No order exists or ever
  // will for this attempt, so there's nothing to keep in the cart either —
  // it's cleared the same as a genuine success, just routed to a different
  // screen.
  function handleStripeRefunded(info: { reason: string; productName: string | null }) {
    setSoldOut(info);
    clearCart();
    setStep("refunded");
  }

  async function handleInternationalTransferConfirm() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            product_image: item.image,
            quantity: item.quantity,
            unit_price: item.price,
            source: item.source ?? "product",
            variant: item.variant,
          })),
          // total_amount/charged_amount are NOT sent — /api/orders recomputes
          // both server-side (repriceItems + calculateShipping) and ignores
          // any client-submitted total, same guarantee as the Stripe path.
          delivery_address: ship,
          payment_method: "swift_transfer",
          order_ref: orderRef,
          currency,
          delivery_method: effectiveDeliveryMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not save your order. Please try again.");
        return;
      }
      setSavedOrderId(data.order_id);
      setConfirmed({
        summary: {
          totalAmountEUR: data.total_amount_eur,
          chargedAmount: data.charged_amount,
          currency: data.currency,
          paymentChannel: data.payment_channel,
        },
        estimatedDays: estimatedDaysDisplay,
      });
      clearCart(); // order now genuinely exists in the DB — safe to empty
      setStep("confirmation");
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* Empty cart guard */
  if (items.length === 0 && step !== "confirmation") {
    return (
      <div className="min-h-[70vh] bg-cream flex flex-col items-center justify-center px-6 text-center font-system">
        <h1 className="font-heading text-2xl font-700 text-deep-brown mb-4">Nothing to check out</h1>
        <Link href="/products"
              className="inline-flex items-center justify-center px-8 py-3 rounded-none
                         bg-gold text-cream font-semibold text-sm hover:bg-gold-dark transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  /* Confirmation — reads ONLY the DB-verified `confirmed` snapshot set by
     whichever success handler actually created the order, never a
     client-side recomputed value. All three success handlers set this
     before reaching this step, so `!confirmed` should never actually
     happen — guarding rather than fabricating fake data if it ever did. */
  if (step === "confirmation") {
    if (!confirmed) return null;
    return (
      <ConfirmationScreen
        mode={mode} intlMethod={intlMethod}
        orderRef={orderRef} firstName={ship.firstName}
        summary={confirmed.summary}
        estimatedDays={confirmed.estimatedDays}
      />
    );
  }

  /* Sold out mid-checkout — the webhook already refunded automatically;
     no order exists or ever will for this attempt. A distinct screen, not
     a variant of ConfirmationScreen, since there's no order/total/delivery
     estimate to show. */
  if (step === "refunded") {
    if (!soldOut) return null;
    return <SoldOutRefundedScreen productName={soldOut.productName} />;
  }

  return (
    <div className="min-h-screen bg-cream font-system">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 py-4 sm:py-5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
                 stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <h1 className="font-heading text-xl sm:text-2xl font-700 text-deep-brown">Secure Checkout</h1>
          </div>
          <p className="text-xs font-medium tracking-wide pl-6 sm:pl-0" style={{ color: accent }}>
            {mode === "nigerian"
              ? "Nigerian Orders · Bank Transfer"
              : `International · Stripe · ${currency}`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-52 lg:pb-10">
        <StepBar current={step} mode={mode} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Form */}
          <div className="flex-1 min-w-0 space-y-4">
            {step === "shipping" && (
              <ShippingStep mode={mode} ship={ship} setShip={setShip}
                fieldError={shipFieldError} onFieldBlur={handleShipFieldBlur}
                onNext={handleContinueToPayment}
                estimatedDays={estimatedDaysDisplay}
                customsApplies={customsAppliesDisplay}
                pickupEligible={pickupEligible}
                deliveryMethod={deliveryMethod}
                setDeliveryMethod={setDeliveryMethod} />
            )}
            {step === "payment" && mode === "nigerian" && (
              <NigerianPaymentStep
                orderTotalNGN={chargedTotal} orderRef={orderRef}
                onBack={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
                onBankTransferConfirm={handleBankTransferConfirm}
                isSubmitting={submitting}
                submitError={submitError}
                termsAccepted={termsAccepted}
                setTermsAccepted={setTermsAccepted}
                onShowTerms={() => setShowTerms(true)}
              />
            )}
            {step === "payment" && mode === "international" && (
              <InternationalPaymentStep
                formattedTotal={pricing.formattedTotal}
                orderRef={orderRef}
                currency={currency}
                intlMethod={intlMethod}
                setIntlMethod={setIntlMethod}
                onBack={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
                onTransferConfirm={handleInternationalTransferConfirm}
                clientSecret={clientSecret}
                intentError={intentError}
                onStripeSuccess={handleStripeSuccess}
                onStripeRefunded={handleStripeRefunded}
                isSubmitting={submitting}
                submitError={submitError}
                termsAccepted={termsAccepted}
                setTermsAccepted={setTermsAccepted}
                onShowTerms={() => setShowTerms(true)}
              />
            )}
            {/* Mobile trust + logos */}
            <div className="lg:hidden bg-white rounded-2xl border border-cream-darker shadow-sm p-4">
              <TrustBadges mode={mode} />
              <div className="mt-3"><PaymentLogos mode={mode} /></div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-28">
            <OrderSummary items={items} pricing={pricing} mode={mode} orderRef={orderRef}
              estimatedDays={estimatedDaysDisplay} customsApplies={customsAppliesDisplay} />
          </div>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-md
                      border-t border-taupe/20 px-4 pt-3 shadow-2xl"
           style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
        <div className="flex items-center justify-between mb-2.5 text-sm">
          <span className="text-taupe-dark text-xs">{step === "shipping" ? "Step 1 of 2" : "Step 2 of 2"}</span>
          <span className="font-semibold text-deep-brown tabular-nums">{pricing.formattedTotal}</span>
        </div>

        {step === "shipping" && (
          <button type="button" onClick={handleContinueToPayment}
            className="w-full h-12 rounded-none text-white font-semibold text-sm tracking-wide
                       active:scale-[0.98] transition-all duration-150 shadow-sm"
            style={{ backgroundColor: accent }}>
            Continue to Payment →
          </button>
        )}
        {step === "shipping" && showAllShipErrors && Object.keys(shipErrors).length > 0 && (
          <p className="text-[10px] text-red-600 text-center mt-1 font-system">
            Please fix the highlighted fields above before continuing.
          </p>
        )}
        {step === "payment" && (
          <div className="flex gap-3">
            <button type="button"
              onClick={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
              className="h-12 px-5 rounded-none border-2 border-stone-200 text-stone-500
                         font-medium text-sm active:bg-stone-100 transition-all duration-150 shrink-0">
              ← Back
            </button>
            {mode === "international" && intlMethod === "stripe-card" ? (
              // The real Stripe submit button lives inline next to the card
              // fields (StripeCardForm, inside <Elements>) — a detached
              // sticky-bar button can't reach that context, and putting a
              // pay button anywhere but right next to the card form is
              // confusing anyway. This is just a pointer to it.
              <div className="flex-1 h-12 rounded-none border-2 border-taupe/30 flex items-center justify-center
                              text-xs text-taupe-dark px-3 text-center">
                ↑ Enter card details above to pay
              </div>
            ) : (
              <button type="button"
                onClick={
                  mode === "nigerian"
                    ? handleBankTransferConfirm
                    : handleInternationalTransferConfirm
                }
                disabled={!termsAccepted || submitting}
                className="flex-1 h-12 rounded-none text-white font-semibold text-sm
                           active:scale-[0.98] transition-all duration-150 shadow-sm
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: accent }}>
                {submitting ? "Saving…" : "Confirm Order"}
              </button>
            )}
          </div>
        )}
        {submitError && step === "payment" && (
          <p className="text-[10px] text-red-600 text-center mt-1">{submitError}</p>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-stone-500">
          <span className="text-emerald-500"><IcoShield /></span>
          {mode === "nigerian" ? "Bank transfer secured" : "PCI-DSS Level 1 · Stripe secured"}
        </div>
      </div>
    </div>
  );
}
