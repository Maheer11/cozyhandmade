"use client";

import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import {
  FeaturedPieceCard,
  itemHref,
  type FeaturedPieceCardData,
} from "@/components/FeaturedPiecesSection";

/**
 * Hero product display, built from whatever the shop owner has toggled
 * `show_on_homepage` on — across BOTH the products and featured_pieces
 * catalogues. app/page.tsx normalises the two table shapes into one list and
 * tags each entry with `source`, which is what decides its detail route.
 *
 * Two presentations, because the same composition cannot serve both:
 *
 * - Below lg: the swipeable FeaturedPieceCard rail. A phone has no room for a
 *   multi-tile composition without dropping cards under ~120px.
 *
 * - lg and up: one tall spotlight piece beside a grid of thumbnails. This
 *   replaced a bento grid whose cells decided their own aspect ratios from
 *   leftover column height (0.94 / 0.46 / 1.94) while the photography is
 *   portrait (0.46-0.81). The spotlight is object-contain — zero cropping —
 *   with its caption overlaid on the stage rather than given its own panel,
 *   so the leftover letterbox space (confirmed by pixel sampling: flat,
 *   zero-variance background colour, not photo content) does double duty as
 *   the caption's backdrop instead of sitting empty. The thumbnails stay
 *   object-cover at roughly 3:4 — the native ratio of the product photography
 *   — so their crop is negligible regardless.
 */

/**
 * The thumbnail count is now the owner's to choose (no cap either end), so the
 * split between spotlight and thumbs has to be derived rather than hardcoded.
 *
 * The governing constraint, unchanged from when this was fixed at two thumbs:
 * a thumbnail cell must never go landscape. Stacking more rows into a
 * fixed-height column of fixed width is exactly what does that — three cells
 * in the old 40%-wide column land at ~1.25 (wider than tall) and start
 * cropping portrait shots down their middle.
 *
 * The panel these live in is roughly square (about 58vw × 88vh on a laptop),
 * so for a thumb area occupying fraction `t` of the panel width, laid out in
 * `c` columns × `r` rows of stretched cells, each cell's aspect ratio is
 * approximately `t × r / c`. Solving that for ~0.8 (a hair wider than 3:4)
 * gives the table below: more thumbs in one column means a NARROWER column,
 * not a taller stack, and past six the second column earns its place.
 *
 * `share` is the flex ratio of thumbs-area : spotlight. Both are literal class
 * strings — Tailwind only generates what it can see in the source, so these
 * can't be built by interpolation.
 */
const THUMB_LAYOUTS: Record<number, { cols: number; thumbFlex: string; spotFlex: string }> = {
  // t≈0.4, 2 rows → 0.8. The original, known-good pair.
  2: { cols: 1, thumbFlex: "flex-2", spotFlex: "flex-3" },
  // t≈0.25, 3 rows → 0.75.
  3: { cols: 1, thumbFlex: "flex-1", spotFlex: "flex-3" },
  // t≈0.2, 4 rows → 0.8.
  4: { cols: 1, thumbFlex: "flex-1", spotFlex: "flex-4" },
  // Two columns from here. t≈0.5, 3 rows → 0.83. Six fills it exactly; five
  // leaves one empty cell, which reads as deliberate spacing rather than a gap.
  5: { cols: 2, thumbFlex: "flex-1", spotFlex: "flex-1" },
  6: { cols: 2, thumbFlex: "flex-1", spotFlex: "flex-1" },
  // t≈0.4, 4 rows → 0.8.
  7: { cols: 2, thumbFlex: "flex-2", spotFlex: "flex-3" },
  8: { cols: 2, thumbFlex: "flex-2", spotFlex: "flex-3" },
};

// A single thumb keeps the original 40% column but does NOT stretch into it:
// one stretched cell in a full-height column is a ~0.4 skyscraper, as far from
// 3:4 in the other direction as a landscape squash is. It sits at its own
// ratio, centred, with the spotlight taking the rest.
const ONE_THUMB_LAYOUT = { cols: 1, thumbFlex: "flex-2", spotFlex: "flex-3" };

// Past eight, stretching to fit would finally start squashing cells, so the
// grid switches to fixed 3:4 cells and scrolls instead — the ratio is held by
// construction and the extra pieces stay reachable. This is a lot of hero for
// one page; the admin count summary is there to nudge toward fewer.
const OVERFLOW_LAYOUT = { cols: 2, thumbFlex: "flex-2", spotFlex: "flex-3" };

