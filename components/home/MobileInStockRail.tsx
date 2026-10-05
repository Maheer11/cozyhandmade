"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartContext";
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
   * True only for products with no size or colour to choose. Anything with
   * options goes to its product page instead: adding it from here would put
   * an item in the cart with no size/colour chosen (the known quick-add gap).
   */
  quickAdd: boolean;
}

/**
 * Phone-only "In stock now" row: swipe sideways through what can be bought
 * today, and add a simple item to the cart without leaving the homepage.
 */
export default function MobileInStockRail({ products }: { products: RailProduct[] }) {
  const { addItem } = useCart();
  const { formatAmount } = useCurrency();
  const [addedId, setAddedId] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  if (products.length === 0) return null;

  function handleAdd(product: RailProduct) {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      source: "product",
      maxQuantity: product.stockQuantity,
      shippingWeightGrams: product.shippingWeightGrams,
    });
    setAddedId(product.id);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAddedId(null), 1600);
  }

  return (
    <section aria-labelledby="mobile-instock-heading" className="lg:hidden bg-ui-bg">
      <div className="page-container pt-8 pb-2">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="mobile-instock-heading" className="font-heading text-2xl font-medium text-ui-text">
            In stock now
          </h2>
          <Link href="/products" className="focus-ring rounded-button font-body text-sm font-medium text-ui-accent">
            See all
          </Link>
        </div>

        <ul className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2">
          {products.map((product) => {
            const added = addedId === product.id;
            return (
              <li key={product.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start">
                <div className="overflow-hidden rounded-card border border-ui-border bg-ui-surface">
                  <Link
                    href={`/products/${product.id}`}
                    className="focus-ring block transition-transform duration-150 active:scale-[0.98]"
                    style={{ touchAction: "manipulation" }}
                  >
                    <div className="relative aspect-[4/5] bg-cream-dark">
                      <Image src={product.image} alt={product.name} fill sizes="(max-width: 1023px) 44vw, 1px"
                             className="object-cover" />
                      {product.stockQuantity <= 2 && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5
                                         font-body text-[11px] font-semibold text-ui-accent">
                          Only {product.stockQuantity} left
                        </span>
                      )}
                    </div>
                    <div className="px-3 pt-2.5">
                      <p className="line-clamp-1 font-heading text-base leading-snug text-ui-text">{product.name}</p>
                      <p className="mt-0.5 flex items-baseline gap-1.5 font-body text-sm">
                        <span className="font-semibold text-ui-text">{formatAmount(product.price)}</span>
                        {product.wasPrice && (
                          <span className="text-xs text-ui-muted line-through">
                            <span className="sr-only">Was </span>{formatAmount(product.wasPrice)}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <div className="p-3 pt-2">
                    {product.quickAdd ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(product)}
                        aria-live="polite"
                        className={`focus-ring flex h-10 w-full items-center justify-center gap-1.5 rounded-full
                                    font-body text-sm font-semibold transition-all duration-150 active:scale-95
                                    ${added ? "bg-emerald-600 text-white" : "bg-ui-accent text-white"}`}
                        style={{ touchAction: "manipulation" }}
                      >
                        {added ? "Added ✓" : <><span aria-hidden="true">+</span> Add to cart</>}
                      </button>
                    ) : (
                      <Link
                        href={`/products/${product.id}`}
                        className="focus-ring flex h-10 w-full items-center justify-center rounded-full border border-ui-accent
                                   font-body text-sm font-semibold text-ui-accent transition-transform duration-150 active:scale-95"
                        style={{ touchAction: "manipulation" }}
                      >
                        Choose options
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
