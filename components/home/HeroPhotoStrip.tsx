"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { itemHref, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";

/**
 * Phone/tablet hero (below lg): a row of small square product photos, each a
 * link to its product. Desktop keeps the one-big-photo carousel
 * (HeroProductCarousel).
 *
 * Owner's rules: it never moves on its own — the visitor swipes, or taps the
 * arrow buttons — and only the product NAME is printed under each photo, never
 * the price. Each link carries the name and price as its accessible name, so
 * screen readers announce both (the visible name is aria-hidden to avoid
 * hearing it twice).
 */
export default function HeroPhotoStrip({ items }: { items: FeaturedPieceCardData[] }) {
  const { formatAmount } = useCurrency();
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Arrows show or dim depending on whether there is more to see that way.
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Runs once after mount and on every scroll/resize: an external-system
    // subscription, so the state is set from callbacks.
    const frame = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  // One arrow tap moves about two tiles; respects reduced motion.
  const scrollByTiles = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    // Centred on the photos (144px tiles, 176px from sm), not on photo + name.
    "focus-ring absolute top-[72px] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill sm:top-[88px] " +
    "bg-milk text-brown shadow-soft transition-opacity duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label="In-stock pieces"
        className="no-scrollbar -mx-6 snap-x snap-mandatory scroll-px-6 overflow-x-auto"
      >
        <ul className="flex w-max gap-3 px-6">
          {items.map((item, i) => {
            const payPrice = item.discount_price ?? item.price;
            return (
              <li key={`${item.source}-${item.id}`} className="w-36 shrink-0 snap-start sm:w-44">
                <Link
                  href={itemHref(item)}
                  aria-label={`${item.name}, ${formatAmount(payPrice)}`}
                  className="focus-ring block rounded-tile"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-tile bg-brown/20">
                    <Image
                      src={item.product_image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 176px, 144px"
                      loading={i < 3 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      className="object-cover"
                    />
                  </span>
                  {/* Name only, no price (owner's call). Two lines max, then
                      "…" — same rule as the product cards. */}
                  <span aria-hidden="true" className="mt-2 line-clamp-2 font-body text-sm font-medium text-milk">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => scrollByTiles(-1)}
        disabled={atStart}
        aria-label="Previous pieces"
        className={`${arrow} -left-2`}
        style={{ touchAction: "manipulation" }}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => scrollByTiles(1)}
        disabled={atEnd}
        aria-label="Next pieces"
        className={`${arrow} -right-2`}
        style={{ touchAction: "manipulation" }}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
