import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQs | Cozi Handmade",
  description:
    "Answers to common questions about Cozi Handmade: delivery, caring for your handmade piece, custom orders, and how to pay.",
};

// Rendered on the page AND mirrored 1:1 into the FAQPage JSON-LD below —
// keep answers as plain strings so the schema never drifts from the page.
// Ordered the way a customer meets the questions: what a piece is and how it's
// made, then buying decisions (custom, colour, size), then owning it (care),
// then the shop around it (workshops, delivery, returns, payment).
const faqs: { q: string; a: string }[] = [
  {
    q: "Do you offer ready-made and made-to-order pieces?",
    a: "Yes. Some pieces are already made and ready to ship, while others are made to order. The product listing will clearly state whether an item is ready to ship or made to order.",
  },
  {
    q: "Are your pieces really handmade?",
    // Kept from the original copy, with "made to order by hand" softened to
    // "made by hand" — the answer above now states that not every piece is
    // made to order, and the two shouldn't contradict each other.
    a: "Yes. Every piece is made by hand. Because of that, slight variations in colour, texture, and size compared to the product photos are natural characteristics of handmade goods, not defects. No two pieces are exactly alike.",
  },
  {
    q: "Can I request a custom order?",
    a: "Absolutely. If you have a particular colour, size, design or idea in mind, you can submit a custom-order request through the website. I'll let you know what is possible and provide the details before we proceed.",
  },
  {
    q: "Can I choose a different colour?",
    a: "For selected products, yes. Available colour options will be shown on the product page. If you have a specific colour in mind that isn't listed, feel free to send a custom-order request.",
  },
  {
    q: "How do I know the size of an item?",
    a: "Each product page includes the relevant measurements and dimensions. Please check these before ordering, especially for bags, baskets and homeware pieces.",
  },
  {
    q: "How should I care for my handmade piece?",
    a: "Care instructions vary depending on the material and product. Specific care information will be provided where applicable. When in doubt, please contact me before washing or treating your piece.",
  },
  {
    q: "Do you offer workshops?",
    a: "We occasionally offer creative workshops. Keep an eye on our social media or website for upcoming workshops.",
  },
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
      <div className="bg-cream border-b border-line px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        {/* max-w-xl is a phone measure; on a desktop screen it left the header
            as a narrow ribbon adrift in the middle of the page. The list below
            uses the same width so the two stay in one column. */}
        <div className="max-w-xl lg:max-w-3xl mx-auto">
          <p className="type-eyebrow text-burgundy mb-2">
            ✦ Help
          </p>
          <h1 className="type-h1 text-brown mb-3">
            Frequently Asked Questions
          </h1>
          <p className="type-body max-w-xl text-stone">
            Delivery, care, custom orders, and payment: answered. Can&apos;t
            find what you need? Reach us any time on WhatsApp.
          </p>
        </div>
      </div>

      {/* Accordions — native <details>, no JS. Same dropdown styling as the
          product-page description sections. */}
      <div className="max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-28 lg:pb-16">
        <div>
          {faqs.map(({ q, a }) => (
            <details key={q} className="group border-b border-line first:border-t">
              {/* Hover feedback matters here in a way it doesn't on a phone:
                  with a pointer, a row that doesn't answer the cursor reads as
                  static text rather than something that opens. */}
              <summary
                className="focus-ring flex min-h-14 items-center justify-between gap-3 py-3 text-left cursor-pointer
                           list-none [&::-webkit-details-marker]:hidden group/row"
              >
                <span className="font-heading text-lg font-medium leading-6 text-brown
                                 transition-colors duration-150 group-hover/row:text-burgundy">
                  {q}
                </span>
                <span aria-hidden="true" className="shrink-0 font-body text-xl text-burgundy">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="type-body pb-4 pr-9 text-stone">{a}</p>
            </details>
          ))}
        </div>

        <Link
          href="/custom-order"
          className="focus-ring group flex min-h-11 items-center justify-center gap-1.5 rounded-pill pt-8 type-body font-semibold text-burgundy
                     transition-colors duration-150 hover:text-burgundy-dark lg:pt-12"
        >
          Have something specific in mind? Create a custom order
          <svg className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
