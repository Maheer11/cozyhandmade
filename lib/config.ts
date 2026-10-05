// Single source of truth for order-lifecycle timing constants.
// Referenced by the account/orders page (estimated ship-by date) and the
// admin "Mark as Shipped" notification (estimated delivery date). Change the
// number here — never hardcode it in multiple places.

// Business days after payment confirmation before an order typically ships.
export const PROCESSING_DAYS = 3;

// Courier lead time AFTER shipping, in business days — used only in the
// "Mark as Shipped" notification's estimated-delivery line.
//
// One 7–14 day range for every destination, Ireland included. Ireland used to
// be a single "within 7 days" ceiling while everywhere else was a range, which
// put the shipped email on a different clock from the checkout quote for the
// same Irish order. These must stay in step with the estimatedDays strings in
// lib/checkout/shipping.ts, which is what the customer sees at checkout; this
// file only drives the shipped email.
export const DELIVERY_BUSINESS_DAYS_MIN = 7;
export const DELIVERY_BUSINESS_DAYS_MAX = 14;

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
