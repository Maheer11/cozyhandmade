import type { ReactNode } from "react";
import CoziLogo from "@/components/CoziLogo";

/**
 * Shared look for /subscribe/confirm and /subscribe/unsubscribe: an orange
 * block (same brand moment as the "Private access" intro) on the cream page.
 * Buttons inside are milk on orange (never burgundy on orange).
 */
export default function SubscribePanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: "mail" | "check" | "info";
  children: ReactNode;
}) {
  return (
    <div className="page-container py-10 lg:py-20">
      <section className="mx-auto max-w-xl rounded-block bg-orange px-6 py-10 text-milk sm:px-10 sm:py-12">
        <div className="flex flex-col items-start">
          <CoziLogo variant="mark" color="var(--color-milk)" className="h-12 w-auto" />
          <span aria-hidden="true" className="mt-1 font-body text-xs font-semibold uppercase tracking-[0.35em] text-milk">
            Handmade
          </span>
        </div>
        {icon && (
          <span className="mt-8 flex h-14 w-14 items-center justify-center rounded-pill bg-peach text-brown" aria-hidden="true">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              {icon === "mail" && (
                <>
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </>
              )}
              {icon === "check" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
              {icon === "info" && (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5.5M12 7.5h.01" />
                </>
              )}
            </svg>
          </span>
        )}
        <p className="type-eyebrow mt-6 text-milk">{eyebrow}</p>
        <h1 className="type-h1 mt-3 text-milk">{title}</h1>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

/** Milk-on-orange button classes (radius 8, like the intro's JOIN). */
export const MILK_BUTTON =
  "focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-small bg-milk px-6 font-body text-sm font-semibold uppercase tracking-[0.14em] text-brown transition-colors duration-150 hover:bg-white";
