import type { Metadata, Viewport } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { CurrencyProvider } from "@/lib/currency/CurrencyContext";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/server";
import { getStockedCategories } from "@/lib/db-categories";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import MobileFooterCredit from "@/components/MobileFooterCredit";
import FooterGate from "@/components/FooterGate";
import TrustBar from "@/components/home/TrustBar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import CartDrawer from "@/components/CartDrawer";
import KeyboardAware from "@/components/KeyboardAware";

// Headings: Fredoka (variable, weights 300-700). Body/UI/prices: DM Sans
// (variable). Both self-hosted by next/font; the CSS variables feed
// --font-heading / --font-body in globals.css, which carry the fallbacks.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cozi Handmade | Handcrafted Woolwork & Knits",
  description:
    "Beautifully handcrafted duvets, baby clothing, handbags, purses, scarves and blankets, every stitch made with love by skilled women artisans.",
  icons: {
    icon: { url: "/cozihandmade-favicon.svg", type: "image/svg+xml" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android: the on-screen keyboard shrinks the page instead of sliding over
  // it, so the browser can scroll any field above the keyboard. iOS ignores
  // this; components/KeyboardAware handles both.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  // Stocked-only: the drawer's "Shop by Category" list is navigation, so an
  // entry that filters down to nothing is a dead end for the customer.
  const categories = await getStockedCategories(supabase);

  return (
    <html lang="en" className={`${fredoka.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream text-brown antialiased">
        <AuthProvider>
        <CurrencyProvider>
        <CartProvider>
          {/* Home-only dark trust strip, then the sticky header */}
          <TrustBar />
          <Navbar categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

          {/* Page content. No bottom-nav padding here: MobileFooterCredit below
              owns the bottom clearance on mobile. Reserving it in both places
              left a band of dead cream at the end of every page. */}
          <main className="flex-1">{children}</main>

          {/* Footer: compact on phones, full from lg. Not on phone checkout. */}
          <FooterGate>
            <Footer />
          </FooterGate>

          {/* Bottom-of-page clearance and, on the homepage, the build credit.
              See MobileFooterCredit for why it varies by route. */}
          <MobileFooterCredit />

          {/* Mobile / tablet bottom nav — hidden on desktop */}
          <BottomNav />

          {/* Floating WhatsApp chat button — every page */}
          <FloatingWhatsApp />

          {/* Slide-in cart drawer — every page */}
          <CartDrawer />

          {/* Keeps the field being typed in above the phone keyboard */}
          <KeyboardAware />
        </CartProvider>
        </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
