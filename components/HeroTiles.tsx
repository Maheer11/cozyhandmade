"use client";

import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { NewInCard, type NewInCardData } from "@/components/NewInSection";

/**
 * Hero product display, built from live New In stock.
 *
 * Two presentations, because the same composition cannot serve both:
 *
 * - Below lg: the swipeable NewInCard rail. A phone has no room for a
 *   multi-tile composition without dropping cards under ~120px.
 *
 * - lg and up: one tall spotlight piece beside a stacked pair. This
 *   replaced a bento grid whose cells decided their own aspect ratios from
 *   leftover column height (0.94 / 0.46 / 1.94) while the photography is
 *   portrait (0.46-0.81). The spotlight is object-contain — zero cropping —
 *   with its caption overlaid on the stage rather than given its own panel,
 *   so the leftover letterbox space (confirmed by pixel sampling: flat,
 *   zero-variance background colour, not photo content) does double duty as
 *   the caption's backdrop instead of sitting empty. The thumbnails stay
 *   object-cover at 3:4 — the native ratio of the product photography — so
 *   their crop is negligible regardless.
 */
export default function HeroTiles({ items }: { items: NewInCardData[] }) {
  const { formatAmount } = useCurrency();

  if (items.length === 0) return null;

  // Manual curation: the Ivory Moses Basket is the spotlight, whatever position
  // it happens to occupy in New In's chronological display_order. This only
  // reorders the desktop spotlight/thumb selection below — the mobile rail
  // still shows items in the admin's actual order. If the piece sells through
  // and drops out of New In, the match fails silently and the layout falls
  // back to natural order rather than breaking.
  const ivoryIdx = items.findIndex((i) => /ivory/i.test(i.name));
  const heroOrder = ivoryIdx > 0 ? [...items] : items;
  if (ivoryIdx > 0) [heroOrder[0], heroOrder[ivoryIdx]] = [heroOrder[ivoryIdx], heroOrder[0]];

  const [spotlight, ...rest] = heroOrder;
  // Two, not three: stacked in a 40%-wide column the pair lands at ~3:4, the
  // photography's own ratio. A third would squash each cell to landscape and
  // start cropping portrait shots again.
  const thumbs = rest.slice(0, 2);

  // Captions live on a plain panel below the photo, matching NewInCard —
  // brown/taupe read reliably on white, where the earlier terracotta-on-dark-
  // scrim styling doesn't apply anymore.
  const Price = ({ item, big }: { item: NewInCardData; big?: boolean }) =>
    item.discount_price ? (
      <span className="flex items-baseline gap-2">
        <span className={`font-body font-semibold text-brown ${big ? "text-base" : "text-xs"}`}>
          {formatAmount(item.discount_price)}
        </span>
        <span className={`font-body text-taupe-dark line-through ${big ? "text-sm" : "text-[10px]"}`}>
          {formatAmount(item.price)}
        </span>
      </span>
    ) : (
      <span className={`font-body font-semibold text-brown ${big ? "text-base" : "text-xs"}`}>
        {formatAmount(item.price)}
      </span>
    );

  return (
    <>
      {/* ── Mobile: swipeable rail ──────────────────────────────
          The same snap-scroll cards the New In section uses — 68vw each,
          with the next card peeking so the row reads as swipeable. */}
      <div className="lg:hidden bg-cream-dark pt-3">
        <div className="px-4 flex items-baseline justify-between mb-2.5">
          <h2 className="font-heading text-xl text-deep-brown">New In</h2>
          <Link
            href="/new-in"
            className="group inline-flex items-center gap-1.5 text-xs font-body font-semibold text-gold"
          >
            See all
            <span className="transition-transform duration-300 group-active:translate-x-1">→</span>
          </Link>
        </div>
        <div
          className="flex items-stretch gap-4 overflow-x-auto px-4 pb-3
                     snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <NewInCard key={item.id} item={item} variant="rail" />
          ))}
        </div>
      </div>

      {/* ── Desktop: tall spotlight beside a stacked pair ──
          The frame is portrait because the photography is. A wide frame left
          a 0.46 photo occupying 28% of its width with blurred filler either
          side; portrait puts it at ~82%. The pair beside it lands at almost
          exactly 3:4, the native ratio of these shots, so they fill edge to
          edge with nothing trimmed. */}
      <div className="hidden lg:flex gap-3 w-full h-full bg-cream-dark p-3">
        <Link
          href={`/new-in/${spotlight.id}`}
          className="hero-tile group relative flex-3 min-w-0 flex flex-col overflow-hidden rounded-2xl
                     bg-white ring-1 ring-cream-darker hover:ring-gold/50
                     shadow-[0_18px_40px_-22px_rgba(26,8,16,0.35)] hover:shadow-[0_22px_46px_-20px_rgba(26,8,16,0.5)]
                     transition-[box-shadow,ring-color] duration-300"
        >
          {/* object-contain again: cover's crop was the tradeoff for filling
              the frame, but the better fix is to put the caption where the
              empty space already is, rather than spend width cropping the
              photo to avoid it. Back to zero cropping, with the caption
              overlaid on the stage instead of living in its own panel below
              — so there's no dead space AND no crop. The white-to-transparent
              scrim behind it works whether that bottom strip happens to be
              empty letterbox or actual photo, since it's not relying on the
              letterbox position specifically (that varies per photo's own
              aspect ratio — this one is letterboxed top/bottom, a narrower
              product photo would be letterboxed left/right instead). */}
          <div className="relative flex-1 min-h-0 bg-cream-dark overflow-hidden">
            <Image
              src={spotlight.product_image}
              alt={spotlight.name}
              fill
              sizes="50vw"
              loading="eager"
              fetchPriority="high"
              className="object-contain"
            />
            {spotlight.lifestyle_image && (
              <Image
                src={spotlight.lifestyle_image}
                alt=""
                aria-hidden
                fill
                sizes="50vw"
                className="object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
            )}

            {spotlight.sold_out && (
              <span className="absolute top-4 left-4 rounded-full bg-deep-brown/85 backdrop-blur-sm
                               px-3 py-1 text-[11px] font-body font-semibold text-cream tracking-wide">
                Sold out
              </span>
            )}

            {/* Caption overlay — scrim fades up from solid white at the very
                bottom edge to transparent, so it reads clearly over either a
                plain letterbox strip or real photo detail underneath. */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-5 py-4">
              <p className="font-heading text-deep-brown text-xl leading-tight line-clamp-1">
                {spotlight.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Price item={spotlight} big />
                <span
                  className="text-transparent group-hover:text-gold text-sm
                             transition-all duration-300 group-hover:translate-x-0.5"
                  aria-hidden
                >
                  →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {thumbs.length > 0 && (
          <div className="flex-2 min-w-0 flex flex-col gap-3">
            {/* rounded-2xl, matching the spotlight and the text card — a
                smaller radius here read as an inconsistency once all three
                sat in the same view. */}
            {thumbs.map((item, i) => (
              <Link
                key={item.id}
                href={`/new-in/${item.id}`}
                style={{ animationDelay: `${(i + 1) * 120}ms` }}
                className="hero-tile group relative flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl
                           bg-white ring-1 ring-cream-darker hover:ring-gold/50
                           shadow-[0_12px_28px_-18px_rgba(26,8,16,0.3)] hover:shadow-[0_16px_32px_-16px_rgba(26,8,16,0.4)]
                           transition-[box-shadow,ring-color] duration-300"
              >
                {/* 3:4 is the native ratio of these product shots, so
                    object-cover has almost nothing left to trim. */}
                <div className="relative flex-1 min-h-0 bg-cream-dark overflow-hidden">
                  <Image
                    src={item.product_image}
                    alt={item.name}
                    fill
                    sizes="17vw"
                    className="hero-tile-img object-cover"
                  />
                  {item.sold_out && (
                    <span className="absolute top-2 left-2 rounded-full bg-deep-brown/85 backdrop-blur-sm
                                     px-2 py-0.5 text-[10px] font-body font-semibold text-cream">
                      Sold out
                    </span>
                  )}
                </div>
                <div className="shrink-0 px-3 py-2.5">
                  <p className="font-heading text-deep-brown text-sm leading-tight line-clamp-1">
                    {item.name}
                  </p>
                  <div className="mt-0.5">
                    <Price item={item} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
