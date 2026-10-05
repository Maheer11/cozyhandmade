"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/social-links";
import { isBottomNavHidden } from "@/components/BottomNav";

/**
 * Floating WhatsApp chat button.
 *
 * Below lg the chat normally lives in the bottom nav as its own tab, so the
 * bubble only floats there on pages where that bar steps aside (product detail
 * and checkout) — otherwise it covered product names and links in the
 * two-column grid as the page scrolled. It then sits docked just above where
 * the bar would be. From lg it always floats in the corner.
 *
 * From lg to 1375px the page's side gutter is only 48px (see page-container),
 * so the bubble shrinks to 40px, 4px in from the edge, to sit entirely inside
 * that gutter instead of passing over "View all" or the last grid card. From
 * 1376px the gutter is at least 96px and the full 56px bubble fits.
 */
export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const inBottomNav = !isBottomNavHidden(pathname);

  return (
    <a
      href={whatsappLink("Hi! I'd love to ask about a piece from Cozi Handmade ✦")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`focus-ring fixed right-3 sm:right-6 z-40
                 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)]
                 lg:right-1 lg:bottom-4 wide:right-6 wide:bottom-6
                 w-12 h-12 lg:w-10 lg:h-10 wide:w-14 wide:h-14 rounded-full bg-[#25D366] text-white
                 ${inBottomNav ? "hidden lg:flex" : "flex"} items-center justify-center shadow-xl shadow-black/20
                 ring-2 ring-cream/70 lg:ring-0
                 hover:scale-110 active:scale-95 transition-transform duration-200`}
    >
      <svg className="w-6 h-6 lg:w-5 lg:h-5 wide:w-7 wide:h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
      </svg>
    </a>
  );
}
