"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Checkout is a slim, focused flow: no footer on phones. Everywhere else the
 * footer shows (compact on phones, full from lg).
 */
export default function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCheckout = pathname.startsWith("/checkout");
  return <div className={isCheckout ? "hidden lg:block" : undefined}>{children}</div>;
}
