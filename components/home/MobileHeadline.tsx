import Link from "next/link";
import type { Category } from "@/lib/products";

/**
 * The phone homepage headline, "Handmade blankets, bags & baby keepsakes",
 * where each product word is its own call to action: a soft maroon pill with
 * an arrow, opening that category. A highlighter underline sweeps in under
 * each word once, one after another (off for reduced motion).
 *
 * Desktop keeps the plain headline in app/page.tsx; this one is lg:hidden.
 */
export default function MobileHeadline({ categories }: { categories: Category[] }) {
  // Category ids aren't consistent ("Blankets", "baby", "handbags"), so each
  // word finds its category by name among the stocked ones, and falls back to
  // the whole shop if none matches (e.g. that category is empty right now).
  const find = (test: (text: string) => boolean) => {
    const match = categories.find((c) => test(`${c.id} ${c.name}`.toLowerCase()));
    return match ? `/products?category=${encodeURIComponent(match.id)}` : "/products";
  };
  const blanketsHref = find((t) => t.includes("blanket") && !t.includes("baby"));
  const bagsHref = find((t) => t.includes("bag") || t.includes("tote"));
  const babyHref = find((t) => t.includes("baby"));

  return (
    <h1 className="lg:hidden font-heading font-medium text-ui-text text-[2rem] leading-[1.35] text-balance">
      {/* No comma after the first pill: its padding left the comma floating
          on its own ("blankets → ,"), and the pills already separate the words. */}
      Handmade <HeadlineWord href={blanketsHref} delayMs={250}>blankets</HeadlineWord>{" "}
      <HeadlineWord href={bagsHref} delayMs={550}>bags</HeadlineWord> &amp;{" "}
      <HeadlineWord href={babyHref} delayMs={850}>baby keepsakes</HeadlineWord>
    </h1>
  );
}

function HeadlineWord({ href, delayMs, children }: { href: string; delayMs: number; children: string }) {
  return (
    <Link
      href={href}
      // isolate: the underline's -z-10 then sits above this pill's tint and
      // below its text, instead of behind the whole page.
      className="focus-ring isolate inline-flex items-baseline gap-1 whitespace-nowrap rounded-full bg-ui-accent/[0.08]
                 px-2.5 italic text-ui-accent transition-transform duration-150 active:scale-95"
      style={{ touchAction: "manipulation" }}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="headline-sweep absolute inset-x-0 bottom-[0.12em] -z-10 h-[0.32em] rounded-full bg-gold-light/45"
          style={{ animationDelay: `${delayMs}ms` }}
        />
      </span>
      <span aria-hidden="true" className="not-italic text-[0.55em] font-body font-semibold">→</span>
    </Link>
  );
}
