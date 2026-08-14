import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQs | Cozi Handmade",
  description:
    "Answers to common questions about Cozi Handmade: delivery, caring for your handmade piece, custom orders, and how to pay.",
};

// Rendered on the page AND mirrored 1:1 into the FAQPage JSON-LD below —
// keep answers as plain strings so the schema never drifts from the page.
const faqs: { q: string; a: string }[] = [
  {
    q: "How long does delivery take?",
    a: "[OWNER: confirm delivery timeframes: how many working days for domestic and international orders once dispatched.]",
  },
  {
    q: "Where do you ship?",
    a: "[OWNER: confirm shipping scope: which countries and regions you currently ship to.]",
  },
  {
    q: "What is your returns policy?",
    a: "[OWNER: confirm returns policy: the return window, condition requirements, and who covers return shipping.]",
  },
  {
    q: "Are your pieces really handmade?",
    a: "Yes. Every piece is made to order by hand. Because of that, slight variations in colour, texture, and size compared to the product photos are natural characteristics of handmade goods, not defects. No two pieces are exactly alike.",
  },
  {
    q: "How do I care for my handmade piece?",
    a: "Most pieces prefer a gentle hand wash in cool water, drying flat away from direct heat, and no bleach or tumble drying. Check the Care Instructions section on each product page for guidance specific to your piece.",
  },
  {
    q: "Can I order a custom piece?",
    a: "Absolutely. Tell us what you have in mind (colour, size, occasion) through the Custom Order page, and we'll reply on WhatsApp to talk it through before you order.",
  },
  {
    q: "How can I pay?",
    a: "Nigerian customers can pay by local bank transfer in Naira. International customers can pay by card via Stripe, or by bank transfer in EUR, GBP, or USD.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Header */}
      <div className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-xl mx-auto">
          <p className="text-gold text-[11px] uppercase tracking-[0.28em] font-body font-semibold mb-2">
            ✦ Help
          </p>
          <h1 className="font-heading italic text-3xl sm:text-4xl font-400 text-deep-brown mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-deep-brown/70 text-sm sm:text-base leading-relaxed">
            Delivery, care, custom orders, and payment: answered. Can&apos;t
            find what you need? Reach us any time on WhatsApp.
          </p>
        </div>
      </div>

      {/* Accordions — native <details>, no JS. Same dropdown styling as the
          product-page description sections. */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12">
        <div>
          {faqs.map(({ q, a }) => (
            <details key={q} className="group border-b border-taupe/20 first:border-t">
              <summary
                className="flex items-center justify-between gap-3 py-3.5 text-left cursor-pointer
                           list-none [&::-webkit-details-marker]:hidden"
              >
                <span className="font-ios font-700 text-xs uppercase tracking-widest text-deep-brown">
                  {q}
                </span>
                <span
                  className="w-6 h-6 flex items-center justify-center border border-taupe/40 text-gold
                             text-base font-medium leading-none shrink-0
                             transition-transform duration-300 group-open:rotate-180"
                >
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="pb-4 text-sm sm:text-base text-brown/75 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        <Link
          href="/custom-order"
          className="flex items-center justify-center gap-1.5 text-sm text-brown/70 active:text-gold
                     transition-colors duration-150 pt-8"
        >
          Have something specific in mind? Create a custom order
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
