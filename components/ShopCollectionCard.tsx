import Link from "next/link";

/**
 * The primary hero CTA on mobile.
 *
 * A light rounded chip, not a saturated burgundy slab: the same quiet treatment
 * as the "Built by Maheer" credit at the foot of the page (.credit-chip in
 * globals.css) — white surface, thin gold border, gold rule of a hairline — so
 * it sits on the milk hero panel without stamping a heavy block onto it.
 *
 * What keeps it reading as a button rather than as content, which the earlier
 * transparent version did not: it's a raised white surface against the milk
 * panel rather than a transparent one, it carries a shadow, it holds a single
 * line of action text with an arrow pointing out of it, and it moves the
 * instant you touch it.
 *
 * The bag mark echoes the navbar's "Shop Now" glyph (Navbar.tsx) — same S mark,
 * so the two entry points to /products carry the same sign. Hand-built SVG
 * rather than an asset so the colours come from theme tokens and it stays crisp
 * at any density.
 */
export default function ShopCollectionCard() {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Motion is 150ms and hover/press-driven throughout. The sheen used to
          run on an infinite 5.5s loop, which is the exact shimmer a skeleton
          placeholder uses — a button that sweeps forever reads as content still
          loading. Tied to interaction, and fast, it means the opposite: the
          button answers you. */}
      <Link
        href="/products"
        style={{ touchAction: "manipulation" }}
        className="group relative flex w-full items-center justify-center gap-2.5
                   overflow-hidden rounded-2xl border border-terracotta/35 bg-cream
                   px-6 h-14 text-center
                   shadow-[0_8px_20px_-12px_rgba(26,8,16,0.35)]
                   hover:border-terracotta/75 hover:bg-terracotta-light/45
                   hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-14px_rgba(26,8,16,0.45)]
                   active:translate-y-0 active:scale-[0.98]
                   active:border-terracotta/75 active:bg-terracotta-light/45
                   active:shadow-[0_4px_10px_-8px_rgba(26,8,16,0.4)]
                   transition-all duration-150 ease-out
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-terracotta focus-visible:ring-offset-cream-dark"
      >
        {/* Sheen sweep — gold-tinted, because a white highlight is invisible
            crossing a white surface. Parked off the left edge at rest; it only
            travels on hover or press. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 -translate-x-full -skew-x-12
                     bg-gradient-to-r from-transparent via-terracotta/30 to-transparent
                     transition-transform duration-500 ease-out
                     group-hover:translate-x-[500%] group-active:translate-x-[500%]"
        />

        {/* The navbar's Shop Now glyph, identical path (see Navbar.tsx). The S
            is a <text> here rather than the navbar's overlaid <span>, which
            keeps the whole thing one scalable element instead of two boxes that
            have to be kept aligned. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="relative w-5 h-5 shrink-0
                     transition-transform duration-150 ease-out
                     group-hover:-translate-y-0.5 group-hover:scale-105
                     group-active:scale-95"
        >
          <path
            fill="var(--color-terracotta)"
            d="M7.5 5.25a4.5 4.5 0 119 0V6h1.628a2.25 2.25 0 012.244 2.077l.807 10.5A2.25 2.25 0 0118.933 21H5.067a2.25 2.25 0 01-2.246-2.423l.807-10.5A2.25 2.25 0 015.872 6H7.5v-.75zM9 6h6v-.75a3 3 0 10-6 0V6zm-.75 3.75a.75.75 0 011.5 0 2.25 2.25 0 004.5 0 .75.75 0 011.5 0 3.75 3.75 0 01-7.5 0z"
          />
          <text
            x="12"
            y="17.5"
            textAnchor="middle"
            fill="var(--color-cream)"
            fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
            fontSize="7.5"
            fontWeight="700"
          >
            S
          </text>
        </svg>

        {/* Caps via CSS, so the link's accessible name stays sentence case. */}
        <span className="relative block font-body font-bold text-sm uppercase
                         tracking-[0.14em] leading-none text-brown
                         transition-colors duration-150 group-hover:text-deep-brown">
          Shop the Collection
        </span>

        {/* Arrow — points out of the chip, so it reads as somewhere you go
            rather than something you look at. */}
        <span
          aria-hidden="true"
          className="relative text-terracotta-dark leading-none
                     transition-transform duration-150 ease-out
                     group-hover:translate-x-1 group-active:translate-x-1"
        >
          →
        </span>
      </Link>

      <p className="font-body text-[10px] uppercase tracking-[0.16em] text-deep-brown/40">
        Every piece handmade in Ireland
      </p>
    </div>
  );
}
