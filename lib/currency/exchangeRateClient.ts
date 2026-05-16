import {
  CURRENCIES,
  RATE_CACHE_TTL_MS,
  RATE_FALLBACK_TTL_MS,
  LS_RATE_CACHE_KEY,
} from "./constants";
import type { CurrencyCode, ExchangeRate, RateCache } from "./types";

// ─── Server-side in-memory cache (shared across requests in a single worker) ───
let serverCache: RateCache | null = null;

const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES).filter(
  (c) => c !== "NGN",
) as CurrencyCode[];

// ─── API fetching ────────────────────────────────────────────────────────────

/**
 * Fetch live rates from the configured exchange rate provider.
 * Uses open.er-api.com (free tier: 1,500 req/mo).
 * Set EXCHANGE_RATE_API_KEY in .env.local to upgrade to paid tier.
 */
async function fetchLiveRates(): Promise<Partial<Record<CurrencyCode, number>>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/NGN`
    : `https://open.er-api.com/v6/latest/NGN`;

  const res = await fetch(url, {
    next: { revalidate: 0 }, // always fresh on server route
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Exchange rate API responded ${res.status}`);

  const json = await res.json();
  // Both providers return { rates: { USD: 0.00065, GBP: 0.00052, ... } }
  const raw: Record<string, number> = json.rates ?? json.conversion_rates ?? {};

  const filtered: Partial<Record<CurrencyCode, number>> = {};
  for (const code of SUPPORTED_CURRENCIES) {
    if (raw[code] !== undefined) filtered[code] = raw[code];
  }
  return filtered;
}

// ─── Server-side rate access (used from API routes) ─────────────────────────

/**
 * Returns current rates. Uses in-memory server cache; fetches if stale.
 * Safe to call from Next.js route handlers (server-side only).
 */
export async function getServerRates(): Promise<RateCache> {
  const now = Date.now();

  if (serverCache && now - serverCache.lastFetch < RATE_CACHE_TTL_MS) {
    return serverCache;
  }

  try {
    const rawRates = await fetchLiveRates();
    const rates: Partial<Record<CurrencyCode, ExchangeRate>> = {};

    for (const [code, rate] of Object.entries(rawRates)) {
      rates[code as CurrencyCode] = {
        base: "NGN",
        currency: code as CurrencyCode,
        rate,
        fetchedAt: now,
        source: "live",
      };
    }

    // Always include NGN identity
    rates["NGN"] = { base: "NGN", currency: "NGN", rate: 1, fetchedAt: now, source: "live" };

    serverCache = { rates, lastFetch: now };
    return serverCache;
  } catch (err) {
    console.error("[currency] Rate fetch failed:", err);

    // Return stale server cache as fallback (up to 24h)
    if (serverCache && now - serverCache.lastFetch < RATE_FALLBACK_TTL_MS) {
      const fallback: RateCache = {
        lastFetch: serverCache.lastFetch,
        rates: Object.fromEntries(
          Object.entries(serverCache.rates).map(([k, v]) => [
            k,
            { ...v, source: "cached" as const },
          ]),
        ),
      };
      return fallback;
    }

    // No cache — return NGN identity only
    return {
      rates: { NGN: { base: "NGN", currency: "NGN", rate: 1, fetchedAt: now, source: "fallback" } },
      lastFetch: now,
    };
  }
}

// ─── Client-side rate access (localStorage) ─────────────────────────────────

function readClientCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(LS_RATE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RateCache;
  } catch {
    return null;
  }
}

function writeClientCache(cache: RateCache): void {
  try {
    localStorage.setItem(LS_RATE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage quota exceeded — silently drop
  }
}

/**
 * Get exchange rate for a single currency on the client.
 * Checks localStorage first; fetches /api/currency/rates if stale.
 */
export async function getClientRate(currency: CurrencyCode): Promise<ExchangeRate> {
  if (currency === "NGN") {
    return { base: "NGN", currency: "NGN", rate: 1, fetchedAt: Date.now(), source: "live" };
  }

  const now = Date.now();
  const cache = readClientCache();

  if (cache && now - cache.lastFetch < RATE_CACHE_TTL_MS) {
    const cached = cache.rates[currency];
    if (cached) return cached;
  }

  // Fetch fresh rates from our API route
  try {
    const res = await fetch("/api/currency/rates", { cache: "no-store" });
    if (!res.ok) throw new Error(`rates API ${res.status}`);
    const fresh = (await res.json()) as RateCache;
    writeClientCache(fresh);
    return (
      fresh.rates[currency] ?? {
        base: "NGN",
        currency,
        rate: 0,
        fetchedAt: now,
        source: "fallback",
      }
    );
  } catch {
    // Return stale localStorage entry if available (up to 24h fallback)
    if (cache && now - cache.lastFetch < RATE_FALLBACK_TTL_MS) {
      const stale = cache.rates[currency];
      if (stale) return { ...stale, source: "cached" };
    }

    // No cache at all — return NGN identity with disclaimer
    return { base: "NGN", currency: "NGN", rate: 1, fetchedAt: now, source: "fallback" };
  }
}

/**
 * Prefetch and cache all supported rates. Call on app boot or currency switch.
 */
export async function prefetchAllRates(): Promise<RateCache> {
  try {
    const res = await fetch("/api/currency/rates", { cache: "no-store" });
    if (!res.ok) throw new Error(`rates API ${res.status}`);
    const cache = (await res.json()) as RateCache;
    writeClientCache(cache);
    return cache;
  } catch {
    return readClientCache() ?? { rates: {}, lastFetch: 0 };
  }
}
