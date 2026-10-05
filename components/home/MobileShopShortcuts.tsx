import Link from "next/link";
import type { Category } from "@/lib/products";
import MobileProductSearch, { type SearchItem } from "@/components/home/MobileProductSearch";

/**
 * Phone-only shortcuts at the top of the homepage: a product search that
 * shows results as you type (MobileProductSearch) and a row of category
 * chips, so the first screen offers a one-tap way into every kind of product.
 */
export default function MobileShopShortcuts({ categories, searchItems }: { categories: Category[]; searchItems: SearchItem[] }) {
  return (
    <div className="lg:hidden mt-5 flex flex-col gap-3">
      <MobileProductSearch items={searchItems} />

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
