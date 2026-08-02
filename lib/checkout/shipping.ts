// Single source of truth for weight-based shipping cost. Imported by BOTH
// the checkout UI (display) and app/api/payments/stripe/create-intent
// (charging) — see that route's comment for why a second implementation
// must never be created. Ships from Ireland; cost scales by weight, not
// item count; no free-shipping threshold.
//
// Pure function, no I/O, no database access — every weight and the
// delivery country are passed in by the caller, which is responsible for
// reading them from the database itself (server-side, never trusting the
// client — see repriceItems.ts for the equivalent guarantee on price).

export type ShippingZone = "domestic" | "uk" | "eu" | "north_america" | "nigeria" | "rest_of_world";

// A product/new-in row with no shipping_weight_grams set (admin forgot to
// fill it in, or it predates this feature). Deliberately HIGH, not 0 or a
// plausible-looking average — undercharging shipping is the exact bug this
// module exists to fix, so an unknown weight must err toward the more
// expensive outcome, never the cheaper one. 5kg is heavier than any single
// item in this catalogue is expected to be; multiplied across a multi-item
// order with several unknown-weight items, this deliberately becomes very
// expensive, which is the point — it's meant to be noticed and fixed, not
// quietly absorbed as a rounding error.
export const DEFAULT_ITEM_WEIGHT_GRAMS = 5000;

export interface WeightBand {
  maxGrams: number;
  priceEUR: number;
}

// Extracted so tests can exercise the band-selection/parcel-splitting
// arithmetic directly, with synthetic band data.
//
// Above the largest band, An Post has no published rate at all (their own
// calculator tops out at 20kg per zone) — there is no real per-kg overflow
// figure to enter here, and inventing one would be exactly the kind of
// made-up number this rate table otherwise avoids everywhere else. Instead,
// an order heavier than the largest band is treated as MULTIPLE parcels:
// as many full largest-band parcels as fit, plus one more parcel (looked up
// the same recursive way) for whatever's left over. E.g. a 25kg order in a
// zone whose largest band is 20kg = one 20kg parcel + one 5kg parcel,
// priced from the same real numbers already in the table — which is also
// what would actually happen operationally, since a single carrier parcel
// can't exceed that weight anyway.
export function lookupBandPrice(bands: WeightBand[], totalWeightGrams: number): number {
  const band = bands.find((b) => totalWeightGrams <= b.maxGrams);
  if (band) return band.priceEUR;

  const largestBand = bands[bands.length - 1];
  const fullParcels = Math.floor(totalWeightGrams / largestBand.maxGrams);
  const remainderGrams = totalWeightGrams % largestBand.maxGrams;
  const remainderPrice = remainderGrams > 0 ? lookupBandPrice(bands, remainderGrams) : 0;
  return fullParcels * largestBand.priceEUR + remainderPrice;
}

interface ZoneRates {
  bands: WeightBand[];
  estimatedDays: string;
  customsApplies: boolean;
}

// ISO 3166-1 alpha-2 codes, keyed by zone.
const DOMESTIC_COUNTRIES = new Set(["IE"]);
const UK_COUNTRIES = new Set(["GB"]);
// The 26 EU member states excluding Ireland (IE is its own "domestic" zone).
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IT", "LV", "LT", "LU", "MT", "NL", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE",
]);
const NORTH_AMERICA_COUNTRIES = new Set(["US", "CA"]);
// Nigeria gets its own zone rather than falling into rest_of_world — An
// Post quotes a materially different rate for it than for the far-flung
// destinations (Australia, Japan, etc.) rest_of_world's numbers came from,
// and Nigerian customers are a big enough share of orders (existing
// NGN/bank-transfer checkout mode) to warrant a dedicated real quote.
const NIGERIA_COUNTRIES = new Set(["NG"]);

