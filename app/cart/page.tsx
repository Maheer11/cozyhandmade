"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCart, CartItem } from "@/components/CartContext";

/* ── Swipeable cart item ─────────────────────────────────── */
function SwipeableItem({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);
  const MAX = 88; // px — width of the delete zone revealed
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
      // swipe back right
      setOffset((prev) => Math.max(0, prev + delta));
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (offset >= THRESHOLD) {
      // Snap open to reveal full delete button
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
      {/* Delete zone — revealed by swiping */}
      <div className="absolute inset-y-0 right-0 w-22 bg-terracotta rounded-2xl
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

      {/* Item card — slides left on swipe */}
      <div
        className="swipe-item relative z-10 bg-white rounded-2xl border border-cream-darker
                   flex gap-3 p-3.5"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Image */}
        <Link href={`/products/${item.id}`} className="shrink-0">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream-dark">
            <Image src={item.image} alt={item.name} fill loading="lazy"
                   className="object-cover" />
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <Link href={`/products/${item.id}`}>
            <h3 className="font-heading font-600 text-deep-brown text-sm leading-snug
                           active:text-terracotta transition-colors line-clamp-2">
              {item.name}
            </h3>
          </Link>
          <p className="text-sm font-semibold text-brown mt-0.5">
            £{item.price.toFixed(2)}
          </p>

          <div className="flex items-center justify-between mt-2.5">
            {/* Qty controls */}
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
              £{(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Desktop remove button */}
        <button
          onClick={triggerRemove}
          className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center
                     text-taupe hover:text-terracotta transition-colors duration-200 rounded-lg"
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

/* ── Cart page ───────────────────────────────────────────── */
export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();

  const shippingCost = total >= 60 ? 0 : 4.99;
  const orderTotal = total + shippingCost;

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
          className="flex items-center justify-center h-14 w-full max-w-xs rounded-2xl
                     bg-terracotta text-cream font-semibold text-base
                     active:bg-terracotta-dark active:scale-[0.98] transition-all duration-150 shadow-lg"
          style={{ touchAction: "manipulation" }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ── */}
      <div className="bg-cream-dark border-b border-taupe/20 border-t-[3px] border-t-brown-light
                      px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-2xl sm:text-3xl font-700 text-deep-brown
                         border-l-[3px] border-l-brown-light/50 pl-3">
            Shopping Cart
          </h1>
          <p className="text-taupe-dark text-sm mt-1 pl-3">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5
                      pb-52 lg:pb-10"> {/* bottom padding for sticky summary on mobile */}

        {/* Swipe hint — shown once on mobile */}
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
          className="flex items-center gap-1.5 text-sm text-brown/70 active:text-gold
                     transition-colors duration-150 mt-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue Shopping
        </Link>

        {/* ── Desktop order summary ── */}
        <div className="hidden lg:block mt-8 bg-white rounded-2xl border border-cream-darker shadow-sm p-6">
          <h2 className="font-heading font-600 text-deep-brown text-xl mb-5">Order Summary</h2>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex justify-between text-brown/75">
              <span>Subtotal ({itemCount} items)</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-brown/75">
              <span>Shipping</span>
              <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
                {shippingCost === 0 ? "FREE" : `£${shippingCost.toFixed(2)}`}
              </span>
            </div>
            {total < 60 && (
              <p className="text-xs text-taupe-dark bg-cream-dark rounded-lg px-3 py-2">
                Add £{(60 - total).toFixed(2)} more for free shipping
              </p>
            )}
          </div>
          <div className="border-t border-taupe/20 pt-4 flex justify-between font-semibold text-deep-brown text-base mb-5">
            <span>Total</span>
            <span>£{orderTotal.toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="flex w-full items-center justify-center h-14 rounded-2xl bg-terracotta text-cream
                       font-semibold text-base hover:bg-gold hover:scale-[1.02] active:scale-[0.99]
                       transition-all duration-200"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>

      {/* ── Mobile sticky summary bar ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30
                   bg-cream border-t border-taupe/20 px-4 pt-3 shadow-2xl"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        {total < 60 && (
          <div className="mb-2 bg-gold/10 rounded-xl px-3 py-1.5 text-xs text-brown text-center">
            Add <span className="font-semibold">£{(60 - total).toFixed(2)}</span> for free shipping
          </div>
        )}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-xs text-taupe-dark">{itemCount} items · Shipping {shippingCost === 0 ? "FREE" : `£${shippingCost.toFixed(2)}`}</p>
            <p className="font-semibold text-deep-brown text-base">
              Total: £{orderTotal.toFixed(2)}
            </p>
          </div>
          <Link
            href="/checkout"
            className="flex items-center justify-center h-14 px-6 rounded-2xl
                       bg-terracotta text-cream font-semibold text-base
                       active:bg-terracotta-dark active:scale-[0.98] transition-all duration-150 shadow-lg"
            style={{ touchAction: "manipulation" }}
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
