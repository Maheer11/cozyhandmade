import Link from "next/link";
import type { Category } from "@/lib/products";

/**
 * Phone-only shortcuts under the homepage headline: a search bar and a row of
 * category chips, so the first screen offers a one-tap way into every kind of
 * product instead of a paragraph to read.
 *
 * The search bar is a link, not an input: the shop page already has the real
 * search and focuses it when opened with ?focusSearch=1 (ProductsContent), so
 * there is one search implementation, not two.
 */
export default function MobileShopShortcuts({ categories }: { categories: Category[] }) {
  return (
    <div className="lg:hidden mt-5 flex flex-col gap-3">
      <Link
        href="/products?focusSearch=1"
        className="focus-ring flex h-12 items-center gap-3 rounded-full border border-ui-border bg-ui-surface px-4
                   font-body text-sm text-ui-muted shadow-[0_6px_18px_-12px_rgba(26,8,16,0.4)]
                   transition-transform duration-150 active:scale-[0.98]"
        style={{ touchAction: "manipulation" }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-ui-accent"
             fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        Search blankets, bags, baby gifts…
      </Link>

      {categories.length > 0 && (
        <nav aria-label="Shop by category">
          <ul className="no-scrollbar -mx-6 flex snap-x scroll-px-6 gap-2 overflow-x-auto px-6 pb-1">
            <li className="snap-start">
              <ChipLink href="/products" label="All pieces" primary />
            </li>
            {categories.map((category) => (
              <li key={category.id} className="snap-start">
                <ChipLink href={`/products?category=${encodeURIComponent(category.id)}`} label={category.name} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function ChipLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 font-body text-sm font-medium
                  transition-transform duration-150 active:scale-95
                  ${primary
                    ? "bg-ui-accent text-white"
                    : "border border-ui-border bg-ui-surface text-ui-text"}`}
      style={{ touchAction: "manipulation" }}
    >
      {label}
    </Link>
  );
}
