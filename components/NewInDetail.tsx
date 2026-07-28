"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { NewInCardData } from "./NewInSection";
import { parseDescription } from "@/lib/parse-new-in-description";

export interface NewInDetailData extends NewInCardData {
  colors: string[];
  sizes: string[];
  description: string;
  stock_quantity: number;
  variant_price: Record<string, number>;
}

export default function NewInDetail({ item }: { item: NewInDetailData }) {
  const { addItem, openCart } = useCart();
  const { formatAmount } = useCurrency();

  const [activeImg, setActiveImg]   = useState(0);
  const [quantity, setQuantity]     = useState(1);
  const [added, setAdded]           = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(item.colors[0] ?? null);
  const [selectedSize, setSelectedSize]   = useState<string | null>(item.sizes[0] ?? null);
  const [descExpanded, setDescExpanded]   = useState(false);
  const [openSections, setOpenSections]   = useState<Set<number>>(new Set());
  const descSections = useMemo(() => parseDescription(item.description ?? ""), [item.description]);
  const introSection = descSections.find((s) => s.heading === null) ?? null;
  const namedSections = useMemo(() => descSections.filter((s) => s.heading !== null), [descSections]);

  const toggleSection = (i: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const images = [item.product_image, ...(item.lifestyle_image ? [item.lifestyle_image] : [])];
  // Per-tier price (e.g. size "With Stand") wins when set; otherwise falls
  // back to the item's base discount_price/price — same pattern as the
  // regular products' variantPrice.
  const displayPrice = (selectedSize && item.variant_price[selectedSize] !== undefined)
    ? item.variant_price[selectedSize]
    : (item.discount_price ?? item.price);
  const isOutOfStock = item.sold_out || item.stock_quantity <= 0;
  const maxQty = item.stock_quantity;

  const variantLabel = [selectedColor, selectedSize].filter(Boolean).join(" / ");
  const cartName = variantLabel ? `${item.name} (${variantLabel})` : item.name;

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: item.id,
        name: cartName,
        price: displayPrice,
        image: item.product_image,
        source: "new_in",
        variant: selectedSize ?? undefined,
        shippingWeightGrams: item.shipping_weight_grams,
      });
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
          <li><Link href="/new-in" className="active:text-gold transition-colors">New In</Link></li>
          <li className="text-taupe">/</li>
          <li className="text-brown font-medium truncate">{item.name}</li>
        </ol>
      </nav>

      <div className="max-w-7xl mx-auto lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-14 lg:items-start">

          {/* Image gallery */}
          <div className="lg:sticky lg:top-24">
            <div className="relative bg-cream-dark aspect-square lg:rounded-3xl overflow-hidden">
              <Image
                src={images[activeImg]}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-opacity duration-300"
                priority
              />
              <span
                className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full
                           ${isOutOfStock ? "bg-black text-white" : "bg-white/95 text-deep-brown shadow-sm"}`}
              >
                {isOutOfStock ? "Sold Out" : "Available"}
              </span>
              {item.is_handmade && (
                <span className="absolute top-4 right-16 lg:right-4 bg-cream/90 backdrop-blur-sm
                                 text-brown text-[10px] font-medium px-2.5 py-1 rounded-full
                                 border border-taupe/20">
                  ✦ Handmade
                </span>
              )}
              <Link
                href="/new-in"
                className="lg:hidden absolute top-4 right-4 w-11 h-11 bg-cream/90 backdrop-blur-sm
                           rounded-full flex items-center justify-center shadow-md
                           active:scale-90 transition-transform duration-100"
              >
                <svg className="w-5 h-5 text-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2.5 px-4 lg:px-0 py-3 overflow-x-auto">
                {images.map((img, i) => (
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

          {/* Info */}
          <div className="px-4 sm:px-6 lg:px-0 py-5 lg:py-0 pb-16 lg:pb-0">
            <p className="text-gold text-[11px] uppercase tracking-[0.2em] font-body font-semibold mb-2">
              ✦ Just Landed
            </p>
            <h1 className="font-ios text-xl sm:text-2xl lg:text-3xl font-700 text-deep-brown mb-3 leading-tight">
              {item.name}
            </h1>

            <div className="flex items-baseline gap-3 mt-1 mb-5">
              {selectedSize && item.variant_price[selectedSize] !== undefined ? (
                // A selected size/tier has its own price — show that alone,
                // no strikethrough (tiers are configurations, not discounts).
                <span className="font-ios text-xl font-700 text-brown">{formatAmount(displayPrice)}</span>
              ) : item.discount_price ? (
                <>
                  <span className="font-ios text-xl font-700 text-brown">{formatAmount(item.discount_price)}</span>
                  <span className="font-ios text-sm text-taupe-dark line-through">{formatAmount(item.price)}</span>
                </>
              ) : (
                <span className="font-ios text-xl font-700 text-brown">{formatAmount(item.price)}</span>
              )}
              {isOutOfStock && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Out of Stock
                </span>
              )}
              {!isOutOfStock && item.stock_quantity <= 3 && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Only {item.stock_quantity} left
                </span>
              )}
            </div>

            {/* Intro — the untitled first block of the description, same
                string always, truncated with a Read more/less toggle. */}
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

            {/* Each named section — "Why You'll Love It", "Product Details",
                "Production Time", "Care Instructions", "Please Note" — is its
                own independent dropdown, closed by default. */}
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

            {/* Color selector */}
            {item.colors.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-deep-brown uppercase tracking-widest mb-2.5">
                  Colour: <span className="font-normal normal-case text-taupe-dark">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {item.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 text-xs font-medium border rounded-full transition-all duration-150
                        ${selectedColor === c ? "border-deep-brown bg-deep-brown text-cream" : "border-taupe/40 text-brown hover:border-brown bg-white"}`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.toLowerCase() }}
                      />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {item.sizes.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-deep-brown uppercase tracking-widest mb-2.5">
                  Size: <span className="font-normal normal-case text-taupe-dark">{selectedSize}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[40px] px-3 py-1.5 text-xs font-semibold border transition-all duration-150
                        ${selectedSize === s ? "border-deep-brown bg-deep-brown text-cream" : "border-taupe/40 text-brown hover:border-brown bg-white"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile quantity row */}
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
              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`px-8 py-2.5 text-sm font-semibold rounded-none transition-all duration-200
                            ${added ? "bg-green-600 text-white"
                              : isOutOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-gold text-cream hover:bg-gold-dark hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-lg hover:shadow-gold/25"
                            }`}
              >
                {added ? "Added!" : isOutOfStock ? "Out of Stock" : "Add to Bag"}
              </button>
            </div>

            <p className="text-xs text-taupe-dark leading-relaxed mt-5">
              Not sure which size or colour is right?{" "}
              <a href="mailto:mahhir09@gmail.com" className="text-gold font-semibold hover:text-gold-dark underline">
                Email us
              </a>. Every piece is made to order, and we&apos;re happy to help you choose.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky add-to-bag bar */}
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
          {added ? "Added to Bag!" : isOutOfStock ? "Out of Stock" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
