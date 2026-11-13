"use client";

import { Fragment, memo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import ScrollReveal from "@/components/ScrollReveal";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { CartItem } from "@/components/CartContext";

export interface FeaturedPieceCardData {
  id: string;
  /**
   * Which catalogue this row came from — decides the detail route. Defaults to
   * "featured_piece" when absent, which is every caller except the homepage
   * hero: that one draws from products AND featured_pieces at once (both
   * admin-toggled via show_on_homepage) and the two ids live under different
   * routes. Named to match the same discriminator on cart items
   * (CartContext / lib/checkout/repriceItems.ts).
   */
  source?: "product" | "featured_piece";
  name: string;
  product_image: string;
  lifestyle_image: string | null;
  sold_out: boolean;
  is_handmade: boolean;
  price: number;
  discount_price: number | null;
  shipping_weight_grams?: number | null;
  /**
   * What "Add to bag" puts in the cart, set by the homepage only when the
   * piece is in stock AND has no size or colour to choose. null/absent means
   * the card links to the piece's page instead.
   */
  quickAdd?: Omit<CartItem, "quantity"> | null;
}

/**
 * Detail route for a card. Products and featured pieces have separate tables,
 * separate ids and separate routes, so anything rendering a mixed list (the
 * homepage hero) has to switch on `source` rather than assume one of them.
 */
export function itemHref(item: Pick<FeaturedPieceCardData, "id" | "source">): string {
  return item.source === "product" ? `/products/${item.id}` : `/featured-pieces/${item.id}`;
}

export const FeaturedPieceCard = memo(function FeaturedPieceCard({
  item,
  variant = "rail",
}: {
  item: FeaturedPieceCardData;
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
      href={itemHref(item)}
      style={{ touchAction: "manipulation" }}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onTouchStart={() => setRevealed(true)}
      onTouchEnd={() => setRevealed(false)}
      onTouchCancel={() => setRevealed(false)}
      className={`focus-ring group relative flex flex-col rounded-card
                 ${variant === "rail" ? "shrink-0 snap-start w-[68vw] max-w-[280px] sm:w-72 lg:w-80" : "w-full"}`}
    >
      {/* Image stage — square, per spec */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-card bg-peach/40">
        <Image
          src={item.product_image}
          alt={item.name}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 68vw, (max-width: 1024px) 288px, 320px"
          className={`object-cover transition-all duration-500 ease-out
                     ${revealed ? "opacity-0 scale-105" : "opacity-100 scale-100"}`}
        />

        {item.lifestyle_image && (
          <Image
            src={item.lifestyle_image}
            alt={`${item.name} in use`}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 68vw, (max-width: 1024px) 288px, 320px"
            className={`object-cover absolute inset-0 transition-all duration-500 ease-out
                       ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {item.sold_out && <Badge variant="soldOut">Sold out</Badge>}
          {item.is_handmade && <Badge variant="handmade">✦ Handmade</Badge>}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3">
        <p className="line-clamp-2 font-body text-base leading-6 text-brown">{item.name}</p>
        <p className="mt-1 flex items-baseline gap-2 font-body text-base font-semibold text-brown">
          {item.discount_price ? (
            <>
              {formatAmount(item.discount_price)}
              <span className="text-sm font-normal text-stone line-through">{formatAmount(item.price)}</span>
            </>
          ) : (
            formatAmount(item.price)
          )}
        </p>
      </div>
    </Link>
  );
});

const ViewAllTile = memo(function ViewAllTile() {
  return (
    <Link
      href="/featured-pieces"
      style={{ touchAction: "manipulation" }}
      className="group relative flex flex-col items-center justify-center gap-3 shrink-0 snap-start
                 w-[68vw] max-w-[280px] sm:w-72 lg:w-80 aspect-square sm:aspect-auto sm:h-auto
                 rounded-sm overflow-hidden bg-peach border border-peach
                 hover:-translate-y-1.5 hover:shadow-2xl active:translate-y-0
                 transition-all duration-300 ease-out
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
    >
      <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center shadow-sm
                       group-hover:translate-x-1 transition-transform duration-300">
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
        </svg>
      </span>
      <span className="font-heading italic text-brown text-lg sm:text-xl text-center px-2">View all Featured Pieces →</span>
    </Link>
  );
});

// Divider thread between cards — echoes the site's stitched-border motif.
function Divider() {
  return <div className="hidden sm:block w-px self-stretch bg-line/20 shrink-0 my-6" />;
}

function ScrollArrows({ railRef }: { railRef: React.RefObject<HTMLDivElement | null> }) {
  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };
  return (
    <div className="hidden lg:flex items-center gap-2">
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Scroll Featured Pieces left"
        className="w-10 h-10 rounded-full border border-stone flex items-center justify-center
                   text-brown hover:bg-peach hover:border-line/50 transition-colors duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => scrollBy(1)}
        aria-label="Scroll Featured Pieces right"
        className="w-10 h-10 rounded-full border border-stone flex items-center justify-center
                   text-brown hover:bg-peach hover:border-line/50 transition-colors duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

export default function FeaturedPiecesSection({ items }: { items: FeaturedPieceCardData[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden py-14 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mb-10 lg:mb-14 flex items-end justify-between gap-4">
          <div className="text-center lg:text-left w-full lg:w-auto">
            <p className="type-eyebrow text-burgundy mb-3">
              ✦ Just Landed
            </p>
            <h2 className="type-h1 text-brown">
              Featured Pieces
            </h2>
          </div>
          <ScrollArrows railRef={railRef} />
        </ScrollReveal>

        <ScrollReveal>
          <div
            ref={railRef}
            className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
          >
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <Divider />}
                <FeaturedPieceCard item={item} />
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
