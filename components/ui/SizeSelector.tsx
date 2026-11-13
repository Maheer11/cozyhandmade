"use client";

import { cn } from "./cn";

export interface SizeOption {
  value: string;
  label?: string;
  /** Out of stock: shown struck through and not selectable. */
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
  return (
    <fieldset className={className}>
      <legend className="type-small font-semibold text-brown">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="mt-3 flex flex-wrap gap-3">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "focus-ring min-h-12 min-w-14 rounded-pill px-6 font-body text-base font-semibold transition-colors",
                selected ? "bg-brown text-cream" : "border border-stone bg-white text-brown hover:border-brown",
                o.disabled && "cursor-not-allowed border-line bg-white text-stone line-through hover:border-line",
              )}
            >
              {o.label ?? o.value}
              {o.disabled && <span className="sr-only"> (out of stock)</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
