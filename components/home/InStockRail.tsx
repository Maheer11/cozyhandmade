"use client";

import Badge from "@/components/ui/Badge";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { useCurrency } from "@/lib/currency/CurrencyContext";

export interface RailProduct {
  id: string;
  name: string;
  image: string;
  /** What the customer pays (the sale price when there is one). */
  price: number;
  /** The crossed-out price, when on sale. */
  wasPrice: number | null;
  stockQuantity: number;
  shippingWeightGrams: number | null;
  /**
   * Kept on the type for the data mapper in app/page.tsx. The cards no longer
   * have an add-to-bag button, so nothing here reads it.
   */
  quickAdd: boolean;
}

/** How many cards show per breakpoint: 4 (2×2) → 6 (3×2) → 8 (4×2). */
function visibilityClass(i: number): string {
  if (i < 4) return "";
  if (i < 6) return "hidden md:block";
  return "hidden lg:block";
}

/**
 * "In stock now": what can be bought today, straight from the admin's stock
 * numbers. Each card is one big link to the product page, with no add-to-bag
 * button on it.
 */
export default function InStockRail({ products }: { products: RailProduct[] }) {
  const { formatAmount } = useCurrency();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="instock-heading" className="bg-cream">
      <div className="page-container pt-12 lg:pt-20">
        <SectionHeader
          eyebrow="Ready to ship"
          title="In stock now"
          id="instock-heading"
          seeAllHref="/products"
          className="mb-6"
        />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.slice(0, 8).map((product, i) => (
            <li key={product.id} className={visibilityClass(i)}>
              <ProductCard
                href={`/products/${product.id}`}
                name={product.name}
                image={product.image}
                price={formatAmount(product.price)}
                wasPrice={product.wasPrice ? formatAmount(product.wasPrice) : undefined}
                badges={
                  product.stockQuantity <= 2 ? (
                    <Badge variant="lowStock">Only {product.stockQuantity} left</Badge>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
