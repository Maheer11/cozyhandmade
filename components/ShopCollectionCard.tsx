import Link from "next/link";

/**
 * The primary hero CTA: a centred card with a triangular bag mark above the
 * label, the whole surface being the link target.
 *
 * The bag echoes the navbar's "Shop Now" glyph (Navbar.tsx) — same S mark, so
 * the two read as the same action — but inverted: where the navbar uses a
 * small filled silhouette, this is a large open outline, which is what lets
 * it sit transparent on the milk panel instead of stamping a solid shape
 * onto it. Hand-built SVG rather than an asset so the stroke colour comes
 * from the theme token and stays crisp at any density.
 */
export default function ShopCollectionCard() {
  return (
    <Link
      href="/products"
      style={{ touchAction: "manipulation" }}
      className="shop-cta group relative flex flex-col items-center justify-center gap-1.5
                 overflow-hidden rounded-none border border-gold/35 bg-transparent
                 px-5 py-3.5 text-center
                 shadow-[0_10px_24px_-18px_rgba(139,32,53,0.6)]
                 hover:border-gold hover:bg-gold/8 hover:-translate-y-0.5
                 hover:shadow-[0_18px_34px_-18px_rgba(139,32,53,0.75)]
                 active:translate-y-0 active:scale-[0.98]
                 active:shadow-[0_6px_14px_-12px_rgba(139,32,53,0.7)]
                 transition-all duration-300 ease-out
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                 focus-visible:ring-gold focus-visible:ring-offset-cream-dark"
    >
      {/* Sheen — reuses the Featured Pieces header sweep so the two read as
          one family. White, not burgundy: the card is transparent over the
          milk panel, so the highlight has to be lighter than what it crosses. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3
                   bg-gradient-to-r from-transparent via-white/70 to-transparent
                   animate-card-sheen"
      />
      {/* Burgundy wash rising from the bottom edge on hover — gives the fill a
          direction instead of the whole panel flatly changing tone. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0
                   bg-gradient-to-t from-gold/15 to-transparent
                   transition-all duration-300 ease-out group-hover:h-full"
      />

      {/* The navbar's Shop Now glyph, identical path (see Navbar.tsx) so the
          two entry points to /products carry the same mark. The S is a <text>
          here rather than the navbar's overlaid <span>, which keeps the whole
          thing one scalable element instead of two boxes that have to be kept
          aligned. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="relative w-11 h-11 shrink-0
                   transition-transform duration-300 ease-out
                   group-hover:-translate-y-0.5 group-hover:scale-105"
      >
        <path
          fill="var(--color-gold)"
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
      <span className="relative block font-body font-bold text-base uppercase
                       tracking-[0.14em] leading-tight text-gold">
        Shop the Collection
      </span>
      <span className="relative block font-body text-[9px] uppercase tracking-[0.16em] text-gold/60">
        Every piece handmade in Ireland
      </span>
    </Link>
  );
}
