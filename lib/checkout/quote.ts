// Server-side price of a checkout: items re-priced from the database,
// shipping from those database weights plus the delivery address, pickup
// re-checked against the address. The only input taken from the client
// that affects the amount is WHAT is being bought (ids, variants,
// quantities) and WHERE it is going — never a price, weight or total.

import { repriceItems, type CheckoutItemInput, type VerifiedItem } from "./repriceItems";
import { calculateShipping, isDublinPickupEligible, type ShippingZone } from "./shipping";
import { orderAmounts, type OrderAmounts } from "./amounts";

export type DeliveryMethod = "courier" | "pickup";

export interface QuoteAddress {
  country: string;
  city?: string;
  postcode?: string;
}

export interface CheckoutQuote extends OrderAmounts {
  verifiedItems: VerifiedItem[];
  // The method actually priced. "pickup" only if the address really is in
  // Dublin — a pickup request for any other address is priced as courier.
  deliveryMethod: DeliveryMethod;
  zone: ShippingZone;
  estimatedDays: string;
  customsApplies: boolean;
}

/** Pure part, split out so it can be unit-tested without a database. */
export function priceVerifiedItems(
  verifiedItems: VerifiedItem[],
  subtotalEUR: number,
  address: QuoteAddress,
  requestedMethod: DeliveryMethod,
): Omit<CheckoutQuote, "verifiedItems"> {
  const shippingQuote = calculateShipping(
    verifiedItems.map((item) => ({
      quantity: item.quantity,
      shippingWeightGrams: item.shipping_weight_grams,
      productName: item.product_name,
    })),
    address.country,
  );
  const deliveryMethod: DeliveryMethod =
    requestedMethod === "pickup" && isDublinPickupEligible(address) ? "pickup" : "courier";
  const shippingEUR = deliveryMethod === "pickup" ? 0 : shippingQuote.priceEUR;

  return {
    ...orderAmounts(subtotalEUR, shippingEUR),
    deliveryMethod,
    zone: shippingQuote.zone,
    estimatedDays: shippingQuote.estimatedDays,
    customsApplies: deliveryMethod === "pickup" ? false : shippingQuote.customsApplies,
  };
}

/** Throws RepriceError (from repriceItems) if an item is gone or sold out. */
export async function quoteCheckout(
  db: Parameters<typeof repriceItems>[0],
  items: CheckoutItemInput[],
  address: QuoteAddress,
  requestedMethod: DeliveryMethod,
): Promise<CheckoutQuote> {
  const { verifiedItems, verifiedTotal } = await repriceItems(db, items);
  return { verifiedItems, ...priceVerifiedItems(verifiedItems, verifiedTotal, address, requestedMethod) };
}
