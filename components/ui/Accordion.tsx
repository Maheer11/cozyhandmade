"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

/** Stacked disclosure rows with a + / − marker. Several may be open at once. */
export default function Accordion({
  items,
  defaultOpen = [],
  className,
}: {
  items: AccordionItem[];
  defaultOpen?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen));
  const uid = useId();
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn("border-t border-line", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const panelId = `${uid}-${item.id}`;
        return (
          <div key={item.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                id={`${panelId}-btn`}
                onClick={() => toggle(item.id)}
                className="focus-ring flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left font-heading text-lg font-medium text-brown"
              >
                {item.title}
                <span aria-hidden="true" className="text-xl font-body text-burgundy">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} hidden={!isOpen} className="pb-4 type-body text-brown">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
