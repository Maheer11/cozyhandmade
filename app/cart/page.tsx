"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCart, CartItem } from "@/components/CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";

/* ─────────────────────────────────────────────────────────
   PAYMENT PLATFORM LOGOS
───────────────────────────────────────────────────────── */
function PaymentLogos({ isNGN }: { isNGN: boolean }) {
  return (
    <div className="pt-4 border-t border-taupe/15 mt-4">
      <p className="text-[10px] text-taupe-dark uppercase tracking-[0.15em] font-medium mb-3 text-center">
        Secure payment via
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {isNGN ? (
          <>
            {/* Paystack */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded border border-gray-200 shadow-sm h-7">
              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 shrink-0"><circle cx="5" cy="5" r="5" fill="#0BA4DB" /></svg>
              <span style={{ fontFamily: "Arial", fontWeight: 700, fontSize: "10px", color: "#0BA4DB" }}>Paystack</span>
            </div>
            {/* Visa */}
            <div className="flex items-center justify-center px-2.5 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 min-w-[40px]">
              <svg viewBox="0 0 50 16" className="h-3 w-auto">
                <text x="1" y="12" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="#1A1F71" fontStyle="italic">VISA</text>
              </svg>
            </div>
            {/* Mastercard */}
            <div className="flex items-center justify-center px-2 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 gap-0.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-1.5" />
            </div>
            {/* Verve */}
            <div className="flex items-center justify-center px-2.5 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 min-w-[44px]">
              <svg viewBox="0 0 54 14" className="h-3 w-auto">
                <text x="1" y="11" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="#008751">Verve</text>
              </svg>
            </div>
          </>
        ) : (
          <>
            {/* Stripe */}
            <div className="flex items-center justify-center px-2.5 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 min-w-[44px]">
              <svg viewBox="0 0 50 14" className="h-3 w-auto">
                <text x="1" y="11" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="#635BFF">stripe</text>
              </svg>
            </div>
            {/* Visa */}
            <div className="flex items-center justify-center px-2.5 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 min-w-[40px]">
              <svg viewBox="0 0 50 16" className="h-3 w-auto">
                <text x="1" y="12" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="#1A1F71" fontStyle="italic">VISA</text>
              </svg>
            </div>
            {/* Mastercard */}
            <div className="flex items-center justify-center px-2 py-1 bg-white rounded border border-gray-200 shadow-sm h-7 gap-0.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-1.5" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST BADGES  — green = secured / active, neutral = info
───────────────────────────────────────────────────────── */
function TrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {/* Green: actively secured */}
      <div className="flex items-start gap-2 bg-white rounded border border-green-200 p-2.5 shadow-sm">
        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
             stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <div>
          <p className="text-[11px] font-semibold text-stone-800 leading-tight">SSL Secured</p>
          <p className="text-[10px] text-stone-500 leading-tight">256-bit encryption</p>
        </div>
      </div>
      <div className="flex items-start gap-2 bg-white rounded border border-green-200 p-2.5 shadow-sm">
        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-[11px] font-semibold text-stone-800 leading-tight">Verified Processors</p>
          <p className="text-[10px] text-stone-500 leading-tight">Stripe & Paystack</p>
        </div>
      </div>
      {/* Neutral: policy info */}
      <div className="flex items-start gap-2 bg-white rounded border border-taupe/20 p-2.5 shadow-sm">
        <span className="text-sm leading-none mt-0.5">🚚</span>
        <div>
          <p className="text-[11px] font-semibold text-deep-brown leading-tight">Tracked Delivery</p>
          <p className="text-[10px] text-taupe-dark leading-tight">Real-time updates</p>
        </div>
      </div>
      <div className="flex items-start gap-2 bg-white rounded border border-taupe/20 p-2.5 shadow-sm">
        <span className="text-sm leading-none mt-0.5">↩️</span>
        <div>
          <p className="text-[11px] font-semibold text-deep-brown leading-tight">Easy Returns</p>
          <p className="text-[10px] text-taupe-dark leading-tight">30-day guarantee</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SOCIAL STRIP
───────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────
   SWIPEABLE CART ITEM
───────────────────────────────────────────────────────── */
function SwipeableItem({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const { formatAmount } = useCurrency();
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);
  const MAX = 88;
  const THRESHOLD = 56;

  const triggerRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(item.id), 280);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const delta = startX.current - e.touches[0].clientX;
    if (delta > 0) {
      setOffset(Math.min(delta, MAX));
    } else {
      setOffset((prev) => Math.max(0, prev + delta));
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (offset >= THRESHOLD) {
      setOffset(MAX);
    } else {
      setOffset(0);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-300
                  ${removing ? "max-h-0 opacity-0 mb-0" : "max-h-48 opacity-100 mb-3"}`}
    >
      {/* Delete zone */}
      <div className="absolute inset-y-0 right-0 w-22 bg-[#8B2035] rounded-2xl
                      flex items-center justify-center">
        <button
          onClick={triggerRemove}
          className="flex flex-col items-center gap-1 text-cream px-4
                     active:opacity-70 transition-opacity duration-150"
          aria-label={`Remove ${item.name}`}
          style={{ touchAction: "manipulation" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span className="text-[10px] font-medium">Remove</span>
        </button>
      </div>

      {/* Item card */}
      <div
        className="relative z-10 bg-white rounded-2xl border border-cream-darker flex gap-3 p-3.5"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link href={`/products/${item.id}`} className="shrink-0">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream-dark">
            <Image src={item.image} alt={item.name} fill loading="lazy" className="object-cover" />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/products/${item.id}`}>
            <h3 className="font-heading font-600 text-deep-brown text-sm leading-snug
                           active:text-[#8B2035] transition-colors line-clamp-2">
              {item.name}
            </h3>
          </Link>
          <p className="text-sm font-semibold text-brown mt-0.5">{formatAmount(item.price)}</p>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center border border-taupe/30 rounded-xl overflow-hidden">
              <button
                onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                className="w-8 h-8 flex items-center justify-center text-brown
                           active:bg-cream-dark transition-colors"
                style={{ touchAction: "manipulation" }}
                aria-label="Decrease quantity"
              >−</button>
              <span className="w-7 text-center text-xs font-semibold text-deep-brown">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-brown
                           active:bg-cream-dark transition-colors"
                style={{ touchAction: "manipulation" }}
                aria-label="Increase quantity"
              >+</button>
            </div>
            <p className="text-sm font-bold text-deep-brown">
              {formatAmount(item.price * item.quantity)}
            </p>
          </div>
        </div>

        <button
          onClick={triggerRemove}
          className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center
                     text-taupe hover:text-[#8B2035] transition-colors duration-200 rounded-lg"
          aria-label={`Remove ${item.name}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CART PAGE
───────────────────────────────────────────────────────── */
const FREE_SHIP_NGN = 50000;  // ₦50,000 — most items qualify
const SHIPPING_NGN  = 6000;   // ₦6,000 shipping when below threshold

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();
  const { currency, priceCheckout, formatAmount } = useCurrency();

  const isNGN      = currency === "NGN";
  const shippingNGN  = total >= FREE_SHIP_NGN ? 0 : SHIPPING_NGN;
  const pricing      = priceCheckout(total, shippingNGN);
  const remaining    = FREE_SHIP_NGN - total; // NGN remaining for free shipping

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-cream flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-5">🛒</div>
        <h1 className="font-heading text-2xl font-700 text-deep-brown mb-2">Your cart is empty</h1>
        <p className="text-brown/60 text-sm mb-8 max-w-xs">
          You haven&apos;t added anything yet. Let&apos;s find something you love.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-10 py-3 rounded-none
                     bg-[#8B2035] text-cream font-semibold text-sm tracking-wide
                     hover:bg-[#6e1929] active:scale-[0.98] transition-all duration-150 shadow-sm"
          style={{ touchAction: "manipulation" }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Secure checkout banner ── */}
      <div className="bg-white border-b border-green-200 text-center py-2 px-4">
        <p className="text-[11px] font-medium flex items-center justify-center gap-2 text-stone-600">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none"
               stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Secure checkout · SSL encrypted · Powered by Paystack &amp; Stripe
        </p>
      </div>

      {/* ── Page header ── */}
      <div className="bg-cream-dark border-b border-taupe/20 border-t-[3px] border-t-[#8B2035]/30
                      px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-2xl sm:text-3xl font-700 text-deep-brown
                         border-l-[3px] border-l-[#8B2035]/50 pl-3">
            Shopping Cart
          </h1>
          <p className="text-taupe-dark text-sm mt-1 pl-3">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-52 lg:pb-10">

        {/* Swipe hint — mobile */}
        <p className="lg:hidden text-[11px] text-taupe-dark text-center mb-4 flex items-center justify-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Swipe left to remove items
        </p>

        {/* Items */}
        <div>
          {items.map((item) => (
            <SwipeableItem
              key={item.id}
              item={item}
              onRemove={removeItem}
              onUpdateQty={updateQuantity}
            />
          ))}
        </div>

        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm text-brown/70 active:text-[#8B2035]
                     transition-colors duration-150 mt-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue Shopping
        </Link>

        {/* ── Desktop order summary ── */}
        <div className="hidden lg:block mt-8">
          <div className="bg-white rounded-2xl border border-cream-darker shadow-sm overflow-hidden">

            {/* Secure header */}
            <div className="bg-white border-b border-green-200 px-5 py-2.5 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none"
                   stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <p className="text-stone-700 text-[11px] font-semibold tracking-wide">
                Secure Order Summary · Your data is protected
              </p>
              <span className="ml-auto flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-stone-400 text-[10px] font-medium">LIVE</span>
              </span>
            </div>

            <div className="p-6">
              <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between text-brown/75">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{pricing.formattedSubtotal}</span>
                </div>
                <div className="flex justify-between text-brown/75">
                  <span>Shipping</span>
                  <span className={shippingNGN === 0 ? "text-green-600 font-semibold" : ""}>
                    {shippingNGN === 0 ? "✓ FREE" : pricing.formattedShipping}
                  </span>
                </div>
                {remaining > 0 && (
                  <p className="text-xs text-taupe-dark bg-cream-dark rounded-lg px-3 py-2">
                    Add {formatAmount(remaining)} more for free shipping
                  </p>
                )}
              </div>

              <div className="border-t border-taupe/20 pt-4 flex justify-between
                              font-semibold text-deep-brown text-base mb-6">
                <span>Total</span>
                <span>{pricing.formattedTotal}</span>
              </div>

              {/* Checkout button — sharp, properly sized */}
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/checkout"
                  className="inline-flex items-center justify-center gap-2
                             px-10 py-3 rounded-none bg-[#8B2035] text-cream
                             font-semibold text-sm tracking-wide
                             hover:bg-[#6e1929] hover:-translate-y-px
                             transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Proceed to Checkout
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <p className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"
                       stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Payments are encrypted &amp; secure
                </p>
              </div>

              {/* Trust badges */}
              <TrustBadges />

              {/* Payment logos */}
              <PaymentLogos isNGN={isNGN} />

            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky summary bar ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30
                   bg-cream border-t border-taupe/20 px-4 pt-3 shadow-2xl"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        {remaining > 0 && (
          <div className="mb-2 bg-gold/10 rounded-xl px-3 py-1.5 text-xs text-brown text-center">
            Add <span className="font-semibold">{formatAmount(remaining)}</span> for free shipping
          </div>
        )}

        {/* Scrollable payment logos on mobile — currency-aware */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {isNGN ? (
            <>
              <div className="flex-none flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-gray-200 shadow-sm h-6 text-[9px] font-bold whitespace-nowrap" style={{ color: "#0BA4DB" }}>
                Paystack
              </div>
              <div className="flex-none flex items-center justify-center px-2 py-0.5 bg-white rounded border border-gray-200 shadow-sm h-6 text-[9px] font-bold whitespace-nowrap" style={{ color: "#008751" }}>
                Verve
              </div>
            </>
          ) : (
            <div className="flex-none flex items-center justify-center px-2 py-0.5 bg-white rounded border border-gray-200 shadow-sm h-6 text-[9px] font-bold whitespace-nowrap" style={{ color: "#635BFF" }}>
              Stripe
            </div>
          )}
          <div className="flex-none flex items-center justify-center px-2 py-0.5 bg-white rounded border border-gray-200 shadow-sm h-6 gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] -ml-1" />
          </div>
          <div className="flex-none flex items-center justify-center px-2 py-0.5 bg-white rounded border border-gray-200 shadow-sm h-6">
            <svg viewBox="0 0 48 14" className="h-2.5 w-auto">
              <text x="1" y="11" fontFamily="Arial" fontWeight="bold" fontSize="12" fill="#1A1F71" fontStyle="italic">VISA</text>
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <div>
            <p className="text-xs text-taupe-dark">
              {itemCount} items · Shipping{" "}
              <span className={shippingNGN === 0 ? "text-green-600 font-medium" : ""}>
                {shippingNGN === 0 ? "FREE" : pricing.formattedShipping}
              </span>
            </p>
            <p className="font-semibold text-deep-brown text-base">
              Total: {pricing.formattedTotal}
            </p>
          </div>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-none
                       bg-[#8B2035] text-cream font-semibold text-sm
                       active:bg-[#6e1929] active:scale-[0.98] transition-all duration-150 shadow-md"
            style={{ touchAction: "manipulation" }}
          >
            Checkout
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Security micro-copy */}
        <p className="text-[10px] text-stone-500 font-medium text-center flex items-center justify-center gap-1 pb-0.5">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"
               stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          SSL secured · Easy 30-day returns
        </p>
      </div>
    </div>
  );
}
