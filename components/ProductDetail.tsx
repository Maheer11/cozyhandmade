"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import ProductCard from "./ProductCard";
import Accordion, { type AccordionItem } from "@/components/ui/Accordion";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import QuantityStepper from "@/components/ui/QuantityStepper";
import SectionHeader from "@/components/ui/SectionHeader";
import SizeSelector from "@/components/ui/SizeSelector";
import type { Product } from "@/lib/products";
import { parseDescription } from "@/lib/parse-featured-piece-description";

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
  const [descExpanded,  setDescExpanded]  = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Same description convention as Featured Pieces items: an untitled intro block,
  // then known headings ("Why You'll Love It", "Product Details", …) each
  // rendered as an independent dropdown.
  const descSections  = useMemo(() => parseDescription(product.description ?? ""), [product.description]);
  const introSection  = descSections.find((s) => s.heading === null) ?? null;
  const namedSections = useMemo(() => descSections.filter((s) => s.heading !== null), [descSections]);

  // Swipeable gallery: native scroll-snap does the swiping; these keep the
  // thumbnails and the dots in step with it.
  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activeImg && i >= 0 && i < product.images.length) setActiveImg(i);
  };
  const goToImage = (i: number) => {
    setActiveImg(i);
    const el = galleryRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
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
      addItem({ id: product.id, name: cartName, price: displayPrice, image: product.image, source: "product", variant: selectedSize ?? undefined, color: selectedColor ?? undefined, maxQuantity: maxQty, shippingWeightGrams: product.shippingWeightGrams });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    openCart();
  };

  // Dropdowns: the named description sections, then the details list. Each
  // is an independent row, closed by default (same as Featured Piece pages).
  const accordionItems: AccordionItem[] = [
    ...namedSections.map((section, i) => ({
      id: `section-${i}`,
      title: section.heading ?? "",
      content: (
        <>
          {section.type === "bullets" && (
            <ul className="space-y-2">
              {section.lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2 text-stone">
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-burgundy">✦</span>
                  {line}
                </li>
              ))}
            </ul>
          )}
          {section.type === "specs" && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 type-small">
              {section.lines.map((line, j) => {
                const [label, ...rest] = line.split(":");
                return (
                  <Fragment key={j}>
                    <dt className="whitespace-nowrap font-medium text-stone">{label.trim()}</dt>
                    <dd className="text-brown">{rest.join(":").trim()}</dd>
                  </Fragment>
                );
              })}
            </dl>
          )}
          {section.type === "paragraph" && <p className="text-stone">{section.lines.join(" ")}</p>}
        </>
      ),
    })),
    ...(product.details.length > 0
      ? [{
          id: "details",
          title: "Details & Specifications",
          content: (
            <ul className="space-y-2">
              {product.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-stone">
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-burgundy">✦</span>
                  {d}
                </li>
              ))}
            </ul>
          ),
        } satisfies AccordionItem]
      : []),
  ];

  const addLabel = added ? "Added!" : isOutOfStock ? "Out of stock" : `Add to bag · ${formatAmount(displayPrice * quantity)}`;
  const stepper = (
    <QuantityStepper
      value={quantity}
      onChange={setQuantity}
      min={1}
      max={Math.max(1, maxQty)}
      label="Quantity"
      className={isOutOfStock ? "pointer-events-none opacity-50" : undefined}
    />
  );

  return (
    <div className="min-h-screen bg-cream pb-12 lg:pb-0">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="page-container py-4">
        <ol className="flex flex-wrap items-center gap-x-2 type-small text-stone">
          <li><Link href="/" className="focus-ring rounded-small py-2 hover:text-burgundy">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/products" className="focus-ring rounded-small py-2 hover:text-burgundy">Shop</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-[12rem] truncate font-medium text-brown sm:max-w-none">{product.name}</li>
        </ol>
      </nav>

      <div className="page-container lg:pb-12">
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-14">

          {/* Image gallery */}
          <div className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-card bg-peach/40">
              <div
                ref={galleryRef}
                onScroll={onGalleryScroll}
                className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                role="group"
                aria-roledescription="carousel"
                aria-label={`${product.name} photos`}
              >
                {product.images.map((img, i) => (
                  <div key={img + i} className="relative aspect-[4/5] w-full shrink-0 snap-center sm:aspect-square">
                    <Image
                      src={img}
                      alt={i === 0 ? product.name : `${product.name}, photo ${i + 1}`}
                      fill
                      sizes="(max-width: 1023px) 100vw, 60vw"
                      className="object-cover"
                      priority={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>
                ))}
              </div>

              <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-1.5">
                {product.isHandmade && <Badge variant="handmade">✦ Handmade</Badge>}
                {product.originalPrice && (
                  <span className="inline-flex items-center rounded-pill bg-burgundy px-3 py-1 font-body text-xs font-semibold leading-4 text-white">
                    Sale
                  </span>
                )}
              </div>

              <Link
                href="/products"
                aria-label="Back to shop"
                className="focus-ring absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-pill bg-cream text-brown shadow-soft transition-transform duration-100 active:scale-90 lg:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>

              {product.images.length > 1 && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                  {product.images.map((_, i) => (
                    <span key={i} className={`h-2 w-2 rounded-pill ${i === activeImg ? "bg-brown" : "bg-brown/25"}`} />
                  ))}
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="no-scrollbar flex gap-3 overflow-x-auto py-4">
                {product.images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => goToImage(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={activeImg === i ? "true" : undefined}
                    className={`focus-ring relative h-16 w-16 shrink-0 overflow-hidden rounded-tile border-2 bg-peach/40 transition-colors duration-150 sm:h-20 sm:w-20
                                ${activeImg === i ? "border-brown" : "border-transparent"}`}
                    style={{ touchAction: "manipulation" }}
                  >
                    <Image src={img} alt="" fill sizes="80px" loading="lazy" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="pb-4 pt-2 lg:pt-0">
            <p className="type-eyebrow text-burgundy">{product.category.replace(/-/g, " ")}</p>
            <h1 className="type-h1 mt-2 text-brown">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-body text-2xl font-semibold leading-8 text-brown">{formatAmount(displayPrice)}</span>
              {product.originalPrice && displayPrice === product.price && (
                <>
                  <span className="font-body text-base text-stone line-through">
                    <span className="sr-only">Was </span>{formatAmount(product.originalPrice)}
                  </span>
                  <span className="type-small font-semibold text-burgundy">
                    Save {formatAmount(product.originalPrice - product.price)}
                  </span>
                </>
              )}
              {isOutOfStock && <Badge variant="soldOut">Out of stock</Badge>}
              {!isOutOfStock && hasVariants && variantStock <= 3 && (
                <Badge variant="lowStock">Only {variantStock} left</Badge>
              )}
            </div>

            {/* Intro: the untitled first block of the description, clamped to
                three lines with a Read more/less toggle (same as Featured Pieces). */}
            {introSection && (
              <div className="mt-4">
                <p className={`type-body text-stone ${descExpanded ? "" : "line-clamp-4"}`}>
                  {introSection.lines.join(" ")}
                </p>
                <button
                  type="button"
                  onClick={() => setDescExpanded((o) => !o)}
                  aria-expanded={descExpanded}
                  className="focus-ring mt-1 min-h-11 rounded-small type-small font-semibold text-burgundy hover:text-burgundy-dark"
                >
                  {descExpanded ? "Read less ▴" : "Read more ▾"}
                </button>
              </div>
            )}

            {product.colors.length > 0 && (
              <SizeSelector
                className="mt-5"
                legend="Colour"
                value={selectedColor}
                onChange={handleColorSelect}
                options={product.colors.map((c) => {
                  const cStock = product.sizes.length > 0
                    ? product.sizes.reduce((sum, sz) => sum + (product.variantStock[`${c}|${sz}`] ?? 0), 0)
                    : (product.variantStock[c] ?? 0);
                  return { value: c, disabled: cStock === 0 };
                })}
              />
            )}

            {product.sizes.length > 0 && (
              <SizeSelector
                className="mt-5"
                legend="Size"
                value={selectedSize}
                onChange={handleSizeSelect}
                options={product.sizes.map((sz) => {
                  const sStock = product.colors.length > 0
                    ? (product.variantStock[`${selectedColor}|${sz}`] ?? 0)
                    : (product.variantStock[sz] ?? 0);
                  return { value: sz, disabled: sStock === 0 };
                })}
              />
            )}

            {/* Trust tiles: real, site-wide claims, not per-product fabrication */}
            <ul className="mt-6 grid grid-cols-3 gap-3">
              {trustPoints.map(({ label, description, icon }) => (
                <li key={label} className="rounded-tile bg-peach p-3 text-brown">
                  <span className="text-burgundy" aria-hidden="true">{icon}</span>
                  <p className="mt-1.5 type-small font-semibold leading-5">{label}</p>
                  <p className="type-caption mt-0.5">{description}</p>
                </li>
              ))}
            </ul>

            {/* Desktop quantity + add (phones use the sticky bar below) */}
            <div className="mt-6 hidden items-center gap-4 lg:flex">
              {stepper}
              <Button onClick={handleAdd} disabled={isOutOfStock} className="flex-1">
                {addLabel}
              </Button>
            </div>
            {hasVariants && !isOutOfStock && (
              <p className="mt-2 hidden type-small text-stone lg:block">{variantStock} in stock</p>
            )}

            {accordionItems.length > 0 && <Accordion className="mt-6" items={accordionItems} />}

            {/* Buyer confidence note: real support channel, not fabricated policy */}
            <p className="type-small mt-5 text-stone">
              Not sure which size or colour is right?{" "}
              <a href="mailto:mahhir09@gmail.com" className="focus-ring rounded-small font-semibold text-burgundy underline underline-offset-2 hover:text-burgundy-dark">
                Email us
              </a>. Every piece is made to order, and we&apos;re happy to help you choose.
            </p>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12 lg:mt-20">
            <SectionHeader
              eyebrow="Handmade"
              title="You might also love"
              id="related-heading"
              seeAllHref="/products"
              className="mb-6"
            />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {related.map((p) => (
                <li key={p.id}><ProductCard product={p} /></li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Mobile sticky buy bar: quantity + Add to bag · price */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-cream px-4 pt-3 lg:hidden"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {stepper}
          <Button onClick={handleAdd} disabled={isOutOfStock} className="min-w-0 flex-1 px-4">
            {addLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
