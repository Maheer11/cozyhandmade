export type CurrencyCode =
  | "NGN" | "USD" | "GBP" | "EUR" | "CAD" | "AUD" | "GHS" | "KES" | "ZAR";

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  /** Fraction digits shown to end-user (luxury rounding may override to 0) */
  displayDecimals: 0 | 2;
  /** True if Paystack can process this currency natively */
  paystackSupported: boolean;
  /** True if Stripe can process this currency natively */
  stripeSupported: boolean;
}

export interface ExchangeRate {
  base: "NGN";
  currency: CurrencyCode;
  rate: number;
  fetchedAt: number; // Unix ms
  source: "live" | "cached" | "fallback";
}

export interface RateCache {
  rates: Partial<Record<CurrencyCode, ExchangeRate>>;
  lastFetch: number; // Unix ms
}

export interface UserRegion {
  currency: CurrencyCode;
  countryCode: string; // ISO 3166-1 alpha-2
  continent: string;
  checkoutMode: "nigerian" | "international";
  detectedVia: "profile" | "localStorage" | "ip" | "browser" | "default";
}

export interface PricedItem {
  amountNGN: number; // base price in kobo-free NGN
  amountConverted: number; // converted & luxury-rounded
  currency: CurrencyCode;
  symbol: string;
  formatted: string; // e.g. "£45.00" or "₦120,000"
  rate: number;
  rateSource: ExchangeRate["source"];
}

export interface CheckoutPricing {
  subtotalNGN: number;
  subtotalConverted: number;
  shippingNGN: number;
  shippingConverted: number;
  totalNGN: number;
  totalConverted: number;
  currency: CurrencyCode;
  symbol: string;
  formattedSubtotal: string;
  formattedShipping: string;
  formattedTotal: string;
  rate: number;
  rateSource: ExchangeRate["source"];
}

export interface CurrencyContextValue {
  currency: CurrencyCode;
  region: UserRegion;
  rate: ExchangeRate | null;
  isLoading: boolean;
  setCurrency: (code: CurrencyCode) => void;
  priceItem: (amountNGN: number) => PricedItem;
  formatAmount: (amountNGN: number) => string;
  priceCheckout: (subtotalNGN: number, shippingNGN: number) => CheckoutPricing;
}
