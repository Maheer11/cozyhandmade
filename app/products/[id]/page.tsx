"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import { useCart } from "@/components/CartContext";
import ProductCard from "@/components/ProductCard";

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

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = getProduct(id);
  if (!product) notFound();

  const { addItem } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: product.name, price: product.price, image: product.image });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Breadcrumb ── */}
      <nav className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-3">
        <ol className="flex items-center gap-2 text-xs text-taupe-dark max-w-7xl mx-auto">
          <li><Link href="/" className="active:text-gold transition-colors">Home</Link></li>
          <li className="text-taupe">/</li>
          <li><Link href="/products" className="active:text-gold transition-colors">Shop</Link></li>
          <li className="text-taupe">/</li>
          <li className="text-brown font-medium truncate">{product.name}</li>
        </ol>
      </nav>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-14 lg:items-start">

          {/* ── Image gallery — full width on mobile ── */}
          <div className="lg:sticky lg:top-24">
            {/* Main image */}
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
              {/* Mobile back button overlay */}
              <Link
                href="/products"
                className="lg:hidden absolute top-4 right-4 w-10 h-10 bg-cream/90 backdrop-blur-sm
                           rounded-full flex items-center justify-center shadow-md
                           active:bg-cream transition-colors duration-150"
                aria-label="Back to products"
              >
                <svg className="w-5 h-5 text-brown" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </div>

            {/* Thumbnails — horizontal scroll on mobile */}
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
                    aria-label={`Image ${i + 1}`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product info ── */}
          <div className="px-4 sm:px-6 lg:px-0 py-5 lg:py-0
                          pb-28 lg:pb-0"> {/* extra bottom padding for sticky bar on mobile */}
            <p className="text-terracotta text-[10px] uppercase tracking-[0.15em] font-medium mb-2">
              {product.category.replace(/-/g, " ")}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-700 text-deep-brown
                           mb-3 leading-tight">
              {product.name}
            </h1>

            <StarRating rating={product.rating} count={product.reviewCount} />

            <div className="flex items-baseline gap-3 mt-4 mb-5">
              <span className="text-2xl font-bold text-brown">£{product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-base text-taupe-dark line-through">
                    £{product.originalPrice.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-terracotta">
                    Save £{(product.originalPrice - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            <p className="text-brown/75 leading-relaxed text-sm sm:text-base mb-6">
              {product.description}
            </p>

            {/* Quantity — desktop only (mobile uses sticky bar) */}
            <div className="hidden lg:flex items-center gap-4 mb-5">
              <div className="flex items-center border border-taupe/40 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-12 h-12 flex items-center justify-center text-brown text-xl
                                   hover:bg-cream-dark transition-colors duration-200">−</button>
                <span className="w-12 text-center font-medium text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}
                        className="w-12 h-12 flex items-center justify-center text-brown text-xl
                                   hover:bg-cream-dark transition-colors duration-200">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!product.inStock}
                className={`flex-1 h-12 rounded-xl font-medium text-sm transition-all duration-200
                            ${added
                              ? "bg-green-600 text-white"
                              : "bg-terracotta text-cream hover:bg-gold hover:scale-[1.02] active:scale-[0.99]"
                            } disabled:opacity-40`}
              >
                {added ? "Added!" : product.inStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            {/* Product details */}
            <div className="border-t border-taupe/20 pt-5 mb-5">
              <h3 className="font-heading font-600 text-deep-brown mb-3 text-base">Product Details</h3>
              <ul className="space-y-2">
                {product.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-brown/75">
                    <span className="text-gold mt-0.5 shrink-0">✦</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag}
                      className="text-xs px-3 py-1 bg-cream-dark text-taupe-dark
                                 rounded-full border border-taupe/30">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-0 mt-12 lg:mt-20">
            <h2 className="font-heading text-xl sm:text-2xl font-700 text-deep-brown mb-5">
              You might also love
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Add-to-Cart bar — mobile only ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30
                   bg-cream/95 backdrop-blur-md border-t border-taupe/20 px-4 pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          {/* Quantity controls */}
          <div className="flex items-center border border-taupe/40 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 flex items-center justify-center text-brown text-xl
                         active:bg-cream-dark transition-colors duration-150"
              style={{ touchAction: "manipulation" }}
              aria-label="Decrease quantity"
            >−</button>
            <span className="w-8 text-center text-sm font-semibold text-deep-brown">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-11 flex items-center justify-center text-brown text-xl
                         active:bg-cream-dark transition-colors duration-150"
              style={{ touchAction: "manipulation" }}
              aria-label="Increase quantity"
            >+</button>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className={`flex-1 h-14 rounded-2xl font-semibold text-base
                        transition-all duration-200 active:scale-[0.98]
                        ${added
                          ? "bg-green-600 text-white"
                          : product.inStock
                            ? "bg-terracotta text-cream active:bg-terracotta-dark"
                            : "bg-taupe/30 text-taupe-dark"
                        } disabled:cursor-not-allowed`}
            style={{ touchAction: "manipulation" }}
          >
            {added
              ? "Added to Cart!"
              : product.inStock
                ? `Add to Cart · £${(product.price * quantity).toFixed(2)}`
                : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
