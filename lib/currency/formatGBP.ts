import { CURRENCIES } from "./constants";
import { formatCurrency } from "./pricingUtils";

// New In prices are entered directly in GBP by the admin — no NGN→GBP
// conversion, and no "luxury rounding" (which snaps amounts to the nearest
// psychological price tier and would silently collapse two different
// admin-entered prices into the same displayed value). Just format the
// stored number as pounds, exactly as entered.
export function formatGBP(amount: number): string {
  return formatCurrency(amount, CURRENCIES.GBP);
}
