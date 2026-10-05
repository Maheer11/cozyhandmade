import Link from "next/link";
import { whatsappLink } from "@/lib/social-links";

/**
 * Phone-only one-line trust strip. Replaces, on phones, the desktop's
 * four-block text panel and scrolling banner with three short facts the
 * customer can act on — including free Dublin pickup, which otherwise only
 * appears once a Dublin address is typed at checkout.
 */
export function MobileTrustStrip() {
  const points = [
    { label: "Handmade in Ireland", icon: "M3 14c2.5-5 5 5 7.5 0S15 9 17.5 14M19.5 14h1.5" },
    { label: "Free Dublin pickup", icon: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11zM12 12.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" },
    { label: "Secure checkout", icon: "M7.5 10.5V7.5a4.5 4.5 0 019 0v3M5.25 10.5h13.5v9.75H5.25z" },
  ];
  return (
    <div className="lg:hidden bg-ui-bg">
      <ul className="no-scrollbar page-container flex gap-2 overflow-x-auto py-5">
        {points.map(({ label, icon }) => (
          <li key={label}
              className="flex shrink-0 items-center gap-2 rounded-full border border-ui-border bg-ui-surface px-3.5 py-2
                         font-body text-xs font-medium text-ui-text">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-ui-accent" fill="none"
                 stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Phone-only custom order card: the two ways to get something made, each one
 * tap — the order form, or a WhatsApp chat.
 */
export function MobileCustomOrderCard() {
  return (
    <section aria-labelledby="mobile-custom-heading" className="lg:hidden bg-ui-bg">
      <div className="page-container py-8">
        <div className="relative overflow-hidden rounded-2xl bg-deep-brown px-5 py-6 text-white">
          <span aria-hidden="true" className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gold/40" />
          <span aria-hidden="true" className="absolute -left-10 top-1/3 h-20 w-20 rounded-full bg-gold-light/20" />
          <p className="relative font-body text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
            Made for you
          </p>
          <h2 id="mobile-custom-heading" className="relative mt-2 font-heading text-2xl font-medium leading-tight">
            Want a piece in your colours?
          </h2>
          <div className="relative mt-5 flex flex-col gap-2.5">
            <Link
              href="/custom-order"
              className="focus-ring flex h-12 items-center justify-center rounded-full bg-white font-body text-sm font-semibold
                         text-deep-brown transition-transform duration-150 active:scale-[0.97]"
              style={{ touchAction: "manipulation" }}
            >
              Start a custom order →
            </Link>
            <a
              href={whatsappLink("Hi! I'd like to ask about a custom piece from Cozi Handmade ✦")}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full border border-white/40
                         font-body text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
              style={{ touchAction: "manipulation" }}
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
