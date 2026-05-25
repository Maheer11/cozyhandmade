"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { } from "@/lib/products";
import type { CheckoutPricing } from "@/lib/currency/types";

/* ─── Paystack inline script loader ─────────────────────── */
interface PaystackHandler {
  setup: (config: {
    key: string; email: string; amount: number; currency: string; ref: string;
    callback: (response: { reference: string }) => void;
    onClose: () => void;
  }) => { openIframe: () => void };
}
function loadPaystack(): Promise<PaystackHandler> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as { PaystackPop?: PaystackHandler };
    if (win.PaystackPop) { resolve(win.PaystackPop); return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload  = () => win.PaystackPop ? resolve(win.PaystackPop) : reject(new Error("PaystackPop not found"));
    script.onerror = () => reject(new Error("Failed to load Paystack script"));
    document.head.appendChild(script);
  });
}

/* ─── Types ─────────────────────────────────────────────── */
type CheckoutMode      = "nigerian" | "international";
type Step              = "shipping" | "payment" | "confirmation";
type NigerianPayMethod = "bank-transfer" | "card";
type IntlPayMethod     = "bank-transfer" | "stripe-card";
type ShipInfo = {
  firstName: string; lastName: string; email: string; phone: string;
  address: string; city: string; postcode: string; country: string; state: string;
};

