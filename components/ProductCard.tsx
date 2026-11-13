"use client";

import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { Product } from "@/lib/products";
import Badge from "@/components/ui/Badge";
import UiProductCard from "@/components/ui/ProductCard";

/**
 * Product listing / related-products card. The whole card is the link to the
 * product page; there is no add-to-bag button on it (docs/DESIGN.md).
 */
export default function ProductCard({ product }: { product: Product }) {
  const { formatAmount, isLoading } = useCurrency();

  // The price shown is the one the product page opens on: the first size's
  // own price when it has one, else the listed price. (It used to show the
  // lowest size price, so a piece read €45 here and €55 on its page.)
  const defaultSize = product.sizes[0];
  const displayPrice =
    defaultSize !== undefined && product.variantPrice[defaultSize] !== undefined
      ? product.variantPrice[defaultSize]
      : product.price;

  const badges = (
    <>
      {!product.inStock && <Badge variant="soldOut">Sold out</Badge>}
      {product.originalPrice && product.inStock && (
        <span className="inline-flex items-center rounded-pill bg-burgundy px-3 py-1 font-body text-xs font-semibold leading-4 text-white">
          Sale
        </span>
      )}
      {product.isHandmade && product.inStock && <Badge variant="handmade">✦ Handmade</Badge>}
    </>
  );

  return (
    <UiProductCard
      href={`/products/${product.id}`}
      name={product.name}
      image={product.image}
      soldOut={!product.inStock}
      badges={badges}
      price={isLoading ? <span className="inline-block h-5 w-20 animate-pulse rounded-small bg-line" /> : formatAmount(displayPrice)}
      wasPrice={
        !isLoading && product.originalPrice && displayPrice === product.price
          ? formatAmount(product.originalPrice)
          : undefined
      }
    />
  );
}
