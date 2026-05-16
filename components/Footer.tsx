import Link from "next/link";
import CoziLogo from "./CoziLogo";

const shopLinks = [
  { href: "/products", label: "All Pieces" },
  { href: "/products?category=duvets", label: "Duvets & Quilts" },
  { href: "/products?category=baby", label: "Baby Clothing" },
  { href: "/products?category=handbags", label: "Handbags & Totes" },
  { href: "/products?category=scarves", label: "Scarves & Wraps" },
  { href: "/products?category=blankets", label: "Blankets & Throws" },
];

const helpLinks = [
  { href: "#", label: "Shipping & Returns" },
  { href: "#", label: "Care Instructions" },
  { href: "#", label: "FAQs" },
  { href: "#", label: "Contact Us" },
  { href: "#", label: "Wholesale Enquiries" },
];

const aboutLinks = [
  { href: "/#about", label: "Our Story" },
  { href: "#", label: "Our Artisans" },
  { href: "#", label: "Sustainability" },
  { href: "#", label: "Press" },
  { href: "/#newsletter", label: "Journal" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#D4B89A" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-16">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="block mb-4 group">
              <CoziLogo
                className="w-28 h-10 opacity-90 group-hover:opacity-100 transition-opacity duration-200"
                color="#8B2035"
              />
            </Link>
            <p className="text-xs mb-4 font-body" style={{ color: "#5C3D2A" }}>est. 2018 · handcrafted with ♡</p>
            <p className="text-sm leading-relaxed mb-6 max-w-xs font-body" style={{ color: "#5C3D2A" }}>
              Every stitch made with love — duvets, baby clothes, handbags, purses, scarves
              and blankets crafted by skilled women artisans.
            </p>
            {/* Social icons — milk & wine palette */}
            <div className="flex gap-3">
              {/* Instagram */}
              <a href="#" aria-label="Instagram"
                 className="w-9 h-9 rounded-full flex items-center justify-center
                            hover:scale-110 transition-all duration-200"
                 style={{ backgroundColor: "#8B2035" }}>
                <svg className="w-4 h-4" fill="#F5E6D3" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* Pinterest */}
              <a href="#" aria-label="Pinterest"
                 className="w-9 h-9 rounded-full flex items-center justify-center
                            hover:scale-110 transition-all duration-200"
                 style={{ backgroundColor: "#F5E6D3" }}>
                <svg className="w-4 h-4" fill="#8B2035" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" aria-label="Facebook"
                 className="w-9 h-9 rounded-full flex items-center justify-center
                            hover:scale-110 transition-all duration-200"
                 style={{ backgroundColor: "#8B2035" }}>
                <svg className="w-4 h-4" fill="#F5E6D3" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-heading italic font-400 text-lg mb-5" style={{ color: "#3D2B1F" }}>Shop</h3>
            <ul className="space-y-3">
              {shopLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body transition-colors duration-200 hover:text-gold"
                    style={{ color: "#5C3D2A" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-heading italic font-400 text-lg mb-5" style={{ color: "#3D2B1F" }}>Help</h3>
            <ul className="space-y-3">
              {helpLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body transition-colors duration-200 hover:text-gold"
                    style={{ color: "#5C3D2A" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-heading italic font-400 text-lg mb-5" style={{ color: "#3D2B1F" }}>About</h3>
            <ul className="space-y-3">
              {aboutLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm font-body transition-colors duration-200 hover:text-gold"
                    style={{ color: "#5C3D2A" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(92,61,42,0.2)" }}>
          <p className="text-xs font-body" style={{ color: "#5C3D2A" }}>
            &copy; {new Date().getFullYear()} Woven with Love. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((t) => (
              <a
                key={t}
                href="#"
                className="text-xs font-body transition-colors duration-200 hover:text-gold"
                style={{ color: "#5C3D2A" }}
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
