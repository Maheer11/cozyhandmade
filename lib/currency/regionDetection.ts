import {
  COUNTRY_CURRENCY_MAP,
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
  currency?: CurrencyCode,
): UserRegion {
  const upper = countryCode.toUpperCase();
  return {
    currency: currency ?? countryToCurrency(upper),
    countryCode: upper,
    detectedVia,
  };
}

// ─── Detection layers ─────────────────────────────────────────────────────────
// No IP/browser-locale based auto-detection — a visitor's location never
// silently overrides the storefront's default currency. Only an explicit,
// remembered choice (their own past pick, or a signed-in profile
// preference) can move them off the EUR default.

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

/** Layer 2: an explicit currency pick this visitor made in a previous session */
export function fromExplicitChoice(): UserRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_REGION_KEY);
    if (!raw) return null;
    const region = JSON.parse(raw) as UserRegion;
    return region.detectedVia === "explicit" ? region : null;
  } catch {
    return null;
  }
}

/** Layer 3: Default fallback — EUR, for every visitor with no explicit choice */
export function defaultRegion(): UserRegion {
  return buildRegion("DE", "default");
}

// ─── Main cascade ─────────────────────────────────────────────────────────────

/**
 * Full detection cascade: profile → this visitor's own past explicit pick → default.
 * Call once on app boot; store the result in CurrencyContext.
 */
export async function detectRegion(
  userProfile: { preferredCurrency?: string; countryCode?: string } | null = null,
): Promise<UserRegion> {
  return (
    fromUserProfile(userProfile) ??
    fromExplicitChoice() ??
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

/** User manually changes currency via the picker — remembered for next visit. */
export function persistCurrencyOverride(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_CURRENCY_KEY, currency);
    const raw = localStorage.getItem(LS_REGION_KEY);
    const prev = raw ? (JSON.parse(raw) as UserRegion) : null;
    const region = buildRegion(prev?.countryCode ?? "DE", "explicit", currency);
    localStorage.setItem(LS_REGION_KEY, JSON.stringify(region));
  } catch {
    // quota — silent
  }
}
