import type { ReactNode } from "react";
import { cn } from "./cn";

// handmade  peach  — "✦ Handmade"
// lowStock  orange — "Only 2 left"
// soldOut   brown  — "Sold out"
export type BadgeVariant = "handmade" | "lowStock" | "soldOut";

const variants: Record<BadgeVariant, string> = {
  handmade: "bg-peach text-brown",
  lowStock: "bg-orange text-white",
  soldOut: "bg-brown text-white",
};

export default function Badge({
  variant,
  children,
  className,
}: {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 font-body text-xs font-semibold leading-4",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
