import { NextResponse } from "next/server";
import { getServerRates } from "@/lib/currency/exchangeRateClient";
import { RATE_CACHE_TTL_MS } from "@/lib/currency/constants";

/**
 * GET /api/currency/rates
 * Returns a RateCache object: { rates, lastFetch }.
 * The server-side in-memory cache keeps this cheap — most requests never hit
 * the upstream exchange rate API.
 */
export async function GET() {
  try {
    const cache = await getServerRates();

    // Tell the browser/CDN it can cache this for the same TTL we use server-side
    const maxAgeSeconds = Math.floor(RATE_CACHE_TTL_MS / 1000);

    return NextResponse.json(cache, {
      headers: {
        "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=3600`,
      },
    });
  } catch (err) {
    console.error("[/api/currency/rates]", err);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 502 },
    );
  }
}
