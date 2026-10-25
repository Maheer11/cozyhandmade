import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/products";

/**
 * "Shop by category": a grid of photo tiles (two columns on phones, three from
 * lg), one tap to that category in the shop. Only categories that hold products are passed in
 * (getStockedCategories), so no tile leads to an empty page.
 */
export default function CategoryTiles({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-heading" className="bg-ui-bg">
      <div className="page-container pt-10 pb-2 lg:pt-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="categories-heading" className="font-heading text-2xl font-medium text-ui-text lg:text-[2.5rem] lg:leading-tight">
            Shop by category
          </h2>
          <Link href="/products" className="focus-ring rounded-button font-body text-sm font-medium text-ui-accent">
            See all
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
          {categories.map((category, i) => (
            // An odd count leaves the last tile alone on its row, so it spans
            // both columns as a wide banner instead.
            <li key={category.id} className={categories.length % 2 === 1 && i === categories.length - 1 ? "col-span-2 lg:col-span-1" : ""}>
              <Link
                href={`/products?category=${encodeURIComponent(category.id)}`}
                className="focus-ring group relative block overflow-hidden rounded-card bg-ui-surface
                           transition-transform duration-150 active:scale-[0.97]"
                style={{ touchAction: "manipulation" }}
              >
                <div className={`relative lg:aspect-[4/5] ${categories.length % 2 === 1 && i === categories.length - 1 ? "aspect-[2/1]" : "aspect-square"}`}>
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="(max-width: 1023px) 50vw, 30vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/75 via-deep-brown/10 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2
                                   font-body text-sm font-semibold text-white lg:text-lg">
                    <span className="leading-tight">{category.name}</span>
                    <span aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-ui-accent">
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
