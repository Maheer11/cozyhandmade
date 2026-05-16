"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { CURRENCIES } from "@/lib/currency/constants";
import type { CurrencyCode } from "@/lib/currency/types";

const DISPLAYED: CurrencyCode[] = ["NGN", "USD", "GBP", "EUR", "CAD", "AUD", "GHS", "ZAR"];

export default function CurrencyPicker() {
  const { currency, setCurrency, isLoading } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const config = CURRENCIES[currency];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body
                   transition-colors duration-150 hover:bg-black/5"
        style={{ color: "#5C3D2A" }}
        aria-label="Change currency"
        aria-expanded={open}
      >
        {isLoading ? (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="font-semibold">{config.symbol}</span>
        )}
        <span>{currency}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg border z-50 overflow-hidden"
          style={{ backgroundColor: "#FAF4ED", borderColor: "rgba(92,61,42,0.15)" }}
        >
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest font-body"
             style={{ color: "#8B7355" }}>
            Select Currency
          </p>
          {DISPLAYED.map((code) => {
            const cfg = CURRENCIES[code];
            const active = code === currency;
            return (
              <button
                key={code}
                onClick={() => { setCurrency(code); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body text-left
                           transition-colors duration-100"
                style={{
                  backgroundColor: active ? "rgba(139,32,53,0.08)" : "transparent",
                  color: active ? "#8B2035" : "#3D2B1F",
                }}
              >
                <span className="w-7 text-right font-semibold shrink-0">{cfg.symbol}</span>
                <span className="flex-1">{cfg.name}</span>
                {active && (
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