/* ─── International bank account details (from env) ─────── */
const BANK: Record<string, { label: string; network: string; fields: [string, string][] }> = {
  EUR: {
    label:   "EUR — SEPA Transfer",
    network: "SEPA · arrives same/next business day · free to receive",
    fields:  [
      ["IBAN",     process.env.NEXT_PUBLIC_BANK_EUR_IBAN ?? "IE00WISE00000000000000"],
      ["BIC/SWIFT",process.env.NEXT_PUBLIC_BANK_EUR_BIC  ?? "TRWTIGALXXX"],
      ["Name",     process.env.NEXT_PUBLIC_BANK_EUR_NAME ?? "Woven With Love"],
    ],
  },
  GBP: {
    label:   "GBP — UK Bank Transfer",
    network: "Faster Payments · arrives within hours · free to receive",
    fields:  [
      ["Sort Code", process.env.NEXT_PUBLIC_BANK_GBP_SORT    ?? "23-14-70"],
      ["Account",   process.env.NEXT_PUBLIC_BANK_GBP_ACCOUNT ?? "00000000"],
      ["Name",      process.env.NEXT_PUBLIC_BANK_GBP_NAME    ?? "Woven With Love"],
    ],
  },
  USD: {
    label:   "USD — US Bank Transfer (ACH)",
    network: "ACH · arrives 1–2 business days · free to receive",
    fields:  [
      ["Routing No.", process.env.NEXT_PUBLIC_BANK_USD_ROUTING ?? "026073150"],
      ["Account No.", process.env.NEXT_PUBLIC_BANK_USD_ACCOUNT ?? "0000000000"],
      ["Name",        process.env.NEXT_PUBLIC_BANK_USD_NAME    ?? "Woven With Love"],
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

const FREE_SHIP_NGN = 50000;
const SHIPPING_NGN  = 6000;

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
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/60 font-body">Woven with Love</p>
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
        <div className="overflow-y-auto flex-1 px-5 py-5 text-xs text-stone-700 leading-relaxed space-y-4 font-body">

          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            Last updated: {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>

          {[
            {
              title: "1. Acceptance of Terms",
              body: `By placing an order on Woven with Love ("we", "us", "our"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please do not proceed with your purchase.`,
            },
            {
              title: "2. Handmade Products",
              body: `All items sold on this platform are handcrafted by skilled artisans. Because each piece is made by hand, there may be slight variations in colour, texture, size, and pattern compared to the product photographs. These variations are a natural characteristic of handmade goods and are not considered defects. Product images are for illustrative purposes only.`,
            },
            {
              title: "3. Pricing & Payment",
              body: `Prices are displayed in your selected currency and are subject to change without notice. For Nigerian customers, payment is processed in Nigerian Naira (NGN) via Paystack or local bank transfer. For international customers, payment is processed in your selected currency via Stripe. All transactions are encrypted. We reserve the right to cancel any order if payment cannot be verified.`,
            },
            {
              title: "4. Bank Transfer Orders",
              body: `If you choose bank transfer, your order is only confirmed once we have verified receipt of the exact amount including your unique reference number. Orders will not be dispatched before payment confirmation. We aim to confirm bank transfers within 1–2 business hours. We are not responsible for transfers sent without the correct reference number.`,
            },
            {
              title: "5. Shipping & Delivery",
              body: `Domestic (Nigeria): We ship to all 36 states and FCT. Estimated delivery is 2–5 business days from dispatch. International: We ship worldwide. Estimated delivery is 2–14 working days depending on your location and local customs processing. We are not responsible for delays caused by customs, border controls, or third-party couriers. Tracked shipping is included on all orders.`,
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
              body: `All designs, photographs, text, and branding on this platform are the exclusive property of Woven with Love. Reproduction, distribution, or use of any content without prior written consent is strictly prohibited.`,
            },
            {
              title: "9. Limitation of Liability",
              body: `To the fullest extent permitted by law, Woven with Love shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the value of the order placed.`,
            },
            {
              title: "10. Privacy",
              body: `We collect only the personal information necessary to process your order (name, address, email, phone number). We do not sell or share your data with third parties except payment processors (Paystack, Stripe) and courier services required to fulfil your order. Your data is stored securely and handled in accordance with applicable data protection laws.`,
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
function LogoPaystack() {
  return (
    <span className="inline-flex items-center gap-1">
      <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0">
        <circle cx="6" cy="6" r="6" fill="#0BA4DB" />
      </svg>
      <svg viewBox="0 0 72 14" className="h-3 w-auto">
        <text x="0" y="11" fontFamily="system-ui,-apple-system,Helvetica,sans-serif"
              fontWeight="700" fontSize="12" fill="#0BA4DB">paystack</text>
      </svg>
    </span>
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
───────────────────────────────────────────────────────── */
function Field({ id, label, type = "text", placeholder, value, onChange, span2 = false, accent = "#C9A96E" }:
  { id: string; label: string; type?: string; placeholder: string;
    value: string; onChange: (v: string) => void; span2?: boolean; accent?: string }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown text-sm
                   placeholder:text-taupe/60 focus:outline-none transition-all duration-200"
        onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}28`; }}
        onBlur={(e)  => { e.target.style.borderColor = "";     e.target.style.boxShadow = ""; }} />
    </div>
  );
}

function SelectField({ id, label, value, onChange, children, span2 = false }:
  { id: string; label: string; value: string; onChange: (v: string) => void;
    children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown text-sm
                   cursor-pointer focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                   transition-all duration-200">
        {children}
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST BADGES
───────────────────────────────────────────────────────── */
function TrustBadges({ mode }: { mode: CheckoutMode }) {
  const badges = [
    { ico: <IcoShield />, label: "SSL Secured",    sub: "256-bit encryption",                         green: true  },
    { ico: <IcoBadge />,  label: mode === "nigerian" ? "CBN Licensed" : "PCI-DSS Level 1",
                           sub:  mode === "nigerian" ? "via Paystack"  : "Stripe certified",           green: true  },
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
            <LogoBadge><LogoPaystack /></LogoBadge>
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
function OrderSummary({ items, pricing, mode, orderRef }: {
  items: ReturnType<typeof useCart>["items"];
  pricing: CheckoutPricing;
  mode: CheckoutMode;
  orderRef: string;
}) {
  const { formatAmount } = useCurrency();
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-3">

      {/* ── Printable receipt ── */}
      <div id="order-receipt-wrapper">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm"
             style={{ border: "1px solid #E8D5C4" }}>

          {/* Header — burgundy */}
          <div className="px-5 pt-5 pb-4 text-center" style={{ backgroundColor: "#8B2035" }}>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 mb-1 font-body">
              Woven with Love
            </p>
            <p className="font-heading italic text-white text-xl font-400 leading-tight">
              Purchase Receipt
            </p>
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] text-white/65 font-body">
              <span>#{orderRef}</span>
              <span className="opacity-40">·</span>
              <span>{today}</span>
            </div>
          </div>

          {/* Zigzag tear edge */}
          <div className="relative overflow-hidden h-3" style={{ backgroundColor: "#8B2035" }}>
            <svg viewBox="0 0 400 12" preserveAspectRatio="none"
                 className="absolute bottom-0 left-0 w-full h-3">
              <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0
                       L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12
                       L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0
                       L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L350,0 L360,12
                       L370,0 L380,12 L390,0 L400,12 Z" fill="white" />
            </svg>
          </div>

          <div className="px-5 pt-3 pb-5">

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-1 mb-2 pb-1.5"
                 style={{ borderBottom: "1px solid #F0E4D8" }}>
              <span className="col-span-1 text-[8px] uppercase tracking-wider font-semibold"
                    style={{ color: "#8B2035" }}>Qty</span>
              <span className="col-span-5 text-[8px] uppercase tracking-wider font-semibold"
                    style={{ color: "#8B2035" }}>Item</span>
              <span className="col-span-3 text-[8px] uppercase tracking-wider font-semibold"
                    style={{ color: "#8B2035" }}>Type</span>
              <span className="col-span-3 text-[8px] uppercase tracking-wider font-semibold text-right"
                    style={{ color: "#8B2035" }}>Total</span>
            </div>

            {/* Item rows */}
            <div className="space-y-3.5 mb-4">
              {items.map((item) => {

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-1 items-start">
                    {/* Qty bubble */}
                    <div className="col-span-1 pt-0.5">
                      <span className="inline-flex items-center justify-center w-5 h-5
                                       rounded-full text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: "#8B2035" }}>
                        {item.quantity}
                      </span>
                    </div>

                    {/* Name + unit price */}
                    <div className="col-span-5">
                      <p className="text-[11px] font-semibold leading-snug"
                         style={{ color: "#1A0810" }}>
                        {item.name}
                      </p>
                      <p className="text-[9px] mt-0.5 font-body" style={{ color: "#9B3A50" }}>
                        {formatAmount(item.price)} each
                      </p>
                    </div>

                    <div className="col-span-3" />

                    {/* Line total */}
                    <p className="col-span-3 text-right text-[11px] font-bold pt-0.5"
                       style={{ color: "#1A0810" }}>
                      {formatAmount(item.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Dashed divider */}
            <div className="border-t-2 border-dashed mb-3" style={{ borderColor: "#F0E4D8" }} />

            {/* Subtotals */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs font-body" style={{ color: "#7A2030" }}>
                <span>Subtotal</span>
                <span>{pricing.formattedSubtotal}</span>
              </div>
              <div className="flex justify-between text-xs font-body" style={{ color: "#7A2030" }}>
                <span>Shipping</span>
                <span className={pricing.shippingNGN === 0 ? "font-semibold" : ""}
                      style={{ color: pricing.shippingNGN === 0 ? "#008751" : "#7A2030" }}>
                  {pricing.formattedShipping}
                </span>
              </div>
            </div>

            {/* Total row — burgundy pill */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                 style={{ backgroundColor: "#8B2035" }}>
              <span className="text-xs font-bold tracking-wider text-white uppercase font-body">
                Total to Pay
              </span>
              <span className="text-sm font-bold text-white font-heading">
                {pricing.formattedTotal}
              </span>
            </div>

            {/* Payment method note */}
            <p className="text-[9px] text-center mt-3 font-body" style={{ color: "#D49AA8" }}>
              {mode === "nigerian"
                ? "Processed via Paystack · CBN Licensed · NGN"
                : `Processed via Stripe · PCI-DSS Level 1 · ${pricing.currency}`}
            </p>

            {/* Dashed footer */}
            <div className="border-t-2 border-dashed mt-3 pt-3 text-center"
                 style={{ borderColor: "#F0E4D8" }}>
              <p className="text-[8px] uppercase tracking-[0.25em] font-body"
                 style={{ color: "#D49AA8" }}>
                est. 2018 · handcrafted with ♡
              </p>
            </div>
          </div>
        </div>

        {/* Print button — hidden when actually printing */}
        <button
          onClick={() => window.print()}
          className="print:hidden mt-2 w-full flex items-center justify-center gap-2
                     py-2.5 rounded-xl border-2 text-xs font-semibold tracking-wide
                     transition-all duration-200 hover:-translate-y-px font-body"
          style={{ borderColor: "#8B2035", color: "#8B2035", backgroundColor: "transparent" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Print Receipt
        </button>
      </div>

      {/* Trust badges + payment logos */}
      <div className="print:hidden bg-white rounded-2xl shadow-sm p-4"
           style={{ border: "1px solid #E8D5C4" }}>
        <TrustBadges mode={mode} />
        <PaymentLogos mode={mode} />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SHIPPING STEP
═════════════════════════════════════════════════════════ */
function ShippingStep({ mode, ship, setShip, onNext }: {
  mode: CheckoutMode; ship: ShipInfo;
  setShip: (s: ShipInfo) => void; onNext: () => void;
}) {
  const accent = mode === "nigerian" ? "#008751" : "#8B2035";
  const isNG   = mode === "nigerian";
  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
      <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">Shipping Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="fn" label="First Name" placeholder={isNG ? "Amaka" : "Jane"}
               value={ship.firstName} onChange={(v) => setShip({ ...ship, firstName: v })} accent={accent} />
        <Field id="ln" label="Last Name"  placeholder={isNG ? "Okonkwo" : "Smith"}
               value={ship.lastName}  onChange={(v) => setShip({ ...ship, lastName: v })}  accent={accent} />
        <Field id="em" label="Email Address" type="email"
               placeholder={isNG ? "amaka@gmail.com" : "jane@example.com"}
               value={ship.email} onChange={(v) => setShip({ ...ship, email: v })} span2 accent={accent} />
        <Field id="ph" label="Phone" type="tel"
               placeholder={isNG ? "+234 080 0000 0000" : "+44 7700 000000"}
               value={ship.phone} onChange={(v) => setShip({ ...ship, phone: v })} span2 accent={accent} />
        <Field id="addr" label="Street Address"
               placeholder={isNG ? "12 Allen Avenue, Ikeja" : "12 Willow Lane"}
               value={ship.address} onChange={(v) => setShip({ ...ship, address: v })} span2 accent={accent} />
        <Field id="city" label="City / Town" placeholder={isNG ? "Lagos" : "London"}
               value={ship.city} onChange={(v) => setShip({ ...ship, city: v })} accent={accent} />
        {isNG ? (
          <SelectField id="state" label="State" value={ship.state}
                       onChange={(v) => setShip({ ...ship, state: v })}>
            <option value="">Select state…</option>
            {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectField>
        ) : (
          <>
            <Field id="pc" label="Postcode / ZIP" placeholder="SW1A 1AA"
                   value={ship.postcode} onChange={(v) => setShip({ ...ship, postcode: v })} accent={accent} />
            <SelectField id="country" label="Country" value={ship.country}
                         onChange={(v) => setShip({ ...ship, country: v })} span2>
              <option value="GB">United Kingdom</option>
              <option value="IE">Ireland</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="Other">Other</option>
            </SelectField>
          </>
        )}
      </div>

      {isNG ? (
        <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
          <div className="w-4 h-4 shrink-0 text-emerald-600"><IcoBadge /></div>
          We ship to all 36 Nigerian states + FCT · Delivery: 2–5 business days
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800">
          <div className="w-4 h-4 shrink-0 text-blue-500"><IcoTruck /></div>
          International shipping · We deliver within <strong>2–14 working days</strong> depending on your location
        </div>
      )}

      <div className="hidden lg:flex justify-end mt-6">
        <button onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-none text-cream font-semibold
                     text-sm tracking-wide hover:-translate-y-px transition-all duration-200 shadow-sm"
          style={{ backgroundColor: accent }}>
          Continue to Payment <IcoArrow />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   NIGERIAN PAYMENT STEP  — Paystack / Bank Transfer (always NGN)
═════════════════════════════════════════════════════════ */
function NigerianPaymentStep({ orderTotalNGN, orderRef, nigerianMethod, setNigerianMethod, onBack, onBankTransferConfirm, onPaystackConfirm, isSubmitting, submitError, termsAccepted, setTermsAccepted, onShowTerms }: {
  orderTotalNGN: number;
  orderRef: string;
  nigerianMethod: NigerianPayMethod; setNigerianMethod: (m: NigerianPayMethod) => void;
  onBack: () => void;
  onBankTransferConfirm: () => void;
  onPaystackConfirm: () => void;
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
    ["Account Number", "0312 445 678",       "acct"],
    ["Account Name",   "Woven With Love Ltd.", "name"],
    ["Amount",         formattedNGN,           "amt"],
    ["Reference",      orderRef,               "ref"],
  ] as [string, string, string][];

  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
      <h2 className="font-heading font-600 text-deep-brown text-xl mb-2">Payment</h2>
      <p className="text-xs text-taupe-dark mb-5">Select how you&apos;d like to complete your payment.</p>

      {/* Tabs */}
      <div className="flex border border-stone-200 rounded-none overflow-hidden mb-6">
        <button onClick={() => setNigerianMethod("bank-transfer")}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                      ${nigerianMethod === "bank-transfer" ? "text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          style={nigerianMethod === "bank-transfer" ? { backgroundColor: "#008751" } : {}}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l2.25 2.25M6.75 5.25l-2.25 2.25M21 21l-2.25-2.25m0 0l-2.25-2.25M17.25 18.75l2.25-2.25M3 3l3.75 3.75M21 3l-3.75 3.75M3 21l3.75-3.75M12 12h.008v.008H12V12z"/>
          </svg>
          Bank Transfer
        </button>
        <div className="w-px bg-stone-200" />
        <button onClick={() => setNigerianMethod("card")}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                      ${nigerianMethod === "card" ? "text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          style={nigerianMethod === "card" ? { backgroundColor: "#0BA4DB" } : {}}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
          </svg>
          Pay with Card
        </button>
      </div>

      {/* ── Bank Transfer ── */}
      {nigerianMethod === "bank-transfer" && (
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
                    <p className={`text-sm font-semibold truncate ${key === "ref" ? "text-gold" : "text-stone-900"}`}>
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
            className="mt-5 inline-flex items-center gap-2 px-10 py-3 rounded-none text-white font-semibold
                       text-sm tracking-wide transition-all duration-200 shadow-sm
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                       enabled:hover:-translate-y-px enabled:shadow-sm"
            style={{ backgroundColor: "#008751" }}>
            {isSubmitting ? "Saving order…" : <>I&apos;ve Sent the Payment <IcoCheck /></>}
          </button>
        </div>
      )}

      {/* ── Card / Paystack ── */}
      {nigerianMethod === "card" && (
        <div>
          {/* Paystack header */}
          <div className="rounded-t-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#0BA4DB" }}>
            <LogoPaystack />
            <div className="ml-auto flex items-center gap-2">
              <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold text-white">Verve</div>
              <svg viewBox="0 0 34 12" className="h-2.5 w-auto">
                <text x="0" y="10" fontStyle="italic" fontWeight="800" fontSize="11" fill="white">VISA</text>
              </svg>
              <div className="flex items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 -ml-2 opacity-90" />
              </div>
            </div>
          </div>

          {/* Info panel — no fake card form, Paystack handles card entry in its popup */}
          <div className="bg-white border border-t-0 border-stone-200 rounded-b-xl px-5 py-5 mb-5">
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              Clicking <strong>Pay now</strong> opens a secure Paystack popup where you enter your card details.
              Your card information is handled entirely by Paystack and is never stored on our servers.
            </p>
            <div className="space-y-2">
              {[
                ["CBN Licensed payment processor", <IcoBadge key="b" />],
                ["3D Secure (3DS) authentication", <IcoShield key="s" />],
                ["Accepts Visa · Mastercard · Verve · USSD · Bank Transfer", <IcoCheck key="c" />],
              ].map(([label, icon]) => (
                <div key={label as string} className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="text-emerald-600 w-3.5 h-3.5 shrink-0">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} onShowTerms={onShowTerms} />

          {submitError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {submitError}
            </p>
          )}

          <button onClick={onPaystackConfirm} disabled={!termsAccepted || isSubmitting}
            className="mt-5 inline-flex items-center gap-2 px-10 py-3 rounded-none text-white font-semibold
                       text-sm tracking-wide transition-all duration-200 shadow-sm
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                       enabled:hover:-translate-y-px"
            style={{ backgroundColor: "#0BA4DB" }}>
            {isSubmitting ? "Verifying payment…" : <>Pay {formattedNGN} with Paystack <IcoArrow /></>}
          </button>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
            <div className="text-emerald-600"><IcoShield /></div>
            Secured by Paystack · CBN Licensed
          </div>
        </div>
      )}

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
   INTERNATIONAL PAYMENT STEP  — Bank Transfer or Stripe
═════════════════════════════════════════════════════════ */
function InternationalPaymentStep({
  formattedTotal, currency, intlMethod, setIntlMethod,
  onBack, onTransferConfirm, onStripeConfirm,
  isSubmitting, submitError,
  termsAccepted, setTermsAccepted, onShowTerms,
}: {
  formattedTotal: string;
  currency: string;
  intlMethod: IntlPayMethod;
  setIntlMethod: (m: IntlPayMethod) => void;
  onBack: () => void;
  onTransferConfirm: () => void;
  onStripeConfirm: () => void;
  isSubmitting: boolean;
  submitError: string;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onShowTerms: () => void;
}) {
  const [cardNum,  setCardNum]  = useState("");
  const [expiry,   setExpiry]   = useState("");
  const [cvv,      setCvv]      = useState("");
  const [cardName, setCardName] = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);

  // Pick the matching bank account, fall back to EUR for unsupported currencies
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
                    <p className="text-sm font-semibold text-stone-900 truncate">{value}</p>
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
                  <p className="text-sm font-bold text-stone-900">{formattedTotal}</p>
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
            className="mt-5 inline-flex items-center gap-2 px-10 py-3 rounded-none text-white font-semibold
                       text-sm tracking-wide transition-all duration-200 shadow-sm
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

          <div className="bg-white border border-t-0 border-stone-200 rounded-b-xl p-5 space-y-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Card Number</label>
              <input type="text" placeholder="1234 5678 9012 3456" value={cardNum}
                onChange={(e) => { const n = e.target.value.replace(/\D/g,"").slice(0,16); setCardNum(n.replace(/(.{4})/g,"$1 ").trim()); }}
                className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm
                           placeholder:text-stone-300 focus:outline-none focus:border-[#635BFF]
                           focus:ring-2 focus:ring-[#635BFF]/20 transition-all duration-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Expiry</label>
                <input type="text" placeholder="MM / YY" value={expiry}
                  onChange={(e) => { const n = e.target.value.replace(/\D/g,"").slice(0,4); setExpiry(n.length>2?`${n.slice(0,2)} / ${n.slice(2)}`:n); }}
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm
                             placeholder:text-stone-300 focus:outline-none focus:border-[#635BFF]
                             focus:ring-2 focus:ring-[#635BFF]/20 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">CVV</label>
                <input type="password" placeholder="•••" value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g,"").slice(0,4))}
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm
                             placeholder:text-stone-300 focus:outline-none focus:border-[#635BFF]
                             focus:ring-2 focus:ring-[#635BFF]/20 transition-all duration-200" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Name on Card</label>
              <input type="text" placeholder="JANE SMITH" value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm
                           placeholder:text-stone-300 focus:outline-none focus:border-[#635BFF]
                           focus:ring-2 focus:ring-[#635BFF]/20 transition-all duration-200" />
            </div>
          </div>

          <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} onShowTerms={onShowTerms} />

          <button type="button" onClick={onStripeConfirm} disabled={!termsAccepted}
            className="mt-5 inline-flex items-center gap-2 px-10 py-3 rounded-none text-white font-semibold
                       text-sm tracking-wide transition-all duration-200 shadow-sm
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                       enabled:hover:-translate-y-px"
            style={{ backgroundColor: "#635BFF" }}>
            Pay {formattedTotal} with Stripe <IcoArrow />
          </button>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
            <div className="text-emerald-600"><IcoShield /></div>
            PCI-DSS Level 1 compliant · Stripe certified
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
function ConfirmationScreen({ mode, nigerianMethod, orderRef, firstName, pricing, orderTotalNGN, clearCart }: {
  mode: CheckoutMode; nigerianMethod: NigerianPayMethod;
  orderRef: string; firstName: string;
  pricing: CheckoutPricing; orderTotalNGN: number;
  clearCart: () => void;
}) {
  const isPending = mode === "nigerian" && nigerianMethod === "bank-transfer";
  const displayAmount = isPending
    ? `₦${orderTotalNGN.toLocaleString("en-NG")}`
    : pricing.formattedTotal;

  return (
    <div className="min-h-screen bg-cream flex items-start justify-center px-4 pt-10 pb-24">
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
              ["Payment via", mode === "nigerian"
                ? nigerianMethod === "bank-transfer" ? "Bank Transfer (NGN)" : "Paystack Card (NGN)"
                : `Stripe (${pricing.currency})`],
              ["Estimated Delivery", mode === "nigerian" ? "2–5 business days" : "2–14 working days"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-taupe-dark">{label}</span>
                <span className="font-semibold text-deep-brown text-right max-w-[55%]">{value}</span>
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
        </div>

        {/* Share */}
        <div className="bg-white rounded-2xl border border-cream-darker p-4 shadow-sm mb-4 text-center">
          <p className="text-xs font-semibold text-deep-brown mb-1">Share the love</p>
          <p className="text-[10px] text-taupe-dark mb-3">Tag us when your order arrives</p>
          <div className="flex items-center justify-center gap-3">
            <a href="#" className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all"
               style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="#" className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all"
               style={{ backgroundColor: "#25D366" }}>
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        </div>

        <Link href="/products" onClick={() => clearCart()}
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
   MAIN PAGE  — mode auto-derived from selected currency
═════════════════════════════════════════════════════════ */
export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { currency, priceCheckout } = useCurrency();

  // NGN → Nigerian checkout (Paystack + local bank transfer). Any other currency → Stripe international.
  const mode: CheckoutMode = currency === "NGN" ? "nigerian" : "international";
  const accent = mode === "nigerian" ? "#008751" : "#8B2035";

  const shippingNGN  = total >= FREE_SHIP_NGN ? 0 : SHIPPING_NGN;
  const orderTotalNGN = total + shippingNGN;
  const pricing       = priceCheckout(total, shippingNGN);

  const [step,           setStep]           = useState<Step>("shipping");
  const [nigerianMethod, setNigerianMethod] = useState<NigerianPayMethod>("bank-transfer");
  const [intlMethod,     setIntlMethod]     = useState<IntlPayMethod>("bank-transfer");
  const [termsAccepted,  setTermsAccepted]  = useState(false);
  const [showTerms,      setShowTerms]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState("");
  const [savedOrderId,   setSavedOrderId]   = useState<string | null>(null);
  const [orderRef]                          = useState(() =>
    `WIL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  );
  const [ship, setShip] = useState<ShipInfo>({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", postcode: "", country: mode === "nigerian" ? "NG" : "GB", state: "",
  });

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
          })),
          total_amount: orderTotalNGN,
          delivery_address: ship,
          payment_method: "bank_transfer",
          order_ref: orderRef,
          currency: "NGN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not save your order. Please try again.");
        return;
      }
      setSavedOrderId(data.order_id);
      setStep("confirmation");
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaystackPayment() {
    if (!ship.email) {
      setSubmitError("Please enter your email in the shipping step first.");
      return;
    }
    setSubmitError("");
    try {
      const PaystackPop = await loadPaystack();
      const handler = PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
        email:    ship.email,
        amount:   orderTotalNGN * 100, // Paystack works in kobo (1/100 of NGN)
        currency: "NGN",
        ref:      orderRef,
        callback: async (response) => {
          setSubmitting(true);
          try {
            const res = await fetch("/api/payments/paystack/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference:        response.reference,
                items:            items.map((item) => ({
                  product_id:    item.id,
                  product_name:  item.name,
                  product_image: item.image,
                  quantity:      item.quantity,
                  unit_price:    item.price,
                })),
                total_amount:     orderTotalNGN,
                delivery_address: ship,
                currency:         "NGN",
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              setSubmitError(data.error ?? `Payment went through but order save failed. Keep your ref: ${response.reference}`);
              return;
            }
            setSavedOrderId(data.order_id);
            setStep("confirmation");
          } catch {
            setSubmitError(`Verification failed. Payment may have gone through — contact us with ref: ${response.reference}`);
          } finally {
            setSubmitting(false);
          }
        },
        onClose: () => {
          // customer closed popup without paying — no action needed
        },
      });
      handler.openIframe();
    } catch {
      setSubmitError("Could not load Paystack. Please check your connection and try again.");
    }
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
          })),
          total_amount: pricing.totalNGN,
          delivery_address: ship,
          payment_method: "swift_transfer",
          order_ref: orderRef,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not save your order. Please try again.");
        return;
      }
      setSavedOrderId(data.order_id);
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
      <div className="min-h-[70vh] bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-heading text-2xl font-700 text-deep-brown mb-4">Nothing to check out</h1>
        <Link href="/products"
              className="inline-flex items-center justify-center px-8 py-3 rounded-none
                         bg-gold text-cream font-semibold text-sm hover:bg-gold-dark transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  /* Confirmation */
  if (step === "confirmation") {
    return (
      <ConfirmationScreen
        mode={mode} nigerianMethod={nigerianMethod}
        orderRef={orderRef} firstName={ship.firstName}
        pricing={pricing} orderTotalNGN={orderTotalNGN}
        clearCart={clearCart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
                 stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <h1 className="font-heading text-xl sm:text-2xl font-700 text-deep-brown">Secure Checkout</h1>
          </div>
          <p className="text-xs font-medium tracking-wide" style={{ color: accent }}>
            {mode === "nigerian"
              ? "Nigerian Orders · Paystack & Bank Transfer"
              : `International · Stripe · ${currency}`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-40 lg:pb-10">
        <StepBar current={step} mode={mode} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Form */}
          <div className="flex-1 min-w-0 space-y-4">
            {step === "shipping" && (
              <ShippingStep mode={mode} ship={ship} setShip={setShip} onNext={() => setStep("payment")} />
            )}
            {step === "payment" && mode === "nigerian" && (
              <NigerianPaymentStep
                orderTotalNGN={orderTotalNGN} orderRef={orderRef}
                nigerianMethod={nigerianMethod} setNigerianMethod={setNigerianMethod}
                onBack={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
                onBankTransferConfirm={handleBankTransferConfirm}
                onPaystackConfirm={handlePaystackPayment}
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
                currency={currency}
                intlMethod={intlMethod}
                setIntlMethod={setIntlMethod}
                onBack={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
                onTransferConfirm={handleInternationalTransferConfirm}
                onStripeConfirm={() => setStep("confirmation")}
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
            <OrderSummary items={items} pricing={pricing} mode={mode} orderRef={orderRef} />
          </div>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur-md
                      border-t border-taupe/20 px-4 pt-3 shadow-2xl"
           style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
        <div className="flex items-center justify-between mb-2.5 text-sm">
          <span className="text-taupe-dark text-xs">{step === "shipping" ? "Step 1 of 2" : "Step 2 of 2"}</span>
          <span className="font-semibold text-deep-brown">{pricing.formattedTotal}</span>
        </div>

        {step === "shipping" && (
          <button type="button" onClick={() => setStep("payment")}
            className="w-full h-12 rounded-none text-white font-semibold text-sm tracking-wide
                       active:scale-[0.98] transition-all duration-150 shadow-sm"
            style={{ backgroundColor: accent }}>
            Continue to Payment →
          </button>
        )}
        {step === "payment" && (
          <div className="flex gap-3">
            <button type="button"
              onClick={() => { setStep("shipping"); setTermsAccepted(false); setSubmitError(""); }}
              className="h-12 px-5 rounded-none border-2 border-stone-200 text-stone-500
                         font-medium text-sm active:bg-stone-100 transition-all duration-150 shrink-0">
              ← Back
            </button>
            <button type="button"
              onClick={
                mode === "nigerian" && nigerianMethod === "bank-transfer"
                  ? handleBankTransferConfirm
                  : mode === "international" && intlMethod === "bank-transfer"
                    ? handleInternationalTransferConfirm
                    : () => setStep("confirmation")
              }
              disabled={!termsAccepted || submitting}
              className="flex-1 h-12 rounded-none text-white font-semibold text-sm
                         active:scale-[0.98] transition-all duration-150 shadow-sm
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: accent }}>
              {submitting ? "Saving…"
                : (mode === "nigerian" && nigerianMethod === "bank-transfer") ||
                  (mode === "international" && intlMethod === "bank-transfer")
                  ? "Confirm Order"
                  : `Pay ${mode === "nigerian" ? `₦${orderTotalNGN.toLocaleString("en-NG")}` : pricing.formattedTotal}`}
            </button>
          </div>
        )}
        {submitError && step === "payment" && (
          <p className="text-[10px] text-red-600 text-center mt-1">{submitError}</p>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-stone-500">
          <span className="text-emerald-500"><IcoShield /></span>
          {mode === "nigerian" ? "CBN Licensed · Paystack secured" : "PCI-DSS Level 1 · Stripe secured"}
        </div>
      </div>
    </div>
  );
}
