"use client";

import { Fragment, memo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import { useCurrency } from "@/lib/currency/CurrencyContext";

export interface NewInCardData {
  id: string;
  name: string;
  product_image: string;
  lifestyle_image: string | null;
  sold_out: boolean;
  is_handmade: boolean;
  price: number;
  discount_price: number | null;
}

export const NewInCard = memo(function NewInCard({
  item,
  variant = "rail",
}: {
  item: NewInCardData;
  /** "rail" = fixed width for the horizontal scroll-snap row; "grid" = fills its grid cell. */
  variant?: "rail" | "grid";
}) {
  // iOS Safari doesn't reliably fire CSS :hover/:active on links without a
  // touch listener present, so the lifestyle-image swap is driven by state —
  // press-and-hold reveals it on touch, hover reveals it on desktop, and
  // releasing/tapping still follows the link.
  const [revealed, setRevealed] = useState(false);
  const { formatAmount } = useCurrency();

  return (
    <Link
      href={`/new-in/${item.id}`}
      style={{ touchAction: "manipulation" }}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onTouchStart={() => setRevealed(true)}
      onTouchEnd={() => setRevealed(false)}
      onTouchCancel={() => setRevealed(false)}
      className={`group relative flex flex-col rounded-3xl overflow-hidden bg-white
                 border border-cream-darker shadow-sm
                 hover:-translate-y-1.5 hover:shadow-2xl
                 active:translate-y-0 active:shadow-sm
                 transition-all duration-300 ease-out
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                 ${variant === "rail" ? "shrink-0 snap-start w-[72vw] sm:w-72 lg:w-80" : "w-full"}`}
    >
      {/* Image stage — square, per spec */}
      <div className="relative w-full aspect-square bg-cream-dark overflow-hidden">
        <Image
          src={item.product_image}
          alt={item.name}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 72vw, (max-width: 1024px) 288px, 320px"
          className={`object-cover transition-all duration-500 ease-out
                     ${revealed ? "opacity-0 scale-105" : "opacity-100 scale-100"}`}
        />

        {item.lifestyle_image && (
          <Image
            src={item.lifestyle_image}
            alt={`${item.name} — in use`}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 288px, 320px"
            className={`object-cover absolute inset-0 transition-all duration-500 ease-out
                       ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          />
        )}

        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent
                      transition-opacity duration-300 ${revealed ? "opacity-100" : "opacity-0"}`}
        />

        <div className="absolute top-3 left-3 right-3 flex flex-col items-start gap-1.5">
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full
                         ${item.sold_out ? "bg-black text-white" : "bg-white/95 text-deep-brown shadow-sm"}`}
          >
            {item.sold_out ? "Sold Out" : "Available"}
          </span>

          {item.is_handmade && (
            <span className="bg-cream/90 text-brown text-[10px] font-medium
                             px-2.5 py-1 rounded-full backdrop-blur-sm border border-taupe/20">
              ✦ Handmade
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4 sm:p-5">
        <p className="font-ios font-600 text-deep-brown text-base sm:text-lg leading-snug truncate">
          {item.name}
        </p>
        <div className="flex items-baseline gap-2 font-ios">
          {item.discount_price ? (
            <>
              <span className="text-sm font-600 text-brown">{formatAmount(item.discount_price)}</span>
              <span className="text-xs text-taupe-dark line-through">{formatAmount(item.price)}</span>
            </>
          ) : (
            <span className="text-sm font-600 text-brown">{formatAmount(item.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
});

const ViewAllTile = memo(function ViewAllTile() {
  return (
    <Link
      href="/new-in"
      style={{ touchAction: "manipulation" }}
      className="group relative flex flex-col items-center justify-center gap-3 shrink-0 snap-start
                 w-[72vw] sm:w-72 lg:w-80 aspect-square sm:aspect-auto sm:h-auto
                 rounded-3xl overflow-hidden bg-cream-dark border border-cream-darker
                 hover:-translate-y-1.5 hover:shadow-2xl active:translate-y-0
                 transition-all duration-300 ease-out
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm
                       group-hover:translate-x-1 transition-transform duration-300">
        <svg className="w-6 h-6 text-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
        </svg>
      </span>
      <span className="font-heading italic text-deep-brown text-xl">View all New In →</span>
    </Link>
  );
});

// Divider thread between cards — echoes the site's stitched-border motif.
function Divider() {
  return <div className="hidden sm:block w-px self-stretch bg-taupe/20 shrink-0 my-6" />;
}

function ScrollArrows({ railRef }: { railRef: React.RefObject<HTMLDivElement | null> }) {
  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };
  return (
    <div className="hidden lg:flex items-center gap-2">
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Scroll New In left"
        className="w-10 h-10 rounded-full border border-taupe/30 flex items-center justify-center
                   text-brown hover:bg-cream-dark hover:border-taupe/50 transition-colors duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => scrollBy(1)}
        aria-label="Scroll New In right"
        className="w-10 h-10 rounded-full border border-taupe/30 flex items-center justify-center
                   text-brown hover:bg-cream-dark hover:border-taupe/50 transition-colors duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

export default function NewInSection({ items }: { items: NewInCardData[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden py-14 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mb-10 lg:mb-14 flex items-end justify-between gap-4">
          <div className="text-center lg:text-left w-full lg:w-auto">
            <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
              ✦ Just Landed
            </p>
            <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown">
              New In
            </h2>
          </div>
          <ScrollArrows railRef={railRef} />
        </ScrollReveal>

        <ScrollReveal>
          <div
            ref={railRef}
            className="flex items-stretch gap-5 sm:gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
          >
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <Divider />}
                <NewInCard item={item} />
              </Fragment>
            ))}
            <Divider />
            <ViewAllTile />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
