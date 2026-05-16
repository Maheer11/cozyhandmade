"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { DEFAULT_CURRENCY } from "./constants";
import type { CurrencyCode, CurrencyContextValue, ExchangeRate, PricedItem, CheckoutPricing, UserRegion } from "./types";
import { detectRegion, persistRegion, persistCurrencyOverride } from "./regionDetection";
import { getClientRate, prefetchAllRates } from "./exchangeRateClient";
import {
  priceItem as _priceItem,
  priceCheckout as _priceCheckout,
  ngnIdentityRate,
} from "./pricingUtils";

// ─── Context ──────────────────────────────────────────────────────────────────

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface CurrencyProviderProps {
  children: ReactNode;
  /**
   * Optional: pass the authenticated user's profile from a server component
   * so region detection starts at layer 1 (profile) rather than layer 3 (IP).
   */
  userProfile?: { preferredCurrency?: string; countryCode?: string } | null;
}

export function CurrencyProvider({ children, userProfile = null }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [region, setRegion] = useState<UserRegion>({
    currency: DEFAULT_CURRENCY,
    countryCode: "NG",
    continent: "Africa",
    checkoutMode: "nigerian",
    detectedVia: "default",
  });
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Boot: detect region → fetch rate → update state
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsLoading(true);

      // 1. Detect region (cascade: profile → localStorage → IP → browser → default)
      const detectedRegion = await detectRegion(userProfile);
      if (cancelled) return;

      setRegion(detectedRegion);
      setCurrencyState(detectedRegion.currency);
      persistRegion(detectedRegion);

      // 2. Prefetch all rates and cache them, then get the specific rate for this currency
      await prefetchAllRates();
      if (cancelled) return;

      const detectedRate = await getClientRate(detectedRegion.currency);
      if (cancelled) return;

      setRate(detectedRate);
      setIsLoading(false);
    }

    boot().catch((err) => {
      console.error("[currency] Boot failed:", err);
      setRate(ngnIdentityRate());
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User manually changes currency (e.g. via picker in header)
  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code);
    persistCurrencyOverride(code);
    setIsLoading(true);

    const newRate = await getClientRate(code);
    setRate(newRate);
    setRegion((prev) => ({ ...prev, currency: code }));
    setIsLoading(false);
  }, []);

  // Pricing helpers — memoised closures over current rate
  const priceItem = useCallback(
    (amountNGN: number): PricedItem =>
      _priceItem(amountNGN, rate ?? ngnIdentityRate(), currency),
    [currency, rate],
  );

  const formatAmount = useCallback(
    (amountNGN: number): string => priceItem(amountNGN).formatted,
    [priceItem],
  );

  const priceCheckout = useCallback(
    (subtotalNGN: number, shippingNGN: number): CheckoutPricing =>
      _priceCheckout(subtotalNGN, shippingNGN, rate ?? ngnIdentityRate(), currency),
    [currency, rate],
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, region, rate, isLoading, setCurrency, priceItem, formatAmount, priceCheckout }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
