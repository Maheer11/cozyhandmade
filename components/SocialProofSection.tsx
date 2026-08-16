"use client";

import { useState } from "react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────
   TYPES
   Each review is a real screenshot a customer sent — no
   fabricated quotes or chat text. Managed from the admin
   dashboard (/admin/reviews), not hardcoded here — this
   component just renders whatever list it's given.
───────────────────────────────────────────────────────── */
export type Review = {
  screenshot: string;
  platform: "whatsapp" | "instagram";
  /** Optional — shown under the screenshot if provided */
  customerLabel?: string;
  location?: string;
  date?: string;
};

/* Reviews paginate automatically in rows of BATCH (default 3). */
const BATCH = 3;

/* ─────────────────────────────────────────────────────────
   HELPER: TINY PLATFORM STAMP
───────────────────────────────────────────────────────── */
function PlatformStamp({ platform }: { platform: Review["platform"] }) {
  if (platform === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#128C7E]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#C03D8A" }}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
      Instagram DM
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   SCREENSHOT CARD
   The real thing — a customer's actual message, pinned like
   a photo with a washi-tape corner, not a fabricated mockup.
   Click to view it larger.
───────────────────────────────────────────────────────── */
function ScreenshotCard({ review, tilt, onOpen }: { review: Review; tilt: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative h-full w-full text-left rounded-[26px] bg-cream border border-taupe/15
                 shadow-[0_8px_30px_rgba(61,43,31,0.10)]
                 hover:shadow-[0_16px_40px_rgba(139,32,53,0.16)]
                 hover:-translate-y-1.5
                 transition-all duration-300 ease-out overflow-hidden flex flex-col
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {/* Washi-tape corner accent */}
      <span
        className="absolute -top-2 left-8 w-16 h-6 rotate-[-4deg] rounded-sm z-10 opacity-80"
        style={{ background: "linear-gradient(135deg,#D4A76A,#C9A227)" }}
        aria-hidden="true"
      />

      <div className="relative flex-1 w-full m-3 mb-0 rounded-2xl overflow-hidden" style={{ minHeight: "260px" }}>
        <div className="absolute top-0 left-0 right-0 h-9 z-10 backdrop-blur-[7px] bg-white/15" />
        <Image
          src={review.screenshot}
          alt={review.customerLabel ? `Review from ${review.customerLabel} via ${review.platform}` : `Customer review via ${review.platform}`}
          fill
          sizes="(max-width: 768px) 78vw, (max-width: 1200px) 42vw, 320px"
          loading="lazy"
          className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-taupe-dark mt-0.5 truncate">
            {[review.customerLabel, review.location, review.date].filter(Boolean).join(" · ")}
          </p>
        </div>
        <PlatformStamp platform={review.platform} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   LIGHTBOX — full-size view on click, so the real message
   is actually easy to read instead of squinting at a thumb
───────────────────────────────────────────────────────── */
function Lightbox({ review, onClose }: { review: Review; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-deep-brown/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-cream rounded-[28px] overflow-hidden max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-deep-brown/50 backdrop-blur-sm
                     text-cream flex items-center justify-center hover:bg-deep-brown/70 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="relative w-full" style={{ aspectRatio: "9/14" }}>
          <Image
            src={review.screenshot}
            alt={review.customerLabel ? `Review from ${review.customerLabel} via ${review.platform}` : `Customer review via ${review.platform}`}
            fill
            sizes="480px"
            className="object-contain bg-black"
          />
        </div>
        <div className="p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-taupe-dark mt-0.5">
              {[review.customerLabel, review.location, review.date].filter(Boolean).join(" · ")}
            </p>
          </div>
          <PlatformStamp platform={review.platform} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────── */
export default function SocialProofSection({ reviews }: { reviews: Review[] }) {
  const [visibleRows, setVisibleRows] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (reviews.length === 0) return null;

  const totalRows  = Math.ceil(reviews.length / BATCH);
  const hasMore    = visibleRows < totalRows;
  const shownCount = Math.min(visibleRows * BATCH, reviews.length);
  const remaining  = reviews.length - shownCount;

  /* Slice reviews into batches, one per visible row */
  const batches = Array.from({ length: visibleRows }, (_, i) =>
    reviews.slice(i * BATCH, (i + 1) * BATCH)
  );

  /* Small alternating tilt for a scattered keepsake feel — deterministic, not random-per-render */
  const tiltFor = (i: number) => [-1.1, 0.8, -0.6][i % 3];

  return (
    <section
      className="relative overflow-hidden py-14 lg:py-28"
      style={{ backgroundColor: "#FBF0E4" }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-[0.07]"
             style={{ background: "radial-gradient(circle,#D4A76A,transparent)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-[0.06]"
             style={{ background: "radial-gradient(circle,#8B2035,transparent)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
            ✦ Real Reviews
          </p>
          <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown mb-4">
            Words from Our Community
          </h2>
          <p className="text-deep-brown/55 text-sm max-w-md mx-auto leading-relaxed font-medium">
            Real screenshots from real customers, shared via WhatsApp &amp; Instagram DMs
          </p>
        </div>

        {/* ── Review rows ── */}
        <div className="space-y-8 lg:space-y-10">
          {batches.map((batch, batchIdx) => (
            <div
              key={batchIdx}
              className="animate-fade-up
                         flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory
                         lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {batch.map((review, cardIdx) => {
                const globalIdx = batchIdx * BATCH + cardIdx;
                return (
                  <div
                    key={globalIdx}
                    className="shrink-0 w-[78vw] max-w-[320px] snap-center lg:w-auto lg:max-w-none
                               animate-fade-up"
                    style={{ animationDelay: `${cardIdx * 90}ms` }}
                  >
                    <ScreenshotCard
                      review={review}
                      tilt={tiltFor(globalIdx)}
                      onOpen={() => setLightboxIndex(globalIdx)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile scroll hint */}
        <p className="lg:hidden text-center text-[11px] mt-3 mb-1 text-deep-brown/40">
          ← swipe to see more →
        </p>

        {/* ── Pagination controls ── */}
        <div className="flex flex-col items-center gap-3 mt-10">

          {hasMore && (
            <button
              onClick={() => setVisibleRows(v => v + 1)}
              className="group flex items-center gap-3 px-8 py-3.5 rounded-none
                         bg-gold text-cream
                         hover:bg-gold-dark hover:-translate-y-0.5
                         transition-all duration-300
                         shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30"
            >
              <span className="text-xl tracking-[0.4em] leading-none group-hover:tracking-[0.5em] transition-all duration-300">
                ···
              </span>
              <span className="text-xs font-medium opacity-80">
                {remaining} more {remaining === 1 ? "review" : "reviews"}
              </span>
            </button>
          )}

          {visibleRows > 1 && (
            <button
              onClick={() => setVisibleRows(1)}
              className="text-[11px] text-deep-brown/40 hover:text-deep-brown/70 transition-colors duration-200 tracking-wide"
            >
              ↑ Show less
            </button>
          )}

          {/* Review counter */}
          <p className="text-[11px] text-deep-brown/35 tracking-wide">
            Showing {shownCount} of {reviews.length} reviews
          </p>
        </div>

        {/* ── Trust note ── */}
        <p className="text-center text-[11px] text-deep-brown/35 mt-6 tracking-wide">
          ✦ All reviews are real screenshots shared with customer permission &nbsp;·&nbsp; Usernames blurred for privacy
        </p>

      </div>

      {lightboxIndex !== null && (
        <Lightbox review={reviews[lightboxIndex]} onClose={() => setLightboxIndex(null)} />
      )}
    </section>
  );
}
