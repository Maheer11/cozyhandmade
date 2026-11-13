"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCart, cartLineKey, CartItem } from "@/components/CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { calculateShipping, type ShippingItemInput } from "@/lib/checkout/shipping";
import Button from "@/components/ui/Button";
import CartLineItem from "@/components/ui/CartLineItem";

/* ─────────────────────────────────────────────────────────
   PAYMENT LOGOS — brand marks, kept as they were
───────────────────────────────────────────────────────── */
function PaymentLogos() {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="mb-3 text-center type-caption font-semibold uppercase tracking-[0.15em] text-stone">
        Secure payment via
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex h-7 min-w-[44px] items-center justify-center rounded-small border border-line bg-white px-2.5">
          <svg viewBox="0 0 50 14" className="h-3 w-auto" aria-label="Stripe" role="img">
            <text x="1" y="11" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="#635BFF">stripe</text>
          </svg>
        </div>
        <div className="flex h-7 min-w-[40px] items-center justify-center rounded-small border border-line bg-white px-2.5">
          <svg viewBox="0 0 50 16" className="h-3 w-auto" aria-label="Visa" role="img">
            <text x="1" y="12" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="#1A1F71" fontStyle="italic">VISA</text>
          </svg>
        </div>
        <div className="flex h-7 items-center justify-center gap-0.5 rounded-small border border-line bg-white px-2" role="img" aria-label="Mastercard">
          <div className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
          <div className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#F79E1B]" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST TILES — the same four claims as before, as peach tiles
───────────────────────────────────────────────────────── */
function TrustTiles() {
  const tiles = [
    { title: "SSL Secured", sub: "256-bit encryption" },
    { title: "Verified Processor", sub: "Stripe" },
    { title: "Tracked Delivery", sub: "Real-time updates" },
    { title: "Easy Returns", sub: "30-day guarantee" },
  ];
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3">
      {tiles.map(({ title, sub }) => (
        <li key={title} className="rounded-tile bg-peach p-3 text-brown">
          <p className="type-small font-semibold">{title}</p>
          <p className="type-caption">{sub}</p>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────
   CART LINE — swipe left to reveal Remove (phones), plus a visible ✕.
   Quantity stays READ-ONLY on purpose: it was capped against the variant's
   real stock on the product page, and a cart-side stepper could push a line
   past what exists. To change it, remove the line and re-add it.
───────────────────────────────────────────────────────── */
function SwipeableItem({
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
  const MAX = 88;
  const THRESHOLD = 56;

  const triggerRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(cartLineKey(item)), 280);
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
      className={`relative overflow-hidden rounded-card transition-all duration-300
                  ${removing ? "mb-0 max-h-0 opacity-0" : "mb-4 max-h-48 opacity-100"}`}
    >
      {/* Delete zone, revealed by the swipe */}
      {offset > 0 && (
        <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-card bg-burgundy" aria-hidden="true">
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

/* ─────────────────────────────────────────────────────────
   CART PAGE
───────────────────────────────────────────────────────── */
export default function CartPage() {
  const { items, removeItem, total, itemCount } = useCart();
  const { priceCheckout } = useCurrency();

  // No delivery address exists yet at this point in the flow — the country
  // picker is on /checkout, not here — so this is necessarily an estimate.
  // calculateShipping() with no country resolves to "rest_of_world" (the
  // most expensive zone), same as its "never undercharge on ambiguity" rule
  // for delivery. That means this preview can only ever be equal to or
  // higher than what checkout later actually charges once a real address
  // narrows the zone, never lower — the single hardcoded shipping module
  // this project uses everywhere (lib/checkout/shipping.ts), not a second,
  // separate estimate.
  const shippingItems: ShippingItemInput[] = items.map((item) => ({
    quantity: item.quantity,
    shippingWeightGrams: item.shippingWeightGrams,
    productName: item.name,
  }));
  const shippingEstimateEUR = calculateShipping(shippingItems, null).priceEUR;
  const pricing = priceCheckout(total, shippingEstimateEUR);

  if (items.length === 0) {
    return (
      <div className="bg-cream">
        <div className="page-container flex min-h-[60vh] items-center justify-center py-12">
          <div className="w-full max-w-md rounded-block bg-peach px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-cream text-burgundy" aria-hidden="true">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </span>
            <h1 className="type-h2 mt-5 text-brown">Your bag is empty</h1>
            <p className="type-body mt-2 text-brown">
              You haven&apos;t added anything yet. Let&apos;s find something you love.
            </p>
            <Button href="/products" className="mt-7">Shop the Collection</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Secure checkout note */}
      <p className="bg-peach px-4 py-2 text-center type-caption font-medium text-brown">
        Secure checkout · SSL encrypted · Powered by Stripe
      </p>

      <div className="page-container pb-12 pt-8 lg:pb-16">
        <h1 className="type-h1 text-brown">Your bag ({itemCount})</h1>

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-10">
          {/* Items */}
          <div>
            {items.map((item) => (
              <SwipeableItem key={cartLineKey(item)} item={item} onRemove={removeItem} />
            ))}
          </div>

          {/* Summary */}
          <aside aria-label="Order summary" className="mt-2 lg:sticky lg:top-28 lg:mt-0">
            <div className="rounded-card bg-white p-5 shadow-soft">
              <h2 className="sr-only">Order summary</h2>
              <dl className="space-y-3 font-body text-base text-brown">
                <div className="flex justify-between">
                  <dt className="text-stone">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt>
                  <dd>{pricing.formattedSubtotal}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone">Shipping (estimate)</dt>
                  <dd>{pricing.formattedShipping}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-4 text-lg font-semibold">
                  <dt>Total</dt>
                  <dd>{pricing.formattedTotal}</dd>
                </div>
              </dl>
              <p className="mt-3 type-caption text-stone">
                Exact shipping is calculated at checkout once you enter your delivery address.
              </p>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <Button href="/checkout" fullWidth>Checkout securely</Button>
              <Link
                href="/products"
                className="focus-ring inline-flex min-h-11 items-center rounded-pill px-4 type-body font-semibold text-burgundy hover:text-burgundy-dark"
              >
                Continue shopping
              </Link>
            </div>

            <TrustTiles />
            <PaymentLogos />
          </aside>
        </div>
      </div>
    </div>
  );
}
