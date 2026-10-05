"use client";

import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { itemHref, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";

/**
 * The homepage "Featured pieces" grid — the admin-curated `show_on_homepage`
 * items, laid out as a plain product grid directly under the hero.
 *
 * Every card is built the same way so the row reads as one set: a 4:5 image
 * well (object-cover, so no letterbox bands whatever the photo's own ratio),
 * then the name in the serif and the price in the sans. Names wrap to two
 * lines rather than truncating — at 4 columns and ≥1280px even the longest
 * current name fits in two.
 *
 * A client component only because formatAmount depends on the visitor's
 * chosen currency; app/page.tsx does the data work and the sold-out ordering.
 */
export default function HomeFeaturedGrid({ items }: { items: FeaturedPieceCardData[] }) {
  const { formatAmount } = useCurrency();

  if (items.length === 0) return null;

  return (
    // scroll-mt clears the sticky header when the hero's "See featured pieces"
    // link jumps here.
    <section id="featured-pieces" aria-labelledby="featured-heading" className="bg-ui-bg scroll-mt-20">
      <div className="page-container py-12 lg:py-16">
        <div className="flex items-baseline justify-between gap-4 mb-6 lg:mb-8">
          <h2
            id="featured-heading"
            className="font-heading font-medium text-ui-text text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] leading-tight"
          >
            Featured pieces
          </h2>
          <Link
            href="/featured-pieces"
            className="focus-ring rounded-button font-body text-sm font-medium text-ui-accent
                       underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-6">
          {items.map((item) => {
            const payPrice = item.discount_price ?? item.price;
            return (
              <li key={`${item.source ?? "featured_piece"}-${item.id}`}>
                <Link href={itemHref(item)} className="focus-ring group block rounded-card">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-ui-surface">
                    <Image
                      src={item.product_image}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1280px) 296px, (min-width: 1024px) 23vw, 50vw"
                      className={`object-cover transition-transform duration-200 ease-out
                                  group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100
                                  ${item.sold_out ? "opacity-70" : ""}`}
                    />
                    {item.sold_out && (
                      <span className="absolute top-3 left-3 rounded-button bg-ui-surface px-2 py-1
                                       font-body text-xs font-medium text-ui-text">
                        Sold out
                      </span>
                    )}
                  </div>
                  <div className="pt-3">
                    <h3 className="font-heading text-lg lg:text-xl leading-snug text-ui-text line-clamp-2
                                   group-hover:underline underline-offset-4 decoration-1">
                      {item.name}
                    </h3>
                    <p className="mt-1 font-body text-sm flex items-baseline gap-2">
                      <span className="font-semibold text-ui-text">{formatAmount(payPrice)}</span>
                      {item.discount_price && (
                        <span className="text-ui-muted line-through">
                          <span className="sr-only">Was </span>
                          {formatAmount(item.price)}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
