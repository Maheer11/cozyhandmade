"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { Product } from "@/lib/products";
import { parseDescription } from "@/lib/parse-featured-piece-description";

interface BelovedPiecesShowcaseProps {
  products: Product[];
}

export default function BelovedPiecesShowcase({ products }: BelovedPiecesShowcaseProps) {
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const currentProduct = products[selectedProductIndex];
  const { addItem } = useCart();
  const { formatAmount } = useCurrency();

  if (!products.length) return null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.image,
      // custom_products has no shipping_weight_grams column (out of scope
      // for this feature) — always unknown, so calculateShipping() falls
      // back to its deliberately-high default for these items.
      shippingWeightGrams: currentProduct.shippingWeightGrams,
    });
  };

  const handleProductChange = (index: number) => {
    setSelectedProductIndex(index);
    setSelectedImageIndex(0);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="type-eyebrow text-burgundy mb-3">
            ✦ Curated Selections
          </p>
          <h2 className="type-h1 text-brown mb-4">
            Our Beloved Pieces
          </h2>
          <p className="text-stone text-base sm:text-lg max-w-2xl mx-auto font-medium">
            Handpicked creations, each a masterpiece of craft and care
          </p>
        </div>

        {/* Apple-style showcase grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Image carousel */}
          <div className="flex flex-col gap-4">
            {/* Main image */}
            <div className="relative aspect-square rounded-card overflow-hidden bg-peach shadow-2xl">
              <Image
                src={currentProduct.images[selectedImageIndex] || currentProduct.image}
                alt={currentProduct.name}
                fill
                className="object-cover"
                priority
              />
              {currentProduct.originalPrice && (
                <div className="absolute top-5 left-5 bg-burgundy text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  Sale
                </div>
              )}
            </div>

            {/* Thumbnail carousel */}
            {currentProduct.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {currentProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative shrink-0 w-20 h-20 rounded-card overflow-hidden
                               transition-all duration-200 border-2
                               ${idx === selectedImageIndex
                        ? "border-burgundy shadow-md"
                        : "border-line hover:border-line/40"
                      }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${currentProduct.name} view ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product info & carousel controls */}
          <div className="flex flex-col">
            {/* Product title */}
            <div className="mb-6">
              <h3 className="type-h1 text-brown leading-tight">
                {currentProduct.name}
              </h3>
            </div>

            {/* Description — intro block only; named sections live on the
                product page's dropdowns */}
            <p className="text-stone text-lg leading-relaxed mb-8 font-medium">
              {parseDescription(currentProduct.description ?? "")
                .find((s) => s.heading === null)
                ?.lines.join(" ") ?? currentProduct.description}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl font-semibold text-brown">
                {formatAmount(currentProduct.price)}
              </span>
              {currentProduct.originalPrice && (
                <span className="text-lg text-stone line-through">
                  {formatAmount(currentProduct.originalPrice)}
                </span>
              )}
            </div>

            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              disabled={!currentProduct.inStock}
              className="w-full h-14 rounded-full text-base font-semibold
                         bg-burgundy text-white
                         hover:bg-burgundy-dark hover:shadow-xl hover:shadow-burgundy/30
                         active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 ease-out mb-4
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-burgundy"
            >
              {currentProduct.inStock ? "Add to Cart" : "Out of Stock"}
            </button>

            {/* View details link */}
            <Link
              href={`/products/${currentProduct.id}`}
              className="text-center py-3 text-sm font-semibold text-burgundy
                         hover:text-burgundy-dark transition-colors duration-200
                         border-b border-burgundy/30 hover:border-burgundy"
            >
              View All Details →
            </Link>

            {/* Product details */}
            {currentProduct.details.length > 0 && (
              <div className="mt-10 pt-8 border-t border-line/15">
                <p className="text-xs uppercase tracking-[0.15em] text-stone font-semibold mb-3">
                  Details
                </p>
                <ul className="space-y-2">
                  {currentProduct.details.slice(0, 4).map((detail, idx) => (
                    <li key={idx} className="text-sm text-stone flex items-start gap-2">
                      <span className="text-burgundy mt-0.5 shrink-0">✦</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Carousel pagination */}
            {products.length > 1 && (
              <div className="mt-12 pt-8 border-t border-line/15">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-stone uppercase tracking-[0.15em] font-semibold">
                    Explore Other Pieces
                  </p>
                  <div className="flex gap-1.5">
                    {products.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleProductChange(idx)}
                        className={`transition-all duration-300 rounded-full
                                   ${
                                     selectedProductIndex === idx
                                       ? "bg-burgundy w-8 h-2"
                                       : "bg-line/30 w-2 h-2 hover:bg-line/50"
                                   }`}
                        aria-label={`View beloved piece ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
