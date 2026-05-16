"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const CART_KEY = "cozy_cart";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
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

  // Hydrate from localStorage on first mount (client only)
  useEffect(() => {
    setItems(readCart());
  }, []);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const next = existing
        ? prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, quantity: 1 }];
      writeCart(next);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      writeCart(next);
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) { removeItem(id); return; }
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, quantity } : i));
      writeCart(next);
      return next;
    });
  };

  const clearCart = () => { writeCart([]); setItems([]); };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total }}
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
