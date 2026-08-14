import Link from "next/link";
import CoziLogo from "./CoziLogo";
import { socialLinks, whatsappLink } from "@/lib/social-links";

const shopLinks = [
  { href: "/products", label: "All Pieces" },
  { href: "/products?category=Blankets", label: "Throw Blankets" },
  { href: "/products?category=baby", label: "Baby Blankets" },
  { href: "/products?category=handbags", label: "Handbags & Totes" },
  { href: "/products?category=scarves", label: "Scarves & Wraps" },
  { href: "/products?category=wallets", label: "Purses & Wallets" },
];

const helpLinks = [
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact Us" },

];

const aboutLinks = [
  { href: "/featured-pieces", label: "Featured Pieces" },
  { href: "/#newsletter", label: "Journal" },
];

export default function Footer() {
  return (
    <footer className="bg-deep-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8 mb-8">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="block mb-3 group">
              <CoziLogo
                className="w-32 h-11 opacity-90 group-hover:opacity-100 transition-opacity duration-200"
                color="#F5E6D8"
              />
            </Link>
            <p className="text-cream/60 text-sm leading-relaxed mb-4 max-w-xs font-body">
              Every stitch made with love — duvets, baby clothes, handbags, purses, scarves
              and blankets crafted by skilled women artisans.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {/* Instagram */}
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                 className="w-8 h-8 rounded-full flex items-center justify-center
                            bg-cream/10 text-cream hover:bg-cream hover:text-gold
                            hover:scale-110 transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* WhatsApp */}
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                 className="w-8 h-8 rounded-full flex items-center justify-center
                            bg-cream/10 text-cream hover:bg-cream hover:text-gold
                            hover:scale-110 transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                 className="w-8 h-8 rounded-full flex items-center justify-center
                            bg-cream/10 text-cream hover:bg-cream hover:text-gold
                            hover:scale-110 transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                 className="w-8 h-8 rounded-full flex items-center justify-center
                            bg-cream/10 text-cream hover:bg-cream hover:text-gold
                            hover:scale-110 transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-cream/90 mb-3">Shop</h3>
            <ul className="space-y-2">
              {shopLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body text-cream/55 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-cream/90 mb-3">Help</h3>
            <ul className="space-y-2">
              {helpLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body text-cream/55 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-cream/90 mb-3">About</h3>
            <ul className="space-y-2">
              {aboutLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body text-cream/55 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-cream/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-body text-cream/45">
            &copy; {new Date().getFullYear()} Cozi Handmade. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((t) => (
              <a
                key={t}
                href="#"
                className="text-xs font-body text-cream/45 hover:text-cream transition-colors duration-200"
              >
                {t}
              </a>
            ))}
          </div>
        </div>

        {/* Build credit — its own centred row so it isn't lost beside the
            copyright. Sized and contrasted to actually be read. */}
        <div className="pt-5 mt-5 border-t border-cream/10 flex justify-center">
          <a
            href="https://buildwithmaheer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="credit-chip group inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5
                       rounded-full px-4 py-2 text-cream/75 hover:text-cream transition-colors duration-300"
          >
            <svg
              className="w-3.5 h-3.5 text-terracotta shrink-0 transition-transform duration-300 group-hover:rotate-12"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <span className="credit-link credit-idle text-sm font-body tracking-wide">
              Built by Maheer
            </span>
            <span className="text-xs font-body text-cream/40 group-hover:text-cream/70 transition-colors duration-300">
              buildwithmaheer.com
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
