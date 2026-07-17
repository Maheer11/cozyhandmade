import { LUXURY_ROUNDING_TIERS, CURRENCIES } from "./constants";
import type { CurrencyCode, CurrencyConfig, ExchangeRate, PricedItem, CheckoutPricing } from "./types";

/**
 * Core luxury rounding engine.
 * Never exposes awkward decimals like €23.47 — rounds to the nearest
 * psychologically clean breakpoint based on the price tier.
 */
export function luxuryRound(amount: number, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];

  // NGN — always round to nearest 100
  if (currency === "NGN") return Math.round(amount / 100) * 100;

  // Zero-decimal currencies (KES) — round to nearest 10
  if (config.displayDecimals === 0) return Math.round(amount / 10) * 10;

  const tier = LUXURY_ROUNDING_TIERS.find((t) => amount <= t.upTo);
  const step = tier?.roundTo ?? 25;
  return Math.round(amount / step) * step;
}

/**
 * Convert EUR (the base currency prices are stored/entered in) → target
 * currency and apply luxury rounding.
 */
export function convertPrice(
  amountEUR: number,
  rate: ExchangeRate,
  toCurrency: CurrencyCode,
): number {
  // EUR is the identity currency — exactly what the admin entered, no
  // conversion and no rounding (rounding here would silently collapse two
  // different admin-entered prices into the same displayed value).
  if (toCurrency === "EUR") return amountEUR;
  const raw = amountEUR * rate.rate;
  return luxuryRound(raw, toCurrency);
}

/**
 * Format a converted amount using the browser's Intl API.
 * Falls back to simple symbol + number when Intl is unavailable (SSR edge).
 */
export function formatCurrency(
  amount: number,
  config: CurrencyConfig,
): string {
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: config.displayDecimals,
      maximumFractionDigits: config.displayDecimals,
    }).format(amount);
  } catch {
    const fixed = amount.toFixed(config.displayDecimals);
    return `${config.symbol}${fixed}`;
  }
}

/**
 * Full price item: convert, round, format in one call.
 */
export function priceItem(
  amountEUR: number,
  rate: ExchangeRate,
  toCurrency: CurrencyCode,
): PricedItem {
  const config = CURRENCIES[toCurrency];
  const amountConverted = convertPrice(amountEUR, rate, toCurrency);
  return {
    amountEUR,
    amountConverted,
    currency: toCurrency,
    symbol: config.symbol,
    formatted: formatCurrency(amountConverted, config),
    rate: rate.rate,
    rateSource: rate.source,
  };
}

/**
 * Price a full checkout basket: subtotal + shipping → formatted totals.
 * Converts each line independently to prevent rounding drift accumulation.
 */
export function priceCheckout(
  subtotalEUR: number,
  shippingEUR: number,
  rate: ExchangeRate,
  toCurrency: CurrencyCode,
): CheckoutPricing {
  const config = CURRENCIES[toCurrency];
  const subtotalConverted = convertPrice(subtotalEUR, rate, toCurrency);
  const shippingConverted = convertPrice(shippingEUR, rate, toCurrency);
  const totalConverted = subtotalConverted + shippingConverted;

  return {
    subtotalEUR,
    subtotalConverted,
    shippingEUR,
    shippingConverted,
    totalEUR: subtotalEUR + shippingEUR,
    totalConverted,
    currency: toCurrency,
    symbol: config.symbol,
    formattedSubtotal: formatCurrency(subtotalConverted, config),
    formattedShipping: shippingConverted === 0 ? "Free" : formatCurrency(shippingConverted, config),
    formattedTotal: formatCurrency(totalConverted, config),
    rate: rate.rate,
    rateSource: rate.source,
  };
}

/**
 * Build a synthetic EUR-identity rate for the fallback case where
 * currency detection fails and we must display EUR prices (the base
 * currency prices are stored/entered in).
 */
export function eurIdentityRate(): ExchangeRate {
  return {
    base: "EUR",
    currency: "EUR",
    rate: 1,
    fetchedAt: Date.now(),
    source: "fallback",
  };
}
