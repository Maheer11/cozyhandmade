import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

// primary          burgundy, the only call-to-action colour on cream/white
// secondary        brown outline
// onOrange         milk fill, brown text — use on orange OR brown blocks
// onOrangeOutline  milk outline — second action on orange/brown blocks
// Never put a burgundy button on orange (docs/DESIGN.md). No gradients/shimmer.
export type ButtonVariant = "primary" | "secondary" | "onOrange" | "onOrangeOutline";

const base =
  "focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-button px-7 " +
  "font-body text-sm font-semibold transition-colors duration-150 " +
  "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-burgundy text-white hover:bg-burgundy-dark active:bg-burgundy-dark " +
    "disabled:bg-line disabled:text-stone disabled:hover:bg-line",
  secondary:
    "border-2 border-brown text-brown hover:bg-brown hover:text-cream " +
    "disabled:border-line disabled:text-stone disabled:hover:bg-transparent disabled:hover:text-stone",
  onOrange:
    "bg-milk text-brown hover:bg-white disabled:bg-milk/60 disabled:text-stone",
  onOrangeOutline:
    "border-2 border-milk text-milk hover:bg-milk hover:text-brown",
};

type CommonProps = {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonProps = CommonProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;
type LinkProps = CommonProps & { href: string; disabled?: undefined; onClick?: () => void; target?: string; rel?: string };

/** A button, or a link that looks like one when `href` is given. */
export default function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", fullWidth, className, children } = props;
  const cls = cn(base, variants[variant], fullWidth && "w-full", className);

  if (props.href !== undefined) {
    const { href, onClick, target, rel } = props;
    return (
      <Link href={href} className={cls} onClick={onClick} target={target} rel={rel}>
        {children}
      </Link>
    );
  }
  const { variant: _v, fullWidth: _f, className: _c, children: _ch, href: _h, type = "button", ...rest } = props;
  void _v; void _f; void _c; void _ch; void _h;
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
