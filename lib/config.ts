// Single source of truth for order-lifecycle timing constants.
// Referenced by the account/orders page (estimated ship-by date) and the
// admin "Mark as Shipped" notification (estimated delivery date). Change the
// number here — never hardcode it in multiple places.

// Business days after payment confirmation before an order typically ships.
export const PROCESSING_DAYS = 3;

// Courier lead time AFTER shipping, in business days — used only in the
// "Mark as Shipped" notification's estimated-delivery line. Nigerian orders
// (NGN) get a single fixed estimate; international orders get a 7–9 day range.
export const NGN_DELIVERY_BUSINESS_DAYS = 14;
export const INTL_DELIVERY_BUSINESS_DAYS_MIN = 7;
export const INTL_DELIVERY_BUSINESS_DAYS_MAX = 9;

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
