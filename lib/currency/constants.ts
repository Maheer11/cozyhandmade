import type { CurrencyCode, CurrencyConfig } from "./types";

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    locale: "en-NG",
    displayDecimals: 0,
    paystackSupported: true,
    stripeSupported: false,
  },
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    locale: "en-US",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    locale: "en-GB",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    locale: "de-DE",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    locale: "en-CA",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    locale: "en-AU",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
  GHS: {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "₵",
    locale: "en-GH",
    displayDecimals: 2,
    paystackSupported: true,
    stripeSupported: false,
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    locale: "en-KE",
    displayDecimals: 0,
    paystackSupported: false,
    stripeSupported: false,
  },
  ZAR: {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    locale: "en-ZA",
    displayDecimals: 2,
    paystackSupported: false,
    stripeSupported: true,
  },
};

/**
 * Luxury rounding breakpoints.
 * "Never show £23.47 — round to £23.00 or £25.00"
 * Amounts in the *converted* currency.
 */
export const LUXURY_ROUNDING_TIERS = [
  { upTo: 10, roundTo: 0.5 },   // £0–£10: round to nearest 50p
  { upTo: 50, roundTo: 1 },     // £10–£50: round to nearest £1
  { upTo: 200, roundTo: 5 },    // £50–£200: round to nearest £5
  { upTo: 500, roundTo: 10 },   // £200–£500: round to nearest £10
  { upTo: Infinity, roundTo: 25 }, // £500+: round to nearest £25
];

/** Country ISO 3166-1 alpha-2 → currency */
export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
  MT: "EUR",
  CY: "EUR",
  SK: "EUR",
  SI: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  HR: "EUR",
};

/** Countries that use Nigerian checkout (Paystack) */
export const NIGERIAN_CHECKOUT_COUNTRIES = new Set<string>(["NG"]);

/** Rate cache duration — 6 hours in ms */
export const RATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Max age of cached rate used as fallback when API fails — 24 hours */
export const RATE_FALLBACK_TTL_MS = 24 * 60 * 60 * 1000;

/** localStorage keys */
export const LS_CURRENCY_KEY = "cozy_currency";
export const LS_RATE_CACHE_KEY = "cozy_rate_cache";
export const LS_REGION_KEY = "cozy_region";

export const DEFAULT_CURRENCY: CurrencyCode = "NGN";