// ─── Rate table ─────────────────────────────────────────────────────────
// All five zones below are REAL rates, sourced from An Post's postage
// calculator (anpost.com/Post-Parcels/Sending/Calculate-Postage). An Post
// quotes a range depending on tracking/documentation level, so the TOP of
// that range was used for every band, so this never undercharges relative
// to what An Post could actually bill. domestic's 500g/1kg were set equal
// to its 2kg price on the business owner's confirmation that no catalogue
// item currently weighs under 2kg — revisit if/when a lighter product is
// added. Band boundaries deliberately differ per zone (each zone uses
// whatever breakpoints An Post's quote actually came in at, not a single
// forced shape) — see each zone's own comment below.
//
// Above the largest band (20kg in every zone below), there's no real An
// Post rate to quote — see lookupBandPrice's doc comment for how that's
// handled (split into multiple parcels using these same real prices).
//
// estimatedDays: Ireland (the fulfilment country) quotes "within 7 business
// days"; EVERY other zone quotes the same "7-14 business days" range. These
// are deliberately uniform across international zones rather than tuned per
// zone — An Post publishes rates per zone, not transit SLAs, so a per-zone
// spread would be invented precision. Revisit only with real carrier transit
// data, not by interpolating from the price table.
const ZONE_RATES: Record<ShippingZone, ZoneRates> = {
  domestic: {
    bands: [
      { maxGrams: 500,   priceEUR: 7 },
      { maxGrams: 1000,  priceEUR: 7 },
      { maxGrams: 2000,  priceEUR: 13 },
      { maxGrams: 5000,  priceEUR: 15 },
      { maxGrams: 10000, priceEUR: 17 },
      { maxGrams: 15000, priceEUR: 19 },
      { maxGrams: 20000, priceEUR: 20 },
    ],
    estimatedDays: "within 7 business days",
    customsApplies: false,
  },
  // UK bands intentionally don't match domestic's shape — each zone's band
  // boundaries are independent, and these follow the exact breakpoints An
  // Post quoted (500g/1kg/1.5kg/5kg/10kg/15kg/20kg), not the round-number
  // scaffolding used elsewhere.
  uk: {
    bands: [
      { maxGrams: 500,   priceEUR: 17 },
      { maxGrams: 1000,  priceEUR: 20 },
      { maxGrams: 1500,  priceEUR: 23 },
      { maxGrams: 5000,  priceEUR: 28 },
      { maxGrams: 10000, priceEUR: 30 },
      { maxGrams: 15000, priceEUR: 32 },
      { maxGrams: 20000, priceEUR: 35 },
    ],
    estimatedDays: "7-14 business days",
    customsApplies: true,
  },
  // EU bands follow An Post's own quoted breakpoints (100g/2kg/5kg/10kg/
  // 15kg/20kg) — same reasoning as UK, not forced into domestic's shape.
  eu: {
    bands: [
      { maxGrams: 100,   priceEUR: 35 },
      { maxGrams: 2000,  priceEUR: 35 },
      { maxGrams: 5000,  priceEUR: 50 },
      { maxGrams: 10000, priceEUR: 65 },
      { maxGrams: 15000, priceEUR: 80 },
      { maxGrams: 20000, priceEUR: 95 },
    ],
    estimatedDays: "7-14 business days",
    customsApplies: false,
  },
  // Bands follow An Post's own quoted breakpoints (500g/2kg/5kg/10kg/15kg/
  // 20kg — no 1kg quote given), same as the other real zones.
  north_america: {
    bands: [
      { maxGrams: 500,   priceEUR: 41 },
      { maxGrams: 2000,  priceEUR: 53 },
      { maxGrams: 5000,  priceEUR: 77 },
      { maxGrams: 10000, priceEUR: 127 },
      { maxGrams: 15000, priceEUR: 177 },
      { maxGrams: 20000, priceEUR: 227 },
    ],
    estimatedDays: "7-14 business days",
    customsApplies: true,
  },
  // Bands follow An Post's own quoted breakpoints (500g/1kg/5kg/10kg/15kg/
  // 20kg). Nigerian orders previously fell into rest_of_world — this real
  // quote replaces that for NG specifically; rest_of_world's own numbers
  // (sourced from other far destinations) are unaffected.
  nigeria: {
    bands: [
      { maxGrams: 500,   priceEUR: 41 },
      { maxGrams: 1000,  priceEUR: 53 },
      { maxGrams: 5000,  priceEUR: 77 },
      { maxGrams: 10000, priceEUR: 127 },
      { maxGrams: 15000, priceEUR: 177 },
      { maxGrams: 20000, priceEUR: 227 },
    ],
    estimatedDays: "7-14 business days",
    customsApplies: true,
  },
  // Unknown/unrecognised/missing country also resolves here — the most
  // expensive zone, per calculateShipping's "never undercharge on
  // ambiguity" rule. Bands follow An Post's own quoted breakpoints
  // (500g/5kg/10kg/20kg — no 1kg/2kg/15kg quote given), same as uk/eu.
  rest_of_world: {
    bands: [
      { maxGrams: 500,   priceEUR: 45 },
      { maxGrams: 5000,  priceEUR: 62 },
      { maxGrams: 10000, priceEUR: 185 },
      { maxGrams: 20000, priceEUR: 335 },
    ],
    estimatedDays: "7-14 business days",
    customsApplies: true,
  },
};

