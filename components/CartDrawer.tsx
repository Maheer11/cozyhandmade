"use client";

import { useRef, useState, useEffect } from "react";
import { useCart, cartLineKey, CartItem } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import Button from "@/components/ui/Button";
import CartLineItem from "@/components/ui/CartLineItem";


function DrawerItem({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (lineKey: string) => void;
}) {
  const { formatAmount } = useCurrency();
  // "new_in" accepted alongside "featured_piece" for carts persisted before
  // the New In → Featured Pieces rename.
  const itemHref = (item.source === "new_in" || item.source === "featured_piece") ? `/featured-pieces/${item.id}` : `/products/${item.id}`;
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);
  const MAX = 76;
  const THRESHOLD = 48;

  const triggerRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(cartLineKey(item)), 260);
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
      className={`relative overflow-hidden rounded-card transition-all duration-300
                  ${removing ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-40 opacity-100"}`}
    >
      {/* Delete zone, revealed by the swipe */}
      {offset > 0 && (
        <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-card bg-burgundy" aria-hidden="true">
          <span className="type-caption font-semibold text-white">Remove</span>
        </div>
      )}

      <div
        className="relative z-10"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Quantity is read-only. It is chosen on the product page, where the
            stepper is capped against the real stock for the exact variant. A
            cart-side stepper could exceed that; to change the count, remove
            the line and re-add it with the quantity you want. */}
        <CartLineItem
          name={item.name}
          image={item.image}
          href={itemHref}
          price={formatAmount(item.price * item.quantity)}
          quantityControl={
            <span className="inline-flex h-11 items-center rounded-pill border border-stone bg-white px-4 type-small font-semibold text-brown">
              Qty {item.quantity}
            </span>
          }
          onRemove={triggerRemove}
        />
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, removeItem, total, itemCount, isOpen, closeCart } = useCart();
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
        className={`fixed inset-0 z-[60] bg-brown/40 backdrop-blur-sm transition-opacity duration-300
                    ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Slide-from-right panel — full width on mobile, fixed width on larger screens */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[60] w-full sm:w-[420px] sm:max-w-[90vw]
                    bg-cream flex flex-col shadow-2xl
                    transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOpen ? "translate-x-0 visible" : "translate-x-full invisible"}`}
        // Hidden and inert while closed so its shadow doesn't bleed into the
        // page edge and its controls leave the tab order; see Navbar's drawer.
        inert={!isOpen}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-5">
          <h2 className="type-h3 text-brown">
            Your bag {itemCount > 0 && <span className="font-body text-sm font-normal text-stone">({itemCount})</span>}
          </h2>
          <button
            onClick={closeCart}
            className="focus-ring -mr-2 flex h-11 w-11 items-center justify-center rounded-pill text-brown
                       transition-transform duration-100 active:scale-90 active:bg-peach"
            aria-label="Close bag"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-peach text-burgundy" aria-hidden="true">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </span>
            <p className="type-h2 mt-5 text-brown">Your bag is empty</p>
            <p className="type-body mb-7 mt-2 max-w-xs text-brown">
              You haven&apos;t added anything yet. Let&apos;s find something you love.
            </p>
            <Button onClick={closeCart}>Continue shopping</Button>
          </div>
        ) : (
          <>
            {/* Items — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {items.map((item) => (
                <DrawerItem key={cartLineKey(item)} item={item} onRemove={removeItem} />
              ))}
              <button
                onClick={closeCart}
                className="focus-ring mt-1 inline-flex min-h-11 items-center rounded-pill px-2 type-body font-semibold text-burgundy hover:text-burgundy-dark"
              >
                Continue shopping
              </button>
            </div>

            {/* Footer — summary + checkout */}
            <div
              className="shrink-0 border-t border-line bg-cream px-4 pt-4 sm:px-5"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="type-body text-stone">Subtotal</span>
                <span className="font-body text-lg font-semibold text-brown">{pricing.formattedSubtotal}</span>
              </div>

              <Button href="/checkout" onClick={closeCart} fullWidth>
                Checkout securely
              </Button>

              <p className="mt-2.5 text-center type-caption text-stone">
                SSL secured · Easy 30-day returns
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
