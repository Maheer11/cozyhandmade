import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/products";
import MobileShopShortcuts from "@/components/home/MobileShopShortcuts";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * "Shop by category" / "Find your piece". Phones get wrapping category chips
 * (MobileShopShortcuts); from lg, a grid of photo tiles, one
 * tap to that category. Only categories that hold products are passed in
 * (getStockedCategories), so nothing here leads to an empty page.
 */
export default function CategoryTiles({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-heading" className="bg-cream">
      <div className="page-container pt-12 lg:pt-20">
        <SectionHeader
          eyebrow="Shop by category"
          title="Find your piece"
          id="categories-heading"
          seeAllHref="/products"
        />

        <MobileShopShortcuts categories={categories} />

        <ul className="mt-8 hidden grid-cols-3 gap-5 lg:grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/products?category=${encodeURIComponent(category.id)}`}
                className="focus-ring group relative block overflow-hidden rounded-card bg-peach/40
                           transition-transform duration-150 active:scale-[0.98]"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="30vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Scrim so the white label reads on any photo. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brown/75 via-brown/10 to-transparent" />
                  <span className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2 font-body text-lg font-semibold text-white">
                    <span className="leading-tight">{category.name}</span>
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-milk text-burgundy">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
