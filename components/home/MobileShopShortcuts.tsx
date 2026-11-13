import type { Category } from "@/lib/products";
import Chip from "@/components/ui/Chip";

/**
 * Phone-only category chips under "Find your piece", wrapping onto as many
 * rows as they need, so every kind of product is one tap away. The phone
 * product search lives at the top of the hero (app/page.tsx).
 */
export default function MobileShopShortcuts({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Shop by category" className="mt-5 lg:hidden">
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
  );
}
