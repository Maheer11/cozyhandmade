"use client";

import { usePathname } from "next/navigation";

/**
 * Bottom-of-page clearance on phones, owned in one place. The credit line now
 * lives in the footer itself, so this is only a brown spacer that keeps the
 * footer's last line clear of whatever is fixed to the bottom of the screen:
 *
 * - Most pages: the height of the bottom nav (pb-nav).
 * - Product detail: the sticky buy bar (the bottom nav steps aside there).
 * - Checkout: nothing; it has no footer on phones either.
 */
export default function MobileFooterCredit() {
  const pathname = usePathname();

  if (pathname.startsWith("/checkout")) return null;
  if (/^\/products\/[^/]+$/.test(pathname)) {
    return <div className="h-24 bg-brown lg:hidden" aria-hidden="true" />;
  }
  return <div className="pb-nav bg-brown lg:hidden" aria-hidden="true" />;
}
