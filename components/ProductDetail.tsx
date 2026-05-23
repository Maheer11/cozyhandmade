"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/products";

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "text-gold" : "text-taupe"}`}
               fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-taupe-dark">{rating} <span className="text-taupe">({count})</span></span>
    </div>
  );
}

export default function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { addItem } = useCart();
  const { formatAmount } = useCurrency();
  const [activeImg,    setActiveImg]    = useState(0);
  const [quantity,     setQuantity]     = useState(1);
  const [added,        setAdded]        = useState(false);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? null);
  const [detailsOpen,  setDetailsOpen]  = useState(false);

  const activePrice = selectedSize?.price ?? product.price;
  const cartName    = selectedSize ? `${product.name} (${selectedSize.label.trim()})` : product.name;

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: cartName, price: activePrice, image: product.image });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Breadcrumb */}
      <nav className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-3">
        <ol className="flex items-center gap-2 text-xs text-taupe-dark max-w-7xl mx-auto">
          <li><Link href="/" className="active:text-gold transition-colors">Home</Link></li>
          <li className="text-taupe">/</li>
          <li><Link href="/products" className="active:text-gold transition-colors">Shop</Link></li>
          <li className="text-taupe">/</li>
          <li className="text-brown font-medium truncate">{product.name}</li>
        </ol>
      </nav>

      {/* Main content */}
      <div className="max-w-7xl mx-auto lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-14 lg:items-start">

          {/* Image gallery */}
          <div className="lg:sticky lg:top-24">
            <div className="relative bg-cream-dark aspect-square lg:rounded-3xl overflow-hidden">
              <Image
                src={product.images[activeImg]}
                alt={product.name}
                fill
                className="object-cover transition-opacity duration-300"
                priority
              />
              {product.originalPrice && (
                <span className="absolute top-4 left-4 bg-terracotta text-cream text-xs
                                 font-semibold px-3 py-1.5 rounded-full">
                  Sale
                </span>
              )}
              <Link
                href="/products"
                className="lg:hidden absolute top-4 right-4 w-10 h-10 bg-cream/90 backdrop-blur-sm
                           rounded-full flex items-center justify-center shadow-md"
              >
                <svg className="w-5 h-5 text-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2.5 px-4 lg:px-0 py-3 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0
                                border-2 transition-all duration-200 active:scale-[0.95]
                                ${activeImg === i ? "border-gold" : "border-transparent"}`}
                    style={{ touchAction: "manipulation" }}
                  >
                    <Image src={img} alt="" fill loading="lazy" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="px-4 sm:px-6 lg:px-0 py-5 lg:py-0 pb-16 lg:pb-0">
            <p className="text-terracotta text-[10px] uppercase tracking-[0.15em] font-medium mb-2">
              {product.category.replace(/-/g, " ")}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-700 text-deep-brown mb-3 leading-tight">
              {product.name}
            </h1>

            <StarRating rating={product.rating} count={product.reviewCount} />

            <div className="flex items-baseline gap-3 mt-4 mb-5">
              <span className="text-2xl font-bold text-brown">{formatAmount(activePrice)}</span>
              {product.originalPrice && !selectedSize && (
                <>
                  <span className="text-base text-taupe-dark line-through">{formatAmount(product.originalPrice)}</span>
                  <span className="text-sm font-medium text-terracotta">
                    Save {formatAmount(product.originalPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            <p className="text-brown/75 leading-relaxed text-sm sm:text-base mb-6">{product.description}</p>

            {/* Size selector — only shown for products with size variants */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-deep-brown uppercase tracking-widest mb-2">
                  Size
                </label>
                <div className="relative inline-block">
                  <select
                    value={selectedSize?.label ?? ""}
                    onChange={(e) => {
                      const match = product.sizes!.find((s) => s.label === e.target.value);
                      if (match) setSelectedSize(match);
                    }}
                    className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-taupe/40
                               bg-white text-deep-brown text-xs font-medium cursor-pointer
                               focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                               transition-all duration-200"
                  >
                    {product.sizes.map((s) => (
                      <option key={s.label} value={s.label}>
                        {s.label.trim()} — {formatAmount(s.price)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-taupe">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile quantity row — sits inline above the sticky bar */}
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-deep-brown uppercase tracking-widest">Qty</span>
              <div className="flex items-center border border-taupe/40 rounded overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 flex items-center justify-center text-brown hover:bg-cream-dark transition-colors"
                        style={{ touchAction: "manipulation" }}>−</button>
                <span className="w-8 text-center text-sm font-semibold text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}
                        className="w-8 h-8 flex items-center justify-center text-brown hover:bg-cream-dark transition-colors"
                        style={{ touchAction: "manipulation" }}>+</button>
              </div>
            </div>

            {/* Desktop quantity + add */}
            <div className="hidden lg:flex items-center gap-3 mb-5">
              <div className="flex items-center border border-taupe/40 overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center text-brown text-base hover:bg-cream-dark transition-colors">−</button>
                <span className="w-8 text-center text-sm font-medium text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}
                        className="w-9 h-9 flex items-center justify-center text-brown text-base hover:bg-cream-dark transition-colors">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!product.inStock}
                className={`px-8 py-2.5 text-sm font-semibold transition-all duration-200
                            ${added ? "bg-green-600 text-white"
                              : "bg-terracotta text-cream hover:bg-gold hover:scale-[1.02] active:scale-[0.99]"
                            } disabled:opacity-40`}
              >
                {added ? "Added!" : product.inStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            {/* Product details accordion */}
            <div className="border-t border-b border-taupe/30 mt-2">
              <button
                onClick={() => setDetailsOpen((o) => !o)}
                className="flex items-center gap-3 py-3.5 text-left"
              >
                <span className="font-heading font-500 text-sm tracking-wide" style={{ color: "#8B2035" }}>Product Details</span>
                <span
                  className="w-6 h-6 flex items-center justify-center border border-taupe/40 text-base font-medium leading-none transition-transform duration-300"
                  style={{ color: "#8B2035", transform: detailsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  {detailsOpen ? "−" : "+"}
                </span>
              </button>

              {/* Animated slide-down */}
              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: detailsOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-2 pb-5 pt-1">
                    {product.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-brown/75 animate-fade-up">
                        <span className="text-gold mt-0.5 shrink-0">✦</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-0 mt-12 lg:mt-20">
            <h2 className="font-heading text-xl sm:text-2xl font-700 text-deep-brown mb-5">You might also love</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky add-to-cart bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-4 py-3">
        <button
          onClick={handleAdd}
          disabled={!product.inStock}
          className={`w-full h-12 rounded font-bold text-sm tracking-widest uppercase transition-all active:scale-[0.99]
                      ${added ? "bg-green-600 text-white"
                        : product.inStock ? "bg-deep-brown text-cream"
                        : "bg-taupe/30 text-taupe-dark"
                      } disabled:cursor-not-allowed`}
          style={{ touchAction: "manipulation" }}
        >
          {added ? "Added to Cart!" : product.inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}
