"use client";

import { usePathname } from "next/navigation";

/**
 * What sits at the very bottom of every mobile page, which is one of three
 * things depending on where the customer is:
 *
 * 1. Home — the build credit strip. The desktop <Footer> is `lg` and up only,
 *    so without this the credit exists nowhere on a phone except inside the nav
 *    drawer. It belongs at the end of the homepage, the one page a visitor
 *    scrolls to the bottom of on purpose; on a product page it just padded the
 *    end of every route with a strip nobody went looking for.
 *
 * 2. Product detail and checkout — nothing at all. BottomNav hides itself on
 *    exactly these routes (see BottomNav.tsx) because they carry their own
 *    full-width sticky bars, so there is no floating nav to clear and any
 *    spacer here is just blank screen at the end of the page.
 *
 * 3. Everywhere else — an empty spacer the height of the bottom nav. The nav is
 *    a `fixed` floating pill, so it takes no layout space of its own; without
 *    this the last row of content sits underneath it.
 *
 * Kept in one component so the bottom-of-page clearance has a single owner.
 * When two elements each tried to reserve it, the page ended up with a band of
 * dead space between the content and the strip.
 */
export default function MobileFooterCredit() {
  const pathname = usePathname();

  // Same tests BottomNav uses to hide itself — keep the two in step.
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname);
  const isCheckout = pathname.startsWith("/checkout");
  if (isProductDetail || isCheckout) return null;

  if (pathname !== "/") {
    return <div className="lg:hidden pb-nav" aria-hidden="true" />;
  }

  return (
    /* pr-20 reserves the bottom-right corner for the floating WhatsApp button,
       which is fixed and would otherwise sit on the credit. pb-nav clears the
       bottom nav pill. */
    <div className="lg:hidden bg-cream-darker border-t border-taupe/15 pl-4 pr-20 pt-4 pb-nav">
      <a
        href="https://buildwithmaheer.com"
        target="_blank"
        rel="noopener noreferrer"
        className="credit-chip flex items-center justify-center gap-2 rounded-full
                   mx-auto max-w-xs px-4 py-2.5
                   text-brown/80 active:text-gold transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5 text-terracotta-dark shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
        <span
          className="credit-link credit-idle text-sm font-body tracking-wide"
          style={{ ["--sheen" as string]: "var(--color-terracotta-dark)" }}
        >
          Built by Maheer
        </span>
      </a>
    </div>
  );
}
