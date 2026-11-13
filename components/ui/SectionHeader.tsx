import Link from "next/link";
import { cn } from "./cn";

/** Eyebrow + H2 + optional "See all →" link. */
export default function SectionHeader({
  eyebrow,
  title,
  id,
  seeAllHref,
  seeAllLabel = "See all",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** id for the heading, so the section can use aria-labelledby. */
  id?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="type-eyebrow text-burgundy">{eyebrow}</p>}
        <h2 id={id} className={cn("type-h2 text-brown", eyebrow && "mt-1")}>
          {title}
        </h2>
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="focus-ring shrink-0 rounded-pill py-3 type-small font-semibold text-burgundy hover:text-burgundy-dark"
        >
          {seeAllLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
