"use client";

import { useEffect, useRef, useState } from "react";
import { cartLineKey, useCart, type CartItem } from "@/components/CartContext";

/**
 * "Add to bag" for homepage cards. Only ever rendered for an item the server
 * has already worked out is buyable as-is: in stock, and with no size or
 * colour to choose (those go to the product page instead). The item carries
 * its real stock as `maxQuantity`, and the button stops offering more once the
 * bag already holds that many, so the bag can never run past what the admin
 * dashboard says is available.
 */
export default function QuickAddButton({ item }: { item: Omit<CartItem, "quantity"> }) {
  const { items, addItem } = useCart();
  const [added, setAdded] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const key = cartLineKey(item);
  const inBag = items.find((i) => cartLineKey(i) === key)?.quantity ?? 0;
  const atLimit = item.maxQuantity !== undefined && inBag >= item.maxQuantity;

  function handleAdd() {
    if (atLimit) return;
    addItem(item);
    setAdded(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1600);
  }

  if (atLimit) {
    return (
      <button
        type="button"
        disabled
        className="flex h-10 w-full items-center justify-center rounded-full border border-ui-border
                   font-body text-sm font-semibold text-ui-muted disabled:cursor-not-allowed"
      >
        {inBag === 1 ? "In your bag" : `All ${inBag} in your bag`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-live="polite"
      className={`focus-ring flex h-10 w-full items-center justify-center gap-1.5 rounded-full
                  font-body text-sm font-semibold transition-all duration-150 active:scale-95
                  ${added ? "bg-emerald-600 text-white" : "bg-ui-accent text-white hover:bg-ui-accent-hover"}`}
      style={{ touchAction: "manipulation" }}
    >
      {added ? "Added ✓" : <><span aria-hidden="true">+</span> Add to bag</>}
    </button>
  );
}
