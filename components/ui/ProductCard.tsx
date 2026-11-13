import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The WHOLE card is the link: no per-card "Choose options" / "Add to bag"
 * buttons. 4:5 image, radius 24, name wraps to two lines then truncates, then
 * price. Presentational: callers pass the formatted price and any badges, so
 * stock and currency logic stays where it already lives.
 */
export default function ProductCard({
  href,
  name,
  image,
  price,
  wasPrice,
  badges,
  soldOut = false,
  sizes = "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw",
  priority = false,
  className,
}: {
  href: string;
  name: string;
  image: string;
  /** Already formatted, e.g. "€55.00". */
  price: ReactNode;
  wasPrice?: ReactNode;
  /** Top-left of the image, e.g. <Badge variant="lowStock">. */
  badges?: ReactNode;
  soldOut?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("focus-ring group block rounded-card", className)}
      style={{ touchAction: "manipulation" }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-peach/40">
        <Image
          src={image}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
            soldOut && "opacity-70",
          )}
        />
        {badges && <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">{badges}</div>}
      </div>
      <h3 className="mt-3 line-clamp-2 font-body text-base leading-6 text-brown">{name}</h3>
      <p className="mt-1 flex items-baseline gap-2 font-body text-base font-semibold text-brown">
        {price}
        {wasPrice && <span className="text-sm font-normal text-stone line-through">{wasPrice}</span>}
      </p>
    </Link>
  );
}
