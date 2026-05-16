import {
  COUNTRY_CURRENCY_MAP,
  NIGERIAN_CHECKOUT_COUNTRIES,
  DEFAULT_CURRENCY,
  LS_REGION_KEY,
  LS_CURRENCY_KEY,
} from "./constants";
import type { CurrencyCode, UserRegion } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countryToCurrency(countryCode: string): CurrencyCode {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
}

function buildRegion(
  countryCode: string,
  detectedVia: UserRegion["detectedVia"],
): UserRegion {
  const upper = countryCode.toUpperCase();
  return {
    currency: countryToCurrency(upper),
    countryCode: upper,
    continent: NIGERIAN_CHECKOUT_COUNTRIES.has(upper) ? "Africa" : "International",
    checkoutMode: NIGERIAN_CHECKOUT_COUNTRIES.has(upper) ? "nigerian" : "international",
    detectedVia,
  };
}

// ─── Detection layers ─────────────────────────────────────────────────────────

/** Layer 1: User's saved profile from auth session (passed in from server) */
export function fromUserProfile(profile: {
  preferredCurrency?: string;
  countryCode?: string;
} | null): UserRegion | null {
  if (!profile?.countryCode) return null;
  const region = buildRegion(profile.countryCode, "profile");
  if (profile.preferredCurrency) {
    region.currency = profile.preferredCurrency as CurrencyCode;
  }
  return region;
}

/** Layer 2: localStorage persisted region from a previous session */
export function fromLocalStorage(): UserRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_REGION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserRegion;
  } catch {
    return null;
  }
}

/** Layer 3: IP geolocation via our own API route (avoids CORS) */
export async function fromIPGeolocation(): Promise<UserRegion | null> {
  try {
    const res = await fetch("/api/user/region", {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { countryCode } = (await res.json()) as { countryCode: string };
    if (!countryCode) return null;
    return buildRegion(countryCode, "ip");
  } catch {
    return null;
  }
}

/** Layer 4: Browser language/locale heuristic (client only) */
export function fromBrowserLocale(): UserRegion | null {
  if (typeof navigator === "undefined") return null;
  const lang = navigator.language ?? navigator.languages?.[0] ?? "";
  // e.g. "en-NG", "en-GB", "fr-FR"
  const parts = lang.split("-");
  const countryHint = parts.length >= 2 ? parts[parts.length - 1] : "";
  if (countryHint.length !== 2) return null;
  if (!COUNTRY_CURRENCY_MAP[countryHint.toUpperCase()]) return null;
  return buildRegion(countryHint, "browser");
}

/** Layer 5: Default fallback — NGN */
export function defaultRegion(): UserRegion {
  return buildRegion("NG", "default");
}

// ─── Main cascade ─────────────────────────────────────────────────────────────

/**
 * Full detection cascade: profile → localStorage → IP → browser → default.
 * Call once on app boot; store the result in CurrencyContext.
 */
export async function detectRegion(
  userProfile: { preferredCurrency?: string; countryCode?: string } | null = null,
): Promise<UserRegion> {
  return (
    fromUserProfile(userProfile) ??
    fromLocalStorage() ??
    (await fromIPGeolocation()) ??
    fromBrowserLocale() ??
    defaultRegion()
  );
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function persistRegion(region: UserRegion): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_REGION_KEY, JSON.stringify(region));
    localStorage.setItem(LS_CURRENCY_KEY, region.currency);
  } catch {
    // quota — silent
  }
}

export function persistCurrencyOverride(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_CURRENCY_KEY, currency);
    const raw = localStorage.getItem(LS_REGION_KEY);
    if (raw) {
      const region = JSON.parse(raw) as UserRegion;
      region.currency = currency;
      localStorage.setItem(LS_REGION_KEY, JSON.stringify(region));
    }
  } catch {
    // quota — silent
  }
}
