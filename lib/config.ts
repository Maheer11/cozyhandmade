// Single source of truth for order-lifecycle timing constants.
// Referenced by the account/orders page (estimated ship-by date) and the
// admin "Mark as Shipped" notification (estimated delivery date). Change the
// number here — never hardcode it in multiple places.

// Business days after payment confirmation before an order typically ships.
export const PROCESSING_DAYS = 3;

// Courier lead time AFTER shipping, in business days — used only in the
// "Mark as Shipped" notification's estimated-delivery line.
//
// Ireland (the fulfilment country) is a single "within N days" ceiling, not a
// range — a domestic An Post parcel from Dublin has no meaningful floor worth
// quoting. Every other destination is a 7–14 day range. Keep these in step
// with the estimatedDays strings in lib/checkout/shipping.ts, which is what
// the customer sees at checkout; this file only drives the shipped email.
//
// Selection keys off the DESTINATION COUNTRY, not the order's currency.
// Currency stopped being a usable proxy once NGN/bank transfer was removed and
// non-Irish customers began paying in EUR — lead time is a property of where
// the parcel is going, not what it was paid in.
export const IE_DELIVERY_BUSINESS_DAYS = 7;
export const INTL_DELIVERY_BUSINESS_DAYS_MIN = 7;
export const INTL_DELIVERY_BUSINESS_DAYS_MAX = 14;

// Adds N business days (Mon–Fri) to a date — used to turn the constants
// above into an actual calendar date for the shipped-notification email.
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}
