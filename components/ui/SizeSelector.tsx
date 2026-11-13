"use client";

import { cn } from "./cn";

export interface SizeOption {
  value: string;
  label?: string;
  /** Out of stock: shown faded (never struck through) and not selectable. */
  disabled?: boolean;
}

/** Radio-group of pill options (sizes or colours). Selected = brown. */
export default function SizeSelector({
  legend = "Size",
  options,
  value,
  onChange,
  className,
}: {
  legend?: string;
  options: SizeOption[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  // When every option is out (the whole product is sold out), the page's own
  // "Out of stock" badge and button already say so: the pills are just faded.
  // When only some are out, those pills also say "Sold out".
  const allDisabled = options.length > 0 && options.every((o) => o.disabled);

  return (
    <fieldset className={className}>
      <legend className="type-small font-semibold text-brown">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="mt-3 flex flex-wrap gap-3">
        {options.map((o) => {
          // An unavailable option never looks selected (the two styles clashed
          // when a sold-out size was pre-selected).
          const selected = o.value === value && !o.disabled;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "focus-ring min-h-12 min-w-14 rounded-pill border px-6 font-body text-base font-semibold transition-colors",
                o.disabled
                  ? "cursor-not-allowed border-stone/40 bg-white/50 text-stone"
                  : selected
                    ? "border-brown bg-brown text-cream"
                    : "border-stone bg-white text-brown hover:border-brown",
              )}
            >
              {o.label ?? o.value}
              {o.disabled && !allDisabled && (
                <span className="ml-2 font-body text-xs font-medium text-stone">Sold out</span>
              )}
              {o.disabled && <span className="sr-only"> (out of stock)</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
