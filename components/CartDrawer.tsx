"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useCart, CartItem } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";


function DrawerItem({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const { formatAmount } = useCurrency();
  const itemHref = item.source === "new_in" ? `/new-in/${item.id}` : `/products/${item.id}`;
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);
  const MAX = 76;
  const THRESHOLD = 48;

  const triggerRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(item.id), 260);
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
    setOffset(offset >= THRESHOLD ? MAX : 0);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-300
                  ${removing ? "max-h-0 opacity-0 mb-0" : "max-h-40 opacity-100 mb-3"}`}
    >
      <div className="absolute inset-y-0 right-0 w-19 bg-[#8B2035] rounded-xl flex items-center justify-center">
        <button
          onClick={triggerRemove}
          className="flex flex-col items-center gap-1 text-cream px-3 active:opacity-70"
          aria-label={`Remove ${item.name}`}
          style={{ touchAction: "manipulation" }}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span className="text-[9px] font-medium">Remove</span>
        </button>
      </div>

      <div
        className="relative z-10 bg-white rounded-xl border border-cream-darker flex gap-3 p-3"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link href={itemHref} className="shrink-0">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream-dark">
            <Image src={item.image} alt={item.name} fill loading="lazy" className="object-cover" />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={itemHref}>
            <h3 className="font-heading font-600 text-deep-brown text-sm leading-snug line-clamp-2">
              {item.name}
            </h3>
          </Link>
          <p className="text-sm font-semibold text-brown mt-0.5">{formatAmount(item.price)}</p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center border border-taupe/30 rounded-lg overflow-hidden">
              <button
                onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                className="w-8 h-8 flex items-center justify-center text-brown active:bg-cream-dark active:scale-90 transition-transform duration-100"
                style={{ touchAction: "manipulation" }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center text-xs font-semibold text-deep-brown">{item.quantity}</span>
              <button
                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-brown active:bg-cream-dark active:scale-90 transition-transform duration-100"
                style={{ touchAction: "manipulation" }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={triggerRemove}
              className="hidden sm:flex w-7 h-7 items-center justify-center text-taupe hover:text-[#8B2035] transition-colors rounded-lg"
              aria-label={`Remove ${item.name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, total, itemCount, isOpen, closeCart } = useCart();
  const { priceCheckout } = useCurrency();

  // Drawer shows the subtotal only — shipping is added at checkout.
  const pricing = priceCheckout(total, 0);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[60] bg-deep-brown/40 backdrop-blur-sm transition-opacity duration-300
                    ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Slide-from-right panel — full width on mobile, fixed width on larger screens */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[60] w-full sm:w-[420px] sm:max-w-[90vw]
                    bg-cream flex flex-col shadow-2xl
                    transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 sm:px-5 border-b border-taupe/20 shrink-0">
          <h2 className="font-heading text-lg font-700 text-deep-brown">
            Your Cart {itemCount > 0 && <span className="text-taupe-dark font-normal text-sm">({itemCount})</span>}
          </h2>
          <button
            onClick={closeCart}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-brown
                       active:bg-cream-dark active:scale-90 transition-transform duration-100"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <svg className="w-14 h-14 text-taupe/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="font-heading text-xl font-700 text-deep-brown mb-1">Your cart is empty</p>
            <p className="text-brown/60 text-sm mb-7 max-w-xs">
              You haven&apos;t added anything yet. Let&apos;s find something you love.
            </p>
            <button
              onClick={closeCart}
              className="inline-flex items-center justify-center px-9 py-3 rounded-none
                         bg-[#8B2035] text-cream font-semibold text-sm tracking-wide
                         hover:bg-[#6e1929] active:scale-[0.98] transition-all duration-150 shadow-sm"
              style={{ touchAction: "manipulation" }}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Items — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              <p className="sm:hidden text-[11px] text-taupe-dark text-center mb-3 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Swipe left to remove items
              </p>
              {items.map((item) => (
                <DrawerItem key={item.id} item={item} onRemove={removeItem} onUpdateQty={updateQuantity} />
              ))}
              <button
                onClick={closeCart}
                className="flex items-center gap-1.5 text-sm text-brown/70 active:text-[#8B2035] transition-colors duration-150 mt-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Continue Shopping
              </button>
            </div>

            {/* Footer — summary + checkout */}
            <div
              className="shrink-0 border-t border-taupe/20 bg-cream px-4 sm:px-5 pt-4"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
            >
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-sm text-brown/75">Subtotal</span>
                <span className="font-semibold text-deep-brown text-base">{pricing.formattedSubtotal}</span>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-none
                           bg-[#8B2035] text-cream font-semibold text-sm tracking-wide
                           hover:bg-[#6e1929] active:scale-[0.98] transition-all duration-150 shadow-sm"
                style={{ touchAction: "manipulation" }}
              >
                Proceed to Checkout
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <p className="text-[10px] text-stone-500 font-medium text-center flex items-center justify-center gap-1 mt-2.5">
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                SSL secured · Easy 30-day returns
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
