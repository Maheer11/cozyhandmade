import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StyleguideDemos from "./StyleguideDemos";
import AnimatedCoziLogo from "@/components/brand/AnimatedCoziLogo";

// TEMPORARY design-system specimen (Phase 2). Not linked from anywhere, hidden
// from search, and 404s on the production deployment. Remove only when the
// owner says so (Phase 8). Component markup here is specimen-only; Phase 4
// replaces it with the shared components.
export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const COLORS: { name: string; hex: string; role: string; light?: boolean }[] = [
  { name: "cream", hex: "#FBF0E4", role: "Page background, header, drawer (~60%)" },
  { name: "brown", hex: "#4D1808", role: "Text, logo on cream, footer, selected chips, dark blocks (~30%)" },
  { name: "burgundy", hex: "#8B2035", role: "Primary buttons on cream/white, active nav, links" },
  { name: "burgundy-dark", hex: "#6E1829", role: "Button hover / pressed" },
  { name: "orange", hex: "#A74508", role: "Hero, intro panel, low-stock badge. Never a button" },
  { name: "rust", hex: "#88290B", role: "Logo colourway only" },
  { name: "milk", hex: "#F5F4F0", role: "Logo off-white; text/buttons on orange or brown" },
  { name: "peach", hex: "#F7D9C0", role: "Soft cards; eyebrow text on brown (never text on orange)" },
  { name: "stone", hex: "#7A6A62", role: "Secondary text" },
  { name: "line", hex: "#E2DCD3", role: "Borders, dividers" },
  { name: "white", hex: "#FFFFFF", role: "Cards, inputs" },
  { name: "success", hex: "#2F6B3A", role: "Success text" },
  { name: "error", hex: "#B3261E", role: "Error text and borders" },
];
const BG: Record<string, string> = {
  cream: "bg-cream", brown: "bg-brown", burgundy: "bg-burgundy",
  "burgundy-dark": "bg-burgundy-dark", orange: "bg-orange", rust: "bg-rust",
  milk: "bg-milk", peach: "bg-peach", stone: "bg-stone", line: "bg-line",
  white: "bg-white", success: "bg-success", error: "bg-error",
};
const DARK_SWATCH = new Set(["brown", "burgundy", "burgundy-dark", "orange", "rust", "stone", "success", "error"]);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <p className="type-eyebrow text-orange">Specimen</p>
      <h2 className="type-h2 mt-1 mb-6">{title}</h2>
      {children}
    </section>
  );
}

const btn = "inline-flex min-h-12 items-center justify-center rounded-button px-7 type-small font-semibold transition-colors";

