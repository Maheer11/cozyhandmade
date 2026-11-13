"use client";

import { useCurrency } from "@/lib/currency/CurrencyContext";
import { itemHref, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";
import Badge from "@/components/ui/Badge";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * The homepage "Featured pieces" grid: the admin-curated `show_on_homepage`
 * items as a plain product grid (2 columns on phones, 3 from md, 4 from lg).
 * Every card is one big link to the piece's page, with no add-to-bag button.
 * Sold-out pieces keep their place but carry a "Sold out" badge.
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
    <section id="featured-pieces" aria-labelledby="featured-heading" className="scroll-mt-20 bg-cream">
      <div className="page-container pb-4 pt-12 lg:pb-8 lg:pt-20">
        <SectionHeader
          eyebrow="Handmade"
          title="Featured pieces"
          id="featured-heading"
          seeAllHref="/featured-pieces"
          className="mb-6"
        />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {items.map((item) => {
            const payPrice = item.discount_price ?? item.price;
            return (
              <li key={`${item.source ?? "featured_piece"}-${item.id}`}>
                <ProductCard
                  href={itemHref(item)}
                  name={item.name}
                  image={item.product_image}
                  price={formatAmount(payPrice)}
                  wasPrice={item.discount_price ? formatAmount(item.price) : undefined}
                  soldOut={item.sold_out}
                  badges={item.sold_out ? <Badge variant="soldOut">Sold out</Badge> : undefined}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
