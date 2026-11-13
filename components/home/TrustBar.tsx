"use client";

import { usePathname } from "next/navigation";

/**
 * Dark trust strip above the header. Home page only: the facts a first-time
 * visitor needs (made by hand, Irish, free Dublin pickup) before they scroll.
 * Not sticky, so it scrolls away and the header takes the top of the screen.
 */
export default function TrustBar() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <div className="bg-brown text-cream">
      <p className="page-container py-2.5 text-center font-body text-[13px] leading-5">
        Made by hand in Ireland <span aria-hidden="true">·</span> Free Dublin pickup
        <span className="hidden sm:inline">
          {" "}<span aria-hidden="true">·</span> Gift wrap available
        </span>
      </p>
    </div>
  );
}
