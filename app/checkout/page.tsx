"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";

type Step = "shipping" | "payment" | "confirmation";

const STEPS: { key: Step; label: string; n: number }[] = [
  { key: "shipping", label: "Shipping", n: 1 },
  { key: "payment", label: "Payment", n: 2 },
  { key: "confirmation", label: "Confirm", n: 3 },
];

/* ── Step indicator ── */
function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = s.key === current;
        return (
          <li key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center
                               text-sm font-semibold transition-all duration-300
                               ${done ? "bg-gold text-cream"
                                 : active ? "bg-terracotta text-cream"
                                 : "bg-cream-darker text-taupe-dark"}`}>
                {done
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  : s.n}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-brown" : "text-taupe-dark"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-14 sm:w-20 h-px mx-2 mb-5 transition-colors duration-300
                               ${done ? "bg-gold" : "bg-taupe/25"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Shared field components ── */
function Field({
  id, label, type = "text", placeholder, value, onChange, span2 = false,
}: {
  id: string; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 px-4 rounded-2xl border border-taupe/40 bg-white
                   text-deep-brown text-sm placeholder:text-taupe/60
                   focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                   transition-all duration-200"
      />
    </div>
  );
}

function SelectField({
  id, label, value, onChange, children,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 px-4 rounded-2xl border border-taupe/40 bg-white
                   text-deep-brown text-sm cursor-pointer
                   focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                   transition-all duration-200"
      >
        {children}
      </select>
    </div>
  );
}

/* ── Order mini-summary (sidebar / bottom sheet) ── */
function OrderSummary({
  items, total, shippingCost, orderTotal,
}: {
  items: ReturnType<typeof useCart>["items"];
  total: number; shippingCost: number; orderTotal: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5">
      <h3 className="font-heading font-600 text-deep-brown text-base mb-4">Your Order</h3>
      <ul className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <span className="w-6 h-6 bg-terracotta/10 text-terracotta text-[10px] font-bold
                             rounded-full flex items-center justify-center shrink-0">
              {item.quantity}
            </span>
            <span className="flex-1 text-brown/75 leading-snug line-clamp-1 text-xs">{item.name}</span>
            <span className="font-medium text-brown text-xs shrink-0">
              £{(item.price * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-taupe/20 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-brown/70">
          <span>Subtotal</span><span>£{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-brown/70">
          <span>Shipping</span>
          <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
            {shippingCost === 0 ? "FREE" : `£${shippingCost.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-deep-brown pt-1 border-t border-taupe/20">
          <span>Total</span><span>£{orderTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main checkout page ── */
export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<Step>("shipping");
  const [orderRef] = useState(
    () => `CH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  );

  const [ship, setShip] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", postcode: "", country: "GB",
  });
  const [pay, setPay] = useState({
    cardName: "", cardNumber: "", expiry: "", cvv: "",
  });

  const shippingCost = total >= 60 ? 0 : 4.99;
  const orderTotal = total + shippingCost;

  /* ── Empty cart guard ── */
  if (items.length === 0 && step !== "confirmation") {
    return (
      <div className="min-h-[70vh] bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-heading text-2xl font-700 text-deep-brown mb-4">Nothing to check out</h1>
        <Link href="/products"
              className="flex items-center justify-center h-14 w-full max-w-xs rounded-2xl
                         bg-terracotta text-cream font-semibold text-base
                         active:bg-terracotta-dark transition-colors duration-150">
          Shop Now
        </Link>
      </div>
    );
  }

  /* ── Confirmation screen ── */
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-cream flex items-start justify-center px-4 pt-10 pb-24">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-gold/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-terracotta text-[10px] uppercase tracking-[0.2em] font-medium mb-2">
            Order confirmed
          </p>
          <h1 className="font-heading text-3xl font-700 text-deep-brown mb-3">
            Thank you{ship.firstName ? `, ${ship.firstName}` : ""}!
          </h1>
          <p className="text-brown/70 text-sm leading-relaxed mb-2">
            Your order <span className="font-semibold text-brown">{orderRef}</span> is confirmed.
            Our artisans are already preparing your pieces.
          </p>
          {ship.email && (
            <p className="text-sm text-taupe-dark mb-8">
              Confirmation sent to <strong className="text-brown">{ship.email}</strong>
            </p>
          )}

          <div className="bg-white rounded-2xl border border-cream-darker p-5 mb-8 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-taupe-dark">Order ref</span>
              <span className="font-semibold text-deep-brown">{orderRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe-dark">Total paid</span>
              <span className="font-semibold text-deep-brown">£{orderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe-dark">Estimated delivery</span>
              <span className="font-semibold text-deep-brown">3–5 business days</span>
            </div>
          </div>

          <Link
            href="/products"
            onClick={() => clearCart()}
            className="flex items-center justify-center h-14 w-full rounded-2xl
                       bg-terracotta text-cream font-semibold text-base
                       active:bg-terracotta-dark active:scale-[0.98] transition-all duration-150 shadow-lg"
            style={{ touchAction: "manipulation" }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ── */}
      <div className="bg-cream-dark border-b border-taupe/20 border-t-[3px] border-t-brown-light
                      px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-heading text-2xl sm:text-3xl font-700 text-deep-brown mb-1">
            Checkout
          </h1>
          <p className="text-taupe-dark text-sm">Secure · Encrypted · Trusted</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6
                      pb-40 lg:pb-10"> {/* mobile: space for sticky button */}
        <StepBar current={step} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Form ── */}
          <div className="flex-1 min-w-0">

            {/* STEP 1 — Shipping */}
            {step === "shipping" && (
              <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
                <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">
                  Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="fn" label="First Name" placeholder="Jane"
                         value={ship.firstName} onChange={(v) => setShip({ ...ship, firstName: v })} />
                  <Field id="ln" label="Last Name" placeholder="Smith"
                         value={ship.lastName} onChange={(v) => setShip({ ...ship, lastName: v })} />
                  <Field id="em" label="Email Address" type="email" placeholder="jane@example.com"
                         value={ship.email} onChange={(v) => setShip({ ...ship, email: v })} span2 />
                  <Field id="ph" label="Phone" type="tel" placeholder="+44 7700 000000"
                         value={ship.phone} onChange={(v) => setShip({ ...ship, phone: v })} span2 />
                  <Field id="addr" label="Street Address" placeholder="12 Willow Lane"
                         value={ship.address} onChange={(v) => setShip({ ...ship, address: v })} span2 />
                  <Field id="city" label="City" placeholder="London"
                         value={ship.city} onChange={(v) => setShip({ ...ship, city: v })} />
                  <Field id="pc" label="Postcode" placeholder="SW1A 1AA"
                         value={ship.postcode} onChange={(v) => setShip({ ...ship, postcode: v })} />
                  <SelectField id="country" label="Country"
                               value={ship.country} onChange={(v) => setShip({ ...ship, country: v })}>
                    <option value="GB">United Kingdom</option>
                    <option value="IE">Ireland</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                  </SelectField>
                </div>

                {/* Desktop-only next button */}
                <button
                  onClick={() => setStep("payment")}
                  className="hidden lg:flex w-full items-center justify-center
                             h-14 mt-6 rounded-2xl bg-terracotta text-cream
                             font-semibold text-base hover:bg-gold hover:scale-[1.02]
                             active:scale-[0.99] transition-all duration-200"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* STEP 2 — Payment */}
            {step === "payment" && (
              <div className="bg-white rounded-2xl border border-cream-darker shadow-sm p-5 sm:p-6">
                <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">
                  Payment Details
                </h2>

                <div className="flex items-center gap-2 mb-5 p-3 bg-cream-dark rounded-xl border border-taupe/20">
                  <svg className="w-4 h-4 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-brown">Secured with 256-bit SSL encryption</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="cn" label="Name on Card" placeholder="Jane Smith" span2
                         value={pay.cardName} onChange={(v) => setPay({ ...pay, cardName: v })} />
                  <Field id="cc" label="Card Number" placeholder="1234 5678 9012 3456" span2
                         value={pay.cardNumber}
                         onChange={(v) => {
                           const n = v.replace(/\D/g, "").slice(0, 16);
                           const fmt = n.replace(/(.{4})/g, "$1 ").trim();
                           setPay({ ...pay, cardNumber: fmt });
                         }} />
                  <Field id="exp" label="Expiry (MM / YY)" placeholder="MM / YY"
                         value={pay.expiry}
                         onChange={(v) => {
                           const n = v.replace(/\D/g, "").slice(0, 4);
                           const fmt = n.length > 2 ? `${n.slice(0, 2)} / ${n.slice(2)}` : n;
                           setPay({ ...pay, expiry: fmt });
                         }} />
                  <Field id="cvv" label="CVV" placeholder="123"
                         value={pay.cvv}
                         onChange={(v) => setPay({ ...pay, cvv: v.replace(/\D/g, "").slice(0, 4) })} />
                </div>

                {/* Desktop-only buttons */}
                <div className="hidden lg:flex gap-3 mt-6">
                  <button
                    onClick={() => setStep("shipping")}
                    className="flex-1 h-14 rounded-2xl border-2 border-brown text-brown
                               font-semibold hover:bg-brown hover:text-cream transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep("confirmation")}
                    className="flex-2 flex-1 h-14 rounded-2xl bg-terracotta text-cream
                               font-semibold hover:bg-gold hover:scale-[1.02] active:scale-[0.99]
                               transition-all duration-200"
                  >
                    Place Order · £{orderTotal.toFixed(2)}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Desktop sidebar summary ── */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-28">
            <OrderSummary items={items} total={total}
                          shippingCost={shippingCost} orderTotal={orderTotal} />
          </div>
        </div>
      </div>

      {/* ── Mobile sticky action bar ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30
                   bg-cream/95 backdrop-blur-md border-t border-taupe/20 px-4 pt-3 shadow-2xl"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        {/* Mini summary */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-taupe-dark text-xs">
            {step === "shipping" ? "Step 1 of 2" : "Step 2 of 2"}
          </span>
          <span className="font-semibold text-deep-brown">£{orderTotal.toFixed(2)}</span>
        </div>

        {step === "shipping" && (
          <button
            onClick={() => setStep("payment")}
            className="w-full h-14 rounded-2xl bg-terracotta text-cream
                       font-semibold text-base active:bg-terracotta-dark
                       active:scale-[0.98] transition-all duration-150 shadow-lg"
            style={{ touchAction: "manipulation" }}
          >
            Continue to Payment
          </button>
        )}

        {step === "payment" && (
          <div className="flex gap-3">
            <button
              onClick={() => setStep("shipping")}
              className="h-14 px-5 rounded-2xl border-2 border-brown text-brown
                         font-semibold active:bg-brown active:text-cream
                         transition-all duration-150 shrink-0"
              style={{ touchAction: "manipulation" }}
            >
              Back
            </button>
            <button
              onClick={() => setStep("confirmation")}
              className="flex-1 h-14 rounded-2xl bg-terracotta text-cream
                         font-semibold text-base active:bg-terracotta-dark
                         active:scale-[0.98] transition-all duration-150 shadow-lg"
              style={{ touchAction: "manipulation" }}
            >
              Place Order · £{orderTotal.toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