export default function HeroTiles({ items }: { items: FeaturedPieceCardData[] }) {
  const { formatAmount } = useCurrency();

  if (items.length === 0) return null;

  // Curation is the admin toggle's job now. This used to force the "Ivory
  // Moses Basket" into the spotlight by name-matching the list, because there
  // was no other way to choose it; the owner picks directly today, so the
  // spotlight is simply the first item in the order app/page.tsx returns
  // (Featured Pieces by display_order, then products by created_at).
  const [spotlight, ...thumbs] = items;

  const stretched = THUMB_LAYOUTS[thumbs.length];
  const layout = stretched ?? (thumbs.length === 1 ? ONE_THUMB_LAYOUT : OVERFLOW_LAYOUT);
  // Cells fill the column height in the tuned cases; the 1-thumb and 9+ cases
  // instead pin each cell to 3:4 and let the column hold or scroll them, since
  // neither can stretch to fill without going out of ratio.
  const fixedAspect = !stretched;
  const rows = Math.ceil(thumbs.length / layout.cols);

  // Captions live on a plain panel below the photo, matching FeaturedPieceCard —
  // brown/taupe read reliably on white, where the earlier terracotta-on-dark-
  // scrim styling doesn't apply anymore.
  const Price = ({ item, big }: { item: FeaturedPieceCardData; big?: boolean }) =>
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
          The same snap-scroll cards the Featured Pieces section uses — 68vw each,
          with the next card peeking so the row reads as swipeable. No cap here
          and there never was one; the cards read `source` themselves, so a
          product and a featured piece sitting side by side each link to their
          own detail route. */}
      <div className="lg:hidden bg-cream-dark pt-3">
        <div className="px-4 mb-2.5 flex items-center justify-between gap-3">
          {/* Header card — a rectangle sized to the title, not a full-width
              banner: this sits above the fold on a phone, so it stays as
              short as the text it holds. Two motion layers, each on its own
              element so neither fights the other's transform — a glow
              drifting behind the text and a sheen crossing the box.
              globals.css's prefers-reduced-motion block flattens both. */}
          <div className="relative overflow-hidden shrink-0 px-3.5 py-1.5
                          border border-gold/30
                          shadow-[0_10px_22px_-16px_rgba(26,8,16,0.55)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-6 w-24 h-24 rounded-full
                         bg-gold/20 blur-2xl animate-glow-drift"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3
                         bg-gradient-to-r from-transparent via-white/70 to-transparent
                         animate-card-sheen"
            />
            {/* Small caps, not a display heading: at this size the serif
                font-heading turns mushy, so this switches to font-body with
                wide letter-spacing — the same eyebrow treatment the rest of
                the site uses for "✦ Handcrafted in Ireland" and "Join the
                Circle". Uppercase via CSS so the accessible name stays
                "Featured Pieces" for screen readers. */}
            <h2 className="relative font-body text-[10px] font-semibold uppercase tracking-[0.28em]
                           text-shimmer animate-shimmer">
              Featured Pieces
            </h2>
          </div>

          <Link
            href="/featured-pieces"
            className="group inline-flex items-center gap-1.5 text-xs font-body font-semibold text-gold"
          >
            See all
            <span aria-hidden="true" className="inline-block animate-swipe-nudge">→</span>
          </Link>
        </div>
        <div
          className="flex items-stretch gap-4 overflow-x-auto px-4 pb-3
                     snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <FeaturedPieceCard key={`${item.source ?? "featured_piece"}-${item.id}`} item={item} variant="rail" />
          ))}
        </div>
      </div>

      {/* ── Desktop: tall spotlight beside a grid of thumbs ──
          The frame is portrait because the photography is. A wide frame left
          a 0.46 photo occupying 28% of its width with blurred filler either
          side; portrait puts it at ~82%. The thumbs beside it land near 3:4,
          the native ratio of these shots, so they fill edge to edge with
          nothing trimmed — see THUMB_LAYOUTS for how that holds as the count
          changes. */}
      <div className="hidden lg:flex gap-3 w-full h-full bg-cream-dark p-3">
        <Link
          href={itemHref(spotlight)}
          className={`hero-tile group relative min-w-0 flex flex-col overflow-hidden rounded-2xl
                     bg-white ring-1 ring-cream-darker hover:ring-gold/50
                     shadow-[0_18px_40px_-22px_rgba(26,8,16,0.35)] hover:shadow-[0_22px_46px_-20px_rgba(26,8,16,0.5)]
                     transition-[box-shadow,ring-color] duration-300
                     ${thumbs.length === 0 ? "w-full" : layout.spotFlex}`}
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
              product photo would be letterboxed left/right instead).

              This is also why a lone toggled-on item doesn't break: at full
              panel width object-contain letterboxes it sideways instead of
              blowing it up or cropping it, and the caption scrim sits on the
              stage either way. */}
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
          <div
            className={`${layout.thumbFlex} min-w-0 ${
              fixedAspect
                // One thumb sits centred at its own ratio rather than stretching
                // into a skyscraper; nine or more scroll past the panel edge.
                ? "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-center"
                : ""
            }`}
          >
            <div
              className={`grid gap-3 ${fixedAspect ? "" : "h-full"}`}
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                ...(fixedAspect ? {} : { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }),
              }}
            >
              {/* rounded-2xl, matching the spotlight and the text card — a
                  smaller radius here read as an inconsistency once all three
                  sat in the same view. */}
              {thumbs.map((item, i) => (
                <Link
                  key={`${item.source ?? "featured_piece"}-${item.id}`}
                  href={itemHref(item)}
                  style={{ animationDelay: `${(i + 1) * 120}ms` }}
                  className="hero-tile group relative min-h-0 flex flex-col overflow-hidden rounded-2xl
                             bg-white ring-1 ring-cream-darker hover:ring-gold/50
                             shadow-[0_12px_28px_-18px_rgba(26,8,16,0.3)] hover:shadow-[0_16px_32px_-16px_rgba(26,8,16,0.4)]
                             transition-[box-shadow,ring-color] duration-300"
                >
                  {/* 3:4 is the native ratio of these product shots, so
                      object-cover has almost nothing left to trim — whether the
                      cell gets that ratio by stretching to a tuned row/column
                      count or by declaring it outright. */}
                  <div
                    className={`relative min-h-0 bg-cream-dark overflow-hidden ${
                      fixedAspect ? "w-full aspect-[3/4]" : "flex-1"
                    }`}
                  >
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
          </div>
        )}
      </div>
    </>
  );
}
