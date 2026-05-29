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

function variantKey(color: string | null, size: string | null): string {
  if (color && size) return `${color}|${size}`;
  if (color) return color;
  if (size) return size;
  return "";
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
  const [activeImg,     setActiveImg]     = useState(0);
  const [quantity,      setQuantity]      = useState(1);
  const [added,         setAdded]         = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors[0] ?? null);
  const [selectedSize,  setSelectedSize]  = useState<string | null>(product.sizes[0] ?? null);
  const [detailsOpen,   setDetailsOpen]   = useState(false);

  const hasVariants = product.colors.length > 0 || product.sizes.length > 0;

  // Stock for the currently selected combination
  const variantStock: number = hasVariants
    ? (product.variantStock[variantKey(selectedColor, selectedSize)] ?? 0)
    : product.stockQuantity;

  const isOutOfStock = variantStock === 0;
  const maxQty       = hasVariants ? variantStock : product.stockQuantity;

  const variantLabel = [selectedColor, selectedSize].filter(Boolean).join(" / ");
  const cartName     = variantLabel ? `${product.name} (${variantLabel})` : product.name;

  // Reset quantity when variant changes to avoid exceeding new stock limit
  const handleColorSelect = (c: string) => { setSelectedColor(c); setQuantity(1); };
  const handleSizeSelect  = (s: string) => { setSelectedSize(s);  setQuantity(1); };

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: cartName, price: product.price, image: product.image });
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
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                    <Image src={img} alt="" fill sizes="80px" loading="lazy" className="object-cover" />
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
              <span className="text-2xl font-bold text-brown">{formatAmount(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-base text-taupe-dark line-through">{formatAmount(product.originalPrice)}</span>
                  <span className="text-sm font-medium text-terracotta">
                    Save {formatAmount(product.originalPrice - product.price)}
                  </span>
                </>
              )}
              {isOutOfStock && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Out of Stock
                </span>
              )}
              {!isOutOfStock && hasVariants && variantStock <= 3 && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Only {variantStock} left
                </span>
              )}
            </div>

            <p className="text-brown/75 leading-relaxed text-sm sm:text-base mb-6">{product.description}</p>

            {/* Color selector */}
            {product.colors.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-deep-brown uppercase tracking-widest mb-2.5">
                  Colour: <span className="font-normal normal-case text-taupe-dark">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => {
                    const cStock = product.sizes.length > 0
                      ? product.sizes.reduce((sum, s) => sum + (product.variantStock[`${c}|${s}`] ?? 0), 0)
                      : (product.variantStock[c] ?? 0);
                    const oos = cStock === 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => !oos && handleColorSelect(c)}
                        disabled={oos}
                        className={`px-3.5 py-1.5 text-xs font-medium border rounded-full transition-all duration-150
                          ${selectedColor === c
                            ? "border-deep-brown bg-deep-brown text-cream"
                            : oos
                              ? "border-taupe/20 text-taupe/50 line-through cursor-not-allowed bg-gray-50"
                              : "border-taupe/40 text-brown hover:border-brown bg-white"
                          }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size selector */}
            {product.sizes.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-deep-brown uppercase tracking-widest mb-2.5">
                  Size: <span className="font-normal normal-case text-taupe-dark">{selectedSize}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sStock = product.colors.length > 0
                      ? (product.variantStock[`${selectedColor}|${s}`] ?? 0)
                      : (product.variantStock[s] ?? 0);
                    const oos = sStock === 0;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => !oos && handleSizeSelect(s)}
                        disabled={oos}
                        className={`min-w-[40px] px-3 py-1.5 text-xs font-semibold border transition-all duration-150
                          ${selectedSize === s
                            ? "border-deep-brown bg-deep-brown text-cream"
                            : oos
                              ? "border-taupe/20 text-taupe/40 line-through cursor-not-allowed bg-gray-50"
                              : "border-taupe/40 text-brown hover:border-brown bg-white"
                          }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile quantity row — sits inline above the sticky bar */}
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-deep-brown uppercase tracking-widest">Qty</span>
              <div className="flex items-center border border-taupe/40 rounded overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={isOutOfStock}
                        className="w-8 h-8 flex items-center justify-center text-brown hover:bg-cream-dark transition-colors disabled:opacity-30"
                        style={{ touchAction: "manipulation" }}>−</button>
                <span className="w-8 text-center text-sm font-semibold text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={isOutOfStock || quantity >= maxQty}
                        className="w-8 h-8 flex items-center justify-center text-brown hover:bg-cream-dark transition-colors disabled:opacity-30"
                        style={{ touchAction: "manipulation" }}>+</button>
              </div>
              {hasVariants && !isOutOfStock && (
                <span className="text-xs text-taupe-dark">{variantStock} in stock</span>
              )}
            </div>

            {/* Desktop quantity + add */}
            <div className="hidden lg:flex items-center gap-3 mb-5">
              <div className="flex items-center border border-taupe/40 overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={isOutOfStock}
                        className="w-9 h-9 flex items-center justify-center text-brown text-base hover:bg-cream-dark transition-colors disabled:opacity-30">−</button>
                <span className="w-8 text-center text-sm font-medium text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={isOutOfStock || quantity >= maxQty}
                        className="w-9 h-9 flex items-center justify-center text-brown text-base hover:bg-cream-dark transition-colors disabled:opacity-30">+</button>
              </div>
              {hasVariants && !isOutOfStock && (
                <span className="text-xs text-taupe-dark">{variantStock} in stock</span>
              )}
              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`px-8 py-2.5 text-sm font-semibold transition-all duration-200
                            ${added ? "bg-green-600 text-white"
                              : isOutOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-terracotta text-cream hover:bg-gold hover:scale-[1.02] active:scale-[0.99]"
                            }`}
              >
                {added ? "Added!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
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
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 px-4 pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full h-12 rounded font-bold text-sm tracking-widest uppercase transition-all active:scale-[0.99]
                      ${added ? "bg-green-600 text-white"
                        : isOutOfStock ? "bg-gray-200 text-gray-400"
                        : "bg-deep-brown text-cream"
                      } disabled:cursor-not-allowed`}
          style={{ touchAction: "manipulation" }}
        >
          {added ? "Added to Cart!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
