import type { Category } from "@/lib/products";
import MobileProductSearch, { type SearchItem } from "@/components/home/MobileProductSearch";
import Chip from "@/components/ui/Chip";

/**
 * Phone-only shortcuts under "Find your piece": a product search that shows
 * results as you type (MobileProductSearch) and category chips that wrap onto
 * as many rows as they need, so every kind of product is one tap away.
 */
export default function MobileShopShortcuts({ categories, searchItems }: { categories: Category[]; searchItems: SearchItem[] }) {
  return (
    <div className="mt-5 flex flex-col gap-4 lg:hidden">
      <MobileProductSearch items={searchItems} />

      {categories.length > 0 && (
        <nav aria-label="Shop by category">
          <ul className="flex flex-wrap gap-3">
            <li>
              <Chip href="/products" selected>All pieces</Chip>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Chip href={`/products?category=${encodeURIComponent(category.id)}`}>{category.name}</Chip>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
