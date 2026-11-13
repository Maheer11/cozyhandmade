import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

// Category filter pill. Selected = brown fill. Touch target is 44px+.
type Common = { selected?: boolean; children: ReactNode; className?: string };
type AsButton = Common & { href?: undefined; onClick?: () => void };
type AsLink = Common & { href: string; onClick?: undefined };

export default function Chip(props: AsButton | AsLink) {
  const { selected = false, children, className } = props;
  const cls = cn(
    "focus-ring inline-flex min-h-11 items-center rounded-pill px-5 font-body text-sm font-semibold " +
      "transition-colors duration-150",
    selected
      ? "bg-brown text-cream"
      : "border border-stone bg-white text-brown hover:border-brown",
    className,
  );
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={cls} aria-current={selected ? "page" : undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={props.onClick} aria-pressed={selected}>
      {children}
    </button>
  );
}
