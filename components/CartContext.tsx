"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const CART_KEY = "cozy_cart";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  // "product" (default, omitted for backward-compat with existing carts in
  // localStorage) vs "new_in" — a standalone new_in_items row with no
  // products-table link. Determines which table checkout verifies price/stock
  // against and which detail route ("/products/:id" vs "/new-in/:id") to link to.
  source?: "product" | "new_in";
  // The selected size/tier key (e.g. "With Stand") when the item has
  // per-tier pricing (new_in_items.variant_price). Lets checkout verify the
  // exact tier price server-side instead of falling back to the base price.
  //
  // SIZE ONLY — never a colour, and never a colour+size composite.
  // variant_price is keyed by entries in `sizes` (see schema.sql), so
  // widening this would make every lookup miss and silently reprice items to
  // their base price. Colour lives in `color` below.
  variant?: string;
  // The selected colour, when the item has any. Deliberately separate from
  // `variant`: colour carries no price of its own, so it must not enter the
  // variant_price lookup — but it DOES distinguish one cart line from
  // another, so it's part of the line key. Without it, a rust scarf and a
  // charcoal scarf in the same size merged into a single line and the
  // customer received two of whichever they added first.
  color?: string;
  // Available stock for THIS line's exact selection, snapshotted when the item
  // was added. Caps the quantity the cart UI will let a customer reach.
  //
  // This is a usability guard, NOT an enforcement boundary. It's a snapshot,
  // so it goes stale the moment anyone else buys the same item, and it lives
  // in localStorage where a customer can edit it freely. The real check is
  // checkout_verified_order() server-side, which raises OUT_OF_STOCK and
  // triggers the refund path. The point here is to stop an ordinary customer
  // from paying for five of a stock-of-one item and then being refunded —
  // not to make overselling impossible.
  //
  // undefined = no cap known (quick-add from a listing card, which has no
  // stock data). Those lines stay uncapped, exactly as before.
  maxQuantity?: number;
  // Billable shipping weight, read from the product/new_in row at
  // add-to-cart time. Missing/null (including carts persisted before this
  // field existed) is treated by calculateShipping() as "unknown" and
  // falls back to a deliberately high default — see lib/checkout/shipping.ts.
  // Only ever used client-side to display a shipping estimate; the server
  // re-fetches the real weight itself and never trusts this value.
  shippingWeightGrams?: number | null;
}

/**
 * Identity of a CART LINE — not of a product.
 *
 * Two entries are the same line only when they're the same row AND the same
 * selected variant. Keying on `id` alone silently merged different tiers of
 * one item into a single line: adding "With Stand" (€60) after "Without
 * Stand" (€40) bumped the €40 line to quantity 2 and discarded the €60
 * selection entirely — wrong item shipped, wrong total charged, and the cart
 * badge still incremented, so nothing looked wrong to the customer.
 *
 * DERIVED, never stored. Carts already sitting in localStorage from before
 * this existed keep working untouched — the key is recomputed from fields
 * they already have. `source` is normalised because it was added later and is
 * absent on older persisted carts (see the CartItem field comment).
 *
 * Every mutation and every React list key must go through this. Keying a
 * render list on `item.id` while mutating on the line key reintroduces the
 * bug in a harder-to-see form: React would reconcile two distinct lines as
 * one row.
 */
export function cartLineKey(item: Pick<CartItem, "id" | "source" | "variant" | "color">): string {
  // JSON-encoded tuple rather than a delimiter-joined string. Variant and
  // colour keys are admin-authored labels (e.g. "Size: Large"), so a separator
  // like ":" is not safe to assume absent — joining on one lets
  // {id:"a", variant:"b:c"} and {id:"a:b", variant:"c"} produce an identical
  // key and merge two unrelated lines. JSON escaping removes the ambiguity.
  return JSON.stringify([
    item.source ?? "product",
    item.id,
    item.variant ?? "",
    item.color ?? "",
  ]);
}

/**
 * Clamps a requested quantity to a line's known stock.
 *
 * An unknown cap (undefined) means "no cap known", not "cap of zero" — those
 * lines pass through untouched. A cap that has gone stale to <= 0 still
 * yields 1 rather than 0, because 0 would make the line vanish mid-edit;
 * letting it reach checkout and be rejected there is the clearer outcome.
 */
export function capQuantity(requested: number, maxQuantity?: number): number {
  if (maxQuantity === undefined) return requested;
  return Math.max(1, Math.min(requested, maxQuantity));
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // storage quota — silent
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((o) => !o);

  // Hydrate from localStorage on first mount (client only)
  useEffect(() => {
    setItems(readCart());
  }, []);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    const key = cartLineKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => cartLineKey(i) === key);
      const next = existing
        ? prev.map((i) =>
            // Re-adding refreshes the cap from the live page the customer is
            // looking at — that reading is newer than the snapshot on the
            // line, so it wins.
            cartLineKey(i) === key
              ? { ...i, maxQuantity: item.maxQuantity, quantity: capQuantity(i.quantity + 1, item.maxQuantity) }
              : i,
          )
        : [...prev, { ...item, quantity: capQuantity(1, item.maxQuantity) }];
      writeCart(next);
      return next;
    });
  };

  const removeItem = (lineKey: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => cartLineKey(i) !== lineKey);
      writeCart(next);
      return next;
    });
  };

  const updateQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) { removeItem(lineKey); return; }
    setItems((prev) => {
      const next = prev.map((i) =>
        cartLineKey(i) === lineKey ? { ...i, quantity: capQuantity(quantity, i.maxQuantity) } : i,
      );
      writeCart(next);
      return next;
    });
  };

  const clearCart = () => { writeCart([]); setItems([]); };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        total,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
