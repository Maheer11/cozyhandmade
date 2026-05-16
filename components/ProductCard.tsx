"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { Product } from "@/lib/products";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? "text-gold" : "text-taupe"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { formatAmount, isLoading } = useCurrency();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image });
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden
                 border border-cream-darker shadow-sm
                 hover:-translate-y-1.5 hover:shadow-xl
                 active:translate-y-0 active:shadow-sm
                 transition-all duration-300 ease-out
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                 animate-fade-up"
      style={{ touchAction: "manipulation" }}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-cream-dark aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Sale badge */}
        {product.originalPrice && (
          <span className="absolute top-2 left-2 bg-gold text-cream text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Sale
          </span>
        )}

        {/* Handmade badge — top-right */}
        <span className="absolute top-2 right-2 bg-cream/90 text-brown text-[10px] font-medium
                         px-2 py-0.5 rounded-full backdrop-blur-sm border border-taupe/20">
          ✦ Handmade
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <StarRating rating={product.rating} />
          <span className="text-[10px] text-taupe-dark">({product.reviewCount})</span>
        </div>

        <h3 className="font-heading italic font-400 text-deep-brown text-sm sm:text-base leading-snug mb-2 line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-1.5 mt-auto mb-3">
          {isLoading ? (
            <span className="h-5 w-20 bg-taupe/20 rounded animate-pulse" />
          ) : (
            <>
              <span className="text-base font-semibold text-brown">{formatAmount(product.price)}</span>
              {product.originalPrice && (
                <span className="text-xs text-taupe-dark line-through">{formatAmount(product.originalPrice)}</span>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!product.inStock}
          className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold tracking-wide
                     bg-cream-dark text-brown border border-taupe/30
                     hover:bg-gold hover:text-cream hover:border-gold
                     hover:-translate-y-px hover:shadow-md hover:shadow-gold/20
                     active:bg-gold active:text-cream active:border-gold active:translate-y-0
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 ease-out
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{ touchAction: "manipulation" }}
        >
          {product.inStock ? "Add to Basket" : "Out of Stock"}
        </button>
      </div>
    </Link>
  );
}
