"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Optional delay in milliseconds before the transition starts once in view */
  delay?: number;
  /** Intersection threshold — 0 to 1 */
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            const t = setTimeout(() => el.classList.add("reveal-visible"), delay);
            observer.disconnect();
            return () => clearTimeout(t);
          } else {
            el.classList.add("reveal-visible");
            observer.disconnect();
          }
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={`reveal-hidden ${className}`}
    >
      {children}
    </div>
  );
}
