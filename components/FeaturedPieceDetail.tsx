"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import type { FeaturedPieceCardData } from "./FeaturedPiecesSection";
import { parseDescription } from "@/lib/parse-featured-piece-description";
import Accordion, { type AccordionItem } from "@/components/ui/Accordion";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import QuantityStepper from "@/components/ui/QuantityStepper";
import SizeSelector from "@/components/ui/SizeSelector";
import {
  featuredPieceMaxQuantity,
  isFeaturedPieceSoldOut,
  type EmbeddedProductStock,
} from "@/lib/featured-piece-stock";

export interface FeaturedPieceDetailData extends FeaturedPieceCardData {
  colors: string[];
  sizes: string[];
  description: string;
  variant_price: Record<string, number>;
  // Stock source — this page reads the LINKED PRODUCT's stock, since migration
  // 013 left featured_pieces with no counter of its own. `sold_out` on the
  // card data above is now only the manual override half of the answer;
  // isFeaturedPieceSoldOut() combines the two.
  product_id: string | null;
  products: EmbeddedProductStock;
}

export default function FeaturedPieceDetail({ item }: { item: FeaturedPieceDetailData }) {
  const { addItem, openCart } = useCart();
  const { formatAmount } = useCurrency();

  const [activeImg, setActiveImg]   = useState(0);
  const [quantity, setQuantity]     = useState(1);
  const [added, setAdded]           = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(item.colors[0] ?? null);
  const [selectedSize, setSelectedSize]   = useState<string | null>(item.sizes[0] ?? null);
  const [descExpanded, setDescExpanded]   = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const descSections = useMemo(() => parseDescription(item.description ?? ""), [item.description]);
  const introSection = descSections.find((s) => s.heading === null) ?? null;
  const namedSections = useMemo(() => descSections.filter((s) => s.heading !== null), [descSections]);

  // Swipeable gallery: native scroll-snap swipes; these keep thumbnails and dots in step.
  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activeImg && i >= 0 && i < images.length) setActiveImg(i);
  };
  const goToImage = (i: number) => {
    setActiveImg(i);
    const el = galleryRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const images = [item.product_image, ...(item.lifestyle_image ? [item.lifestyle_image] : [])];
  // Per-tier price (e.g. size "With Stand") wins when set; otherwise falls
  // back to the item's base discount_price/price — same pattern as the
  // regular products' variantPrice.
  const displayPrice = (selectedSize && item.variant_price[selectedSize] !== undefined)
    ? item.variant_price[selectedSize]
    : (item.discount_price ?? item.price);
  // Availability = the manual sold_out override OR the linked product being
  // empty (or missing entirely). Same rule the storefront cards, the admin
  // list and checkout_verified_order() all apply — see
  // lib/featured-piece-stock.ts.
  const isOutOfStock = isFeaturedPieceSoldOut(item);
  const maxQty = featuredPieceMaxQuantity(item);

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
        source: "featured_piece", // new code always writes the new value; comparisons elsewhere still accept legacy "new_in"
        variant: selectedSize ?? undefined,
        color: selectedColor ?? undefined,
        maxQuantity: maxQty,
        shippingWeightGrams: item.shipping_weight_grams,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    openCart();
  };

  const accordionItems: AccordionItem[] = namedSections.map((section, i) => ({
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
  }));

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
      <nav aria-label="Breadcrumb" className="page-container py-4">
        <ol className="flex flex-wrap items-center gap-x-2 type-small text-stone">
          <li><Link href="/" className="focus-ring rounded-small py-2 hover:text-burgundy">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/featured-pieces" className="focus-ring rounded-small py-2 hover:text-burgundy">Featured Pieces</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-[12rem] truncate font-medium text-brown sm:max-w-none">{item.name}</li>
        </ol>
      </nav>

      <div className="page-container lg:pb-12">
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-card bg-peach/40">
              <div
                ref={galleryRef}
                onScroll={onGalleryScroll}
                className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                role="group"
                aria-roledescription="carousel"
                aria-label={`${item.name} photos`}
              >
                {images.map((img, i) => (
                  <div key={img + i} className="relative aspect-[4/5] w-full shrink-0 snap-center sm:aspect-square">
                    <Image
                      src={img}
                      alt={i === 0 ? item.name : `${item.name}, photo ${i + 1}`}
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
                {item.is_handmade && <Badge variant="handmade">✦ Handmade</Badge>}
                {isOutOfStock && <Badge variant="soldOut">Sold out</Badge>}
              </div>
              <Link
                href="/featured-pieces"
                aria-label="Back to featured pieces"
                className="focus-ring absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-pill bg-cream text-brown shadow-soft transition-transform duration-100 active:scale-90 lg:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              {images.length > 1 && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <span key={i} className={`h-2 w-2 rounded-pill ${i === activeImg ? "bg-brown" : "bg-brown/25"}`} />
                  ))}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar flex gap-3 overflow-x-auto py-4">
                {images.map((img, i) => (
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

          <div className="pb-4 pt-2 lg:pt-0">
            <p className="type-eyebrow text-burgundy">✦ Just Landed</p>
            <h1 className="type-h1 mt-2 text-brown">{item.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {selectedSize && item.variant_price[selectedSize] !== undefined ? (
                // A selected size/tier has its own price: show it alone, no
                // strikethrough (tiers are configurations, not discounts).
                <span className="font-body text-2xl font-semibold leading-8 text-brown">{formatAmount(displayPrice)}</span>
              ) : item.discount_price ? (
                <>
                  <span className="font-body text-2xl font-semibold leading-8 text-brown">{formatAmount(item.discount_price)}</span>
                  <span className="font-body text-base text-stone line-through">
                    <span className="sr-only">Was </span>{formatAmount(item.price)}
                  </span>
                </>
              ) : (
                <span className="font-body text-2xl font-semibold leading-8 text-brown">{formatAmount(item.price)}</span>
              )}
              {isOutOfStock && <Badge variant="soldOut">Out of stock</Badge>}
              {!isOutOfStock && maxQty <= 3 && <Badge variant="lowStock">Only {maxQty} left</Badge>}
            </div>

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

            {item.colors.length > 0 && (
              <SizeSelector
                className="mt-5"
                legend="Colour"
                value={selectedColor}
                onChange={setSelectedColor}
                options={item.colors.map((c) => ({ value: c }))}
              />
            )}
            {item.sizes.length > 0 && (
              <SizeSelector
                className="mt-5"
                legend="Size"
                value={selectedSize}
                onChange={setSelectedSize}
                options={item.sizes.map((sz) => ({ value: sz }))}
              />
            )}

            <div className="mt-6 hidden items-center gap-4 lg:flex">
              {stepper}
              <Button onClick={handleAdd} disabled={isOutOfStock} className="flex-1">
                {addLabel}
              </Button>
            </div>

            {accordionItems.length > 0 && <Accordion className="mt-6" items={accordionItems} />}

            <p className="type-small mt-5 text-stone">
              Not sure which size or colour is right?{" "}
              <a href="mailto:mahhir09@gmail.com" className="focus-ring rounded-small font-semibold text-burgundy underline underline-offset-2 hover:text-burgundy-dark">
                Email us
              </a>. Every piece is made to order, and we&apos;re happy to help you choose.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky buy bar */}
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
