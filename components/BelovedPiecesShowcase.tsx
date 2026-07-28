"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { Product } from "@/lib/products";
import { parseDescription } from "@/lib/parse-new-in-description";

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
          <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
            ✦ Curated Selections
          </p>
          <h2 className="font-heading italic text-4xl sm:text-5xl lg:text-6xl font-400 text-deep-brown mb-4">
            Our Beloved Pieces
          </h2>
          <p className="text-taupe-dark text-base sm:text-lg max-w-2xl mx-auto font-medium">
            Handpicked creations, each a masterpiece of craft and care
          </p>
        </div>

        {/* Apple-style showcase grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Image carousel */}
          <div className="flex flex-col gap-4">
            {/* Main image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-cream-dark shadow-2xl">
              <Image
                src={currentProduct.images[selectedImageIndex] || currentProduct.image}
                alt={currentProduct.name}
                fill
                className="object-cover"
                priority
              />
              {currentProduct.originalPrice && (
                <div className="absolute top-5 left-5 bg-gold text-cream text-[11px] font-semibold px-3 py-1.5 rounded-full">
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
                    className={`relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden
                               transition-all duration-200 border-2
                               ${idx === selectedImageIndex
                        ? "border-gold shadow-md"
                        : "border-taupe/20 hover:border-taupe/40"
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
            {/* Product title & rating */}
            <div className="mb-6">
              <h3 className="font-heading italic text-3xl lg:text-4xl font-400 text-deep-brown leading-tight mb-3">
                {currentProduct.name}
              </h3>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(currentProduct.rating)
                          ? "text-gold"
                          : "text-taupe/30"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-taupe-dark font-medium">
                  {currentProduct.rating} ({currentProduct.reviewCount} reviews)
                </span>
              </div>
            </div>

            {/* Description — intro block only; named sections live on the
                product page's dropdowns */}
            <p className="text-taupe-dark text-lg leading-relaxed mb-8 font-medium">
              {parseDescription(currentProduct.description ?? "")
                .find((s) => s.heading === null)
                ?.lines.join(" ") ?? currentProduct.description}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl font-semibold text-deep-brown">
                {formatAmount(currentProduct.price)}
              </span>
              {currentProduct.originalPrice && (
                <span className="text-lg text-taupe-dark line-through">
                  {formatAmount(currentProduct.originalPrice)}
                </span>
              )}
            </div>

            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              disabled={!currentProduct.inStock}
              className="w-full h-14 rounded-full text-base font-semibold
                         bg-gold text-cream
                         hover:bg-gold-dark hover:shadow-xl hover:shadow-gold/30
                         active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 ease-out mb-4
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
            >
              {currentProduct.inStock ? "Add to Cart" : "Out of Stock"}
            </button>

            {/* View details link */}
            <Link
              href={`/products/${currentProduct.id}`}
              className="text-center py-3 text-sm font-semibold text-gold
                         hover:text-gold-dark transition-colors duration-200
                         border-b border-gold/30 hover:border-gold"
            >
              View All Details →
            </Link>

            {/* Product details */}
            {currentProduct.details.length > 0 && (
              <div className="mt-10 pt-8 border-t border-taupe/15">
                <p className="text-[11px] uppercase tracking-[0.15em] text-taupe-dark font-semibold mb-3">
                  Details
                </p>
                <ul className="space-y-2">
                  {currentProduct.details.slice(0, 4).map((detail, idx) => (
                    <li key={idx} className="text-sm text-taupe-dark flex items-start gap-2">
                      <span className="text-gold mt-0.5 shrink-0">✦</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Carousel pagination */}
            {products.length > 1 && (
              <div className="mt-12 pt-8 border-t border-taupe/15">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-taupe-dark uppercase tracking-[0.15em] font-semibold">
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
                                       ? "bg-gold w-8 h-2"
                                       : "bg-taupe/30 w-2 h-2 hover:bg-taupe/50"
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
