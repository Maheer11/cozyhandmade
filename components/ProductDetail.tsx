"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/products";
import { parseDescription } from "@/lib/parse-new-in-description";

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

const trustPoints = [
  {
    label: "Handmade to Order",
    description: "No two pieces are exactly alike",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    label: "Tracked Delivery",
    description: "Included on every order",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v11.177m0-11.177L12 3.75 3 12l9 8.25" />
      </svg>
    ),
  },
  {
    label: "Gift Wrapped",
    description: "Ready to give on arrival",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18.75c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
];

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
  const { addItem, openCart } = useCart();
  const { formatAmount } = useCurrency();
  const [activeImg,     setActiveImg]     = useState(0);
  const [quantity,      setQuantity]      = useState(1);
  const [added,         setAdded]         = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors[0] ?? null);
  const [selectedSize,  setSelectedSize]  = useState<string | null>(product.sizes[0] ?? null);
  const [detailsOpen,   setDetailsOpen]   = useState(false);
  const [descExpanded,  setDescExpanded]  = useState(false);
  const [openSections,  setOpenSections]  = useState<Set<number>>(new Set());

  // Same description convention as New In items: an untitled intro block,
  // then known headings ("Why You'll Love It", "Product Details", …) each
  // rendered as an independent dropdown.
  const descSections  = useMemo(() => parseDescription(product.description ?? ""), [product.description]);
  const introSection  = descSections.find((s) => s.heading === null) ?? null;
  const namedSections = useMemo(() => descSections.filter((s) => s.heading !== null), [descSections]);

  const toggleSection = (i: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const hasVariants = product.colors.length > 0 || product.sizes.length > 0;

  // Stock for the currently selected combination
  const variantStock: number = hasVariants
    ? (product.variantStock[variantKey(selectedColor, selectedSize)] ?? 0)
    : product.stockQuantity;

  const isOutOfStock = variantStock === 0;
  const maxQty       = hasVariants ? variantStock : product.stockQuantity;

  const variantLabel = [selectedColor, selectedSize].filter(Boolean).join(" / ");
  const cartName     = variantLabel ? `${product.name} (${variantLabel})` : product.name;

  // Use per-size price if set, otherwise fall back to base price
  const displayPrice = (selectedSize && product.variantPrice[selectedSize] !== undefined)
    ? product.variantPrice[selectedSize]
    : product.price;

  // Reset quantity when variant changes to avoid exceeding new stock limit
  const handleColorSelect = (c: string) => { setSelectedColor(c); setQuantity(1); };
  const handleSizeSelect  = (s: string) => { setSelectedSize(s);  setQuantity(1); };

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: cartName, price: displayPrice, image: product.image, source: "product", variant: selectedSize ?? undefined, shippingWeightGrams: product.shippingWeightGrams });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    openCart();
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
                <span className="absolute top-4 left-4 bg-gold text-cream text-xs
                                 font-semibold px-3 py-1.5 rounded-full">
                  Sale
                </span>
              )}
              {product.isHandmade && (
                <span className="absolute top-4 right-16 lg:right-4 bg-cream/90 backdrop-blur-sm
                                 text-brown text-[10px] font-medium px-2.5 py-1 rounded-full
                                 border border-taupe/20">
                  ✦ Handmade
                </span>
              )}
              <Link
                href="/products"
                className="lg:hidden absolute top-4 right-4 w-11 h-11 bg-cream/90 backdrop-blur-sm
                           rounded-full flex items-center justify-center shadow-md
                           active:scale-90 transition-transform duration-100"
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
            <p className="text-gold text-[11px] uppercase tracking-[0.2em] font-body font-semibold mb-2">
              {product.category.replace(/-/g, " ")}
            </p>
            <h1 className="font-ios text-xl sm:text-2xl lg:text-3xl font-700 text-deep-brown mb-3 leading-tight">
              {product.name}
            </h1>

            <StarRating rating={product.rating} count={product.reviewCount} />

            <div className="flex items-baseline gap-3 mt-4 mb-5">
              <span className="font-ios text-xl font-700 text-brown">{formatAmount(displayPrice)}</span>
              {product.originalPrice && displayPrice === product.price && (
                <>
                  <span className="text-base text-taupe-dark line-through">{formatAmount(product.originalPrice)}</span>
                  <span className="text-sm font-medium text-gold">
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

            {/* Intro — the untitled first block of the description, truncated
                with a Read more/less toggle. Same treatment as New In items. */}
            {introSection && (
              <div className="mb-2">
                <p className={`text-brown/75 leading-relaxed text-sm sm:text-base ${descExpanded ? "" : "line-clamp-3"}`}>
                  {introSection.lines.join(" ")}
                </p>
                <button
                  type="button"
                  onClick={() => setDescExpanded((o) => !o)}
                  className="text-xs font-semibold text-gold hover:text-gold-dark mt-1.5 transition-colors"
                >
                  {descExpanded ? "Read less ▴" : "Read more ▾"}
                </button>
              </div>
            )}

            {/* Named description sections — each an independent dropdown,
                closed by default, identical to the New In detail page. */}
            {namedSections.length > 0 && (
              <div className="mb-6">
                {namedSections.map((section, i) => {
                  const open = openSections.has(i);
                  return (
                    <div key={i} className="border-b border-taupe/20 first:border-t">
                      <button
                        type="button"
                        onClick={() => toggleSection(i)}
                        className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                      >
                        <span className="font-ios font-700 text-xs uppercase tracking-widest text-deep-brown">
                          {section.heading}
                        </span>
                        <span
                          className="w-6 h-6 flex items-center justify-center border border-taupe/40 text-gold text-base font-medium leading-none transition-transform duration-300 shrink-0"
                          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          {open ? "−" : "+"}
                        </span>
                      </button>

                      <div
                        className="grid transition-all duration-300 ease-in-out"
                        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="pb-4">
                            {section.type === "bullets" && (
                              <ul className="space-y-2">
                                {section.lines.map((line, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm text-brown/75 leading-relaxed animate-fade-up">
                                    <span className="text-gold mt-0.5 shrink-0">✦</span>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {section.type === "specs" && (
                              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                                {section.lines.map((line, j) => {
                                  const [label, ...rest] = line.split(":");
                                  return (
                                    <Fragment key={j}>
                                      <dt className="text-taupe-dark font-medium whitespace-nowrap">{label.trim()}</dt>
                                      <dd className="text-deep-brown">{rest.join(":").trim()}</dd>
                                    </Fragment>
                                  );
                                })}
                              </dl>
                            )}
                            {section.type === "paragraph" && (
                              <p className="text-sm sm:text-base text-brown/75 leading-relaxed">
                                {section.lines.join(" ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust strip — real, site-wide claims, not per-product fabrication */}
            <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-y border-taupe/20">
              {trustPoints.map(({ label, description, icon }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 px-1">
                  <span className="text-gold">{icon}</span>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-deep-brown leading-tight">
                    {label}
                  </p>
                  <p className="text-[10px] text-taupe-dark leading-snug hidden sm:block">{description}</p>
                </div>
              ))}
            </div>

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
                        className="w-11 h-11 flex items-center justify-center text-brown active:bg-cream-dark active:scale-90 transition-transform duration-100 disabled:opacity-30"
                        style={{ touchAction: "manipulation" }}>−</button>
                <span className="w-8 text-center text-sm font-semibold text-deep-brown">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={isOutOfStock || quantity >= maxQty}
                        className="w-11 h-11 flex items-center justify-center text-brown active:bg-cream-dark active:scale-90 transition-transform duration-100 disabled:opacity-30"
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
                className={`px-8 py-2.5 text-sm font-semibold rounded-none transition-all duration-200
                            ${added ? "bg-green-600 text-white"
                              : isOutOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-gold text-cream hover:bg-gold-dark hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-lg hover:shadow-gold/25"
                            }`}
              >
                {added ? "Added!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>

            {/* Details list — same dropdown treatment as the description sections */}
            {product.details.length > 0 && (
              <div className="border-t border-b border-taupe/20 mt-2">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                >
                  <span className="font-ios font-700 text-xs uppercase tracking-widest text-deep-brown">Details &amp; Specifications</span>
                  <span
                    className="w-6 h-6 flex items-center justify-center border border-taupe/40 text-gold text-base font-medium leading-none transition-transform duration-300 shrink-0"
                    style={{ transform: detailsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
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
                    <ul className="space-y-2 pb-4">
                      {product.details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm text-brown/75 leading-relaxed animate-fade-up">
                          <span className="text-gold mt-0.5 shrink-0">✦</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer confidence note — real support channel, not fabricated policy */}
            <p className="text-xs text-taupe-dark leading-relaxed mt-5">
              Not sure which size or colour is right?{" "}
              <a href="mailto:mahhir09@gmail.com" className="text-gold font-semibold hover:text-gold-dark underline">
                Email us
              </a>. Every piece is made to order, and we're happy to help you choose.
            </p>

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