export default function StyleguidePage() {
  // Same gate as other prod-only concerns: the page exists for local/preview review.
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8">
      <p className="type-eyebrow text-burgundy">Cozi Handmade</p>
      <h1 className="type-display mt-2">Design system</h1>
      <p className="type-body mt-4 max-w-xl text-stone">
        Phase 2 specimen: colours, type, spacing, radius, shadow, buttons, badges, inputs and
        cards. See docs/DESIGN.md.
      </p>

      {/* The site logo: header, drawer, footer and checkout (owner's
          decision, docs/DESIGN.md §6). */}
      <Section title="Site logo (animated stacked mark)">
        <div id="logo-preview" className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center justify-center rounded-block bg-cream p-8 ring-1 ring-line">
            <AnimatedCoziLogo surface="cream" className="h-auto w-[clamp(6.5rem,26vw,12rem)]" />
          </div>
          <div className="flex items-center justify-center rounded-block bg-orange p-8">
            <AnimatedCoziLogo surface="orange" className="h-auto w-[clamp(6.5rem,26vw,12rem)]" />
          </div>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-card bg-white shadow-soft">
              <div className={`h-20 ${BG[c.name]} ${c.name === "white" || c.name === "milk" || c.name === "line" ? "border-b border-line" : ""}`}>
                <span className={`m-3 inline-block type-caption ${DARK_SWATCH.has(c.name) ? "text-white" : "text-brown"}`}>Aa</span>
              </div>
              <div className="p-3">
                <p className="type-small font-semibold">{c.name}</p>
                <p className="type-caption text-stone">{c.hex}</p>
                <p className="type-caption mt-1 text-stone">{c.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-6 rounded-card bg-white p-6 shadow-soft">
          <div><p className="type-caption text-stone">Display 40/44 → 64/68 · Fredoka SemiBold</p><p className="type-display">Handmade blankets, bags &amp; baby keepsakes</p></div>
          <div><p className="type-caption text-stone">H1 32/38 → 44/50</p><p className="type-h1">Bismah Tote Bag</p></div>
          <div><p className="type-caption text-stone">H2 24/30 → 32/38</p><p className="type-h2">Find your piece</p></div>
          <div><p className="type-caption text-stone">H3 18/24 · Fredoka Medium</p><p className="type-h3">Handmade products</p></div>
          <div><p className="type-caption text-stone">Body 16/24 · DM Sans</p><p className="type-body max-w-prose">Thoughtfully handcrafted for women who appreciate timeless style and everyday practicality. An original Cozi design, perfect for work, coffee dates, shopping or casual outings.</p></div>
          <div><p className="type-caption text-stone">Small 14/20</p><p className="type-small">Machine washable at 30°C, air dry flat</p></div>
          <div><p className="type-caption text-stone">Caption 12/16</p><p className="type-caption">No spam, ever. Unsubscribe anytime.</p></div>
          <div><p className="type-caption text-stone">Eyebrow 12/16 · caps · 0.3em</p><p className="type-eyebrow text-burgundy">Shop by category</p></div>
          <div><p className="type-caption text-stone">Price · DM Sans</p><p className="type-h3 font-body font-semibold">€85.00</p></div>
        </div>
      </Section>

      <Section title="Spacing, radius & shadow">
        <div className="space-y-8 rounded-card bg-white p-6 shadow-soft">
          <div>
            <p className="type-caption mb-3 text-stone">Spacing · 4px base</p>
            <div className="flex flex-wrap items-end gap-4">
              {[4, 8, 12, 16, 20, 24, 32, 48, 64, 96].map((s) => (
                <div key={s} className="text-center">
                  <div className="bg-burgundy" style={{ width: s, height: s }} />
                  <p className="type-caption mt-1 text-stone">{s}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="type-caption mb-3 text-stone">Radius</p>
            <div className="flex flex-wrap gap-4">
              {[
                ["rounded-small", "8 small"],
                ["rounded-tile", "16 inputs/tiles"],
                ["rounded-card", "24 cards/images"],
                ["rounded-block", "32 feature blocks"],
                ["rounded-pill", "pill"],
              ].map(([cls, label]) => (
                <div key={cls} className="text-center">
                  <div className={`h-16 w-24 bg-peach ${cls}`} />
                  <p className="type-caption mt-1 text-stone">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="type-caption mb-3 text-stone">Shadow · rgba(77,24,8,0.08) 0 4px 16px</p>
            <div className="h-16 w-40 rounded-card bg-white shadow-soft ring-1 ring-line/40" />
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 rounded-card bg-cream p-6 ring-1 ring-line">
            <button className={`${btn} bg-burgundy text-white hover:bg-burgundy-dark`}>Primary</button>
            <button className={`${btn} border-2 border-brown text-brown hover:bg-brown hover:text-cream`}>Secondary</button>
            <button disabled className={`${btn} cursor-not-allowed bg-line text-stone`}>Disabled</button>
            <button className={`${btn} bg-burgundy-dark text-white`}>Pressed</button>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-block bg-orange p-6">
            <p className="type-eyebrow w-full text-milk">Eyebrow on orange · milk (peach fails AA here)</p>
            <button className={`${btn} bg-milk text-brown hover:bg-white`}>Shop the Collection</button>
            <button className={`${btn} border-2 border-milk text-milk hover:bg-milk hover:text-brown`}>See featured pieces</button>
            <p className="type-caption text-milk">On orange: milk buttons only, never burgundy.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-block bg-brown p-6">
            <p className="type-eyebrow w-full text-peach">Eyebrow on brown · peach</p>
            <button className={`${btn} bg-milk text-brown hover:bg-white`}>Start a custom order</button>
            <p className="type-caption text-milk">On brown: milk buttons only, never burgundy.</p>
          </div>
          <div className="max-w-sm rounded-block bg-orange p-6">
            <button className="inline-flex min-h-12 w-full items-center justify-center rounded-small bg-milk px-7 type-small font-semibold uppercase tracking-[0.12em] text-brown">
              Join private access
            </button>
            <p className="type-caption mt-2 text-milk">Intro JOIN button: the one radius-8 exception.</p>
          </div>
        </div>
      </Section>

      <Section title="Badges & chips">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-peach px-3 py-1 type-small text-brown">✦ Handmade</span>
          <span className="rounded-pill bg-orange px-3 py-1 type-small text-white">Only 2 left</span>
          <span className="rounded-pill bg-brown px-3 py-1 type-small text-white">Sold out</span>
          <span className="rounded-pill bg-brown px-5 py-3 type-small font-semibold text-cream">All pieces</span>
          <span className="rounded-pill border border-stone bg-white px-5 py-3 type-small font-semibold text-brown">Throw blankets</span>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-6 md:grid-cols-3">
          <label className="block">
            <span className="type-small font-semibold">Email address</span>
            <input placeholder="you@example.com" className="mt-2 h-12 w-full rounded-tile border border-stone bg-white px-4 type-body placeholder:text-stone focus:outline-2 focus:outline-offset-0 focus:outline-brown" />
            <span className="type-caption mt-1 block text-stone">Default (click to see the brown 2px focus)</span>
          </label>
          <label className="block">
            <span className="type-small font-semibold">Email address</span>
            <input defaultValue="aoife@" className="mt-2 h-12 w-full rounded-tile border-2 border-brown bg-white px-4 type-body outline-none" />
            <span className="type-caption mt-1 block text-stone">Focus</span>
          </label>
          <label className="block">
            <span className="type-small font-semibold">Email address</span>
            <input defaultValue="aoife@" aria-invalid="true" className="mt-2 h-12 w-full rounded-tile border-2 border-error bg-white px-4 type-body outline-none" />
            <span className="type-caption mt-1 block text-error">Add the part after the @, like aoife@example.com.</span>
          </label>
        </div>
      </Section>

      <Section title="Cards & surfaces">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="aspect-[4/5] rounded-card bg-line/60" />
            <p className="type-small mt-3">The Amani Bag</p>
            <p className="type-body font-semibold">€55.00</p>
          </div>
          <div className="rounded-card bg-white p-5 shadow-soft"><p className="type-h3">White card</p><p className="type-small mt-1 text-stone">Soft warm shadow, radius 24.</p></div>
          <div className="rounded-block bg-peach p-6"><p className="type-h3">Peach block</p><p className="type-small mt-1 text-brown">Radius 32. Use brown, not stone, for text on peach.</p></div>
          <div className="rounded-block bg-brown p-6 text-cream"><p className="type-h3">Brown block</p><p className="type-small mt-1">Custom order, footer.</p></div>
        </div>
      </Section>
      <div className="mt-16 border-t border-line pt-4">
        <h2 className="type-h1 mb-8 mt-8">Shared components</h2>
        <StyleguideDemos />
      </div>
    </div>
  );
}
