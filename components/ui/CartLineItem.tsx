import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * One bag row: image, name, variant line, quantity control, line price.
 * Purely presentational. The caller passes the stepper and the remove handler,
 * so cart state and pricing are untouched.
 */
export default function CartLineItem({
  name,
  image,
  href,
  variantLabel,
  price,
  quantityControl,
  onRemove,
  className,
}: {
  name: string;
  image: string;
  /** Product page; makes the photo and name links. */
  href?: string;
  /** e.g. "Size: Medium" or "One size". */
  variantLabel?: string;
  price: ReactNode;
  /** Usually <QuantityStepper/>. */
  quantityControl: ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 rounded-card bg-white p-4 shadow-soft", className)}>
      {href ? (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-tile bg-peach/40">
          <Image src={image} alt="" fill sizes="96px" className="object-cover" />
        </Link>
      ) : (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-tile bg-peach/40">
          <Image src={image} alt="" fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-heading text-lg font-medium leading-6 text-brown">
            {href ? <Link href={href} className="focus-ring rounded-small hover:text-burgundy">{name}</Link> : name}
          </h3>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="focus-ring -mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-stone hover:text-burgundy"
              aria-label={`Remove ${name} from bag`}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
        {variantLabel && <p className="type-small text-stone">{variantLabel}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {quantityControl}
          <p className="font-body text-base font-semibold text-brown">{price}</p>
        </div>
      </div>
    </div>
  );
}
