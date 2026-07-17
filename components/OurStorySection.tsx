import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

interface StoryRow {
  image: string;
  alt: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  quote?: string;
  extra?: React.ReactNode;
  imageSide: "left" | "right";
}

const rows: StoryRow[] = [
  {
    image: "/images/our-story.jpg",
    alt: "Chunky burgundy yarn and the first handmade blanket — where Cozi Handmade began",
    eyebrow: "The Beginning",
    heading: "A Quiet Curiosity",
    paragraphs: [
      "It all began as a quiet curiosity, a ball of yarn, and a desire to create something warm with my own hands. What started as a simple attempt to learn crochet slowly became a comforting hobby.",
    ],
    imageSide: "left",
  },
  {
    image: "/images/blanket-room.jpg",
    alt: "A blanket taking shape row by row, mid-stitch",
    eyebrow: "The Craft",
    heading: "Every Stitch, By Hand",
    paragraphs: [
      "With each stitch, I discovered more than just a craft — I found patience, creativity, and joy in turning simple threads into something meaningful. My early pieces were far from perfect, but they carried something special: care, time, and intention.",
    ],
    quote: "Every blanket I create is more than a product — it is a piece of that journey.",
    imageSide: "right",
  },
  {
    image: "/images/blanket-room2.jpg",
    alt: "A finished handmade Cozi blanket styled in a cozy living space",
    eyebrow: "Today",
    heading: "Made To Be Lived In",
    paragraphs: [
      "As my skills grew, so did my love for making cozy blankets. Today, every piece is made slowly and thoughtfully — soft, warm, and made to be lived in — with the hope that it brings warmth and comfort into someone else's home.",
    ],
    extra: (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-taupe-dark font-body tracking-wide mt-2 mb-3">
        <span>Handmade</span>
        <span aria-hidden="true" className="text-taupe/50">·</span>
        <span>Made with intention</span>
        <span aria-hidden="true" className="text-taupe/50">·</span>
        <span>Soft and warm</span>
        <span aria-hidden="true" className="text-taupe/50">·</span>
        <span>Always unique</span>
      </p>
    ),
    imageSide: "left",
  },
];

// Growth cue (B): each chapter's image and heading step up in size —
// the story literally gets bigger as it builds toward "today."
const IMAGE_SCALE = [
  "max-h-56 sm:max-h-64 lg:max-h-72",
  "max-h-64 sm:max-h-72 lg:max-h-80",
  "max-h-72 sm:max-h-80 lg:max-h-96",
];
const HEADING_SCALE = [
  "text-base sm:text-lg",
  "text-lg sm:text-xl",
  "text-xl sm:text-2xl",
];

// Alternating border treatment per chapter — thick white "polaroid" print
// border (same look as the newsletter postcard collage) on the outer
// chapters, a hand-stitched dashed thread border on the middle one.
const IMAGE_BORDER = [
  "border-[6px] border-white shadow-[0_14px_34px_-10px_rgba(26,8,16,0.28)]",
  "border-[3px] border-dashed border-gold shadow-md",
  "border-[6px] border-white shadow-[0_14px_34px_-10px_rgba(26,8,16,0.28)]",
];

// Connector (C): a small animated chevron between chapters — each one
// visually "leads to" the next as the reader scrolls past it.
function Connector() {
  return (
    <ScrollReveal className="flex justify-center">
      <svg
        className="w-5 h-5 text-gold animate-bounce"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </ScrollReveal>
  );
}

export default function OurStorySection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-10 lg:py-16"
      style={{ backgroundColor: "#FBF0E4" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section intro — bold mixed-weight headline, ASOS-style */}
        <ScrollReveal className="text-center mb-8 lg:mb-12">
          <p className="text-gold text-[10px] uppercase tracking-[0.3em] font-body font-semibold mb-2">
            ✦ Our Story
          </p>
          <h2 className="font-body uppercase text-2xl sm:text-3xl lg:text-4xl font-800 text-deep-brown tracking-tight leading-none">
            Where Every <span className="font-heading italic font-400 normal-case text-gold">Stitch</span> Began
          </h2>
        </ScrollReveal>

        {/* Alternating editorial rows, growing chapter to chapter, linked by connectors */}
        <div className="space-y-4 lg:space-y-6">
          {rows.map((row, i) => (
            <Fragment key={row.heading}>
              <ScrollReveal>
                <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center flex flex-col gap-5">

                  <div className={row.imageSide === "left" ? "lg:order-1" : "lg:order-2"}>
                    <div
                      className={`relative aspect-[16/11] sm:aspect-[16/9] lg:aspect-[4/3] overflow-hidden
                                 rounded-xl mx-auto lg:mx-0 lg:max-w-none ${IMAGE_SCALE[i]} ${IMAGE_BORDER[i]}`}
                    >
                      <Image
                        src={row.image}
                        alt={row.alt}
                        fill
                        priority={i === 0}
                        loading={i === 0 ? undefined : "lazy"}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className={row.imageSide === "left" ? "lg:order-2" : "lg:order-1"}>
                    <p className="text-gold text-[10px] uppercase tracking-[0.3em] font-body font-semibold mb-1.5">
                      {row.eyebrow}
                    </p>
                    <h3 className={`font-body uppercase font-800 text-deep-brown tracking-tight mb-2.5 ${HEADING_SCALE[i]}`}>
                      {row.heading}
                    </h3>
                    {row.paragraphs.map((p) => (
                      <p key={p} className="text-deep-brown/80 leading-relaxed mb-2.5 text-xs sm:text-sm font-medium">
                        {p}
                      </p>
                    ))}
                    {row.quote && (
                      <p className="font-heading italic text-base sm:text-lg font-400 text-deep-brown leading-snug mb-2.5">
                        &ldquo;{row.quote}&rdquo;
                      </p>
                    )}
                    {row.extra}
                    {i === rows.length - 1 && (
                      <Link
                        href="/products"
                        className="inline-flex items-center justify-center h-11 px-6 mt-1
                                   border-2 border-deep-brown text-deep-brown font-bold text-xs uppercase tracking-widest
                                   hover:bg-deep-brown hover:text-cream
                                   transition-colors duration-300"
                        style={{ touchAction: "manipulation" }}
                      >
                        Explore the Collection
                      </Link>
                    )}
                  </div>

                </div>
              </ScrollReveal>

              {i < rows.length - 1 && <Connector />}
            </Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}
