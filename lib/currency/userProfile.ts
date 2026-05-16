import type { CurrencyCode } from "./types";

export type ShippingRegion = "nigeria" | "africa" | "international";
export type RateSource = "live" | "cached" | "fallback";
export type DetectionMethod = "profile" | "localStorage" | "ip" | "browser" | "default";
export type PaymentGateway = "paystack" | "stripe";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** Mirrors the user_profiles DB table */
export interface UserProfile {
  id: string;
  userId: string;

  // Currency & region
  preferredCurrency: CurrencyCode;
  countryCode: string; // ISO 3166-1 alpha-2
  shippingRegion: ShippingRegion;

  // Shipping address (optional — pre-fills checkout)
  firstName?: string;
  lastName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postcode?: string;

  detectionMethod: DetectionMethod;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

/** Subset passed to CurrencyProvider from server component */
export type UserProfileCurrencyHint = Pick<UserProfile, "preferredCurrency" | "countryCode">;

/** Mirrors the orders DB table */
export interface Order {
  id: string;
  userId?: string;

  subtotalNGN: number;
  shippingNGN: number;
  totalNGN: number;

  displayCurrency: CurrencyCode;
  subtotalDisplay: number;
  shippingDisplay: number;
  totalDisplay: number;
  exchangeRate: number;
  rateSource: RateSource;

  paymentGateway: PaymentGateway;
  paymentReference?: string;
  paymentStatus: PaymentStatus;

  shippingRegion: ShippingRegion;
  countryCode: string;

  createdAt: string;
  updatedAt: string;
}

/** Mirrors exchange_rates DB table — used when reading from DB rather than API */
export interface StoredExchangeRate {
  id: number;
  baseCurrency: "NGN";
  currency: CurrencyCode;
  rate: number;
  fetchedAt: string; // ISO timestamp
  source: RateSource;
  provider: string;
}

/** Mirrors currency_config DB table */
export interface StoredCurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  displayDecimals: 0 | 2;
  isActive: boolean;
  paystackSupport: boolean;
  stripeSupport: boolean;
  updatedAt: string;
}
