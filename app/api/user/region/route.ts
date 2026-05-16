import { NextRequest, NextResponse } from "next/server";
import { COUNTRY_CURRENCY_MAP } from "@/lib/currency/constants";

/**
 * GET /api/user/region
 * Reads the request's IP from Vercel/Cloudflare headers and returns
 * { countryCode, currency } for client-side region detection layer 3.
 *
 * On Vercel, `x-vercel-ip-country` is set automatically.
 * On Cloudflare, `cf-ipcountry` is set automatically.
 * Falls back to a third-party geolocation API if neither is present.
 */
export async function GET(req: NextRequest) {
  // Vercel edge (fastest — no extra fetch needed)
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return countryResponse(vercelCountry);
  }

  // Cloudflare
  const cfCountry = req.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") {
    return countryResponse(cfCountry);
  }

  // Generic: try ip-api.com (1000 req/min free, no key needed)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() ?? "";

  if (ip && ip !== "127.0.0.1" && ip !== "::1") {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const { countryCode } = await res.json() as { countryCode: string };
        if (countryCode) return countryResponse(countryCode);
      }
    } catch {
      // geolocation timeout or network error — fall through to default
    }
  }

  // Unable to determine — return NG as default (base currency)
  return countryResponse("NG");
}

function countryResponse(countryCode: string) {
  const upper = countryCode.toUpperCase();
  const currency = COUNTRY_CURRENCY_MAP[upper] ?? "NGN";
  return NextResponse.json(
    { countryCode: upper, currency },
    {
      headers: {
        // Don't cache at CDN — IP ≠ same user every request
        "Cache-Control": "no-store",
      },
    },
  );
}
