import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Fix-it message. Puts the field in the error state. */
  error?: string;
  hint?: string;
  id?: string;
};

// Label always sits ABOVE the field. States: default (stone 1px border) →
// focus (brown 2px) → error (red 2px + a message that says how to fix it).
// The border is stone, not line: line on cream is only 1.2:1, too faint for a
// control boundary.
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errId = `${inputId}-error`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block type-small font-semibold text-brown">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-2 h-12 w-full rounded-tile bg-white px-4 font-body text-base text-brown",
          "placeholder:text-stone outline-none transition-[border-color,box-shadow]",
          error
            ? "border-2 border-error px-[15px]"
            : "border border-stone focus:border-2 focus:border-brown focus:px-[15px]",
          "disabled:cursor-not-allowed disabled:bg-milk disabled:text-stone",
        )}
        {...rest}
      />
      {error && (
        <p id={errId} role="alert" className="mt-1 type-caption text-error">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 type-caption text-stone">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