export function resolveShippingZone(countryCode: string | null | undefined): ShippingZone {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return "rest_of_world";
  if (DOMESTIC_COUNTRIES.has(code)) return "domestic";
  if (UK_COUNTRIES.has(code)) return "uk";
  if (EU_COUNTRIES.has(code)) return "eu";
  if (NORTH_AMERICA_COUNTRIES.has(code)) return "north_america";
  if (NIGERIA_COUNTRIES.has(code)) return "nigeria";
  // Includes genuinely foreign codes AND non-codes like the checkout form's
  // "Other" option — either way, unrecognised input never gets a cheaper
  // zone than the most expensive one.
  return "rest_of_world";
}

// Dublin routing keys under Eircode: D01-D24 and D6W. Matched against the
// postcode with whitespace stripped, case-insensitive, prefix match (an
// Eircode is routing-key + unique-identifier, e.g. "D02 AF30").
const DUBLIN_EIRCODE_PATTERN = /^D(0[1-9]|1[0-9]|2[0-4]|6W)/i;

export interface DeliveryAddressLike {
  country: string;
  city?: string;
  postcode?: string;
}

// Free customer pickup (in Dublin, where MadeCozi's stockhouse is — see
// project memory) is only offered to addresses that are actually IN Dublin,
// never merely "in Ireland" — the rest of the country still pays the
// domestic courier rate. Detection is necessarily best-effort from
// free-text customer input (there's no verified-address service in this
// app): country must be Ireland, AND either the city field mentions Dublin
// or the postcode's Eircode routing key is one of Dublin's. This same
// function runs both client-side (to decide whether to show the pickup
// option at all) and server-side (create-intent/orders re-run it against
// the submitted address before ever honouring a €0 shipping charge — the
// client's claim of having chosen "pickup" is never trusted on its own).
export function isDublinPickupEligible(address: DeliveryAddressLike): boolean {
  if (address.country?.trim().toUpperCase() !== "IE") return false;
  if (address.city?.trim().toLowerCase().includes("dublin")) return true;
  const postcode = address.postcode?.trim().replace(/\s+/g, "").toUpperCase() ?? "";
  return DUBLIN_EIRCODE_PATTERN.test(postcode);
}

export interface ShippingItemInput {
  quantity: number;
  // null/undefined means "unknown weight" — falls back to
  // DEFAULT_ITEM_WEIGHT_GRAMS, logged so it can be fixed at the source.
  shippingWeightGrams: number | null | undefined;
  // Only used for the console warning below when weight is missing —
  // never affects the computed price.
  productName?: string;
}

export interface ShippingQuote {
  zone: ShippingZone;
  totalWeightGrams: number;
  priceEUR: number;
  estimatedDays: string;
  customsApplies: boolean;
}

/**
 * Computes the shipping cost for an order, in EUR, from server-verified
 * item weights and a delivery country. See the module doc comment for why
 * this is the only implementation and must be imported, not reimplemented,
 * by every caller.
 *
 * Above the largest weight band, cost is computed as multiple parcels
 * rather than returning a "contact us for a quote" flag — see
 * lookupBandPrice's doc comment for why (no invented per-kg rate; this
 * keeps checkout fully self-service at any order size, using only real
 * An Post prices already in the table).
 */
export function calculateShipping(
  items: ShippingItemInput[],
  countryCode: string | null | undefined,
): ShippingQuote {
  const zone = resolveShippingZone(countryCode);
  const rates = ZONE_RATES[zone];

  let totalWeightGrams = 0;
  for (const item of items) {
    let weight = item.shippingWeightGrams;
    if (weight == null) {
      weight = DEFAULT_ITEM_WEIGHT_GRAMS;
      console.warn(
        `[shipping] Missing shipping_weight_grams for product ` +
        `"${item.productName ?? "unknown"}" — falling back to ` +
        `DEFAULT_ITEM_WEIGHT_GRAMS (${DEFAULT_ITEM_WEIGHT_GRAMS}g). ` +
        `Set a real weight for this product to fix its shipping price.`
      );
    }
    totalWeightGrams += weight * item.quantity;
  }

  const priceEUR = lookupBandPrice(rates.bands, totalWeightGrams);

  return {
    zone,
    totalWeightGrams,
    priceEUR: Math.round(priceEUR * 100) / 100,
    estimatedDays: rates.estimatedDays,
    customsApplies: rates.customsApplies,
  };
}
