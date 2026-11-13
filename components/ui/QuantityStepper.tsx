"use client";

import { cn } from "./cn";

/** − 1 + control. Presentational: the parent owns the value and the limits. */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Used in the buttons' accessible names, e.g. "Cozy Cable Blanket". */
  label?: string;
  className?: string;
}) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  const btn =
    "focus-ring flex h-11 w-11 items-center justify-center rounded-pill text-lg text-brown " +
    "transition-colors hover:bg-peach disabled:cursor-not-allowed disabled:text-stone disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-pill border border-stone bg-white", className)}
    >
      <button type="button" className={btn} disabled={atMin} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
        <span aria-hidden="true">−</span>
      </button>
      <span className="min-w-8 text-center font-body text-base font-semibold text-brown" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} disabled={atMax} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
