// Public surface of the currency system — import from here, not from sub-modules
export { CurrencyProvider, useCurrency } from "./CurrencyContext";
export { priceItem, priceCheckout, formatCurrency, luxuryRound } from "./pricingUtils";
export { detectRegion, persistRegion, persistCurrencyOverride } from "./regionDetection";
export { getClientRate, prefetchAllRates } from "./exchangeRateClient";
export { CURRENCIES, COUNTRY_CURRENCY_MAP, DEFAULT_CURRENCY } from "./constants";
export type {
  CurrencyCode,
  CurrencyConfig,
  ExchangeRate,
  PricedItem,
  CheckoutPricing,
  UserRegion,
  CurrencyContextValue,
} from "./types";
