import Link from "next/link";
import type { Category } from "@/lib/products";

/**
 * The phone homepage headline, "Handmade blankets, bags & baby keepsakes",
 * where each product word is its own call to action: set in the headline's
 * own upright serif, in maroon, inside a thin outlined pill with a small
 * arrow, opening that category.
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
    <h1 className="lg:hidden font-heading font-medium text-ui-text text-[1.625rem] leading-[1.35] text-balance">
      {/* No comma after the first pill: its padding left the comma floating
          on its own ("blankets → ,"), and the pills already separate the words. */}
      Handmade <HeadlineWord href={blanketsHref}>blankets</HeadlineWord>{" "}
      <HeadlineWord href={bagsHref}>bags</HeadlineWord> &amp;{" "}
      <HeadlineWord href={babyHref}>baby keepsakes</HeadlineWord>
    </h1>
  );
}

function HeadlineWord({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="focus-ring my-1 inline-flex items-baseline gap-1 whitespace-nowrap rounded-full border-[1.5px] border-ui-accent/50
                 px-3 text-ui-accent transition-[transform,background-color] duration-150
                 active:scale-95 active:bg-ui-accent/[0.06]"
      style={{ touchAction: "manipulation" }}
    >
      {children}
      <span aria-hidden="true" className="font-body text-[0.5em]">→</span>
    </Link>
  );
}
